import Link from "next/link";
import { Pencil, Plus, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("*")
    .order("created_at", { ascending: false });

  const all = services ?? [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">שירותים</h1>
          <p className="text-[--color-muted]">
            {all.length} {all.length === 1 ? "שירות" : "שירותים"}
          </p>
        </div>
        <Link href="/services/new">
          <Button>
            <Plus className="size-4" />
            הוסף שירות
          </Button>
        </Link>
      </div>

      {all.length === 0 ? (
        <Card className="text-center py-16">
          <div className="text-5xl mb-4">📦</div>
          <h2 className="text-lg font-medium mb-1">עוד אין שירותים</h2>
          <p className="text-sm text-[--color-muted] mb-6">
            התחל בהוספת השירות הראשון שלך
          </p>
          <Link href="/services/new" className="inline-block">
            <Button>
              <Plus className="size-4" />
              הוסף שירות ראשון
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {all.map((s) => (
            <Card key={s.id} className="!p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{s.name}</div>
                  {s.vendor && (
                    <div className="text-xs text-[--color-muted] truncate mt-0.5">
                      {s.vendor}
                    </div>
                  )}
                </div>
                <span
                  className={
                    "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full " +
                    (s.status === "active"
                      ? "bg-[--color-accent-green]/10 text-[--color-accent-green]"
                      : s.status === "paused"
                        ? "bg-[--color-accent-amber]/10 text-[--color-accent-amber]"
                        : "bg-[--color-muted-2]/10 text-[--color-muted]")
                  }
                >
                  {s.status === "active" ? "פעיל" : s.status === "paused" ? "מושהה" : "בוטל"}
                </span>
              </div>

              <div className="kpi-number text-2xl">
                {formatCurrency(Number(s.cost_amount), s.cost_currency)}
                <span className="text-xs text-[--color-muted-2] font-normal mr-1">
                  / {s.billing_cycle === "monthly" ? "חודש" : s.billing_cycle === "annual" ? "שנה" : "חד-פ"}
                </span>
              </div>

              {s.next_renewal_date && (
                <div className="mt-3 text-xs text-[--color-muted]">
                  חידוש: {formatDate(s.next_renewal_date)}
                </div>
              )}

              {s.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.tags.map((t: string) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md bg-[--color-surface-2] text-[--color-muted]"
                    >
                      <Tag className="size-2.5" />
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-[--color-border-soft]">
                <Link
                  href={`/services/${s.id}/edit`}
                  className="inline-flex h-8 items-center gap-2 rounded-[--radius-sm] px-3 text-xs font-medium text-[--color-muted] hover:bg-[--color-surface-2] hover:text-[--color-foreground] transition-colors"
                >
                  <Pencil className="size-3.5" />
                  עריכה
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
