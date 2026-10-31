# ReWear AI | Phase 1 + Supabase database

React + Vite frontend with Supabase Auth, PostgreSQL listings, photo storage, and starter tables for distance-based shipper payouts.

## 1. Requirements
- Node.js 18+
- A Supabase project (free tier is enough to start)

## 2. Create the database
1. Open https://supabase.com and create a project.
2. In the project, open **SQL Editor > New query**.
3. Paste the full contents of `supabase/schema.sql` and run it. This creates profiles, listings, delivery rate configuration, shipments, shipper payouts, RLS policies, and a `listing-photos` storage bucket.

## 3. Configure the app
1. In Supabase open **Project Settings > API** (or **Connect**).
2. Copy the Project URL and the public anon/publishable key. Never use the `service_role` secret in browser code.
3. Copy `.env.example` to `.env` in the project root.
4. Fill in the values:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

5. Install and run:

```bash
npm install
npm run dev
```

If Vite was already running when `.env` was created, stop it with Ctrl+C and run `npm run dev` again.

## 4. Create your private admin account
1. In Supabase open **Authentication > Users > Add user** and create your admin using an email/password you control. Confirm the user if needed.
2. In **SQL Editor**, run the query below after replacing the email with the exact admin email:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where lower(email) = lower('your-admin-email@example.com');
```

3. Use the Admin sign in link on ReWear AI and sign in with that account. Do not add public admin signup or put admin credentials in frontend code.

## 5. User and shipper accounts
- Choose **User** or **Shipper** on the login screen, then create an account.
- Supabase Auth handles password storage and sessions. The database trigger creates a profile and restricts public signup to `user` or `shipper`.
- If email confirmation is enabled in Supabase, confirm the email before signing in.

## 6. What's connected in this phase
- Real user/shipper/admin authentication through Supabase Auth.
- Marketplace listings load from PostgreSQL, with starter demo products retained as examples.
- New listings and uploaded photos save to Supabase.
- Database tables are ready for delivery rate settings (`base_fee + distance_km * per_km_rate`), shipments and payout records.

## Important security / next phase
- The UI's admin and shipper dashboard figures are still demo data. Shipment assignment, distance calculation, rate editing, payout approval and actual money transfer are not wired up yet.
- The schema intentionally does not allow client-side payout/rate changes. Add Supabase Edge Functions (server-side) for admin-only rate updates, delivery status changes and payout approvals before production. Verify a delivery before creating/approving a payout.
- Never put a Supabase service-role key, payment-provider secret, or other private API key in `.env` variables prefixed with `VITE_`. Those are exposed to the browser.

## Signup profile fields: full name and mobile number

The signup form collects the person's full name, country calling code, and local mobile number. The country dropdown includes flag emojis and calling codes. These values are saved to Supabase Auth user metadata and copied into `public.profiles` by the signup trigger. The database stores the country code in `phone_country_code` (for example `+91`) and the local number in `phone_number` separately.

For a new project, run the complete `schema.sql`. If the database was created using an earlier version, run `supabase/migrations/002_phone_country_code.sql` in the SQL Editor. This adds the country-code column without deleting existing data. Existing accounts keep their previous phone values until you update them through a profile-edit flow.

The phone number is collected as profile contact information only; this does not verify ownership by SMS. Add an SMS OTP verification flow separately if phone verification is required.
