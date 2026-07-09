import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DeleteServiceButton } from "@/components/services/DeleteServiceButton";
import { getAuthenticatedServiceCatalog } from "@/lib/services/shared-catalog";
import { formatCurrency, formatDate } from "@/lib/utils";

const CYCLE_LABELS: Record<string, string> = {
  monthly: "חודשי",
  annual: "שנתי",
  one_time: "חד פעמי",
};

const STATUS_LABELS: Record<string, string> = {
  paused: "מושהה",
  cancelled: "בוטל",
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase } = await getAuthenticatedServiceCatalog();
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .order("vendor", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  const all = services ?? [];

  // סה"כ חודשי לפי מטבע — רק הוצאות פעילות
  const monthlyByCurrency = new Map<string, number>();
  for (const service of all) {
    if (service.status !== "active") continue;
    const amount = Number(service.cost_amount);
    const monthly =
      service.billing_cycle === "monthly"
        ? amount
        : service.billing_cycle === "annual"
          ? amount / 12
          : 0;
    if (monthly === 0) continue;
    const current = monthlyByCurrency.get(service.cost_currency) ?? 0;
    monthlyByCurrency.set(service.cost_currency, current + monthly);
  }
  const monthlyTotal = [...monthlyByCurrency.entries()]
    .map(([currency, total]) => formatCurrency(total, currency))
    .join(" + ");

  // קיבוץ לפי ספק — server-side
  const groupMap = new Map<string, typeof all>();
  for (const service of all) {
    const key = service.vendor?.trim() || "ללא ספק";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(service);
  }
  // ללא ספק תמיד אחרון
  const groups: [string, typeof all][] = [];
  for (const [key, group] of groupMap) {
    if (key !== "ללא ספק") groups.push([key, group]);
  }
  if (groupMap.has("ללא ספק")) groups.push(["ללא ספק", groupMap.get("ללא ספק")!]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">הוצאות</h1>
          <p className="text-sm text-[--color-muted]">
            {all.length === 0
              ? "המנויים והשירותים הקבועים של הצוות"
              : monthlyTotal
                ? `סה"כ חודשי: ${monthlyTotal}`
                : `${all.length} הוצאות`}
          </p>
        </div>
        <Link href="/services/new">
          <Button>
            <Plus className="size-4" />
            הוספת הוצאה
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-[--radius] border border-[--color-accent-red]/30 bg-[--color-accent-red]/10 p-3 text-sm text-[--color-accent-red]">
          {decodeURIComponent(error)}
        </div>
      )}

      {all.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-5xl mb-4">📦</div>
          <h2 className="text-lg font-medium mb-1">עדיין אין הוצאות</h2>
          <p className="text-sm text-[--color-muted] mb-6">
            התחילו בהוספת ההוצאה הקבועה הראשונה
          </p>
          <Link href="/services/new" className="inline-block">
            <Button>
              <Plus className="size-4" />
              הוספת הוצאה ראשונה
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-8">
          {groups.map(([vendor, group]) => (
            <section key={vendor}>
              <h2 className="mb-3 px-1 text-sm font-semibold">
                {vendor}
                <span className="mr-2 text-xs font-normal text-[--color-muted]">
                  ({group.length})
                </span>
              </h2>
              <Card className="!p-0 divide-y divide-[--color-border-soft]">
                {group.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {service.name}
                        {STATUS_LABELS[service.status] && (
                          <span className="mr-2 text-xs font-normal text-[--color-muted-2]">
                            ({STATUS_LABELS[service.status]})
                          </span>
                        )}
                      </div>
                      {service.next_renewal_date && (
                        <div className="text-xs text-[--color-muted] mt-0.5">
                          חידוש: {formatDate(service.next_renewal_date)}
                        </div>
                      )}
                    </div>
                    <div className="text-left shrink-0">
                      <div className="kpi-number text-sm">
                        {formatCurrency(
                          Number(service.cost_amount),
                          service.cost_currency,
                        )}
                      </div>
                      <div className="text-xs text-[--color-muted] mt-0.5">
                        {CYCLE_LABELS[service.billing_cycle] ?? service.billing_cycle}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/services/${service.id}/edit`}
                        className="size-8 grid place-items-center rounded-[--radius] text-[--color-muted] hover:text-[--color-foreground] hover:bg-[--color-surface-2] transition-colors"
                        aria-label={`עריכת ${service.name}`}
                      >
                        <Pencil className="size-4" />
                      </Link>
                      <DeleteServiceButton
                        serviceId={service.id}
                        serviceName={service.name}
                      />
                    </div>
                  </div>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
