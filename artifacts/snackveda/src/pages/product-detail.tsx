import { SiteShell } from "@/components/layout/site-shell";
import { useRoute, Link, useLocation } from "wouter";
import { useGetProductBySlug, getGetProductBySlugQueryKey } from "@workspace/api-client-react";
import { useCartStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { Price } from "@/components/ui/price";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/product/product-card";
import { ProductGrid } from "@/components/product/product-grid";
import { Minus, Plus, ShoppingBag, ArrowLeft, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Image gallery component with thumbnail strip
function ProductImageGallery({ product, getCategoryGradient }: { product: any; getCategoryGradient: (c: string) => string }) {
  const images = product.images?.length > 0 ? product.images : (product.imageUrl ? [{ id: "main", url: product.imageUrl, altText: product.name, isPrimary: true }] : []);
  const [activeIdx, setActiveIdx] = useState(0);
  const active = images[activeIdx];

  if (images.length === 0) {
    return (
      <div className={`aspect-square rounded-3xl overflow-hidden bg-muted border bg-gradient-to-br ${getCategoryGradient(product.category)} flex items-center justify-center p-12 text-center`}>
        <span className="font-serif text-4xl md:text-5xl font-bold text-white drop-shadow-lg leading-tight">{product.name}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="aspect-square rounded-3xl overflow-hidden bg-muted border relative group">
        <img src={active.url} alt={active.altText || product.name} className="w-full h-full object-cover" />
        {images.length > 1 && (
          <>
            <button
              onClick={() => setActiveIdx((activeIdx - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveIdx((activeIdx + 1) % images.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2">
          {images.map((img: any, i: number) => (
            <button
              key={img.id}
              onClick={() => setActiveIdx(i)}
              className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === activeIdx ? "border-primary shadow-sm" : "border-transparent opacity-60 hover:opacity-100"}`}
            >
              <img src={img.url} alt={img.altText || ""} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductDetail() {
  const [, params] = useRoute("/shop/:slug");
  const slug = params?.slug || "";
  const [, setLocation] = useLocation();

  const { data: productData, isLoading, error } = useGetProductBySlug(slug, {
    query: {
      queryKey: getGetProductBySlugQueryKey(slug),
      enabled: !!slug,
    },
  });

  const product = productData?.product;
  const relatedProducts = productData?.related || [];

  const addItem = useCartStore((state) => state.addItem);
  const { user, isB2BApproved } = useAuth();

  const ordersCount = user?.ordersCount ?? 0;
  const discountPercent = user?.role === 'b2c_customer'
    ? ordersCount === 0 ? 15 : ordersCount === 1 ? 10 : 5
    : 0;
  
  const originalPrice = product?.b2cPrice || 0;
  const displayPrice = isB2BApproved && product?.b2bPrice 
    ? product.b2bPrice 
    : originalPrice * (1 - discountPercent / 100);

  const minQty = isB2BApproved && product?.moq ? product.moq : 1;
  const [quantity, setQuantity] = useState(minQty);

  const showStrikethrough = discountPercent > 0 && !isB2BApproved && !!user;

  // Reset quantity if product changes
  if (product && isB2BApproved && product.moq && quantity < product.moq) {
    setQuantity(product.moq);
  }

  const handleAddToCart = () => {
    if (!product) return;
    
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      weightGrams: product.weightGrams,
      imageUrl: product.imageUrl,
      unitPrice: displayPrice,
      quantity,
      moq: product.moq ?? 1,
    });
    
    toast.success(`${quantity} x ${product.name} added to cart`);
  };

  if (error) {
    return (
      <SiteShell>
        <div className="container mx-auto px-4 py-24 text-center">
          <h2 className="text-2xl font-bold mb-4">Product not found</h2>
          <Button asChild><Link href="/shop">Back to Shop</Link></Button>
        </div>
      </SiteShell>
    );
  }

  const getCategoryGradient = (category: string) => {
    switch (category) {
      case 'healthy_chips': return 'from-amber-200 to-amber-500';
      case 'makhana': return 'from-teal-200 to-teal-500';
      case 'superpuffs': return 'from-orange-200 to-orange-500';
      default: return 'from-gray-200 to-gray-500';
    }
  };

  return (
    <SiteShell>
      <div className="bg-muted/30 py-4 border-b">
        <div className="container mx-auto px-4">
          <Link href="/shop" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Shop
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {isLoading || !product ? (
          <div className="grid md:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-6">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-1/3" />
              <Skeleton className="h-14 w-full" />
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-12 mb-24">
            {/* Image Gallery */}
            <div className="sticky top-24">
              <ProductImageGallery product={product} getCategoryGradient={getCategoryGradient} />
            </div>

            {/* Product Info */}
            <div className="flex flex-col">
              <div className="mb-6 flex flex-wrap gap-2">
                <Badge variant="secondary" className="capitalize text-sm px-3 py-1">{product.category}</Badge>
                {(product.status === 'out_of_stock' || product.stockQty === 0) && <Badge variant="destructive" className="text-sm px-3 py-1">Out of Stock</Badge>}
              </div>

              <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 leading-tight">{product.name}</h1>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{product.description}</p>

              <div className="flex flex-col gap-2 mb-8 p-6 bg-card border rounded-2xl shadow-sm">
                <div className="flex items-end gap-4">
                  {showStrikethrough && (
                    <span className="text-lg text-muted-foreground line-through mb-1">
                      <Price amount={originalPrice} />
                    </span>
                  )}
                  <Price amount={displayPrice} className="text-4xl font-bold text-primary" />
                </div>
                
                {isB2BApproved ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded mt-2">
                    <Info className="w-4 h-4" />
                    Wholesale price applied. Minimum Order Quantity (MOQ): {product.moq} units
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Inclusive of all taxes</p>
                )}
              </div>

              {/* Add to Cart Actions */}
              <div className="flex flex-col sm:flex-row gap-4 mb-10">
                <div className="flex items-center border rounded-full bg-background h-14 px-2 w-full sm:w-auto shrink-0">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-muted h-10 w-10"
                    onClick={() => setQuantity(Math.max(minQty, quantity - 1))}
                    disabled={quantity <= minQty}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-12 text-center font-medium text-lg">{quantity}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-muted h-10 w-10"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  size="lg" 
                  className="flex-1 h-14 text-lg rounded-full shadow-sm"
                  onClick={handleAddToCart}
                  disabled={product.status !== 'active' || product.stockQty === 0}
                >
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  {(product.status === 'active' && product.stockQty > 0) ? 'Add to Cart' : 'Out of Stock'}
                </Button>
              </div>

              {/* Product Meta */}
              <div className="grid grid-cols-2 gap-4 pt-8 border-t">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Net Weight</h4>
                  <p className="font-medium">{product.weightGrams}g</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Shelf Life</h4>
                  <p className="font-medium">6 Months</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">HSN Code</h4>
                  <p className="font-medium">{product.hsnCode || '210690'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">GST Rate</h4>
                  <p className="font-medium">{product.gstPercent}%</p>
                </div>
                {isB2BApproved && product.moq && (
                  <div className="col-span-2">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Carton Configuration</h4>
                    <p className="font-medium">{product.moq} units per master carton</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Related Products */}
        {!isLoading && relatedProducts.length > 0 && (
          <div className="pt-16 border-t">
            <h2 className="text-3xl font-serif font-bold mb-8">You May Also Like</h2>
            <ProductGrid>
              {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </ProductGrid>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
