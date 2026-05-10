"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scanConnectedEmailAccounts } from "@/lib/gmail/invoice-scanner";

export async function scanInvoices() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
