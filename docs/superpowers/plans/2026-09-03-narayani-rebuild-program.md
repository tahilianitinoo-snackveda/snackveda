# Narayani Distributors Rebuild — Program Plan

> **This is a program plan, not an executable plan.** It decides architecture, ordering,
> and the context-durability system. The executable per-subsystem plans live beside it and
> are written just-in-time. Do not try to implement from this file.

**Goal:** Rebuild narayanidistributors.com as one brand serving three audiences — Indian
consumers (B2C checkout), Indian trade buyers (wholesale enquiry), and international buyers
(merchant-export RFQ) — per the 52-point master spec dated 2026-09-03.

**Architecture:** Keep the existing React + Vite + Postgres stack and the live deployment
pipeline. Replace information architecture, design system, and content hierarchy. Extend the
product schema for multi-brand and export fields. Add the B2B/export surface as new routes
rather than a second site.

**Tech Stack:** React 19 + Vite + Tailwind v4 + shadcn/ui + wouter + TanStack Query +
Zustand · Drizzle + Postgres (Supabase) · Vercel serverless API · Resend + Fast2SMS

---

## Scope Check — this spec must be split

The writing-plans skill requires a scope check before task decomposition. This spec covers
**eight independent subsystems**. Writing one plan for all of them would produce a document
too large to execute reliably, which is the exact failure mode this program is trying to
avoid.

Decomposition, in dependency order:

| # | Sub-plan | Spec points | Ships on its own? |
|---|---|---|---|
| 0 | Foundations: tests, backend consolidation, contract truth | — (prerequisite) | Yes — no visible change, but everything else depends on it |
| 1 | Design system + brand identity | 5, 6, 7, 35, 45, 46 | Yes — Storybook-style page proving components |
| 2 | Product data model: multi-brand, export fields, CMS | 42, 43, 44 | Yes — admin can enter the new fields |
| 3 | Product experience: cards, PDP dual-layer, search | 10, 11, 12, 18, 41 | Yes — B2C catalogue works end to end |
| 4 | B2B/export surface: business, wholesale, export, private label, RFQ | 13–17, 19, 20, 25, 38 | Yes — RFQ submits and notifies |
| 5 | Homepage + audience split + about/why/quality | 8, 9, 21, 22, 23, 24 | Yes — new front door |
| 6 | SEO architecture: schema, URLs, sitemap, market pages | 26–31 | Yes — measurable in Search Console |
| 7 | Analytics + funnel instrumentation | 32, 33 | Yes — events land in GA4 |
| 8 | Legal, compliance, security | 48, 49 | Yes |

**Each sub-plan gets its own file** in this directory, written immediately before it is
executed — not now. Writing all eight up front would mean plans 4–8 are authored against
assumptions that plans 0–3 will have invalidated.

---

## Answering the real question: why context is lost, and what fixes it

The spec is long, but the binding constraint is that no single LLM session can hold this
work. Context is lost at three seams: **within** a session (window fills), **between**
sessions (conversation is gone), and **between** a task and its reviewer.

### This repository currently guarantees context rot

These are measured facts about the codebase as of 2026-09-03, not predictions:

1. **Zero tests.** `git ls-files` matches no test file. This is the single largest cause.
   Without a suite, a session cannot prove it did not break earlier work — so it must re-read
   source to infer behaviour, which consumes the very context it is trying to preserve. Tests
   are the only artifact that carries intent across a context boundary at near-zero token cost.

2. **The live API is one 1017-line file with `@ts-nocheck` on line 1.** `api/index.ts` cannot
   be held in context alongside anything else, and type checking is switched off, so a wrong
   edit is silent until production.

3. **Three divergent backend implementations.** `api/index.ts` (Vercel, live),
   `netlify/functions/api.ts` (747 lines), and `artifacts/api-server/` (session-based,
   orphaned, cannot serve the current Bearer-token frontend). Every schema change is a
   triple edit and drift is invisible. Sub-plan 2 touches the product schema; doing that
   three times is how contradictions get introduced.

4. **The OpenAPI contract lies.** Proven, not suspected: `pnpm run typecheck` fails with two
   errors in `pdf.ts` because the generated types lack `seller.gstNumber` and `order.user`,
   which the live API does return. `/invoices/{orderId}` exists in the spec and in no
   backend. `/auth/logout` exists on Netlify and not on Vercel. A fresh session that reads
   `lib/api-spec/openapi.yaml` to orient itself is actively misled.

5. **No `CLAUDE.md`.** The only orientation document is `replit.md`, which still describes
   `artifacts/api-server` as the backend — it is not.

### The durability system

Five artifacts, each with one job. All live in the repo, so they survive every session.

**1. `CLAUDE.md` — orientation, stable.**
What the project is, which backend is real, how to build, how to deploy, what not to touch.
Read automatically at session start. Must be short enough to always be read: target under
100 lines. It answers "where am I" so no session spends context rediscovering it.

**2. `docs/superpowers/plans/*.md` — the work, with progress in-file.**
One file per sub-plan, checkbox (`- [ ]`) steps. A resuming session greps for the first
unchecked box and continues. Progress lives in the file, never in conversation.

**3. `docs/decisions/NNNN-<slug>.md` — resolved questions, append-only.**
One file per decision, with the reasoning. This is what stops re-litigation: without it,
every session re-argues whether to keep the old domain, whether reviews may be fabricated,
whether Narayani may be called a manufacturer. Each entry is 10–20 lines: context, decision,
consequences. Seeded below.

**4. Tests — the executable specification.**
The only artifact that transfers intent across sessions without being read. Sub-plan 0
establishes the harness; every later task is TDD. A session that can run `pnpm test` and see
green does not need to understand code it is not changing.

