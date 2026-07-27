import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Order, OrderItem, OrderStatusHistory, OrderPayment } from "@/types";

/* ────────────────────────────────────────────────────────────
   CREATE ORDER
   ──────────────────────────────────────────────────────────── */
export const createOrder = createServerFn({ method: "POST" })
  .validator((data: {
    user_id: string;
    status: string;
    payment_status: string;
    payment_method: string;
    payment_id: string | null;
    subtotal: number;
    delivery_fee: number;
    discount: number;
    total: number;
    coupon_id: string | null;
    delivery_type: string;
    address: Record<string, unknown> | null;
    change_for: number | null;
    notes: string | null;
    items: Array<{
      product_id: string;
      product_name: string;
      product_image: string;
      unit_type: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
  }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false as const, error: "Serviço indisponível" };
    }

    try {
      // 1. Gera número de pedido único
      const { data: orderNumber, error: fnError } = await admin.rpc("get_next_order_number");
      if (fnError) throw fnError;

      // 2. Se tem cupom, incrementa current_uses
      let couponIncremented = false;
      const couponId = data.coupon_id;

      if (couponId) {
        const { error: incError } = await admin.rpc("increment_coupon_uses", {
          coupon_id: couponId,
        });
        if (incError) {
          console.warn("[createOrder] Cupom inválido:", incError.message);
          data.coupon_id = null;
          data.discount = 0;
          data.total = data.subtotal + data.delivery_fee;
        } else {
          couponIncremented = true;
        }
      }

      // 3. Insere o pedido
      const { data: order, error: orderError } = await admin
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: data.user_id,
          status: data.status,
          payment_status: data.payment_status,
          payment_method: data.payment_method,
          payment_id: data.payment_id,
          subtotal: data.subtotal,
          delivery_fee: data.delivery_fee,
          discount: data.discount,
          total: data.total,
          coupon_id: data.coupon_id,
          delivery_type: data.delivery_type,
          address: data.address,
          change_for: data.change_for,
          notes: data.notes,
        })
        .select()
        .single();

      if (orderError) {
        // Rollback cupom
        if (couponIncremented && couponId) {
          try {
            await admin.rpc("decrement_coupon_uses", { coupon_id: couponId });
          } catch (e) {
            console.error("[createOrder] Rollback falhou:", e);
          }
        }
        throw orderError;
      }

      if (!order) throw new Error("Pedido não criado");

      // 4. Insere order_items
      const orderItems = data.items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
        unit_type: item.unit_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await admin
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("[createOrder] Erro ao inserir items:", itemsError);
      }

      // 5. Insere history inicial
      await admin.from("order_status_history").insert({
        order_id: order.id,
        status: "pending",
        notes: "Pedido recebido",
        created_by: null,
        created_by_name: null,
      });

      return { success: true as const, order };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar pedido";
      console.error("[createOrder] Erro:", err);
      return { success: false as const, error: message };
    }
  });

/* ────────────────────────────────────────────────────────────
   GET USER ORDERS
   ──────────────────────────────────────────────────────────── */
export const getUserOrders = createServerFn({ method: "POST" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false as const, error: "Serviço indisponível", orders: [] };
    }

    try {
      const { data: orders, error } = await admin
        .from("orders")
        .select(`
          *,
          items:order_items(*),
          history:order_status_history(*),
          payment:order_payments(*)
        `)
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return { success: true as const, orders: orders || [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar pedidos";
      console.error("[getUserOrders] Erro:", err);
      return { success: false as const, error: message, orders: [] };
    }
  });

/* ────────────────────────────────────────────────────────────
   GET ORDER DETAIL
   ──────────────────────────────────────────────────────────── */
export const getOrderDetail = createServerFn({ method: "POST" })
  .validator((data: { orderId: string; userId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false as const, error: "Serviço indisponível", order: null };
    }

    try {
      const { data: order, error } = await admin
        .from("orders")
        .select(`
          *,
          items:order_items(*),
          history:order_status_history(*),
          payment:order_payments(*)
        `)
        .eq("id", data.orderId)
        .eq("user_id", data.userId)
        .single();

      if (error) throw error;

      return { success: true as const, order };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar pedido";
      console.error("[getOrderDetail] Erro:", err);
      return { success: false as const, error: message, order: null };
    }
  });

/* ────────────────────────────────────────────────────────────
   CANCEL ORDER (User)
   ──────────────────────────────────────────────────────────── */
export const cancelOrder = createServerFn({ method: "POST" })
  .validator((data: { orderId: string; userId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false as const, error: "Serviço indisponível" };
    }

    try {
      // Verifica se o pedido pertence ao usuário e está pendente
      const { data: existing, error: fetchError } = await admin
        .from("orders")
        .select("status")
        .eq("id", data.orderId)
        .eq("user_id", data.userId)
        .single();

      if (fetchError || !existing) {
        return { success: false as const, error: "Pedido não encontrado" };
      }

      if (existing.status !== "pending") {
        return { success: false as const, error: "Só é possível cancelar pedidos pendentes" };
      }

      // Atualiza status
      const { error: updateError } = await admin
        .from("orders")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", data.orderId);

      if (updateError) throw updateError;

      // Adiciona ao histórico
      await admin.from("order_status_history").insert({
        order_id: data.orderId,
        status: "cancelled",
        notes: "Cancelado pelo cliente",
        created_by: data.userId,
        created_by_name: "Cliente",
      });

      return { success: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao cancelar pedido";
      console.error("[cancelOrder] Erro:", err);
      return { success: false as const, error: message };
    }
  });

/* ────────────────────────────────────────────────────────────
   CHECK PIX PAYMENT STATUS
   ──────────────────────────────────────────────────────────── */
export const checkPixPaymentStatus = createServerFn({ method: "POST" })
  .validator((data: { orderId: string; userId: string }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false as const, error: "Serviço indisponível", status: null };
    }

    try {
      const { data: order, error } = await admin
        .from("orders")
        .select("payment_status, status, payment:order_payments(*)")
        .eq("id", data.orderId)
        .eq("user_id", data.userId)
        .single();

      if (error || !order) {
        return { success: false as const, error: "Pedido não encontrado", status: null };
      }

      return {
        success: true as const,
        status: order.payment_status,
        orderStatus: order.status,
        payment: order.payment?.[0] || null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao verificar pagamento";
      console.error("[checkPixPaymentStatus] Erro:", err);
      return { success: false as const, error: message, status: null };
    }
  });