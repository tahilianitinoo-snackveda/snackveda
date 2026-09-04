import { SiteShell } from "@/components/layout/site-shell";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/lib/seo";
import {
  ArrowRight,
  Boxes,
  Check,
  FileText,
  Package,
  Receipt,
  Search,
  Ship,
  Store,
  Truck,
  Users,
} from "lucide-react";

/**
 * /export — the depth page behind /business for international buyers.
 *
 * THE RULE FOR THIS PAGE: describe the process, never assert an outcome. Export
 * marketing copy is where invented credibility creeps in, so nothing here states a
 * certification, a registration number, a country or region served, a volume, a
 * capacity, a lead time, a container figure, a client name, a buyer count, a
 * years-in-business claim, or an HS code. The business has supplied none of those.
 * Saying "we prepare commercial quotations" is honest; saying "we ship to 20
 * countries" would not be. If you find yourself typing a number, find its source
 * in this repository first.
 *
 * The only hard facts on this page are the MOQ mechanics and the per-product
 * specification fields, both of which are in code:
 *   - MOQ per SKU, in multiples ......... api/_lib/pricing.ts (meetsMoq / moqViolations)
 *   - MOQ shown per product ............. components/product/product-card.tsx
 *   - weight, carton qty, shelf life
 *     recorded per product .............. api/_lib/schema.ts (productsTable)
 *
 * TODO(blocked): a credentials block (FSSAI / IEC / APEDA / GST) and any markets-served
 * section are blocked on the business supplying real numbers and real markets. Render
 * nothing rather than a plausible-looking invention. Only one shared placeholder HS
 * code (21069099) exists in the database, so HS codes are not presented as per-product
 * data anywhere on this page.
 * See docs/superpowers/plans/2026-09-04-subplan-1-visible-site.md.
 */

/**
 * What we actually do for a buyer, described as process. The ten items come from the
 * rebuild spec; each description says what happens, not how well or how fast.
 */
const SERVICES = [
  {
    icon: Search,
    title: "Product sourcing",
    desc: "We look for products against the requirement you describe, from Indian manufacturers and brands.",
  },
  {
    icon: Users,
    title: "Supplier coordination",
    desc: "We deal with the manufacturer or the brand on your behalf, so you hold one relationship instead of several.",
  },
  {
    icon: Boxes,
    title: "Product selection",
    desc: "We shortlist from what is available and put the options in front of you with their specifications.",
  },
  {
    icon: Package,
    title: "Packaging",
    desc: "Packaging is the manufacturer's. We tell you which pack formats a product is available in and take your packaging requirements to the supplier.",
  },
  {
    icon: Store,
    title: "Minimum order quantities",
    desc: "A minimum applies, agreed with you per enquiry rather than published per product — an importer taking a mixed container and a retailer taking one category are not held to the same figure.",
  },
  {
    icon: FileText,
    title: "Product specifications",
    desc: "Pack weight, case quantity, shelf life and minimum order quantity are held against each product, and we set them out for the items in your enquiry.",
  },
  {
    icon: Receipt,
    title: "Documentation",
    desc: "An export order carries paperwork. We prepare and coordinate the documentation the order requires alongside the supplier.",
  },
  {
    icon: Check,
    title: "Commercial quotations",
    desc: "We prepare a written commercial quotation for the products, quantities and terms you specify.",
  },
  {
    icon: Truck,
    title: "Shipment coordination",
    desc: "We coordinate the dispatch and tell you where the consignment has reached.",
  },
  {
    icon: Ship,
    title: "Buyer support",
    desc: "The same point of contact through the enquiry, the quotation, the order and afterwards.",
  },
];

/**
 * What a buyer should send us. This section makes no claim about Narayani at all —
 * it is entirely about the enquiry, which is why it can be this specific.
 */
const ENQUIRY_INPUTS = [
  "The products or categories you are interested in",
  "Quantities, and how often you expect to reorder",
  "The destination market",
  "Pack sizes and any packaging requirements",
  "Labelling or language requirements that apply where you sell",
  "The timeline you are working to",
];

const CATEGORIES = [
  { id: "healthy_chips", label: "Healthy Chips" },
  { id: "makhana", label: "Makhana" },
  { id: "superpuffs", label: "Superpuffs" },
];

