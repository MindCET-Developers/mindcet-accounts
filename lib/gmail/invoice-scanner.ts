import { google, gmail_v1 } from "googleapis";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Service } from "@/lib/types";

const INVOICE_QUERY =
  'newer_than:180d (invoice OR receipt OR "payment received" OR "tax invoice" OR חשבונית OR קבלה)';

type EmailAccountRow = Database["public"]["Tables"]["email_accounts"]["Row"];
type InvoiceInsert = Database["public"]["Tables"]["invoices"]["Insert"];

export interface ScanResult {
  scannedAccounts: number;
  scannedMessages: number;
  insertedInvoices: number;
  skippedMessages: number;
  errors: string[];
}

interface ExtractedInvoice {
  sourceEmailId: string;
  invoiceDate: string;
  amount: number;
  currency: "USD" | "ILS" | "EUR" | "GBP";
  invoiceNumber: string | null;
  vendorRaw: string | null;
}

export async function scanConnectedEmailAccounts(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ScanResult> {
  const result: ScanResult = {
    scannedAccounts: 0,
    scannedMessages: 0,
    insertedInvoices: 0,
    skippedMessages: 0,
    errors: [],
  };

  const { data: accounts, error: accountsError } = await supabase
    .from("email_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("scan_enabled", true);

  if (accountsError) {
    return { ...result, errors: [accountsError.message] };
  }

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("status", "active");

  for (const account of accounts ?? []) {
    result.scannedAccounts += 1;

    if (!account.provider_refresh_token) {
      result.errors.push(`Missing Google refresh token for ${account.email}`);
      continue;
    }

    try {
      const accountResult = await scanAccount(
        supabase,
        account,
        services ?? [],
      );
      result.scannedMessages += accountResult.scannedMessages;
      result.insertedInvoices += accountResult.insertedInvoices;
      result.skippedMessages += accountResult.skippedMessages;
    } catch (error) {
      result.errors.push(
        error instanceof Error
          ? `${account.email}: ${error.message}`
          : `${account.email}: Unknown scan error`,
      );
    }
  }

  return result;
}

async function scanAccount(
  supabase: SupabaseClient<Database>,
  account: EmailAccountRow,
  services: Service[],
) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: account.provider_refresh_token });

  const gmail = google.gmail({ version: "v1", auth });
  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: 20,
    q: INVOICE_QUERY,
  });

  let scannedMessages = 0;
  let insertedInvoices = 0;
  let skippedMessages = 0;

  for (const message of list.data.messages ?? []) {
    if (!message.id) {
      skippedMessages += 1;
      continue;
    }

    const fullMessage = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "metadata",
      metadataHeaders: ["From", "Subject", "Date"],
    });

    scannedMessages += 1;
    const extracted = extractInvoice(fullMessage.data);

    if (!extracted) {
      skippedMessages += 1;
      continue;
    }

    const matchedServiceId = findMatchingServiceId(extracted.vendorRaw, services);
    const invoice: InvoiceInsert = {
      workspace_id: account.workspace_id,
      service_id: matchedServiceId,
      invoice_date: extracted.invoiceDate,
      amount: extracted.amount,
      currency: extracted.currency,
      invoice_number: extracted.invoiceNumber,
      pdf_storage_path: null,
      source_email_id: extracted.sourceEmailId,
      source_email_account_id: account.id,
      vendor_raw: extracted.vendorRaw,
      status: matchedServiceId ? "matched" : "unmatched",
      extraction_confidence: 0.65,
    };

    const { error } = await supabase.from("invoices").upsert(invoice, {
      onConflict: "workspace_id,source_email_id",
      ignoreDuplicates: true,
    });

    if (error) {
      skippedMessages += 1;
      continue;
    }

    insertedInvoices += 1;
  }

  await supabase
    .from("email_accounts")
    .update({ last_scan_at: new Date().toISOString() })
    .eq("id", account.id);

  return { scannedMessages, insertedInvoices, skippedMessages };
}

function extractInvoice(message: gmail_v1.Schema$Message): ExtractedInvoice | null {
  const headers = message.payload?.headers ?? [];
  const subject = headerValue(headers, "Subject") ?? "";
  const from = headerValue(headers, "From");
  const dateHeader = headerValue(headers, "Date");
  const text = `${subject}\n${message.snippet ?? ""}`;
  const amount = extractAmount(text);

  if (!message.id || !amount) {
    return null;
  }

  return {
    sourceEmailId: message.id,
    invoiceDate: normalizeDate(dateHeader ?? undefined, message.internalDate),
    amount: amount.amount,
    currency: amount.currency,
    invoiceNumber: extractInvoiceNumber(text),
    vendorRaw: cleanSender(from),
  };
}

function headerValue(
  headers: gmail_v1.Schema$MessagePartHeader[],
  name: string,
) {
  return headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())
    ?.value;
}

function normalizeDate(dateHeader?: string, internalDate?: string | null) {
  const parsed = dateHeader ? new Date(dateHeader) : null;
  const fallback = internalDate ? new Date(Number(internalDate)) : new Date();
  const date = parsed && !Number.isNaN(parsed.getTime()) ? parsed : fallback;
  return date.toISOString().slice(0, 10);
}

function extractAmount(text: string) {
  const patterns: Array<{
    currency: "USD" | "ILS" | "EUR" | "GBP";
    regex: RegExp;
  }> = [
    { currency: "USD", regex: /(?:USD|\$)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i },
    { currency: "ILS", regex: /(?:ILS|NIS|₪)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i },
    { currency: "EUR", regex: /(?:EUR|€)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i },
    { currency: "GBP", regex: /(?:GBP|£)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i },
    { currency: "ILS", regex: /([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:ILS|NIS|₪)/i },
    { currency: "USD", regex: /([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:USD|\$)/i },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (!match?.[1]) continue;

    const amount = Number(match[1].replaceAll(",", ""));
    if (Number.isFinite(amount)) {
      return { amount, currency: pattern.currency };
    }
  }

  return null;
}

function extractInvoiceNumber(text: string) {
  const match = text.match(/(?:invoice|receipt|חשבונית|קבלה)\s*(?:#|no\.?|מס׳|מספר)?\s*([A-Z0-9-]{4,})/i);
  return match?.[1] ?? null;
}

function cleanSender(sender?: string | null) {
  if (!sender) return null;
  return sender.replace(/<[^>]+>/g, "").replaceAll('"', "").trim() || null;
}

function findMatchingServiceId(vendor: string | null, services: Service[]) {
  if (!vendor) return null;
  const normalizedVendor = normalize(vendor);
  const service = services.find((item) => {
    const names = [item.name, item.vendor].filter(Boolean).map((value) =>
      normalize(value!),
    );
    return names.some(
      (name) => normalizedVendor.includes(name) || name.includes(normalizedVendor),
    );
  });

  return service?.id ?? null;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9א-ת]+/g, " ").trim();
}
