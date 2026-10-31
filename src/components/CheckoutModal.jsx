import React, { useEffect, useRef, useState } from "react";
import { Smartphone, Banknote, ShieldCheck, Check, ArrowRight, ArrowLeft, Loader2, Pencil } from "lucide-react";
import Modal from "./Modal.jsx";
import { supabase } from "../lib/supabase.js";
import { COD_FEE, UPI_APPS, inr } from "../lib/payments.js";

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not open the payment window. Check your internet connection."));
    document.body.appendChild(script);
  });
}

const functionMessage = async (error, data) => {
  if (data?.error) return data.error;
  try { const body = await error.context.json(); if (body?.error) return body.error; } catch {}
  if (/not found|404|failed to send|fetch/i.test(error?.message || "")) return "Online payment is not set up yet. Deploy the Supabase Edge Functions first (see README).";
  return error?.message || "Could not start the payment.";
};

const tableMissing = (error) => /orders/.test(error?.message || "") && /(relation|schema cache|find the table)/i.test(error?.message || "");

export default function CheckoutModal({ items, onClose, onOrderSaved, notify }) {
  const itemsTotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);

  // details -> method -> paying -> done   (slow = paid but confirmation is late)
  const [step, setStep] = useState("details");
  const [choice, setChoice] = useState(null); // null | "online" | "cod"
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState(null);
  const [doneKind, setDoneKind] = useState("cod");
  const [clientPaid, setClientPaid] = useState(false);

  const rzpRef = useRef(null);
  const stepRef = useRef(step);
  const clientPaidRef = useRef(false);
  const clientPaidAt = useRef(0);
  useEffect(() => { stepRef.current = step; }, [step]);

  const saveOrder = async (method, appName) => {
    const codFee = method === "cod" ? COD_FEE : 0;
    const row = {
      id: crypto.randomUUID(),
      items: items.map((i) => ({ id: i.id, title: i.title, price: Number(i.price), image: i.image, seller: i.seller })),
      items_total: itemsTotal,
      cod_fee: codFee,
      total: itemsTotal + codFee,
      payment_method: method,
      upi_app: method === "upi" ? appName : null,
      payment_status: method === "cod" ? "cod_pending" : "pending",
      delivery_address: address.trim(),
      phone: phone.replace(/[^0-9+]/g, ""),
    };
    const { data: authData } = await supabase.auth.getUser();
    row.buyer_id = authData?.user?.id;
    if (!row.buyer_id) throw new Error("Please sign in again to place the order.");
    const { error } = await supabase.from("orders").insert(row);
    if (error) throw error;
    return row;
  };

  const explain = (error) => tableMissing(error)
    ? "Orders table is missing. Run supabase/migrations/004_orders_pickups.sql in Supabase first."
    : error?.message || "Something went wrong. Please try again.";

  const goToMethod = (event) => {
    event.preventDefault();
    if (address.trim().length < 8) return notify("Please enter your full delivery address.");
    if (phone.replace(/\D/g, "").length < 10) return notify("Please enter a valid mobile number.");
    setStep("method");
  };

  const placeCod = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const saved = await saveOrder("cod");
      setOrder(saved); setDoneKind("cod"); setStep("done");
      onOrderSaved();
    } catch (error) { console.error(error); notify(explain(error)); }
    finally { setBusy(false); }
  };

  const cancelUnpaid = async (row) => {
    if (row) await supabase.from("orders").update({ payment_status: "cancelled" }).eq("id", row.id);
  };

  // Opens Razorpay with ONLY the chosen app, so the buyer lands straight in Paytm / PhonePe / Google Pay.
  const payOnline = async (app) => {
    if (busy) return;
    setBusy(true);
    let saved = null;
    try {
      saved = await saveOrder("upi", app.name);
      const { data, error } = await supabase.functions.invoke("create-razorpay-order", { body: { order_id: saved.id } });
      if (error || !data?.razorpay_order_id) throw new Error(await functionMessage(error, data));
      await loadRazorpay();

      clientPaidRef.current = false; setClientPaid(false);
      setOrder(saved); setStep("paying");
      const instrument = app.rzp ? { method: "upi", apps: [app.rzp] } : { method: "upi" };
      const rzp = new window.Razorpay({
        key: data.key_id,
        amount: data.amount,
        currency: "INR",
        order_id: data.razorpay_order_id,
        name: "ReWear AI",
        description: `${items.length} item${items.length === 1 ? "" : "s"}`,
        prefill: { contact: phone.replace(/[^0-9]/g, "").slice(-10) },
        theme: { color: "#183d32" },
        config: { display: { blocks: { chosen: { name: `Pay with ${app.name}`, instruments: [instrument] } }, sequence: ["block.chosen"], preferences: { show_default_blocks: false } } },
        // The browser only knows the payment finished. The order becomes "paid" when Razorpay confirms to our server.
        handler: () => { clientPaidRef.current = true; clientPaidAt.current = Date.now(); setClientPaid(true); },
        modal: { ondismiss: async () => {
          if (clientPaidRef.current || stepRef.current !== "paying") return;
          await cancelUnpaid(saved); setOrder(null); setStep("method");
          notify("Payment cancelled. You can try again or choose Cash on Delivery.");
        } },
      });
      rzp.on("payment.failed", (response) => notify(response?.error?.description || "Payment failed. Please try again."));
      rzpRef.current = rzp;
      rzp.open();
    } catch (error) {
      console.error(error);
      await cancelUnpaid(saved);
      setOrder(null);
      notify(tableMissing(error) ? explain(error) : error?.message || "Could not start the payment.");
    } finally { setBusy(false); }
  };

  // Waits for the server-confirmed "paid" status (live from Supabase, plus a safety check every 2.5 s).
  useEffect(() => {
    if (step !== "paying" || !order) return undefined;
    let alive = true;
    const finish = () => { if (!alive) return; alive = false; setDoneKind("upi"); setStep("done"); onOrderSaved(); };
    const check = (row) => { if (row?.payment_status === "paid") finish(); };

    const channel = supabase.channel(`order-${order.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` }, (payload) => check(payload.new))
      .subscribe();
    const timer = window.setInterval(async () => {
      const { data } = await supabase.from("orders").select("payment_status").eq("id", order.id).maybeSingle();
      check(data);
      if (alive && clientPaidRef.current && Date.now() - clientPaidAt.current > 90000) { alive = false; setStep("slow"); }
    }, 2500);
    return () => { alive = false; window.clearInterval(timer); supabase.removeChannel(channel); };
  }, [step, order?.id]);

  const total = itemsTotal + (choice === "cod" ? COD_FEE : 0);

  if (step === "done") return (
    <Modal title={doneKind === "cod" ? "Order placed!" : "Payment successful!"} eyebrow="CHECKOUT" onClose={onClose}>
      <div className="checkout-done">
        <span className="checkout-done-icon"><Check size={28} /></span>
        <p>{doneKind === "cod"
          ? <>Please keep <strong>{inr(order?.total)}</strong> ready in cash when the order arrives (includes the {inr(COD_FEE)} Cash on Delivery fee).</>
          : <>We received <strong>{inr(order?.total)}</strong>. Your order is confirmed.</>}</p>
        <p className="checkout-done-note">You can follow this order from your Dashboard.</p>
        <button className="button button-dark button-full" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );

  if (step === "slow") return (
    <Modal title="Payment is being confirmed" eyebrow="CHECKOUT" onClose={onClose}>
      <div className="checkout-done">
        <span className="checkout-done-icon waiting"><Loader2 size={26} className="spin" /></span>
        <p>Your payment went through, but the bank is taking longer than usual to confirm it. Your order will turn to <strong>Paid</strong> in your Dashboard automatically. No need to pay again.</p>
        <button className="button button-dark button-full" onClick={() => { onOrderSaved(); onClose(); }}>Go to my orders</button>
      </div>
    </Modal>
  );

  return (
    <Modal title="Checkout" eyebrow="SECURE YOUR PIECES" onClose={step === "paying" && !clientPaid ? () => rzpRef.current?.close?.() : onClose}>
      {step === "paying" ? (
        <div className="checkout-waiting">
          <span className="checkout-done-icon waiting"><Loader2 size={26} className="spin" /></span>
          <h3>{clientPaid ? "Confirming your payment…" : "Complete the payment in the app"}</h3>
          <p>{clientPaid ? "Almost done. This takes a few seconds. Please keep this page open." : <>Pay <strong>{inr(order?.total)}</strong> in the app that opened. When you come back, your confirmation shows up here by itself.</>}</p>
          {!clientPaid && <button className="text-button" onClick={() => rzpRef.current?.close?.()}>Cancel payment</button>}
        </div>
      ) : step === "details" ? (
        <form className="checkout-form" onSubmit={goToMethod}>
          <div className="checkout-section">
            <h3>Delivery details</h3>
            <label className="form-field"><span>Full delivery address *</span><textarea required rows="3" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House no., street, area, city, PIN code" /></label>
            <label className="form-field"><span>Mobile number *</span><input required type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile number" /></label>
          </div>
          <div className="checkout-summary">
            <div><span>Items ({items.length})</span><strong>{inr(itemsTotal)}</strong></div>
            <div className="checkout-total"><span>Total</span><strong>{inr(itemsTotal)}</strong></div>
          </div>
          <button className="button button-dark button-full" type="submit">Pay {inr(itemsTotal)} <ArrowRight size={16} /></button>
          <p className="checkout-secure"><ShieldCheck size={14} /> Next you choose how to pay: online or Cash on Delivery.</p>
        </form>
      ) : (
        <div className="checkout-form">
          <div className="checkout-address">
            <div><small>Delivering to</small><strong>{address.trim()}</strong><span>{phone}</span></div>
            <button type="button" className="text-button" onClick={() => { setStep("details"); setChoice(null); }}><Pencil size={12} /> Edit</button>
          </div>

          <div className="checkout-section">
            <h3>How do you want to pay?</h3>
            <div className="pay-options">
              <button type="button" className={`pay-option ${choice === "online" ? "selected" : ""}`} onClick={() => setChoice("online")}>
                <Smartphone size={20} /><div><strong>Pay online</strong><small>Paytm, PhonePe, Google Pay or any UPI app</small></div><em>No extra fee</em>
              </button>
              <button type="button" className={`pay-option ${choice === "cod" ? "selected" : ""}`} onClick={() => setChoice("cod")}>
                <Banknote size={20} /><div><strong>Cash on Delivery</strong><small>Pay in cash when it arrives</small></div><em className="fee">+ {inr(COD_FEE)}</em>
              </button>
            </div>

            {choice === "online" && <>
              <p className="checkout-pick">Choose your payment app. It opens right away with <strong>{inr(itemsTotal)}</strong> ready to pay.</p>
              <div className="upi-apps">
                {UPI_APPS.map((app) => <button type="button" key={app.id} className="upi-app" disabled={busy} onClick={() => payOnline(app)}><strong>{app.name}</strong><small>{busy ? "Opening…" : "Tap to pay"}</small></button>)}
              </div>
            </>}

            {choice === "cod" && <>
              <div className="checkout-summary">
                <div><span>Items ({items.length})</span><strong>{inr(itemsTotal)}</strong></div>
                <div><span>Cash on Delivery fee</span><strong>{inr(COD_FEE)}</strong></div>
                <div className="checkout-total"><span>Total to pay in cash</span><strong>{inr(total)}</strong></div>
              </div>
              <button className="button button-dark button-full" onClick={placeCod} disabled={busy}>{busy ? "Placing order…" : `Place order · ${inr(total)}`} <ArrowRight size={16} /></button>
            </>}
          </div>

          <button type="button" className="text-button" onClick={() => { setStep("details"); setChoice(null); }}><ArrowLeft size={13} /> Back</button>
          <p className="checkout-secure"><ShieldCheck size={14} /> We never see your UPI PIN. Payment happens inside your UPI app.</p>
        </div>
      )}
    </Modal>
  );
}
