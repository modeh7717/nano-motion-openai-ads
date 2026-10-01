# Testing Nano Motion

## Automated checks

```sh
npm ci
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Vitest exercises domain arithmetic, quantity deltas, snapshot restoration, order/enrollment duplicate prevention, persist-before-dispatch, storage failure, checkout-attempt reuse, consent transitions, view boundaries, loading suppression, SDK failure isolation, and bounded diagnostics. Additional SDK-contract tests validate the official bootstrap ordering, one initialization, schema serialization, required currency, and fourth-argument conversion IDs. These prove our integration contract; they do not execute the downloaded official SDK.

Playwright runs the complete journey, declined-consent shopping, and empty direct-entry routes at desktop and mobile sizes. It starts the production server automatically and substitutes a deterministic SDK at the official CDN URL. It verifies all six command calls, quantity-two totals, rapid double-submit, loading-time revocation, no historical replay, and blocked-script checkout. No live OpenAI test events are sent by this suite. When using an installed compatible Chromium instead of Playwright's bundled browser, set `PLAYWRIGHT_EXECUTABLE_PATH` to the binary path. In this cloud workspace the normal browser download host was blocked; a Chromium binary from `@sparticuz/chromium` via the permitted npm registry is used for browser testing. It is a local test tool, not an app dependency.

## Validation results (2026-10-01)

- Production build and TypeScript check passed.
- 19 unit/contract tests passed.
- 14 browser tests passed: journey, SDK-loading/revocation, blocked-SDK checkout, and layout scenarios at desktop and mobile sizes. Layout checks cover 390px through 3776px; all six SDK calls and conversion IDs are asserted against a mocked official CDN script.
- Production HTTP smoke checks passed for all eight route types; invalid product routes return 404.
- Desktop and mobile home layouts were visually inspected and checked for horizontal overflow.
- Payload serialization and initialization ordering are implemented and verified against the user-supplied documentation and mocked SDK. Actual downloaded-SDK behavior and OpenAI network delivery remain unverified because the cloud proxy blocks the SDK CDN. No public Vercel deployment was performed.

## Monetary contract and documented SDK serialization

| Situation | Unit price | Quantity | Line subtotal | Event total |
| --- | ---: | ---: | ---: | ---: |
| View a jacket | 14800 | 1 | 14800 | 14800 |
| Add one jacket | 14800 | 1 added | 14800 | 14800 |
| Add a second jacket | 14800 | 1 added | 14800 | 14800 |
| Checkout two jackets | 14800 | 2 | 29600 | 29600 |
| Order two jackets and one legging | 14800 / 11800 | 2 / 1 | 29600 / 11800 | 41400 |
| Initial Nano Plus enrollment | 1900 | — | — | 1900 |

All values are integer USD cents. Documentation reviewed 2026-10-01 from the Measurement Pixel text and Supported Events file supplied by the user. `unitAmount` in local events remains an internal unit price. Because the docs do not specify whether optional item-level `amount` means unit price or extended total, omit per-item monetary fields. The verified quantity-two SDK call is:

```js
oaiq("measure", "order_created", {
  type: "contents",
  amount: 29600,
  currency: "USD",
  contents: [{
    id: "NM-RUN-001",
    name: "Aero Run Jacket",
    content_type: "product",
    quantity: 2
  }]
}, { event_id: "order_<persisted-order-id>" });
```

The amount/currency, quantity, supported fields, and event-ID argument position are covered by automated tests. Actual OpenAI receipt must still be checked in a network-enabled browser.

## Manual demo journey

1. Open the homepage with `?measurementDebug=true`, accept measurement, and open the local instrumentation log.
2. Visit Aero Run Jacket; expect one product-view intent. Rerenders must not add another.
3. Add to bag once; expect one item-added intent for quantity one and 14800 USD cents.
4. Visit bag, increase quantity to two; the additional intent reports a delta of one, and bag total becomes $296.
5. Begin checkout; expect one checkout-start intent with both items' quantity and total.
6. Complete demo order; expect one order-created intent with stable `order_<id>`.
7. Refresh confirmation; the saved order remains, the cart stays empty, and no order-created event is reconstructed.
8. Visit Nano Plus and join; expect one subscription-created intent with `subscription_<id>` and 1900 USD cents.
9. Refresh membership confirmation and Join again; the same enrollment remains and there is no second conversion.
10. Reset consent from the footer, decline, and repeat shopping. Orders still succeed and all new dispatches are suppressed.

Wait for `SDK: ready` in the inspector before running the measured journey. Accepted actions should show `handed_to_sdk`; declined/unknown actions show `suppressed`. Actions performed during script loading are suppressed and never replayed. A failed SDK script produces a clear failure notice while shopping still works. These are local statuses; never label them received by OpenAI.

Also check back/forward navigation, direct checkout with a valid cart, checkout refresh, empty checkout, direct confirmation without stored outcomes, multiple products, invalid saved state, blocked storage, mobile layout, keyboard navigation, focus visibility, and rapid repeated submit clicks. Query/debug changes alone do not create another view. A hard reload creates a new visit, not a new purchase. A new explicit checkout from the bag creates a new attempt; refresh/back navigation reuses the current attempt.

## Real Pixel validation still required

From a browser that can access the OpenAI hosts:

1. Run the application with `.env.local` configured, or use its eventual public HTTPS deployment. Open a fresh browser profile/private window with `?measurementDebug=true`.
2. In DevTools Network, verify `https://bzrcdn.openai.com/sdk/oaiq.min.js` loads. Console should show SDK debug activity. Initialize once with the supplied Pixel ID and consent false before measuring.
3. Accept consent, wait for SDK readiness, and run the journey. Inspect the SDK's config requests to `bzrcdn.openai.com` and event requests to `bzr.openai.com`. Confirm the actual payload event names, totals, currency, quantity, content IDs, and conversion IDs match the contract above; the SDK owns its transport encoding.
4. Refresh order/membership confirmations and verify that no extra conversion is submitted. Generic confirmation page views are allowed.
5. In a fresh denied-consent journey, verify no measurement-event pings. SDK script/config requests can still occur with denied consent; do not confuse them with event requests.
6. Revoke consent using the footer. The documented SDK clears `__oppref` and `__obref`; check browser cookies and verify no later measurement-event pings. Reaccept and confirm pre-consent actions are not replayed.
7. Block the SDK script in DevTools and verify checkout still succeeds and the inspector reports failure.

If the account owner has Ads Manager access or server-side Advertiser API credentials, check recent received events for the correct Pixel ID and `pixel_sdk` channel. Never put those credentials in the browser or this public repository. That monitoring check confirms received events separately from campaign attribution. No API credentials were provided for this task.

Inspect documented SDK debug output and browser network requests for all six events. Test acceptance, decline, revocation during loading, and reacceptance. Confirm no pre-consent actions are replayed, no duplicate conversions are emitted, and blocked script loading never interrupts checkout. Test amount, currency, content IDs, quantities, and event-ID placement in actual SDK payloads. SDK activity and transport requests do not independently establish attribution or reporting inclusion.

## Presentation sequence

Show product interest → shopping intent → checkout → completed simulated order, then membership. Explain what question each event answers. Show the local inspector beside actual SDK console/network evidence from a network-enabled browser. Distinguish SDK command calls, browser transport, received-event monitoring, and historical attributed reports. Demonstrate confirmation refresh and consent decline. State that campaign attribution and ROAS require real ad traffic, conversion reporting, and spend data; the demo proves instrumentation behavior, not campaign results.
