import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createService } from "./actions";

export default async function NewServicePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href="/services"
          className="inline-flex items-center gap-2 text-sm text-[--color-muted] hover:text-[--color-foreground] mb-4"
        >
          <ArrowRight className="size-4" />
          חזרה לשירותים
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight mb-2">
          הוספת שירות
        </h1>
        <p className="text-[--color-muted]">
          שמרו פרטי ספק, עלות, מחזור חיוב ותאריך חידוש כדי לעקוב אחרי התקציב.
        </p>
      </div>

      <Card>
        <form action={createService} className="grid grid-cols-1 gap-5">
          {error && (
            <div className="rounded-[--radius] border border-[--color-accent-red]/30 bg-[--color-accent-red]/10 p-3 text-sm text-[--color-accent-red]">
              {decodeURIComponent(error)}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="שם השירות" required>
              <input name="name" required className="input" placeholder="Bubble - EXSELI" />
            </Field>
            <Field label="ספק">
              <input name="vendor" className="input" placeholder="Bubble" />
            </Field>
          </div>

          <Field label="אתר">
            <input
              name="website"
              type="url"
              className="input"
              placeholder="https://bubble.io"
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="עלות" required>
              <input
                name="cost_amount"
                type="number"
                min="0"
                step="0.01"
                required
                className="input"
                placeholder="42.70"
              />
            </Field>
            <Field label="מטבע">
              <select name="cost_currency" className="input" defaultValue="USD">
                <option value="USD">USD</option>
                <option value="ILS">ILS</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </Field>
            <Field label="מחזור חיוב">
              <select name="billing_cycle" className="input" defaultValue="monthly">
                <option value="monthly">חודשי</option>
                <option value="annual">שנתי</option>
                <option value="one_time">חד פעמי</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="תאריך חידוש הבא">
              <input name="next_renewal_date" type="date" className="input" />
            </Field>
            <Field label="סטטוס">
              <select name="status" className="input" defaultValue="active">
                <option value="active">פעיל</option>
                <option value="paused">מושהה</option>
                <option value="cancelled">בוטל</option>
              </select>
            </Field>
          </div>

          <Field label="תגיות">
            <input name="tags" className="input" placeholder="פיתוח, מוצר, nonprofit" />
          </Field>

          <Field label="מילות מפתח לזיהוי חשבוניות">
            <input
              name="invoice_keywords"
              className="input"
              placeholder="שם מוצר, שם אפליקציה בבאבל, project id..."
            />
          </Field>

          <Field label="שולם דרך אימייל">
            <input
              name="paid_by_email"
              type="email"
              className="input"
              placeholder="team@mindcet.org"
            />
          </Field>

          <Field label="הערות">
            <textarea
              name="notes"
              className="input min-h-28 resize-y py-3"
              placeholder="פרטים פנימיים, בעלים בצוות, תנאי הנחה..."
            />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/services"
              className="inline-flex h-10 items-center justify-center rounded-[--radius] px-4 text-sm font-medium text-[--color-muted] hover:bg-[--color-surface-2] hover:text-[--color-foreground]"
            >
              ביטול
            </Link>
            <Button type="submit">
              <Save className="size-4" />
              שמירת שירות
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
      <span className="font-medium text-[--color-muted]">
        {label}
        {required && <span className="text-[--color-accent-red]"> *</span>}
      </span>
      {children}
    </label>
  );
}
