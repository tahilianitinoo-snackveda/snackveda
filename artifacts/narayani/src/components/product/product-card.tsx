import { Link } from "wouter";
import { Product } from "@workspace/api-client-react";
import { Price } from "@/components/ui/price";
import { Badge } from "@/components/ui/badge";
import { MOQ_SHORT } from "@/lib/trade-terms";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { usePricingRules, discountPercentFor } from "@/hooks/use-pricing-rules";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useBrowsingStore } from "@/lib/browsing";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const { user } = useAuth();

  const isB2B = user?.role === "b2b_customer" && user.b2bStatus === "approved";
  const ordersCount = user?.ordersCount ?? 0;

  // The tiers used to be written out here as 15/10/5, and again in
  // product-detail.tsx, and a third time in api/_lib/pricing.ts — which is the one
  // that decides what a customer is actually charged. Reading the shop's configured
  // rules means the price shown can only ever agree with the price billed.
  const rules = usePricingRules();
  const discountPercent = !isB2B && user?.role === "b2c_customer"
    ? discountPercentFor(rules, ordersCount)
    : 0;

  const unitPrice = isB2B
    ? product.b2bPrice
    : product.b2cPrice * (1 - discountPercent / 100);

  const showStrikethrough = discountPercent > 0 && !isB2B && !!user;

  // Use primary image from images array, fallback to imageUrl, then gradient
  const primaryImage = (product as any).images?.find((i: any) => i.isPrimary)?.url
    ?? (product as any).images?.[0]?.url
    ?? product.imageUrl;

  const handleAddToCart = () => {
    // B2B: start at MOQ, must be multiple of MOQ
    const defaultQty = isB2B ? (product.moq ?? 5) : 1;
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      weightGrams: product.weightGrams,
      imageUrl: primaryImage ?? null,
      unitPrice,
      quantity: defaultQty,
      moq: product.moq ?? 1,
    });
    toast.success(`${product.name} added to cart`);
  };

  const getCategoryGradient = (category: string) => {
    switch (category) {
      case "healthy_chips": return "from-primary to-primary";
      case "makhana": return "from-primary to-primary";
      case "superpuffs": return "from-orange-200 to-orange-500";
      default: return "from-gray-200 to-gray-500";
    }
  };

  // Subscribed narrowly: `wishlist.some(...)` rather than the whole array, so a card
  // re-renders when ITS product is toggled and not when any other one is.
  const toggleWishlist = useBrowsingStore((s) => s.toggleWishlist);
  const wishlisted = useBrowsingStore((s) => s.wishlist.some((w) => w.slug === product.slug));

  const isOutOfStock = product.status !== "active" || product.stockQty === 0;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative flex flex-col bg-card rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-all"
    >
      <Link href={`/shop/${product.slug}`} className="block relative aspect-square overflow-hidden bg-muted">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(product.category)} flex items-center justify-center p-6 text-center`}>
            <span className="font-serif text-2xl font-bold text-white drop-shadow-md">{product.name}</span>
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <Badge variant="secondary">Out of Stock</Badge>
          </div>
        )}
        {isB2B && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-primary text-primary-foreground text-[10px]">Wholesale</Badge>
          </div>
        )}
      </Link>

      {/*
        Outside the <Link>, not inside it. A button nested in an anchor is invalid
        HTML and, more to the point, a tap on the heart would follow the link on
        the way past.
      */}
      <button
        type="button"
        onClick={() => {
          const added = toggleWishlist({
            slug: product.slug,
            name: product.name,
            imageUrl: primaryImage ?? null,
            price: product.b2cPrice,
            weightGrams: product.weightGrams,
          });
          toast.success(added ? "Saved to your wishlist" : "Removed from your wishlist");
        }}
        aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        aria-pressed={wishlisted}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-red-500"
      >
        <Heart className={`h-4 w-4 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} strokeWidth={1.75} />
      </button>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link href={`/shop/${product.slug}`} className="font-medium hover:text-primary transition-colors line-clamp-2 flex-1">
            {product.name}
          </Link>
          <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">{product.weightGrams}g</Badge>
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between">
          <div className="flex flex-col">
            {showStrikethrough && (
              <span className="text-xs text-muted-foreground line-through">
                <Price amount={product.b2cPrice} />
              </span>
            )}
            <div className="flex items-baseline gap-1">
              <Price amount={unitPrice} className="font-semibold text-lg" />
              <span className="text-[10px] text-muted-foreground">excl. GST</span>
            </div>
            {isB2B && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{MOQ_SHORT}</span>
            )}
            {discountPercent > 0 && !isB2B && !!user && (
              <span className="text-[10px] text-green-600 font-medium">{discountPercent}% off</span>
            )}
          </div>
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="rounded-full"
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