export default function Export() {
  /*
    "Merchant exporter" is the term to rank for and it happens to be the accurate
    one — see docs/decisions/0002-never-imply-manufacturing.md. The description
    names only activities this page already describes (sourcing, quotations,
    documentation) and no market, volume, certification or HS code, because the
    business has supplied none of those.
  */
  useSeo({
    title: "Merchant Exporter of Indian Packaged Foods",
    description:
      "Export enquiries for Indian snacks and packaged foods — a merchant exporter in Indore sourcing from selected Indian manufacturers, with commercial quotations.",
    canonical: "/export",
  });

  return (
    <SiteShell>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-secondary/50 via-background to-background">
        <div className="container mx-auto max-w-4xl px-4 py-16 text-center lg:py-24">
          <div className="flex items-center justify-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Export &amp; International Sourcing
            </p>
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
          </div>

          <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Source Indian Food Products with Narayani Distributors.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            We are a merchant exporter based in Indore, India. We source Indian packaged foods
            from selected manufacturers and brands, and coordinate the supply for buyers abroad.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" className="rounded-full px-8" asChild>
              <Link href="/request-a-quote">Start an export enquiry</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
              <Link href="/shop">See the range</Link>
            </Button>
          </div>
        </div>
      </section>

      {/*
        Three roles, stated plainly. An international buyer selects partly on whether
        they are dealing with the producer or with an intermediary, so this is the
        first thing the page says rather than something to be worked out later.
        See docs/decisions/0002-never-imply-manufacturing.md.
      */}
      <section className="border-b border-border bg-secondary/70 py-16 lg:py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">Where we sit</h2>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground">
            <p>
              Narayani Distributors is a merchant exporter, not a manufacturer. Every product has
              a manufacturer and a brand owner behind it. We are the party that selects it, sources
              it and supplies it to you.
            </p>
            <p>
              That distinction matters when you are choosing a supplier, so we state it at the top
              of the page instead of leaving you to find out later.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { title: "The manufacturer", desc: "Makes the product, and is answerable for how it is made." },
              { title: "The brand", desc: "Owns the product, its specification and how it is presented on the pack." },
              { title: "Narayani Distributors", desc: "Selects it, sources it, and supplies and coordinates it for you." },
            ].map((role) => (
              <div key={role.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h3 className="font-serif text-lg font-bold">{role.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we do — the ten process items */}
      <section className="container mx-auto px-4 py-16 lg:py-20">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">How we work with buyers</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            What we actually do between your first enquiry and the goods leaving India.
          </p>
        </div>

        {/*
          Ten items, so two columns rather than three — three leaves a single card
          stranded on the last row. Icon beside the text, not above it, because these
          descriptions are a sentence long.
        */}
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2">
          {SERVICES.map((service) => (
            <div
              key={service.title}
              className="flex gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <service.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold">{service.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {service.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* What we need from you */}
      <section className="border-y border-border bg-muted/30 py-16 lg:py-20">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="font-serif text-3xl font-bold md:text-4xl">
                What we need to quote
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                The more of this you can give us at the start, the more specific the first
                quotation can be. If you do not have all of it yet, send what you have.
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Certification, documentation and market-access requirements differ by product and
                by destination, so we work through them against a specific enquiry rather than
                publishing a general list.
              </p>
              <Button className="mt-8 rounded-full px-8" size="lg" asChild>
                <Link href="/request-a-quote">Start an export enquiry</Link>
              </Button>
            </div>

            <ul className="space-y-3">
              {ENQUIRY_INPUTS.map((input) => (
                <li
                  key={input}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  />
                  <span className="text-sm leading-relaxed">{input}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* The range */}
      <section className="container mx-auto px-4 py-16 lg:py-20">
        <div className="mb-10 text-center">
          <h2 className="font-serif text-3xl font-bold md:text-4xl">What we carry today</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Three categories of Indian packaged snacks. If you are sourcing something adjacent,
            describe it in your enquiry and we will tell you whether we can supply it.
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

      {/* Closing CTA */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto flex flex-col items-center justify-between gap-8 px-4 md:flex-row">
          <div className="max-w-2xl text-center md:text-left">
            <h2 className="font-serif text-3xl font-bold">Sourcing from India?</h2>
            <p className="mt-4 text-lg text-primary-foreground/90">
              Send us the products, the quantities and the destination. We will come back with a
              commercial quotation.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" className="rounded-full px-8" asChild>
              <Link href="/request-a-quote">Start an export enquiry</Link>
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
