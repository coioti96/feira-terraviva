import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

const fetchClientsSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["all", "active", "vip", "new", "inactive"]).optional().default("all"),
  minSpend: z.number().optional().default(0),
  maxSpend: z.number().optional().default(999999),
});

export const fetchClients = createServerFn({ method: "GET" })
  .validator(fetchClientsSchema)
  .handler(async ({ data }) => {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      throw new Error("Supabase admin não configurado");
    }

    try {
      // 1. Busca todos os profiles (clientes cadastrados)
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, created_at, updated_at, address, number, complement, neighborhood, city, state, cep")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // 2. Busca todos os pedidos para agregar dados
      const { data: orders, error: ordersError } = await supabaseAdmin
        .from("orders")
        .select("id, user_id, total, status, created_at, order_number")
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      // 3. Agrega pedidos por usuário
      const ordersByUser = new Map<string, Array<{ id: string; user_id: string; total: number | null; status: string; created_at: string; order_number: string }>>();
      orders?.forEach((order) => {
        const list = ordersByUser.get(order.user_id) || [];
        list.push(order);
        ordersByUser.set(order.user_id, list);
      });

      // 4. Monta o resultado combinado
      const clients = (profiles || []).map((profile: { id: string; full_name: string | null; email: string | null; phone: string | null; avatar_url: string | null; created_at: string | null; updated_at: string | null; address: string | null; number: string | null; complement: string | null; neighborhood: string | null; city: string | null; state: string | null; cep: string | null }) => {
        const userOrders = ordersByUser.get(profile.id) || [];
        const totalSpent = userOrders.reduce((sum: number, o: { total: number | null }) => sum + (o.total || 0), 0);
        const orderCount = userOrders.length;
        const lastOrder = userOrders[0]?.created_at || null;

        // Determina status do cliente
        let clientStatus: "active" | "vip" | "new" | "inactive" = "inactive";
        if (orderCount === 0) {
          const daysSinceSignup = Math.floor(
            (Date.now() - new Date(profile.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24)
          );
          clientStatus = daysSinceSignup <= 7 ? "new" : "inactive";
        } else if (totalSpent >= 500 || orderCount >= 5) {
          clientStatus = "vip";
        } else {
          clientStatus = "active";
        }

        return {
          ...profile,
          orderCount,
          totalSpent,
          lastOrder,
          status: clientStatus,
          orders: userOrders,
        };
      });

      // 5. Aplica filtros
      let filtered = clients;

      if (data.search?.trim()) {
        const q = data.search.toLowerCase();
        filtered = filtered.filter(
          (c: { full_name?: string | null; email?: string | null; phone?: string | null; city?: string | null; neighborhood?: string | null }) =>
            c.full_name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            c.city?.toLowerCase().includes(q) ||
            c.neighborhood?.toLowerCase().includes(q)
        );
      }

      if (data.status !== "all") {
        filtered = filtered.filter((c: { status: string }) => c.status === data.status);
      }

      filtered = filtered.filter(
        (c: { totalSpent: number }) => c.totalSpent >= data.minSpend && c.totalSpent <= data.maxSpend
      );

      return {
        success: true as const,
        clients: filtered,
        total: clients.length,
      };
    } catch (err) {
      console.error("[fetchClients] Erro:", err);
      return {
        success: false as const,
        clients: [],
        total: 0,
        error: err instanceof Error ? err.message : "Erro ao buscar clientes",
      };
    }
  });