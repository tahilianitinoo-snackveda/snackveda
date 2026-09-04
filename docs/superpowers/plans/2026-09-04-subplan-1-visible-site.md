# Sub-plan 1: the visible site

Builds what a visitor actually sees: a design system, a homepage that splits its two
audiences, and the entire B2B/export surface that does not exist today.

Branches from `subplan-0-foundations` (backend hardened, 27 tests, 0 typecheck errors).
Branch name: `subplan-1-visible-site`.

## Global Constraints

Every task is bound by these. They are not style preferences.

- **Narayani does not manufacture anything.** It is a merchant exporter, distributor and
  sourcing partner. Never write "our factory", "we manufacture", "our production",
  "our facility", or "Manufacturer & Exporter". Use: merchant exporter, distributor, export
  trading company, food products sourcing partner, "we source from selected Indian
  manufacturers and brands". See `docs/decisions/0002-never-imply-manufacturing.md`.
- **Never invent a fact about the business.** No certification numbers, no nutritional
  values, no allergen lists, no reviews, no country claims, no "trusted by N buyers". If a
  section needs a fact nobody supplied, render nothing or an honest placeholder that says
  the information is coming — never a plausible-looking invention. This is a live commercial
  site; a fabricated FSSAI number or nutrition panel is a legal problem, not a copy problem.
- **Do not break checkout.** `/cart`, `/checkout`, `/account` and the admin pages work today
  and take real money. Do not restructure them in this sub-plan.
- **The suite must stay green.** 27 tests, 0 typecheck errors, `build:frontend` exit 0. Every
  task verifies all three before committing.
- Money is INR via `Intl.NumberFormat('en-IN', {style:'currency', currency:'INR'})`. Dates are
  DD MMM YYYY via `date-fns`.
- `pnpm` is not on PATH — use `corepack pnpm`, or a shim.
- Repo files are **CRLF**. Editing tools here write LF; verify with `file` and fix with
  `unix2dos`.
- Never push. Never touch `main`.

## What the business has not supplied

These block specific sections. Build the page, omit the section, and leave a clearly marked
TODO — do not invent the data.

| Missing | Blocks |
|---|---|
| FSSAI / GST / IEC / APEDA numbers | the credentials block on `/quality` |
| Per-product ingredients, nutrition, allergens | the PDP spec tables |
| Per-product manufacturer name + country of origin | PDP (legally required) |
| Real HS codes (only shared placeholder `21069099` exists) | export spec tables |
| Whether private label is genuinely offered | `/private-label` — do not build it until answered |
| Which markets have real business | `/markets/*` — do not build them until answered |
| Genuine reviews | review sections — omit entirely |

---

### Task 1: Design tokens

**Files:** Modify `artifacts/narayani/src/index.css`

Replace the current teal/amber palette with the brief's direction: deep charcoal/navy, warm
ivory, white, natural earthy tones, and **one** distinctive Indian-inspired accent. Keep the
interface restrained — product packaging supplies the colour.

Set the light-mode CSS variables only. Do not touch the dark block in this task.

Typography: two families maximum. Keep the existing display/body pairing if it still fits the
premium direction, or replace both — but no more than two, and both must already be loaded
from Google Fonts in `index.html` or added there.

Verify: `build:frontend` exits 0 and the existing pages still render (no missing-variable
errors in the built CSS).

---

### Task 2: Audience split component

**Files:** Create `artifacts/narayani/src/components/home/audience-split.tsx`

The brief's point 9, the single most important structural element: immediately below the
hero, two equal cards letting a visitor self-select.

- "Shop for yourself" — Discover our range of Indian snacks and packaged foods. → `/shop`
- "Buy for your business" — Wholesale, distribution and international sourcing. → `/business`

Equal visual weight. Neither is the default. Works on mobile as a stack.

---

### Task 3: Homepage hero and category grid

**Files:** Modify `artifacts/narayani/src/pages/home.tsx`

