"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getProduct, money, plan } from "@/data/products";
import { commerce } from "@/lib/cart/store";
import { cartTotal } from "@/lib/measurement/eventBuilders";
import { useCommerce } from "./runtime";
import type { CartItem } from "@/lib/measurement/types";
function Empty({ title, description, href = "/shop", action = "Explore the collection" }: { title: string; description: string; href?: string; action?: string }) { return <div className="empty-state"><span className="empty-icon" aria-hidden="true">↗︎</span><h1>{title}</h1><p>{description}</p><Link className="button" href={href}>{action} ↗︎</Link></div>; }
function Lines({ items }: { items: CartItem[] }) { return <div className="summary-lines">{items.map(item => { const p = getProduct(item.productId)!; return <div key={p.id}><span>{p.name} <small>× {item.quantity}</small></span><span>{money(p.price * item.quantity)}</span></div>; })}</div>; }
export function CartPage() {
  const { cart, hydrated } = useCommerce(); const router = useRouter(); const starting = useRef(false); const [error, setError] = useState("");
  if (!hydrated) return <p className="loading" role="status">Preparing your bag…</p>;
  if (!cart.length) return <Empty title="A little room for movement." description="Your bag is empty. Find an essential for your next stride."/>;
  function start() { if (starting.current) return; starting.current = true; commerce.beginCheckout(true); router.push("/checkout"); }
  function quantity(id: string, q: number) { try { commerce.setQuantity(id, q); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Unable to update quantity"); } }
  return <section className="section commerce-section"><p className="eyebrow">One step closer</p><h1>Your bag.</h1><div className="commerce-grid"><div>{cart.map(item => { const p = getProduct(item.productId)!; return <article className="cart-line" key={p.id}><Link className="cart-image" href={`/product/${p.slug}`}><img src={p.image} alt={p.name} width="160" height="180"/></Link><div><Link href={`/product/${p.slug}`}><h2>{p.name}</h2></Link><p>{p.color} / One demo fit</p><div className="quantity"><button aria-label={`Decrease ${p.name} quantity`} onClick={() => quantity(p.id, item.quantity - 1)}>−</button><span aria-label={`${p.name} quantity`}>{item.quantity}</span><button aria-label={`Increase ${p.name} quantity`} disabled={item.quantity >= 99} onClick={() => quantity(p.id, item.quantity + 1)}>+</button></div><button className="remove" onClick={() => quantity(p.id, 0)}>Remove {p.name}</button></div><strong>{money(p.price * item.quantity)}</strong></article>; })}{error && <p role="alert">{error}</p>}<Link href="/shop" className="text-link">← Keep exploring</Link></div><aside className="order-summary"><h2>Order summary</h2><div><span>Subtotal</span><span>{money(cartTotal(cart))}</span></div><div><span>Demo shipping / tax</span><span>$0.00</span></div><div className="summary-total"><span>Total</span><span>{money(cartTotal(cart))} USD</span></div><button className="button full" onClick={start}>Begin demo checkout ↗︎</button><p className="fine-print">This is a simulated purchase. No payment is collected.</p></aside></div></section>;
}
export function CheckoutPage() {
  const state = useCommerce(); const router = useRouter(); const submitting = useRef(false); const [busy, setBusy] = useState(false);
  useEffect(() => { if (state.hydrated) commerce.beginCheckout(); }, [state.hydrated]);
  if (!state.hydrated) return <p className="loading" role="status">Preparing checkout…</p>;
  if (!state.cart.length) return <Empty title="Your next move awaits." description="Add an item to your bag to begin a demo checkout."/>;
  function complete() { if (submitting.current) return; submitting.current = true; setBusy(true); const order = commerce.completeOrder(); if (order) router.push("/order-confirmation"); else { submitting.current = false; setBusy(false); } }
  return <section className="section commerce-section"><Link href="/cart" className="breadcrumb">← Back to bag</Link><p className="eyebrow">The final step</p><h1>Ready for your next stride?</h1><div className="commerce-grid"><div className="checkout-message"><span className="label">SIMULATED CHECKOUT</span><h2>All the movement.<br/>None of the payment.</h2><p>Complete this demo order to see the full shopping journey. There’s no payment, delivery, or personal information needed.</p><div className="checkout-step"><span>01</span><div><strong>Your essentials</strong><p>Review your bag in the order summary.</p></div></div><div className="checkout-step"><span>02</span><div><strong>A demo, from start to finish</strong><p>One click creates a simulated order confirmation.</p></div></div></div><aside className="order-summary"><h2>Your essentials</h2><Lines items={state.cart}/><div><span>Demo shipping / tax</span><span>$0.00</span></div><div className="summary-total"><span>Total</span><span>{money(cartTotal(state.cart))} USD</span></div><button className="button full" onClick={complete} disabled={busy || !state.attempt}>{busy ? "Completing…" : "Complete demo order ↗︎"}</button><p className="fine-print">No real purchase. No card details. No charges.</p></aside></div></section>;
}
export function OrderConfirmation() {
  const { order, hydrated } = useCommerce();
  if (!hydrated) return <p className="loading" role="status">Loading your confirmation…</p>;
  if (!order) return <Empty title="No order here just yet." description="Complete a demo checkout to see your order confirmation."/>;
  return <section className="section confirmation"><span className="confirmation-icon" aria-hidden="true">✓</span><p className="eyebrow">Demo order complete</p><h1>You’re ready to move.</h1><p>Your simulated order is confirmed. No payment was made and no items will ship.</p><div className="confirmation-card"><h2>Your essentials</h2><p className="order-id">Order {order.id}</p><Lines items={order.items}/><div className="summary-total"><span>Total</span><span>{money(order.amount)} USD</span></div></div><Link href="/shop" className="button">Keep exploring ↗︎</Link><Link href="/membership" className="text-link">Find your next advantage with Nano Plus ↗︎</Link></section>;
}
export function MembershipPage() {
  const { hydrated, membership } = useCommerce(); const router = useRouter(); const submitted = useRef(false);
  function join() { if (submitted.current) return; submitted.current = true; if (commerce.enroll()) router.push("/membership-confirmation"); }
  return <section className="membership-page"><div className="membership-intro"><p className="eyebrow">Your everyday advantage</p><h1>A little more<br/>in your <em>corner.</em></h1><p>Meet Nano Motion Plus. A membership for the miles, the moments, and everything in between.</p><div className="plus-graphic" aria-hidden="true">n<span>+</span></div></div><div className="membership-plan"><p className="eyebrow">Nano Motion Plus</p><h2>Keep your momentum.</h2><p className="membership-price">$19<span>/ month</span></p><ul><li><strong>Member pricing</strong><span>A little advantage on your everyday essentials.</span></li><li><strong>First in motion</strong><span>Early access to new collections.</span></li><li><strong>Free standard shipping</strong><span>More movement. Fewer extra costs.</span></li></ul><button className="button full" disabled={!hydrated} onClick={join}>{membership ? "View your demo membership" : "Join demo membership"} ↗︎</button><p className="fine-print">Fictional benefits. Simulated enrollment only.<br/>No charges, recurring billing, or personal data collected.</p></div></section>;
}
export function MembershipConfirmation() {
  const { membership, hydrated } = useCommerce();
  if (!hydrated) return <p className="loading" role="status">Loading your membership…</p>;
  if (!membership) return <Empty title="Your plus one awaits." description="Explore Nano Plus to create a demo membership." href="/membership" action="Discover Nano Plus"/>;
  return <section className="section confirmation"><span className="confirmation-icon" aria-hidden="true">+</span><p className="eyebrow">Demo membership active</p><h1>Welcome to your next chapter.</h1><p>You’re part of Nano Motion Plus in this demo.<br/>There’s no billing, renewal, or real membership.</p><div className="confirmation-card"><h2>{plan.name}</h2><p className="order-id">Enrollment {membership.id}</p><div className="summary-total"><span>Simulated first month</span><span>{money(membership.amount)} USD</span></div></div><Link href="/shop" className="button">Find your essentials ↗︎</Link></section>;
}
