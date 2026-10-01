# Nano Motion — Technical Design Document
## OpenAI Solutions Engineer, Ads Take‑Home

**Document purpose:** Give Codex a clear, implementation-ready technical plan for the Nano Motion take-home assignment.  
**Primary deliverable:** A simple, polished public website that demonstrates a correct, thoughtful, scalable OpenAI Measurement Pixel implementation.  
**Pixel ID:** `T8bLgKF4RsYWhHwHnPDJWg`  
**Last updated:** 2026-10-01

---

## 1. Assignment context

The take-home asks for a realistic Solutions Engineering engagement with a fictional advertiser, **Nano Motion**, a premium activewear e-commerce company selling categories such as running gear, training apparel, outerwear, accessories, and yoga essentials.

The prompt specifically asks for:

- A simple public-facing Nano Motion website.
- Public hosting using a provider such as Vercel, GitHub Pages, or another static hosting option.
- Correct implementation of the **OpenAI Measurement Pixel** using the provided Pixel ID.
- Thoughtful selection of meaningful measurement events.
- An implementation that is practical and scalable rather than a one-off demo hack.
- A live demonstration of the user journey and the measurement points.
- A clear explanation of what each event captures and why it matters.
- Technical decisions that connect back to business objectives such as:
  - e-commerce growth,
  - international expansion,
  - future membership/subscription growth,
  - attribution,
  - signal coverage,
  - optimization,
  - return on advertising spend.

The presentation will ultimately be shown to a CMO/CTO audience, so the technical design should be easy to explain and visibly connected to business value.

---

## 2. Design principles

### 2.1 Build the smallest realistic commerce journey that proves the measurement strategy

The assignment is primarily about **measurement implementation and Solutions Engineering judgment**, not building a production commerce platform.

The website should therefore include enough functionality to create a believable customer funnel without adding unrelated engineering complexity.

**Decision:** Build a small activewear storefront with:
- homepage,
- product catalog,
- product detail pages,
- cart,
- simulated checkout,
- order confirmation,
- membership page,
- membership confirmation.

**Reason:** This creates all of the important behavioral and conversion moments needed to demonstrate measurement while keeping the implementation understandable during a 20-minute presentation.

---

### 2.2 Use OpenAI standard events whenever a standard event exists

**Decision:** Do not invent custom names for normal commerce actions.

Use the current OpenAI standard taxonomy:
- `page_viewed`
- `contents_viewed`
- `items_added`
- `checkout_started`
- `order_created`
- `subscription_created`

**Reason:** Standard events give OpenAI a known semantic meaning for the action and directly match Nano Motion's commerce and membership use cases. Custom events should be reserved for actions that do not fit the documented taxonomy.

Official reference:
https://developers.openai.com/ads/supported-events

---

### 2.3 Separate business events from OpenAI-specific implementation

**Decision:** All OpenAI measurement calls must go through a dedicated measurement module rather than being written directly throughout React components.

Suggested interface:

```ts
trackPageViewed(...)
trackProductViewed(...)
trackItemAdded(...)
trackCheckoutStarted(...)
trackOrderCreated(...)
trackSubscriptionCreated(...)
```

Internally, those functions call the OpenAI Pixel.

**Reason:** This is a more scalable customer implementation. UI components communicate business intent ("an order was created") instead of knowing the vendor-specific event payload. It makes the code easier to test, audit, change, and extend later to server-side measurement.

---

### 2.4 Do not build technology that the prompt does not require

**Decision:** The required implementation will use the browser Measurement Pixel. Do not make the OpenAI Conversions API or Advertiser API a dependency of the take-home.

**Reason:** The recruiter supplied a **Pixel ID**, but did not supply an Advertiser API key or a Conversions API key. The correct implementation is therefore to build the required browser integration and explain server-side measurement as a production enhancement.

A future production design may send confirmed orders server-side using the Conversions API and reuse the same `event_id` as the browser event for deduplication.

Official references:
- https://developers.openai.com/ads/measurement-pixel
- https://developers.openai.com/ads/conversions-api
- https://developers.openai.com/ads/conversion-tracking

---

## 3. Proposed technology stack

### Framework: Next.js + TypeScript

