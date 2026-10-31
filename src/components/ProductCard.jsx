import React from "react";
import { Heart, Shirt, ArrowUpRight, ShoppingBag, Check } from "lucide-react";

export default function ProductCard({ product, saved, inCart, onSave, onOpen, onTry, onAddToCart }) {
  return (
    <article className="product-card">
      <button className={`save-button ${saved ? "is-saved" : ""}`} onClick={() => onSave(product.id)} aria-label="Save item">
        <Heart size={17} fill={saved ? "currentColor" : "none"} />
      </button>
      <button className="product-image-button" onClick={() => onOpen(product)} aria-label={`View ${product.title}`}>
        <img className="product-image" src={product.image} alt={product.title} loading="lazy" />
        <span className="condition-pill">{product.condition}</span>
        <span className="image-arrow"><ArrowUpRight size={16} /></span>
      </button>
      <div className="product-info">
        <div className="product-meta"><span>{product.category}</span><span>Size {product.size}</span></div>
        <button className="product-title" onClick={() => onOpen(product)}>{product.title}</button>
        <div className="product-bottom">
          <strong>{product.donate ? "Free" : `₹${product.price}`}</strong>
          <span className="seller-name">{product.location}</span>
        </div>
        <div className="card-actions">
          <button className={`cart-add-button ${inCart ? "in-cart" : ""}`} onClick={() => onAddToCart(product)}>{inCart ? <><Check size={15} /> In cart</> : <><ShoppingBag size={15} /> Add to cart</>}</button>
          <button className="try-button" onClick={() => onTry(product)}><Shirt size={15} /> Try it on</button>
        </div>
      </div>
    </article>
  );
}