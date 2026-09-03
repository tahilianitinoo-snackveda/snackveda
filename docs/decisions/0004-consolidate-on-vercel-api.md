# 0004 — Consolidate on the Vercel serverless API

**Date:** 2026-09-04 · **Status:** Done on this branch; merges to `main` with the sub-plan review

## Context

This repository carried three implementations of the same backend API:

- `api/index.ts` — a single Vercel serverless function, JWT bearer auth, deployed on every
  push to `main`. `vercel.json` is the only routing config in the repo that does anything in
  production: it rewrites `/api/*` to this file. `curl https://narayanidistributors.com/api/health`
  confirms it is the one actually answering requests.
- `netlify/functions/api.ts` — a second, ~750-line copy with its own inline Drizzle table
  definitions (duplicated from, and occasionally out of sync with, `lib/db/src/schema/`).
  Nothing in the repo or its deploy config routed a request to it; no Netlify site was wired
  to `netlify.toml`.
- `artifacts/api-server/` — a third copy: Express 5, `express-session` with
  `connect-pg-simple` for Postgres-backed cookie sessions, reading `req.session.userId`.

Three copies of the same business logic meant a bug fix had to be found and applied in the
right one, or risked being applied to a copy nobody serves.

## Decision

Delete `netlify/functions/api.ts`, `netlify.toml`, and `artifacts/api-server/` in full.
`api/index.ts` is the one surviving backend.

## Why

- **`api/index.ts` is the one that is live.** `vercel.json`'s `rewrites` send `/api/:path*` to
  it and nothing else; there is no other routing table in the repo that production honors.
- **The Netlify copy had drifted from the live one.** It alone implemented `POST
  /auth/logout` (the live API needs none — JWT bearer auth has no server-side session to
  end, and `/auth/logout` was already removed from the OpenAPI spec in Task 8 of this
  sub-plan). It never grew `POST /auth/forgot-password`, `POST /auth/reset-password`, or the
  admin shipping-notification route `POST /admin/orders/:id/ship`, all of which exist in
  `api/index.ts` today. (Its `product_images` table and CRUD routes were, on inspection,
  byte-identical to the live copy — that specific claim from the task brief did not hold up
  and is deliberately not repeated here.)
- **`artifacts/api-server` cannot authenticate the shipped frontend.** Its auth is
  cookie-session based (`artifacts/api-server/src/lib/session.ts`: `express-session` +
  `connect-pg-simple`, keyed on `req.session.userId`). The frontend
  (`lib/api-client-react/src/custom-fetch.ts`) sends `Authorization: Bearer <jwt>` via
  `setAuthTokenGetter`, wired up in `artifacts/narayani/src/main.tsx`. A session-cookie
  server has nothing to check against that header — it was orphaned from the day the
  frontend switched to bearer tokens, reachable or not.
- **Nothing else in the repo depended on either.** No workspace `package.json` listed
  `@workspace/api-server` as a dependency, and `pnpm-workspace.yaml`'s globs
  (`artifacts/*`, `lib/*`, `lib/integrations/*`, `scripts`) picking it up as a workspace
  member was the only structural link. The sole reference anywhere to `@workspace/api-server`
  outside its own directory was the root `dev:api` script, removed in this same change. The
  frontend never imported from either dead backend — only two stray comments (in
  `artifacts/narayani/src/main.tsx` and `lib/db/src/schema/blog.ts`) mentioned them by name,
  and comments don't keep code alive.

## Consequences

- `api/_lib/` (`pricing.ts`, `auth.ts`, `schema.ts`, `notify.ts`, `orderNumbers.ts`) is now the
  only home for this business logic, each piece with its own test coverage added in Tasks
  1–6 of this sub-plan. `artifacts/api-server/src/lib/pricing.ts` and `orderNumber.ts` — the
  copies that logic was originally extracted from — are gone with the rest of the directory.
- There is no configured Netlify deploy target any more (`netlify.toml` deleted). Standing
  one back up would mean writing new function code against the current bearer-token shape,
  not resurrecting this file — it predates that auth model.
- The Express-backed local dev path (`pnpm run dev:api` → `@workspace/api-server`) no longer
  exists. There is currently no scripted way to run the live API shape against a real
  database outside of Vercel itself; the repo does not set up `vercel dev`. This is a real
  gap in the local dev story, left open rather than papered over.
- `replit.md` and `CLAUDE.md` are updated to describe the single surviving backend instead of
  three.
