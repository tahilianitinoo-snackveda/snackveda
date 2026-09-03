# 0002 — Narayani is a merchant exporter, never a manufacturer

**Date:** 2026-09-03 · **Status:** Binding on all copy, forever

## Context

Narayani Distributors sources food products from selected Indian manufacturers and brands. It
does not manufacture anything. The 52-point rebuild spec calls this out as a critical
business clarification.

## Decision

No copy, metadata, schema, alt text or generated content may state or imply that Narayani
manufactures products.

**Never use:** "our factory", "our manufacturing facility", "we manufacture", "our
production", "Manufacturer & Exporter", "our plant", "made by us".

**Use instead:** Merchant Exporter · Distributor · Export Trading Company · Food Products
Sourcing Partner · Indian Food Products Supplier · "we source from selected Indian
manufacturers and brands" · multi-brand food portfolio.

"Manufactured by X" is correct and often legally required, but only naming the actual
verified manufacturing partner.

## Why

It is a false commercial claim to international buyers, who select suppliers partly on
whether they are dealing with the producer or an intermediary. It also misrepresents the
business in a way that undermines trust precisely with the audience the export pages target.

## Consequences

- Product pages must distinguish three roles: brand owner, actual manufacturer, and
  "Distributed by Narayani Distributors". The schema needs a manufacturer field per product
  (see program plan, sub-plan 2) — it does not have one today.
- `/private-label` may only describe coordination with manufacturing partners, and only ships
  if that capability genuinely exists.
- This is the single easiest mistake for a language model to make while writing marketing
  copy, because "Manufacturer & Exporter" is the most common phrasing on comparable Indian
  export sites. Check every generated paragraph against this file.
