# Sub-plan 0: Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the repository a test suite, one backend instead of three, and an API contract
that matches reality — so the seven sub-plans that follow can be executed by sessions that
never see each other's context.

**Architecture:** Test the pure business logic inside `api/index.ts` *before* moving it, then
extract it into focused modules under `api/lib/` and confirm the same tests still pass. That
ordering is what makes breaking up a 1017-line `@ts-nocheck` file safe. Once `api/index.ts` is
only routing, delete the two dead backends and correct the OpenAPI spec against the surviving
one.

**Tech Stack:** Vitest (node environment) · TypeScript 5.9 · Drizzle ORM · Zod · pnpm workspace

## Global Constraints

- Narayani is a merchant exporter and distributor, never a manufacturer. See
  `docs/decisions/0002-never-imply-manufacturing.md`. Applies to comments and copy alike.
- `main` is production. Every task ends green and deployable; Vercel deploys on push.
- `pnpm` is not on PATH. Use `corepack pnpm`, or shim
  `~/AppData/Local/node/corepack/v1/pnpm/<version>/bin/pnpm.cjs` into PATH.
- Baseline `pnpm run typecheck` fails with exactly 2 pre-existing errors in
  `artifacts/narayani/src/lib/pdf.ts`. Task 8 removes them. Until then, 2 is clean and 3+
  means you broke something.
- Money is INR with 2 decimals. Never change a rounding rule without a test that pins it.
- Do not modify checkout request/response shapes in this sub-plan. The frontend is live.
- Vercel env secrets are write-only; there is no CLI route to the database. Every test in
  this sub-plan is a unit test with no database.
- **Execution branch is `subplan-0-foundations`, not `main`.** Never push to `main` during
  this sub-plan; the merge happens once after the whole-branch review.
- **Extraction tasks (1, 3, 5, 6) land as two commits:** first the code moved with behaviour
  unchanged, then any cleanup of typing or naming in the code you just moved. Tightening
  loose types as you move is expected and wanted. The two commits exist so that if a test
  fails, `git diff` between them says whether the move or the cleanup caused it — with one
  combined commit that information is gone.

---

## File Structure

**Created**

| Path | Responsibility |
|---|---|
| `vitest.config.ts` | Root test config, node environment, includes `api/**/*.test.ts` |
| `api/lib/pricing.ts` | `computeQuote` and its types. Pure — no DB, no env. |
| `api/lib/pricing.test.ts` | Pins every pricing rule: loyalty tiers, GST, shipping, MOQ, B2B minimum |
| `api/lib/orderNumbers.ts` | `formatOrderNumber`, `formatInvoiceNumber`. Pure formatting only. |
| `api/lib/orderNumbers.test.ts` | Pins prefix, year and zero-padding |
| `api/lib/schema.ts` | All Drizzle table definitions, moved verbatim out of `index.ts` |
| `api/lib/auth.ts` | `signToken`, `verifyToken`, `profileUser` |
| `api/lib/auth.test.ts` | Round-trip, expiry rejection, wrong-type rejection, `profileUser` redaction |
| `api/lib/notify.ts` | `sendEmail`, `sendSMS`, `emailBase` and the `notify*` builders |

**Modified**

| Path | Change |
|---|---|
| `api/index.ts` | Becomes routing only; imports from `api/lib/`; `@ts-nocheck` removed |
| `package.json` | Add `test` and `test:watch` scripts |
| `lib/api-spec/openapi.yaml` | Corrected against the live API |
| `artifacts/narayani/src/pages/account.tsx` | Invoice fetch pointed at the route that exists |
| `artifacts/narayani/src/components/layout/admin-shell.tsx` | Logout no longer depends on a 404 |

**Deleted**

`netlify/functions/api.ts`, `netlify.toml`, `artifacts/api-server/` — dead per
`docs/decisions/0004-consolidate-on-vercel-api.md` (written in Task 9).

**Explicitly out of scope**

- Frontend component tests. There are no new components yet; they arrive with sub-plan 1's
  design system, which adds the `jsdom` Vitest project.
- Playwright journeys from spec point 51. They need a seeded database; sub-plan 3.
- **The order-number race.** `generateOrderNumber` uses `count(*) + 1` against a `UNIQUE`
  column, so two concurrent checkouts make the second one 500. Task 6 extracts only the pure
  *formatting*. The concurrency fix needs a transaction plus integration-test infrastructure
  to prove, and it touches the revenue path — it gets its own plan rather than an untested fix
  smuggled into a foundations task.

