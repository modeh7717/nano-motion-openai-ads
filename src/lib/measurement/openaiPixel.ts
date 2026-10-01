import { products } from "../../data/products";
import { checkoutStarted, itemAdded, orderCreated, pageViewed, productViewed, subscriptionCreated } from "./eventBuilders";
import type { BusinessEvent, CartItem, Consent, LogEntry, Membership, Order, PixelAdapter, Product } from "./types";
export type MeasurementState = { consent: Consent; logs: LogEntry[]; sdk: "unconfigured" | "ready" | "loading" | "failed" };
const initial: MeasurementState = { consent: "unknown", logs: [], sdk: "unconfigured" };
export class Measurement {
  private state: MeasurementState = initial;
  private listeners = new Set<() => void>();
  private adapter?: PixelAdapter;
  private path?: string;
  private viewAttempted = false;
  private sequence = 0;
  private storage?: Pick<Storage, "getItem" | "setItem">;
  private booted = false;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.state;
  getServerSnapshot = () => initial;
  private update(patch: Partial<MeasurementState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  boot(storage?: Pick<Storage, "getItem" | "setItem">) {
    if (this.booted) return;
    this.booted = true; this.storage = storage;
    let consent: Consent = "unknown";
    try { const saved = storage?.getItem("nano-motion-consent"); if (saved === "accepted" || saved === "declined") consent = saved; } catch { /* Unknown consent is safe. */ }
    this.setConsent(consent);
  }
  // Only a documentation-verified adapter may be installed. Production has no adapter yet.
  attach(adapter: PixelAdapter) {
    adapter.setConsent(false);
    this.adapter = adapter;
    adapter.setConsent(this.state.consent === "accepted");
    this.update({ sdk: adapter.ready() ? "ready" : "loading" });
  }
  setConsent(consent: Consent) {
    try { this.adapter?.setConsent(consent === "accepted"); } catch { this.adapter = undefined; }
    try { this.storage?.setItem("nano-motion-consent", consent); } catch { /* Preference remains valid in memory. */ }
    this.update({ consent });
    if (consent === "accepted") this.currentView();
  }
  visit(path: string) {
    if (path === this.path) return;
    this.path = path; this.viewAttempted = false;
    if (this.state.consent === "accepted") this.currentView();
  }
  private currentView() {
    if (!this.path || this.viewAttempted) return;
    const product = products.find(p => this.path === `/product/${p.slug}`);
    const generic = ["/", "/shop", "/cart", "/checkout", "/order-confirmation", "/membership", "/membership-confirmation"];
    if (!product && !generic.includes(this.path)) return;
    this.viewAttempted = true;
    this.dispatch(product ? productViewed(product) : pageViewed(this.path));
  }
  dispatch(event: BusinessEvent) {
    let status: LogEntry["status"] = "suppressed";
    let reason = "Measurement consent is not accepted";
    if (this.state.consent === "accepted") {
      status = "failed"; reason = "Live Pixel disabled: official SDK documentation has not been verified";
      if (this.adapter) {
        if (!this.adapter.ready()) { status = "suppressed"; reason = "SDK loading; event not retained or replayed"; }
        else try { status = this.adapter.dispatch(event); reason = "Local dispatch only; OpenAI receipt is unconfirmed"; }
        catch { reason = "SDK dispatch failed; commerce continues"; this.update({ sdk: "failed" }); }
      }
    }
    this.update({ logs: [...this.state.logs, { ...event, id: ++this.sequence, timestamp: new Date().toISOString(), status, reason }].slice(-50) });
  }
  trackItemAdded = (p: Product, quantity: number) => this.dispatch(itemAdded(p, quantity));
  trackCheckoutStarted = (items: CartItem[]) => this.dispatch(checkoutStarted(items));
  trackOrderCreated = (order: Order) => this.dispatch(orderCreated(order));
  trackSubscriptionCreated = (membership: Membership) => this.dispatch(subscriptionCreated(membership));
  clearLog = () => this.update({ logs: [] });
}
export const measurement = new Measurement();
