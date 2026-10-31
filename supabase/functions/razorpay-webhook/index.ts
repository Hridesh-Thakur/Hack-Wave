// Razorpay calls this URL the moment a payment succeeds. We verify the signature,
// then mark the order 'paid'. The open checkout screen (Supabase Realtime) shows the confirmation instantly.
// Secrets needed: RAZORPAY_WEBHOOK_SECRET. Deploy with: --no-verify-jwt (Razorpay has no Supabase login).
import { createClient } from "npm:@supabase/supabase-js@2";

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

Deno.serve(async (req) => {
  const raw = await req.text();
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) return new Response("Webhook secret missing", { status: 500 });

  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  if (!safeEqual(expected, req.headers.get("x-razorpay-signature") ?? "")) return new Response("Invalid signature", { status: 401 });

  const event = JSON.parse(raw);
  if (event.event === "payment.captured" || event.event === "order.paid") {
    const payment = event.payload?.payment?.entity;
    const rzOrder = event.payload?.order?.entity;
    const razorpayOrderId: string | undefined = payment?.order_id ?? rzOrder?.id;
    const paidAmount: number | undefined = payment?.amount ?? rzOrder?.amount_paid;
    if (razorpayOrderId) {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: order } = await admin.from("orders").select("id,total,payment_status").eq("razorpay_order_id", razorpayOrderId).maybeSingle();
      // Only mark paid when the money received matches the order total.
      if (order && order.payment_status !== "paid" && Math.round(Number(order.total) * 100) === paidAmount) {
        await admin.from("orders").update({ payment_status: "paid", razorpay_payment_id: payment?.id ?? null, paid_at: new Date().toISOString() }).eq("id", order.id);
      }
    }
  }
  return new Response("ok", { status: 200 });
});
