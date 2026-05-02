import { SiteShell } from "@/components/layout/site-shell";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Store, TrendingUp, Truck, FileText, BadgeCheck, Shield, Package } from "lucide-react";

export default function B2B() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-20 lg:py-28 text-center">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-serif font-bold mb-6">Grow Your Business with SnackVeda</h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-10">
            Premium snacks, competitive wholesale pricing, and dedicated support for modern retail partners.
          </p>
          <Button size="lg" variant="secondary" className="rounded-full px-10 h-14 text-lg" asChild>
            <Link href="/register?type=b2b">Apply for Wholesale Account</Link>
          </Button>
        </div>
      </section>

      {/* Buyer Types */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">Who We Partner With</h2>
            <p className="text-muted-foreground text-lg">Our snacks fit perfectly in diverse retail environments.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { title: "Modern Retail", icon: Store, desc: "Supermarkets & Premium Grocers" },
              { title: "Kirana Stores", icon: Store, desc: "Local & Neighborhood Shops" },
              { title: "Fitness Centers", icon: TrendingUp, desc: "Gyms & Wellness Studios" },
              { title: "Pharmacies", icon: Shield, desc: "Health & Medical Stores" },
              { title: "Cafes & HoReCa", icon: Store, desc: "Coffee Shops & Restaurants" },
              { title: "Corporate", icon: FileText, desc: "Office Pantries & Gifting" },
            ].map((type, i) => (
              <div key={i} className="bg-card border rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
                <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
                  <type.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-1">{type.title}</h3>
                <p className="text-sm text-muted-foreground">{type.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">The SnackVeda Advantage</h2>
          </div>
          
          <div className="grid md:grid-cols-5 gap-6 divide-y md:divide-y-0 md:divide-x divide-border max-w-6xl mx-auto">
            {[
              { title: "Wholesale Pricing", icon: TrendingUp, desc: "Attractive margins for your business." },
              { title: "MOQ System", icon: Package, desc: "Flexible case-wise ordering." },
              { title: "Advance Payment", icon: FileText, desc: "Simple bank transfer & UPI options." },
              { title: "Bulk Dispatch", icon: Truck, desc: "Fast, secure nationwide shipping." },
              { title: "GST Invoice", icon: BadgeCheck, desc: "Input tax credit compliant billing." },
            ].map((benefit, i) => (
              <div key={i} className="pt-6 md:pt-0 md:px-6 flex flex-col items-center text-center">
                <benefit.icon className="w-8 h-8 text-primary mb-4" />
                <h3 className="font-bold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="text-3xl font-serif font-bold mb-4">Ready to Partner with SnackVeda?</h2>
          <p className="text-muted-foreground mb-8">Apply for a wholesale account today. Get access to trade pricing, bulk ordering, and dedicated support once approved.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="rounded-full px-10 h-14 text-lg" asChild>
              <Link href="/register?type=b2b">Apply for Wholesale Account</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full px-10 h-14 text-lg" asChild>
              <Link href="/shop">Browse Products</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
