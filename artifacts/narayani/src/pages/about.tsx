import { SiteShell } from "@/components/layout/site-shell";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/lib/seo";
import {
  ArrowRight,
  Boxes,
  Building2,
  FileText,
  Globe,
  Layers,
  Search,
  Ship,
  ShoppingCart,
  Store,
  Truck,
} from "lucide-react";

/**
 * /about — who Narayani Distributors is.
 *
 * ─── WHAT THIS PAGE REPLACED, AND WHY ───────────────────────────────────────
 * The previous version opened "Narayani Distributors is a proudly Indore-born
 * healthy snacking brand, created for people who want snacks that are healthier".
 * That is the About page of a brand that makes food. Narayani does not make food.
 * It also promised, in Narayani's own voice, that every product is "100%
 * Vegetarian", "Baked, not deep-fried", "Free from artificial colors" and "Free
 * from unnecessary additives" — blanket claims across a catalogue sourced from
 * three different manufacturers, at least one of which prints a milk allergen and
 * another of which declares peanuts. Those are the manufacturer's claims to make on
 * the pack, not ours to make on their behalf.
 *
 * ─── THE RULE FOR ANYTHING ADDED HERE ───────────────────────────────────────
 * Narayani is a merchant exporter, distributor and sourcing company. Every sentence
 * on this page must survive the question "would this be true if we sold someone
 * else's biscuits tomorrow?" — because that is the business. Nothing about recipes,
 * kitchens, factories, production or "our ingredients". See
 * docs/decisions/0002-never-imply-manufacturing.md.
 *
 * No certifications, registration numbers, years in business, countries served,
 * volumes or client names appear here, because the business has supplied none of
 * them. A credentials block belongs on /quality once it does.
 */

/** Spec point 22 — Why Narayani. Each of these is a description of the model, not a claim. */
const WHY = [
  {
    icon: Layers,
    title: "A curated portfolio",
    desc: "A focused range of Indian packaged foods rather than a catalogue of everything, drawn from manufacturers and brands we choose to work with.",
  },
  {
    icon: Search,
    title: "Sourcing, not manufacturing",
    desc: "We select the products and coordinate the supply. The company named on the pack is the company that made it, and we print who that is.",
  },
  {
    icon: Building2,
    title: "One partner, several categories",
    desc: "One point of contact across the manufacturer or brand, the paperwork and the dispatch, instead of a separate relationship per product.",
  },
  {
    icon: ShoppingCart,
    title: "Consumer and business",
    desc: "The same range a household buys one pack of is the range a shop buys by the case and an importer buys by the pallet.",
  },
  {
    icon: Globe,
    title: "Built for export",
    desc: "Merchant export is a vertical of this business, not an afterthought — specifications, packaging and documentation are part of the quotation.",
  },
  {
    icon: FileText,
    title: "Product information in full",
    desc: "Ingredients, nutrition, allergens and the manufacturer's own details are reproduced from the pack, including where the pack contradicts itself.",
  },
];

/** Who the business is set up to serve. Intent, not a customer list. */
const AUDIENCES = [
  { icon: ShoppingCart, label: "Consumers" },
  { icon: Store, label: "Retailers" },
  { icon: Boxes, label: "Wholesale buyers" },
  { icon: Truck, label: "Distributors" },
  { icon: Ship, label: "Importers" },
  { icon: Building2, label: "Food-service buyers" },
];

export default function About() {
  useSeo({
    title: "About Narayani Distributors — Merchant Exporter & Distributor",
    description:
      "Narayani Distributors is a merchant exporter, distributor and sourcing company for Indian packaged foods, supplying consumers, retailers, distributors and international buyers.",
    canonical: "/about",
  });

  return (
    <SiteShell>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-secondary/50 via-background to-background">
        <div className="container mx-auto max-w-4xl px-4 py-16 text-center lg:py-24">
          <div className="flex items-center justify-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              About Us
            </p>
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
          </div>

          <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
            Connecting Indian food products with more people and more markets.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Narayani Distributors is a merchant exporter, distributor and sourcing company for
            Indian packaged foods. We work with selected Indian manufacturers and brands to make
            their products available to consumers, retailers, distributors and international
            buyers.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-16 lg:py-20">
        {/* What we actually do */}
        <section className="space-y-5">
          <h2 className="font-serif text-3xl font-bold">What we do</h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            We do not make food. We find it, we buy it, and we get it to the people who want it
            — a household ordering one pack, a shop ordering a case, an importer ordering a
            container.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            That means our work sits in three places: choosing which products are worth carrying,
            handling the commercial and documentary side of moving them, and presenting them
            honestly enough that a buyer can decide without ringing us first. The company that
            manufactured a product is named on its page, with its own licence number, exactly as
            it is printed on the pack.
          </p>
          <div className="grid gap-4 pt-2 sm:grid-cols-3">
            {[
              {
                title: "Sourcing",
                desc: "Selecting products and the manufacturers and brands behind them.",
              },
              {
                title: "Distribution",
                desc: "Supplying consumers, retailers, wholesale buyers and distributors in India.",
              },
              {
                title: "Merchant export",
                desc: "Quoting, coordinating and shipping to buyers outside India.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-5">
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Who we serve */}
        <section className="mt-16 rounded-3xl border border-border bg-secondary/40 p-8 lg:p-10">
          <h2 className="font-serif text-2xl font-bold">Who we supply</h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            The same catalogue serves all of them. What changes is the quantity, the pricing and
            the paperwork.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {AUDIENCES.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3"
              >
                <item.icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.75} aria-hidden="true" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Why Narayani — spec point 22 */}
        <section className="mt-16">
          <h2 className="font-serif text-3xl font-bold">Why work with us</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {WHY.map((item) => (
              <div key={item.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
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

        {/* The one thing we are careful about */}
        <section className="mt-16 rounded-3xl border border-border bg-card p-8 shadow-sm lg:p-10">
          <h2 className="font-serif text-2xl font-bold">On what we do and do not claim</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            We are a distributor. We do not manufacture, and we do not describe ourselves as
            though we do. Where a product page shows ingredients, nutrition or an allergen line,
            those are reproduced from the manufacturer's own pack — including, where it happens,
            the places where a pack is inconsistent with itself. We say so on the page rather
            than quietly correcting it, because the pack is the legal document and you should be
            able to see what it says.
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            For the same reason there are no certification badges anywhere on this site that we
            cannot evidence, and no claim about markets served or volumes shipped. When we have
            something to show you, it will be on the page with the number that proves it.
          </p>
        </section>

        {/* Split CTA — the two journeys, same as the homepage */}
        <section className="mt-16 grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col rounded-3xl border border-border bg-card p-7 shadow-sm">
            <h3 className="font-serif text-xl font-bold">Buying for yourself</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              The full range, priced in rupees, delivered across India.
            </p>
            <Button className="mt-5 rounded-full" asChild>
              <Link href="/shop">
                Shop products <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
          <div className="flex flex-col rounded-3xl border border-border bg-secondary/60 p-7">
            <h3 className="font-serif text-xl font-bold">Buying for a business</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
              Wholesale in India, or export to your market. Tell us what to price.
            </p>
            <Button variant="outline" className="mt-5 rounded-full" asChild>
              <Link href="/business">
                Business &amp; export <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
