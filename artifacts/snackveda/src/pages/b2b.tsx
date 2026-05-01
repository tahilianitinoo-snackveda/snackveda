import { SiteShell } from "@/components/layout/site-shell";
import { Link } from "wouter";
import { useListProducts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Store, TrendingUp, Truck, FileText, BadgeCheck, Shield } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Price } from "@/components/ui/price";
import { Badge } from "@/components/ui/badge";

export default function B2B() {
  const { data: products, isLoading } = useListProducts();

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

      {/* Product Table */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-serif font-bold mb-4">Our Wholesale Portfolio</h2>
            <p className="text-muted-foreground">Log in to your approved B2B account to place bulk orders.</p>
          </div>

          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">MRP</TableHead>
                    <TableHead className="text-right">Trade Price (B2B)</TableHead>
                    <TableHead className="text-right">Carton Size (MOQ)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading portfolio...</TableCell>
                    </TableRow>
                  ) : products && products.length > 0 ? (
                    products.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="capitalize text-muted-foreground">{p.category}</TableCell>
                        <TableCell className="text-right">{p.weightGrams}g</TableCell>
                        <TableCell className="text-right text-muted-foreground"><Price amount={p.b2cPrice} /></TableCell>
                        <TableCell className="text-right font-medium text-primary">
                          {p.b2bPrice ? <Price amount={p.b2bPrice} /> : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{p.moq || 1} units</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">No products available</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <Button size="lg" className="rounded-full px-10 h-14 text-lg" asChild>
              <Link href="/register?type=b2b">Apply Now</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

// Adding missing lucide icon
function Package(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}