---

### Task 1: Test harness, proven by the first real pricing test

**Files:**
- Create: `vitest.config.ts`, `api/lib/pricing.ts`, `api/lib/pricing.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export type QuoteProduct = {
    id: string; name: string; slug: string; category: string;
    b2cPrice: string | number; b2bPrice: string | number;
    gstPercent: string | number; moq: number;
  };
  export type QuoteUser = { role: string; ordersCount: number } | null | undefined;
  export type QuoteItem = { productId: string; quantity: number };
  export function computeQuote(
    items: QuoteItem[], products: QuoteProduct[],
    orderType: "b2c" | "b2b", user?: QuoteUser
  ): Quote;
  ```
  `Quote` has: `orderType`, `lines`, `subtotal`, `discountAmount`, `discountPercent`,
  `discountLabel`, `gstAmount`, `shippingCharge`, `total`, `meetsMinimumOrder`,
  `minimumOrderValue`, `moqViolations`.

- [ ] **Step 1: Add the test dependency**

```bash
corepack pnpm add -Dw vitest@^3
```

- [ ] **Step 2: Create the root test config**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["api/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add the scripts**

In `package.json`, inside `"scripts"`:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 4: Write the failing test**

`api/lib/pricing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { computeQuote, type QuoteProduct } from "./pricing";

const chips: QuoteProduct = {
  id: "p1", name: "Ragi Chips Peri Peri", slug: "ragi-chips-peri-peri",
  category: "healthy_chips", b2cPrice: "199.00", b2bPrice: "149.00",
  gstPercent: "5.00", moq: 5,
};

describe("computeQuote", () => {
  it("prices a single B2C line at the retail price plus GST", () => {
    const q = computeQuote([{ productId: "p1", quantity: 2 }], [chips], "b2c", null);
    expect(q.subtotal).toBe(398);
    expect(q.discountPercent).toBe(0);
    expect(q.gstAmount).toBe(19.9);
    expect(q.total).toBe(477.9); // 398 + 19.90 GST + 60 shipping, under the 999 threshold
  });
});
```

- [ ] **Step 5: Run it and confirm it fails for the right reason**

```bash
corepack pnpm test
```

Expected: FAIL — `Failed to resolve import "./pricing"`. A failure for any other reason means
the harness is wrong, not the code.

- [ ] **Step 6: Create the module by moving the function verbatim**

Create `api/lib/pricing.ts`. Move `computeQuote` out of `api/index.ts` and export it, with
the types from the Interfaces block above.

Land this as **two commits**:

1. **The move, arithmetic untouched.** Every numeric expression identical to the original —
   no reordering, no refactoring of the rounding. Run the test; it must pass.
2. **The cleanup.** Now replace `const lines: any[] = []` with a real `QuoteLine[]`, name
   anything unclear, and tighten signatures. Run the test again; it must still pass.

Keep them separate so a failure can be attributed. Do not change any arithmetic in either
commit — the tests pin those numbers deliberately.

- [ ] **Step 7: Run the test and confirm it passes**

```bash
corepack pnpm test
```

Expected: PASS, 1 test.

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts package.json pnpm-lock.yaml api/lib/pricing.ts api/lib/pricing.test.ts
git commit -m "test: add vitest harness and extract computeQuote with its first test"
```

---

### Task 2: Pin every pricing rule

The loyalty tiers, the GST-after-discount apportioning, the free-shipping threshold and the
B2B minimum are the rules most likely to be silently changed by a later session. Each gets a
test that fails loudly if the number moves.

**Files:**
- Modify: `api/lib/pricing.test.ts`

**Interfaces:**
- Consumes: `computeQuote`, `QuoteProduct` from Task 1.
- Produces: nothing new — coverage only.

- [ ] **Step 1: Add the loyalty tier tests**

Append to `api/lib/pricing.test.ts`, inside the `describe`:

```ts
  it.each([
    { ordersCount: 0, percent: 15, label: "First order — 15% off" },
    { ordersCount: 1, percent: 10, label: "Returning customer — 10% off" },
    { ordersCount: 2, percent: 5,  label: "Loyalty — 5% off" },
    { ordersCount: 99, percent: 5, label: "Loyalty — 5% off" },
  ])("gives a B2C customer with $ordersCount orders $percent% off", (c) => {
    const q = computeQuote([{ productId: "p1", quantity: 1 }], [chips], "b2c",
      { role: "b2c_customer", ordersCount: c.ordersCount });
    expect(q.discountPercent).toBe(c.percent);
    expect(q.discountLabel).toBe(c.label);
  });

  it("gives no loyalty discount to an anonymous visitor", () => {
    const q = computeQuote([{ productId: "p1", quantity: 1 }], [chips], "b2c", null);
    expect(q.discountPercent).toBe(0);
    expect(q.discountLabel).toBe("No discount");
  });
```

- [ ] **Step 2: Add the shipping threshold test**

```ts
  it("waives shipping once the discounted subtotal reaches 999", () => {
    const under = computeQuote([{ productId: "p1", quantity: 5 }], [chips], "b2c", null);
    expect(under.subtotal).toBe(995);
    expect(under.shippingCharge).toBe(60);

    const over = computeQuote([{ productId: "p1", quantity: 6 }], [chips], "b2c", null);
    expect(over.subtotal).toBe(1194);
    expect(over.shippingCharge).toBe(0);
  });

  it("applies the threshold to the discounted total, not the gross subtotal", () => {
    // 6 units = 1194 gross, but a first-order 15% discount drops it to 1014.90 — still free.
    const q = computeQuote([{ productId: "p1", quantity: 6 }], [chips], "b2c",
      { role: "b2c_customer", ordersCount: 0 });
    expect(q.discountAmount).toBe(179.1);
    expect(q.shippingCharge).toBe(0);
  });
```

- [ ] **Step 3: Add the B2B tests**

```ts
  it("prices B2B lines at trade price with no loyalty discount and no shipping", () => {
    const q = computeQuote([{ productId: "p1", quantity: 100 }], [chips], "b2b",
      { role: "b2b_customer", ordersCount: 0 });
    expect(q.lines[0].unitPrice).toBe(149);
    expect(q.discountPercent).toBe(0);
    expect(q.shippingCharge).toBe(0);
  });

  it("reports a MOQ violation when quantity is not a multiple of the MOQ", () => {
    const q = computeQuote([{ productId: "p1", quantity: 7 }], [chips], "b2b", null);
    expect(q.moqViolations).toHaveLength(1);
    expect(q.moqViolations[0]).toContain("multiples of 5");
  });

  it("accepts a quantity that is an exact multiple of the MOQ", () => {
    const q = computeQuote([{ productId: "p1", quantity: 10 }], [chips], "b2b", null);
    expect(q.moqViolations).toHaveLength(0);
  });

  it("flags a B2B order below the 5000 minimum", () => {
    const low = computeQuote([{ productId: "p1", quantity: 5 }], [chips], "b2b", null);
    expect(low.meetsMinimumOrder).toBe(false);
    expect(low.minimumOrderValue).toBe(5000);

    const ok = computeQuote([{ productId: "p1", quantity: 50 }], [chips], "b2b", null);
    expect(ok.meetsMinimumOrder).toBe(true);
  });
```

- [ ] **Step 4: Add the input-hardening tests**

```ts
  it("ignores items whose product is not in the catalogue", () => {
    const q = computeQuote([{ productId: "ghost", quantity: 3 }], [chips], "b2c", null);
    expect(q.lines).toHaveLength(0);
    expect(q.total).toBe(60); // shipping only
  });

  it("floors fractional quantities and treats anything below 1 as 1", () => {
    expect(computeQuote([{ productId: "p1", quantity: 2.9 }], [chips], "b2c", null)
      .lines[0].quantity).toBe(2);
    expect(computeQuote([{ productId: "p1", quantity: 0 }], [chips], "b2c", null)
      .lines[0].quantity).toBe(1);
    expect(computeQuote([{ productId: "p1", quantity: -5 }], [chips], "b2c", null)
      .lines[0].quantity).toBe(1);
  });
```

- [ ] **Step 5: Run the suite**

```bash
corepack pnpm test
```

Expected: PASS. If any assertion fails, **do not change the assertion to match the code** —
work out which is right first. These numbers were derived from the shipped implementation, so
a failure means the extraction in Task 1 was not verbatim.

- [ ] **Step 6: Commit**

```bash
git add api/lib/pricing.test.ts
git commit -m "test: pin loyalty tiers, GST, shipping threshold and B2B rules"
```

---

### Task 3: Extract the Drizzle schema

**Files:**
- Create: `api/lib/schema.ts`
- Modify: `api/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `usersTable`, `productsTable`, `productImagesTable`, `addressesTable`,
  `ordersTable`, `orderItemsTable`, `paymentsTable`, `invoicesTable`, `blogPostsTable` —
  all named exports, definitions unchanged.

- [ ] **Step 1: Move the table definitions**

Cut every `pgTable(...)` declaration from `api/index.ts` into `api/lib/schema.ts`, add the
`drizzle-orm/pg-core` imports it needs, and `export` each one. Change no column name, type or
default — the live database already matches these.

- [ ] **Step 2: Import them back**

At the top of `api/index.ts`:

```ts
import {
  usersTable, productsTable, productImagesTable, addressesTable,
  ordersTable, orderItemsTable, paymentsTable, invoicesTable, blogPostsTable,
} from "./lib/schema";
```

- [ ] **Step 3: Verify nothing else moved**

```bash
corepack pnpm test && corepack pnpm run build:frontend
```

Expected: tests PASS, build exits 0.

- [ ] **Step 4: Commit**

```bash
git add api/lib/schema.ts api/index.ts
git commit -m "refactor: move the Drizzle schema out of the api entrypoint"
```

---

### Task 4: Extract auth, with tests

**Files:**
- Create: `api/lib/auth.ts`, `api/lib/auth.test.ts`
- Modify: `api/index.ts`

**Interfaces:**
- Consumes: `usersTable` from Task 3.
- Produces:
  ```ts
  export function signToken(userId: string): string;
  export function verifyToken(token: string): { userId: string } | null;
  export function profileUser(user: Record<string, unknown>): Record<string, unknown>;
  ```
  `getUser(authHeader, db)` stays in `index.ts` for now — it queries the database, and this
  sub-plan adds no database tests.

- [ ] **Step 1: Write the failing test**

`api/lib/auth.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { profileUser, signToken, verifyToken } from "./auth";

beforeAll(() => { process.env.JWT_SECRET = "test-secret-not-a-real-one"; });

describe("token round-trip", () => {
  it("recovers the user id it signed", () => {
    expect(verifyToken(signToken("user-123"))?.userId).toBe("user-123");
  });

  it("rejects a token signed with a different secret", () => {
    const foreign = jwt.sign({ userId: "user-123" }, "some-other-secret");
    expect(verifyToken(foreign)).toBeNull();
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign({ userId: "user-123" }, process.env.JWT_SECRET!, { expiresIn: "-1s" });
    expect(verifyToken(expired)).toBeNull();
  });

  it("rejects a malformed token instead of throwing", () => {
    expect(verifyToken("not-a-jwt")).toBeNull();
  });
});

describe("profileUser", () => {
  it("never leaks the password hash", () => {
    const out = profileUser({
      id: "u1", email: "a@b.com", passwordHash: "$2a$10$SECRET", fullName: "A B",
      role: "b2c_customer", ordersCount: 0,
    });
    expect(out).not.toHaveProperty("passwordHash");
    expect(out.email).toBe("a@b.com");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
corepack pnpm test api/lib/auth.test.ts
```

Expected: FAIL — `Failed to resolve import "./auth"`.

- [ ] **Step 3: Create the module**

Move `signToken`, `verifyToken` and `profileUser` from `api/index.ts` into `api/lib/auth.ts`
and export them. `verifyToken` already returns `null` on failure via its `try/catch` — keep
that shape; the tests depend on it.

- [ ] **Step 4: Import them back and run everything**

```bash
corepack pnpm test
```

Expected: PASS, all files.

- [ ] **Step 5: Commit**

```bash
git add api/lib/auth.ts api/lib/auth.test.ts api/index.ts
git commit -m "refactor: extract auth helpers and pin token and redaction behaviour"
```

---

### Task 5: Extract notifications

**Files:**
- Create: `api/lib/notify.ts`
- Modify: `api/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `sendEmail(to, subject, html)`, `sendSMS(phone, message)`, `emailBase(content)`,
  `notifyRegistration(user, isB2B)`, `notifyOrderPlaced(order, user)`,
  `notifyShipping(order, user, courier, trackingNumber, trackingLink)`.

- [ ] **Step 1: Move the functions**

Move the notification block — from `RESEND_KEY`/`FAST2SMS_KEY` down to the last `notify*`
function — out of `api/index.ts` into `api/lib/notify.ts`. Keep the `res.ok` checks intact;
they are the only reason a failed send is visible at all.

- [ ] **Step 2: Confirm the copy still obeys the manufacturing rule**

```bash
grep -niE "our factory|we manufacture|our production|manufacturer & exporter|our plant" api/lib/notify.ts
```

Expected: no output. If anything matches, fix the copy — see
`docs/decisions/0002-never-imply-manufacturing.md`.

- [ ] **Step 3: Verify**

```bash
corepack pnpm test && corepack pnpm run build:frontend
```

Expected: tests PASS, build exits 0.

- [ ] **Step 4: Commit**

```bash
git add api/lib/notify.ts api/index.ts
git commit -m "refactor: move notification builders out of the api entrypoint"
```

---

### Task 6: Extract order-number formatting, with tests

**Files:**
- Create: `api/lib/orderNumbers.ts`, `api/lib/orderNumbers.test.ts`
- Modify: `api/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export function formatOrderNumber(type: "b2c" | "b2b", year: number, sequence: number): string;
  export function formatInvoiceNumber(year: number, sequence: number): string;
  ```
  The database counting stays in `index.ts`. Only formatting moves.

- [ ] **Step 1: Write the failing test**

`api/lib/orderNumbers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatInvoiceNumber, formatOrderNumber } from "./orderNumbers";

