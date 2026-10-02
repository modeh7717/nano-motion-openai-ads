import { products } from "../../data/products";
import { checkoutStarted, itemAdded, orderCreated, pageViewed, productViewed, subscriptionCreated } from "./eventBuilders";
import type { BusinessEvent, CartItem, Consent, LogEntry, Membership, Order, PixelAdapter, PixelStatus, Product } from "./types";
// Keep the visitor's consent choice, script status, and local activity log together.
export type MeasurementState = { consent: Consent; logs: LogEntry[]; sdk: PixelStatus };
const initial: MeasurementState = { consent: "unknown", logs: [], sdk: "unconfigured" };
// Decide when storefront activity can be measured; browserPixel.ts makes the SDK calls.
export class Measurement {
  // Remember the current visit and setup so React rerenders do not repeat initialization or views.
  private state: MeasurementState = initial;
  private listeners = new Set<() => void>();
  private adapter?: PixelAdapter;
  private path?: string;
  private viewAttempted = false;
  private sequence = 0;
  private storage?: Pick<Storage, "getItem" | "setItem">;
  private booted = false;
  // Let React read the current state and refresh the UI whenever that state changes.
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = () => this.state;
  getServerSnapshot = () => initial;
  private update(patch: Partial<MeasurementState>) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); }
  // Restore a saved consent choice once. Missing or unreadable storage leaves consent unknown.
  boot(storage?: Pick<Storage, "getItem" | "setItem">) {
    if (this.booted) return;
    this.booted = true; this.storage = storage;
    let consent: Consent = "unknown";
    try { const saved = storage?.getItem("nano-motion-consent"); if (saved === "accepted" || saved === "declined") consent = saved; } catch { /* Unknown consent is safe. */ }
    this.setConsent(consent);
  }
  // Connect the controller to the browser SDK and apply consent before measuring anything.
  attach(adapter: PixelAdapter) {
    if (this.adapter) return; // Root runtime effects may replay in React Strict Mode.
    adapter.setConsent(false);
    this.adapter = adapter;
    adapter.setConsent(this.state.consent === "accepted");
    adapter.subscribe?.(() => this.adapterStatus());
    this.adapterStatus();
  }
  // Update the local SDK status. When it becomes ready, measure the current view if allowed.
  private adapterStatus() {
    const sdk = this.adapter?.state?.() ?? (this.adapter?.ready() ? "ready" : "loading");
    this.update({ sdk });
    if (sdk === "ready" && this.state.consent === "accepted") this.currentView();
  }
  // Apply and save the visitor's choice. Unknown and declined both disable measurement.
  // Accepting can measure the current view, but never replays earlier shopping actions.
  setConsent(consent: Consent) {
    try { this.adapter?.setConsent(consent === "accepted"); } catch { this.adapter = undefined; this.update({ sdk: "failed" }); }
    try { this.storage?.setItem("nano-motion-consent", consent); } catch { /* Preference remains valid in memory. */ }
    this.update({ consent });
    if (consent === "accepted") this.currentView();
  }
  // Start a new view when the pathname changes; repeated reports of the same path are ignored.
  visit(path: string) {
    if (path === this.path) return;
    this.path = path; this.viewAttempted = false;
    if (this.state.consent === "accepted") this.currentView();
  }
  // Use contents_viewed for a product page and page_viewed for other supported pages.
  // Wait while the SDK loads, and attempt each view only once during the current visit.
  private currentView() {
    if (!this.path || this.viewAttempted || this.state.sdk === "loading") return;
    const product = products.find(p => this.path === `/product/${p.slug}`);
    const generic = ["/", "/shop", "/cart", "/checkout", "/order-confirmation", "/membership", "/membership-confirmation"];
    if (!product && !generic.includes(this.path)) return;
    this.viewAttempted = true;
    this.dispatch(product ? productViewed(product) : pageViewed(this.path));
  }
  // Check consent and script readiness before sending an event. Loading events are dropped,
  // and SDK failures are recorded locally so they do not interrupt shopping.
  dispatch(event: BusinessEvent) {
    let status: LogEntry["status"] = "suppressed";
    let reason = "Measurement consent is not accepted";
    if (this.state.consent === "accepted") {
      status = "failed"; reason = "Pixel is not configured; check NEXT_PUBLIC_OPENAI_PIXEL_ID";
      if (this.adapter) {
        if (!this.adapter.ready()) {
          if (this.state.sdk === "loading") { status = "suppressed"; reason = "SDK loading; event not retained or replayed"; }
          else { reason = this.state.sdk === "failed" ? "Pixel script failed to load; commerce continues" : "Pixel is not configured; check NEXT_PUBLIC_OPENAI_PIXEL_ID"; }
        }
        else try { status = this.adapter.dispatch(event); reason = "Local dispatch only; OpenAI receipt is unconfirmed"; }
        catch { reason = "SDK dispatch failed; commerce continues"; this.update({ sdk: "failed" }); }
      }
    }
    // Keep the latest 50 local attempts, including suppressed and failed events.
    // These entries do not prove delivery to OpenAI or attribution to an ad.
    this.update({ logs: [...this.state.logs, { ...event, id: ++this.sequence, timestamp: new Date().toISOString(), status, reason }].slice(-50) });
  }
  // Build the appropriate event when the cart store reports a successful shopping action.
  trackItemAdded = (p: Product, quantity: number) => this.dispatch(itemAdded(p, quantity));
  trackCheckoutStarted = (items: CartItem[]) => this.dispatch(checkoutStarted(items));
  trackOrderCreated = (order: Order) => this.dispatch(orderCreated(order));
  trackSubscriptionCreated = (membership: Membership) => this.dispatch(subscriptionCreated(membership));
  // Clear only the displayed activity log; consent and shopping data stay in place.
  clearLog = () => this.update({ logs: [] });
}
// Share one controller across the app's runtime, shopping actions, and consent controls.
export const measurement = new Measurement();
