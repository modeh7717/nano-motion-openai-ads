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

Vitest exercises domain arithmetic, quantity deltas, snapshot restoration, order/enrollment duplicate prevention, persist-before-dispatch, storage failure, checkout-attempt reuse, consent transitions, view boundaries, loading suppression, SDK failure isolation, and bounded diagnostics. A mocked adapter proves local dispatch behavior only; it does not validate the official OpenAI SDK.

Playwright runs the complete journey, declined-consent shopping, and empty direct-entry routes at desktop and mobile sizes. It starts the production server automatically. When using an installed compatible Chromium instead of Playwright's bundled browser, set `PLAYWRIGHT_EXECUTABLE_PATH` to the binary path. In this cloud workspace the normal browser download host was blocked; a Chromium binary from `@sparticuz/chromium` via the permitted npm registry is used for browser testing. It is a local test tool, not an app dependency.

## Validation results (2026-10-01)

- Production build and TypeScript check passed.
- 13 unit/contract tests passed.
- 10 browser tests passed: four journey scenarios at both desktop and mobile sizes, plus layout regression checks from 390px through 3776px. The layout check verifies that hero text and artwork stay above the sections below with no horizontal overflow.
- Production HTTP smoke checks passed for all eight route types; invalid product routes return 404.
- Desktop and mobile home layouts were visually inspected and checked for horizontal overflow.
- Real SDK initialization, payload serialization, and OpenAI network delivery remain unverified and disabled. No public Vercel deployment was performed.

## Monetary contract (official serialization pending)

| Situation | Unit price | Quantity | Line subtotal | Event total |
| --- | ---: | ---: | ---: | ---: |
| View a jacket | 14800 | 1 | 14800 | 14800 |
| Add one jacket | 14800 | 1 added | 14800 | 14800 |
| Add a second jacket | 14800 | 1 added | 14800 | 14800 |
| Checkout two jackets | 14800 | 2 | 29600 | 29600 |
| Order two jackets and one legging | 14800 / 11800 | 2 / 1 | 29600 / 11800 | 41400 |
| Initial Nano Plus enrollment | 1900 | — | — | 1900 |

All values are integer USD cents. `unitAmount` in local events is explicitly a unit price. **The official per-content `amount` meaning remains unverified**; do not claim these are verified SDK payloads. Documentation check attempted 2026-10-01: the network proxy rejected the official host with 403. Record the eventual successful verification date and actual quantity-two SDK payload here.

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

In this implementation, accepted intents are explicitly logged as failed because live SDK verification is pending. Expected statuses must change to documented local SDK dispatch only after adapter implementation and successful testing; never label them received by OpenAI.

Also check back/forward navigation, direct checkout with a valid cart, checkout refresh, empty checkout, direct confirmation without stored outcomes, multiple products, invalid saved state, blocked storage, mobile layout, keyboard navigation, focus visibility, and rapid repeated submit clicks. Query/debug changes alone do not create another view. A hard reload creates a new visit, not a new purchase. A new explicit checkout from the bag creates a new attempt; refresh/back navigation reuses the current attempt.

## Real Pixel validation still required

After implementing the verified adapter, inspect documented SDK debug output and browser network requests to the official endpoints for all six events. Test acceptance, decline, revocation during loading, and reacceptance. Confirm no pre-consent actions are replayed, no duplicate conversions are emitted, and blocked script loading never interrupts checkout. Test amount, currency, content IDs, quantities, and event-ID placement in actual SDK payloads. SDK activity and transport requests do not independently establish attribution or reporting inclusion.

## Presentation sequence

Show product interest → shopping intent → checkout → completed simulated order, then membership. Explain what question each event answers. Show the local inspector beside SDK console/network evidence only once the live adapter is available. Demonstrate confirmation refresh and consent decline. State that campaign attribution and ROAS require real ad traffic, conversion reporting, and spend data; the demo proves instrumentation behavior, not campaign results.
