-- ReWear AI: automatic online payment confirmation (Razorpay + Supabase).
-- Run once in Supabase Dashboard > SQL Editor. Safe to run again.

alter table public.orders add column if not exists razorpay_order_id text unique;
alter table public.orders add column if not exists razorpay_payment_id text;
alter table public.orders add column if not exists paid_at timestamptz;

-- The browser may only change payment_status (for example to 'cancelled').
-- Amounts and Razorpay ids are written by the Edge Functions only, and 'paid' is
-- set only by the verified Razorpay webhook (the RLS policy already blocks 'paid' from the browser).
revoke update on public.orders from authenticated;
grant update (payment_status) on public.orders to authenticated;

-- Live updates: the checkout screen listens to its own order and shows the confirmation the moment it turns 'paid'.
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null;
end $$;
