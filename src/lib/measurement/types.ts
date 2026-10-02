// Describe the demo's products, cart, and saved outcomes. All prices and amounts are USD cents.
export type Product = { id: string; slug: string; name: string; category: string; description: string; price: number; image: string; color: string; detail: string };
export type CartItem = { productId: string; quantity: number };
export type Order = { id: string; items: CartItem[]; amount: number; currency: "USD"; createdAt: string };
export type Membership = { id: string; planId: string; amount: number; currency: "USD"; createdAt: string };
// Measurement is allowed only for accepted consent; an unanswered choice stays unknown.
export type Consent = "unknown" | "accepted" | "declined";
// Limit this demo to the six standard event names selected from OpenAI's documentation.
export type EventName = "page_viewed" | "contents_viewed" | "items_added" | "checkout_started" | "order_created" | "subscription_created";
// Keep the app's event format separate from the SDK format. browserPixel.ts translates
// planId into plan_id, adds the required type, and leaves internal unitAmount out.
export type EventData = { amount?: number; currency?: "USD"; contents?: { id: string; name: string; quantity?: number; unitAmount?: number }[]; planId?: string };
export type BusinessEvent = { name: EventName; data: EventData; eventId?: string };
// Describe local attempts for the inspector. A status does not prove OpenAI receipt;
// the live browser adapter returns handed_to_sdk and does not queue measurement events.
export type DispatchStatus = "suppressed" | "queued" | "handed_to_sdk" | "failed";
export type LogEntry = BusinessEvent & { id: number; timestamp: string; status: DispatchStatus; reason: string };
// Describe whether the SDK script loaded. Ready does not confirm delivery or attribution.
export type PixelStatus = "unconfigured" | "ready" | "loading" | "failed";
// Define the small interface used to apply consent, send events, and observe SDK loading.
export type PixelAdapter = { setConsent: (accepted: boolean) => void; dispatch: (event: BusinessEvent) => "queued" | "handed_to_sdk"; ready: () => boolean; state?: () => PixelStatus; subscribe?: (notify: () => void) => () => void };
