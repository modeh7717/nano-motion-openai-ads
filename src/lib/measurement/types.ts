export type Product = { id: string; slug: string; name: string; category: string; description: string; price: number; image: string; color: string; detail: string };
export type CartItem = { productId: string; quantity: number };
export type Order = { id: string; items: CartItem[]; amount: number; currency: "USD"; createdAt: string };
export type Membership = { id: string; planId: string; amount: number; currency: "USD"; createdAt: string };
export type Consent = "unknown" | "accepted" | "declined";
export type EventName = "page_viewed" | "contents_viewed" | "items_added" | "checkout_started" | "order_created" | "subscription_created";
// Local business-event contract. Vendor payload serialization is intentionally pending docs verification.
export type EventData = { amount?: number; currency?: "USD"; contents?: { id: string; name: string; quantity?: number; unitAmount?: number }[]; planId?: string };
export type BusinessEvent = { name: EventName; data: EventData; eventId?: string };
export type DispatchStatus = "suppressed" | "queued" | "handed_to_sdk" | "failed";
export type LogEntry = BusinessEvent & { id: number; timestamp: string; status: DispatchStatus; reason: string };
export type PixelAdapter = { setConsent: (accepted: boolean) => void; dispatch: (event: BusinessEvent) => "queued" | "handed_to_sdk"; ready: () => boolean };
