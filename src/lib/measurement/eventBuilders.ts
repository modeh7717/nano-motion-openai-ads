import { getProduct } from "../../data/products";
import type { BusinessEvent, CartItem, Membership, Order, Product } from "./types";
// Reject fractions, unsafe numbers, and values below the allowed minimum.
// Money is stored as whole USD cents and item quantities as whole units.
export function integer(value: number, label: string, minimum = 1) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`Invalid ${label}`);
  return value;
}
// Add each product's price times its quantity to get the full cart amount in cents.
export function cartTotal(items: CartItem[]) {
  return items.reduce((total, item) => {
    const product = getProduct(item.productId);
    if (!product) throw new Error("Unknown product");
    const subtotal = integer(product.price, "unit price") * integer(item.quantity, "quantity");
    return integer(total + subtotal, "total");
  }, 0);
}
// Build a shared internal product-event object. browserPixel.ts converts it to OpenAI's shape.
function commerce(name: BusinessEvent["name"], items: CartItem[], eventId?: string): BusinessEvent {
  if (!items.length) throw new Error("Empty commerce event");
  return { name, eventId, data: { amount: cartTotal(items), currency: "USD", contents: items.map(item => {
    const product = getProduct(item.productId)!;
    return { id: product.id, name: product.name, quantity: item.quantity, unitAmount: product.price };
  }) } };
}
// Identify a general page by its pathname so the SDK can measure page_viewed.
export const pageViewed = (path: string): BusinessEvent => ({ name: "page_viewed", data: { contents: [{ id: path, name: path === "/" ? "Nano Motion Home" : path.slice(1).replaceAll("-", " ") }] } });
// Identify the product being viewed, including its price and a quantity of one.
export const productViewed = (p: Product) => commerce("contents_viewed", [{ productId: p.id, quantity: 1 }]);
// Report only the newly added quantity, rather than all units already in the cart.
export const itemAdded = (p: Product, quantity: number) => commerce("items_added", [{ productId: p.id, quantity }]);
// Report all items and the total amount when a new checkout attempt starts.
export const checkoutStarted = (items: CartItem[]) => commerce("checkout_started", items);
// Check the saved order total and reuse its ID for a stable conversion identifier.
// The browser adapter sends that identifier as OpenAI's event_id option.
export const orderCreated = (order: Order) => {
  if (cartTotal(order.items) !== order.amount) throw new Error("Order total mismatch");
  return commerce("order_created", order.items, `order_${order.id}`);
};
// Describe a new demo membership and reuse its saved ID for the subscription conversion.
export const subscriptionCreated = (membership: Membership): BusinessEvent => ({ name: "subscription_created", eventId: `subscription_${membership.id}`, data: { amount: integer(membership.amount, "plan amount"), currency: "USD", planId: membership.planId } });
