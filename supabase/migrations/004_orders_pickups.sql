-- ReWear AI: payments (orders) + shipper pickup confirmations.
-- Safe to run more than once. Run in Supabase Dashboard > SQL Editor.

-- ---------------------------------------------------------------
-- Orders: one row per checkout (UPI app payment or Cash on Delivery)
-- ---------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,          -- snapshot of cart items at purchase time
  items_total numeric(10,2) not null check (items_total >= 0),
  cod_fee numeric(10,2) not null default 0 check (cod_fee >= 0),
  total numeric(10,2) not null check (total >= 0),
  payment_method text not null check (payment_method in ('upi','cod')),
  upi_app text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending','awaiting_verification','paid','cod_pending','cancelled')),
  delivery_address text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

drop policy if exists "Buyers read own orders" on public.orders;
create policy "Buyers read own orders" on public.orders for select to authenticated
  using (buyer_id = (select auth.uid()));

-- A buyer can only create an order that is still unpaid ('pending') or COD ('cod_pending').
drop policy if exists "Buyers create own orders" on public.orders;
create policy "Buyers create own orders" on public.orders for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and payment_status in ('pending','cod_pending')
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'user')
  );

-- A buyer may only move their order between pending / awaiting_verification / cancelled.
-- 'paid' must be set by a trusted server (payment gateway webhook or admin), never by the browser.
drop policy if exists "Buyers update own unpaid orders" on public.orders;
create policy "Buyers update own unpaid orders" on public.orders for update to authenticated
  using (buyer_id = (select auth.uid()) and payment_status in ('pending','awaiting_verification'))
  with check (buyer_id = (select auth.uid()) and payment_status in ('pending','awaiting_verification','cancelled'));

-- ---------------------------------------------------------------
-- Pickups: a shipper confirms they will collect a listing within N minutes
-- ---------------------------------------------------------------
create table if not exists public.pickups (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references public.listings(id) on delete cascade, -- one shipper per listing
  seller_id uuid not null references public.profiles(id) on delete cascade,         -- filled by trigger
  shipper_id uuid not null references public.profiles(id) on delete cascade,
  shipper_name text not null default '',                                             -- filled by trigger
  eta_minutes integer not null check (eta_minutes between 5 and 2880),
  eta_at timestamptz not null,                                                       -- filled by trigger
  status text not null default 'confirmed' check (status in ('confirmed','picked_up')),
  created_at timestamptz not null default now()
);

create index if not exists pickups_seller_idx on public.pickups (seller_id);
create index if not exists pickups_shipper_idx on public.pickups (shipper_id);

-- The server decides seller, shipper name and arrival time so the browser cannot fake them.
create or replace function public.set_pickup_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  l_seller uuid;
  l_status text;
  s_name text;
begin
  select seller_id, status into l_seller, l_status from public.listings where id = new.listing_id;
  if l_seller is null then raise exception 'Listing not found'; end if;
  if l_status <> 'active' then raise exception 'Listing is no longer available'; end if;
  select full_name into s_name from public.profiles where id = new.shipper_id;
  new.seller_id := l_seller;
  new.shipper_name := coalesce(nullif(s_name, ''), 'Your shipper');
  new.eta_at := now() + make_interval(mins => new.eta_minutes);
  return new;
end;
$$;

drop trigger if exists pickups_set_fields on public.pickups;
create trigger pickups_set_fields before insert on public.pickups
for each row execute procedure public.set_pickup_fields();

alter table public.pickups enable row level security;

-- Sellers see pickups of their own listings; shippers see all pickups (to know what is already taken).
drop policy if exists "Sellers and shippers read pickups" on public.pickups;
create policy "Sellers and shippers read pickups" on public.pickups for select to authenticated
  using (
    seller_id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'shipper')
  );

drop policy if exists "Shippers confirm pickups" on public.pickups;
create policy "Shippers confirm pickups" on public.pickups for insert to authenticated
  with check (
    shipper_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'shipper')
  );

drop policy if exists "Shippers update own pickups" on public.pickups;
create policy "Shippers update own pickups" on public.pickups for update to authenticated
  using (shipper_id = (select auth.uid()))
  with check (shipper_id = (select auth.uid()));

-- A shipper can cancel (delete) a pickup that is not picked up yet, which frees it for other shippers.
drop policy if exists "Shippers cancel own pickups" on public.pickups;
create policy "Shippers cancel own pickups" on public.pickups for delete to authenticated
  using (shipper_id = (select auth.uid()) and status = 'confirmed');
