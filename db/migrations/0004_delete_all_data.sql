-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  Delete all data — invoices, services, reminders, discounts      ║
-- ║  Migration: 0004_delete_all_data                                 ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- תחזוקה: 2026-07-14
-- מחק את כל החשבוניות, השירותים, וההזכרונות

-- Delete in correct order to respect foreign key constraints
delete from public.invoices;
delete from public.reminders;
delete from public.nonprofit_discounts;
delete from public.services;

-- Reset sequences if any
alter sequence if exists public.services_id_seq restart with 1;
