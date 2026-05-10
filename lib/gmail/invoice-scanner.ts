import Anthropic from "@anthropic-ai/sdk";
import { google, gmail_v1 } from "googleapis";
import type { SupabaseClient } from "@supabase/supabase-js";
import { uploadStorageObject } from "@/lib/supabase/storage";
import type { Database, Service } from "@/lib/types";

const INVOICE_QUERY =
  'newer_than:180d (invoice OR receipt OR "payment received" OR "tax invoice" OR חשבונית OR קבלה OR filename:pdf)';
const INVOICE_PDF_BUCKET = "invoice-pdfs";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

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
  searchableText: string;
}

interface PdfAttachment {
  attachmentId: string | null;
  filename: string;
  data: string | null;
}

interface PdfImport {
  storagePath: string | null;
  bytes: Buffer | null;
  filename: string | null;
}

interface PdfExtractedInvoice {
  invoiceDate?: string | null;
  amount?: number | null;
  currency?: "USD" | "ILS" | "EUR" | "GBP" | null;
  invoiceNumber?: string | null;
  vendorRaw?: string | null;
  searchableText?: string | null;
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
      const accountResult = await scanAccount(supabase, account, services ?? []);
      result.scannedMessages += accountResult.scannedMessages;
      result.insertedInvoices += accountResult.insertedInvoices;
      result.skippedMessages += accountResult.skippedMessages;
      result.errors.push(...accountResult.errors);
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

export async function scanAllConnectedEmailAccounts(
  supabase: SupabaseClient<Database>,
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
    .eq("scan_enabled", true);

  if (accountsError) {
    return { ...result, errors: [accountsError.message] };
  }

  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("*")
    .eq("status", "active");

  if (servicesError) {
    return { ...result, errors: [servicesError.message] };
  }

  for (const account of accounts ?? []) {
    result.scannedAccounts += 1;

    if (!account.provider_refresh_token) {
      result.errors.push(`Missing Google refresh token for ${account.email}`);
      continue;
    }

    try {
      const accountResult = await scanAccount(supabase, account, services ?? []);
      result.scannedMessages += accountResult.scannedMessages;
      result.insertedInvoices += accountResult.insertedInvoices;
      result.skippedMessages += accountResult.skippedMessages;
      result.errors.push(...accountResult.errors);
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
  const errors: string[] = [];

  for (const message of list.data.messages ?? []) {
    if (!message.id) {
      skippedMessages += 1;
      continue;
    }

    const fullMessage = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "full",
    });

    scannedMessages += 1;
    let pdfImport: PdfImport = {
      storagePath: null,
      bytes: null,
      filename: null,
    };
    try {
      pdfImport = await importFirstPdfAttachment(
        supabase,
        gmail,
        account,
        message.id,
        fullMessage.data,
      );
    } catch (error) {
      errors.push(
        error instanceof Error
          ? `${account.email}: PDF upload failed for message ${message.id}: ${error.message}`
          : `${account.email}: PDF upload failed for message ${message.id}`,
      );
    }

    let extracted: ExtractedInvoice | null = null;
    try {
      extracted = await extractInvoice(fullMessage.data, pdfImport);
    } catch (error) {
      errors.push(
        error instanceof Error
          ? `${account.email}: PDF extraction failed for message ${message.id}: ${error.message}`
          : `${account.email}: PDF extraction failed for message ${message.id}`,
      );
    }

    if (!extracted) {
      skippedMessages += 1;
      continue;
    }

    const workspaceServices = services.filter(
      (service) => service.workspace_id === account.workspace_id,
    );
    const matchedServiceId = findMatchingServiceId(extracted, workspaceServices);
    const invoice: InvoiceInsert = {
      workspace_id: account.workspace_id,
      service_id: matchedServiceId,
      invoice_date: extracted.invoiceDate,
      amount: extracted.amount,
      currency: extracted.currency,
      invoice_number: extracted.invoiceNumber,
      pdf_storage_path: pdfImport.storagePath,
      source_email_id: extracted.sourceEmailId,
      source_email_account_id: account.id,
      vendor_raw: extracted.vendorRaw,
      status: matchedServiceId ? "matched" : "unmatched",
      extraction_confidence: matchedServiceId ? 0.8 : 0.6,
    };

    const { error } = await supabase.from("invoices").upsert(invoice, {
      onConflict: "workspace_id,source_email_id",
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

  return { scannedMessages, insertedInvoices, skippedMessages, errors };
}

async function extractInvoice(
  message: gmail_v1.Schema$Message,
  pdfImport: PdfImport,
): Promise<ExtractedInvoice | null> {
  const headers = message.payload?.headers ?? [];
  const subject = headerValue(headers, "Subject") ?? "";
  const from = headerValue(headers, "From");
  const dateHeader = headerValue(headers, "Date");
  const bodyText = collectTextParts(message.payload);
  const searchableText = `${subject}\n${message.snippet ?? ""}\n${bodyText}`;
  const sourceEmailId = message.id;

  if (!sourceEmailId) {
    return null;
  }

  if (pdfImport.bytes) {
    const pdfExtracted = await extractInvoiceFromPdf(pdfImport, {
      subject,
      from,
      dateHeader,
      internalDate: message.internalDate,
      snippet: message.snippet,
    });

    if (pdfExtracted?.amount && pdfExtracted.currency) {
      return {
        sourceEmailId,
        invoiceDate:
          normalizeInvoiceDate(pdfExtracted.invoiceDate) ??
          normalizeDate(dateHeader, message.internalDate),
        amount: pdfExtracted.amount,
        currency: pdfExtracted.currency,
        invoiceNumber:
          pdfExtracted.invoiceNumber ?? extractInvoiceNumber(searchableText),
        vendorRaw: pdfExtracted.vendorRaw ?? cleanSender(from),
        searchableText: [
          from,
          searchableText,
          pdfExtracted.searchableText,
          pdfExtracted.vendorRaw,
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }
  }

  const amount = extractAmount(searchableText);
  if (!amount) {
    return null;
  }

  return {
    sourceEmailId,
    invoiceDate: normalizeDate(dateHeader, message.internalDate),
    amount: amount.amount,
    currency: amount.currency,
    invoiceNumber: extractInvoiceNumber(searchableText),
    vendorRaw: cleanSender(from),
    searchableText: `${from ?? ""}\n${searchableText}`,
  };
}

async function importFirstPdfAttachment(
  supabase: SupabaseClient<Database>,
  gmail: gmail_v1.Gmail,
  account: EmailAccountRow,
  messageId: string,
  message: gmail_v1.Schema$Message,
): Promise<PdfImport> {
  const pdf = findPdfAttachments(message.payload)[0];
  if (!pdf) return { storagePath: null, bytes: null, filename: null };

  const data = pdf.data ?? (await downloadAttachment(gmail, messageId, pdf));
  if (!data) return { storagePath: null, bytes: null, filename: pdf.filename || null };

  const bytes = base64UrlToBytes(data);
  const safeName = sanitizeFileName(pdf.filename || `${messageId}.pdf`);
  const storagePath = `${account.workspace_id}/${account.id}/${messageId}/${safeName}`;

  await uploadStorageObject(
    supabase,
    INVOICE_PDF_BUCKET,
    storagePath,
    bytes,
    "application/pdf",
  );

  return { storagePath, bytes, filename: safeName };
}

async function extractInvoiceFromPdf(
  pdfImport: PdfImport,
  email: {
    subject: string;
    from?: string | null;
    dateHeader?: string | null;
    internalDate?: string | null;
    snippet?: string | null;
  },
): Promise<PdfExtractedInvoice | null> {
  if (!pdfImport.bytes || !process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 600,
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            invoiceDate: { type: ["string", "null"] },
            amount: { type: ["number", "null"] },
            currency: {
              type: ["string", "null"],
              enum: ["USD", "ILS", "EUR", "GBP", null],
            },
            invoiceNumber: { type: ["string", "null"] },
            vendorRaw: { type: ["string", "null"] },
            searchableText: { type: ["string", "null"] },
          },
          required: [
            "invoiceDate",
            "amount",
            "currency",
            "invoiceNumber",
            "vendorRaw",
            "searchableText",
          ],
        },
      },
    },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            title: pdfImport.filename ?? "invoice.pdf",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfImport.bytes.toString("base64"),
            },
          },
          {
            type: "text",
            text: [
              "Extract invoice data from this PDF attachment.",
              "Return only fields matching the JSON schema.",
              "Use ISO date YYYY-MM-DD when a date exists.",
              "Use one of USD, ILS, EUR, GBP for currency.",
              "If total amount is unavailable, set amount to null.",
              "",
              `Email subject: ${email.subject}`,
              `Email from: ${email.from ?? ""}`,
              `Email date: ${email.dateHeader ?? email.internalDate ?? ""}`,
              `Email snippet: ${email.snippet ?? ""}`,
            ].join("\n"),
          },
        ],
      },
    ],
  });

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return parsePdfExtraction(text);
}

