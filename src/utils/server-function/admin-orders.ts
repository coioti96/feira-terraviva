// ============================================================
// SERVER FUNCTIONS — Admin Orders
// Feirinha Orgânica Terra Viva · Enterprise
// CORREÇÃO: Busca pedidos e profiles separadamente + tipagem fixa
// ============================================================

import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Order, OrderStatus, PaymentStatus } from "@/types";

/* ────────────────────────────────────────────────────────────
   PROFILE TYPE
   ──────────────────────────────────────────────────────────── */
interface ProfileData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
}

interface PaymentData {
  id: string;
  order_id: string;
  method: string;
  status: string;
  amount: number;
  transaction_id: string | null;
  pix_qr_code: string | null;
  pix_expiration: string | null;
  mercado_pago_id: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
}

/* ────────────────────────────────────────────────────────────
   GET ALL ORDERS (Admin)
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
      console.error("[getAllOrders] getSupabaseAdmin() retornou null");
      return { success: false as const, error: "Serviço indisponível", orders: [] as Order[], total: 0 };
    }

    try {
      // 1. Busca os pedidos
      let query = admin
        .from("orders")
        .select(`
          *,
          items:order_items(*),
          history:order_status_history(*)
        `, { count: "exact" });

      if (data.status) query = query.eq("status", data.status);
      if (data.paymentStatus) query = query.eq("payment_status", data.paymentStatus);
      if (data.dateFrom) query = query.gte("created_at", data.dateFrom);
      if (data.dateTo) query = query.lte("created_at", data.dateTo);
      if (data.search) {
        query = query.ilike("order_number", `%${data.search.trim()}%`);
      }

      const page = data.page || 1;
      const perPage = data.perPage || 50;
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;

      const { data: orders, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("[getAllOrders] Erro na query:", error);
        throw error;
      }

      const ordersList = (orders || []) as Record<string, unknown>[];

      // 2. Busca os profiles
      const userIds = [...new Set(ordersList.map((o) => o.user_id as string).filter(Boolean))];
      const profilesMap = new Map<string, ProfileData>();

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await admin
          .from("profiles")
          .select("id, full_name, email, phone")
          .in("id", userIds);

        if (profilesError) {
          console.warn("[getAllOrders] Erro profiles:", profilesError);
        } else if (profiles) {
          (profiles as Record<string, unknown>[]).forEach((p) => {
            profilesMap.set(p.id as string, {
              id: p.id as string,
              full_name: (p.full_name as string) || "Cliente",
              email: (p.email as string) || "",
              phone: (p.phone as string | null) || null,
            });
          });
        }
      }

      // 3. Busca os pagamentos
      const orderIds = ordersList.map((o) => o.id as string);
      const paymentsMap = new Map<string, PaymentData>();

      if (orderIds.length > 0) {
        try {
          const { data: payments, error: paymentsError } = await admin
            .from("order_payments")
            .select("*")
            .in("order_id", orderIds);

          if (paymentsError) {
            console.warn("[getAllOrders] Erro payments:", paymentsError);
          } else if (payments) {
            (payments as Record<string, unknown>[]).forEach((p) => {
              const oid = p.order_id as string;
              if (!paymentsMap.has(oid)) {
                paymentsMap.set(oid, {
                  id: p.id as string,
                  order_id: oid,
                  method: p.method as string,
                  status: p.status as string,
                  amount: p.amount as number,
                  transaction_id: (p.transaction_id as string | null) || null,
                  pix_qr_code: (p.pix_qr_code as string | null) || null,
                  pix_expiration: (p.pix_expiration as string | null) || null,
                  mercado_pago_id: (p.mercado_pago_id as string | null) || null,
                  paid_at: (p.paid_at as string | null) || null,
                  refunded_at: (p.refunded_at as string | null) || null,
                  created_at: p.created_at as string,
                });
              }
            });
          }
        } catch (paymentsErr) {
          console.warn("[getAllOrders] Exceção payments:", paymentsErr);
        }
      }

      // 4. Merge — usa Record para evitar cast problemático
      const enrichedOrders: Record<string, unknown>[] = ordersList.map((order) => {
        const userId = order.user_id as string;
        const orderId = order.id as string;
        const profile = profilesMap.get(userId) || null;
        const payment = paymentsMap.get(orderId) || null;

        return {
          ...order,
          profile,
          payment,
        };
      });

      // 5. Filtro por nome do cliente (no código)
      let finalOrders = enrichedOrders;
      if (data.search && data.search.trim()) {
        const q = data.search.trim().toLowerCase();
        finalOrders = enrichedOrders.filter((o) => {
          const orderNum = ((o.order_number as string) || "").toLowerCase();
          const prof = o.profile as ProfileData | null;
          const clientName = (prof?.full_name || "").toLowerCase();
          return orderNum.includes(q) || clientName.includes(q);
        });
      }

      return {
        success: true as const,
        orders: finalOrders as unknown as Order[],
        total: count || 0,
        page,
        perPage,
        totalPages: Math.ceil((count || 0) / perPage),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar pedidos";
      console.error("[getAllOrders] Erro:", err);
      return { success: false as const, error: message, orders: [] as Order[], total: 0 };
    }
  });

/* ────────────────────────────────────────────────────────────
   GET ORDER DETAIL (Admin)
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
        .select(`*, items:order_items(*), history:order_status_history(*)`)
        .eq("id", data.orderId)
        .single();

      if (error) throw error;
      if (!order) return { success: false as const, error: "Pedido não encontrado", order: null };

      const orderRecord = order as Record<string, unknown>;

      // Profile
      let profile: ProfileData | null = null;
      try {
        const { data: profileData } = await admin
          .from("profiles")
          .select("id, full_name, email, phone")
          .eq("id", orderRecord.user_id as string)
          .single();
        if (profileData) {
          const p = profileData as Record<string, unknown>;
          profile = {
            id: p.id as string,
            full_name: (p.full_name as string) || "",
            email: (p.email as string) || "",
            phone: (p.phone as string | null) || null,
          };
        }
      } catch {
        // ignore
      }

      // Payments
      let payment: PaymentData | null = null;
      try {
        const { data: paymentsData } = await admin
          .from("order_payments")
          .select("*")
          .eq("order_id", data.orderId)
          .limit(1)
          .single();
        if (paymentsData) {
          const p = paymentsData as Record<string, unknown>;
          payment = {
            id: p.id as string,
            order_id: p.order_id as string,
            method: p.method as string,
            status: p.status as string,
            amount: p.amount as number,
            transaction_id: (p.transaction_id as string | null) || null,
            pix_qr_code: (p.pix_qr_code as string | null) || null,
            pix_expiration: (p.pix_expiration as string | null) || null,
            mercado_pago_id: (p.mercado_pago_id as string | null) || null,
            paid_at: (p.paid_at as string | null) || null,
            refunded_at: (p.refunded_at as string | null) || null,
            created_at: p.created_at as string,
          };
        }
      } catch {
        // ignore
      }

      return {
        success: true as const,
        order: { ...orderRecord, profile, payment } as unknown as Order,
      };
    } catch (err: unknown) {
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
      const { error: updateError } = await admin
        .from("orders")
        .update({ status: data.status, updated_at: new Date().toISOString() })
        .eq("id", data.orderId);

      if (updateError) throw updateError;

      await admin.from("order_status_history").insert({
        order_id: data.orderId,
        status: data.status,
        notes: data.notes || `Status atualizado para ${data.status} pelo admin`,
        created_by: data.adminId,
        created_by_name: data.adminName,
      });

      return { success: true as const };
    } catch (err: unknown) {
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
      const { error: updateError } = await admin
        .from("orders")
        .update({ payment_status: data.paymentStatus, updated_at: new Date().toISOString() })
        .eq("id", data.orderId);

      if (updateError) throw updateError;

      if (data.paymentStatus === "paid") {
        try {
          await admin
            .from("order_payments")
            .update({ status: "paid", paid_at: new Date().toISOString() })
            .eq("order_id", data.orderId);
        } catch (paymentErr) {
          console.warn("[updatePaymentStatus] Erro order_payments:", paymentErr);
        }
      }

      await admin.from("order_status_history").insert({
        order_id: data.orderId,
        status: "pending",
        notes: data.notes || `Pagamento ${data.paymentStatus} pelo admin`,
        created_by: data.adminId,
        created_by_name: data.adminName,
      });

      return { success: true as const };
    } catch (err: unknown) {
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
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", data.orderId);

      if (updateError) throw updateError;

      await admin.from("order_status_history").insert({
        order_id: data.orderId,
        status: "cancelled",
        notes: data.reason || "Cancelado pelo administrador",
        created_by: data.adminId,
        created_by_name: data.adminName,
      });

      return { success: true as const };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao cancelar pedido";
      console.error("[cancelOrderAdmin] Erro:", err);
      return { success: false as const, error: message };
    }
  });