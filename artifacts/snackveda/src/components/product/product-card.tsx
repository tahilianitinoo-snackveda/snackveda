import { Link } from "wouter";
import { Product } from "@workspace/api-client-react";
import { Price } from "@/components/ui/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const { user } = useAuth();
  
  // Calculate B2C discount if applicable
  const b2cDiscount = user?.role === 'b2c_customer' && (user.ordersCount ?? 0) > 0 ? 0.1 : 0;
  const isB2B = user?.role === 'b2b_customer' && user.b2bStatus === 'approved';
  
  const displayPrice = isB2B && product.b2bPrice 
    ? product.b2bPrice 
    : product.b2cPrice * (1 - b2cDiscount);

  const originalPrice = product.b2cPrice;
  const showStrikethrough = b2cDiscount > 0 && !isB2B;

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      category: product.category,
      weightGrams: product.weightGrams,
      imageUrl: product.imageUrl,
      unitPrice: displayPrice,
      quantity: isB2B && product.moq ? product.moq : 1,
      moq: product.moq ?? 1,
    });
    toast.success(`${product.name} added to cart`);
  };

  const getCategoryGradient = (category: string) => {
    switch (category) {
      case 'chips': return 'from-amber-200 to-amber-500';
      case 'makhana': return 'from-teal-200 to-teal-500';
      case 'superpuffs': return 'from-orange-200 to-orange-500';
      default: return 'from-gray-200 to-gray-500';
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="group relative flex flex-col bg-card rounded-xl overflow-hidden border shadow-sm hover:shadow-md transition-all"
    >
      <Link href={`/shop/${product.slug}`} className="block relative aspect-square overflow-hidden bg-muted">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(product.category)} flex items-center justify-center p-6 text-center`}>
            <span className="font-serif text-2xl font-bold text-white drop-shadow-md">{product.name}</span>
          </div>
        )}
        {(product.status === "out_of_stock" || product.stockQty === 0) && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <Badge variant="secondary">Out of Stock</Badge>
          </div>
        )}
      </Link>
      
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
                <Price amount={originalPrice} />
              </span>
            )}
            <Price amount={displayPrice} className="font-semibold text-lg" />
            {isB2B && product.moq && (
              <span className="text-[10px] text-muted-foreground uppercase">MOQ: {product.moq}</span>
            )}
          </div>
          <Button 
            size="sm" 
            onClick={handleAddToCart}
            disabled={product.status !== "active" || product.stockQty === 0}
            className="rounded-full"
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
