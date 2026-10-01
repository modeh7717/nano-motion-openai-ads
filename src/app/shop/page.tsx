import { ProductGrid } from "@/components/products";
export const metadata = { title: "The collection" };
export default function Shop() { return <section className="section shop-section"><p className="eyebrow">Considered essentials</p><h1>The everyday collection.</h1><p className="intro">Three essentials. Endless ways to move.</p><div className="collection-label"><span>All essentials</span><span>03 products · USD</span></div><ProductGrid/></section>; }
