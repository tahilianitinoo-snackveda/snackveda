import { SiteShell } from "@/components/layout/site-shell";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Boxes,
  Check,
  CreditCard,
  IndianRupee,
  Package,
  Receipt,
  ShoppingCart,
  Store,
  Truck,
  Users,
} from "lucide-react";

/**
 * /wholesale — the depth page behind /business for buyers ordering within India.
 *
 * This page is unusually specific because the mechanics it describes are enforced in
 * code, and every one of them can be checked:
 *   - ₹5,000 minimum order value, on the pre-GST subtotal
 *       api/_lib/pricing.ts — `meetsMinimumOrder: subtotal >= 5000`
 *       api/index.ts — POST /orders/b2b rejects with BELOW_MIN_ORDER
 *   - the cart blocks checkout when the minimum is not met
 *       components/cart/cart-summary.tsx
 *   - MOQ per SKU, quantities in multiples of it
 *       api/_lib/pricing.ts — `qty >= product.moq && qty % product.moq === 0`
 *       api/index.ts — POST /orders/b2b rejects with MOQ_VIOLATION
 *   - the MOQ is displayed on each product card
 *       components/product/product-card.tsx
 *   - wholesale prices are a separate per-product column, not a discount
 *       api/_lib/pricing.ts uses product.b2bPrice; the percentage discounts in that
 *       file apply to b2c_customer only
 *   - wholesale prices are visible to an approved business account
 *       components/product/product-card.tsx — role === "b2b_customer" && b2bStatus === "approved"
 *   - GST at each product's own rate, invoice number issued against the order
 *       api/_lib/pricing.ts, api/_lib/schema.ts (invoicesTable)
 *   - UPI, bank transfer or payment link
 *       api/index.ts — B2bOrderBody.paymentMethod
 *   - the business types the account form offers
 *       pages/register.tsx — the businessType enum
 *
 * Nothing else is asserted. No delivery times, no coverage claims, no margin claims,
 * no certifications, no customer counts. If you add a number here, cite it in this
 * comment. See docs/superpowers/plans/2026-09-04-subplan-1-visible-site.md.
 */

/** Intended audiences, from the rebuild spec — not a claim about existing customers. */
const BUYERS = [
  { icon: Store, title: "Retailers", desc: "Shops selling packaged snacks off the shelf." },
  { icon: Boxes, title: "Resellers", desc: "Buying to sell on through your own channel." },
  { icon: ShoppingCart, title: "Grocery stores", desc: "Neighbourhood kirana and modern grocery." },
  { icon: Package, title: "Online sellers", desc: "Marketplace and D2C listings." },
  { icon: Truck, title: "Distributors", desc: "Supplying a territory or a route." },
  { icon: Users, title: "Institutional buyers", desc: "Offices, canteens and bulk requirements." },
];

/** Every entry here is enforced somewhere in the codebase — see the header comment. */
const MECHANICS = [
  {
    icon: IndianRupee,
    title: "Wholesale prices are set per product",
    desc: "Each product carries its own wholesale price. It is not a blanket percentage off the retail price.",
  },
  {
    icon: Check,
    title: "Prices show once you are signed in",
    desc: "Wholesale prices appear across the catalogue when you are signed in to an approved business account.",
  },
  {
    icon: Receipt,
    title: "₹5,000 minimum order value",
    desc: "A wholesale order has to reach ₹5,000 before GST. The cart tells you when it is short and holds checkout until it is not.",
  },
  {
    icon: Package,
    title: "A minimum order quantity per product",
    desc: "Every product has an MOQ and wholesale quantities go up in multiples of it. The MOQ is shown on each product.",
  },
  {
    icon: Boxes,
    title: "GST and invoicing",
    desc: "GST is applied at each product's own rate on every line, and an invoice number is issued against the order.",
  },
  {
    icon: CreditCard,
    title: "Payment",
    desc: "UPI, bank transfer or payment link.",
  },
];

/**
 * The six options the registration form's Business Type select actually offers, with
 * the form's own labels, in the form's own order (pages/register.tsx). Not an
 * aspirational list — if you change the select, change this. (The zod schema also
 * accepts "retail", but the select does not offer it, so it is not listed here.)
 */
