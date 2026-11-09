create table if not exists public.customers (
  id text primary key,
  name text not null,
  phone text not null,
  city text not null,
  book_no text,
  created_at timestamptz not null default now()
);

create table if not exists public.measurements (
  id text primary key,
  customer_id text not null references public.customers (id) on delete cascade,
  label text not null,
  chest double precision not null,
  waist double precision not null,
  hip double precision not null,
  shoulder double precision not null,
  sleeve double precision not null,
  neck double precision not null,
  inseam double precision not null,
  length double precision not null,
  note text not null default '',
  recorded_on date not null
);

-- Preserves custom label/value measurements imported from the legacy billing app.
create table if not exists public.customer_measurement_sets (
  id text primary key,
  source_customer_id text not null,
  customer_id text not null references public.customers (id) on delete cascade,
  garment text not null,
  measurements jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  order_no text not null unique,
  customer_id text not null references public.customers (id),
  garment text not null,
  due_date date not null,
  fitting_date date,
  price integer not null check (price >= 0),
  stage text not null check (stage in ('Cutting', 'Stitching', 'Finishing', 'Trial', 'Ready')),
  notes text not null default ''
);

create table if not exists public.payments (
  id text primary key,
  order_id text not null references public.orders (id) on delete cascade,
  amount integer not null check (amount > 0),
  paid_on date not null,
  method text not null check (method in ('Cash', 'UPI', 'Card')),
  note text not null default ''
);

create index if not exists measurements_customer_id_idx on public.measurements (customer_id);
create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_stage_idx on public.orders (stage);
create index if not exists payments_order_id_idx on public.payments (order_id);

alter table public.customers enable row level security;
alter table public.measurements enable row level security;
alter table public.customer_measurement_sets enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;

alter table public.customers add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.measurements add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.customer_measurement_sets add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.orders add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.payments add column if not exists user_id uuid references auth.users (id) on delete cascade;

create index if not exists customers_user_id_idx on public.customers (user_id);
create index if not exists measurements_user_id_idx on public.measurements (user_id);
create index if not exists customer_measurement_sets_user_id_idx on public.customer_measurement_sets (user_id);
create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists payments_user_id_idx on public.payments (user_id);

create policy customers_owner on public.customers
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy measurements_owner on public.measurements
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy customer_measurement_sets_owner on public.customer_measurement_sets
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy orders_owner on public.orders
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy payments_owner on public.payments
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
