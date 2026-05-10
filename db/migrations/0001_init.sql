-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  MindCET Accounts and Payments — initial schema                 ║
-- ║  Migration: 0001_init                                            ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- ──────────────────────────────────────────────────────────────────
-- Extensions
-- ──────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- ──────────────────────────────────────────────────────────────────
-- Enums
-- ──────────────────────────────────────────────────────────────────
create type billing_cycle as enum ('monthly', 'annual', 'one_time');
create type service_status as enum ('active', 'paused', 'cancelled');
create type currency_code as enum ('USD', 'ILS', 'EUR', 'GBP');
create type invoice_status as enum ('matched', 'unmatched', 'manual');
create type reminder_type as enum ('renewal', 'nonprofit_expiry');
create type user_role as enum ('owner', 'member');

-- ──────────────────────────────────────────────────────────────────
-- workspaces  (a team/org owns its services + invoices)
-- ──────────────────────────────────────────────────────────────────
create table public.workspaces (
  id              uuid primary key default extensions.uuid_generate_v4(),
  name            text not null,
  default_currency currency_code not null default 'USD',
  created_at      timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────
-- profiles  (extends auth.users, joined by id)
-- ──────────────────────────────────────────────────────────────────
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  display_name    text,
  avatar_url      text,
  role            user_role not null default 'member',
  created_at      timestamptz not null default now()
);
create index profiles_workspace_id_idx on public.profiles(workspace_id);

