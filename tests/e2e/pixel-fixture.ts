import { test as base, expect } from "@playwright/test";
import { PIXEL_SCRIPT_URL } from "../../src/lib/measurement/browserPixel";
export const fakePixelScript = `
  var pending=window.oaiq.q || [];
  window.__pixelCalls=[];
  window.oaiq=function(){window.__pixelCalls.push(Array.from(arguments));};
  pending.forEach(function(args){window.oaiq.apply(null,args);});
`;
// Stub the official CDN, not application instrumentation. Assert the real adapter's SDK calls.
export const test = base.extend<{ pixelFixture: void }>({
  pixelFixture: [async ({ page }, use) => {
    await page.route(PIXEL_SCRIPT_URL, route => route.fulfill({ contentType: "application/javascript", body: fakePixelScript }));
    await use();
  }, { auto: true }],
});
export { expect };
