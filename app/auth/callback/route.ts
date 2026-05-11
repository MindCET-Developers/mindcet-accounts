import { NextResponse, type NextRequest } from "next/server";
import { getCanonicalAppOrigin } from "@/lib/app-origin";
import { getSharedWorkspaceId } from "@/lib/services/shared-catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");
  const appOrigin = getCanonicalAppOrigin();

  if (error) {
    return NextResponse.redirect(`${appOrigin}/login?error=${encodeURIComponent(error)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const session = data.session;
      const user = session?.user;
      const providerRefreshToken = session?.provider_refresh_token;

      if (user) {
        const admin = createAdminClient();
        const workspaceId = await getSharedWorkspaceId();

        await admin
          .from("profiles")
          .update({ workspace_id: workspaceId })
          .eq("id", user.id);

        if (providerRefreshToken && user.email) {
          await admin.from("email_accounts").upsert(
            {
              workspace_id: workspaceId,
              user_id: user.id,
              email: user.email,
              provider_refresh_token: providerRefreshToken,
              scan_enabled: true,
            },
            { onConflict: "workspace_id,email" },
          );
        }
      }

      return NextResponse.redirect(`${appOrigin}${getSafeNextPath(next)}`);
    }
    return NextResponse.redirect(
      `${appOrigin}/login?error=${encodeURIComponent(exchangeError.message)}`,
    );
  }

  return NextResponse.redirect(`${appOrigin}/login?error=missing_code`);
}

function getSafeNextPath(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
