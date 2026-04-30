import { SiteShell } from "@/components/layout/site-shell";
import { Link, useLocation } from "wouter";
import { useListProducts, ProductCategory } from "@workspace/api-client-react";
import { CategoryTabs } from "@/components/product/category-tabs";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductCard } from "@/components/product/product-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, Zap } from "lucide-react";
import { useState, useMemo } from "react";

export default function Shop() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialCategory = (searchParams.get("category") as ProductCategory) || "all";
  
  const [activeCategory, setActiveCategory] = useState<ProductCategory | "all">(initialCategory);
  const [sortBy, setSortBy] = useState<"featured" | "price-low" | "price-high">("featured");

  const { data: products, isLoading } = useListProducts(
    activeCategory !== "all" ? { category: activeCategory } : undefined
  );

  const { user, isB2BApproved } = useAuth();
  
  const b2cDiscount = user?.role === 'b2c_customer' && (user.ordersCount ?? 0) > 0;

  const sortedProducts = useMemo(() => {
    if (!products) return [];
    const sorted = [...products];
    if (sortBy === "price-low") {
      sorted.sort((a, b) => (isB2BApproved && a.b2bPrice && b.b2bPrice) ? a.b2bPrice - b.b2bPrice : a.b2cPrice - b.b2cPrice);
    } else if (sortBy === "price-high") {
      sorted.sort((a, b) => (isB2BApproved && a.b2bPrice && b.b2bPrice) ? b.b2bPrice - a.b2bPrice : b.b2cPrice - a.b2cPrice);
    }
    return sorted;
  }, [products, sortBy, isB2BApproved]);

  const updateCategory = (category: ProductCategory | "all") => {
    setActiveCategory(category);
    // Could update URL here if we want to be fancy
  };

  return (
    <SiteShell>
      <div className="bg-muted/30 py-8 border-b">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-4">Shop the Range</h1>
          <p className="text-muted-foreground">Discover our full collection of premium, healthy Indian snacks.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isB2BApproved && (
          <div className="mb-8 bg-amber-100 text-amber-900 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
            <Zap className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-sm font-medium">Trade pricing active. You are viewing wholesale rates. Minimum Order Quantities (MOQ) apply per item.</div>
          </div>
        )}

        {!isB2BApproved && b2cDiscount && (
          <div className="mb-8 bg-primary/10 text-primary border border-primary/20 p-4 rounded-xl flex items-center gap-3">
            <Zap className="h-5 w-5 shrink-0" />
            <div className="text-sm font-medium">Welcome back! Enjoy your loyal customer discount of 10% on all items.</div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <CategoryTabs activeCategory={activeCategory} onChange={updateCategory} />
          
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm text-muted-foreground font-medium">Sort by:</span>
            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Featured" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-24 bg-muted/20 rounded-2xl border border-dashed">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No products found</h3>
            <p className="text-muted-foreground mt-2">Try selecting a different category.</p>
          </div>
        ) : (
          <ProductGrid>
            {sortedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
        )}
      </div>
    </SiteShell>
  );
}