**5. `data/products/*.json` — the facts I must not invent.**
Ingredients, nutrition, allergens, HS codes, MOQ, manufacturer names, certification numbers.
One reviewed source of truth, filled in by the business, consumed by seed scripts and the
CMS. See "Blocking data dependencies" below.

### Task-level rules that keep a task self-contained

- **Every task declares `Consumes` and `Produces`** with exact signatures. A task
  implementer is given only their own task; this block is how they learn neighbouring
  names and types without reading neighbouring code.
- **No task spans more than ~5 files.** If it does, it is two tasks.
- **Every task ends at a commit** with a passing suite. A commit is the checkpoint a fresh
  session resumes from.
- **New code goes in focused files.** The `api/index.ts` monolith is the anti-pattern; do
  not grow it.
- **Fresh subagent per task**, reviewed between tasks. The reviewer reads the task and the
  diff, not the session history — which is only possible because of the two rules above.

---

## Architecture decision: how to rebuild a live store

The site takes real orders today. The spec says rebuild information architecture, not
restyle — so this is not a CSS change.

**Rejected: greenfield rebuild, then cut over.** Two codebases drift, the cutover is a
single high-risk event, and the existing catalogue, order history, invoices and admin have
to be reimplemented before anything ships.

**Rejected: rebuild in place on `main`.** Every intermediate state is live. A half-migrated
IA is worse than either endpoint.

**Chosen: additive route-by-route replacement on `main`, behind the existing deploy.**
- New surfaces (`/export`, `/wholesale`, `/request-a-quote`, `/quality`) are new routes.
  They cannot break checkout because nothing links to them until they are done.
- Replaced surfaces (homepage, PDP, shop) are built as new components alongside the old,
  swapped at the route in one small commit once their tests pass.
- The design system lands first, so replaced surfaces are built in the new language from
  the start rather than restyled twice.
- Checkout is touched last and least. It is the revenue path.

This gives a working site after every task, which is also what makes each task
independently reviewable.

---

## Blocking data dependencies — facts the business must supply

The spec is explicit: point 23 forbids fake verification badges, point 37 forbids fabricated
reviews, point 36 forbids inventing nutritional values, and the business clarification
forbids implying manufacturing. **These sections cannot be built from the spec alone.**
Building them with placeholder data would put false claims on a live commercial site.

| Needed | Blocks | Status |
|---|---|---|
| FSSAI, GST, IEC numbers; APEDA/RCMC if held | Sub-plan 5 (`/quality`), footer | **Not supplied** |
| Per-product ingredients, nutrition, allergens | Sub-plan 3 (PDP) | **Not supplied** |
| Per-product manufacturer name + country of origin | Sub-plans 2, 3 (legally required, point 11) | **Not supplied** |
| Per-product HS code, MOQ, carton spec, shelf life | Sub-plan 4 (export/wholesale) | Partial — MOQ and shelf life in DB, HS code is one shared placeholder `21069099` |
| Whether private label is genuinely available | Sub-plan 4 (`/private-label` exists only if yes) | **Unanswered** |
| Which markets have real business | Sub-plan 6 (`/markets/*`) | **Unanswered** |
| Product photography: back pack, ingredients panel, nutrition panel | Sub-plan 3 (point 36 wants 7 shots/product) | 4 shots/product supplied |
| Genuine reviews | Sub-plan 3 | **None** — section omitted per point 37 |

Sub-plans 3, 4 and 5 will be authored to read these from `data/products/*.json` and to fail
the build if a required field is missing, rather than rendering an empty or invented value.

---

## Phase order

```
0. Foundations ──────────────► tests + one backend + honest contract
        │
        ├──► 1. Design system ──────────► 5. Homepage & company pages
        │            │
        │            └──► 3. Product experience (B2C)
        │                        │
        └──► 2. Data model ──────┴──► 4. B2B / export surface
                                              │
                                   6. SEO ────┤
                                   7. Analytics ──► 8. Legal & security
```

Sub-plan 0 is not optional and not deferrable. Every argument for skipping it ("let's get
visible progress first") trades one week now for context rot across all eight sub-plans.

---

## Open decisions to resolve before sub-plan 0

Each becomes a file in `docs/decisions/`.

1. **Which backend survives?** Recommend consolidating on `api/index.ts` (it is live and
   most complete), split into modules, `@ts-nocheck` removed, and deleting the other two.
   Alternative: revive `artifacts/api-server` for a real Express app — cleaner long-term,
   but it is session-based and the frontend is token-based, so it is a bigger change.
2. **Regenerate the OpenAPI spec from the real API, or hand-fix it?** Regenerating is
   honest; hand-fixing is faster and stays wrong in unknown ways.
3. **Product URL change `/shop/:slug` → `/products/:slug`** (point 27). Needs 301s. The old
   domain was already deleted without redirects, so indexed URLs are already lost — this may
   be a good moment to take the second hit at once.
4. **Does `/private-label` ship at all?** Point 17 says only if genuinely facilitatable.
5. **Test stack.** Recommend Vitest + Testing Library (Vite-native, no new toolchain) plus
   Playwright for the four point-51 user journeys.

## Notes on spec points that need correcting

- **Point 48, "HTTPS — need to check cost": zero.** Vercel issues and renews Let's Encrypt
  certificates automatically. Both `narayanidistributors.com` and `www` already have valid
  certificates as of 2026-09-03. No action, no cost.
- **Point 26 SEO / point 29 market pages** conflict with the domain history: the previous
  domain was removed outright, so there is no accumulated authority to preserve and no
  redirects in place. Ranking work starts from zero on this domain.
