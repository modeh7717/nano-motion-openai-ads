import { test, expect, fakePixelScript } from "./pixel-fixture";
import { PIXEL_SCRIPT_URL } from "../../src/lib/measurement/browserPixel";

// Delay SDK loading and change consent while shopping to check that old actions are not replayed.
test("revocation during SDK loading drops actions and reacceptance measures only current activity", async ({ page }) => {
  // Hold the SDK response until the visitor accepts, adds an item, and then declines.
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(PIXEL_SCRIPT_URL, async route => { await gate; await route.fulfill({ contentType: "application/javascript", body: fakePixelScript }); });
  await page.goto("/product/aero-run-jacket?measurementDebug=true", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Accept measurement" }).click();
  await page.getByRole("button", { name: "Add to bag" }).click();
  await page.getByRole("button", { name: "Measurement preferences", exact: true }).click();
  await page.getByRole("button", { name: "Decline", exact: true }).click();
  // Finish loading while consent is declined; no measurement calls should be sent.
  release();
  await page.waitForFunction(() => window.__nanoMotionPixel?.status === "ready");
  expect(await page.evaluate(() => (window as unknown as { __pixelCalls: unknown[][] }).__pixelCalls.filter(call => call[0] === "measure"))).toEqual([]);
  // Accept again and verify the current product view and future actions can be measured.
  await page.getByRole("button", { name: "Measurement preferences", exact: true }).click();
  await page.getByRole("button", { name: "Accept measurement" }).click();
  const calls = await page.evaluate(() => (window as unknown as { __pixelCalls: unknown[][] }).__pixelCalls.filter(call => call[0] === "measure"));
  expect(calls).toHaveLength(1); expect(calls[0][1]).toBe("contents_viewed");
  await page.getByRole("button", { name: "Add to bag" }).click();
  expect(await page.evaluate(() => (window as unknown as { __pixelCalls: unknown[][] }).__pixelCalls.filter(call => call[0] === "measure" && call[1] === "items_added"))).toHaveLength(1);
});

// Block the SDK download and verify a demo order still succeeds without queued measurements.
test("blocked SDK does not break checkout and measurement never enters its queue", async ({ page }) => {
  await page.route(PIXEL_SCRIPT_URL, route => route.abort("blockedbyclient"));
  await page.goto("/product/aero-run-jacket?measurementDebug=true");
  await page.getByRole("button", { name: "Accept measurement" }).click();
  await page.getByRole("button", { name: "Open local instrumentation log" }).click();
  await expect(page.getByText("Pixel script failed to load. Check network access or browser blockers.")).toBeVisible();
  await page.getByRole("button", { name: "Close local instrumentation log" }).click();
  await page.getByRole("button", { name: "Add to bag" }).click();
  await page.getByRole("link", { name: "View bag" }).click();
  await page.getByRole("button", { name: "Begin demo checkout" }).click();
  await page.getByRole("button", { name: "Complete demo order" }).click();
  await expect(page.getByRole("heading", { name: "You’re ready to move." })).toBeVisible();
  expect(await page.evaluate(() => window.oaiq!.q!.map(args => Array.from(args as ArrayLike<unknown>)).filter(call => call[0] === "measure"))).toEqual([]);
});
