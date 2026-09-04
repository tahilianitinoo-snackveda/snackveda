import { SiteShell } from "@/components/layout/site-shell";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/lib/seo";
import {
  ArrowRight,
  Boxes,
  Building2,
  CreditCard,
  IndianRupee,
  Package,
  Receipt,
  Ship,
  ShoppingCart,
  Store,
  Truck,
  Users,
} from "lucide-react";

/**
 * /business — the hub for the half of the business the storefront does not serve.
 * /wholesale and /export are its depth; this page's job is to say what Narayani is
 * and route a business visitor to the right one.
 *
 * EVERY factual statement on this page is traceable to code in this repository:
 *   - ₹5,000 wholesale minimum order value ....... api/_lib/pricing.ts (minimumOrderValue)
 *   - MOQ per SKU, ordered in multiples .......... api/_lib/pricing.ts (moqViolations)
 *   - wholesale prices gated on an approved
 *     business account ........................... components/product/product-card.tsx
 *   - GST per line + invoice number issued ....... api/_lib/pricing.ts, api/_lib/schema.ts
 *   - UPI / bank transfer / payment link ......... api/index.ts (B2bOrderBody.paymentMethod)
 *   - three catalogue categories ................. the product_category enum
 * There are no certifications, registration numbers, countries served, volumes, lead
 * times, client names or years-in-business here, because the business has supplied
 * none of them. Do not add one without a source. See
 * docs/superpowers/plans/2026-09-04-subplan-1-visible-site.md.
 *
 * TODO(blocked): a credentials strip (FSSAI / GST / IEC) belongs on this page, but
 * only once the business supplies the real numbers. Render nothing until then.
 */

/** Intended audiences, from the rebuild spec — not a claim about existing customers. */
const AUDIENCES = [
  { icon: Boxes, title: "Wholesale buyers", desc: "Buying by the case rather than by the pack." },
  { icon: Store, title: "Retailers", desc: "Independent shops, grocery stores and modern retail." },
  { icon: Truck, title: "Distributors", desc: "Building or extending a route in a territory." },
  { icon: Ship, title: "Importers", desc: "Bringing Indian packaged foods into another market." },
  { icon: Building2, title: "International buyers", desc: "Sourcing from India with one point of contact." },
  { icon: ShoppingCart, title: "Online retailers", desc: "Marketplace and D2C sellers listing packaged snacks." },
  { icon: Users, title: "Food-service businesses", desc: "Cafés, canteens and hospitality buying in bulk." },
];

/** The three categories the catalogue actually has. Do not add a fourth. */
const CATEGORIES = [
  { id: "healthy_chips", label: "Healthy Chips" },
  { id: "makhana", label: "Makhana" },
  { id: "superpuffs", label: "Superpuffs" },
];

const STEPS = [
  {
    title: "Tell us what you need",
    desc: "The products or categories you are interested in, the quantities, and where they are going.",
  },
  {
    title: "We prepare a quotation",
    desc: "A written commercial quotation covering the products and quantities you asked about.",
  },
  {
    title: "Open a business account",
    desc: "Wholesale prices appear across the catalogue once you are signed in to an approved business account.",
  },
  {
    title: "Place the order",
    desc: "Online at wholesale prices, or against the quotation, and pay by UPI, bank transfer or payment link.",
  },
];

/** Order mechanics. Each of these four is enforced in code, not aspirational. */
const TERMS = [
  {
    icon: IndianRupee,
    title: "₹5,000 minimum order value",
    desc: "A wholesale order has to reach ₹5,000 before GST. The cart holds checkout until it does.",
  },
  {
    icon: Package,
    title: "Minimum order quantity per product",
    desc: "Every product carries its own MOQ, and wholesale quantities go up in multiples of it.",
  },
  {
    icon: Receipt,
    title: "GST on every line",
    desc: "GST is applied at each product's own rate, and an invoice number is issued against the order.",
  },
  {
    icon: CreditCard,
    title: "UPI, bank transfer or payment link",
    desc: "The three ways a wholesale order can be paid for.",
  },
];

