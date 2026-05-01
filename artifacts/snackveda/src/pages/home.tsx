import { SiteShell } from "@/components/layout/site-shell";
import { useListProducts } from "@workspace/api-client-react";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Leaf, Flame, Brain, ShieldCheck, Sparkles, MapPin, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/images/hero.png";
import chipsImg from "@/assets/images/category-chips.png";
import makhanaImg from "@/assets/images/category-makhana.png";
import superpuffsImg from "@/assets/images/category-superpuffs.png";

export default function Home() {
  const { data: products, isLoading } = useListProducts();
  const featuredProducts = products?.slice(0, 6) || [];

  return (
    <SiteShell>
      {/* Hero Section */}
      <section className="relative bg-primary text-primary-foreground overflow-hidden py-24 lg:py-32">
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
          <img src={heroImg} alt="Hero Background" className="w-full h-full object-cover" />
        </div>
        <div className="container mx-auto px-4 relative z-10 flex flex-col items-center text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold max-w-4xl tracking-tight leading-tight mb-6"
          >
            Where Mindful Eating Meets Joyful Snacking
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl max-w-2xl text-primary-foreground/90 mb-10"
          >
            Clean Ingredients. Bold Indian Flavors. Made for Everyday Life.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button size="lg" variant="secondary" className="text-secondary-foreground font-semibold rounded-full px-8" asChild>
              <Link href="/shop">Shop the Range</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10 rounded-full px-8" asChild>
              <Link href="/b2b">Wholesale Inquiry</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Stats Row */}
      <section className="bg-card border-b py-10">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-border">
          <div>
            <div className="text-3xl font-serif font-bold text-primary mb-1">16</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Premium SKUs</div>
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-primary mb-1">3</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Categories</div>
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-primary mb-1">100%</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Vegetarian</div>
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-primary mb-1">Real</div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Indian Flavors</div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Discover Our Categories</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Crafted with care to bring you the best of crunch, flavor, and health.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link href="/shop?category=chips" className="group relative rounded-2xl overflow-hidden aspect-[4/3] block">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 transition-opacity group-hover:opacity-90" />
            <img src={chipsImg} alt="Healthy Chips" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute bottom-0 left-0 p-8 z-20">
              <h3 className="text-2xl font-serif font-bold text-white mb-2">Healthy Chips</h3>
              <p className="text-white/80 text-sm flex items-center gap-2">Explore range <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></p>
            </div>
          </Link>
          <Link href="/shop?category=makhana" className="group relative rounded-2xl overflow-hidden aspect-[4/3] block">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 transition-opacity group-hover:opacity-90" />
            <img src={makhanaImg} alt="Makhana" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute bottom-0 left-0 p-8 z-20">
              <h3 className="text-2xl font-serif font-bold text-white mb-2">Premium Makhana</h3>
              <p className="text-white/80 text-sm flex items-center gap-2">Explore range <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></p>
            </div>
          </Link>
          <Link href="/shop?category=superpuffs" className="group relative rounded-2xl overflow-hidden aspect-[4/3] block">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 transition-opacity group-hover:opacity-90" />
            <img src={superpuffsImg} alt="Superpuffs" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute bottom-0 left-0 p-8 z-20">
              <h3 className="text-2xl font-serif font-bold text-white mb-2">Superpuffs</h3>
              <p className="text-white/80 text-sm flex items-center gap-2">Explore range <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></p>
            </div>
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Trending Now</h2>
              <p className="text-muted-foreground">Our community's favorite picks this week.</p>
            </div>
            <Button variant="link" asChild className="hidden sm:flex">
              <Link href="/shop">View all <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-xl" />
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

      {/* B2B Banner */}
      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl text-center md:text-left">
            <h2 className="text-3xl font-serif font-bold mb-4">Stock SnackVeda in Your Store</h2>
            <p className="text-primary-foreground/90 text-lg">Partner with us to bring premium, healthy snacking to your customers. Enjoy wholesale pricing, dedicated support, and easy ordering.</p>
          </div>
          <Button size="lg" variant="secondary" className="shrink-0 rounded-full px-8" asChild>
            <Link href="/b2b">Become a Retailer</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Why SnackVeda</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">The SnackVeda promise in every bite.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {[
            { icon: Leaf, title: "Clean Ingredients", desc: "No artificial preservatives or hidden nasties. Just real food." },
            { icon: Flame, title: "Roasted, Not Fried", desc: "Crafted for the perfect crunch without the greasy guilt." },
            { icon: Brain, title: "Mindful Nutrition", desc: "Balanced macros to keep your energy steady all day." },
            { icon: ShieldCheck, title: "Quality Assured", desc: "Rigorous testing at every step from sourcing to packaging." },
            { icon: Sparkles, title: "Authentic Flavors", desc: "Spice blends crafted to honor true Indian culinary heritage." },
            { icon: MapPin, title: "Locally Sourced", desc: "Supporting local farmers and regional agriculture." },
          ].map((feature, idx) => (
            <div key={idx} className="flex flex-col items-center text-center p-6 bg-card rounded-2xl border shadow-sm">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-muted py-24 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-5xl font-serif font-bold mb-6">Ready to snack better?</h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">Join thousands of mindful snackers who have made the switch to SnackVeda.</p>
          <Button size="lg" className="rounded-full px-10 text-lg h-14" asChild>
            <Link href="/shop">Start Shopping</Link>
          </Button>
        </div>
      </section>
    </SiteShell>
  );
}
