# SnackVeda

A full-stack e-commerce platform for **Narayani Distributors** selling premium Indian snacks (16 SKUs across Healthy Chips, Makhana, and Superpuffs). Supports both B2C retail and B2B wholesale with a complete admin back-office.

## Stack

- **Monorepo:** pnpm workspace
- **Frontend (`artifacts/snackveda`):** React + Vite + Tailwind v4, shadcn/ui, wouter, TanStack Query, Zustand cart store, Framer Motion, Recharts, jsPDF for invoices
- **Backend (`artifacts/api-server`):** Express 5 + Drizzle ORM + PostgreSQL + express-session (Postgres-backed) + bcryptjs
- **Contracts:** OpenAPI 3.1 (`lib/api-spec/openapi.yaml`) → Orval-generated TanStack Query hooks (`lib/api-client-react`) and Zod schemas (`lib/api-zod`)
- **DB schema:** `lib/db/src/schema/*.ts`

## Brand & Design

- Primary teal `#0F766E`, accent amber `#F59E0B`, cream background `#FAFAF9`
- Playfair Display (display) + Plus Jakarta Sans (body), loaded from Google Fonts
- Premium D2C food brand vibe — warm, tactile, joyful, never minimal-template

## Features

### Customer (B2C)
- Catalog with category tabs (Healthy Chips / Makhana / Superpuffs)
- Cart with live quote (subtotal, loyalty discount, 5% GST, free shipping above ₹999)
- 3-tier loyalty discount: 15% first order / 10% second / 5% repeat
- Checkout with UPI payment placeholder + reference capture
- Account dashboard: orders, profile, addresses, downloadable PDF GST invoices

### Wholesale (B2B)
- Trade pricing (`b2bPrice`) shown only to approved B2B users
- MOQ enforcement per SKU + ₹3,000 minimum order
- Bank transfer / UPI / payment-link options
- B2B onboarding requires admin approval before trade pricing unlocks

### Admin (super_admin role)
- Dashboard with KPIs, recent orders, pending B2B applications, sales by category chart
- Products CRUD with stock + status management
- Customer management with B2C/B2B tabs and approve/reject flow
- Order management with status updates (pending → confirmed → dispatched → delivered)
- Payment management with "Mark as Received" + reference capture (auto-confirms order)

## Demo Credentials

- **Admin:** `admin@snackveda.com` / `Admin@123` (super_admin)
- 16 products seeded across all categories with realistic ₹ pricing, MOQ, carton sizes

## Order Numbering

- B2C: `SV-B2C-2025-0001`
- B2B: `SV-B2B-2025-0001`
- Invoices: `INV-2025-00001` (issued on payment confirmation)

## Routes

| Path | Artifact |
|---|---|
| `/` | snackveda (web) |
| `/api` | api-server |
| `/__mockup` | mockup-sandbox (dev only) |

## Local commands

- Regenerate API client/zod from OpenAPI: `pnpm --filter @workspace/api-spec run codegen`
- Push DB schema changes: `pnpm --filter @workspace/db run push`
- Reseed products + admin: `cd artifacts/api-server && pnpm exec tsx src/seed.ts`

## Conventions

- All money is rendered with `Intl.NumberFormat('en-IN', { style:'currency', currency:'INR' })`
- All dates in DD MMM YYYY via `date-fns`
- Server logs use `req.log` / `logger`, never `console.log`
- Cookies use `withCredentials: true` (set globally in `lib/api-client-react/src/custom-fetch.ts`)
- B2B feature flags depend on `user.role === 'b2b_customer' && user.b2bStatus === 'approved'`
