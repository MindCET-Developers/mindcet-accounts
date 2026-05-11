"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { scanConnectedEmailAccounts } from "@/lib/gmail/invoice-scanner";

function invoiceActionError(message: string): never {
  redirect(`/invoices?error=${encodeURIComponent(message)}`);
}

async function authenticatedSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function scanInvoices() {
  const { supabase, user } = await authenticatedSupabase();

  const result = await scanConnectedEmailAccounts(supabase, user.id);
  const params = new URLSearchParams({
    scanned: String(result.scannedMessages),
    inserted: String(result.insertedInvoices),
    skipped: String(result.skippedMessages),
  });

  if (result.errors.length > 0) {
    params.set("error", result.errors[0]);
  }

  revalidatePath("/invoices");
  redirect(`/invoices?${params.toString()}`);
}

const assignInvoiceSchema = z.object({
  invoice_id: z.string().uuid(),
  service_id: z.string().uuid().or(z.literal("")),
});

export async function assignInvoiceToService(formData: FormData) {
  const parsed = assignInvoiceSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    invoiceActionError("לא הצלחנו לשייך את החשבונית");
  }

  const { supabase } = await authenticatedSupabase();
  const serviceId = parsed.data.service_id || null;

  if (serviceId) {
    const { data: service, error: serviceError } = await createAdminClient()
      .from("services")
      .select("id")
      .eq("id", serviceId)
      .single();

    if (serviceError || !service) {
      invoiceActionError(serviceError?.message ?? "לא נמצא שירות לשיוך");
    }
  }

  const { error } = await supabase
    .from("invoices")
    .update({
      service_id: serviceId,
      status: serviceId ? "manual" : "unmatched",
    })
    .eq("id", parsed.data.invoice_id);

  if (error) {
    invoiceActionError(error.message);
  }

  revalidatePath("/");
  revalidatePath("/invoices");
  redirect(serviceId ? "/invoices?assigned=1" : "/invoices");
}