export default function Business() {
  /*
    SEO. The rebuild brief asks these pages to rank for buyer intent, and the
    temptation in that sentence is to reach for "leading" or "trusted" or a number.
    Every word here is a description of what the business is, not a claim about how
    well it does it — a search snippet is published copy and inherits the same rule
    as the page it summarises. See the global constraints in
    docs/superpowers/plans/2026-09-04-subplan-1-visible-site.md.
  */
  useSeo({
    title: "Business & Export — Indian Food Products Supplier",
    description:
      "Merchant exporter and distributor of Indian packaged foods — wholesale supply within India and export enquiries for retailers, distributors and overseas buyers.",
    canonical: "/business",
  });

  return (
    <SiteShell>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-secondary/50 via-background to-background">
        <div className="container mx-auto max-w-4xl px-4 py-16 text-center lg:py-24">
          <div className="flex items-center justify-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Merchant Exporter &middot; Distributor &middot; Sourcing Partner
            </p>
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
          </div>

          <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Products for Consumers. Solutions for Businesses.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Narayani Distributors supplies a curated portfolio of Indian packaged foods, sourced
            from selected Indian manufacturers and brands. The same range a household buys one
            pack at a time is available to shops, distributors and international buyers by the
            case.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" className="rounded-full px-8" asChild>
              <Link href="/request-a-quote">Start a business enquiry</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
              <Link href="/shop">Browse the range</Link>
            </Button>
          </div>
        </div>
      </section>

      {/*
        The positioning block. Stating what Narayani is not is the whole point — an
        international buyer chooses partly on whether they are dealing with the producer
        or an intermediary, so we say it first rather than let it be discovered.
        See docs/decisions/0002-never-imply-manufacturing.md.
      */}
      <section className="border-b border-border bg-secondary/70 py-16 lg:py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">
            What we do &mdash; and what we do not
          </h2>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground">
            <p>
              Narayani Distributors is a merchant exporter and distributor of Indian packaged
              foods. We source from selected Indian manufacturers and brands, supply their
              products, and coordinate wholesale and export orders around them.
            </p>
            <p>
              We do not manufacture. Every product we supply is made by the manufacturer behind
              it and carries that brand. Our work is selection, supply and coordination &mdash;
              and being one accountable point of contact for the buyer.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              {
                title: "We select",
                desc: "A focused range rather than a catalogue of everything, drawn from manufacturers and brands we choose to work with.",
              },
              {
                title: "We supply",
                desc: "Wholesale quantities for retailers and distributors, and consignments coordinated for buyers abroad.",
              },
              {
                title: "We coordinate",
                desc: "One point of contact across the manufacturer or brand, the paperwork and the dispatch.",
              },
            ].map((role) => (
              <div key={role.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="font-serif text-xl font-bold">{role.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who this is for */}
      <section className="container mx-auto px-4 py-16 lg:py-20">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">Who this is for</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Different buyers, one supplier. Tell us which of these you are and the conversation
            starts in the right place.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((audience) => (
            <div
              key={audience.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <audience.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="font-semibold">{audience.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{audience.desc}</p>
            </div>
          ))}

          <Link
            href="/request-a-quote"
            className="group flex flex-col justify-between rounded-2xl border border-primary/30 bg-primary/5 p-6 outline-none transition-colors hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <div>
              <h3 className="font-semibold text-primary">Something else?</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Tell us what you are sourcing and we will tell you whether we can supply it.
              </p>
            </div>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Start an enquiry
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </span>
          </Link>
        </div>
      </section>

      {/* Two routes into the business side. Equal weight — neither is the default. */}
      <section className="border-y border-border bg-muted/30 py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">Two ways to work with us</h2>
          </div>

          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2 lg:gap-6">
            {[
              {
                icon: Store,
                eyebrow: "Within India",
                title: "Wholesale supply",
                desc: "Order by the case for your shop, your route or your platform, at wholesale prices, with a minimum order quantity per product and a ₹5,000 minimum order value.",
                cta: "See wholesale",
                href: "/wholesale",
              },
              {
                icon: Ship,
                eyebrow: "International",
                title: "Export & sourcing",
                desc: "Source Indian packaged foods with one partner handling product selection, supplier coordination, quotations, documentation and dispatch.",
                cta: "See export",
                href: "/export",
              },
            ].map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="group flex h-full flex-col rounded-2xl border border-border bg-card p-8 shadow-sm outline-none transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:p-10"
              >
                <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <route.icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {route.eyebrow}
                </span>
                <h3 className="mt-2 font-serif text-2xl font-bold leading-tight lg:text-3xl">
                  {route.title}
                </h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{route.desc}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-semibold text-primary">
                  {route.cta}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* The range */}
      <section className="container mx-auto px-4 py-16 lg:py-20">
        <div className="mb-10 text-center">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">The range</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Three categories, sourced from selected Indian manufacturers and brands. The same
            catalogue serves retail and wholesale &mdash; the price and the minimum quantity
            change, the product does not.
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

      {/* How an enquiry becomes an order */}
      <section className="border-y border-border bg-secondary/70 py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="font-serif text-3xl font-bold md:text-4xl">
              How a business enquiry works
            </h2>
          </div>

          <ol className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-serif text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Order terms — the four facts a business buyer needs before enquiring. */}
      <section className="container mx-auto px-4 py-16 lg:py-20">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">Wholesale order terms</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            These apply to every wholesale order and are checked when the order is placed.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TERMS.map((term) => (
            <div key={term.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <term.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <h3 className="font-semibold">{term.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{term.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto flex flex-col items-center justify-between gap-8 px-4 md:flex-row">
          <div className="max-w-2xl text-center md:text-left">
            <h2 className="font-serif text-3xl font-bold">Tell us what you are sourcing</h2>
            <p className="mt-4 text-lg text-primary-foreground/90">
              Products, quantities and where they are going. We will come back with a commercial
              quotation.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" className="rounded-full px-8" asChild>
              <Link href="/request-a-quote">Start a business enquiry</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-primary-foreground/40 bg-transparent px-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              asChild
            >
              <Link href="/contact">Talk to us</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
