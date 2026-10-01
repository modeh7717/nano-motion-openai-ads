# Nano Motion

A Next.js + TypeScript activewear demo with three locally illustrated products, a persisted bag, simulated orders and membership, consent controls, and the OpenAI Measurement Pixel. No real payments, billing, authentication, backend, or personal-information collection.

## Run locally

Use Node.js 22 or later (validated with Node 24).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

On Windows Command Prompt, use `copy .env.example .env.local` instead of `cp`. Leave the terminal running, wait for **Ready**, and open the Local URL shown there with `?measurementDebug=true` appended. Stop the server with Ctrl+C. To pull updates, stop it, run `git pull origin main`, and run `npm run dev` again.

If this cloud environment cannot write its default npm cache, use `npm --cache /tmp/nano-npm-cache ci`.

```sh
npm test
npm run typecheck
npm run build
npm run start
```

The event inspector appears in development or when the initial URL includes `?measurementDebug=true`. Its visibility persists across client navigation for that document; include the parameter again when reloading another route. Consent preferences are always accessible in the footer.

## OpenAI Pixel integration

The root layout uses Next.js `beforeInteractive` to install the official command queue and asynchronously load `https://bzrcdn.openai.com/sdk/oaiq.min.js`. It queues `oaiq("consent", false)` **before** the single `init` call. Client hydration restores the accepted/declined preference and applies it through the documented consent command. Consent remains false for unknown or declined preferences.

`NEXT_PUBLIC_OPENAI_PIXEL_ID` configures the public ID. When unset, it defaults to the assignment's supplied ID, `T8bLgKF4RsYWhHwHnPDJWg`. An explicitly empty value disables SDK installation. Public environment variables are compiled into the frontend; rebuild after changing them. No API key is required for browser measurement.

All six events use documented calls:

| Action | Event | Data shape |
| --- | --- | --- |
| Important generic route visit | `page_viewed` | `contents` |
| Product detail visit | `contents_viewed` | `contents` |
| Successful added quantity | `items_added` | `contents` |
| New checkout attempt | `checkout_started` | `contents` |
| Created simulated order | `order_created` | `contents` |
| New simulated paid membership | `subscription_created` | `plan_enrollment` |

The browser adapter translates domain `planId` to `plan_id`, adds `type` and `content_type`, and passes stable outcome IDs as `{ event_id }` in the **fourth** `measure` argument. Internal `unitAmount` is never serialized. Amounts are USD integer cents; currency is required with an event amount. Purchased quantity is an integer. No `group_id`, `variant_dict`, user-matching fields, or manual attribution identifiers are sent.

The SDK handles automatic `oppref` capture, cookies, event timestamps, source origin, and batching. The application does not manufacture ad-click identifiers or claim that demo orders are attributed conversions.

### Consent and loading behavior

The official queue is used for control commands only. Business events are suppressed while the SDK script is loading and never retained for later replay. Once the script is ready and consent is accepted, the current eligible route gets one view; suppressed shopping actions and completed outcomes are not reconstructed. This deliberate coverage tradeoff prevents pending business events from being replayed after consent revocation. Future consent-safe SDK queueing should be evaluated separately.

Revocation/reset calls `oaiq("consent", false)` immediately and stops new measurement. The supplied documentation states that this removes the SDK attribution/browser-reference cookies and blocked events are not replayed. Script-load or SDK-dispatch failures never interrupt commerce. SDK status `ready` means the script loaded; it does not prove per-pixel configuration readiness, event delivery, or processing.

The inspector is labeled **Local instrumentation log**. `handed_to_sdk` describes a local command call, `suppressed` explains consent/loading suppression, and `failed` describes local dispatch/configuration/loading failure. None is an OpenAI receipt acknowledgment. SDK console logging is enabled in development or with the debug query parameter.

### Documentation verification and design differences

Verified against the Measurement Pixel text and Supported Events, Conversion Tracking, Conversions API, Image Tag, Reporting, Troubleshooting, and Conversion Setup copies supplied by the user on 2026-10-01. Multiple Pixel IDs was also supplied; this demo initializes only one pixel.

