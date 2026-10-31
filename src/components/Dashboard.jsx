import React from "react";
import { useNow, listingTypeLabel, etaSentence } from "../lib/pickups.js";
import { inr, paymentStatusLabel } from "../lib/payments.js";
import { Package, Truck, Wallet, CheckCircle2, Clock3, ArrowUpRight, MapPin, ShieldCheck, Users, Leaf, Settings2, CircleDollarSign } from "lucide-react";

const money = (n) => `₹${n.toLocaleString("en-IN")}`;

function Metric({ icon: Icon, label, value, note }) {
  return <div className="metric-card"><span className="metric-icon"><Icon size={19} /></span><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>;
}

export default function Dashboard({ role, onAddListing, myItems = [], pickups = [], orders = [], savedCount = 0 }) {
  const now = useNow();
  if (role === "user") {
    const pickupFor = (id) => pickups.find((p) => p.listing_id === id);
    const confirmed = myItems.filter((i) => pickupFor(i.id)).length;
    const pickedUp = pickups.filter((p) => p.status === "picked_up").length;
    return (
    <div className="dashboard-page">
      <div className="page-heading"><div><div className="eyebrow">YOUR SPACE</div><h1>Your ReWear hub.</h1><p>Keep your wardrobe moving in a better direction.</p></div><button className="button button-primary" onClick={onAddListing}>＋ List an item</button></div>
      <div className="metrics-grid">
        <Metric icon={Package} label="Active listings" value={String(myItems.length).padStart(2, "0")} note={`${confirmed} with a shipper confirmed`} />
        <Metric icon={Truck} label="Pickups confirmed" value={String(confirmed).padStart(2, "0")} note="Shipper is on the way" />
        <Metric icon={Wallet} label="Orders placed" value={String(orders.length).padStart(2, "0")} note="Online and cash on delivery" />
        <Metric icon={HeartIcon} label="Saved items" value={String(savedCount).padStart(2, "0")} note="Your shortlist" />
      </div>
      <div className="dashboard-columns">
        <div className="stack-col">
          <section className="panel-card"><div className="panel-heading"><div><h3>Pickup updates</h3><p>Shipper confirmations for the items you uploaded</p></div></div>
            {myItems.length === 0 ? <div className="uploads-empty"><Package size={28} /><strong>Nothing uploaded yet.</strong><span>Sell, exchange or donate an item and a shipper will pick it up.</span></div>
              : myItems.map((item) => { const pickup = pickupFor(item.id); return (
                <div className={`pickup-update ${pickup ? "confirmed" : ""}`} key={item.id}>
                  <img src={item.image} alt={item.title} />
                  <div className="activity-copy">
                    <strong>{item.title} <span className={`type-badge type-${listingTypeLabel(item).toLowerCase()}`}>{listingTypeLabel(item)}</span></strong>
                    {pickup ? <span className="pickup-eta"><Truck size={13} /> Product is confirmed by <b>{pickup.shipper_name || "A shipper"}</b> and {etaSentence(pickup, now)}</span> : <span><Clock3 size={12} /> Waiting for a shipper to confirm</span>}
                  </div>
                  <span className={`status-chip ${pickup ? "chip-ok" : ""}`}>{pickup ? (pickup.status === "picked_up" ? "Picked up" : "Confirmed") : "Waiting"}</span>
                </div>); })}
          </section>
          <section className="panel-card"><div className="panel-heading"><div><h3>Your orders</h3><p>Items you bought</p></div></div>
            {orders.length === 0 ? <div className="uploads-empty"><Wallet size={28} /><strong>No orders yet.</strong><span>Add something to your cart and check out.</span></div>
              : orders.map((order) => <div className="activity-row" key={order.id}><span className="activity-icon"><CheckCircle2 size={17} /></span><div className="activity-copy"><strong>{(order.items || []).map((i) => i.title).join(", ") || "Order"}</strong><span>{order.payment_method === "cod" ? "Cash on delivery" : `Paid via ${order.upi_app || "UPI"}`} · {inr(order.total)}</span></div><span className="status-chip">{paymentStatusLabel[order.payment_status] || order.payment_status}</span></div>)}
          </section>
        </div>
        <section className="panel-card impact-card"><div className="impact-orbit"><Leaf size={30}/></div><div className="eyebrow">YOUR IMPACT</div><h3>Good clothes deserve another chapter.</h3><p>Every resale, exchange and donation helps keep wearable clothes in circulation.</p><div className="impact-stat"><strong>{pickedUp}</strong><span>items picked up for a second life <ArrowUpRight size={15}/></span></div></section>
      </div>
    </div>
    );
  }

  if (role === "shipper") return (
    <div className="dashboard-page">
      <div className="page-heading"><div><div className="eyebrow">SHIPPER PORTAL</div><h1>Ready for the next drop?</h1><p>Manage deliveries and keep an eye on your earnings.</p></div><span className="online-pill"><span/> Available for jobs</span></div>
      <div className="metrics-grid">
        <Metric icon={Truck} label="Available jobs" value="06" note="Within your demo area" />
        <Metric icon={Wallet} label="Pending earnings" value="₹640" note="Awaiting verification" />
        <Metric icon={CheckCircle2} label="Delivered this week" value="18" note="Demo data" />
        <Metric icon={CircleDollarSign} label="Paid to date" value="₹2,400" note="Payout history" />
      </div>
      <section className="panel-card jobs-panel"><div className="panel-heading"><div><h3>Nearby delivery jobs</h3><p>Sample jobs to demonstrate the shipper flow</p></div><span className="soft-label">Distance-based pay</span></div>
        {[["RW-1024","Vijay Nagar","Palasia",12,116],["RW-1025","Bhawarkua","Rajwada",7,76],["RW-1026","Scheme 54","Annapurna",9,92]].map(job => <div className="job-row" key={job[0]}><div className="job-id">{job[0]}</div><div className="route-copy"><strong><MapPin size={14}/> {job[1]} <span>→</span> {job[2]}</strong><small>{job[3]} km estimated route</small></div><div className="job-pay"><strong>{money(job[4])}</strong><small>₹20 base + ₹8/km</small></div><button className="button button-outline button-small" onClick={() => alert(`${job[0]} accepted in this UI demo. Backend is not connected yet.`)}>Accept job</button></div>)}
        <div className="demo-notice"><ShieldCheck size={16}/> These are sample delivery jobs. Real route distance and payout will be calculated after backend integration.</div>
      </section>
    </div>
  );

  return (
    <div className="dashboard-page">
      <div className="page-heading"><div><div className="eyebrow">OWNER CONTROL ROOM</div><h1>The bigger picture.</h1><p>Manage ReWear, delivery operations and payout approvals.</p></div><span className="admin-pill"><ShieldCheck size={16}/> Admin preview</span></div>
      <div className="metrics-grid">
        <Metric icon={Users} label="Registered users" value="1,284" note="+12% this month" />
        <Metric icon={Package} label="Active listings" value="346" note="Across all categories" />
        <Metric icon={Truck} label="Deliveries in progress" value="24" note="6 awaiting assignment" />
        <Metric icon={Wallet} label="Payouts to review" value="₹3,840" note="32 parcels · demo data" />
      </div>
      <div className="dashboard-columns admin-columns">
        <section className="panel-card"><div className="panel-heading"><div><h3>Payout approvals</h3><p>Distance-based shipper payment preview</p></div><button className="text-button">All payouts <ArrowUpRight size={14}/></button></div>
          <div className="payout-rate-banner"><span className="metric-icon"><Settings2 size={19}/></span><div><strong>Current demo rate</strong><small>₹20 base + ₹8 per km</small></div><button className="button button-outline button-small" onClick={() => alert("In Phase 2, this opens editable admin rate settings.")}>Edit rates</button></div>
          {[["Aman Verma","RW-1024","12 km",116],["Simran Kaur","RW-1018","9 km",92],["Kunal Shah","RW-1012","7 km",76]].map(row => <div className="payout-row" key={row[1]}><div className="avatar">{row[0].split(" ").map(s=>s[0]).join("")}</div><div className="activity-copy"><strong>{row[0]}</strong><span>{row[1]} · {row[2]}</span></div><strong>{money(row[3])}</strong><button className="approve-button" onClick={() => alert(`${row[1]} marked for review in this UI demo. Real payout processing is not connected.`)}>Review</button></div>)}
        </section>
        <section className="panel-card"><div className="panel-heading"><div><h3>Platform health</h3><p>Demo overview</p></div><span className="online-pill"><span/> Looking good</span></div>
          <div className="health-row"><span>Listings moderated</span><strong>94%</strong><div className="progress"><i style={{width:"94%"}}/></div></div>
          <div className="health-row"><span>Successful deliveries</span><strong>96%</strong><div className="progress"><i style={{width:"96%"}}/></div></div>
          <div className="health-row"><span>Donation requests fulfilled</span><strong>71%</strong><div className="progress"><i style={{width:"71%"}}/></div></div>
          <div className="admin-tip"><Leaf size={18}/><span>Keep the circular fashion mission visible: track resale, exchange and donation impact as the platform grows.</span></div>
        </section>
      </div>
    </div>
  );
}

function HeartIcon({ size = 19 }) {
  return <span style={{fontSize:size, lineHeight:1}}>♡</span>;
}