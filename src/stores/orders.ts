// ============================================================
// STORE — Admin Orders (Zustand)
// Feirinha Orgânica Terra Viva · Enterprise
// ============================================================

import { create } from "zustand";
import {
  getAllOrders,
  getOrderDetailAdmin,
  updateOrderStatus,
  updatePaymentStatus,
  cancelOrderAdmin,
} from "@/utils/server-function/admin-orders";
import type { Order, OrderStatus, PaymentStatus } from "@/types";

/* ────────────────────────────────────────────────────────────
   STATE INTERFACE
   ──────────────────────────────────────────────────────────── */
interface AdminOrdersState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;

  fetchOrders: (params?: {
    status?: string | null;
    paymentStatus?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    search?: string | null;
    page?: number;
    perPage?: number;
  }) => Promise<void>;

  updateStatus: (
    orderId: string,
    status: OrderStatus,
    adminId: string,
    adminName: string,
    notes?: string | null
  ) => Promise<boolean>;

  updatePayment: (
    orderId: string,
    paymentStatus: PaymentStatus,
    adminId: string,
    adminName: string,
    notes?: string | null
  ) => Promise<boolean>;

  cancelOrder: (
    orderId: string,
    adminId: string,
    adminName: string,
    reason?: string | null
  ) => Promise<boolean>;

  refreshOrders: () => Promise<void>;
}

/* ────────────────────────────────────────────────────────────
   STORE
   ──────────────────────────────────────────────────────────── */
export const useAdminOrdersStore = create<AdminOrdersState>()((set, get) => ({
  orders: [],
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  perPage: 50,
  totalPages: 0,

  async fetchOrders(params = {}) {
    set({ isLoading: true, error: null });
    try {
      const result = await getAllOrders({
        data: {
          status: params.status ?? null,
          paymentStatus: params.paymentStatus ?? null,
          dateFrom: params.dateFrom ?? null,
          dateTo: params.dateTo ?? null,
          search: params.search ?? null,
          page: params.page ?? 1,
          perPage: params.perPage ?? 50,
        },
      });

      if (result.success) {
        set({
          orders: (result.orders as Order[]) ?? [],
          total: result.total ?? 0,
          page: result.page ?? 1,
          perPage: result.perPage ?? 50,
          totalPages: result.totalPages ?? 0,
        });
      } else {
        set({
          error: result.error || "Erro ao carregar pedidos",
          orders: [],
          total: 0,
          totalPages: 0,
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar pedidos";
      set({ error: message, orders: [], total: 0, totalPages: 0 });
    } finally {
      set({ isLoading: false });
    }
  },

  async updateStatus(orderId, status, adminId, adminName, notes) {
    try {
      const result = await updateOrderStatus({
        data: { orderId, status, adminId, adminName, notes: notes ?? null },
      });
      if (result.success) {
        await get().refreshOrders();
        return true;
      }
      set({ error: result.error || "Erro ao atualizar status" });
      return false;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao atualizar status";
      set({ error: message });
      return false;
    }
  },

  async updatePayment(orderId, paymentStatus, adminId, adminName, notes) {
    try {
      const result = await updatePaymentStatus({
        data: {
          orderId,
          paymentStatus,
          adminId,
          adminName,
          notes: notes ?? null,
        },
      });
      if (result.success) {
        await get().refreshOrders();
        return true;
      }
      set({ error: result.error || "Erro ao atualizar pagamento" });
      return false;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao atualizar pagamento";
      set({ error: message });
      return false;
    }
  },

  async cancelOrder(orderId, adminId, adminName, reason) {
    try {
      const result = await cancelOrderAdmin({
        data: {
          orderId,
          adminId,
          adminName,
          reason: reason ?? null,
        },
      });
      if (result.success) {
        await get().refreshOrders();
        return true;
      }
      set({ error: result.error || "Erro ao cancelar pedido" });
      return false;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao cancelar pedido";
      set({ error: message });
      return false;
    }
  },

  async refreshOrders() {
    await get().fetchOrders();
  },
}));