const BUSINESS_TYPES = [
  "Kirana / Local Store",
  "Supermarket / Retail Chain",
  "Pharmacy / Health Store",
  "Gym / Fitness Center",
  "Cafe / Restaurant",
  "Corporate Office",
];

const CATEGORIES = [
  { id: "healthy_chips", label: "Healthy Chips" },
  { id: "makhana", label: "Makhana" },
  { id: "superpuffs", label: "Superpuffs" },
];

export default function Wholesale() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-secondary/50 via-background to-background">
        <div className="container mx-auto max-w-4xl px-4 py-16 text-center lg:py-24">
          <div className="flex items-center justify-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Wholesale Supply
            </p>
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
          </div>

          <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Wholesale Food Products for Growing Businesses.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Order Indian packaged foods by the case at wholesale prices &mdash; a focused range
            sourced from selected Indian manufacturers and brands, a minimum order quantity per
            product, and a ₹5,000 minimum order value.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" className="rounded-full px-8" asChild>
              <Link href="/request-a-quote">Request wholesale pricing</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
              <Link href="/register?type=b2b">Open a wholesale account</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Who buys wholesale */}
      <section className="container mx-auto px-4 py-16 lg:py-20">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">Who this is for</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            If you are buying to sell on, or buying in quantity for your own use, this is the
            right side of the site.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BUYERS.map((buyer) => (
            <div key={buyer.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <buyer.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="font-semibold">{buyer.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{buyer.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How wholesale ordering works — the enforced mechanics */}
      <section className="border-y border-border bg-secondary/70 py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              How wholesale ordering works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              These are the rules the site applies to a wholesale order, not guidance. An order
              that does not meet them will not go through.
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MECHANICS.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The range */}
      <section className="container mx-auto px-4 py-16 lg:py-20">
        <div className="mb-10 text-center">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">What you can order</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Three categories, sourced from selected Indian manufacturers and brands. Wholesale
            prices and the MOQ show against each product once you are signed in.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          {CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.id}`}
              className="group flex items-center justify-between rounded-2xl border border-border bg-card p-5 shadow-sm outline-none transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <span className="font-serif text-lg font-bold">{category.label}</span>
              <ArrowRight
                className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      </section>

      {/* Opening an account */}
      <section className="border-y border-border bg-muted/30 py-16 lg:py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-serif text-3xl font-bold md:text-4xl">
                Opening a wholesale account
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Registering a wholesale account asks for your name, email and phone, your business
                name, the type of business you run, and your GST number if you have one.
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Wholesale prices and minimum order quantities appear across the catalogue as soon
                as your business account is approved and you are signed in, and you can order
                online from there. If you would rather have a quotation first, ask for one
                instead.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="rounded-full px-8" asChild>
                  <Link href="/register?type=b2b">Open a wholesale account</Link>
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
                  <Link href="/request-a-quote">Request wholesale pricing</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm lg:p-8">
              <h3 className="font-serif text-xl font-bold">Business types on the form</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The account form asks you to pick one of these.
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {BUSINESS_TYPES.map((type) => (
                  <li
                    key={type}
                    className="rounded-full border border-border bg-secondary px-3.5 py-1.5 text-sm font-medium text-secondary-foreground"
                  >
                    {type}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                Buying for export rather than for resale in India?{" "}
                <Link href="/export" className="font-medium text-primary hover:underline">
                  See the export page
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto flex flex-col items-center justify-between gap-8 px-4 md:flex-row">
          <div className="max-w-2xl text-center md:text-left">
            <h2 className="font-serif text-3xl font-bold">Ask for a wholesale price list</h2>
            <p className="mt-4 text-lg text-primary-foreground/90">
              Tell us what you stock and roughly what you order, and we will come back with
              wholesale pricing for it.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" className="rounded-full px-8" asChild>
              <Link href="/request-a-quote">Request wholesale pricing</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-primary-foreground/40 bg-transparent px-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              asChild
            >
              <Link href="/business">Business overview</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