**Decision:** Use Next.js with TypeScript.

**Reasons:**
1. It is simple for Codex to scaffold and maintain.
2. It creates a production-like frontend without requiring a separate backend.
3. It deploys cleanly to Vercel, one of the hosting approaches explicitly suggested by the assignment.
4. TypeScript lets us strongly type product, cart, and measurement payload construction.
5. The application can remain mostly client-side while still having a clean route structure.

Do not add a database.

Do not add authentication.

Do not add a real payment provider.

---

### Hosting: Vercel

**Decision:** Deploy the GitHub repository to Vercel.

**Reasons:**
- Public URL is required for the assignment.
- Vercel is optimized for Next.js.
- Deployments are easy to reproduce.
- Preview deployments are useful while iterating.
- It minimizes infrastructure work that does not contribute to the assignment.

---

### State management: React context + localStorage

Use local state / React context for cart state and persist the cart in `localStorage`.

**Reason:** The demo needs state across routes, but Redux or a database would be unnecessary complexity for a three-product demo.

---

### Styling: simple responsive CSS or Tailwind

Either is acceptable. Prefer the approach already scaffolded in the repo.

Visual direction:
- premium activewear brand,
- clean typography,
- large product imagery/placeholders,
- minimal navigation,
- polished mobile layout.

**Reason:** The site must feel credible to CMO/CTO interviewers, but visual design should not overshadow the measurement implementation.

---

## 4. Proposed site architecture

```text
/
├── /shop
├── /product/[slug]
├── /cart
├── /checkout
├── /order-confirmation
├── /membership
└── /membership-confirmation
```

### Home `/`
Purpose:
- introduce Nano Motion,
- featured products,
- membership CTA.

Measurement:
- `page_viewed`

### Shop `/shop`
Purpose:
- product discovery.

Measurement:
- `page_viewed`

### Product `/product/[slug]`
Purpose:
- product-specific interest.

Measurement:
- `contents_viewed`

### Cart `/cart`
Purpose:
- review purchase intent.

Measurement:
- optional `page_viewed` if useful for the demo, but avoid unnecessary event volume.

### Checkout `/checkout`
Purpose:
- simulated checkout.

Measurement:
- `checkout_started` should fire when the user intentionally enters checkout, not merely every time the component re-renders.

### Order confirmation `/order-confirmation`
Purpose:
- display a completed simulated order.

Measurement:
- **Do not fire `order_created` merely because this page renders.**
- Fire `order_created` at the moment the application creates the simulated order.
- The confirmation page reads the already-created order.

This prevents duplicate purchases when the user refreshes the confirmation page.

### Membership `/membership`
Purpose:
- explain the future Nano Motion membership program.

Measurement:
- `page_viewed`

### Membership confirmation `/membership-confirmation`
Purpose:
- show successful membership enrollment.

Measurement:
- `subscription_created` at successful enrollment, not on every render.

---

## 5. Demo product catalog

Keep the catalog intentionally small.

Suggested products:

```text
NM-RUN-001   Aero Run Jacket        $148.00
NM-TRN-002   Velocity Legging       $118.00
NM-YGA-003   Motion Performance Tee  $68.00
```

Each product should have:
- stable internal ID,
- slug,
- name,
- category,
- description,
- price stored in integer cents,
- local image or simple local visual asset.

**Reason for integer cents:** OpenAI's documented event schema expects monetary values as integers in the standard minor currency unit. For example, `$148.00` should be represented as `14800` with currency `USD`.

---

## 6. Measurement architecture

Suggested module layout:

```text
src/
  lib/
    measurement/
      openaiPixel.ts
      types.ts
      eventBuilders.ts
  components/
  app/
```

### `openaiPixel.ts`

Responsibilities:
- expose safe wrapper functions,
- verify browser environment,
- call `window.oaiq`,
- gracefully handle the Pixel not being ready,
- optionally record events in a local demo/debug log,
- prevent measurement code from leaking across UI components.

### `eventBuilders.ts`

Responsibilities:
- convert Nano Motion product/cart/order objects into OpenAI-compatible payloads,
- calculate total value,
- enforce integer amount and quantity types,
- centralize currency behavior.

