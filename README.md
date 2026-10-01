# Nano Motion

A Next.js + TypeScript activewear demo implementing the commerce journey in [the technical design](nano-motion-technical-design.md). Three local illustrated products, a persisted bag, simulated orders and membership, consent controls, and a local instrumentation inspector. No real payments, billing, authentication, backend, or PII collection.

## Run locally

Use Node.js 22 or later (validated with Node 24).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

If the environment cannot write its default npm cache, use `npm --cache /tmp/nano-npm-cache ci`.

```sh
npm test
npm run typecheck
npm run build
npm run start
```

Open the storefront on the development server. Add `?measurementDebug=true` to the initial URL to enable the inspector; it also appears in development. Its visibility persists across client navigation for that document. Consent preferences are always accessible in the footer.

## Current integration status

**Live OpenAI Pixel dispatch is disabled.** As of 2026-10-01, this workspace's network policy rejects access to `developers.openai.com`, and saving a domain addition through the environment draft tool failed. The official SDK installation snippet, consent API, browser payload schema, and quantity-two item-amount semantics have not been verified. The application deliberately does not load an invented SDK URL or transmit speculative payloads.

`NEXT_PUBLIC_OPENAI_PIXEL_ID` is supplied in `.env.example` for the eventual verified adapter. It is public configuration, not a secret. It is not used for live dispatch yet. The six standard names from the design are represented in a **local business-event contract**, not a validated OpenAI wire schema. In particular, local contents use `unitAmount` and enrollment uses `planId`; these are domain fields and are never sent directly to OpenAI.

To complete the integration:

1. Make the official documentation accessible, or provide its installation snippet and event schemas. Check measurement-pixel, supported-events, conversions-api, and conversion-tracking.
2. Add a verified browser adapter in `src/lib/measurement/openaiPixel.ts` that serializes business events into documented SDK calls and places `event_id` exactly where the docs require it. Initialize once with the configured Pixel ID and consent false before any measurement.
3. Verify line-item `amount` semantics with the two-jacket example in `TESTING.md`. Use only documented browser fields.
4. Set documented SDK consent before measuring accepted users. Do not queue pre-consent events or replay actions on reacceptance. The current adapter boundary suppresses events while loading to avoid queue replay after revocation; if the SDK supports verified consent-safe queue clearing, implement and test that behavior before changing the policy.
5. Run mocked SDK integration tests plus console/network validation on the real SDK. Update this status and the inspector notice only after successful verification.

The current inspector labels accepted events `failed` with an explicit documentation blocker. Declined/unknown events are suppressed. Neither local dispatch logs nor HTTP success alone prove OpenAI receipt, attribution, reporting, or optimization results.

## Architecture and behavior

- `src/data/products.ts`: canonical USD catalog, prices in integer cents.
- `src/lib/cart/store.ts`: client-only hydrated commerce state in one versioned localStorage record. Validate saved data, persist outcomes before conversion dispatch, reuse checkout attempts, and guard repeated submissions with synchronous state updates. Storage failures fall back to memory and show a notice.
- `src/lib/measurement/eventBuilders.ts`: vendor-independent business events and validated totals. Item-added reports quantity delta; order/checkout reports the full cart snapshot.
- `src/lib/measurement/openaiPixel.ts`: explicit unknown/accepted/declined consent, route visit boundaries, bounded local diagnostics, and a future adapter boundary. No conversion dispatch on confirmation rendering.
- `src/components/runtime.tsx`: client hydration and centralized pathname observation, surviving Strict Mode effect replay.

An order's cart snapshot is detached from live cart state. Persisting the completed order, closed checkout attempt, and empty cart together reduces inconsistent refresh state. Repeated membership Join reuses the existing saved enrollment. localStorage is demo persistence, not an authoritative transaction store or a cross-tab concurrency guarantee.

No script, font, or image requires a third-party CDN for the current storefront. SVG illustrations are local assets. USD only: no tax, shipping charge, or discount; total is the sum of line subtotals. Membership value is the simulated initial $19 month, not lifetime revenue.

## Deploy to Vercel

Import this GitHub repository into Vercel, select Next.js, and use the repository root as the project directory. Configure `NEXT_PUBLIC_OPENAI_PIXEL_ID` from `.env.example`. Keep the default install/build settings (`npm ci`, `npm run build`) and deploy after reviewing the live integration status above. Changes to public environment variables require a rebuild.

The app has passed a production build but **has not been deployed from this task**. Publishing the storefront before adapter completion will provide the demo journey with local instrumentation only. Do not describe that as a complete OpenAI Measurement Pixel deployment.

## Production measurement extension

A real order backend would become the confirmed source of purchase/subscription events. Add the Conversions API only with server credentials, consent and attribution handling, documented payload validation, and an idempotent delivery process. Reuse the browser outcome's stable event ID for documented browser/server deduplication. Never expose an API key in browser configuration. The demo does not create attribution identifiers or claim simulated orders are attributed ad conversions.

For presentation and reproducible validation, see [TESTING.md](TESTING.md).
