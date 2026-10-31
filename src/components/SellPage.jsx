import React from "react";
import { ArrowRight, Leaf, Trash2, PackageOpen } from "lucide-react";
import PhotoPicker from "./PhotoPicker.jsx";

export default function SellPage({ form, setForm, onPhoto, onSubmit, submitting, myItems, onRemove, categories, notify }) {
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return (
    <div className="dashboard-page sell-page">
      <div className="page-heading">
        <div><div className="eyebrow">SELL ON REWEAR</div><h1>Give your piece a new home.</h1><p>Take a photo, add the price and a short description. It goes live in the shop right away.</p></div>
      </div>

      <div className="sell-layout">
        <form className="panel-card sell-form" onSubmit={onSubmit}>
          <div className="panel-heading"><div><h3>Item details</h3><p>Fields marked * are required</p></div></div>
          <div className="form-field full-field"><span>Photo *</span><PhotoPicker previewUrl={form.image} onPick={onPhoto} notify={notify} /></div>
          <div className="listing-form-grid sell-grid">
            <label className="form-field"><span>Seller name *</span><input required maxLength="60" value={form.seller} onChange={set("seller")} placeholder="Your name" /></label>
            <label className="form-field"><span>I want to</span><select value={form.type} onChange={set("type")}><option value="sale">Sell it</option><option value="exchange">Exchange it</option><option value="donation">Donate it</option></select></label>
            <label className="form-field full-field"><span>Item name *</span><input required maxLength="70" value={form.title} onChange={set("title")} placeholder="e.g. Vintage denim jacket" /></label>
            <label className="form-field"><span>Price (₹){form.type === "donation" ? "" : " *"}</span><input required={form.type !== "donation"} disabled={form.type === "donation"} type="number" min="0" inputMode="numeric" value={form.type === "donation" ? "" : form.price} onChange={set("price")} placeholder={form.type === "donation" ? "Free (donation)" : "299"} /></label>
            <label className="form-field"><span>Category</span><select value={form.category} onChange={set("category")}>{categories.filter((c) => c !== "All items").map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="form-field"><span>Size</span><input value={form.size} onChange={set("size")} placeholder="M, L, 30..." /></label>
            <label className="form-field"><span>Condition</span><select value={form.condition} onChange={set("condition")}><option>Like new</option><option>Good</option><option>Fair</option></select></label>
            <label className="form-field full-field"><span>Location (city / area) *</span><input required value={form.location} onChange={set("location")} placeholder="e.g. Vijay Nagar, Indore" /></label>
            <label className="form-field full-field"><span>Description *</span><textarea required rows="4" maxLength="400" value={form.note} onChange={set("note")} placeholder="Fabric, fit, any flaws, why you’re letting it go…" /></label>
          </div>
          <div className="listing-form-actions">
            <p><Leaf size={15} /> Give good clothes another chapter.</p>
            <button className="button button-dark" type="submit" disabled={submitting}>{submitting ? "Publishing…" : "Publish item"} <ArrowRight size={16} /></button>
          </div>
        </form>

        <section className="panel-card my-uploads">
          <div className="panel-heading"><div><h3>Your uploads</h3><p>{myItems.length ? `${myItems.length} item${myItems.length === 1 ? "" : "s"} listed by you` : "Items you publish will appear here"}</p></div></div>
          {myItems.length === 0 ? (
            <div className="uploads-empty"><PackageOpen size={30} /><strong>No uploads yet.</strong><span>Fill in the form and publish your first item.</span></div>
          ) : myItems.map((item) => (
            <div className="upload-row" key={item.id}>
              <img src={item.image} alt={item.title} />
              <div className="upload-copy">
                <strong>{item.title}</strong>
                <span className="upload-price">{item.donate ? "Free (donation)" : `₹${Number(item.price).toLocaleString("en-IN")}`} · {item.category} · Size {item.size}</span>
                <p>{item.note}</p>
              </div>
              <button type="button" className="cart-remove" onClick={() => onRemove(item)} aria-label={`Remove ${item.title}`}><Trash2 size={15} /></button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