### `types.ts`

Include TypeScript definitions for:
- Nano Motion product,
- cart item,
- order,
- membership plan,
- locally-used OpenAI event payload structures.

Do not invent undocumented OpenAI payload fields.

---

## 7. Pixel installation

Install the official OpenAI Measurement Pixel in the application root so it is available across the site.

Use Pixel ID:

```text
T8bLgKF4RsYWhHwHnPDJWg
```

Keep the value configurable via:

```text
NEXT_PUBLIC_OPENAI_PIXEL_ID
```

and provide it in `.env.example`.

The Pixel ID is not a server secret, but configuration is preferable to scattering it in application code.

During development, enable Pixel debug logging.

Before implementing the script, Codex should verify the current installation snippet in the official documentation:

https://developers.openai.com/ads/measurement-pixel

---

## 8. Consent handling

Implement a lightweight **demo measurement-consent banner**.

Behavior:
1. On first visit, no stored preference exists.
2. Show:
   - Accept measurement
   - Decline
3. Set OpenAI Pixel consent before normal measurement begins.
4. Persist the user's choice locally.
5. If declined, do not send measurement events.
6. Allow the demo user to reset the consent choice from a small footer/debug control.

**Reason:** Nano Motion plans international expansion. Consent-aware measurement demonstrates that the implementation was designed with real deployment conditions in mind rather than assuming one market.

This is a technical demonstration, not a claim that the sample banner is a complete legal/CMP implementation.

The official Pixel supports setting consent before initialization and prevents measurement-event pings while consent is false.

Reference:
https://developers.openai.com/ads/measurement-pixel

---

## 9. Event design

### 9.1 `page_viewed`

Trigger:
- homepage,
- shop,
- membership,
- other important generic pages where product-specific `contents_viewed` is not more meaningful.

Example conceptual payload:

```ts
{
  type: "contents",
  contents: [
    {
      id: "home",
      name: "Nano Motion Home",
      content_type: "page"
    }
  ]
}
```

**Reason:** Gives visibility into meaningful landing/page engagement without treating every component interaction as a conversion.

---

### 9.2 `contents_viewed`

Trigger:
- once when a product detail page is viewed.

Example:

```ts
{
  type: "contents",
  amount: 14800,
  currency: "USD",
  contents: [
    {
      id: "NM-RUN-001",
      name: "Aero Run Jacket",
      content_type: "product",
      quantity: 1,
      amount: 14800,
      currency: "USD"
    }
  ]
}
```

**Reason:** This represents explicit product interest and is more informative than a generic page view for product pages.

---

### 9.3 `items_added`

Trigger:
- after the cart successfully accepts the user's add-to-cart action.

Example:

```ts
{
  type: "contents",
  amount: 14800,
  currency: "USD",
  contents: [
    {
      id: "NM-RUN-001",
      name: "Aero Run Jacket",
      content_type: "product",
      quantity: 1,
      amount: 14800,
      currency: "USD"
    }
  ]
}
```

**Reason:** Add-to-cart is a strong intent signal and helps distinguish product interest from shopping intent. It also provides a useful funnel stage between product view and checkout.

---

### 9.4 `checkout_started`

Trigger:
- when the user intentionally begins checkout from the cart.

Payload:
- cart total,
- currency,
- all cart contents.

**Important:** Avoid firing this repeatedly due to component renders or route refreshes.

**Reason:** This marks a high-intent step and makes it possible to diagnose abandonment between cart, checkout, and purchase.

---

### 9.5 `order_created`

Trigger:
- when simulated checkout succeeds and an order object is created.

Payload:
- complete order value,
- currency,
- purchased contents.

Options:
- include a stable `event_id`, for example `order_NM-10482`.

**Reason:** This is the primary e-commerce business outcome and should represent an actual completed order in the demo.

**Duplicate prevention requirement:** A refresh of `/order-confirmation` must not create or re-send a new purchase event.

---

### 9.6 `subscription_created`

Trigger:
- when the user successfully enrolls in the paid Nano Motion membership.

Use the documented `plan_enrollment` data shape.

Example:

```ts
{
  type: "plan_enrollment",
  plan_id: "nano-motion-plus-monthly",
  amount: 1900,
  currency: "USD"
}
```

