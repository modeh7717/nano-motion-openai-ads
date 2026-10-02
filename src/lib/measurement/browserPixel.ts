import { integer } from "./eventBuilders";
import type { BusinessEvent, EventName, PixelAdapter, PixelStatus } from "./types";

// Use the configured public Pixel ID, or the supplied demo ID when it is unset.
// An explicitly empty ID disables installation. The SDK URL comes from OpenAI's docs.
export const PIXEL_ID = process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID ?? "T8bLgKF4RsYWhHwHnPDJWg";
export const PIXEL_SCRIPT_URL = "https://bzrcdn.openai.com/sdk/oaiq.min.js";
const STATUS_EVENT = "nano-motion-pixel-status";
// Describe the event fields and commands this demo sends to the official SDK.
// These names follow OpenAI's Measurement Pixel and Supported Events documentation.
export type PixelData = {
  type: "contents" | "plan_enrollment";
  amount?: number;
  currency?: "USD";
  contents?: { id: string; name: string; content_type: "page" | "product"; quantity?: number }[];
  plan_id?: string;
};
type PixelOptions = { event_id: string };
export type PixelCall = ["consent", boolean] | ["init", { pixelId: string; debug: boolean }] | ["measure", EventName, PixelData, PixelOptions?];
export type Oaiq = ((...args: PixelCall) => void) & { q?: unknown[] };
// Tell TypeScript about the SDK function and our own script-load status on window.
declare global {
  interface Window {
    oaiq?: Oaiq;
    __nanoMotionPixel?: { status: PixelStatus };
  }
}

// Based on the official Measurement Pixel snippet supplied by the user on 2026-10-01.
// Build the installation script that runs early on every page.
// Only consent and initialization commands enter its queue; shopping events wait for the SDK.
export function pixelBootstrap(pixelId: string, development: boolean) {
  // Escape configuration so a value cannot accidentally close the surrounding script tag.
  const config = JSON.stringify({ pixelId, development }).replaceAll("<", "\\u003c");
  return `(function(w,d,c){
    // Install once per page, and skip loading when the Pixel ID is empty.
    if(w.__nanoMotionPixel) return;
    w.__nanoMotionPixel={status:c.pixelId ? "loading" : "unconfigured"};
    if(!c.pixelId) return;
    // Keep early control commands until the downloaded SDK takes over this function.
    if(!w.oaiq){
      var q=function(){q.q.push(arguments);}; q.q=[]; w.oaiq=q;
    }
    // Start with measurement disabled before initializing the pixel.
    // The app later applies the visitor's saved choice through the consent command.
    w.oaiq("consent",false);
    w.oaiq("init",{pixelId:c.pixelId,debug:c.development || new URLSearchParams(w.location.search).get("measurementDebug")==="true"});
    // Download OpenAI's SDK without blocking the page, and notify the app of the result.
    // A loaded script does not confirm that OpenAI received or attributed any event.
    var js=d.createElement("script"); js.async=true; js.src=${JSON.stringify(PIXEL_SCRIPT_URL)};
    function status(value){w.__nanoMotionPixel.status=value;w.dispatchEvent(new Event(${JSON.stringify(STATUS_EVENT)}));}
    js.onload=function(){status("ready");}; js.onerror=function(){status("failed");};
    d.head.appendChild(js);
  })(window,document,${config});`;
}

// Convert the app's internal event into the field names and data shape OpenAI expects.
export function pixelPayload(event: BusinessEvent): PixelData {
  const { name, data } = event;
  // Money is sent as whole USD cents, with a currency whenever an amount is present.
  if (data.amount !== undefined) {
    integer(data.amount, "event amount");
    if (data.currency !== "USD") throw new Error("Event amount requires USD currency in this demo");
  }
  // Membership events use plan_enrollment and the documented plan_id field.
  if (name === "subscription_created") {
    if (!data.planId) throw new Error("Missing membership plan");
    return { type: "plan_enrollment", plan_id: data.planId, amount: data.amount, currency: data.currency };
  }
  // Page, product, and purchase events use contents. Send only the selected SDK fields;
  // the app's internal unitAmount field is not included in the outgoing payload.
  return {
    type: "contents",
    ...(data.amount !== undefined ? { amount: data.amount, currency: data.currency } : {}),
    contents: data.contents?.map(item => ({
      id: item.id, name: item.name, content_type: name === "page_viewed" ? "page" : "product",
      ...(item.quantity !== undefined ? { quantity: integer(item.quantity, "quantity") } : {}),
    })),
  };
}

// Give the measurement controller a small interface for calling the browser SDK.
export function createBrowserPixelAdapter(browser: Window): PixelAdapter {
  // Pass commands to the official SDK function and report when it is unavailable.
  const call = (...args: PixelCall) => {
    if (!browser.oaiq) throw new Error("Pixel command function unavailable");
    browser.oaiq(...args);
  };
  return {
    // Expose local loading status and notify the controller when the script loads or fails.
    ready: () => browser.__nanoMotionPixel?.status === "ready" && !!browser.oaiq,
    state: () => browser.__nanoMotionPixel?.status ?? "unconfigured",
    subscribe: notify => { browser.addEventListener(STATUS_EVENT, notify); return () => browser.removeEventListener(STATUS_EVENT, notify); },
    // Apply consent through OpenAI's documented command.
    setConsent: accepted => { if (browser.oaiq) call("consent", accepted); },
    // Hand an event to the SDK only after its script loads. Put the stable conversion ID
    // in the fourth argument, where OpenAI expects event options for deduplication.
    dispatch: event => {
      if (browser.__nanoMotionPixel?.status !== "ready") throw new Error("Pixel SDK is not ready");
      const payload = pixelPayload(event);
      if (event.eventId) call("measure", event.name, payload, { event_id: event.eventId });
      else call("measure", event.name, payload);
      // This confirms a local function call, not an acknowledgment from OpenAI.
      return "handed_to_sdk";
    },
  };
}
