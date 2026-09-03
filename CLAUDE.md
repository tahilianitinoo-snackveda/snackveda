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
| `api/index.ts` | **The live backend.** Vercel serverless, JWT bearer auth. Routing and handlers; the logic lives in `api/lib/`. Type-checked. |
| `api/lib/` | `pricing`, `schema`, `auth`, `notify`, `orderNumbers`. Unit-tested, no database. Change pricing or auth here, not in the entrypoint. |
| `lib/db/src/schema/` | Drizzle schema for the tooling. The API has its own copy in `api/lib/schema.ts`, which includes `product_images`. |
| `lib/api-spec/openapi.yaml` | The contract. Generated clients come from it — regenerate rather than hand-editing `**/generated/`. |

## Build and deploy

```bash
pnpm install
pnpm run build:frontend     # what Vercel runs
pnpm run typecheck          # passes clean — any error is yours
pnpm test                   # 26 unit tests over api/lib, no database needed
```

`pnpm` is not on PATH — use `corepack pnpm`, or shim
`~/AppData/Local/node/corepack/v1/pnpm/<version>/bin/pnpm.cjs`.

Deploy is automatic: push to `main` → Vercel builds → live in ~35s. Vercel account is
`tahilianitinoo-snackveda`, project `snackveda`. **Not** the Softude work account.

## Things that will bite you

- **Tests cover `api/lib/` only.** 26 unit tests over pricing, auth and order numbers, with no
  database. No route handler and no React component is exercised by anything, so a green suite
  says nothing about checkout, payments or admin actions — read those changes carefully.
- **`pnpm run typecheck` passes clean.** Any error you see is one you introduced.
- **`PATCH /admin/blog/:id` with `"slug": null` still 500s** — it reaches `slugify(null)`
  ([api/index.ts:742](api/index.ts:742), [:94](api/index.ts:94)). Known, deliberately left: every
  fix turns a 500 into a 200 on an untested live route, so it needs its own task with a test.
- **`api/tsconfig.json` sets `"strict": false`,** and that is actively costing you — with
  `strictNullChecks` off, zod infers every field as optional, which forced two workarounds in
  `api/index.ts`. Turning it on surfaces exactly one error: the `slugify` bug above.
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
