"use client";
import Link from "next/link";
import { useState } from "react";
import { money } from "@/data/products";
import type { Product } from "@/lib/measurement/types";
import { commerce } from "@/lib/cart/store";
import { useCommerce } from "./runtime";
export function ProductDetail({ product: p }: { product: Product }) {
  const { hydrated } = useCommerce(); const [added, setAdded] = useState(false); const [error, setError] = useState("");
  function add() { try { commerce.add(p.id); setAdded(true); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Unable to add item"); } }
  return <section className="section detail-section"><Link href="/shop" className="breadcrumb">← Back to the collection</Link><div className="detail-grid"><div className="detail-art"><img src={p.image} alt={`${p.name} in ${p.color}`} width="600" height="650"/></div><div className="detail-copy"><p className="eyebrow">{p.category} / Everyday collection</p><h1>{p.name}</h1><p className="price">{money(p.price)} <small>USD</small></p><p className="intro">{p.description}</p><div className="color-choice"><span className={`swatch ${p.color.toLowerCase()}`}/><span>{p.color} / One demo fit</span></div><button className="button full" onClick={add} disabled={!hydrated}>Add to bag <span>+</span></button><div className="add-status" role="status">{added && <>Added to your bag. <Link href="/cart">View bag ↗︎</Link></>}{error}</div><div className="detail-benefits">{p.detail.split(" · ").map(d => <p key={d}><span>↗︎</span>{d}</p>)}</div><p className="fine-print">Illustrated demo product. No real inventory or purchases.</p></div></div></section>;
}
