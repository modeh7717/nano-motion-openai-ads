import Link from "next/link";
import { money, products } from "@/data/products";
export function ProductGrid() {
  return <div className="product-grid">{products.map((p, i) => <Link href={`/product/${p.slug}`} key={p.id} className="product-card"><div className={`product-art art-${i}`}><span className="product-tag">{i === 0 ? "The everyday layer" : i === 1 ? "Move without limits" : "A softer essential"}</span>{/* Local illustrative SVG assets intentionally use native img. */}<img src={p.image} alt={`${p.name} in ${p.color}`} width="480" height="540"/><span className="product-arrow" aria-hidden="true">↗︎</span></div><div className="product-caption"><div><h3>{p.name}</h3><p>{p.category} · {p.color}</p></div><span>{money(p.price)}</span></div></Link>)}</div>;
}
