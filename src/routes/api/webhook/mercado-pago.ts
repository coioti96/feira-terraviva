// ============================================================
// API ROUTE — Mercado Pago Webhook
// Feirinha Orgânica Terra Viva · Enterprise
// ============================================================

import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseAdmin } from "@/lib/supabase";

const MP_API_URL = "https://api.mercadopago.com";

export const Route = createFileRoute("/api/webhook/mercado-pago")({
  beforeLoad: () => {
    // API route — não precisa de auth
    return {};
  },
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();

          console.log("[MP Webhook] Notificação recebida:", {
            type: body.type,
            action: body.action,
            data_id: body.data?.id,
          });

          const topic = body.type || body.topic;
          const paymentId = body.data?.id;

          if (!paymentId) {
            return new Response(
              JSON.stringify({ success: false, error: "payment_id ausente" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          if (topic !== "payment") {
            return new Response(
              JSON.stringify({ success: true, message: "Ignorado — não é payment" }),
              { status: 200, headers: { "Content-Type": "application/json" } }
            );
          }

          const admin = getSupabaseAdmin();
          if (!admin) {
            return new Response(
              JSON.stringify({ success: false, error: "Serviço indisponível" }),
              { status: 500, headers: { "Content-Type": "application/json" } }
            );
          }

          const { data: settings } = await admin
            .from("store_settings")
            .select("mercado_pago_access_token")
            .single();

          if (!settings?.mercado_pago_access_token) {
            return new Response(
              JSON.stringify({ success: false, error: "MP não configurado" }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          const mpRes = await fetch(`${MP_API_URL}/v1/payments/${paymentId}`, {
            headers: {
              Authorization: `Bearer ${settings.mercado_pago_access_token}`,
            },
          });

          if (!mpRes.ok) {
            const errText = await mpRes.text();
            throw new Error(`MP API error: ${errText}`);
          }

          const payment = await mpRes.json();

          const statusMap: Record<string, string> = {
            approved: "paid",
            pending: "pending",
            in_process: "pending",
            rejected: "failed",
            cancelled: "cancelled",
            refunded: "refunded",
            charged_back: "refunded",
          };

          const paymentStatus = statusMap[payment.status] || "pending";

          await admin
            .from("order_payments")
            .update({
              status: paymentStatus,
              paid_at: payment.status === "approved" ? new Date().toISOString() : null,
            })
            .eq("mercado_pago_id", String(paymentId));

          if (payment.external_reference) {
            await admin
              .from("orders")
              .update({
                payment_status: paymentStatus,
                status: payment.status === "approved" ? "confirmed" : undefined,
                updated_at: new Date().toISOString(),
              })
              .eq("id", payment.external_reference);

            if (payment.status === "approved") {
              await admin.from("order_status_history").insert({
                order_id: payment.external_reference,
                status: "confirmed",
                notes: "Pagamento confirmado via Mercado Pago PIX",
              });
            }
          }

          return new Response(
            JSON.stringify({ success: true, processed: true }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erro no webhook";
          console.error("[MP Webhook] Erro:", err);
          return new Response(
            JSON.stringify({ success: false, error: message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      },
    },
  },
});