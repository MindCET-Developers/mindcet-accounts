import Link from "next/link";
import { ArrowUpRight, Calendar, DollarSign, Layers, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { getAuthenticatedServiceCatalog } from "@/lib/services/shared-catalog";

function annualize(amount: number, cycle: string) {
  if (cycle === "annual") return amount;
  if (cycle === "monthly") return amount * 12;
  return 0;
}

export default async function DashboardPage() {
  const { supabase } = await getAuthenticatedServiceCatalog();
  const { data: services } = await supabase.from("services").select("*").eq("status", "active");
  const all = services ?? [];

  const monthlyUSD = all
    .filter((s) => s.cost_currency === "USD")
    .reduce((sum, s) => sum + (s.billing_cycle === "monthly" ? Number(s.cost_amount) : Number(s.cost_amount) / 12), 0);
  const monthlyILS = all
    .filter((s) => s.cost_currency === "ILS")
    .reduce((sum, s) => sum + (s.billing_cycle === "monthly" ? Number(s.cost_amount) : Number(s.cost_amount) / 12), 0);
  const annualUSD = all
    .filter((s) => s.cost_currency === "USD")
    .reduce((sum, s) => sum + annualize(Number(s.cost_amount), s.billing_cycle), 0);

  const upcomingRenewals = all
    .filter((s) => s.next_renewal_date)
    .map((s) => ({ ...s, daysAway: daysUntil(s.next_renewal_date!) }))
    .filter((s) => s.daysAway >= 0 && s.daysAway <= 30)
    .sort((a, b) => a.daysAway - b.daysAway)
    .slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-xs text-[--color-muted] mb-2">
          <Sparkles className="size-3.5" />
          סקירה כללית
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          תמונת מצב{" "}
          <span className="text-gradient-brand">תקציב SaaS</span>
        </h1>
        <p className="mt-2 text-[--color-muted]">
          {all.length === 0
            ? "עוד אין שירותים. נתחיל בהוספת הראשון."
            : `מנוהלים ${all.length} שירותים פעילים`}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <KpiCard
          label="סך חודשי (USD)"
          value={formatCurrency(monthlyUSD, "USD")}
          sublabel={`≈ ${formatCurrency(annualUSD, "USD")} בשנה`}
          icon={<DollarSign className="size-4" />}
        />
        <KpiCard
          label="סך חודשי (ILS)"
          value={formatCurrency(monthlyILS, "ILS")}
          sublabel="ללא המרת USD ⇆ ILS"
          icon={<DollarSign className="size-4" />}
        />
        <KpiCard
          label="חידושים בחודש הקרוב"
          value={upcomingRenewals.length}
          sublabel={
            upcomingRenewals[0]
              ? `הקרוב ביותר: ${upcomingRenewals[0].name}, בעוד ${upcomingRenewals[0].daysAway} ימים`
              : "אין חידושים קרובים"
          }
          accent={upcomingRenewals.some((r) => r.daysAway <= 7) ? "warning" : "default"}
          icon={<Calendar className="size-4" />}
        />
      </div>

      {/* Upcoming renewals + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold">חידושים קרובים</h2>
            <Link
              href="/services"
              className="text-xs text-[--color-brand-400] hover:text-[--color-brand-300] inline-flex items-center gap-1"
            >
              לכל השירותים
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          {upcomingRenewals.length === 0 ? (
            <EmptyState
              title="אין חידושים בחודש הקרוב"
              hint={all.length === 0 ? "התחל בהוספת שירות ראשון" : "הכל רגוע 🌿"}
            />
          ) : (
            <ul className="divide-y divide-[--color-border-soft]">
              {upcomingRenewals.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-[--color-muted] mt-0.5">
                      {formatDate(s.next_renewal_date!)} · {s.billing_cycle === "annual" ? "שנתי" : "חודשי"}
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="kpi-number text-sm">
                      {formatCurrency(Number(s.cost_amount), s.cost_currency)}
                    </div>
                    <div
                      className={
                        "text-xs mt-0.5 " +
                        (s.daysAway <= 3
                          ? "text-[--color-accent-red]"
                          : s.daysAway <= 7
                            ? "text-[--color-accent-amber]"
                            : "text-[--color-muted]")
                      }
                    >
                      בעוד {s.daysAway} ימים
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-base font-semibold mb-1">פעולות מהירות</h2>
          <p className="text-xs text-[--color-muted] mb-4">
            התחילו את הניהול
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/services/new"
              className="surface-hover hover:surface-hover-active px-4 py-3 flex items-center gap-3 group"
            >
              <div className="size-9 rounded-[--radius] bg-gradient-brand grid place-items-center text-white">
                <Layers className="size-4" />
              </div>
              <div className="text-sm flex-1">
                <div className="font-medium">הוסף שירות</div>
                <div className="text-xs text-[--color-muted]">Google, Canva, Zoom...</div>
              </div>
              <ArrowUpRight className="size-4 text-[--color-muted] group-hover:text-[--color-foreground] transition-colors" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="py-10 text-center">
      <div className="text-3xl mb-2">✨</div>
      <div className="text-sm font-medium">{title}</div>
      {hint && <div className="text-xs text-[--color-muted] mt-1">{hint}</div>}
    </div>
  );
}
