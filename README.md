## What ReWear AI Can Do

- **User Authentication:** Sign up and log in as a user or shipper, with a separate admin access flow.
- **Browse Clothing:** Explore pre-loved clothing with product images, prices, sizes, conditions, and locations.
- **Search and Filter:** Search clothing items, filter by category, and sort by price.
- **Sell Clothes:** Upload clothing photos, add item details, set prices, and publish listings.
- **Buy Clothes:** Add items to a shopping cart and proceed to checkout.
- **Exchange Clothes:** Explore clothing items available for swapping.
- **Donate Clothes:** Create donation listings to help give clothes a second life.
- **Virtual Try-On Preview:** Upload a personal photo and preview it alongside a selected clothing item. Full AI garment fitting is planned for a future phase.
- **User Dashboard:** View personal listings, order information, saved-item counts, and pickup updates.
- **Shipper Dashboard:** View available listings, confirm pickups, provide estimated arrival times, and update pickup status.
- **Admin Dashboard:** Access an administrator-oriented dashboard through the admin account flow.
- **Database Integration:** Use Supabase for authentication, clothing listings, image storage, orders, and pickup records, depending on configuration and database permissions.
- **Responsive Interface:** Navigate a modern marketplace interface with dedicated shopping, selling, exchange, donation, dashboard, and help sections.
- **Sustainability Focus:** Encourage clothing reuse, reduce textile waste, and promote circular fashion.

**Project Goal:** ReWear AI connects people who want to buy, sell, exchange, or donate pre-loved clothing through a single sustainable fashion marketplace.

## Online payment with automatic confirmation (Razorpay + Supabase)

Flow: Pay → Pay online → Paytm / PhonePe / Google Pay (opens straight in that app) → Razorpay tells our `razorpay-webhook` function → order becomes `paid` → the checkout screen shows the confirmation by itself (Supabase Realtime). There is no "I have paid" button.

1. Create a Razorpay account (https://razorpay.com). Use **Test mode** first. Copy `Key Id` and `Key Secret` (Settings → API Keys).
2. Run `supabase/migrations/004_orders_pickups.sql` and then `supabase/migrations/005_razorpay_payments.sql` in the Supabase SQL Editor.
3. Install and log in to the Supabase CLI, link the project and deploy the functions:

```bash
npx supabase login
npx supabase link --project-ref rktgvmctbxtygafumprx
npx supabase secrets set RAZORPAY_KEY_ID=rzp_test_xxxxxxxx RAZORPAY_KEY_SECRET=xxxxxxxx RAZORPAY_WEBHOOK_SECRET=choose-a-long-random-text
npx supabase functions deploy create-razorpay-order
npx supabase functions deploy razorpay-webhook --no-verify-jwt
```

4. In Razorpay → Settings → Webhooks → Add: URL `https://rktgvmctbxtygafumprx.supabase.co/functions/v1/razorpay-webhook`, secret = the same `RAZORPAY_WEBHOOK_SECRET`, events `payment.captured` and `order.paid`.
5. Never put the Razorpay secret in `.env` or in the frontend.
