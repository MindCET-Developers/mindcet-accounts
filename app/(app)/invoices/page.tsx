import { FileText, Link2 } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ScanInvoicesButton } from "@/components/invoices/ScanInvoicesButton";
import { getAuthenticatedServiceCatalog } from "@/lib/services/shared-catalog";
import { createClient } from "@/lib/supabase/server";
import { createStorageSignedUrl } from "@/lib/supabase/storage";
import type { Invoice, Service } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { assignInvoiceToService, scanInvoices } from "./actions";

type InvoiceWithService = Invoice & {
  services: { name: string } | null;
};

export const maxDuration = 60;

const hebrewMonth = new Intl.DateTimeFormat("he", {
  month: "long",
  year: "numeric",
});

function monthKey(invoiceDate: string): string {
  return invoiceDate.slice(0, 7); // YYYY-MM
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return hebrewMonth.format(new Date(year, month - 1, 1));
}

function formatTotals(invoices: InvoiceWithService[]): string {
  const byCurrency = new Map<string, number>();
  for (const invoice of invoices) {
    const current = byCurrency.get(invoice.currency) ?? 0;
    byCurrency.set(invoice.currency, current + Number(invoice.amount));
  }
  return [...byCurrency.entries()]
    .map(([currency, total]) => formatCurrency(total, currency))
    .join(" + ");
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    scanned?: string;
    inserted?: string;
    skipped?: string;
    error?: string;
    assigned?: string;
    service_id?: string;
  }>;
}) {
  const scanStatus = await searchParams;
  const activeServiceId = scanStatus.service_id ?? "";
  const supabase = await createClient();
  const { supabase: serviceCatalog } = await getAuthenticatedServiceCatalog();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: emailAccounts } = user
    ? await supabase
        .from("email_accounts")
        .select("email,last_scan_at,scan_enabled")
        .eq("user_id", user.id)
    : { data: [] };

  let invoicesQuery = supabase
    .from("invoices")
    .select("*, services(name)")
    .order("invoice_date", { ascending: false })
    .limit(200);

  if (activeServiceId === "__unassigned__") {
    invoicesQuery = invoicesQuery.is("service_id", null);
  } else if (activeServiceId) {
    invoicesQuery = invoicesQuery.eq("service_id", activeServiceId);
  }

  const { data: invoices } = await invoicesQuery.returns<InvoiceWithService[]>();

  const { data: services } = await serviceCatalog
    .from("services")
    .select("id,name,vendor")
    .order("name", { ascending: true })
    .returns<Pick<Service, "id" | "name" | "vendor">[]>();

  const all = invoices ?? [];
  const serviceOptions = services ?? [];
  const signedPdfUrls = new Map(
    await Promise.all(
      all
        .filter((invoice) => invoice.pdf_storage_path)
        .map(async (invoice) => {
          const signedUrl = await createStorageSignedUrl(
            supabase,
            "invoice-pdfs",
            invoice.pdf_storage_path!,
            60 * 10,
          ).catch(() => null);

          return [invoice.id, signedUrl] as const;
        }),
    ),
  );

  // קיבוץ לפי חודש — השאילתה כבר ממוינת מהחדש לישן
  const months = new Map<string, InvoiceWithService[]>();
  for (const invoice of all) {
    const key = monthKey(invoice.invoice_date);
    if (!months.has(key)) months.set(key, []);
    months.get(key)!.push(invoice);
  }

  const connectedAccount = emailAccounts?.[0];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-2">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-2">חשבוניות</h1>
          <p className="text-sm text-[--color-muted]">
            {connectedAccount ? (
              <>
                Gmail מחובר: {connectedAccount.email}
                {connectedAccount.last_scan_at && (
                  <> · סריקה אחרונה: {formatDate(connectedAccount.last_scan_at)}</>
                )}
              </>
            ) : (
              "החשבוניות נשמרות כאן אוטומטית מסריקת המייל"
            )}
          </p>
        </div>
        <form action={scanInvoices}>
          <ScanInvoicesButton />
        </form>
      </div>

      {/* ── הודעות זמניות ── */}
      <div className="flex flex-col gap-2 mb-6 empty:mb-0">
        {!connectedAccount && (
          <div className="rounded-[--radius] border border-[--color-accent-amber]/30 bg-[--color-accent-amber]/10 px-4 py-3 text-sm text-[--color-accent-amber]">
            לא נמצא חשבון Gmail מחובר לסריקה. התחברות חדשה עם Google תשמור את ההרשאה.
          </div>
        )}

        {(scanStatus.scanned || scanStatus.error) && (
          <div
            className={
              "rounded-[--radius] border px-4 py-3 text-sm " +
              (scanStatus.error
                ? "border-[--color-accent-red]/30 bg-[--color-accent-red]/10 text-[--color-accent-red]"
                : "border-[--color-accent-green]/30 bg-[--color-accent-green]/10 text-[--color-accent-green]")
            }
          >
            {scanStatus.error
              ? decodeURIComponent(scanStatus.error)
              : `נסרקו ${scanStatus.scanned} מיילים, נוספו ${scanStatus.inserted} חשבוניות, דולגו ${scanStatus.skipped}.`}
          </div>
        )}

        {scanStatus.assigned && (
          <div className="rounded-[--radius] border border-[--color-accent-green]/30 bg-[--color-accent-green]/10 px-4 py-3 text-sm text-[--color-accent-green]">
            החשבונית שויכה לשירות.
          </div>
        )}
      </div>

      {/* ── פילטר לפי שירות ── */}
      <form method="GET" className="mt-4 mb-8 flex flex-wrap items-center gap-2">
        <label className="text-sm text-[--color-muted] whitespace-nowrap">הצג:</label>
        <select
          name="service_id"
          defaultValue={activeServiceId}
          className="input h-9 w-auto min-w-44 text-sm"
        >
          <option value="">הכל</option>
          <option value="__unassigned__">לא משויך</option>
          {serviceOptions.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
              {service.vendor ? ` · ${service.vendor}` : ""}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-9 rounded-[--radius-sm] px-4 text-sm font-medium text-[--color-brand-600] hover:bg-[--color-surface-2]"
        >
          סנן
        </button>
        {activeServiceId && (
          <a
            href="/invoices"
            className="text-sm text-[--color-muted] hover:text-[--color-foreground] underline"
          >
            נקה
          </a>
        )}
      </form>

      {all.length === 0 ? (
        <Card className="text-center py-16">
          <div className="mx-auto mb-4 size-12 rounded-[--radius-md] bg-[--color-surface-2] grid place-items-center text-[--color-brand-600]">
            <FileText className="size-6" />
          </div>
          <h2 className="text-lg font-medium mb-1">עדיין אין חשבוניות</h2>
          <p className="text-sm text-[--color-muted]">
            סריקת Gmail תוסיף לכאן חשבוניות כשמזוהה סכום במייל.
          </p>
        </Card>
      ) : (
        <div className="grid gap-8">
          {[...months.entries()].map(([key, monthInvoices]) => (
            <section key={key}>
              <div className="flex items-baseline justify-between gap-3 mb-3 px-1">
                <h2 className="text-base font-semibold">
                  {monthLabel(key)}
                  <span className="mr-2 text-xs font-normal text-[--color-muted]">
                    ({monthInvoices.length})
                  </span>
                </h2>
                <div className="kpi-number text-sm text-[--color-muted]">
                  {formatTotals(monthInvoices)}
                </div>
              </div>

              <Card className="overflow-hidden !p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-[--color-muted]">
                      <tr className="border-b border-[--color-border-soft]">
                        <th className="text-right font-medium px-5 py-3">תאריך</th>
                        <th className="text-right font-medium px-5 py-3">ספק</th>
                        <th className="text-right font-medium px-5 py-3">שירות</th>
                        <th className="text-left font-medium px-5 py-3">סכום</th>
                        <th className="text-right font-medium px-5 py-3">PDF</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[--color-border-soft]">
                      {monthInvoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-[--color-surface-2]/50">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {formatDate(invoice.invoice_date)}
                          </td>
                          <td className="px-5 py-3.5">{invoice.vendor_raw ?? "-"}</td>
                          <td className="px-5 py-3.5">
                            {invoice.service_id ? (
                              (invoice.services?.name ?? "-")
                            ) : (
                              <form
                                action={assignInvoiceToService}
                                className="flex items-center gap-2"
                              >
                                <input type="hidden" name="invoice_id" value={invoice.id} />
                                <select
                                  name="service_id"
                                  defaultValue=""
                                  className="input h-8 w-auto min-w-36 text-xs"
                                >
                                  <option value="">לא משויך</option>
                                  {serviceOptions.map((service) => (
                                    <option key={service.id} value={service.id}>
                                      {service.name}
                                      {service.vendor ? ` · ${service.vendor}` : ""}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="submit"
                                  className="h-8 rounded-[--radius-sm] px-3 text-xs font-medium text-[--color-brand-600] hover:bg-[--color-surface-2]"
                                >
                                  שיוך
                                </button>
                              </form>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-left kpi-number whitespace-nowrap">
                            {formatCurrency(Number(invoice.amount), invoice.currency)}
                          </td>
                          <td className="px-5 py-3.5">
                            {signedPdfUrls.get(invoice.id) ? (
                              <Link
                                href={signedPdfUrls.get(invoice.id)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[--color-brand-600] hover:text-[--color-brand-700]"
                              >
                                <Link2 className="size-3.5" />
                                קובץ
                              </Link>
                            ) : (
                              <span className="text-[--color-muted-2]">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
