import type { Metadata } from "next";
import "./globals.css";
import { Header, Footer, ConsentBanner, Inspector, StorageNotice } from "@/components/shell";
import { Runtime } from "@/components/runtime";
export const metadata: Metadata = { title: { default: "Nano Motion — Made for movement", template: "%s | Nano Motion" }, description: "A premium activewear demo storefront. Discover running, training, and yoga essentials. No real purchases or billing." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a href="#main" className="skip-link">Skip to content</a><Runtime/><Header/><StorageNotice/><main id="main">{children}</main><Footer/><ConsentBanner/><Inspector/></body></html>;
}
