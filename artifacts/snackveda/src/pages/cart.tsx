import { SiteShell } from "@/components/layout/site-shell";
import { useCartStore } from "@/lib/store";
import { CartSummary } from "@/components/cart/cart-summary";
import { Price } from "@/components/ui/price";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";

export default function Cart() {
  const { items, updateQty, removeItem } = useCartStore();
  const { isB2BApproved } = useAuth();

  const getCategoryGradient = (category: string) => {
    switch (category) {
      case 'chips': return 'from-amber-200 to-amber-500';
      case 'makhana': return 'from-teal-200 to-teal-500';
      case 'superpuffs': return 'from-orange-200 to-orange-500';
      default: return 'from-gray-200 to-gray-500';
    }
  };

  return (
    <SiteShell>
      <div className="bg-muted/30 py-8 border-b">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-serif font-bold">Shopping Cart</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {items.length === 0 ? (
          <EmptyState
            icon={<ShoppingBagIcon className="w-12 h-12" />}
            title="Your cart is empty"
            description="Looks like you haven't added any snacks yet."
            action={
              <Button size="lg" className="rounded-full" asChild>
                <Link href="/shop">Start Shopping <ArrowRight className="w-4 h-4 ml-2" /></Link>
              </Button>
            }
            className="py-24 bg-card rounded-2xl border border-dashed"
          />
        ) : (
          <div className="grid lg:grid-cols-3 gap-12 items-start">
            <div className="lg:col-span-2 space-y-6">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-6 p-4 md:p-6 bg-card border rounded-2xl shadow-sm relative pr-12">
                  <Link href={`/shop/${item.slug}`} className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-xl overflow-hidden bg-muted block">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(item.category)}`} />
                    )}
                  </Link>
                  
                  <div className="flex flex-col flex-1">
                    <div className="flex justify-between mb-1">
                      <Link href={`/shop/${item.slug}`} className="font-serif font-bold text-lg md:text-xl hover:text-primary transition-colors">
                        {item.name}
                      </Link>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{item.weightGrams}g</p>
                    
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-4">
                      <Price amount={item.unitPrice} className="font-semibold text-lg" />
                      
                      <div className="flex items-center gap-4">
                        {isB2BApproved && (
                          <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            MOQ: {item.moq}
                          </div>
                        )}
                        <div className="flex items-center border rounded-full bg-background h-10 px-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full w-8 h-8 hover:bg-muted"
                            onClick={() => {
                              const min = isB2BApproved ? item.moq : 1;
                              if (item.quantity > min) updateQty(item.productId, item.quantity - 1);
                            }}
                            disabled={isB2BApproved ? item.quantity <= item.moq : item.quantity <= 1}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full w-8 h-8 hover:bg-muted"
                            onClick={() => updateQty(item.productId, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => removeItem(item.productId)}
                    className="absolute top-6 right-6 text-muted-foreground hover:text-destructive transition-colors p-2"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div>
              <CartSummary />
            </div>
          </div>
        )}
      </div>
    </SiteShell>
  );
}

function ShoppingBagIcon(props: any) {
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
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
