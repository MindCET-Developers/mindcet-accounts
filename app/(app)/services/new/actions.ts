"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  getAuthenticatedServiceCatalog,
  getSharedWorkspaceId,
} from "@/lib/services/shared-catalog";
import type { BillingCycle, CurrencyCode, ServiceStatus } from "@/lib/types";

const serviceSchema = z.object({
  name: z.string().trim().min(1, "שם השירות נדרש"),
  vendor: z.string().trim().optional(),
  website: z.string().trim().url("כתובת אתר לא תקינה").or(z.literal("")).optional(),
  billing_cycle: z.enum(["monthly", "annual", "one_time"]),
  cost_amount: z.coerce.number().min(0, "העלות חייבת להיות 0 או יותר"),
  cost_currency: z.enum(["USD", "ILS", "EUR", "GBP"]),
  next_renewal_date: z.string().optional(),
  status: z.enum(["active", "paused", "cancelled"]),
  tags: z.string().trim().optional(),
  invoice_keywords: z.string().trim().optional(),
  paid_by_email: z.string().trim().email("אימייל לא תקין").or(z.literal("")).optional(),
  notes: z.string().trim().optional(),
});

function optionalValue(value?: string) {
  return value && value.length > 0 ? value : null;
}

function listValue(value?: string) {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function serviceSaveError(error: { code?: string; message: string }) {
  if (
    error.code === "42703" &&
    error.message.includes("invoice_keywords")
  ) {
    return "Database is missing services.invoice_keywords. Run db/migrations/0002_invoice_scan_improvements.sql in Supabase, then try again.";
  }

  return error.message;
}

export async function createService(formData: FormData) {
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ?? "לא הצלחנו לשמור את השירות";
    redirect(`/services/new?error=${encodeURIComponent(message)}`);
  }

  const { supabase } = await getAuthenticatedServiceCatalog();
  const workspaceId = await getSharedWorkspaceId();
  const values = parsed.data;
  const { error } = await supabase.from("services").insert({
    workspace_id: workspaceId,
    name: values.name,
    vendor: optionalValue(values.vendor),
    website: optionalValue(values.website),
    logo_url: null,
    billing_cycle: values.billing_cycle as BillingCycle,
    cost_amount: values.cost_amount,
    cost_currency: values.cost_currency as CurrencyCode,
    next_renewal_date: optionalValue(values.next_renewal_date),
    status: values.status as ServiceStatus,
    tags: listValue(values.tags),
    invoice_keywords: listValue(values.invoice_keywords),
    notes: optionalValue(values.notes),
    paid_by_email: optionalValue(values.paid_by_email),
  });

  if (error) {
    redirect(`/services/new?error=${encodeURIComponent(serviceSaveError(error))}`);
  }

  revalidatePath("/");
  revalidatePath("/services");
  redirect("/services");
}
