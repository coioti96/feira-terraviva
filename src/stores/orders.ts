import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { Order, OrderStatus, OrderStatusHistory } from "@/types";

interface OrdersState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  fetchUserOrders: (userId: string) => Promise<void>;
  createOrder: (order: Omit<Order, "id" | "order_number" | "created_at" | "updated_at">) => Promise<Order | null>;
  updateStatus: (id: string, status: OrderStatus) => Promise<boolean>;
  cancelOrder: (id: string) => Promise<boolean>;
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      isLoading: false,
      error: null,

      async fetchOrders() {
        if (!supabaseConfigured || !supabase) {
          set({ error: "Supabase não configurado" });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from("orders")
            .select("*, order_items(*), order_status_history(*)")
            .order("created_at", { ascending: false });
          if (error) throw error;
          set({ orders: data || [] });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erro ao carregar pedidos" });
        } finally {
          set({ isLoading: false });
        }
      },

      async fetchUserOrders(userId) {
        if (!supabaseConfigured || !supabase) return;
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from("orders")
            .select("*, order_items(*), order_status_history(*)")
            .eq("user_id", userId)
            .order("created_at", { ascending: false });
          if (error) throw error;
          set({ orders: data || [] });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erro ao carregar pedidos" });
        } finally {
          set({ isLoading: false });
        }
      },

      async createOrder(orderData) {
  if (!supabaseConfigured || !supabase) return null;
  try {
    // 1. Gera número de pedido único via RPC
    const { data: orderNumber, error: fnError } = await supabase.rpc("get_next_order_number");
    if (fnError) throw fnError;

    // 2. Se tem cupom, incrementa current_uses atomicamente via RPC
    let couponIncremented = false;
    const couponId = orderData.coupon_id;

    if (couponId) {
      const { error: incError } = await supabase.rpc("increment_coupon_uses", {
        coupon_id: couponId,
      });
      if (incError) {
        console.warn("[createOrder] Cupom inválido no momento da criação:", incError.message);
        orderData.coupon_id = null;
        orderData.discount = 0;
        orderData.total = orderData.subtotal + orderData.delivery_fee;
      } else {
        couponIncremented = true;
      }
    }

    // 3. Payload EXATO que o banco espera (sem campos que não existem)
    const payload = {
      order_number: orderNumber,
      user_id: orderData.user_id,
      status: orderData.status,
      payment_status: orderData.payment_status,
      payment_method: orderData.payment_method,
      payment_id: orderData.payment_id,
      subtotal: orderData.subtotal,
      delivery_fee: orderData.delivery_fee,
      discount: orderData.discount,
      total: orderData.total,
      coupon_id: orderData.coupon_id,
      delivery_type: orderData.delivery_type,
      address: orderData.address,
      change_for: orderData.change_for,
      notes: orderData.notes,
    };

    // 4. Insere o pedido
    const { data, error } = await supabase
      .from("orders")
      .insert([payload])
      .select()
      .single();

    if (error) {
      // Rollback: decrementa current_uses se tinha incrementado
      if (couponIncremented && couponId) {
        try {
          await supabase.rpc("decrement_coupon_uses", {
            coupon_id: couponId,
          });
        } catch (rollbackErr) {
          console.error("[createOrder] Rollback falhou:", rollbackErr instanceof Error ? rollbackErr.message : rollbackErr);
        }
      }
      throw error;
    }

    // 5. Insere order_items
    if (data && orderData.items) {
      const orderItems = orderData.items.map((item) => ({
        order_id: data.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
        unit_type: item.unit_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("[createOrder] Erro ao inserir items:", itemsError);
      }
    }

    // 6. Atualiza estado local
    if (data) {
      set((s) => ({ orders: [data, ...s.orders] }));
    }
    return data;
  } catch (err) {
    console.error("[createOrder] Erro:", err);
    set({ error: err instanceof Error ? err.message : "Erro ao criar pedido" });
    return null;
  }
},

      async updateStatus(id, status) {
        if (!supabaseConfigured || !supabase) return false;
        try {
          const { error } = await supabase
            .from("orders")
            .update({ status, updated_at: new Date().toISOString() })
            .eq("id", id);
          if (error) throw error;

          const { error: historyError } = await supabase.from("order_status_history").insert([
            {
              order_id: id,
              status,
              notes: null,
              created_by: null,
              created_by_name: null,
              created_at: new Date().toISOString(),
            },
          ]);
          if (historyError) throw historyError;

          const newHistoryEntry: OrderStatusHistory = {
            id: crypto.randomUUID(),
            order_id: id,
            status,
            notes: null,
            created_by: null,
            created_by_name: null,
            created_at: new Date().toISOString(),
          };

          set((s) => ({
            orders: s.orders.map((o) =>
              o.id === id
                ? {
                    ...o,
                    status,
                    updated_at: new Date().toISOString(),
                    history: [...(o.history || []), newHistoryEntry],
                  }
                : o,
            ),
          }));
          return true;
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erro ao atualizar status" });
          return false;
        }
      },

      async cancelOrder(id) {
        return get().updateStatus(id, "cancelled");
      },
    }),
    { name: "terraviva-orders-cache" },
  ),
);

export function nextOrderNumber(seq: number) {
  return `ORD-${String(seq).padStart(6, "0")}`;
}