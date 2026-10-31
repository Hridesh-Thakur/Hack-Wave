// Creates a Razorpay order for one of the signed-in buyer's own 'pending' UPI orders.
// Secrets needed: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET (SUPABASE_* are provided automatically).
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) return json({ error: "Online payment is not configured yet (Razorpay keys missing)." }, 500);

    // 1. Who is asking?
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Please sign in again." }, 401);

    const { order_id } = await req.json();
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 2. Only the buyer's own unpaid UPI order
    const { data: order } = await admin.from("orders").select("*").eq("id", order_id).eq("buyer_id", userData.user.id).maybeSingle();
    if (!order) return json({ error: "Order not found." }, 404);
    if (order.payment_method !== "upi" || order.payment_status !== "pending") return json({ error: "This order cannot be paid online." }, 400);

    // 3. Never trust the browser's total: re-price items that are real listings.
    const items = (order.items ?? []) as { id: unknown; price: number }[];
    const listingIds = items.map((i) => String(i.id)).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    const { data: listings } = listingIds.length
      ? await admin.from("listings").select("id,price").in("id", listingIds)
      : { data: [] as { id: string; price: number }[] };
    const priceById = new Map((listings ?? []).map((l) => [l.id, Number(l.price)]));
    const serverTotal = items.reduce((sum, i) => sum + (priceById.get(String(i.id)) ?? Number(i.price)), 0);
    if (Math.abs(serverTotal - Number(order.total)) > 0.5) return json({ error: "Order total does not match the item prices." }, 400);
    const amount = Math.round(serverTotal * 100); // paise
    if (amount < 100) return json({ error: "Amount is too small for an online payment." }, 400);

    // 4. Create (or reuse) the Razorpay order
    let razorpayOrderId = order.razorpay_order_id as string | null;
    if (!razorpayOrderId) {
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: "Basic " + btoa(`${keyId}:${keySecret}`), "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency: "INR", receipt: String(order.id).replace(/-/g, ""), notes: { order_id: order.id } }),
      });
      const rz = await res.json();
      if (!res.ok) return json({ error: rz?.error?.description ?? "Razorpay could not create the payment." }, 502);
      razorpayOrderId = rz.id as string;
      await admin.from("orders").update({ razorpay_order_id: razorpayOrderId }).eq("id", order.id);
    }
    return json({ key_id: keyId, razorpay_order_id: razorpayOrderId, amount });
  } catch (e) {
    return json({ error: (e as Error).message ?? "Unexpected error" }, 500);
  }
});