describe("formatOrderNumber", () => {
  it("uses the ND prefix and an uppercase order type", () => {
    expect(formatOrderNumber("b2c", 2026, 1)).toBe("ND-B2C-2026-0001");
    expect(formatOrderNumber("b2b", 2026, 1)).toBe("ND-B2B-2026-0001");
  });

  it("pads the sequence to four digits and does not truncate beyond them", () => {
    expect(formatOrderNumber("b2c", 2026, 42)).toBe("ND-B2C-2026-0042");
    expect(formatOrderNumber("b2c", 2026, 9999)).toBe("ND-B2C-2026-9999");
    expect(formatOrderNumber("b2c", 2026, 10000)).toBe("ND-B2C-2026-10000");
  });
});

describe("formatInvoiceNumber", () => {
  it("pads the sequence to five digits", () => {
    expect(formatInvoiceNumber(2026, 1)).toBe("INV-2026-00001");
    expect(formatInvoiceNumber(2026, 12345)).toBe("INV-2026-12345");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
corepack pnpm test api/lib/orderNumbers.test.ts
```

Expected: FAIL — unresolved import.

- [ ] **Step 3: Create the module**

`api/lib/orderNumbers.ts`:

```ts
// Formatting only. The sequence is supplied by the caller, which counts existing rows —
// a known race against the UNIQUE constraint on orders.order_number, fixed in its own plan.
export function formatOrderNumber(type: "b2c" | "b2b", year: number, sequence: number): string {
  return `ND-${type.toUpperCase()}-${year}-${String(sequence).padStart(4, "0")}`;
}

export function formatInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${String(sequence).padStart(5, "0")}`;
}
```

- [ ] **Step 4: Rewrite the callers in `api/index.ts`**

```ts
async function generateOrderNumber(type: "b2c" | "b2b") {
  const year = new Date().getFullYear();
  const prefix = `ND-${type.toUpperCase()}-${year}-`;
  const [row] = await getDb().select({ count: sql<number>`count(*)::int` })
    .from(ordersTable).where(like(ordersTable.orderNumber, `${prefix}%`));
  return formatOrderNumber(type, year, (row?.count ?? 0) + 1);
}

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const [row] = await getDb().select({ count: sql<number>`count(*)::int` }).from(invoicesTable);
  return formatInvoiceNumber(year, (row?.count ?? 0) + 1);
}
```

Note the redundant `and(...)` wrapper around the single `like(...)` is dropped.

- [ ] **Step 5: Run the suite**

```bash
corepack pnpm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add api/lib/orderNumbers.ts api/lib/orderNumbers.test.ts api/index.ts
git commit -m "refactor: extract order and invoice number formatting with tests"
```

---

### Task 7: Turn the type checker back on

**This is the task most likely to expand.** `api/index.ts` has had no type checking since it
was written, so the error count is unknown until Step 2. If it exceeds roughly 30, stop and
report rather than pushing through — that is a signal the file needs more extraction first,
not more `any`.

**Files:**
- Modify: `api/index.ts`, `api/tsconfig.json`, `package.json`

**Interfaces:**
- Consumes: every module from Tasks 1–6.
- Produces: `api` included in `pnpm run typecheck`.

- [ ] **Step 1: Delete the suppression**

Remove `// @ts-nocheck` from line 1 of `api/index.ts`.

- [ ] **Step 2: Count the damage**

```bash
corepack pnpm exec tsc -p api/tsconfig.json --noEmit 2>&1 | tee /tmp/api-errors.txt | tail -5
grep -c "error TS" /tmp/api-errors.txt
```

Record the number in your commit message.

- [ ] **Step 3: Fix them, narrowest change first**

In order of preference: add a real type; narrow with a type guard; annotate a parameter. Use
`any` only where the value genuinely is dynamic — a request body before Zod parsing, for
instance. Never silence an error with `@ts-ignore`; if you cannot type it, say so in the
report.

- [ ] **Step 4: Confirm zero errors in api**

```bash
corepack pnpm exec tsc -p api/tsconfig.json --noEmit
```

Expected: no output, exit 0.

- [ ] **Step 5: Wire api into the workspace typecheck**

In `package.json`, change the `typecheck` script so `api` is included:

```json
    "typecheck": "pnpm run typecheck:libs && tsc -p api/tsconfig.json --noEmit && pnpm -r --filter \"./artifacts/**\" --filter \"./scripts\" --if-present run typecheck",
```

- [ ] **Step 6: Verify the whole workspace**

```bash
corepack pnpm run typecheck
```

Expected: the 2 known `pdf.ts` errors and nothing else. Task 8 removes those.

- [ ] **Step 7: Commit**

```bash
git add api/index.ts api/tsconfig.json package.json
git commit -m "fix: type-check the live api and remove its ts-nocheck"
```

---

### Task 8: Make the contract honest, and fix the two features it broke

The OpenAPI spec describes endpoints that do not exist and omits ones that do. Two live
features are broken as a direct result.

**Files:**
- Modify: `lib/api-spec/openapi.yaml`, `artifacts/narayani/src/pages/account.tsx`,
  `artifacts/narayani/src/pages/account-order-detail.tsx`,
  `artifacts/narayani/src/components/layout/admin-shell.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: a spec that matches `api/index.ts`, and regenerated clients in
  `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/`.

- [ ] **Step 1: Diff spec against reality**

```bash
grep -nE "^  /" lib/api-spec/openapi.yaml
grep -nE 'path === "|path\.match' api/index.ts
```

Known divergences: spec says `/healthz`, API serves `/health`. Spec says
`/invoices/{orderId}`, API serves `/orders/{id}/invoice`. Spec says `/admin/customers/{id}`,
API serves `/admin/customers/{id}/status`. Spec declares `/auth/logout`, which no longer
exists anywhere. Spec omits `/auth/forgot-password`, `/auth/reset-password`, `/blog`,
`/blog/{slug}`, `/sitemap.xml`, `/admin/blog`, `/admin/products/{id}/images`,
`/admin/orders/{id}/ship`.

- [ ] **Step 2: Correct the paths the API actually serves**

Rename `/healthz` → `/health`, `/invoices/{orderId}` → `/orders/{id}/invoice`,
`/admin/customers/{id}` → `/admin/customers/{id}/status`. Delete `/auth/logout`.

- [ ] **Step 3: Fix the two response schemas that cause the pdf.ts errors**

Add `gstNumber: {type: string}` to `InvoiceSeller`, and a `user` property to `Order`
carrying `id`, `fullName`, `email` and `phone` — the live API returns both, which is why
`pdf.ts` fails to compile today.

- [ ] **Step 4: Regenerate the clients**

```bash
corepack pnpm --filter @workspace/api-spec run codegen
```

- [ ] **Step 5: Point the invoice download at the real route**

`getInvoiceForOrder` now resolves to `/api/orders/{id}/invoice`. Confirm both call sites
compile unchanged:

```bash
grep -n "getInvoiceForOrder" artifacts/narayani/src/pages/account.tsx artifacts/narayani/src/pages/account-order-detail.tsx
```

- [ ] **Step 6: Fix admin logout**

In `admin-shell.tsx`, `handleLogout` currently navigates only inside the mutation's
`onSuccess`, which never fires because the endpoint 404s. Replace with:

```tsx
  const handleLogout = () => {
    localStorage.removeItem("narayani_token");
    window.location.href = "/";
  };
```

Remove the now-unused `useLogoutUser` import. Do the same in `account.tsx` if it still
imports it.

- [ ] **Step 7: Verify typecheck is finally clean**

```bash
corepack pnpm run typecheck && corepack pnpm test && corepack pnpm run build:frontend
```

Expected: typecheck **0 errors** — the baseline of 2 is gone. Tests pass. Build exits 0.

- [ ] **Step 8: Commit**

```bash
git add lib/api-spec/openapi.yaml lib/api-client-react lib/api-zod artifacts/narayani/src
git commit -m "fix: align the OpenAPI contract with the live api and repair invoice and logout"
```

---

### Task 9: Delete the dead backends

**Files:**
- Delete: `netlify/functions/api.ts`, `netlify.toml`, `artifacts/api-server/`
- Create: `docs/decisions/0004-consolidate-on-vercel-api.md`
- Modify: `package.json` (drop `dev:api`), `replit.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: nothing.
- Produces: one backend.

- [ ] **Step 1: Prove nothing depends on them**

```bash
grep -rn "api-server" --include=*.json --include=*.toml --include=*.md . | grep -v node_modules
grep -rn "netlify" --include=*.json --include=*.ts . | grep -v node_modules
```

Only `package.json`'s `dev:api` script and documentation should appear.

- [ ] **Step 2: Delete**

```bash
git rm -r --quiet artifacts/api-server netlify netlify.toml
```

- [ ] **Step 3: Drop the dead script**

Remove the `"dev:api"` line from `package.json`.

- [ ] **Step 4: Record the decision**

Write `docs/decisions/0004-consolidate-on-vercel-api.md`: three divergent backends existed;
`api/index.ts` survives because it was the live one; the Netlify copy had drifted (it alone
had `/auth/logout`, and lacked forgot/reset-password and product images); `api-server` was
session-cookie based and could not serve the bearer-token frontend. Note that
`artifacts/api-server/src/lib/pricing.ts` and `orderNumber.ts` are gone, and `api/lib/` is
now the only home for that logic.

- [ ] **Step 5: Correct the stale docs**

`replit.md` describes `artifacts/api-server` as the backend and lists a Netlify route table.
Update both. In `CLAUDE.md`, replace the three-backend table rows with the single surviving
entry and delete the "Three backends is a known problem" line.

- [ ] **Step 6: Full verification**

```bash
corepack pnpm install && corepack pnpm run typecheck && corepack pnpm test && corepack pnpm run build:frontend
```

Expected: install clean, typecheck 0 errors, tests pass, build exits 0.

- [ ] **Step 7: Commit and push the branch**

```bash
git add -A
git commit -m "refactor: delete the netlify and express backends, leaving one api"
git push -u origin subplan-0-foundations
```

**Do not push to `main`.** Merging happens once, after the whole-branch review, via
`superpowers:finishing-a-development-branch`.

- [ ] **Step 8: Confirm production is still healthy**

Production is still serving `main`, so nothing in this branch has reached it yet. Record the
current live state as the baseline the merge will be checked against:

```bash
curl -s https://narayanidistributors.com/api/health
```

Expected: `{"status":"ok","db":true,"jwt":true,"productCount":15}`. Note it in your report;
the same call after the merge must return the same thing.

---

## Self-Review

**Spec coverage.** This sub-plan implements no user-facing spec point by design; it is the
prerequisite named in the program plan. It does close four defects found during the audit:
the invoice download 404 (Task 8), admin logout (Task 8), the untyped live API (Task 7), and
the triple-maintenance backend (Task 9). The order-number race is explicitly deferred with a
stated reason rather than left implicit.

**Placeholder scan.** No "TBD", no "add error handling", no "similar to Task N". Every code
step carries the code. Task 7 Step 3 gives a decision order rather than literal fixes because
the error list cannot be known until Step 2 runs — that is stated, with a stop condition
(~30 errors) so it cannot silently balloon.

**Type consistency.** `computeQuote` keeps the same name and argument order throughout.
`QuoteProduct` accepts `string | number` for the three numeric columns because Drizzle returns
`numeric` as `string` and the tests pass strings — matching production. `formatOrderNumber`
is used with the identical signature in Task 6 Steps 3 and 4. `verifyToken` returns
`{ userId } | null` in the Interfaces block, the test, and the description of the existing
implementation.

**One gap accepted.** No test covers `getUser`, `serializeOrder` or any route handler, since
all three need a database and this sub-plan adds no database test infrastructure. Sub-plan 3
introduces it. Until then, route behaviour is verified only by the build and by production.