Options:
- include a stable membership `event_id`.

**Reason:** The assignment explicitly says Nano Motion is launching a membership/subscription program. Instrumenting this separately shows that the measurement design covers both immediate retail revenue and recurring-revenue strategy.

---

## 10. Why intermediate funnel events are included

Do not instrument events only because they are available.

The intended funnel is:

```text
page/product view
      ↓
contents_viewed
      ↓
items_added
      ↓
checkout_started
      ↓
order_created
```

Each event answers a different question:

- `contents_viewed`: Are visitors engaging with products?
- `items_added`: Are interested visitors showing purchase intent?
- `checkout_started`: Are cart users advancing toward payment?
- `order_created`: Are they completing the transaction?

**Reason:** The recruiter prompt asks not only for measurement, but for the business value of measurement, signal coverage, attribution, and optimization. A full but concise funnel gives the CMO/CTO something actionable beyond a final conversion count.

---

## 11. `event_id` strategy

Generate stable IDs for the two definitive outcomes:

```text
order_created        -> order_<order-id>
subscription_created -> subscription_<membership-id>
```

The browser implementation does not require a server duplicate today, but keeping stable event IDs makes the integration ready for a future Pixel + Conversions API setup.

If the same event is later sent from browser and server, OpenAI supports deduplication by reusing the same event ID with the same Pixel/event identity.

Reference:
https://developers.openai.com/ads/measurement-pixel

---

## 12. Attribution behavior

Do not manually invent or generate an OpenAI attribution identifier.

The official Pixel automatically handles the OpenAI `oppref` attribution value when one is present on a real ad landing URL.

For the demo:
- allow the Pixel to handle this behavior naturally;
- do not create a fake `oppref` and claim it represents an actual OpenAI ad click.

**Reason:** The take-home is about correct measurement implementation. Simulating a fake attribution token could make the demo less accurate.

In the presentation, explain that on real ChatGPT Ads traffic the Pixel captures and persists the attribution identifier automatically.

---

## 13. No PII / advanced matching in the take-home

Do not collect names, emails, phone numbers, or other identity fields purely for this demo.

**Reason:** They are not necessary to prove the assignment and would add unnecessary privacy and implementation concerns.

Future production work can evaluate advanced matching based on Nano Motion's consent model, data policies, and customer architecture.

---

## 14. Debug experience

Create a lightweight development/demo event inspector.

Enable it only when:

```text
?measurementDebug=true
```

or in development mode.

Display:
- timestamp,
- event name,
- product/content IDs,
- amount,
- currency,
- event ID when present.

Example:

```text
14:02:11  contents_viewed
           NM-RUN-001 / Aero Run Jacket / $148.00

14:02:17  items_added
           NM-RUN-001 / qty 1 / $148.00

14:02:25  checkout_started
           2 items / $266.00

14:02:39  order_created
           order_NM-10482 / $266.00
```

**Important:** Label this as **Local instrumentation log**.

It must not claim that an event was received by OpenAI.

**Reason:** It makes the live presentation easy to follow while preserving technical accuracy.

---

## 15. Pixel validation

During implementation, verify events in two ways.

### A. Browser console
Enable the Pixel's documented `debug` option during testing and inspect SDK activity.

### B. Browser network panel
Use DevTools to verify requests to the OpenAI measurement endpoints.

Do not rely only on the custom local debug panel.

### Optional, only if credentials become available
OpenAI documents an Advertiser API conversion event stream that can show recent Pixel events for enabled accounts. Do not make this a required part of the project because the recruiter did not provide an Ads API key.

Reference:
https://developers.openai.com/ads/api-reference/conversion-setup

---

## 16. Testing strategy

### Unit tests

Test event builders independently.

Required examples:
- product price `$148.00` becomes `14800`;
- cart quantity remains an integer;
- order total is correct;
- `contents[]` contains only documented browser-supported fields;
- membership uses `plan_enrollment`;
- stable `event_id` is generated from the order/subscription ID.

---

### Integration tests

