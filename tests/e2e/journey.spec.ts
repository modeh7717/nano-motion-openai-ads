import { expect, test } from "./pixel-fixture";
// Walk through shopping and membership with the SDK recorder to check all six event types.
test("full journey persists outcomes and confirmation refresh never creates another conversion", async ({ page }) => {
  // Accept measurement and confirm the app sees the test SDK as loaded.
  await page.goto("/?measurementDebug=true");
  await page.getByRole("button", { name: "Accept measurement" }).click();
  await page.getByRole("button", { name: "Open local instrumentation log" }).click();
  await expect(page.getByText("Consent: accepted · SDK: ready")).toBeVisible();
  await page.getByRole("button", { name: "Close local instrumentation log" }).click();
  // View a product, add two units, and submit checkout twice to exercise duplicate protection.
  await page.getByRole("link", { name: "Explore the collection", exact: false }).first().click();
  await page.getByRole("link", { name: /Aero Run Jacket/ }).click();
  await page.getByRole("button", { name: "Add to bag" }).click();
  await page.getByRole("link", { name: "View bag" }).click();
  await page.getByRole("button", { name: "Increase Aero Run Jacket quantity" }).click();
  await expect(page.getByText("$296.00 USD")).toBeVisible();
  await page.getByRole("button", { name: "Begin demo checkout" }).click();
  await page.getByRole("button", { name: "Complete demo order" }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page.getByRole("heading", { name: "You’re ready to move." })).toBeVisible();
  // Inspect saved data and the actual adapter calls for totals, event shapes, and stable IDs.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("nano-motion-commerce-v1")!));
  expect(saved.order.amount).toBe(29600); expect(saved.cart).toHaveLength(0);
  const calls = await page.evaluate(() => (window as unknown as { __pixelCalls: unknown[][] }).__pixelCalls);
  expect(calls.filter(call => call[0] === "init")).toHaveLength(1);
  expect(calls.findIndex(call => call[0] === "consent" && call[1] === false)).toBeLessThan(calls.findIndex(call => call[0] === "init"));
  expect(calls.filter(call => call[0] === "measure" && call[1] === "contents_viewed")).toHaveLength(1);
  expect(calls.filter(call => call[0] === "measure" && call[1] === "items_added")).toHaveLength(2);
  expect(calls.filter(call => call[0] === "measure" && call[1] === "checkout_started")).toHaveLength(1);
  const orderCalls = calls.filter(call => call[0] === "measure" && call[1] === "order_created");
  expect(orderCalls).toHaveLength(1);
  expect(orderCalls[0][2]).toMatchObject({ type: "contents", amount: 29600, currency: "USD", contents: [{ id: "NM-RUN-001", quantity: 2, content_type: "product" }] });
  expect(orderCalls[0][3]).toEqual({ event_id: `order_${saved.order.id}` });
  // Reload the order confirmation and verify it restores the order without another purchase event.
  await page.evaluate(() => history.replaceState(null, "", `${location.pathname}?measurementDebug=true`));
  await page.reload();
  await expect(page.getByRole("heading", { name: "You’re ready to move." })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("nano-motion-commerce-v1")!).order.id)).toBe(saved.order.id);
  await page.getByRole("button", { name: "Open local instrumentation log" }).click();
  await expect(page.locator(".inspector-panel li").filter({ hasText: "order_created" })).toHaveCount(0);
  await page.getByRole("button", { name: "Close local instrumentation log" }).click();
  // Join membership twice and verify one plan_enrollment payload with the saved membership ID.
  await page.getByRole("link", { name: "Find your next advantage with Nano Plus" }).click();
  await page.getByRole("button", { name: "Join demo membership" }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect(page.getByRole("heading", { name: "Welcome to your next chapter." })).toBeVisible();
  const membershipId = await page.evaluate(() => JSON.parse(localStorage.getItem("nano-motion-commerce-v1")!).membership.id);
  const subscriptions = await page.evaluate(() => (window as unknown as { __pixelCalls: unknown[][] }).__pixelCalls.filter(call => call[0] === "measure" && call[1] === "subscription_created"));
  expect(subscriptions).toEqual([["measure", "subscription_created", { type: "plan_enrollment", plan_id: "nano-motion-plus-monthly", amount: 1900, currency: "USD" }, { event_id: `subscription_${membershipId}` }]]);
  // Reload the membership confirmation and verify the same enrollment is still saved.
  await page.evaluate(() => history.replaceState(null, "", `${location.pathname}?measurementDebug=true`));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome to your next chapter." })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("nano-motion-commerce-v1")!).membership.id)).toBe(membershipId);
});
// Complete shopping with declined consent and verify the app makes no measure calls.
test("declined consent permits shopping and sends no measurement calls", async ({ page }) => {
  const requests: string[] = []; page.on("request", r => { if (r.url().startsWith("https://bzr.openai.com")) requests.push(r.url()); });
  await page.goto("/product/aero-run-jacket?measurementDebug=true");
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  await page.getByRole("button", { name: "Add to bag" }).click();
  await page.getByRole("button", { name: "Open local instrumentation log" }).click();
  await expect(page.locator(".inspector-panel li").filter({ hasText: "items_added" })).toContainText("suppressed");
  await page.getByRole("button", { name: "Close local instrumentation log" }).click();
  await page.getByRole("link", { name: "View bag" }).click();
  await page.getByRole("button", { name: "Begin demo checkout" }).click();
  await page.getByRole("button", { name: "Complete demo order" }).click();
  await expect(page.getByRole("heading", { name: "You’re ready to move." })).toBeVisible();
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => (window as unknown as { __pixelCalls: unknown[][] }).__pixelCalls.filter(call => call[0] === "measure"))).toEqual([]);
});
// Open routes without saved outcomes and verify they do not invent orders or memberships.
test("direct confirmation and empty checkout show safe empty states", async ({ page }) => {
  await page.goto("/order-confirmation"); await page.getByRole("button", { name: "Decline", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No order here just yet." })).toBeVisible();
  await page.goto("/membership-confirmation"); await expect(page.getByRole("heading", { name: "Your plus one awaits." })).toBeVisible();
  await page.goto("/checkout"); await expect(page.getByRole("heading", { name: "Your next move awaits." })).toBeVisible();
});
// Check saved checkout reuse and confirm that later acceptance never replays a suppressed order.
test("checkout refresh reuses attempt and consent reset does not replay conversions", async ({ page }) => {
  // Start checkout, reload, and verify the saved attempt is reused without another start event.
  await page.goto("/product/aero-run-jacket?measurementDebug=true");
  await page.getByRole("button", { name: "Accept measurement" }).click();
  await page.getByRole("button", { name: "Add to bag" }).click();
  await page.goto("/checkout?measurementDebug=true");
  await expect(page.getByRole("button", { name: "Complete demo order" })).toBeEnabled();
  const attempt = await page.evaluate(() => JSON.parse(localStorage.getItem("nano-motion-commerce-v1")!).attempt.id);
  await page.reload();
  await expect(page.getByRole("button", { name: "Complete demo order" })).toBeEnabled();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("nano-motion-commerce-v1")!).attempt.id)).toBe(attempt);
  await page.getByRole("button", { name: "Open local instrumentation log" }).click();
  await expect(page.locator(".inspector-panel li").filter({ hasText: "checkout_started" })).toHaveCount(0);
  await page.getByRole("button", { name: "Close local instrumentation log" }).click();
  // Complete the order while declined, then accept again and inspect the suppressed attempt.
  await page.getByRole("button", { name: "Measurement preferences", exact: true }).click();
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  await page.getByRole("button", { name: "Complete demo order" }).click();
  await expect(page.getByRole("heading", { name: "You’re ready to move." })).toBeVisible();
  await page.getByRole("button", { name: "Measurement preferences", exact: true }).click();
  await page.getByRole("button", { name: "Accept measurement" }).click();
  await page.getByRole("button", { name: "Open local instrumentation log" }).click();
  const conversion = page.locator(".inspector-panel li").filter({ hasText: "order_created" });
  await expect(conversion).toHaveCount(1); await expect(conversion).toContainText("suppressed");
});