The design's examples included per-content `amount` and `currency`. Supported Events describes `amount` as an optional item-level monetary value without specifying unit versus extended price. The implementation therefore omits those optional item fields and sends the unambiguous event-level total with product IDs, names, type, and quantities. The two-jacket payload is documented and asserted in `TESTING.md`.

The real SDK CDN and documentation remain blocked by this cloud workspace's network proxy. **The live SDK is wired into the app, but actual OpenAI network delivery has not been validated here.** Browser tests substitute the SDK script at its official CDN URL and assert our real adapter's command sequence and payloads. Complete the real-network checklist in `TESTING.md` from a browser that can reach the OpenAI hosts.

## Architecture

- `src/data/products.ts`: canonical USD catalog, prices in integer cents.
- `src/lib/cart/store.ts`: hydrated commerce state in one validated, versioned localStorage record. Persist outcomes before conversion dispatch, reuse checkout attempts, and guard repeated submissions with synchronous state updates. Storage failures fall back to memory and show a notice.
- `src/lib/measurement/eventBuilders.ts`: vendor-independent business events and validated totals. Item-added reports quantity delta; order/checkout reports the full snapshot.
- `src/lib/measurement/browserPixel.ts`: official SDK bootstrap, documented payload serializer, and browser adapter.
- `src/lib/measurement/openaiPixel.ts`: consent state, route visit boundaries, SDK status, and bounded local diagnostics. Confirmation rendering never emits conversion events.
- `src/components/runtime.tsx`: client hydration and centralized route observation. Strict Mode effect replay does not reinitialize the SDK.

Orders retain detached item snapshots. The completed order, closed attempt, and empty cart persist together. Repeated Join reuses the saved enrollment. localStorage is demo persistence, not an authoritative transaction store or a cross-tab concurrency guarantee.

Images and fonts are local/system resources; the Pixel uses the official external CDN. USD only: no tax, shipping charge, or discount. Membership value is the simulated initial $19 month, not lifetime revenue. No PII form fields or manual advanced matching are used. Account-level automatic advanced matching is an SDK feature described in the supplied docs; the demo collects no identity fields for it.

## Deploy to Vercel

Import this GitHub repository, select Next.js, and use the repository root. Configure `NEXT_PUBLIC_OPENAI_PIXEL_ID` from `.env.example`; use the default install/build settings (`npm ci`, `npm run build`). Rebuild when public environment variables change. Verify the real Pixel requests on the resulting HTTPS URL before submission.

The app passes a production build but **has not been publicly deployed from this task**. If adding a CSP, allow the documented SDK/config host `https://bzrcdn.openai.com` and event host `https://bzr.openai.com`; use the application's proper nonce/hash approach for the bootstrap rather than adding `unsafe-inline` just for measurement.

## Production measurement and reporting

A production order backend would provide confirmed purchase/subscription events. Add the Conversions API only with a server-stored key, consent and attribution handling, and idempotent delivery. Reuse the same Pixel ID, event name, and outcome ID (browser `event_id`, server `id`) for deduplication. No API keys belong in browser configuration.

Receiving an event and configuring a campaign conversion goal are separate operations. An account administrator must select the source/event in a conversion event setting and attach it to the appropriate campaign. Recent-event monitoring samples roughly the last 15 minutes and requires an Advertiser API key; it is not historical attributed reporting. The supplied Reporting guide says conversions update through daily processing, so immediate reporting totals should not be used as the SDK integration check.

The supplied Measurement Pixel guide describes Ads Manager's `Conversions` metric as click-through and view-through as separate. The Reporting guide describes the dedicated Insights API `conversions` total as click-through plus view-through under its selected windows. Name the reporting surface, windows, time basis, account timezone, and goal scope when explaining results; do not treat these metrics as interchangeable. ROAS needs real attributed purchase value and spend. None of these account/API operations is implemented in this demo.

For reproducible tests and presentation guidance, see [TESTING.md](TESTING.md) and [the design](nano-motion-technical-design.md).
