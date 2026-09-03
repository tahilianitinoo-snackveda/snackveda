# 0001 — Retire the SnackVeda brand entirely

**Date:** 2026-09-03 · **Status:** Done, deployed

## Context

The business trades under the GST registration "Narayani Distributors". The site and product
copy used "SnackVeda" as a consumer brand with Narayani as the parent company.

## Decision

SnackVeda is retired, not kept as a storefront name. Brand and legal entity are now one name.

## Why

A trading name that differs from the GST-registered entity is a tax-document problem: the
invoice must carry the registered name, so a separate consumer brand meant every invoice
showed two names. The order-number prefix moved `SV-` → `ND-` for the same reason.

## Consequences

- 221 occurrences replaced across 94 files; `artifacts/snackveda` → `artifacts/narayani`.
- Orders placed before the change keep `SV-` numbers. The series is mixed by design, and the
  generator counts rows by prefix so `ND-` restarted at `0001`.
- Two deliberate exceptions remain and must not be "cleaned up": the legacy
  `snackveda_token` / `snackveda-cart` strings in
  `artifacts/narayani/src/lib/storage-migration.ts` exist so browser storage carries over
  instead of signing every user out and emptying every cart; and the historical prompt dump
  in `attached_assets/`.
- `scripts/sql/rebrand_narayani.sql` updates database rows and **has not been run** — the
  admin account, blog copy and product descriptions may still say SnackVeda. Its first
  statement changes the admin login to `admin@narayanidistributors.com`.
