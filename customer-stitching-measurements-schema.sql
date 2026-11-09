-- Run once in Darzee's Supabase SQL Editor to preserve custom garment measurements.
alter table public.customers add column if not exists book_no text;

create table if not exists public.customer_measurement_sets (
  id text primary key,
  source_customer_id text not null,
  customer_id text not null references public.customers (id) on delete cascade,
  garment text not null,
  measurements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.customer_measurement_sets
  drop constraint if exists customer_measurement_sets_source_customer_id_garment_key;
grant select, insert, update, delete on public.customer_measurement_sets to authenticated, service_role;

alter table public.customer_measurement_sets enable row level security;
alter table public.customer_measurement_sets add column if not exists user_id uuid references auth.users (id) on delete cascade;
create index if not exists customer_measurement_sets_user_id_idx on public.customer_measurement_sets (user_id);

drop policy if exists customer_measurement_sets_owner on public.customer_measurement_sets;
create policy customer_measurement_sets_owner on public.customer_measurement_sets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
