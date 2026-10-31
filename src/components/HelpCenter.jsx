import React, { useEffect, useRef, useState } from "react";
import { Bot, UserRound, Send, RotateCcw, CircleHelp } from "lucide-react";
import { COD_FEE, inr } from "../lib/payments.js";

const USER_GROUPS = [
  { title: "Selling, exchanging & donating", faqs: [
    { id: "sell", q: "How do I sell an item?", a: "Open Sell in the top menu, add a photo, fill in the name, price, size and a short description, keep “I want to” on Sell it, and press Publish item. It appears in the shop right away." },
    { id: "exchange", q: "How do I exchange an item?", a: "On the Sell page choose Exchange it in the “I want to” box and publish. Your piece then shows up under the Exchange tab." },
    { id: "donate", q: "How do I donate clothes?", a: "On the Sell page choose Donate it. The price is set to free automatically. After publishing, a shipper can confirm to collect it from you." },
    { id: "donate-own", q: "Why does the Donate tab show only my items?", a: "The Donate tab is your personal space: it lists only the items you uploaded for donation, so you can follow each one until a shipper collects it." },
    { id: "remove", q: "How do I remove a listing?", a: "Go to Sell, find the item under “Your uploads” and press the bin icon next to it." },
  ] },
  { title: "Payments", faqs: [
    { id: "methods", q: "Which payment options are available?", a: `You can pay online with any UPI app (PhonePe, Paytm, Google Pay and others), or choose Cash on Delivery. Cash on Delivery adds a ${inr(COD_FEE)} fee.` },
    { id: "upi", q: "How does online payment work?", a: "Press Pay at checkout, choose Pay online, then tap Paytm, PhonePe, Google Pay or another UPI app. The app opens straight away with the amount filled in. Pay there and return to ReWear AI: your confirmation appears by itself, there is nothing more to tap." },
    { id: "cod", q: "Is there an extra charge for Cash on Delivery?", a: `Yes. Cash on Delivery has a ${inr(COD_FEE)} handling fee added to your total. Paying online with UPI has no extra fee.` },
    { id: "upi-not-open", q: "My payment app did not open. What now?", a: "Online payment opens UPI apps on a phone that has the app installed. On a computer, open the website on your phone, or use Cash on Delivery. You can also pick “Other UPI app” to see every app on your phone." },
    { id: "verify", q: "When is my online payment confirmed?", a: "Within a few seconds of paying, the payment screen shows “Payment successful” and the order is marked Paid in your Dashboard under Your orders. If it takes longer, do not pay again: it updates by itself." },
  ] },
  { title: "Pickup & shipping", faqs: [
    { id: "after-upload", q: "What happens after I upload an item?", a: "Every shipper sees your upload in their dashboard. One of them confirms the pickup and chooses how long they need to reach you." },
    { id: "eta", q: "How do I know when the shipper will come?", a: "Open your Dashboard. Under Pickup updates you will see the shipper's name and a message like “The shipper will reach you in about 45 min and take the product from you”. The time counts down on its own." },
    { id: "no-shipper", q: "No shipper has confirmed my item yet.", a: "Your item shows “Waiting for a shipper” until one confirms. It stays visible to all shippers, so please check back a little later and keep the item ready." },
    { id: "late", q: "The shipper is late. What should I do?", a: "The Dashboard shows when the promised time has passed. Keep the item ready; the shipper can still complete the pickup. If it takes too long, you can remove the listing and publish it again for another shipper." },
  ] },
  { title: "Account", faqs: [
    { id: "roles", q: "What is the difference between a User and a Shipper account?", a: "Users buy, sell, exchange and donate clothes. Shippers collect uploaded items from users. Choose the account type on the login screen; it cannot be changed later from the app." },
    { id: "human", q: "I still need help from a person.", a: "Live human support is not available in this prototype yet. Please re-read the answers above or contact the ReWear AI team that gave you this app." },
  ] },
];

