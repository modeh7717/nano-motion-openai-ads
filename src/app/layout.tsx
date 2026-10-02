import Script from "next/script";
import { pixelBootstrap, PIXEL_ID } from "@/lib/measurement/browserPixel";
import type { Metadata } from "next";
import "./globals.css";
import { Header, Footer, ConsentBanner, Inspector, StorageNotice } from "@/components/shell";
import { Runtime } from "@/components/runtime";
// Set the shared browser title and description for the demo storefront.
export const metadata: Metadata = { title: { default: "Nano Motion — Made for movement", template: "%s | Nano Motion" }, description: "A premium activewear demo storefront. Discover running, training, and yoga essentials. No real purchases or billing." };
// Wrap every page with the shared navigation, consent controls, and measurement runtime.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>
    {/* Run the Pixel installation early. Next.js places beforeInteractive scripts in the head. */}
    <Script id="openai-measurement-pixel" strategy="beforeInteractive">{pixelBootstrap(PIXEL_ID, process.env.NODE_ENV === "development")}</Script>
    {/* Connect browser state and provide the shared storefront around each page's content. */}
    <a href="#main" className="skip-link">Skip to content</a><Runtime/><Header/><StorageNotice/><main id="main">{children}</main>
    {/* Let visitors change consent and inspect local measurement activity. */}
    <Footer/><ConsentBanner/><Inspector/>
  </body></html>;
}