-- Auto-create a profile + personal workspace on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_workspace_id uuid;
begin
  insert into public.workspaces (name, default_currency)
  values (coalesce(new.raw_user_meta_data->>'full_name', 'My Workspace'), 'USD')
  returning id into new_workspace_id;

  insert into public.profiles (id, workspace_id, display_name, avatar_url, role)
  values (
    new.id,
    new_workspace_id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url',
    'owner'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: current user's workspace_id (used in all RLS policies)
create or replace function public.current_workspace_id()
returns uuid
language sql
stable
security definer set search_path = public
as $$
  select workspace_id from public.profiles where id = auth.uid()
$$;

-- ──────────────────────────────────────────────────────────────────
-- email_accounts  (Gmail mailboxes connected per user)
-- ──────────────────────────────────────────────────────────────────
create table public.email_accounts (
  id                       uuid primary key default extensions.uuid_generate_v4(),
  workspace_id             uuid not null references public.workspaces(id) on delete cascade,
  user_id                  uuid not null references auth.users(id) on delete cascade,
  email                    text not null,
  provider_refresh_token   text,
  scan_enabled             boolean not null default true,
  last_scan_at             timestamptz,
  last_history_id          text,
  created_at               timestamptz not null default now(),
  unique (workspace_id, email)
);
create index email_accounts_workspace_idx on public.email_accounts(workspace_id);

-- ──────────────────────────────────────────────────────────────────
-- services  (the catalog — heart of the app)
-- ──────────────────────────────────────────────────────────────────
create table public.services (
  id                  uuid primary key default extensions.uuid_generate_v4(),
  workspace_id        uuid not null references public.workspaces(id) on delete cascade,
  name                text not null,
  vendor              text,
  website             text,
  logo_url            text,
  billing_cycle       billing_cycle not null default 'monthly',
  cost_amount         numeric(12, 2) not null default 0,
  cost_currency       currency_code not null default 'USD',
  next_renewal_date   date,
  status              service_status not null default 'active',
  tags                text[] not null default '{}',
  invoice_keywords    text[] not null default '{}',
  notes               text,
  paid_by_email       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index services_workspace_idx on public.services(workspace_id);
create index services_renewal_idx on public.services(workspace_id, next_renewal_date) where status = 'active';
create index services_tags_gin on public.services using gin(tags);

-- ──────────────────────────────────────────────────────────────────
-- nonprofit_discounts  (one per service if eligible)
-- ──────────────────────────────────────────────────────────────────
create table public.nonprofit_discounts (
  id                uuid primary key default extensions.uuid_generate_v4(),
  service_id        uuid not null unique references public.services(id) on delete cascade,
  discount_pct      numeric(5, 2),
  expires_at        date,
  renewal_url       text,
  last_renewed_at   date,
  notes             text,
  created_at        timestamptz not null default now()
);
create index nonprofit_expiry_idx on public.nonprofit_discounts(expires_at);

-- ──────────────────────────────────────────────────────────────────
-- invoices  (mostly auto-extracted from Gmail)
-- ──────────────────────────────────────────────────────────────────
create table public.invoices (
  id                          uuid primary key default extensions.uuid_generate_v4(),
  workspace_id                uuid not null references public.workspaces(id) on delete cascade,
  service_id                  uuid references public.services(id) on delete set null,
  invoice_date                date not null,
  amount                      numeric(12, 2) not null,
  currency                    currency_code not null,
  invoice_number              text,
  pdf_storage_path            text,
  source_email_id             text,
  source_email_account_id     uuid references public.email_accounts(id) on delete set null,
  vendor_raw                  text,
  status                      invoice_status not null default 'unmatched',
  extraction_confidence       numeric(3, 2),
  created_at                  timestamptz not null default now(),
  unique (workspace_id, source_email_id)
);
create index invoices_workspace_idx on public.invoices(workspace_id);
create index invoices_service_idx on public.invoices(service_id);
create index invoices_date_idx on public.invoices(workspace_id, invoice_date desc);

-- ──────────────────────────────────────────────────────────────────
-- reminders  (per service, can have multiple offsets)
-- ──────────────────────────────────────────────────────────────────
create table public.reminders (
  id              uuid primary key default extensions.uuid_generate_v4(),
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  service_id      uuid not null references public.services(id) on delete cascade,
  type            reminder_type not null,
  days_before     integer not null check (days_before >= 0),
  channels        text[] not null default '{email,calendar}',
  last_sent_at    timestamptz,
  created_at      timestamptz not null default now(),
  unique (service_id, type, days_before)
);
create index reminders_workspace_idx on public.reminders(workspace_id);

-- ──────────────────────────────────────────────────────────────────
-- exchange_rates  (daily snapshot from cron)
-- ──────────────────────────────────────────────────────────────────
create table public.exchange_rates (
  date            date not null,
  from_currency   currency_code not null,
  to_currency     currency_code not null,
  rate            numeric(14, 6) not null,
  primary key (date, from_currency, to_currency)
);

-- ──────────────────────────────────────────────────────────────────
-- updated_at trigger for services
-- ──────────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger services_updated_at
  before update on public.services
  for each row execute function public.touch_updated_at();

-- ══════════════════════════════════════════════════════════════════
-- Row Level Security
-- ══════════════════════════════════════════════════════════════════
alter table public.workspaces            enable row level security;
alter table public.profiles              enable row level security;
alter table public.email_accounts        enable row level security;
alter table public.services              enable row level security;
alter table public.nonprofit_discounts   enable row level security;
alter table public.invoices              enable row level security;
alter table public.reminders             enable row level security;
alter table public.exchange_rates        enable row level security;

-- workspaces
create policy "members read own workspace"
  on public.workspaces for select
  using (id = public.current_workspace_id());

create policy "owners update own workspace"
  on public.workspaces for update
  using (
    exists (select 1 from public.profiles
            where id = auth.uid() and workspace_id = workspaces.id and role = 'owner')
  );

-- profiles
create policy "read profiles in own workspace"
  on public.profiles for select
  using (workspace_id = public.current_workspace_id());

create policy "update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- email_accounts (sensitive — own user only)
create policy "rw own email accounts"
  on public.email_accounts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and workspace_id = public.current_workspace_id());

-- services
create policy "rw workspace services"
  on public.services for all
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- nonprofit_discounts (gated by parent service)
create policy "rw workspace nonprofit_discounts"
  on public.nonprofit_discounts for all
  using (
    exists (select 1 from public.services s
            where s.id = nonprofit_discounts.service_id
            and s.workspace_id = public.current_workspace_id())
  )
  with check (
    exists (select 1 from public.services s
            where s.id = nonprofit_discounts.service_id
            and s.workspace_id = public.current_workspace_id())
  );

-- invoices
create policy "rw workspace invoices"
  on public.invoices for all
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- reminders
create policy "rw workspace reminders"
  on public.reminders for all
  using (workspace_id = public.current_workspace_id())
  with check (workspace_id = public.current_workspace_id());

-- exchange_rates: read-only for any authenticated user
create policy "read exchange rates"
  on public.exchange_rates for select
  to authenticated
  using (true);
