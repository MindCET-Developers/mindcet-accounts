-- Invoice scan improvements:
-- 1. Service-specific keywords for more accurate email-to-service matching.
-- 2. Private storage bucket for invoice PDF attachments.

alter table public.services
  add column if not exists invoice_keywords text[] not null default '{}';

insert into storage.buckets (id, name, public)
values ('invoice-pdfs', 'invoice-pdfs', false)
on conflict (id) do nothing;

create policy "read own workspace invoice pdfs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'invoice-pdfs'
    and (storage.foldername(name))[1] = public.current_workspace_id()::text
  );

create policy "insert own workspace invoice pdfs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'invoice-pdfs'
    and (storage.foldername(name))[1] = public.current_workspace_id()::text
  );

create policy "update own workspace invoice pdfs"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'invoice-pdfs'
    and (storage.foldername(name))[1] = public.current_workspace_id()::text
  )
  with check (
    bucket_id = 'invoice-pdfs'
    and (storage.foldername(name))[1] = public.current_workspace_id()::text
  );
