import { SiteShell } from "@/components/layout/site-shell";
import { useCartStore } from "@/lib/store";
import { CartSummary } from "@/components/cart/cart-summary";
import { Price } from "@/components/ui/price";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function Cart() {
  const { items, updateQty, removeItem } = useCartStore();
  const { isB2BApproved } = useAuth();

  const getCategoryGradient = (category: string) => {
    switch (category) {
      case "healthy_chips": return "from-amber-200 to-amber-500";
      case "makhana": return "from-teal-200 to-teal-500";
      case "superpuffs": return "from-orange-200 to-orange-500";
      default: return "from-gray-200 to-gray-500";
    }
  };

  // For B2B: qty must be multiple of MOQ
  const handleDecrease = (productId: string, currentQty: number, moq: number) => {
    if (isB2BApproved) {
      const newQty = currentQty - moq;
      if (newQty >= moq) updateQty(productId, newQty);
    } else {
      if (currentQty > 1) updateQty(productId, currentQty - 1);
    }
  };

  const handleIncrease = (productId: string, currentQty: number, moq: number) => {
    if (isB2BApproved) {
      updateQty(productId, currentQty + moq);
    } else {
      updateQty(productId, currentQty + 1);
    }
  };

  if (items.length === 0) {
    return (
      <SiteShell>
        <div className="bg-muted/30 py-8 border-b">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-serif font-bold">Shopping Cart</h1>
          </div>
        </div>
        <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mb-6" />
          <h2 className="text-2xl font-serif font-bold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">Looks like you haven't added any snacks yet.</p>
          <Button size="lg" className="rounded-full" asChild>
            <Link href="/shop">Start Shopping <ArrowRight className="w-4 h-4 ml-2" /></Link>
          </Button>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="bg-muted/30 py-8 border-b">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-serif font-bold">Shopping Cart</h1>
          <p className="text-muted-foreground mt-1">{items.length} item{items.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-3 gap-12 items-start">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-4 md:gap-6 p-4 md:p-6 bg-card border rounded-2xl shadow-sm relative">
                {/* Product image */}
                <Link href={`/shop/${item.slug}`} className="w-20 h-20 md:w-28 md:h-28 shrink-0 rounded-xl overflow-hidden bg-muted block">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(item.category)} flex items-center justify-center p-2`}>
                      <span className="text-white text-xs font-bold text-center leading-tight">{item.name}</span>
                    </div>
                  )}
                </Link>

                {/* Product info */}
                <div className="flex flex-col flex-1 min-w-0 pr-8">
                  <Link href={`/shop/${item.slug}`} className="font-serif font-bold text-base md:text-lg hover:text-primary transition-colors line-clamp-2">
                    {item.name}
                  </Link>
                  <p className="text-sm text-muted-foreground mb-1">{item.weightGrams}g</p>
                  
                  {isB2BApproved && (
                    <Badge variant="outline" className="text-[10px] w-fit mb-2 text-amber-600 border-amber-300">
                      Wholesale — multiples of {item.moq}
                    </Badge>
                  )}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                    {/* Price */}
                    <div>
                      <Price amount={item.unitPrice} className="font-semibold text-lg" />
                      <span className="text-[10px] text-muted-foreground block">excl. GST</span>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center border rounded-full bg-background h-10 px-1 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full w-8 h-8 hover:bg-muted"
                        onClick={() => handleDecrease(item.productId, item.quantity, item.moq)}
                        disabled={isB2BApproved ? item.quantity <= item.moq : item.quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full w-8 h-8 hover:bg-muted"
                        onClick={() => handleIncrease(item.productId, item.quantity, item.moq)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeItem(item.productId)}
                  className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors p-1"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="lg:sticky lg:top-24">
            <CartSummary />
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
