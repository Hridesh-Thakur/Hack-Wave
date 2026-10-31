-- ReWear AI Phase 1 database schema for Supabase PostgreSQL
-- Run this entire file in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone_country_code text not null default '+91',
  phone_number text not null default '',
  role text not null default 'user' check (role in ('user','shipper','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  seller_name text not null default '',
  title text not null check (char_length(title) between 2 and 70),
  category text not null,
  size text not null default 'M',
  condition text not null default 'Good' check (condition in ('Like new','Good','Fair')),
  price numeric(10,2) not null default 0 check (price >= 0),
  location text not null default '',
  note text not null default '',
  image_url text,
  listing_type text not null default 'sale' check (listing_type in ('sale','exchange','donation')),
  status text not null default 'active' check (status in ('active','reserved','sold','removed')),
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_rate_configs (
  id uuid primary key default gen_random_uuid(),
  base_fee numeric(10,2) not null default 20 check (base_fee >= 0),
  per_km_rate numeric(10,2) not null default 8 check (per_km_rate >= 0),
  active boolean not null default true,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  buyer_id uuid references public.profiles(id),
  seller_id uuid references public.profiles(id),
  shipper_id uuid references public.profiles(id),
  pickup_address text not null,
  delivery_address text not null,
  distance_km numeric(8,2) not null check (distance_km >= 0),
  base_fee_snapshot numeric(10,2) not null,
  per_km_rate_snapshot numeric(10,2) not null,
  payout_amount numeric(10,2) generated always as (round(base_fee_snapshot + distance_km * per_km_rate_snapshot, 2)) stored,
  status text not null default 'available' check (status in ('available','accepted','picked_up','delivered','cancelled')),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.shipper_payouts (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null unique references public.shipments(id) on delete cascade,
  shipper_id uuid not null references public.profiles(id),
  amount numeric(10,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending','approved','paid','rejected')),
  approved_by uuid references public.profiles(id),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- Keep existing projects compatible when this schema is run again.
alter table public.profiles add column if not exists phone_country_code text not null default '+91';
alter table public.profiles add column if not exists phone_number text not null default '';

-- Create a profile on signup. Role is restricted to user/shipper; public signup cannot create an admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone_country_code, phone_number, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone_country_code', '+91'),
    coalesce(new.raw_user_meta_data ->> 'phone_number', ''),
    case when new.raw_user_meta_data ->> 'role' = 'shipper' then 'shipper' else 'user' end
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.delivery_rate_configs enable row level security;
alter table public.shipments enable row level security;
alter table public.shipper_payouts enable row level security;

-- Profiles: each account can read/update its own non-role fields. Role changes are not allowed via this policy.
drop policy if exists "Profiles readable by owner" on public.profiles;
create policy "Profiles readable by owner" on public.profiles for select to authenticated using (id = (select auth.uid()));
-- Profile role is intentionally not client-updatable. If profile editing is added later,
-- grant update on full_name only and keep role changes in a trusted admin workflow.

-- Public can browse active listings; signed-in users manage only their own listings.
drop policy if exists "Anyone can read active listings" on public.listings;
create policy "Anyone can read active listings" on public.listings for select using (status = 'active' or seller_id = (select auth.uid()));
drop policy if exists "Users create own listings" on public.listings;
create policy "Users create own listings" on public.listings for insert to authenticated with check (seller_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'user'));
drop policy if exists "Owners update own listings" on public.listings;
create policy "Owners update own listings" on public.listings for update to authenticated using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
drop policy if exists "Owners delete own listings" on public.listings;
create policy "Owners delete own listings" on public.listings for delete to authenticated using (seller_id = (select auth.uid()));

-- Rate config: active rate can be read by signed-in users. Admin changes should be made through a trusted server/Edge Function.
drop policy if exists "Read active delivery rates" on public.delivery_rate_configs;
create policy "Read active delivery rates" on public.delivery_rate_configs for select to authenticated using (active = true);

-- Shippers can see available jobs and their own jobs; users can see shipments they participate in.
drop policy if exists "Participants read shipments" on public.shipments;
create policy "Participants read shipments" on public.shipments for select to authenticated using (
  buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or shipper_id = (select auth.uid()) or
  (shipper_id is null and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'shipper'))
);
-- Shipment creation and state transitions/payout approval should be implemented through server-side Edge Functions before production.

drop policy if exists "Shipper reads own payouts" on public.shipper_payouts;
create policy "Shipper reads own payouts" on public.shipper_payouts for select to authenticated using (shipper_id = (select auth.uid()));

-- Public clothing photos. Never upload secrets or private documents to this bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "Public read listing photos" on storage.objects;
create policy "Public read listing photos" on storage.objects for select using (bucket_id = 'listing-photos');
drop policy if exists "Authenticated upload listing photos" on storage.objects;
create policy "Authenticated upload listing photos" on storage.objects for insert to authenticated with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Owners update listing photos" on storage.objects;
create policy "Owners update listing photos" on storage.objects for update to authenticated using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Owners delete listing photos" on storage.objects;
create policy "Owners delete listing photos" on storage.objects for delete to authenticated using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

insert into public.delivery_rate_configs (base_fee, per_km_rate, active)
select 20, 8, true where not exists (select 1 from public.delivery_rate_configs where active = true);

-- Existing projects: add the seller_name column used by the Sell page.
alter table public.listings add column if not exists seller_name text not null default '';


-- ===== Payments (orders) and shipper pickups (same as migrations/004_orders_pickups.sql) =====
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