Hero headline: "Indian Food Products. Made for Every Table. Ready for Every Market."
Supporting: "Discover thoughtfully selected Indian food products for everyday consumers,
retailers, distributors and international buyers."
Primary CTA "Shop products" → `/shop`. Secondary "Business & export" → `/business`.

Mount the audience split from Task 2 directly under the hero.

Category grid (point 10) driven by the real categories in the database — `healthy_chips`,
`makhana`, `superpuffs`. Do not hardcode a category the catalogue does not have.

Use the existing product photography. Do not invent lifestyle imagery.

---

### Task 4: Navigation and footer

**Files:** Modify `site-header.tsx`, `site-footer.tsx`

Header (point 34): Home, Shop, Business, Export, About, Resources, Contact. Right side:
search, account, cart. One primary B2B CTA: "Request a quote". Do not overcrowd; mobile must
stay clean.

Footer (point 40): four columns — Shop, Business, Company, Support — plus the business
identity line "Merchant Exporter | Distributor | Indian Food Products". Keep the existing
"Also available on" marketplace row. **Omit the registration-numbers block entirely** until
the numbers are supplied.

---

### Task 5: `/business` page

**Files:** Create `pages/business.tsx`, add route

Point 14. Headline: "Products for Consumers. Solutions for Businesses."

Explain that Narayani supplies a curated portfolio sourced from selected manufacturers and
brands, serving wholesale buyers, retailers, distributors, importers, international buyers,
online retailers and food-service businesses. CTA: "Start a business enquiry" →
`/request-a-quote`.

---

### Task 6: `/export` page

**Files:** Create `pages/export.tsx`, add route

Point 15. Headline: "Source Indian Food Products with Narayani Distributors."

Cover: product sourcing, supplier coordination, product selection, packaging, MOQ, product
specifications, documentation, commercial quotations, shipment coordination, buyer support.

**Claim no capability that has not been confirmed.** Describe the process, not volumes,
certifications or countries served.

---

### Task 7: `/wholesale` page

**Files:** Create `pages/wholesale.tsx`, add route

Point 16. Headline: "Wholesale Food Products for Growing Businesses."

For retailers, resellers, grocery stores, online sellers, distributors, institutional buyers.
Show real MOQ and the ₹5,000 B2B minimum from the pricing module — those are real. CTA:
"Request wholesale pricing".

---

### Task 8: `/request-a-quote` form

**Files:** Create `pages/request-a-quote.tsx`, add route

Point 19. Fields: company name, contact person, country, email, phone/WhatsApp, products of
interest, quantity, wholesale-or-export, destination country, destination port, packaging
requirement, private-label requirement, message.

Validate with zod through the existing `react-hook-form` + shadcn `Form` setup, matching how
`checkout.tsx` does it.

**There is no RFQ endpoint yet.** Build the form fully, validate it, and on submit show a
clear success state while logging the payload. Do not silently discard it and do not fake a
network call. Leave a marked TODO for the endpoint — that is sub-plan 4's job.

File upload is specified but needs storage that does not exist. Omit the field; note it.

---

### Task 9: Product page business layer

**Files:** Modify `pages/product-detail.tsx`

Point 18. Below the consumer buy-box, one clearly separated block: "Buying for business?"
showing the real MOQ, carton quantity, shelf life and weight from the product record, with a
CTA to `/request-a-quote` carrying the product name.

Show `b2bPrice` **only** to a signed-in approved B2B user. Do not expose trade pricing to
anonymous visitors on the page.

Do not add ingredients, nutrition, allergens, HS code or manufacturer — that data does not
exist yet and inventing it is forbidden.

---

### Task 10: SEO for the new pages

**Files:** Modify the pages from Tasks 5-8, `lib/seo.ts`

Each new page gets a unique title, meta description, canonical and Open Graph via the
existing `useSeo` hook. Follow the pattern already in `shop.tsx`.

Titles target the brief's B2B keywords (point 26) honestly — "Indian Food Products Supplier",
"Merchant Exporter" — without claiming market leadership or scale.

Add the new routes to the sitemap generator in `api/index.ts`.
