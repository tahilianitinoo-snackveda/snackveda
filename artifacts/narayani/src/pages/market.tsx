import { Link, useRoute } from "wouter";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";
import { findMarket, MARKETS } from "@/data/markets";
import { useSeo, SITE_URL } from "@/lib/seo";
import NotFound from "@/pages/not-found";
import {
  Anchor,
  ArrowRight,
  Boxes,
  ExternalLink,
  FileText,
  Package,
  Search,
  ShieldCheck,
  Ship,
} from "lucide-react";

/**
 * /markets/:slug — spec point 29.
 *
 * ─── WHAT THIS PAGE IS ALLOWED TO SAY ───────────────────────────────────────
 * Spec point 29 is explicit: do not claim existing exports to a country unless
 * verified, and prefer "Indian Food Products for Buyers in the UAE" over "Leading
 * Indian Food Exporter to UAE". Narayani has supplied no evidence of shipping
 * anywhere, so this page addresses a buyer IN a market and describes what we can do
 * for them. It never says we already export there, never names a customer there,
 * and quotes no volume, lead time or client count.
 *
 * ─── AND WHAT IT DELIBERATELY DOES NOT SAY ──────────────────────────────────
 * It does not explain the market's import rules. A UAE page feels incomplete
 * without a paragraph on shelf-life-on-arrival and Arabic labelling — and writing
 * one is how a website ends up giving an importer regulatory guidance that is
 * stale or wrong, on the basis of which they clear a container. The page names the
 * authority, links to it, and says requirements are confirmed against the specific
 * product when we quote. See src/data/markets.ts.
 *
 * ─── WHY ONE PAGE AND NOT SIX ───────────────────────────────────────────────
 * Six near-identical files would drift: someone would fix a claim on the UK page
 * and leave the same claim standing on the US one. One component over a typed
 * table means a correction is made once.
 */
export default function Market() {
  const [, params] = useRoute("/markets/:slug");
  const market = findMarket(params?.slug);

  // Hooks must run before any early return, so the SEO call takes the not-found
  // case too rather than sitting after the guard.
  useSeo({
    title: market
      ? `Indian Food Products for Buyers ${market.inCountry} | Narayani Distributors`
      : "Market not found",
    description: market
      ? `Source Indian snacks and packaged foods for the ${market.country} market. Narayani Distributors is a merchant exporter and distributor working with selected Indian manufacturers and brands.`
      : undefined,
    canonical: market ? `/markets/${market.slug}` : undefined,
    noIndex: !market,
    jsonLd: market
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Export", item: `${SITE_URL}/export` },
            { "@type": "ListItem", position: 3, name: market.country },
          ],
        }
      : null,
  });

  if (!market) return <NotFound />;

  const others = MARKETS.filter((m) => m.slug !== market.slug);

  return (
    <SiteShell>
      <section className="border-b border-border bg-gradient-to-b from-secondary/50 via-background to-background">
        <div className="container mx-auto max-w-4xl px-4 py-16 text-center lg:py-20">
          <div className="flex items-center justify-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              {market.country}
            </p>
            <span aria-hidden="true" className="h-px w-8 bg-primary" />
          </div>

          {/*
            "for buyers in X" — not "leading exporter to X". The difference is the
            whole of spec point 29.
          */}
          <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            Indian food products for buyers {market.inCountry}.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            We are a merchant exporter and distributor working with selected Indian
            manufacturers and brands. If you are sourcing Indian snacks for the{" "}
            {market.country} market, tell us what you need and we will quote against it.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" className="rounded-full px-8" asChild>
              <Link href={`/request-a-quote?type=export`}>
                Request a quotation <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
              <Link href="/catalogue">Download the catalogue</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-16 lg:py-20">
        {/* Market context — about the market, not about us */}
        <section>
          <h2 className="font-serif text-3xl font-bold">Why Indian snacks, {market.inCountry}</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{market.context}</p>
        </section>

        {/* What we do — process, no outcomes */}
        <section className="mt-16">
          <h2 className="font-serif text-2xl font-bold">What we do for an importer</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {[
              { icon: Search, title: "Product selection", desc: "Working out which of the range suits your shelf, your price point and your customer." },
              { icon: Package, title: "Packaging and cartons", desc: "Pack format and carton configuration agreed against what your logistics and your retailer need." },
              { icon: FileText, title: "Documentation", desc: "The commercial and shipping paperwork the consignment needs, prepared with you." },
              { icon: Boxes, title: "Consolidation", desc: "A mixed load across categories from one supplier, rather than a relationship per product." },
              { icon: Ship, title: "Shipment coordination", desc: "Booking and coordinating the movement through to your nominated port." },
              { icon: ShieldCheck, title: "Manufacturer detail", desc: "Who made each product, and the licence they hold, so your own compliance file is complete." },
            ].map((item) => (
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

        {/* Gateways — geography, explicitly not a claim */}
        <section className="mt-16 rounded-3xl border border-border bg-secondary/40 p-8 lg:p-10">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <Anchor className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="font-serif text-2xl font-bold">Ports we can quote to</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Tell us your nominated port of discharge on the enquiry and the quotation is
                built against it. The main gateways for {market.country} are{" "}
                {market.gateways.slice(0, -1).join(", ")}
                {market.gateways.length > 1 ? " and " : ""}
                {market.gateways[market.gateways.length - 1]}, but we quote to whichever you
                nominate.
              </p>
              {/*
                Says what these are: a list of the country's ports. Without this line
                a reader could take it as a list of places we already ship to.
              */}
              <p className="mt-3 text-sm text-muted-foreground">
                These are the market's principal gateways, not a claim about consignments we
                have already sent.
              </p>
            </div>
          </div>
        </section>

        {/* Compliance — name and link, do not explain */}
        <section className="mt-16">
          <h2 className="font-serif text-2xl font-bold">On {market.demonym} requirements</h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Food imported into {market.country} is regulated by the {market.authority.name} (
            {market.authority.abbr}). We are not going to summarise their requirements on a web
            page — rules change, and an importer who cleared a container on the basis of a
            paragraph we wrote would have every right to be annoyed with us.
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            What we will do is work through them with you against the specific products you are
            buying, at the point of quotation: what is on the pack, what the manufacturer holds,
            what the shipment needs. Every product page on this site already shows the
            ingredients, nutrition, allergen line and the manufacturer's own licence, exactly as
            printed.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <a href={market.authority.url} target="_blank" rel="noopener noreferrer">
                {market.authority.abbr} <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </Button>
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <Link href="/quality">Our registrations</Link>
            </Button>
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-border bg-card p-8 text-center shadow-sm lg:p-12">
          <h2 className="font-serif text-3xl font-bold">
            Sourcing for {market.country}?
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">
            Tell us the products, the quantity and the port. You will get a quotation against
            it, not a brochure.
          </p>
          <Button size="lg" className="mt-8 rounded-full px-8" asChild>
            <Link href="/request-a-quote?type=export">
              Request a quotation <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </section>

        <nav className="mt-16 border-t pt-8" aria-label="Other markets">
          <p className="text-sm font-semibold text-foreground">Other markets</p>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {others.map((m) => (
              <li key={m.slug}>
                <Link href={`/markets/${m.slug}`} className="text-muted-foreground hover:text-primary">
                  {m.country}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/export" className="font-medium text-primary hover:underline">
                All export services
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </SiteShell>
  );
}
