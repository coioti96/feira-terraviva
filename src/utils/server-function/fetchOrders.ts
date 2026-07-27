import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

const fetchOrdersSchema = z.object({
  search: z.string().optional().default(""),
  status: z.string().optional().default("all"),
  period: z.enum(["today", "yesterday", "week", "all"]).optional().default("all"),
  payment_method: z.string().optional().default("all"),
  sort_by: z.enum(["created_at", "total", "status", "order_number"]).optional().default("created_at"),
  sort_order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const fetchOrders = createServerFn({ method: "GET" })
  .validator(fetchOrdersSchema)
  .handler(async ({ data }) => {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        throw new Error("Supabase admin não configurado");
      }

      // Build query
      let query = supabaseAdmin
        .from("orders")
        .select(`
          *,
          order_items(*),
          order_status_history(*)
        `);

      // Period filter
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();

      switch (data.period) {
        case "today":
          query = query.gte("created_at", startOfDay);
          break;
        case "yesterday":
          query = query.gte("created_at", startOfYesterday).lt("created_at", startOfDay);
          break;
        case "week":
          query = query.gte("created_at", startOfWeek);
          break;
      }

      // Status filter
      if (data.status !== "all") {
        query = query.eq("status", data.status);
      }

      // Payment method filter
      if (data.payment_method !== "all") {
        query = query.eq("payment_method", data.payment_method);
      }

      // Search
      if (data.search?.trim()) {
        const q = data.search.trim();
        query = query.or(`order_number.ilike.%${q}%,user_name.ilike.%${q}%`);
      }

      // Sort
      query = query.order(data.sort_by, { ascending: data.sort_order === "asc" });

      const { data: orders, error } = await query;

      if (error) throw error;

      return {
        success: true as const,
        orders: orders || [],
        total: orders?.length || 0,
      };
    } catch (err) {
      console.error("[fetchOrders] Erro:", err);
      return {
        success: false as const,
        orders: [],
        total: 0,
        error: err instanceof Error ? err.message : "Erro ao buscar pedidos",
      };
    }
  });