const SHIPPER_GROUPS = [
  { title: "Pickups", faqs: [
    { id: "s-see", q: "Which items can I see in my dashboard?", a: "Every item that users upload to sell, exchange or donate appears under New uploads. Use the All / Sell / Exchange / Donate filter to narrow the list." },
    { id: "s-confirm", q: "How do I confirm a pickup?", a: "Press Confirm pickup on an item, choose how long you need to reach the user (30 min, 1 hour, 2 hours, 3 hours, 6 hours or your own minutes) and confirm. The user instantly sees your name and arrival time." },
    { id: "s-taken", q: "Why did an item disappear from New uploads?", a: "Only one shipper can take an item. Once someone confirms it, it leaves the New uploads list. Items you confirmed are under My confirmations." },
    { id: "s-time", q: "How long should I choose for arrival?", a: "Choose a time you can really keep. The user sees a countdown such as “The shipper will reach you in about 45 min”, so a realistic time avoids a late pickup." },
    { id: "s-picked", q: "What do I do after collecting the item?", a: "Open My confirmations and press Mark picked up. The user's dashboard then shows that the item was picked up." },
    { id: "s-cancel", q: "I can't make the pickup. Can I cancel?", a: "Yes. In My confirmations press Cancel before you pick the item up. It goes back to New uploads so another shipper can take it." },
    { id: "s-late", q: "I am running late. What now?", a: "Cancel the pickup if you cannot come soon, so the user is not left waiting. Otherwise reach the user as fast as you can; their dashboard shows the delay." },
  ] },
  { title: "Earnings", faqs: [
    { id: "s-pay", q: "How am I paid for deliveries?", a: "Shipper pay is planned as a ₹20 base fee plus ₹8 per km. Payout approval and transfers are not live in this prototype yet." },
  ] },
  { title: "Account", faqs: [
    { id: "s-role", q: "Can I buy or sell with a Shipper account?", a: "No. Shipper accounts only collect items. To buy, sell, exchange or donate, create a separate User account." },
    { id: "s-human", q: "I still need help from a person.", a: "Live human support is not available in this prototype yet. Please re-read the answers above or contact the ReWear AI team." },
  ] },
];


const GREETING = { from: "bot", text: "Hi, I'm the ReWear helper 👋 Pick a question from the box below and I'll answer it." };

export default function HelpCenter({ role = "user" }) {
  const GROUPS = role === "shipper" ? SHIPPER_GROUPS : USER_GROUPS;
  const ALL = GROUPS.flatMap((g) => g.faqs);
  const [messages, setMessages] = useState([GREETING]);
  const [selected, setSelected] = useState("");
  const [typing, setTyping] = useState(false);
  const logRef = useRef(null);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages, typing]);

  const ask = (event) => {
    event.preventDefault();
    const faq = ALL.find((f) => f.id === selected);
    if (!faq || typing) return;
    setMessages((old) => [...old, { from: "me", text: faq.q }]);
    setSelected("");
    setTyping(true);
    timer.current = window.setTimeout(() => { setMessages((old) => [...old, { from: "bot", text: faq.a }]); setTyping(false); }, 650);
  };

  const reset = () => { window.clearTimeout(timer.current); setTyping(false); setMessages([GREETING]); setSelected(""); };

  return (
    <div className="dashboard-page help-page">
      <div className="page-heading"><div><div className="eyebrow">HELP CENTRE</div><h1>How can we help?</h1><p>{role === "shipper" ? "Questions for shippers. Choose one and our helper replies instantly." : "Choose a question and our helper replies instantly."}</p></div></div>
      <section className="chatbot panel-card" aria-label="Help chatbot">
        <div className="chat-top"><span className="chat-avatar"><Bot size={20} /></span><div><strong>ReWear helper</strong><small>Answers common questions</small></div><button type="button" className="text-button" onClick={reset}><RotateCcw size={13} /> Start over</button></div>
        <div className="chat-log" ref={logRef} role="log" aria-live="polite">
          {messages.map((m, i) => <div key={i} className={`chat-msg ${m.from}`}><span className="chat-icon">{m.from === "bot" ? <Bot size={15} /> : <UserRound size={15} />}</span><p>{m.text}</p></div>)}
          {typing && <div className="chat-msg bot"><span className="chat-icon"><Bot size={15} /></span><p className="typing"><i /><i /><i /></p></div>}
        </div>
        <form className="chat-input" onSubmit={ask}>
          <CircleHelp size={18} />
          <select value={selected} onChange={(e) => setSelected(e.target.value)} aria-label="Choose a question">
            <option value="">Select a question…</option>
            {GROUPS.map((g) => <optgroup key={g.title} label={g.title}>{g.faqs.map((f) => <option key={f.id} value={f.id}>{f.q}</option>)}</optgroup>)}
          </select>
          <button className="button button-dark" type="submit" disabled={!selected || typing}>Ask <Send size={14} /></button>
        </form>
      </section>
    </div>
  );
}