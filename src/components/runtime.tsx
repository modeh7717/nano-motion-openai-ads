"use client";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { commerce } from "@/lib/cart/store";
import { createBrowserPixelAdapter } from "@/lib/measurement/browserPixel";
import { measurement } from "@/lib/measurement/openaiPixel";
// Let UI components read shopping and measurement state and update when either changes.
export const useCommerce = () => useSyncExternalStore(commerce.subscribe, commerce.getSnapshot, commerce.getServerSnapshot);
export const useMeasurement = () => useSyncExternalStore(measurement.subscribe, measurement.getSnapshot, measurement.getServerSnapshot);
// Set up the app's browser services once and keep measurement informed about navigation.
export function Runtime() {
  const pathname = usePathname();
  // Connect the official SDK adapter before restoring consent and the saved cart.
  // If browser storage is unavailable, the app continues using memory for this visit.
  useEffect(() => {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* Use in-memory fallback. */ }
    measurement.attach(createBrowserPixelAdapter(window));
    measurement.boot(storage); commerce.boot(storage);
  }, []);
  // Tell the controller which page is current so it can build the appropriate view event.
  useEffect(() => { measurement.visit(pathname); }, [pathname]);
  return null;
}
