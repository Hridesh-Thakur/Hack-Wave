-- ReWear AI migration: show the seller's name on listings.
-- Safe to run on an existing project; it does not delete existing data.
alter table public.listings
  add column if not exists seller_name text not null default '';
