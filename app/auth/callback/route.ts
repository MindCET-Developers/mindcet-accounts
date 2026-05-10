import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      const session = data.session;
      const user = session?.user;
      const providerRefreshToken = session?.provider_refresh_token;

      if (user && providerRefreshToken) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("workspace_id")
          .eq("id", user.id)
          .single();

        if (profile && user.email) {
          await supabase.from("email_accounts").upsert(
            {
              workspace_id: profile.workspace_id,
              user_id: user.id,
              email: user.email,
              provider_refresh_token: providerRefreshToken,
              scan_enabled: true,
            },
            { onConflict: "workspace_id,email" },
          );
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}
