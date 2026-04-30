import { SiteShell } from "@/components/layout/site-shell";
import { Link } from "wouter";

export default function About() {
  return (
    <SiteShell>
      <div className="bg-primary/5 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-6">Our Story</h1>
          <p className="text-lg text-muted-foreground">
            Born in Mumbai, crafted for the modern snacker. We believe that eating well shouldn't mean compromising on the bold, vibrant flavors we grew up loving.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-muted relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-200/50 to-teal-200/50 mix-blend-multiply" />
              <img src="/src/assets/images/about.png" alt="Our Founders" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="space-y-6 text-lg text-muted-foreground">
            <h2 className="text-3xl font-serif font-bold text-foreground">The Narayani Heritage</h2>
            <p>
              SnackVeda is the proud creation of Narayani Distributors, a name synonymous with quality and trust in the Indian FMCG landscape for over two decades.
            </p>
            <p>
              We noticed a gap in the market: traditional Indian snacks were often heavy and deep-fried, while modern "healthy" alternatives lacked the soul-satisfying punch of true Indian spices. We set out to bridge this gap.
            </p>
            <p>
              Months of rigorous R&D, sourcing the finest local ingredients, and perfecting our roasting and seasoning processes led to the birth of SnackVeda — a portfolio of snacks that respect your health as much as they delight your palate.
            </p>
          </div>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="p-8 bg-card border rounded-2xl">
            <h3 className="text-xl font-serif font-bold mb-4">Our Mission</h3>
            <p className="text-muted-foreground">To redefine Indian snacking by proving that clean ingredients and explosive flavors can coexist beautifully in every bite.</p>
          </div>
          <div className="p-8 bg-card border rounded-2xl">
            <h3 className="text-xl font-serif font-bold mb-4">Our Sourcing</h3>
            <p className="text-muted-foreground">We partner directly with local farmers across Maharashtra and Gujarat to source the highest quality makhanas, lentils, and spices, ensuring fair trade and freshness.</p>
          </div>
          <div className="p-8 bg-card border rounded-2xl">
            <h3 className="text-xl font-serif font-bold mb-4">Our Promise</h3>
            <p className="text-muted-foreground">100% vegetarian, never deep-fried, and completely free from artificial colors or hidden chemical preservatives. Transparency you can taste.</p>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
