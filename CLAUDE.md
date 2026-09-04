# Narayani Distributors — orientation

Read this first. It answers "where am I" so you do not spend context rediscovering it.

**What this is:** an e-commerce site for Narayani Distributors, a merchant exporter and
distributor of Indian packaged foods. Live at https://narayanidistributors.com. It takes real
orders — treat `main` as production.

**Narayani does not manufacture anything.** See `docs/decisions/0002-never-imply-manufacturing.md`
before writing any copy. This is the easiest mistake to make here.

## Where the code is

| Path | What |
|---|---|
| `artifacts/narayani/` | The frontend. React 19 + Vite + Tailwind v4 + shadcn/ui + wouter + TanStack Query + Zustand. |
| `api/index.ts` | **The live backend.** Vercel serverless, JWT bearer auth. Routing and handlers; the logic lives in `api/_lib/`. Type-checked. |
| `api/_lib/` | `pricing`, `schema`, `auth`, `notify`, `orderNumbers`, `content`. Unit-tested, no database. Change pricing, auth or slugging here, not in the entrypoint — the entrypoint is not reachable by any test. |
| `lib/db/src/schema/` | Drizzle schema for the tooling. The API has its own copy in `api/_lib/schema.ts`, which includes `product_images`. |
| `lib/api-spec/openapi.yaml` | The contract. Generated clients come from it — regenerate rather than hand-editing `**/generated/`. |

## Build and deploy

```bash
pnpm install
pnpm run build:frontend     # what Vercel runs
pnpm run typecheck          # passes clean — any error is yours
pnpm test                   # 47 unit tests over api/_lib, no database needed
```

`pnpm` is not on PATH — use `corepack pnpm`, or shim
`~/AppData/Local/node/corepack/v1/pnpm/<version>/bin/pnpm.cjs`.

Deploy is automatic: push to `main` → Vercel builds → live in ~35s. Vercel account is
`tahilianitinoo-snackveda`, project `snackveda`. **Not** the Softude work account.

## Things that will bite you

- **Tests cover `api/_lib/` only.** 47 unit tests over pricing, auth, order numbers and
  content, with no database. No route handler and no React component is exercised by anything,
  so a green suite says nothing about checkout, payments or admin actions — read those changes
  carefully. **A helper that needs a test has to move to `api/_lib/` first.** That is how the
  `slugify(null)` 500 survived for months: it lived in `api/index.ts`, where nothing could
  reach it.
- **`pnpm run typecheck` passes clean.** Any error you see is one you introduced.
- **`api/tsconfig.json` sets `"strict": false`,** and it costs you. With `strictNullChecks`
  off, zod infers every field as optional and typed `slug` as `string` where a caller could
  send `null` — which is precisely the bug above, invisible to the compiler. Assume any
  `.partial()` zod field can arrive as `null` regardless of what its type says.
- **Nothing on the storefront may show a value the business has not supplied.** Registrations,
  allergens, ingredients, MOQ, reviews: blank renders nothing, never a placeholder and never a
  sibling product's data. The single most damaging class of bug in this repository has been a
  plausible-looking invention — a fake GSTIN on real invoices, a can's nutrition panel on a
  pouch page. If a field is empty, render less.
- **Vercel env secrets are write-only.** `vercel env pull` returns `DATABASE_URL`,
  `JWT_SECRET`, `RESEND_API_KEY` as `""`. Put the real connection string in `.env.local`
  (gitignored) by hand, once, from the Supabase dashboard.
- **Rotating the database password means updating Vercel in the same sitting.** Vercel holds
  its own copy of `DATABASE_URL`; rotating without updating it authenticates production out of
  its own database and every route 500s. This has happened.
- **Transactional email is currently failing** — the sending domain is not verified in
  Resend. Failures are now logged loudly rather than swallowed.
- Money is `Intl.NumberFormat('en-IN', {style:'currency', currency:'INR'})`. Dates are
  DD MMM YYYY via `date-fns`. Server logs use `req.log` / `logger`, never `console.log`.

## Talking to the database

There is a CLI route. Both scripts read `DATABASE_URL` from `.env.local`, route the
IPv6-only direct host through the IPv4 pooler, split the connection string rather than
parsing it as a URL (the password contains `?`), and scrub the password from any error.

```bash
node scripts/query-db.mjs "select name, b2c_price from products order by name"
node scripts/run-sql.mjs scripts/sql/<file>.sql        # add --dry to test the connection only
```

`query-db.mjs` refuses anything that is not a single SELECT. Writes go through a reviewed
file in `scripts/sql/`, which is also what the Supabase SQL editor takes if you prefer it.

### State of `scripts/sql/`

All of these are idempotent — safe to re-run — except where noted.

| File | State |
|---|---|
| `product_images.sql` | **Applied** 04 Sep 2026. 68 images, created 3 SKUs. |
| `pricing_sheet_2026-09-04.sql` | **Applied** 04 Sep 2026. Prices from the supplied sheet; added the 150 g Superpuffs can line. |
| `quote_enquiries.sql` | **Applied.** The table behind `POST /rfq`. |
| `site_settings.sql` | **Applied.** Business identity, seeded EMPTY on purpose. |
| `product_reviews.sql` | **Applied.** Moderated customer reviews. |
| `product_fields.sql` | **Applied.** Spec 42 columns + `brand` (spec 43). |
| `catalogue_leads.sql` | **Applied.** Who downloaded the catalogue. |
| `legal_pages.sql` | **Applied.** The policies, transcribed verbatim from the old JSX. |
| `analytics_settings.sql` | **Applied.** GA4 / Pixel / LinkedIn / GSC keys, empty. |
| `pricing_rules_settings.sql` | **Applied.** Discount tiers and thresholds, seeded with the values already live. |
| `fix_quinoa_weight.sql` | **Superseded** — the pricing migration set every chip to 150 g / 6 months. |
| `rebrand_narayani.sql` | **Not applied.** Changes the admin login. |

## What the business controls without a developer

Admin → Settings holds business identity, registrations, discount tiers, shipping thresholds,
the wholesale minimum and every analytics measurement ID. Admin → Policies holds the legal
documents. Admin → Products holds the full spec-42 field set including brand and manufacturer.

Two consequences to keep in mind:

- **`api/_lib/pricing.ts` is the authority on money.** The storefront reads the same rules via
  `GET /settings` (`hooks/use-pricing-rules.ts`). Do not re-hardcode a discount percentage in a
  component — three copies of "15/10/5" is what this replaced, and the copy that decides what a
  customer is *charged* is the server's.
- **A blank setting means "render nothing".** See the rule in "Things that will bite you".

## Working on the rebuild

`docs/superpowers/plans/2026-09-03-narayani-rebuild-program.md` is the program plan.
`docs/decisions/` holds resolved decisions — read them rather than re-arguing them, and add
one when you resolve something new.
