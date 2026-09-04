import { SiteShell } from "@/components/layout/site-shell";
import { useListProducts } from "@workspace/api-client-react";
import type { ProductCategory } from "@workspace/api-client-react";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductCard } from "@/components/product/product-card";
import { AudienceSplit } from "@/components/home/audience-split";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Boxes, Ship, Store } from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/images/hero.png";
import categoryChips from "@/assets/images/category-chips.png";
import categoryMakhana from "@/assets/images/category-makhana.png";
import categorySuperpuffs from "@/assets/images/category-superpuffs.png";
import { useSeo } from "@/lib/seo";

/**
 * The three categories the catalogue actually has. These ids are the
 * `product_category` enum values the API filters on — do not add a fourth
 * without a matching category in the database.
 */
const CATEGORIES: { id: ProductCategory; label: string; image: string; alt: string }[] = [
  {
    id: "healthy_chips",
    label: "Healthy Chips",
    image: categoryChips,
    alt: "A ceramic bowl of baked grain chips on a linen cloth",
  },
  {
    id: "makhana",
    label: "Makhana",
    image: categoryMakhana,
    alt: "A bowl of roasted, lightly spiced makhana seen from above",
  },
  {
    id: "superpuffs",
    label: "Superpuffs",
    image: categorySuperpuffs,
    alt: "A bowl of multicoloured vegetable superpuffs seen from above",
  },
];

export default function Home() {
  useSeo({
    title: "Narayani Distributors | Indian Food Products for Every Market",
    description:
      "Merchant exporter and distributor of Indian packaged foods — roasted makhana, millet and grain chips and protein superpuffs, for consumers, retailers, distributors and international buyers.",
    canonical: "/",
  });

  const { data: products, isLoading } = useListProducts();
  const featuredProducts = products?.slice(0, 6) || [];

  return (
    <SiteShell>
      {/*
        Hero. The photography is the point, so it is shown unfiltered beside the
        type rather than composited under a full-bleed brand wash — see the
        note in the task-3 report. The warm sand-to-ivory ground picks up the
        photograph's own cream backdrop.
      */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/50 via-background to-background">
        <div className="container mx-auto grid items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-px w-8 bg-primary" />
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Merchant Exporter &middot; Distributor
              </p>
            </div>

            <h1 className="mt-5 font-serif text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Indian Food Products. Made for Every Table. Ready for Every Market.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Discover thoughtfully selected Indian food products for everyday consumers,
              retailers, distributors and international buyers.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="rounded-full px-8" asChild>
                <Link href="/shop">Shop products</Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
                <Link href="/business">Business &amp; export</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <img
              src={heroImg}
              alt="Makhana, superpuffs and grain chips served in ceramic bowls beside Indian whole spices"
              className="aspect-[4/3] w-full rounded-2xl border border-border object-cover shadow-lg lg:aspect-[5/4]"
            />
          </motion.div>
        </div>
      </section>

      {/* The fork. Consumer and business, equal weight, directly under the hero. */}
      <AudienceSplit />

      {/* Categories */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-12 text-center">
          <h2 className="mb-4 font-serif text-3xl font-bold md:text-4xl">Shop by category</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Three ranges, sourced from selected Indian manufacturers and brands.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={`/shop?category=${category.id}`}
              className="group relative block aspect-[4/3] overflow-hidden rounded-2xl"
            >
              {/*
                One ink veil across all three tiles. The photographs come from
                different shoots on different backdrops; the shared scrim is what
                makes them read as one set.
              */}
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-foreground/90 via-foreground/35 to-foreground/10 transition-opacity group-hover:opacity-90" />
              <img
                src={category.image}
                alt={category.alt}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute bottom-0 left-0 z-20 p-5 sm:p-6 lg:p-8">
                <h3 className="mb-2 font-serif text-xl font-bold text-white lg:text-2xl">
                  {category.label}
                </h3>
                <p className="flex items-center gap-2 text-sm text-white/80">
                  Explore range
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <h2 className="mb-4 font-serif text-3xl font-bold md:text-4xl">From our range</h2>
              <p className="text-muted-foreground">A selection from the current catalogue.</p>
            </div>
            <Button variant="link" asChild className="hidden sm:flex">
              <Link href="/shop">
                View all <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : (
            <ProductGrid>
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </ProductGrid>
          )}

          <div className="mt-8 flex justify-center sm:hidden">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/shop">View all products</Link>
            </Button>
          </div>
        </div>
      </section>

      {/*
        How we work. Every line here is either in the schema or in the business
        identity — no certifications, no volumes, no market claims, nothing about
        manufacturing. Do not add a fourth card unless the business supplies the
        fact behind it.
      */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-16 text-center">
          <h2 className="mb-4 font-serif text-3xl font-bold md:text-4xl">How we work</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Narayani Distributors is a merchant exporter and distributor of Indian packaged
            foods.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {[
            {
              icon: Boxes,
              title: "A curated range",
              desc: "We source from selected Indian manufacturers and brands and stock a focused range of snacks and packaged foods.",
            },
            {
              icon: Store,
              title: "Retail and wholesale",
              desc: "Buy a single pack online, or order at wholesale volumes — pricing and minimum order quantities are set per product.",
            },
            {
              icon: Ship,
              title: "Export enquiries welcome",
              desc: "Retailers, distributors and international buyers can talk to us directly about supply, distribution and export.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center rounded-2xl border bg-card p-6 text-center shadow-sm"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <feature.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mb-3 font-serif text-xl font-bold">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing business invitation */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="container mx-auto flex flex-col items-center justify-between gap-8 px-4 md:flex-row">
          <div className="max-w-2xl text-center md:text-left">
            <h2 className="mb-4 font-serif text-3xl font-bold">Sourcing for a shop, a route or a market</h2>
            <p className="text-lg text-primary-foreground/90">
              Wholesale supply for retailers and distributors, and export enquiries from
              international buyers. Tell us what you need and we will come back with pricing.
            </p>
          </div>
          <Button size="lg" variant="secondary" className="shrink-0 rounded-full px-8" asChild>
            <Link href="/business">Business &amp; export</Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
