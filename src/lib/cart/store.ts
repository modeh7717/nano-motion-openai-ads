import { getProduct, plan } from "../../data/products";
import { cartTotal, integer } from "../measurement/eventBuilders";
import { measurement, type Measurement } from "../measurement/openaiPixel";
import type { CartItem, Membership, Order } from "../measurement/types";
// Keep a checkout attempt separate from the final order so refreshes can resume it.
type Attempt = { id: string };
// Store the cart and completed demo outcomes together in one saved browser snapshot.
export type CommerceState = { cart: CartItem[]; order: Order | null; membership: Membership | null; attempt: Attempt | null; hydrated: boolean; storageAvailable: boolean };
const initial: CommerceState = { cart: [], order: null, membership: null, attempt: null, hydrated: false, storageAvailable: true };
const KEY = "nano-motion-commerce-v1";
// Accept saved items only when their products exist, quantities are 1-99, and IDs are unique.
function validItems(value: unknown): value is CartItem[] {
  return Array.isArray(value) && value.every(item => item && typeof item.productId === "string" && getProduct(item.productId) && Number.isSafeInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99) && new Set(value.map(i => i.productId)).size === value.length;
}
// Check saved timestamps before trusting an order or membership restored from storage.
function validDate(value: unknown) { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
// Read and validate a saved snapshot. Restoring an outcome does not create a new conversion.
function decode(text: string): Pick<CommerceState, "cart" | "order" | "membership" | "attempt"> {
  const value = JSON.parse(text);
  if (!value || !validItems(value.cart)) throw new Error("Invalid saved cart");
  const order = value.order;
  if (order && !(typeof order.id === "string" && order.id.length > 0 && validItems(order.items) && order.items.length && order.amount === cartTotal(order.items) && order.currency === "USD" && validDate(order.createdAt))) throw new Error("Invalid saved order");
  const m = value.membership;
  if (m && !(typeof m.id === "string" && m.id.length > 0 && m.planId === plan.id && m.amount === plan.amount && m.currency === "USD" && validDate(m.createdAt))) throw new Error("Invalid saved membership");
  const attempt = value.attempt;
  if (attempt && !(typeof attempt.id === "string" && attempt.id.length > 0 && value.cart.length)) throw new Error("Invalid saved checkout");
  return { cart: value.cart, order: order ?? null, membership: m ?? null, attempt: attempt ?? null };
}
// Manage demo shopping actions and report successful changes to the measurement controller.
export class CommerceStore {
  // Keep current shopping data in memory, with optional browser storage for later visits.
  private state: CommerceState = initial;
  private listeners = new Set<() => void>();
  private storage?: Pick<Storage, "getItem" | "setItem">;
  constructor(private tracker: Pick<Measurement, "trackItemAdded" | "trackCheckoutStarted" | "trackOrderCreated" | "trackSubscriptionCreated"> = measurement) {}
  // Let React read shopping state and refresh the UI when that state changes.
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.state;
  getServerSnapshot = () => initial;
  // Restore shopping data once without reporting purchases or memberships again.
  boot(storage?: Pick<Storage, "getItem" | "setItem">) {
    if (this.state.hydrated) return;
    this.storage = storage;
    let restored = {};
    let storageAvailable = !!storage;
    try { const saved = storage?.getItem(KEY); if (saved) restored = decode(saved); }
    catch { /* Corrupt storage is ignored, never turned into a conversion. */ }
    this.state = { ...initial, ...restored, hydrated: true, storageAvailable };
    this.save({});
  }
  // Update memory first, save cart and outcomes together, then notify the UI.
  // If storage fails, shopping can still continue for the current visit.
  private save(patch: Partial<CommerceState>) {
    this.state = { ...this.state, ...patch };
    const { cart, order, membership, attempt } = this.state;
    try { if (!this.storage) throw new Error("Storage unavailable"); this.storage.setItem(KEY, JSON.stringify({ cart, order, membership, attempt })); }
    catch { this.state = { ...this.state, storageAvailable: false }; }
    this.listeners.forEach(fn => fn());
  }
  // Keep measurement errors from interrupting a successful shopping action.
  private safeTrack(action: () => void) { try { action(); } catch { /* Instrumentation cannot fail commerce. */ } }
  // Save newly added units before reporting items_added, using only the quantity added now.
  add(productId: string, quantity = 1) {
    if (!this.state.hydrated) return;
    const product = getProduct(productId); if (!product) throw new Error("Unknown product");
    integer(quantity, "quantity");
    const existing = this.state.cart.find(item => item.productId === productId);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (nextQuantity > 99) throw new Error("Maximum quantity is 99");
    const cart = existing ? this.state.cart.map(i => i.productId === productId ? { ...i, quantity: nextQuantity } : i) : [...this.state.cart, { productId, quantity }];
    this.save({ cart }); this.safeTrack(() => this.tracker.trackItemAdded(product, quantity));
  }
  // Report increases through the same add flow. Decreases and removals update the cart only.
  setQuantity(productId: string, quantity: number) {
    integer(quantity, "quantity", 0);
    const current = this.state.cart.find(i => i.productId === productId);
    if (!current) return;
    if (quantity > current.quantity) { this.add(productId, quantity - current.quantity); return; }
    this.save({ cart: this.state.cart.map(i => i.productId === productId ? { ...i, quantity } : i).filter(i => i.quantity > 0) });
    if (!this.state.cart.length) this.save({ attempt: null });
  }
  // Reuse an existing attempt on refresh. A new attempt reports checkout_started once.
  beginCheckout(explicit = false) {
    if (!this.state.hydrated || !this.state.cart.length) return null;
    if (this.state.attempt && !explicit) return this.state.attempt;
    const attempt = { id: crypto.randomUUID() };
    this.save({ attempt }); this.safeTrack(() => this.tracker.trackCheckoutStarted(this.state.cart));
    return attempt;
  }
  // Create a simulated order with a stable ID. Save the outcome, close checkout, and clear
  // the cart before reporting order_created so repeated submissions reuse the same order.
  completeOrder() {
    // Synchronous state mutation closes the attempt before another submit can run.
    if (!this.state.attempt || !this.state.cart.length) return this.state.order;
    const order: Order = { id: crypto.randomUUID(), items: this.state.cart.map(i => ({ ...i })), amount: cartTotal(this.state.cart), currency: "USD", createdAt: new Date().toISOString() };
    this.save({ order, attempt: null, cart: [] });
    this.safeTrack(() => this.tracker.trackOrderCreated(order));
    return order;
  }
  // Create and save one simulated membership before reporting subscription_created.
  // Repeated joins return the saved membership rather than reporting another conversion.
  enroll() {
    if (!this.state.hydrated) return null;
    if (this.state.membership) return this.state.membership;
    const membership: Membership = { id: crypto.randomUUID(), planId: plan.id, amount: plan.amount, currency: "USD", createdAt: new Date().toISOString() };
    this.save({ membership }); this.safeTrack(() => this.tracker.trackSubscriptionCreated(membership));
    return membership;
  }
}
// Share one shopping store across the storefront's buttons, pages, and runtime.
export const commerce = new CommerceStore();
