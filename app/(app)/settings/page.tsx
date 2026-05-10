import { Settings } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

type ProfileWithWorkspace = Profile & {
  workspaces: { name: string; default_currency: string } | null;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, workspaces(name, default_currency)")
    .eq("id", user!.id)
    .single<ProfileWithWorkspace>();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight mb-2">הגדרות</h1>
        <p className="text-[--color-muted]">
          פרטי משתמש וסביבת העבודה המחוברת לחשבון.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="size-10 rounded-[--radius] bg-[--color-brand-500]/10 text-[--color-brand-400] grid place-items-center">
              <Settings className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">משתמש</h2>
              <p className="text-xs text-[--color-muted]">פרופיל התחברות</p>
            </div>
          </div>
          <dl className="grid gap-3 text-sm">
            <InfoRow label="שם" value={profile?.display_name ?? user?.email ?? "-"} />
            <InfoRow label="אימייל" value={user?.email ?? "-"} />
            <InfoRow label="תפקיד" value={profile?.role === "owner" ? "Owner" : "Member"} />
          </dl>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="size-10 rounded-[--radius] bg-[--color-accent-green]/10 text-[--color-accent-green] grid place-items-center">
              <Settings className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">Workspace</h2>
              <p className="text-xs text-[--color-muted]">ברירת מחדל לצוות</p>
            </div>
          </div>
          <dl className="grid gap-3 text-sm">
            <InfoRow label="שם" value={profile?.workspaces?.name ?? "-"} />
            <InfoRow
              label="מטבע ברירת מחדל"
              value={profile?.workspaces?.default_currency ?? "-"}
            />
          </dl>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[--color-border-soft] pb-3 last:border-b-0 last:pb-0">
      <dt className="text-[--color-muted]">{label}</dt>
      <dd className="text-left font-medium">{value}</dd>
    </div>
  );
}
