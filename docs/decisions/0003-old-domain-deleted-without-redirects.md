# 0003 — snackveda.co.in deleted outright, no redirects

**Date:** 2026-09-03 · **Status:** Done, irreversible

## Context

The site moved from `snackveda.co.in` to `narayanidistributors.com`. The old domain had been
indexed, with blog posts ranking under `snackveda.co.in/blog/<slug>` and a Google Search
Console property configured.

## Decision

The old domain was removed from the Vercel project entirely, along with both its aliases. No
301 redirects were configured.

## Why

The user's explicit instruction, given after being told twice that every indexed URL would
404 with no forwarding, and after being offered the redirect alternative.

## Consequences

- **All accumulated search authority on the old domain is gone.** SEO work on
  `narayanidistributors.com` starts from zero. Any plan section that talks about "preserving
  rankings" or "migrating authority" is not applicable — do not write it.
- Existing inbound links, shared blog links, and printed material pointing at
  `snackveda.co.in` are dead.
- Because indexed URLs were already sacrificed, the product URL change
  `/shop/:slug` → `/products/:slug` (spec point 27) costs comparatively little. Taking both
  hits at once is reasonable.
- Reversing this would mean re-registering the domain in Vercel and re-pointing GoDaddy DNS,
  and would not recover lost rankings.
