/**
 * Database types — manually mirrored from db/migrations/0001_init.sql.
 * Regenerate with `supabase gen types typescript` once CLI is set up.
 */

export type BillingCycle = "monthly" | "annual" | "one_time";
export type ServiceStatus = "active" | "paused" | "cancelled";
export type CurrencyCode = "USD" | "ILS" | "EUR" | "GBP";
export type InvoiceStatus = "matched" | "unmatched" | "manual";
export type ReminderType = "renewal" | "nonprofit_expiry";
export type UserRole = "owner" | "member";

export interface Workspace {
  id: string;
  name: string;
  default_currency: CurrencyCode;
  created_at: string;
}

export interface Profile {
  id: string;
  workspace_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

export interface EmailAccount {
  id: string;
  workspace_id: string;
  user_id: string;
  email: string;
  provider_refresh_token: string | null;
  scan_enabled: boolean;
  last_scan_at: string | null;
  last_history_id: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  workspace_id: string;
  name: string;
  vendor: string | null;
  website: string | null;
  logo_url: string | null;
  billing_cycle: BillingCycle;
  cost_amount: number;
  cost_currency: CurrencyCode;
  next_renewal_date: string | null;
  status: ServiceStatus;
  tags: string[];
  invoice_keywords: string[];
  notes: string | null;
  paid_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface NonprofitDiscount {
  id: string;
  service_id: string;
  discount_pct: number | null;
  expires_at: string | null;
  renewal_url: string | null;
  last_renewed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  workspace_id: string;
  service_id: string | null;
  invoice_date: string;
  amount: number;
  currency: CurrencyCode;
  invoice_number: string | null;
  pdf_storage_path: string | null;
  source_email_id: string | null;
  source_email_account_id: string | null;
  vendor_raw: string | null;
  status: InvoiceStatus;
  extraction_confidence: number | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  workspace_id: string;
  service_id: string;
  type: ReminderType;
  days_before: number;
  channels: string[];
  last_sent_at: string | null;
  created_at: string;
}

export interface ExchangeRate {
  date: string;
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  rate: number;
}

type DbRecord<T> = T & Record<string, unknown>;

type Table<Row, Insert = Row, Update = Partial<Row>> = {
  Row: DbRecord<Row>;
  Insert: DbRecord<Insert>;
  Update: DbRecord<Update>;
  Relationships: [];
};

// Minimal Database type for typed Supabase client.
// Expand with full Insert/Update/Row variants when needed.
export interface Database {
  public: {
    Tables: {
      workspaces: Table<Workspace, Partial<Workspace> & Pick<Workspace, "name">>;
      profiles: Table<Profile, Partial<Profile> & Pick<Profile, "id" | "workspace_id">>;
      email_accounts: Table<
        EmailAccount,
        Omit<EmailAccount, "id" | "created_at" | "last_scan_at" | "last_history_id">
      >;
      services: Table<
        Service,
        Omit<Service, "id" | "created_at" | "updated_at">
      >;
      nonprofit_discounts: Table<
        NonprofitDiscount,
        Omit<NonprofitDiscount, "id" | "created_at">
      >;
      invoices: Table<Invoice, Omit<Invoice, "id" | "created_at">>;
      reminders: Table<Reminder, Omit<Reminder, "id" | "created_at">>;
      exchange_rates: Table<ExchangeRate>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
