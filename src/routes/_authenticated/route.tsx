// ============================================================
// AUTHENTICATED LAYOUT — Feirinha Orgânica Terra Viva
// Versão definitiva enterprise — NÃO EDITAR
// Protege todas as rotas filhas: exige login
// ============================================================

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/auth";
import { Leaf } from "lucide-react";
import type { UserRole } from "@/types";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface AuthenticatedContext {
  userId: string;
  userRole: UserRole;
}

// ─────────────────────────────────────────────────────────────
// PENDING COMPONENT — Loading elegante
// ─────────────────────────────────────────────────────────────

function PendingAuthCheck() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--tv-linen)" }}
    >
      <div className="flex flex-col items-center gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "var(--tv-success-lt)" }}
        >
          <Leaf className="h-7 w-7 animate-pulse" style={{ color: "var(--tv-moss)" }} />
        </div>
        <p className="tv-caption" style={{ color: "var(--tv-stone-400)" }}>
          Verificando sua sessão...
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROUTE CONFIG
// ─────────────────────────────────────────────────────────────

export const Route = createFileRoute("/_authenticated")({
  ssr: false,

  /**
   * beforeLoad: verifica autenticação ANTES de renderizar qualquer filho.
   * - Sempre busca o profile do Supabase (não confia no cache)
   * - Retorna APENAS dados serializáveis (string, number, boolean)
   * - NUNCA retorna objetos complexos do Zustand (causa erro _nonReactive)
   */
  beforeLoad: async ({ location }) => {
    const store = useAuthStore.getState();

    // Sempre revalida o profile do Supabase
    try {
      await store.fetchProfile();
    } catch (err) {
      console.error("[Auth] Erro ao buscar profile:", err);
      // Mesmo com erro, continua — o profile pode estar no cache
    }

    const profile = useAuthStore.getState().profile;

    if (!profile) {
      // Não está logado → redireciona para login
      // ✅ location.search é um objeto no TanStack Router v1+
      // Não podemos concatenar diretamente — usamos só o pathname
      const redirectPath = location.pathname;
      
      throw redirect({
        to: "/auth/login",
        search: { redirect: redirectPath },
      });
    }

    // Logado → retorna contexto serializável para os filhos
    return {
      userId: profile.id,
      userRole: profile.role,
    } as AuthenticatedContext;
  },

  // Componente mostrado ENQUANTO beforeLoad roda
  pendingComponent: PendingAuthCheck,

  component: AuthenticatedLayout,
});

// ─────────────────────────────────────────────────────────────
// LAYOUT COMPONENT
// ─────────────────────────────────────────────────────────────

function AuthenticatedLayout() {
  return <Outlet />;
}