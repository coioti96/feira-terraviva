import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Coupon, CouponInput } from "@/types";

// ─────────────────────────────────────────────────────────────
// LISTAR CUPONS (com filtros e busca)
// ─────────────────────────────────────────────────────────────

interface ListCouponsInput {
  search?: string;
  status?: "active" | "inactive" | "expired" | "exhausted" | "future" | "all";
  type?: "percentage" | "fixed" | "all";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const listCoupons = createServerFn({ method: "GET" })
  .validator((data: ListCouponsInput) => data)
  .handler(async ({ data }): Promise<{ success: boolean; coupons: Coupon[]; error?: string }> => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false, coupons: [], error: "Serviço indisponível" };
    }

    try {
      let query = admin.from("coupons").select("*");

      // Busca por código
      if (data.search?.trim()) {
        query = query.ilike("code", `%${data.search.trim()}%`);
      }

      // Filtro por tipo
      if (data.type && data.type !== "all") {
        query = query.eq("type", data.type);
      }

      // Ordenação
      const sortBy = data.sortBy || "created_at";
      const sortOrder = data.sortOrder || "desc";
      query = query.order(sortBy, { ascending: sortOrder === "asc" });

      const { data: coupons, error } = await query;

      if (error) throw error;

      // Filtro por status (computado no servidor)
      let result = (coupons || []) as Coupon[];
      const now = new Date();

      if (data.status && data.status !== "all") {
        result = result.filter((c) => {
          const startDate = c.start_date ? new Date(c.start_date) : null;
          const endDate = c.end_date ? new Date(c.end_date) : null;
          const isExpired = endDate ? now > endDate : false;
          const isFuture = startDate ? now < startDate : false;
          const isExhausted = c.max_uses > 0 && c.current_uses >= c.max_uses;

          switch (data.status) {
            case "active":
              return c.is_active && !isExpired && !isExhausted && !isFuture;
            case "inactive":
              return !c.is_active;
            case "expired":
              return isExpired;
            case "exhausted":
              return isExhausted;
            case "future":
              return isFuture;
            default:
              return true;
          }
        });
      }

      return { success: true, coupons: result };
    } catch (err) {
      console.error("[listCoupons] Erro:", err);
      return {
        success: false,
        coupons: [],
        error: err instanceof Error ? err.message : "Erro ao listar cupons",
      };
    }
  });

// ─────────────────────────────────────────────────────────────
// CRIAR CUPOM
// ─────────────────────────────────────────────────────────────

export const createCoupon = createServerFn({ method: "POST" })
  .validator((data: CouponInput) => data)
  .handler(async ({ data }): Promise<{ success: boolean; coupon?: Coupon; error?: string }> => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false, error: "Serviço indisponível" };
    }

    try {
      // Validações server-side
      if (!data.code || data.code.trim().length < 3) {
        return { success: false, error: "Código deve ter pelo menos 3 caracteres" };
      }
      if (data.value <= 0) {
        return { success: false, error: "Valor do desconto deve ser maior que zero" };
      }
      if (data.type === "percentage" && data.value > 100) {
        return { success: false, error: "Desconto percentual não pode exceder 100%" };
      }
      if (new Date(data.end_date) <= new Date(data.start_date)) {
        return { success: false, error: "Data de término deve ser posterior à data de início" };
      }

      const payload = {
        code: data.code.trim().toUpperCase(),
        type: data.type,
        value: data.value,
        max_uses: data.max_uses ?? 0,
        current_uses: 0,
        min_purchase: data.min_purchase ?? 0,
        start_date: data.start_date,
        end_date: data.end_date,
        applicable_categories: data.applicable_categories ?? [],
        applicable_products: data.applicable_products ?? [],
        is_active: data.is_active ?? true,
      };

      const { data: coupon, error } = await admin
        .from("coupons")
        .insert([payload])
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return { success: false, error: "Já existe um cupom com este código" };
        }
        throw error;
      }

      return { success: true, coupon: coupon as Coupon };
    } catch (err) {
      console.error("[createCoupon] Erro:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao criar cupom",
      };
    }
  });

// ─────────────────────────────────────────────────────────────
// ATUALIZAR CUPOM
// ─────────────────────────────────────────────────────────────

interface UpdateCouponInput {
  id: string;
  patch: Partial<CouponInput>;
}

export const updateCoupon = createServerFn({ method: "POST" })
  .validator((data: UpdateCouponInput) => data)
  .handler(async ({ data }): Promise<{ success: boolean; coupon?: Coupon; error?: string }> => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false, error: "Serviço indisponível" };
    }

    try {
      const { id, patch } = data;

      // Validações se estiver atualizando datas
      if (patch.start_date && patch.end_date) {
        if (new Date(patch.end_date) <= new Date(patch.start_date)) {
          return { success: false, error: "Data de término deve ser posterior à data de início" };
        }
      }

      // Validações se estiver atualizando valor
      if (patch.value !== undefined) {
        if (patch.value <= 0) {
          return { success: false, error: "Valor do desconto deve ser maior que zero" };
        }
        if (patch.type === "percentage" && patch.value > 100) {
          return { success: false, error: "Desconto percentual não pode exceder 100%" };
        }
      }

      const payload: Record<string, unknown> = {};
      const allowedFields = [
        "code", "type", "value", "max_uses", "min_purchase",
        "start_date", "end_date", "applicable_categories",
        "applicable_products", "is_active",
      ] as const;

      for (const key of allowedFields) {
        if (key in patch) {
          payload[key] = patch[key as keyof typeof patch];
        }
      }

      payload.updated_at = new Date().toISOString();

      const { data: coupon, error } = await admin
        .from("coupons")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          return { success: false, error: "Já existe um cupom com este código" };
        }
        throw error;
      }

      return { success: true, coupon: coupon as Coupon };
    } catch (err) {
      console.error("[updateCoupon] Erro:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao atualizar cupom",
      };
    }
  });

// ─────────────────────────────────────────────────────────────
// DELETAR CUPOM
// ─────────────────────────────────────────────────────────────

export const deleteCoupon = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false, error: "Serviço indisponível" };
    }

    try {
      const { error } = await admin.from("coupons").delete().eq("id", data.id);
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("[deleteCoupon] Erro:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao deletar cupom",
      };
    }
  });

// ─────────────────────────────────────────────────────────────
// EXPORTAR CUPONS PARA CSV
// ─────────────────────────────────────────────────────────────

export const exportCouponsCsv = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ success: boolean; csv?: string; error?: string }> => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false, error: "Serviço indisponível" };
    }

    try {
      const { data: coupons, error } = await admin
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (coupons || []) as Coupon[];
      const headers = ["Código", "Tipo", "Valor", "Usos", "Máx. Usos", "Mín. Compra", "Início", "Fim", "Ativo"];
      const csvRows = [headers.join(",")];

      for (const c of rows) {
        csvRows.push([
          c.code,
          c.type === "percentage" ? "Percentual" : "Fixo",
          c.value,
          c.current_uses,
          c.max_uses,
          c.min_purchase || 0,
          c.start_date ? new Date(c.start_date).toLocaleDateString("pt-BR") : "-",
          c.end_date ? new Date(c.end_date).toLocaleDateString("pt-BR") : "-",
          c.is_active ? "Sim" : "Não",
        ].join(","));
      }

      return { success: true, csv: csvRows.join("\n") };
    } catch (err) {
      console.error("[exportCouponsCsv] Erro:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Erro ao exportar cupons",
      };
    }
  });