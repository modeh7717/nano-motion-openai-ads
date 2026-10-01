import { getProduct } from "../../data/products";
import type { BusinessEvent, CartItem, Membership, Order, Product } from "./types";
export function integer(value: number, label: string, minimum = 1) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`Invalid ${label}`);
  return value;
}
export function cartTotal(items: CartItem[]) {
  return items.reduce((total, item) => {
    const product = getProduct(item.productId);
    if (!product) throw new Error("Unknown product");
    const subtotal = integer(product.price, "unit price") * integer(item.quantity, "quantity");
    return integer(total + subtotal, "total");
  }, 0);
}
function commerce(name: BusinessEvent["name"], items: CartItem[], eventId?: string): BusinessEvent {
  if (!items.length) throw new Error("Empty commerce event");
  return { name, eventId, data: { amount: cartTotal(items), currency: "USD", contents: items.map(item => {
    const product = getProduct(item.productId)!;
    return { id: product.id, name: product.name, quantity: item.quantity, unitAmount: product.price };
  }) } };
}
export const pageViewed = (path: string): BusinessEvent => ({ name: "page_viewed", data: { contents: [{ id: path, name: path === "/" ? "Nano Motion Home" : path.slice(1).replaceAll("-", " ") }] } });
export const productViewed = (p: Product) => commerce("contents_viewed", [{ productId: p.id, quantity: 1 }]);
export const itemAdded = (p: Product, quantity: number) => commerce("items_added", [{ productId: p.id, quantity }]);
export const checkoutStarted = (items: CartItem[]) => commerce("checkout_started", items);
export const orderCreated = (order: Order) => {
  if (cartTotal(order.items) !== order.amount) throw new Error("Order total mismatch");
  return commerce("order_created", order.items, `order_${order.id}`);
};
export const subscriptionCreated = (membership: Membership): BusinessEvent => ({ name: "subscription_created", eventId: `subscription_${membership.id}`, data: { amount: integer(membership.amount, "plan amount"), currency: "USD", planId: membership.planId } });
