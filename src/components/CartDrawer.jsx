import React, { useEffect } from "react";
import { X, ShoppingBag, Trash2, ArrowRight, Leaf } from "lucide-react";

export default function CartDrawer({ items, onClose, onRemove, onClear, onCheckout, onBrowse }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const total = items.reduce((sum, item) => sum + Number(item.price || 0), 0);

  return (
    <div className="cart-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Your cart">
        <div className="cart-header">
          <div>
            <div className="eyebrow">YOUR CART</div>
            <h2>{items.length ? `${items.length} item${items.length === 1 ? "" : "s"} to buy` : "Nothing here yet"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close cart"><X size={20} /></button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <div className="empty-icon"><ShoppingBag size={24} /></div>
            <h3>Your cart is empty.</h3>
            <p>Tap “Add to cart” on any piece you want to buy and it will show up here.</p>
            <button className="button button-dark" onClick={onBrowse}>Browse the shop <ArrowRight size={15} /></button>
          </div>
        ) : (
          <>
            <ul className="cart-list">
              {items.map((item) => (
                <li className="cart-item" key={item.id}>
                  <img src={item.image} alt={item.title} />
                  <div className="cart-item-copy">
                    <strong>{item.title}</strong>
                    <span>{item.category} · Size {item.size} · {item.condition}</span>
                    <span>{item.location}</span>
                  </div>
                  <div className="cart-item-side">
                    <strong>₹{Number(item.price).toLocaleString("en-IN")}</strong>
                    <button className="cart-remove" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.title}`}><Trash2 size={15} /></button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="cart-footer">
              <div className="cart-total"><span>Total</span><strong>₹{total.toLocaleString("en-IN")}</strong></div>
              <p className="cart-note"><Leaf size={14} /> Each piece is one-of-a-kind, so quantity is always 1.</p>
              <button className="button button-dark button-full" onClick={onCheckout}>Proceed to checkout <ArrowRight size={16} /></button>
              <button className="text-button cart-clear" onClick={onClear}>Clear cart</button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