Mock `window.oaiq` and verify:
- product view triggers `contents_viewed`;
- add-to-cart triggers exactly one `items_added`;
- checkout entry triggers exactly one `checkout_started`;
- successful checkout triggers exactly one `order_created`;
- order confirmation refresh does not create a second order event;
- membership enrollment triggers exactly one `subscription_created`;
- declining consent prevents measurement calls;
- accepting consent allows subsequent events.

---

### Manual QA checklist

Run this exact journey before submission:

```text
1. Open site
2. Accept measurement consent
3. Open a product
4. Add product to cart
5. Open cart
6. Start checkout
7. Complete simulated checkout
8. Confirm order page
9. Refresh order confirmation
10. Verify no duplicate purchase
11. Open membership
12. Join membership
13. Verify subscription event
```

For every step:
- inspect local event log,
- inspect Pixel debug output,
- inspect browser network activity,
- verify amount/currency/item values.

Also test:
- desktop,
- mobile,
- empty cart,
- multiple quantities,
- two different products,
- consent decline,
- consent reset,
- direct navigation to order confirmation,
- hard refresh.

---

## 17. Simulated checkout rules

The site must clearly be a demo.

Checkout should:
- use fake form fields or a simple "Complete demo order" button;
- never submit a real payment;
- never collect or store real payment-card data.

On success:
1. create an order ID;
2. freeze a snapshot of the cart;
3. persist the order locally;
4. fire `order_created` once;
5. clear the cart;
6. navigate to confirmation.

**Reason:** The assignment needs a conversion event, not a payment integration.

---

## 18. Membership demo rules

Create one simple paid membership plan, for example:

```text
Nano Motion Plus
$19/month
- member pricing
- early product access
- free standard shipping
```

The exact benefits are fictional and should be clearly positioned as demo content.

Enrollment:
1. user clicks "Join";
2. create a membership enrollment ID;
3. fire `subscription_created`;
4. navigate to confirmation.

Do not build recurring billing.

---

## 19. Production extension: Conversions API

This is intentionally **not required for the take-home implementation**.

Add a small README/design section showing how the architecture would evolve:

```text
Browser                    Server
   |                         |
OpenAI Pixel             Order backend
   |                         |
   |                  Conversions API
   |                         |
   +------ same event_id ----+
              |
            OpenAI
```

Production benefits:
- confirmed backend purchase source,
- less dependence on browser execution,
- more resilient measurement,
- browser/server event deduplication.

Requirements before implementing:
- Conversions API key,
- server-side secret storage,
- server access to confirmed order/subscription events,
- capture and forwarding of relevant attribution information.

Never put a Conversions API key in browser code.

---

## 20. Non-goals

Codex should **not** build any of the following unless explicitly requested later:

- real ChatGPT UI clone,
- real OpenAI ad-serving flow,
- real campaign creation,
- fake Ads Manager,
- Advertiser API integration without credentials,
- Conversions API calls from browser code,
- real Stripe/payment processing,
- user accounts,
- production database,
- analytics warehouse,
- complex inventory system,
- PII collection solely for the demo,
- large product catalog.

**Reason:** These do not materially improve the assignment's core demonstration and create unnecessary failure points.

---

## 21. Suggested repository structure

```text
nano-motion/
├── DESIGN.md
├── README.md
├── TESTING.md
├── .env.example
├── package.json
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── shop/
│   │   ├── product/[slug]/
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── order-confirmation/
│   │   ├── membership/
│   │   └── membership-confirmation/
│   ├── components/
│   ├── data/
│   │   └── products.ts
│   ├── lib/
│   │   ├── cart/
│   │   └── measurement/
│   │       ├── openaiPixel.ts
│   │       ├── eventBuilders.ts
│   │       └── types.ts
│   └── hooks/
└── public/
```

---

## 22. Acceptance criteria

The implementation is complete when all of the following are true:

