'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface CartItem {
  productId: string;
  productName: string;
  designId: string;
  designTitle: string;
  size: string;
  quantity: number;
  price: number;
  mockupUrl: string;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, designId: string, size: string) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const storageKey = 'wearables-cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) {
      setItems(JSON.parse(existing) as CartItem[]);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      addItem: (item: CartItem) => {
        setItems((current) => {
          const index = current.findIndex(
            (existing) =>
              existing.productId === item.productId &&
              existing.designId === item.designId &&
              existing.size === item.size
          );

          if (index >= 0) {
            const next = [...current];
            next[index] = { ...next[index], quantity: next[index].quantity + item.quantity };
            return next;
          }

          return [...current, item];
        });
      },
      removeItem: (productId: string, designId: string, size: string) => {
        setItems((current) =>
          current.filter(
            (item) =>
              !(item.productId === productId && item.designId === designId && item.size === size)
          )
        );
      },
      clearCart: () => setItems([]),
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    }),
    [items]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}
