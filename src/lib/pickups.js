import { useEffect, useState } from "react";

// Re-renders the component every `ms` so "arriving in 12 min" counts down on its own.
export function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

export const listingTypeLabel = (p) => (p.donate ? "Donate" : p.exchange ? "Exchange" : "Sell");

export function formatDuration(totalMinutes) {
  const m = Math.max(0, Math.round(totalMinutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h >= 24) { const d = Math.floor(h / 24); return `${d} day${d > 1 ? "s" : ""}${h % 24 ? ` ${h % 24} hr` : ""}`; }
  return `${h} hr${rest ? ` ${rest} min` : ""}`;
}

export function clockTime(iso) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return date.toLocaleString("en-IN", sameDay
    ? { hour: "numeric", minute: "2-digit" }
    : { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

// Text shown to the user (seller) after "Product is confirmed by <shipper> and ...".
export function etaSentence(pickup, now) {
  if (pickup.status === "picked_up") return "has been picked up.";
  const minutesLeft = (new Date(pickup.eta_at).getTime() - now) / 60000;
  const promised = `${formatDuration(pickup.eta_minutes)} (by ${clockTime(pickup.eta_at)})`;
  if (minutesLeft > 1) return `coming in ${promised}. About ${formatDuration(minutesLeft)} left.`;
  if (minutesLeft > -20) return `arriving any moment now (promised ${promised}).`;
  return `running late (promised ${promised}). Please keep the item ready.`;
}