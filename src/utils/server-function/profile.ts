// ============================================================
// PROFILE SERVER FUNCTIONS — Feirinha Orgânica Terra Viva
// Enterprise: updateProfile, changePassword, getUserStats
// ============================================================

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────
// UPDATE PROFILE
// ─────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  userId: z.string().uuid(),
  patch: z.object({
    full_name: z.string().min(1).max(200).optional(),
    phone: z.string().max(20).nullable().optional(),
    avatar_url: z.string().url().nullable().optional(),
    cep: z.string().max(9).nullable().optional(),
    address: z.string().max(300).nullable().optional(),
    number: z.string().max(20).nullable().optional(),
    complement: z.string().max(100).nullable().optional(),
    neighborhood: z.string().max(100).nullable().optional(),
    city: z.string().max(100).nullable().optional(),
    state: z.string().max(2).nullable().optional(),
  }),
});

export const updateProfile = createServerFn({ method: "POST" })
  .validator((data: unknown) => updateProfileSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { userId, patch } = data;
      const supabaseAdmin = getSupabaseAdmin();

      if (!supabaseAdmin) {
        return { success: false, error: "Supabase admin não configurado" };
      }

      // Remove campos undefined para não sobrescrever dados existentes
      const cleanPatch = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined)
      );

      if (Object.keys(cleanPatch).length === 0) {
        return { success: false, error: "Nenhum dado para atualizar" };
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          ...cleanPatch,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) {
        console.error("[updateProfile] Supabase error:", error);
        return { success: false, error: "Erro ao atualizar perfil: " + error.message };
      }

      return { success: true };
    } catch (err) {
      console.error("[updateProfile] Unexpected error:", err);
      return { success: false, error: "Erro inesperado ao atualizar perfil" };
    }
  });

// ─────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// ─────────────────────────────────────────────────────────────
// NOTA: A alteração de senha é feita 100% client-side via
// supabase.auth.updateUser() após reautenticação.
// Esta server function só valida os dados.
// ─────────────────────────────────────────────────────────────

const changePasswordSchema = z.object({
  newPassword: z.string().min(6).max(128),
});

export const changePassword = createServerFn({ method: "POST" })
  .validator((data: unknown) => changePasswordSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      // Validação já feita pelo zod
      return {
        success: true,
        message: "Senha validada. Use supabase.auth.updateUser({ password }) no client.",
      };
    } catch (err) {
      console.error("[changePassword] Error:", err);
      return { success: false, error: "Erro ao validar nova senha" };
    }
  });

// ─────────────────────────────────────────────────────────────
// GET USER STATS
// ─────────────────────────────────────────────────────────────

interface OrderStats {
  status: string;
  total: number;
}

const getUserStatsSchema = z.object({
  userId: z.string().uuid(),
});

export const getUserStats = createServerFn({ method: "POST" })
  .validator((data: unknown) => getUserStatsSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { userId } = data;
      const supabaseAdmin = getSupabaseAdmin();

      if (!supabaseAdmin) {
        return { success: false, error: "Supabase admin não configurado" };
      }

      const { data: orders, error } = await supabaseAdmin
        .from("orders")
        .select("status, total")
        .eq("user_id", userId);

      if (error) {
        return { success: false, error: error.message };
      }

      const typedOrders: OrderStats[] = orders || [];
      const totalOrders = typedOrders.length;
      const totalSpent = typedOrders.reduce((sum: number, o: OrderStats) => sum + (o.total || 0), 0);
      const delivered = typedOrders.filter((o: OrderStats) => o.status === "delivered").length;

      return {
        success: true,
        stats: { totalOrders, totalSpent, delivered },
      };
    } catch (err) {
      console.error("[getUserStats] Error:", err);
      return { success: false, error: "Erro ao buscar estatísticas" };
    }
  });