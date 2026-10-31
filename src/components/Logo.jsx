import React from "react";
import { Recycle } from "lucide-react";

export default function Logo({ light = false }) {
  return (
    <div className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-mark"><Recycle size={20} strokeWidth={2.3} /></span>
      <span>ReWear<span className="brand-ai"> AI</span></span>
    </div>
  );
}