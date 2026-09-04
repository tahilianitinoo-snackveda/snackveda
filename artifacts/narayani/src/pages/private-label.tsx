import { SiteShell } from "@/components/layout/site-shell";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/lib/seo";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Factory,
  FileText,
  Package,
  Palette,
  Search,
  Ship,
} from "lucide-react";

/**
 * /private-label — spec point 17.
 *
 * ─── READ THIS BEFORE EDITING ───────────────────────────────────────────────
 * Spec point 17 says to build this page "ONLY if Narayani can genuinely facilitate
 * this through manufacturing partners", and to "clearly communicate that
 * manufacturing is performed by the relevant manufacturing partner where
 * applicable". Both instructions shape every line below.
 *
 * Narayani does not manufacture. A private-label programme therefore is not a
 * capability Narayani has in-house — it is a coordination role between a buyer and
 * a manufacturing partner who takes the actual order. This page describes exactly
 * that, in those words, and stops. It does not say a run "can" be produced, does not
 * quote a minimum, a lead time, a unit cost or a number of formats, does not claim
 * any private-label work has been done before, and does not name a manufacturer.
 *
 * WHAT WOULD MAKE THIS PAGE BETTER, AND WHAT IT NEEDS FIRST:
 *   - a real minimum run size ......... blocked: depends on the partner and product
 *   - a real lead time ................ blocked: same
 *   - packaging formats available ..... blocked: the business has not supplied them
 *   - past work / case studies ........ blocked: none supplied, and inventing one
 *                                       here would be fabricating a client
 * Do not fill any of these with a plausible figure. A private-label buyer who is
 * quoted "MOQ 5,000 units, 45 days" on a website and then told something different
 * on the call has been misled, and it is the one number they were shopping on.
 *
 * See docs/decisions/0002-never-imply-manufacturing.md.
 */

/** What Narayani actually does in a private-label enquiry. Coordination, all of it. */
const WHAT_WE_DO = [
  {
    icon: Search,
    title: "Product selection",
    desc: "Working out which product, or which of our existing range, is the right base for what you want to sell.",
  },
  {
    icon: Factory,
    title: "Manufacturer coordination",
    desc: "Taking the requirement to a manufacturing partner able to produce it, and putting the two of you on the same terms.",
  },
  {
    icon: Palette,
    title: "Branding and artwork",
    desc: "Coordinating your brand and label artwork with the manufacturer's own pack requirements and the declarations the law puts on them.",
  },
  {
    icon: Package,
    title: "Packaging",
    desc: "Agreeing the pack format and the carton configuration with the partner producing it.",
  },
  {
    icon: Boxes,
    title: "Bulk supply",
    desc: "Handling the order once terms are settled, the same way we handle any wholesale or export order.",
  },
  {
    icon: Ship,
    title: "Export requirements",
    desc: "Where the run is for a market outside India, coordinating the documentation the shipment needs.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Tell us what you want to sell",
    desc: "The product, the market it is for, the kind of quantity you have in mind, and whether the branding already exists.",
  },
  {
    n: "02",
    title: "We take it to a manufacturing partner",
    desc: "We find out who can make it, on what terms, and what the pack would have to carry.",
  },
  {
    n: "03",
    title: "You get a written quotation",
    desc: "Product, pack, quantity, price and timing — from us, on the manufacturer's terms.",
  },
  {
    n: "04",
    title: "The run is produced and supplied",
    desc: "The manufacturing partner produces it. We handle the order, the paperwork and the dispatch.",
  },
];

export default function PrivateLabel() {
  useSeo({
    title: "Private Label & Sourcing — Build Your Own Food Brand",
    description:
      "Launch your own brand of Indian snacks. Narayani Distributors coordinates product selection, manufacturing partners, branding and bulk supply — manufacturing is carried out by the partner.",
    canonical: "/private-label",
  });

  return (
    <SiteShell>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-secondary/50 via-background to-background">
        <div className="container mx-auto max-w-4xl px-4 py-16 text-center lg:py-24">
          <div className="flex items-center justify-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Private Label &amp; Sourcing
            </p>
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
          </div>

          <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
            Build your own food brand.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            If you want Indian snacks made and packed under your own brand, we can take that
            requirement to a manufacturing partner and coordinate it end to end — selection,
            branding, packaging and supply.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" className="rounded-full px-8" asChild>
              <Link href="/request-a-quote?type=wholesale">
                Start a private-label enquiry
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
              <Link href="/shop">See the existing range</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-16 lg:py-20">
        {/*
          This block is the point of the page, and it is deliberately near the top
          rather than buried in a footnote. Spec point 17 requires it, and a buyer
          who thinks they are commissioning us to manufacture has misunderstood the
          relationship in a way that will surface at the worst possible moment.
        */}
        <section className="rounded-3xl border border-border bg-card p-8 shadow-sm lg:p-10">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="font-serif text-2xl font-bold">How this actually works</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Narayani Distributors is a merchant exporter and distributor. We do not
                manufacture, and a private-label run for you would not be produced by us. It
                would be produced by a manufacturing partner, who carries the licence for it and
                is named on the pack as the maker.
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Our part is everything around that: finding the right partner for what you want,
                putting the terms together, coordinating the artwork and the pack, and handling
                the supply once it is agreed. That is a real service and it is what this page is
                offering — but it is coordination, not production, and you should know which one
                you are buying.
              </p>
            </div>
          </div>
        </section>

        {/* What we do */}
        <section className="mt-16">
          <h2 className="font-serif text-3xl font-bold">What we coordinate</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {WHAT_WE_DO.map((item) => (
              <div key={item.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
                >
                  <item.icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Process */}
        <section className="mt-16 rounded-3xl border border-border bg-secondary/40 p-8 lg:p-10">
          <h2 className="font-serif text-2xl font-bold">From enquiry to delivery</h2>
          <ol className="mt-8 space-y-7">
            {STEPS.map((step) => (
              <li key={step.n} className="flex gap-5">
                <span
                  aria-hidden="true"
                  className="font-mono text-sm font-semibold text-primary"
                >
                  {step.n}
                </span>
                <div className="border-l border-border pl-5">
                  <p className="font-semibold text-foreground">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/*
          Rather than invent a minimum and a lead time, say plainly that they come
          from the partner. A buyer shopping on those numbers gets a real answer in
          one enquiry instead of a wrong one on a web page.
        */}
        <section className="mt-16">
          <h2 className="font-serif text-2xl font-bold">What we cannot tell you here</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Minimum run size, lead time, unit cost and the pack formats available all come from
            the manufacturing partner, and they change with the product and the market. We are
            not going to print a figure on this page that turns out not to apply to you. Send us
            the requirement and you will get the real numbers against it.
          </p>
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              The enquiry form has a private-label question on it. Tick it, describe what you
              want to sell, and add anything you already have — a brand, artwork, a target
              price, a market.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 rounded-3xl border border-border bg-card p-8 text-center shadow-sm lg:p-12">
          <h2 className="font-serif text-3xl font-bold">Tell us what you want to sell.</h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">
            The more you can say about the product, the market and the quantity, the more useful
            the first reply will be.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" className="rounded-full px-8" asChild>
              <Link href="/request-a-quote?type=wholesale">
                Start a private-label enquiry
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
              <Link href="/contact">Talk to us first</Link>
            </Button>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
