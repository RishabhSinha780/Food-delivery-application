import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
  restaurant_id: string;
  restaurant_name: string;
  image_url?: string | null;
};

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  subtotal: number;
  count: number;
  restaurantId: string | null;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "provender_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);

  const add: CartCtx["add"] = (item) => {
    setItems((prev) => {
      // Single restaurant cart
      if (prev.length && prev[0].restaurant_id !== item.restaurant_id) {
        if (!confirm("Your cart has items from another restaurant. Replace it?")) return prev;
        return [{ ...item, qty: 1 }];
      }
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };
  const remove = (id: string) => setItems((p) => p.filter((i) => i.id !== id));
  const setQty = (id: string, qty: number) => setItems((p) => qty <= 0 ? p.filter((i) => i.id !== id) : p.map((i) => i.id === id ? { ...i, qty } : i));
  const clear = () => setItems([]);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const restaurantId = items[0]?.restaurant_id ?? null;

  return <Ctx.Provider value={{ items, add, remove, setQty, clear, subtotal, count, restaurantId }}>{children}</Ctx.Provider>;
}

export const useCart = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be inside CartProvider");
  return v;
};
