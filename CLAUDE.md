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
| `api/index.ts` | **The live backend.** One file, Vercel serverless, JWT bearer auth. Has `@ts-nocheck` — the type checker is off here. |
| `lib/db/src/schema/` | Drizzle schema. Note `product_images` is missing here and defined only inline in `api/index.ts`. |
| `lib/api-spec/openapi.yaml` | The contract. **It has drifted from reality — do not trust it.** |

## Build and deploy

```bash
pnpm install
pnpm run build:frontend     # what Vercel runs
pnpm run typecheck          # fails with 2 known pre-existing errors in pdf.ts
```

`pnpm` is not on PATH — use `corepack pnpm`, or shim
`~/AppData/Local/node/corepack/v1/pnpm/<version>/bin/pnpm.cjs`.

Deploy is automatic: push to `main` → Vercel builds → live in ~35s. Vercel account is
`tahilianitinoo-snackveda`, project `snackveda`. **Not** the Softude work account.

## Things that will bite you

- **No tests exist.** You cannot prove you did not break something. Adding them is sub-plan 0.
- **`pnpm run typecheck` already fails** with 2 errors in `artifacts/narayani/src/lib/pdf.ts`
  — the generated types lack `seller.gstNumber` and `order.user`, which the live API does
  return. That is the contract drift. Two errors is the clean baseline; more means you broke
  something.
- **Vercel env secrets are write-only.** `vercel env pull` returns `DATABASE_URL`,
  `JWT_SECRET`, `RESEND_API_KEY` as `""`. There is no CLI route to the database — schema and
  data changes go through the Supabase SQL editor as files in `scripts/sql/`.
- **Transactional email is currently failing** — the sending domain is not verified in
  Resend. Failures are now logged loudly rather than swallowed.
- Money is `Intl.NumberFormat('en-IN', {style:'currency', currency:'INR'})`. Dates are
  DD MMM YYYY via `date-fns`. Server logs use `req.log` / `logger`, never `console.log`.

## Unrun SQL in `scripts/sql/`

These are written but **not applied**. Check before assuming database state:
`rebrand_narayani.sql` (changes the admin login), `product_images.sql` (68 images, creates
3 SKUs), `fix_quinoa_weight.sql`.

## Working on the rebuild

`docs/superpowers/plans/2026-09-03-narayani-rebuild-program.md` is the program plan.
`docs/decisions/` holds resolved decisions — read them rather than re-arguing them, and add
one when you resolve something new.