function parsePdfExtraction(value: string): PdfExtractedInvoice | null {
  try {
    const parsed = JSON.parse(value) as PdfExtractedInvoice;
    if (
      parsed.currency &&
      !["USD", "ILS", "EUR", "GBP"].includes(parsed.currency)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function normalizeInvoiceDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function findPdfAttachments(part?: gmail_v1.Schema$MessagePart): PdfAttachment[] {
  if (!part) return [];

  const current =
    (part.mimeType === "application/pdf" ||
      part.filename?.toLowerCase().endsWith(".pdf")) &&
    (part.body?.attachmentId || part.body?.data)
      ? [
          {
            attachmentId: part.body.attachmentId ?? null,
            filename: part.filename ?? "",
            data: part.body.data ?? null,
          },
        ]
      : [];

  return [
    ...current,
    ...(part.parts ?? []).flatMap((child) => findPdfAttachments(child)),
  ];
}

async function downloadAttachment(
  gmail: gmail_v1.Gmail,
  messageId: string,
  pdf: PdfAttachment,
) {
  if (!pdf.attachmentId) return null;

  const attachment = await gmail.users.messages.attachments.get({
    userId: "me",
    messageId,
    id: pdf.attachmentId,
  });

  return attachment.data.data ?? null;
}

function collectTextParts(part?: gmail_v1.Schema$MessagePart): string {
  if (!part) return "";

  const current =
    part.mimeType?.startsWith("text/") && part.body?.data
      ? base64UrlToText(part.body.data)
      : "";

  return [current, ...(part.parts ?? []).map((child) => collectTextParts(child))]
    .filter(Boolean)
    .join("\n");
}

function base64UrlToBytes(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function base64UrlToText(value: string) {
  return base64UrlToBytes(value).toString("utf8");
}

function headerValue(
  headers: gmail_v1.Schema$MessagePartHeader[],
  name: string,
) {
  return headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())
    ?.value;
}

function normalizeDate(dateHeader?: string | null, internalDate?: string | null) {
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

function findMatchingServiceId(invoice: ExtractedInvoice, services: Service[]) {
  const searchable = normalize(`${invoice.vendorRaw ?? ""}\n${invoice.searchableText}`);

  const keywordMatch = services.find((service) =>
    normalizedKeywords(service).some((keyword) => searchable.includes(keyword)),
  );
  if (keywordMatch) return keywordMatch.id;

  const service = services
    .filter((item) => normalizedKeywords(item).length === 0)
    .find((item) => {
      const names = [item.name, item.vendor].filter(Boolean).map((value) =>
        normalize(value!),
      );
      return names.some((name) => name && searchable.includes(name));
    });

  return service?.id ?? null;
}

function normalizedKeywords(service: Service) {
  return (service.invoice_keywords ?? [])
    .map((keyword) => normalize(keyword))
    .filter(Boolean);
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9א-ת]+/g, " ").trim();
}

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}
