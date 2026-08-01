-- PPM Charity Fund Tracker — Supabase schema
-- Run this in your Supabase project's SQL Editor (Dashboard → SQL Editor → New query).

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  default_amount numeric(10, 2),
  created_at timestamptz not null default now()
);

-- Safe to re-run against a database that already has the members table
-- from before default_amount existed.
alter table members add column if not exists default_amount numeric(10, 2);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members (id) on delete cascade,
  month date not null, -- always stored as the first day of the month, e.g. 2026-08-01
  amount numeric(10, 2),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (member_id, month)
);

create index if not exists payments_month_idx on payments (month);
create index if not exists payments_member_id_idx on payments (member_id);

alter table members enable row level security;
alter table payments enable row level security;

-- This app has no login system — anyone with the anon key (i.e. anyone who has
-- the deployed URL) can read and write. That matches "members mark themselves
-- paid" with no account system. If you later add real user accounts, tighten
-- these policies to check auth.uid() instead of allowing anon access.

create policy "Anyone can read members" on members
  for select to anon using (true);

create policy "Anyone can add members" on members
  for insert to anon with check (true);

create policy "Anyone can update members" on members
  for update to anon using (true) with check (true);

create policy "Anyone can read payments" on payments
  for select to anon using (true);

create policy "Anyone can add payments" on payments
  for insert to anon with check (true);

create policy "Anyone can delete payments" on payments
  for delete to anon using (true);
