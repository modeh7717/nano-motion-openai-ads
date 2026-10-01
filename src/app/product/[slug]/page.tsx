import { notFound } from "next/navigation";
import { products } from "@/data/products";
import { ProductDetail } from "@/components/product-detail";
export const generateStaticParams = () => products.map(p => ({ slug: p.slug }));
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return { title: products.find(p => p.slug === slug)?.name ?? "Product not found" }; }
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const product = products.find(p => p.slug === slug); if (!product) notFound(); return <ProductDetail product={product}/>; }
