import { integer } from "./eventBuilders";
import type { BusinessEvent, EventName, PixelAdapter, PixelStatus } from "./types";

export const PIXEL_ID = process.env.NEXT_PUBLIC_OPENAI_PIXEL_ID ?? "T8bLgKF4RsYWhHwHnPDJWg";
export const PIXEL_SCRIPT_URL = "https://bzrcdn.openai.com/sdk/oaiq.min.js";
const STATUS_EVENT = "nano-motion-pixel-status";
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
declare global {
  interface Window {
    oaiq?: Oaiq;
    __nanoMotionPixel?: { status: PixelStatus };
  }
}

// Based on the official Measurement Pixel snippet supplied by the user on 2026-10-01.
// Only control commands enter the official queue. Measurement waits for script readiness.
export function pixelBootstrap(pixelId: string, development: boolean) {
  const config = JSON.stringify({ pixelId, development }).replaceAll("<", "\\u003c");
  return `(function(w,d,c){
    if(w.__nanoMotionPixel) return;
    w.__nanoMotionPixel={status:c.pixelId ? "loading" : "unconfigured"};
    if(!c.pixelId) return;
    if(!w.oaiq){
      var q=function(){q.q.push(arguments);}; q.q=[]; w.oaiq=q;
    }
    w.oaiq("consent",false);
    w.oaiq("init",{pixelId:c.pixelId,debug:c.development || new URLSearchParams(w.location.search).get("measurementDebug")==="true"});
    var js=d.createElement("script"); js.async=true; js.src=${JSON.stringify(PIXEL_SCRIPT_URL)};
    function status(value){w.__nanoMotionPixel.status=value;w.dispatchEvent(new Event(${JSON.stringify(STATUS_EVENT)}));}
    js.onload=function(){status("ready");}; js.onerror=function(){status("failed");};
    d.head.appendChild(js);
  })(window,document,${config});`;
}

export function pixelPayload(event: BusinessEvent): PixelData {
  const { name, data } = event;
  if (data.amount !== undefined) {
    integer(data.amount, "event amount");
    if (data.currency !== "USD") throw new Error("Event amount requires USD currency in this demo");
  }
  if (name === "subscription_created") {
    if (!data.planId) throw new Error("Missing membership plan");
    return { type: "plan_enrollment", plan_id: data.planId, amount: data.amount, currency: data.currency };
  }
  return {
    type: "contents",
    ...(data.amount !== undefined ? { amount: data.amount, currency: data.currency } : {}),
    contents: data.contents?.map(item => ({
      id: item.id, name: item.name, content_type: name === "page_viewed" ? "page" : "product",
      ...(item.quantity !== undefined ? { quantity: integer(item.quantity, "quantity") } : {}),
    })),
  };
}

export function createBrowserPixelAdapter(browser: Window): PixelAdapter {
  const call = (...args: PixelCall) => {
    if (!browser.oaiq) throw new Error("Pixel command function unavailable");
    browser.oaiq(...args);
  };
  return {
    ready: () => browser.__nanoMotionPixel?.status === "ready" && !!browser.oaiq,
    state: () => browser.__nanoMotionPixel?.status ?? "unconfigured",
    subscribe: notify => { browser.addEventListener(STATUS_EVENT, notify); return () => browser.removeEventListener(STATUS_EVENT, notify); },
    setConsent: accepted => { if (browser.oaiq) call("consent", accepted); },
    dispatch: event => {
      if (browser.__nanoMotionPixel?.status !== "ready") throw new Error("Pixel SDK is not ready");
      const payload = pixelPayload(event);
      if (event.eventId) call("measure", event.name, payload, { event_id: event.eventId });
      else call("measure", event.name, payload);
      return "handed_to_sdk";
    },
  };
}
