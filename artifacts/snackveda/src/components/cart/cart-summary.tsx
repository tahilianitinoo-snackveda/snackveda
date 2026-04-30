import { useCartStore } from "@/lib/store";
import { useQuoteCart } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { Price } from "@/components/ui/price";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { AlertCircle, Loader2 } from "lucide-react";

export function CartSummary() {
  const { items, orderType } = useCartStore();
  const quote = useQuoteCart();
  const [lastQuote, setLastQuote] = useState<any>(null);

  useEffect(() => {
    if (items.length > 0) {
      quote.mutate(
        {
          data: {
            orderType,
            items: items.map(i => ({
              productId: i.productId,
              quantity: i.quantity
            }))
          }
        },
        {
          onSuccess: (data) => setLastQuote(data)
        }
      );
    } else {
      setLastQuote(null);
    }
  }, [items, orderType]);

  if (items.length === 0) return null;

  const isLoading = quote.isPending && !lastQuote;
  const q = lastQuote || quote.data;

  return (
    <div className="bg-card border rounded-xl p-6 sticky top-24 shadow-sm">
      <h2 className="text-xl font-serif font-bold mb-6">Order Summary</h2>
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : q ? (
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <Price amount={q.subtotal} />
          </div>
          
          {q.discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount {q.discountLabel ? `(${q.discountLabel})` : ''}</span>
              <span>-<Price amount={q.discount} /></span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">GST (18%)</span>
            <Price amount={q.taxTotal} />
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            {q.shipping > 0 ? <Price amount={q.shipping} /> : <span className="text-green-600">Free</span>}
          </div>
          
          <div className="pt-4 border-t flex justify-between font-bold text-lg">
            <span>Total</span>
            <Price amount={q.total} />
          </div>
          
          {orderType === 'b2b' && q.b2bViolations && q.b2bViolations.length > 0 && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="font-semibold">B2B Requirements not met:</span>
                <ul className="list-disc pl-4 space-y-1">
                  {q.b2bViolations.map((v: string, i: number) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="pt-4">
            <Button 
              className="w-full" 
              size="lg" 
              disabled={orderType === 'b2b' && q.b2bViolations && q.b2bViolations.length > 0}
              asChild
            >
              <Link href="/checkout">
                Proceed to Checkout
              </Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