- [ ] Site is publicly accessible.
- [ ] Nano Motion branding is present and credible.
- [ ] At least three products exist.
- [ ] User can view a product.
- [ ] User can add products to a cart.
- [ ] User can begin a simulated checkout.
- [ ] User can complete a simulated purchase.
- [ ] User can enroll in the sample membership.
- [ ] OpenAI Pixel initializes once with the provided Pixel ID.
- [ ] `page_viewed` is implemented intentionally.
- [ ] `contents_viewed` is implemented.
- [ ] `items_added` is implemented.
- [ ] `checkout_started` is implemented.
- [ ] `order_created` is implemented.
- [ ] `subscription_created` is implemented.
- [ ] Monetary values are sent in integer minor units.
- [ ] Event payloads use only fields supported by the current Pixel documentation.
- [ ] Purchase refresh does not double-fire.
- [ ] Subscription confirmation refresh does not double-fire.
- [ ] Consent can disable measurement.
- [ ] Debug mode is available for testing.
- [ ] Local demo event inspector is clearly labeled as local.
- [ ] Browser console/network validation is documented.
- [ ] No API keys or secrets are exposed.
- [ ] README explains setup and deployment.
- [ ] TESTING.md contains reproducible QA steps.
- [ ] Project deploys successfully to Vercel.

---

## 23. Prompt-to-design traceability

| Assignment need | Technical design response |
|---|---|
| Build a simple public website | Small Next.js activewear storefront |
| Host it publicly | Vercel deployment |
| Implement provided Pixel | Root-level OpenAI Pixel integration using supplied Pixel ID |
| Choose meaningful measurements | Six standard events tied to commerce + membership |
| Explain event rationale | Event design section documents trigger and business reason |
| Show user journey | Product → cart → checkout → order, plus membership |
| Demonstrate measurement points | Local event inspector + browser Pixel/network validation |
| Show scalable integration | Central measurement abstraction and event builders |
| Address international expansion | Currency-safe schema + consent-aware architecture |
| Address membership strategy | `subscription_created` with `plan_enrollment` |
| Address attribution | Rely on documented automatic `oppref` handling |
| Address signal coverage | Product, intent, checkout, order, subscription funnel |
| Discuss production next steps | Optional future server-side Conversions API architecture |

---

## 24. Instructions to Codex

Before writing code:

1. Read this entire document.
2. Read the latest official OpenAI documentation:
   - https://developers.openai.com/ads/measurement-pixel
   - https://developers.openai.com/ads/supported-events
   - https://developers.openai.com/ads/conversions-api
   - https://developers.openai.com/ads/conversion-tracking
3. Verify that the event names and payload fields in this design still match the current docs.
4. Do not invent OpenAI APIs, fields, event names, or attribution behavior.
5. If the docs conflict with this document, follow the current official docs and record the difference in `README.md`.
6. Implement in small phases and run tests after each phase.
7. Keep the measurement layer isolated from UI code.
8. Do not add scope that is listed under Non-goals.
9. Keep the site polished but prioritize correctness, testability, and presentation clarity.
10. Produce `README.md` and `TESTING.md` before declaring the project complete.

### Recommended build order

**Phase 1 — Scaffold**
- Next.js + TypeScript
- routes
- static product data
- styling

**Phase 2 — Commerce**
- product pages
- cart
- checkout
- simulated order creation

**Phase 3 — Membership**
- membership page
- simulated enrollment

**Phase 4 — Measurement**
- Pixel installation
- measurement abstraction
- event builders
- six events
- event IDs

**Phase 5 — Consent and debugging**
- consent banner
- local event inspector
- debug configuration

**Phase 6 — QA**
- unit tests
- integration tests
- duplicate-event protection
- mobile QA
- network verification

**Phase 7 — Deployment**
- Vercel
- final README
- TESTING.md
- production build check

---

## 25. Technical decision summary

The design intentionally chooses **clarity over complexity**.

The strongest version of this assignment is not the site with the most features. It is the site where every measurement decision can be defended:

- standard events instead of arbitrary custom events,
- meaningful funnel coverage instead of tracking everything,
- accurate conversion timing instead of firing on confirmation-page render,
- stable event IDs for future deduplication,
- consent-aware behavior for international readiness,
- a vendor-isolated measurement layer for scalability,
- browser Pixel as the required implementation,
- server-side measurement shown as the logical production extension rather than pretending credentials were provided.

That combination directly demonstrates the core Solutions Engineer skills the prompt is testing: understanding customer goals, translating them into measurement architecture, implementing correctly, anticipating production concerns, and explaining the tradeoffs clearly.
