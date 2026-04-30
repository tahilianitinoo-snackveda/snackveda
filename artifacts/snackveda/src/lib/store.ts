import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OrderType, ProductCategory } from '@workspace/api-client-react';

export interface CartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  name: string;
  slug: string;
  category: ProductCategory;
  weightGrams: number;
  imageUrl: string | null;
  moq: number;
}

interface CartState {
  items: CartItem[];
  orderType: OrderType;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setOrderType: (type: OrderType) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orderType: 'b2c' as OrderType,
      addItem: (item) => set((state) => {
        const existingItem = state.items.find((i) => i.productId === item.productId);
        if (existingItem) {
          return {
            items: state.items.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          };
        }
        return { items: [...state.items, item] };
      }),
      removeItem: (productId) => set((state) => ({
        items: state.items.filter((i) => i.productId !== productId),
      })),
      updateQty: (productId, quantity) => set((state) => ({
        items: state.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
      })),
      clearCart: () => set({ items: [] }),
      setOrderType: (type) => set({ orderType: type }),
    }),
    {
      name: 'snackveda-cart',
    }
  )
);
