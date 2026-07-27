// ============================================================
// ADMIN ROUTE — Feirinha Orgânica Terra Viva
// Versão definitiva enterprise — NÃO EDITAR
// Protege /admin: exige login + role = admin
// ============================================================

import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layouts/AdminLayout";
import { useAuthStore } from "@/stores/auth";
import { ShieldAlert } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// PENDING COMPONENT — Loading elegante
// ─────────────────────────────────────────────────────────────

function PendingAdminCheck() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--tv-forest)" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "rgb(255 255 255 / 0.10)" }}
        >
          <ShieldAlert className="h-7 w-7 animate-pulse" style={{ color: "var(--tv-gold)" }} />
        </div>
        <p className="tv-caption" style={{ color: "rgb(255 252 247 / 0.50)" }}>
          Verificando permissões de administrador...
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROUTE CONFIG
// ─────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,

  /**
   * beforeLoad: verifica se usuário é admin ANTES de renderizar.
   * - Sempre revalida o profile (não confia no cache)
   * - Usa contexto do pai _authenticated se disponível
   * - Retorna APENAS dados serializáveis
   */
  beforeLoad: async ({ context }) => {
    const store = useAuthStore.getState();

    // SEMPRE revalida o profile do Supabase
    // O contexto do pai pode ter userId, mas o role pode ter mudado
    try {
      await store.fetchProfile();
    } catch (err) {
      console.error("[Admin] Erro ao revalidar profile:", err);
    }

    const profile = useAuthStore.getState().profile;

    // Não está logado → login com redirect de volta
    if (!profile) {
      throw redirect({
        to: "/auth/login",
        search: { redirect: "/admin" },
      });
    }

    // Não é admin → redireciona para home (não perfil, pode não existir)
    if (profile.role !== "admin") {
      console.warn(`[Admin] Acesso negado para usuário ${profile.email} (role: ${profile.role})`);
      throw redirect({ to: "/" });
    }

    // Admin confirmado → retorna contexto serializável
    return {
      adminId: profile.id,
      adminEmail: profile.email,
    };
  },

  // Componente mostrado ENQUANTO beforeLoad roda
  pendingComponent: PendingAdminCheck,

  component: AdminLayout,
});