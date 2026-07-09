import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getAuthenticatedServiceCatalog } from "@/lib/services/shared-catalog";
import { updateService } from "./actions";

export default async function EditServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase } = await getAuthenticatedServiceCatalog();
  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .single();

  if (!service) {
    notFound();
  }

  const action = updateService.bind(null, service.id);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href="/services"
          className="inline-flex items-center gap-2 text-sm text-(--color-muted) hover:text-(--color-foreground) mb-4"
        >
          <ArrowRight className="size-4" />
          חזרה להוצאות
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          עריכת הוצאה
        </h1>
        <p className="text-(--color-muted)">
          עדכון שם, עלות, מחזור חיוב ותאריך חידוש.
        </p>
      </div>

      <Card>
        <form action={action} className="grid grid-cols-1 gap-5">
          {error && (
            <div className="rounded-(--radius) border border-(--color-accent-red)/30 bg-(--color-accent-red)/10 p-3 text-sm text-(--color-accent-red)">
              {decodeURIComponent(error)}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="שם ההוצאה" required>
              <input name="name" required className="input" defaultValue={service.name} />
            </Field>
            <Field label="ספק">
              <input name="vendor" className="input" defaultValue={service.vendor ?? ""} />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="עלות" required>
              <input
                name="cost_amount"
                type="number"
                min="0"
                step="0.01"
                required
                className="input"
                defaultValue={Number(service.cost_amount)}
              />
            </Field>
            <Field label="מטבע">
              <select name="cost_currency" className="input" defaultValue={service.cost_currency}>
                <option value="USD">USD</option>
                <option value="ILS">ILS</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </Field>
            <Field label="מחזור חיוב">
              <select name="billing_cycle" className="input" defaultValue={service.billing_cycle}>
                <option value="monthly">חודשי</option>
                <option value="annual">שנתי</option>
                <option value="one_time">חד פעמי</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="תאריך חידוש הבא">
              <input
                name="next_renewal_date"
                type="date"
                className="input"
                defaultValue={service.next_renewal_date ?? ""}
              />
            </Field>
            <Field label="סטטוס">
              <select name="status" className="input" defaultValue={service.status}>
                <option value="active">פעיל</option>
                <option value="paused">מושהה</option>
                <option value="cancelled">בוטל</option>
              </select>
            </Field>
          </div>

          <details className="group rounded-(--radius) border border-(--color-border-soft)">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-(--color-muted) hover:text-(--color-foreground)">
              הגדרות מתקדמות
            </summary>
            <div className="grid gap-5 px-4 pb-5 pt-1">
              <Field label="אתר">
                <input
                  name="website"
                  type="url"
                  className="input"
                  defaultValue={service.website ?? ""}
                />
              </Field>

              <Field label="תגיות">
                <input name="tags" className="input" defaultValue={service.tags.join(", ")} />
              </Field>

              <Field label="מילות מפתח לזיהוי חשבוניות">
                <input
                  name="invoice_keywords"
                  className="input"
                  defaultValue={(service.invoice_keywords ?? []).join(", ")}
                />
              </Field>

              <Field label="שולם דרך אימייל">
                <input
                  name="paid_by_email"
                  type="email"
                  className="input"
                  defaultValue={service.paid_by_email ?? ""}
                />
              </Field>

              <Field label="הערות">
                <textarea
                  name="notes"
                  className="input min-h-28 resize-y py-3"
                  defaultValue={service.notes ?? ""}
                />
              </Field>
            </div>
          </details>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/services"
              className="inline-flex h-10 items-center justify-center rounded-(--radius) px-4 text-sm font-medium text-(--color-muted) hover:bg-(--color-surface-2) hover:text-(--color-foreground)"
            >
              ביטול
            </Link>
            <Button type="submit">
              <Save className="size-4" />
              שמירת שינויים
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-(--color-muted)">
        {label}
        {required && <span className="text-(--color-accent-red)"> *</span>}
      </span>
      {children}
    </label>
  );
}
