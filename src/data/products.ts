import type { Product } from "@/lib/measurement/types";
export const products: Product[] = [
  { id: "NM-RUN-001", slug: "aero-run-jacket", name: "Aero Run Jacket", category: "Running", price: 14800, image: "/jacket.svg", color: "Moss", description: "Light on your shoulders. Ready for the elements. A featherweight layer for early starts and the miles ahead.", detail: "Wind-resistant shell · Packable design · Reflective details", },
  { id: "NM-TRN-002", slug: "velocity-legging", name: "Velocity Legging", category: "Training", price: 11800, image: "/legging.svg", color: "Graphite", description: "Find your flow in a sculpted, second-skin fit. Made to move with you, from the first stretch to the final rep.", detail: "Four-way stretch · High-rise waist · Hidden pocket", },
  { id: "NM-YGA-003", slug: "motion-performance-tee", name: "Motion Performance Tee", category: "Yoga", price: 6800, image: "/tee.svg", color: "Chalk", description: "An everyday essential with room to breathe. Soft, sweat-wicking fabric for movement at your own pace.", detail: "Breathable knit · Relaxed fit · Quick-drying fabric", },
];
export const getProduct = (id: string) => products.find(p => p.id === id);
export const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(cents / 100);
export const plan = { id: "nano-motion-plus-monthly", name: "Nano Motion Plus", amount: 1900 };
