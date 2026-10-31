import React, { useMemo, useState } from "react";
import { Truck, PackageCheck, Clock3, MapPin, UserRound, Check, PackageOpen, X } from "lucide-react";
import Modal from "./Modal.jsx";
import { useNow, listingTypeLabel, formatDuration, clockTime } from "../lib/pickups.js";

const ETA_PRESETS = [
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "3 hours", minutes: 180 },
  { label: "6 hours", minutes: 360 },
];

function Metric({ icon: Icon, label, value, note }) {
  return <div className="metric-card"><span className="metric-icon"><Icon size={19} /></span><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>;
}

export default function ShipperDashboard({ session, listings, pickups, onConfirm, onPicked, onCancel }) {
  const now = useNow();
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState("available");
  const [target, setTarget] = useState(null);
  const [minutes, setMinutes] = useState(60);
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);

  const taken = useMemo(() => new Set(pickups.map((p) => p.listing_id)), [pickups]);
  const mine = useMemo(() => pickups.filter((p) => p.shipper_id === session.id), [pickups, session.id]);
  const byListing = useMemo(() => new Map(listings.map((l) => [l.id, l])), [listings]);

  // Only things real users uploaded (sell / exchange / donate) and that no shipper has confirmed yet.
  const available = listings.filter((l) => l.sellerId && !taken.has(l.id));
  const shown = available.filter((l) => filter === "all" || (filter === "sell" && !l.exchange && !l.donate) || (filter === "exchange" && l.exchange) || (filter === "donate" && l.donate));

  const openConfirm = (listing) => { setTarget(listing); setMinutes(60); setCustom(""); };
  const chosenMinutes = custom !== "" ? Number(custom) : minutes;
  const validMinutes = Number.isFinite(chosenMinutes) && chosenMinutes >= 5 && chosenMinutes <= 2880;

  const submit = async () => {
    if (!validMinutes || saving) return;
    setSaving(true);
    const ok = await onConfirm(target, Math.round(chosenMinutes));
    setSaving(false);
    if (ok) setTarget(null);
  };

  const pickedCount = mine.filter((p) => p.status === "picked_up").length;
  const upcoming = mine.filter((p) => p.status === "confirmed").length;

  return (
    <div className="dashboard-page">
      <div className="page-heading"><div><div className="eyebrow">SHIPPER PORTAL</div><h1>Ready for the next pickup?</h1><p>Every item a user uploads to sell, exchange or donate shows up here. Confirm one and the user sees when you will arrive.</p></div><span className="online-pill"><span /> Available for jobs</span></div>

      <div className="metrics-grid">
        <Metric icon={PackageOpen} label="Waiting for a shipper" value={String(available.length).padStart(2, "0")} note="Uploaded by users" />
        <Metric icon={Clock3} label="Confirmed by you" value={String(upcoming).padStart(2, "0")} note="On the way to collect" />
        <Metric icon={PackageCheck} label="Picked up" value={String(pickedCount).padStart(2, "0")} note="Completed by you" />
        <Metric icon={Truck} label="Total pickups" value={String(mine.length).padStart(2, "0")} note="All time" />
      </div>

      <div className="shipper-tabs" role="tablist">
        <button role="tab" aria-selected={tab === "available"} className={tab === "available" ? "selected" : ""} onClick={() => setTab("available")}>New uploads <span>{available.length}</span></button>
        <button role="tab" aria-selected={tab === "mine"} className={tab === "mine" ? "selected" : ""} onClick={() => setTab("mine")}>My confirmations <span>{mine.length}</span></button>
      </div>

      {tab === "available" ? (
        <section className="panel-card">
          <div className="panel-heading"><div><h3>Items waiting for pickup</h3><p>Uploaded by users. Newest first.</p></div>
            <div className="category-tabs shipper-filters">{[["all", "All"], ["sell", "Sell"], ["exchange", "Exchange"], ["donate", "Donate"]].map(([id, label]) => <button key={id} className={filter === id ? "category-tab selected" : "category-tab"} onClick={() => setFilter(id)}>{label}</button>)}</div>
          </div>
          {shown.length === 0 ? <div className="uploads-empty"><PackageOpen size={30} /><strong>No uploads waiting.</strong><span>{available.length ? "Nothing in this filter. Try another one." : "When a user uploads an item, it will appear here."}</span></div>
            : shown.map((item) => (
              <div className="pickup-row" key={item.id}>
                <img src={item.image} alt={item.title} />
                <div className="pickup-copy">
                  <div className="pickup-title"><strong>{item.title}</strong><span className={`type-badge type-${listingTypeLabel(item).toLowerCase()}`}>{listingTypeLabel(item)}</span></div>
                  <span className="pickup-meta"><UserRound size={12} /> {item.seller}</span>
                  <span className="pickup-meta"><MapPin size={12} /> {item.location}</span>
                  <p>{item.category} · Size {item.size} · {item.condition}{item.donate ? " · Free" : ` · ₹${Number(item.price).toLocaleString("en-IN")}`}</p>
                </div>
                <button className="button button-dark button-small" onClick={() => openConfirm(item)}>Confirm pickup</button>
              </div>
            ))}
        </section>
      ) : (
        <section className="panel-card">
          <div className="panel-heading"><div><h3>Your confirmations</h3><p>The user can see these and the time you promised.</p></div></div>
          {mine.length === 0 ? <div className="uploads-empty"><Truck size={30} /><strong>No confirmations yet.</strong><span>Confirm an upload and it will be listed here.</span></div>
            : mine.map((p) => {
              const item = byListing.get(p.listing_id);
              const left = (new Date(p.eta_at).getTime() - now) / 60000;
              return (
                <div className="pickup-row" key={p.id}>
                  {item ? <img src={item.image} alt={item.title} /> : <div className="pickup-noimg"><PackageOpen size={22} /></div>}
                  <div className="pickup-copy">
                    <div className="pickup-title"><strong>{item?.title || "Item"}</strong>{item && <span className={`type-badge type-${listingTypeLabel(item).toLowerCase()}`}>{listingTypeLabel(item)}</span>}</div>
                    {item && <span className="pickup-meta"><UserRound size={12} /> {item.seller} · <MapPin size={12} /> {item.location}</span>}
                    <p>{p.status === "picked_up" ? "Picked up ✓" : left > 1 ? `You promised to arrive in ${formatDuration(left)} (by ${clockTime(p.eta_at)})` : `Promised time (${clockTime(p.eta_at)}) has arrived`}</p>
                  </div>
                  {p.status === "confirmed" ? <div className="pickup-actions"><button className="button button-dark button-small" onClick={() => onPicked(p)}><Check size={13} /> Mark picked up</button><button className="button button-outline button-small" onClick={() => onCancel(p)}><X size={13} /> Cancel</button></div> : <span className="status-chip">Picked up</span>}
                </div>
              );
            })}
        </section>
      )}

      {target && <Modal title="When can you reach?" eyebrow="CONFIRM PICKUP" onClose={() => setTarget(null)}>
        <div className="eta-modal">
          <div className="eta-item"><img src={target.image} alt={target.title} /><div><strong>{target.title}</strong><span>{listingTypeLabel(target)} · {target.seller} · {target.location}</span></div></div>
          <p className="eta-help">Pick the time you will take to reach the user. They will see: “Shipper will arrive in about this time and take the product from you.”</p>
          <div className="eta-presets">{ETA_PRESETS.map((preset) => <button type="button" key={preset.minutes} className={custom === "" && minutes === preset.minutes ? "selected" : ""} onClick={() => { setMinutes(preset.minutes); setCustom(""); }}>{preset.label}</button>)}</div>
          <label className="form-field"><span>Or enter minutes (5 to 2880)</span><input type="number" min="5" max="2880" inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. 45" /></label>
          <button className="button button-dark button-full" disabled={!validMinutes || saving} onClick={submit}>{saving ? "Confirming…" : `Confirm · arrive in ${validMinutes ? formatDuration(chosenMinutes) : "…"}`}</button>
        </div>
      </Modal>}
    </div>
  );
}
