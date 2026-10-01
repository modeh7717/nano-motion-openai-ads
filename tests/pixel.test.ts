import { describe, expect, it, vi } from "vitest";
import { createBrowserPixelAdapter, pixelBootstrap, pixelPayload } from "../src/lib/measurement/browserPixel";
import { checkoutStarted, itemAdded, pageViewed, productViewed, subscriptionCreated, orderCreated } from "../src/lib/measurement/eventBuilders";
import { Measurement } from "../src/lib/measurement/openaiPixel";
import { products } from "../src/data/products";
import type { Oaiq } from "../src/lib/measurement/browserPixel";

describe("documented browser payloads", () => {
  it("uses documented fields and omits ambiguous item money and domain-only fields", () => {
    const event = checkoutStarted([{ productId: products[0].id, quantity: 2 }]);
    expect(pixelPayload(event)).toEqual({ type: "contents", amount: 29600, currency: "USD", contents: [{ id: "NM-RUN-001", name: "Aero Run Jacket", content_type: "product", quantity: 2 }] });
    expect(pixelPayload(itemAdded(products[0], 1)).amount).toBe(14800);
    expect(pixelPayload(productViewed(products[0])).contents?.[0].content_type).toBe("product");
    expect(pixelPayload(pageViewed("/"))).toEqual({ type: "contents", contents: [{ id: "/", name: "Nano Motion Home", content_type: "page" }] });
    expect(pixelPayload(subscriptionCreated({ id: "member-1", planId: "nano-motion-plus-monthly", amount: 1900, currency: "USD", createdAt: new Date().toISOString() }))).toEqual({ type: "plan_enrollment", plan_id: "nano-motion-plus-monthly", amount: 1900, currency: "USD" });
  });
  it("puts event_id in the fourth argument, never inside event data", () => {
    const oaiq = vi.fn(); const browser = { oaiq, __nanoMotionPixel: { status: "ready" } } as unknown as Window;
    const adapter = createBrowserPixelAdapter(browser);
    adapter.dispatch(orderCreated({ id: "order-1", items: [{ productId: products[0].id, quantity: 2 }], amount: 29600, currency: "USD", createdAt: new Date().toISOString() }));
    expect(oaiq.mock.calls[0]).toEqual(["measure", "order_created", pixelPayload(checkoutStarted([{ productId: products[0].id, quantity: 2 }])), { event_id: "order_order-1" }]);
    adapter.dispatch(pageViewed("/")); expect(oaiq.mock.calls[1]).toHaveLength(3);
  });
  it("rejects invalid amounts and quantities before SDK dispatch", () => {
    expect(() => pixelPayload({ name: "order_created", data: { amount: 1.5, currency: "USD" } })).toThrow();
    expect(() => pixelPayload({ name: "order_created", data: { amount: 14800 } })).toThrow("requires USD currency");
    expect(() => pixelPayload({ name: "items_added", data: { contents: [{ id: "x", name: "x", quantity: -1 }] } })).toThrow();
  });
});

describe("official bootstrap", () => {
  it("queues denial before init, loads official URL once, and reports errors", () => {
    const browser = { location: { search: "?measurementDebug=true" }, dispatchEvent: vi.fn() } as unknown as Window;
    let script: { async?: boolean; src?: string; onload?: () => void; onerror?: () => void };
    const document = { createElement: vi.fn(() => script = {}), head: { appendChild: vi.fn() } };
    const boot = new Function("window", "document", pixelBootstrap("test-pixel", false));
    boot(browser, document); boot(browser, document);
    expect(document.head.appendChild).toHaveBeenCalledTimes(1);
    expect(script!.src).toBe("https://bzrcdn.openai.com/sdk/oaiq.min.js");
    const calls = browser.oaiq!.q!.map(args => Array.from(args as ArrayLike<unknown>));
    expect(calls).toEqual([["consent", false], ["init", { pixelId: "test-pixel", debug: true }]]);
    script!.onerror!(); expect(browser.__nanoMotionPixel?.status).toBe("failed");
  });
  it("disables an explicitly empty Pixel ID and escapes script markup in configuration", () => {
    expect(pixelBootstrap("</script>", false)).not.toContain("</script>");
    const document = { createElement: vi.fn() }; const browser = {} as Window;
    new Function("window", "document", pixelBootstrap("", false))(browser, document);
    expect(document.createElement).not.toHaveBeenCalled(); expect(browser.__nanoMotionPixel?.status).toBe("unconfigured");
  });
});

describe("loading and consent boundaries", () => {
  it("waits for SDK readiness for the current view without replaying shopping actions", () => {
    const browser = new EventTarget() as Window;
    browser.__nanoMotionPixel = { status: "loading" }; browser.oaiq = vi.fn() as Oaiq;
    const tracker = new Measurement(); tracker.attach(createBrowserPixelAdapter(browser)); tracker.boot(); tracker.visit("/shop"); tracker.setConsent("accepted"); tracker.dispatch(itemAdded(products[0], 1));
    expect(vi.mocked(browser.oaiq).mock.calls.filter(call => call[0] === "measure")).toHaveLength(0);
    tracker.setConsent("declined"); browser.__nanoMotionPixel.status = "ready"; browser.dispatchEvent(new Event("nano-motion-pixel-status"));
    expect(vi.mocked(browser.oaiq).mock.calls.filter(call => call[0] === "measure")).toHaveLength(0);
    tracker.setConsent("accepted");
    expect(vi.mocked(browser.oaiq).mock.calls.filter(call => call[0] === "measure")).toEqual([["measure", "page_viewed", pixelPayload(pageViewed("/shop"))]]);
    tracker.attach(createBrowserPixelAdapter(browser));
    expect(vi.mocked(browser.oaiq).mock.calls.filter(call => call[0] === "measure")).toHaveLength(1);
  });
});
