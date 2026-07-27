import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, ProductUnit } from "@/types";

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id" | "total_price">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clear: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
  getItems: () => CartItem[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (input) =>
        set((s) => {
          const key = `${input.product_id}:${input.unit_type}`;
          const existing = s.items.find(
            (i) => i.product_id === input.product_id && i.unit_type === input.unit_type,
          );
          if (existing) {
            const newQty = existing.quantity + input.quantity;
            return {
              items: s.items.map((i) =>
                i.id === existing.id
                  ? {
                      ...i,
                      quantity: newQty,
                      total_price: newQty * i.unit_price,
                    }
                  : i,
              ),
            };
          }
          return {
            items: [
              ...s.items,
              {
                ...input,
                id: key,
                total_price: input.quantity * input.unit_price,
              },
            ],
          };
        }),

      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, qty) =>
        set((s) => ({
          items: s.items
            .map((i) =>
              i.id === id
                ? { ...i, quantity: Math.max(0, qty), total_price: Math.max(0, qty) * i.unit_price }
                : i,
            )
            .filter((i) => i.quantity > 0),
        })),

      clear: () => set({ items: [] }),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getSubtotal: () => get().items.reduce((sum, i) => sum + i.total_price, 0),

      getItems: () => get().items,
    }),
    { name: "terraviva-cart" },
  ),
);

export function unitLabel(u: ProductUnit): string {
  const map: Record<ProductUnit, string> = {
    unidade: "unidade",
    "100g": "100 g",
    "250g": "250 g",
    "500g": "500 g",
    "1kg": "1 kg",
    "2kg": "2 kg",
    "5kg": "5 kg",
    maço: "maço",
    bandeja: "bandeja",
    caixa: "caixa",
    pacote: "pacote",
    dúzia: "dúzia",
    litro: "litro",
  };
  return map[u] ?? u;
}