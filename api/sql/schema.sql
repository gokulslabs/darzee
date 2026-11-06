create table if not exists public.customers (
  id text primary key,
  name text not null,
  phone text not null,
  city text not null,
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
alter table public.orders enable row level security;
alter table public.payments enable row level security;
