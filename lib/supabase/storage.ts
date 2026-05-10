import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

export async function uploadStorageObject(
  supabase: SupabaseClient<Database>,
  bucket: string,
  path: string,
  bytes: Buffer,
  contentType: string,
) {
  let mode = "unknown";
  let keyShape = "unknown";
  try {
    const built = await createStorageHeaders(supabase);
    mode = built.mode;
    keyShape = built.keyShape;
    built.headers.set("cache-control", "max-age=3600");
    built.headers.set("content-type", contentType);
    built.headers.set("x-upsert", "true");

    const response = await fetch(storageObjectUrl(bucket, path), {
      method: "POST",
      headers: built.headers,
      body: new Blob([new Uint8Array(bytes)], { type: contentType }),
    });

    if (!response.ok) {
      throw new Error(await storageErrorMessage(response));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message} [auth=${mode} key=${keyShape}]`);
  }
}

export async function createStorageSignedUrl(
  supabase: SupabaseClient<Database>,
  bucket: string,
  path: string,
  expiresIn: number,
) {
  const { headers } = await createStorageHeaders(supabase);
  headers.set("content-type", "application/json");

  const response = await fetch(`${storageBaseUrl()}/object/sign/${objectPath(bucket, path)}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ expiresIn }),
  });

  if (!response.ok) {
    throw new Error(await storageErrorMessage(response));
  }

  const data = (await response.json()) as {
    signedURL?: string;
    signedUrl?: string;
  };
  const signedPath = data.signedURL ?? data.signedUrl;

  return signedPath ? encodeURI(`${storageBaseUrl()}${signedPath}`) : null;
}

async function createStorageHeaders(supabase: SupabaseClient<Database>) {
  const serverKey = (
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  )?.trim();

  if (serverKey) {
    return {
      headers: new Headers({
        apikey: serverKey,
        Authorization: `Bearer ${serverKey}`,
      }),
      mode: process.env.SUPABASE_SECRET_KEY ? "secret-key" : "service-role",
      keyShape: describeKey(serverKey),
    };
  }

  const accessToken = await getUserAccessToken(supabase);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!accessToken || !anonKey) {
    throw new Error(
      "Supabase Storage requires a server secret key or a signed-in user session.",
    );
  }

  return {
    headers: new Headers({
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    }),
    mode: "user-session",
    keyShape: describeKey(accessToken),
  };
}

function describeKey(value: string) {
  const parts = value.split(".").length;
  if (value.startsWith("sb_secret_")) return "sb_secret";
  if (value.startsWith("sb_publishable_")) return "sb_publishable";
  if (parts === 3) return `jwt(len=${value.length})`;
  return `unknown(len=${value.length},parts=${parts})`;
}

async function getUserAccessToken(supabase: SupabaseClient<Database>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  return accessToken && isJwt(accessToken) ? accessToken : null;
}

function storageObjectUrl(bucket: string, path: string) {
  return `${storageBaseUrl()}/object/${objectPath(bucket, path)}`;
}

function objectPath(bucket: string, path: string) {
  return `${bucket}/${path}`
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

function storageBaseUrl() {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/storage/v1`;
}

async function storageErrorMessage(response: Response) {
  const text = await response.text();

  try {
    const parsed = JSON.parse(text) as {
      message?: string;
      error?: string;
      msg?: string;
    };
    return parsed.message ?? parsed.error ?? parsed.msg ?? text;
  } catch {
    return text || `${response.status} ${response.statusText}`;
  }
}

function isJwt(value: string) {
  const [header] = value.split(".");
  if (!header || value.split(".").length !== 3) return false;

  try {
    const parsed = JSON.parse(Buffer.from(header, "base64url").toString("utf8")) as {
      alg?: string;
    };
    return Boolean(parsed.alg);
  } catch {
    return false;
  }
}
