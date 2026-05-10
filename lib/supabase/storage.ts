import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

export async function uploadStorageObject(
  supabase: SupabaseClient<Database>,
  bucket: string,
  path: string,
  bytes: Buffer,
  contentType: string,
) {
  const headers = await createStorageHeaders(supabase);
  headers.set("cache-control", "max-age=3600");
  headers.set("content-type", contentType);
  headers.set("x-upsert", "true");

  const response = await fetch(storageObjectUrl(bucket, path), {
    method: "POST",
    headers,
    body: new Blob([new Uint8Array(bytes)], { type: contentType }),
  });

  if (!response.ok) {
    throw new Error(await storageErrorMessage(response));
  }
}

export async function createStorageSignedUrl(
  supabase: SupabaseClient<Database>,
  bucket: string,
  path: string,
  expiresIn: number,
) {
  const headers = await createStorageHeaders(supabase);
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
  const serverKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serverKey) {
    const headers = new Headers({ apikey: serverKey });
    if (isJwt(serverKey)) {
      headers.set("Authorization", `Bearer ${serverKey}`);
    }
    return headers;
  }

  const accessToken = await getUserAccessToken(supabase);
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!accessToken || !anonKey) {
    throw new Error(
      "Supabase Storage requires a server secret key or a signed-in user session.",
    );
  }

  return new Headers({
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
  });
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
