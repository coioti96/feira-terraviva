// ============================================================
// API ROUTE — Mercado Pago OAuth Callback
// Feirinha Orgânica Terra Viva · Enterprise
// ============================================================

import { createFileRoute } from "@tanstack/react-router";
import { exchangeMercadoPagoCode } from "@/utils/server-function/mercado-pago";

export const Route = createFileRoute("/api/mercado-pago/callback")({
  beforeLoad: () => {
    // API route — não precisa de auth
    return {};
  },
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");

        if (error) {
          console.error("[MP Callback] Erro do MP:", error, errorDescription);
          return new Response(
            JSON.stringify({
              success: false,
              error: errorDescription || "Autorização negada pelo Mercado Pago",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        if (!code || !state) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Parâmetros code ou state ausentes",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        const result = await exchangeMercadoPagoCode({ data: { code, state } });

        if (!result.success) {
          return new Response(
            JSON.stringify({
              success: false,
              error: result.error || "Erro na autenticação",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: "/admin/configuracoes?tab=payments&mp=connected",
          },
        });
      },
    },
  },
});