"use client";
import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { commerce } from "@/lib/cart/store";
import { createBrowserPixelAdapter } from "@/lib/measurement/browserPixel";
import { measurement } from "@/lib/measurement/openaiPixel";
export const useCommerce = () => useSyncExternalStore(commerce.subscribe, commerce.getSnapshot, commerce.getServerSnapshot);
export const useMeasurement = () => useSyncExternalStore(measurement.subscribe, measurement.getSnapshot, measurement.getServerSnapshot);
export function Runtime() {
  const pathname = usePathname();
  useEffect(() => {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* Use in-memory fallback. */ }
    measurement.attach(createBrowserPixelAdapter(window));
    measurement.boot(storage); commerce.boot(storage);
  }, []);
  useEffect(() => { measurement.visit(pathname); }, [pathname]);
  return null;
}
