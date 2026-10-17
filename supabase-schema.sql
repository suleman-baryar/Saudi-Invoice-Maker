-- ==============================================================================
-- Saudi Invoice Maker Pro - Supabase Schema
-- مركز الملك للدهانات (Markaz Al Malk Paint)
-- Project ID: kvmlpimudqjzljumnstw
-- ==============================================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/kvmlpimudqjzljumnstw/sql/new

-- 1. Invoices Table
create table if not exists public.invoices (
  id text primary key,
  invoice_number text not null,
  issue_date text not null,
  issue_time text,
  pricing_mode text default 'INCLUSIVE',
  status text default 'FINALIZED',
  payment_status text default 'PAID',
  payment_method text default 'CASH',
  customer_id text,
  customer_name text,
  customer_phone text,
  grand_total numeric default 0,
  taxable_amount numeric default 0,
  total_vat numeric default 0,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Customers Table
create table if not exists public.customers (
  id text primary key,
  name_ar text not null,
  name_en text,
  phone text,
  vat_number text,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Products Table
create table if not exists public.products (
  id text primary key,
  code text,
  name_ar text not null,
  name_en text,
  unit_price numeric default 0,
  vat_rate numeric default 15,
  data jsonb not null,
  created_at timestamptz default now()
);

-- 4. Company Profile Table
create table if not exists public.company_profile (
  id text primary key default 'comp_default_king',
  name_ar text not null default 'مركز الملك للدهانات',
  name_en text default 'King Paints Center',
  vat_number text,
  cr_number text,
  phone text,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- 5. Enable Row Level Security (RLS)
alter table public.invoices enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.company_profile enable row level security;

-- 6. Policies to allow read & write with Publishable / Anon API Key
drop policy if exists "Allow all operations for anon on invoices" on public.invoices;
create policy "Allow all operations for anon on invoices"
  on public.invoices for all to anon using (true) with check (true);

drop policy if exists "Allow all operations for anon on customers" on public.customers;
create policy "Allow all operations for anon on customers"
  on public.customers for all to anon using (true) with check (true);

drop policy if exists "Allow all operations for anon on products" on public.products;
create policy "Allow all operations for anon on products"
  on public.products for all to anon using (true) with check (true);

drop policy if exists "Allow all operations for anon on company_profile" on public.company_profile;
create policy "Allow all operations for anon on company_profile"
  on public.company_profile for all to anon using (true) with check (true);

-- Indexes for optimal lookup performance
create index if not exists idx_invoices_number on public.invoices (invoice_number);
create index if not exists idx_invoices_issue_date on public.invoices (issue_date desc);
