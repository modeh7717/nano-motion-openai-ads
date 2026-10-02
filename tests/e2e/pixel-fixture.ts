import { test as base, expect } from "@playwright/test";
import { PIXEL_SCRIPT_URL } from "../../src/lib/measurement/browserPixel";
// Replace the downloaded SDK in tests with a recorder for oaiq commands.
// This lets tests check our integration without sending measurement data to OpenAI.
export const fakePixelScript = `
  var pending=window.oaiq.q || [];
  window.__pixelCalls=[];
  window.oaiq=function(){window.__pixelCalls.push(Array.from(arguments));};
  pending.forEach(function(args){window.oaiq.apply(null,args);});
`;
// Serve the recorder at the official SDK URL for each test. The app still runs its actual
// bootstrap, controller, and adapter, but these tests cannot prove real OpenAI delivery.
export const test = base.extend<{ pixelFixture: void }>({
  pixelFixture: [async ({ page }, use) => {
    await page.route(PIXEL_SCRIPT_URL, route => route.fulfill({ contentType: "application/javascript", body: fakePixelScript }));
    await use();
  }, { auto: true }],
});
export { expect };
