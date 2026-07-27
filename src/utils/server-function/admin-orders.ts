// ============================================================
// SERVER FUNCTIONS — Admin Orders
// Feirinha Orgânica Terra Viva · Enterprise
// Busca TODOS os pedidos (sem filtro de user_id) + controle total
// ============================================================

import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Order, OrderStatus, PaymentStatus } from "@/types";

/* ────────────────────────────────────────────────────────────
   GET ALL ORDERS (Admin) — Busca TODOS os pedidos
   ──────────────────────────────────────────────────────────── */
export const getAllOrders = createServerFn({ method: "POST" })
  .validator((data: {
    status?: string | null;
    paymentStatus?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    search?: string | null;
    page?: number;
    perPage?: number;
  }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false as const, error: "Serviço indisponível", orders: [], total: 0 };
    }

    try {
      let query = admin
        .from("orders")
        .select(`
          *,
          items:order_items(*),
          history:order_status_history(*),
          payment:order_payments(*),
          profile:profiles(id, full_name, email, phone)
        `, { count: "exact" });

      // Filtros
      if (data.status) query = query.eq("status", data.status);
      if (data.paymentStatus) query = query.eq("payment_status", data.paymentStatus);
      if (data.dateFrom) query = query.gte("created_at", data.dateFrom);
      if (data.dateTo) query = query.lte("created_at", data.dateTo);
      
      // Busca por número do pedido ou nome do cliente
      if (data.search) {
        const q = data.search.trim();
        query = query.or(`order_number.ilike.%${q}%,profile.full_name.ilike.%${q}%`);
      }

      // Paginação
      const page = data.page || 1;
      const perPage = data.perPage || 50;
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const { data: orders, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        success: true as const,
        orders: orders || [],
        total: count || 0,
        page,
        perPage,
        totalPages: Math.ceil((count || 0) / perPage),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar pedidos";
      console.error("[getAllOrders] Erro:", err);
      return { success: false as const, error: message, orders: [], total: 0 };
    }
  });

/* ────────────────────────────────────────────────────────────
   GET ORDER DETAIL (Admin) — Busca pedido sem verificar user_id
   ──────────────────────────────────────────────────────────── */
export const getOrderDetailAdmin = createServerFn({ method: "POST" })
  .validator((data: { orderId: string }) => data)
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
          payment:order_payments(*),
          profile:profiles(id, full_name, email, phone)
        `)
        .eq("id", data.orderId)
        .single();

      if (error) throw error;

      return { success: true as const, order };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar pedido";
      console.error("[getOrderDetailAdmin] Erro:", err);
      return { success: false as const, error: message, order: null };
    }
  });

/* ────────────────────────────────────────────────────────────
   UPDATE ORDER STATUS (Admin)
   ──────────────────────────────────────────────────────────── */
export const updateOrderStatus = createServerFn({ method: "POST" })
  .validator((data: {
    orderId: string;
    status: OrderStatus;
    notes?: string | null;
    adminId: string;
    adminName: string;
  }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false as const, error: "Serviço indisponível" };
    }

    try {
      // Atualiza status do pedido
      const { error: updateError } = await admin
        .from("orders")
        .update({ 
          status: data.status, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", data.orderId);

      if (updateError) throw updateError;

      // Adiciona ao histórico
      await admin.from("order_status_history").insert({
        order_id: data.orderId,
        status: data.status,
        notes: data.notes || `Status atualizado para ${data.status} pelo admin`,
        created_by: data.adminId,
        created_by_name: data.adminName,
      });

      return { success: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao atualizar pedido";
      console.error("[updateOrderStatus] Erro:", err);
      return { success: false as const, error: message };
    }
  });

/* ────────────────────────────────────────────────────────────
   UPDATE PAYMENT STATUS (Admin)
   ──────────────────────────────────────────────────────────── */
export const updatePaymentStatus = createServerFn({ method: "POST" })
  .validator((data: {
    orderId: string;
    paymentStatus: PaymentStatus;
    notes?: string | null;
    adminId: string;
    adminName: string;
  }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false as const, error: "Serviço indisponível" };
    }

    try {
      // Atualiza status de pagamento
      const { error: updateError } = await admin
        .from("orders")
        .update({ 
          payment_status: data.paymentStatus,
          updated_at: new Date().toISOString() 
        })
        .eq("id", data.orderId);

      if (updateError) throw updateError;

      // Se foi pago, atualiza o payment também
      if (data.paymentStatus === "paid") {
        await admin
          .from("order_payments")
          .update({ 
            status: "paid",
            paid_at: new Date().toISOString() 
          })
          .eq("order_id", data.orderId);
      }

      // Adiciona ao histórico
      await admin.from("order_status_history").insert({
        order_id: data.orderId,
        status: "pending", // mantém o status do pedido, só muda pagamento
        notes: data.notes || `Pagamento ${data.paymentStatus} pelo admin`,
        created_by: data.adminId,
        created_by_name: data.adminName,
      });

      return { success: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao atualizar pagamento";
      console.error("[updatePaymentStatus] Erro:", err);
      return { success: false as const, error: message };
    }
  });

/* ────────────────────────────────────────────────────────────
   CANCEL ORDER (Admin)
   ──────────────────────────────────────────────────────────── */
export const cancelOrderAdmin = createServerFn({ method: "POST" })
  .validator((data: {
    orderId: string;
    reason?: string | null;
    adminId: string;
    adminName: string;
  }) => data)
  .handler(async ({ data }) => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false as const, error: "Serviço indisponível" };
    }

    try {
      const { error: updateError } = await admin
        .from("orders")
        .update({ 
          status: "cancelled",
          updated_at: new Date().toISOString() 
        })
        .eq("id", data.orderId);

      if (updateError) throw updateError;

      // Adiciona ao histórico
      await admin.from("order_status_history").insert({
        order_id: data.orderId,
        status: "cancelled",
        notes: data.reason || "Cancelado pelo administrador",
        created_by: data.adminId,
        created_by_name: data.adminName,
      });

      return { success: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao cancelar pedido";
      console.error("[cancelOrderAdmin] Erro:", err);
      return { success: false as const, error: message };
    }
  });