// ============================================================
// SERVER FUNCTIONS — Mercado Pago OAuth & PIX
// Feirinha Orgânica Terra Viva · Enterprise
// ============================================================

import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { StoreSettings } from "@/types";

// ── ENV VARS ───────────────────────────────────────────────
const MP_CLIENT_ID = process.env.MERCADO_PAGO_CLIENT_ID || "";
const MP_CLIENT_SECRET = process.env.MERCADO_PAGO_CLIENT_SECRET || "";
const MP_WEBHOOK_SECRET = process.env.MERCADO_PAGO_WEBHOOK_SECRET || "";

const MP_AUTH_URL = "https://api.mercadopago.com/oauth/token";
const MP_API_URL = "https://api.mercadopago.com";

// ── TYPES ──────────────────────────────────────────────────

interface MPTokenResponse {
  access_token: string;
  refresh_token: string;
  public_key: string;
  user_id: number;
  expires_in: number;
  token_type: string;
}

interface MPUserResponse {
  id: number;
  nickname: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface SettingsWithOAuth extends StoreSettings {
  mercado_pago_state: string | null;
  mercado_pago_state_expires: string | null;
}

export interface MPConnectionStatus {
  connected: boolean;
  account_name?: string;
  account_email?: string;
}

export interface MPQrCodeResponse {
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string;
  payment_id: string;
  expiration_date: string;
}

// ── HELPERS ──────────────────────────────────────────────

function generateState(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getBaseUrl(): string {
  // Domínio fixo — evita problema com VERCEL_URL interno
  if (process.env.VERCEL_URL?.includes("localhost")) {
    return "http://localhost:8080";
  }
  return "https://feiraterraviva.vercel.app";
}

function getBasicAuthHeader(): string {
  const credentials = btoa(`${MP_CLIENT_ID}:${MP_CLIENT_SECRET}`);
  return `Basic ${credentials}`;
}

async function getSettingsWithOAuth(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const { data, error } = await admin.from("store_settings").select("*").single();
  if (error || !data) return null;
  return data as SettingsWithOAuth;
}

// ── 1. GERAR URL DE AUTORIZAÇÃO ────────────────────────────

export const getMercadoPagoAuthUrl = createServerFn({ method: "POST" })
  .handler(async (): Promise<{ url: string; state: string; error?: string }> => {
    if (!MP_CLIENT_ID) {
      return { url: "", state: "", error: "MERCADO_PAGO_CLIENT_ID não configurado" };
    }

    const admin = getSupabaseAdmin();
    if (!admin) {
      return { url: "", state: "", error: "Serviço indisponível" };
    }

    const state = generateState();
    const redirectUri = `${getBaseUrl()}/api/mercado-pago/callback`;

    const { data: settings } = await admin.from("store_settings").select("id").single();
    if (!settings?.id) {
      return { url: "", state: "", error: "Configurações não encontradas" };
    }

    await admin.from("store_settings").update({
      mercado_pago_state: state,
      mercado_pago_state_expires: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    }).eq("id", settings.id);

    const params = new URLSearchParams({
      client_id: MP_CLIENT_ID,
      response_type: "code",
      platform_id: "mp",
      redirect_uri: redirectUri,
      state,
    });

    return {
      url: `https://auth.mercadopago.com.br/authorization?${params.toString()}`,
      state,
    };
  });

// ── 2. TROCAR CODE POR TOKENS ─────────────────────────────

export const exchangeMercadoPagoCode = createServerFn({ method: "POST" })
  .validator((data: { code: string; state: string }) => data)
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    const { code, state } = data;
    const admin = getSupabaseAdmin();
    if (!admin) return { success: false, error: "Serviço indisponível" };

    try {
      const settings = await getSettingsWithOAuth(admin);
      if (!settings || settings.mercado_pago_state !== state) {
        return { success: false, error: "State inválido ou expirado" };
      }

      await admin.from("store_settings").update({
        mercado_pago_state: null,
        mercado_pago_state_expires: null,
      }).eq("id", settings.id);

      const redirectUri = `${getBaseUrl()}/api/mercado-pago/callback`;

      // Log para debug (aparece nos logs do Vercel)
      console.log("[exchangeMercadoPagoCode] Trocando code por token...");
      console.log("[exchangeMercadoPagoCode] Client ID:", MP_CLIENT_ID.slice(0, 8) + "...");
      console.log("[exchangeMercadoPagoCode] Redirect URI:", redirectUri);

      const tokenRes = await fetch(MP_AUTH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": getBasicAuthHeader(),
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      console.log("[exchangeMercadoPagoCode] Status:", tokenRes.status);

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("[exchangeMercadoPagoCode] Erro MP:", errText.slice(0, 500));
        throw new Error(`MP Token error (${tokenRes.status}): ${errText.slice(0, 200)}`);
      }

      const tokenData = (await tokenRes.json()) as MPTokenResponse;
      console.log("[exchangeMercadoPagoCode] Token obtido! User ID:", tokenData.user_id);

      const userRes = await fetch(`${MP_API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      let accountName = "Conta Mercado Pago";
      let accountEmail = "";

      if (userRes.ok) {
        const userData = (await userRes.json()) as MPUserResponse;
        accountName = `${userData.first_name} ${userData.last_name}`.trim() || userData.nickname;
        accountEmail = userData.email;
      }

      const { error: updateError } = await admin.from("store_settings").update({
        mercado_pago_enabled: true,
        mercado_pago_access_token: tokenData.access_token,
        mercado_pago_public_key: tokenData.public_key,
        mercado_pago_refresh_token: tokenData.refresh_token,
        mercado_pago_user_id: String(tokenData.user_id),
      }).eq("id", settings.id);

      if (updateError) {
        console.error("[exchangeMercadoPagoCode] Erro Supabase:", updateError);
        throw updateError;
      }

      console.log("[exchangeMercadoPagoCode] Sucesso! Conta:", accountName);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro na autenticação";
      console.error("[exchangeMercadoPagoCode] Erro:", err);
      return { success: false, error: message };
    }
  });

// ── 3. STATUS DA CONEXÃO ─────────────────────────────────

export const getMercadoPagoStatus = createServerFn({ method: "POST" })
  .handler(async (): Promise<MPConnectionStatus & { error?: string }> => {
    const admin = getSupabaseAdmin();
    if (!admin) return { connected: false, error: "Serviço indisponível" };

    const settings = await getSettingsWithOAuth(admin);
    if (!settings || !settings.mercado_pago_access_token) {
      return { connected: false };
    }

    try {
      const res = await fetch(`${MP_API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${settings.mercado_pago_access_token}` },
      });

      if (!res.ok) {
        const refreshed = await refreshMercadoPagoToken(admin, settings);
        if (!refreshed) {
          await disconnectMercadoPagoInternal(admin, settings.id);
          return { connected: false };
        }
      }

      const userData = (await res.json()) as MPUserResponse;
      return {
        connected: true,
        account_name: `${userData.first_name} ${userData.last_name}`.trim() || userData.nickname,
        account_email: userData.email,
      };
    } catch {
      return { connected: true };
    }
  });

// ── 4. DESCONECTAR ─────────────────────────────────────────

export const disconnectMercadoPago = createServerFn({ method: "POST" })
  .handler(async (): Promise<{ success: boolean; error?: string }> => {
    const admin = getSupabaseAdmin();
    if (!admin) return { success: false, error: "Serviço indisponível" };

    const settings = await getSettingsWithOAuth(admin);
    if (!settings) return { success: false, error: "Configurações não encontradas" };

    return disconnectMercadoPagoInternal(admin, settings.id);
  });

async function disconnectMercadoPagoInternal(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  settingsId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await admin.from("store_settings").update({
      mercado_pago_enabled: false,
      mercado_pago_access_token: null,
      mercado_pago_public_key: null,
      mercado_pago_refresh_token: null,
      mercado_pago_user_id: null,
      mercado_pago_state: null,
      mercado_pago_state_expires: null,
    }).eq("id", settingsId);

    if (error) throw error;
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao desconectar";
    return { success: false, error: message };
  }
}

// ── 5. REFRESH TOKEN ───────────────────────────────────────

async function refreshMercadoPagoToken(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  settings: SettingsWithOAuth
): Promise<boolean> {
  if (!settings.mercado_pago_refresh_token) return false;

  try {
    const res = await fetch(MP_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": getBasicAuthHeader(),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: settings.mercado_pago_refresh_token,
      }),
    });

    if (!res.ok) return false;

    const data = (await res.json()) as MPTokenResponse;

    await admin.from("store_settings").update({
      mercado_pago_access_token: data.access_token,
      mercado_pago_refresh_token: data.refresh_token,
      mercado_pago_public_key: data.public_key,
    }).eq("id", settings.id);

    return true;
  } catch (err) {
    console.error("[refreshMercadoPagoToken]", err);
    return false;
  }
}

// ── 6. CRIAR PIX (QR Code) ─────────────────────────────────

export const createMercadoPagoPix = createServerFn({ method: "POST" })
  .validator((data: {
    orderId: string;
    amount: number;
    description: string;
    payerEmail: string;
    payerCpf?: string;
  }) => data)
  .handler(async ({ data }): Promise<{
    success: boolean;
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    paymentId?: string;
    error?: string;
  }> => {
    const admin = getSupabaseAdmin();
    if (!admin) return { success: false, error: "Serviço indisponível" };

    const settings = await getSettingsWithOAuth(admin);
    if (!settings?.mercado_pago_access_token) {
      return { success: false, error: "Mercado Pago não conectado" };
    }

    const tokenValid = await validateAndRefreshToken(admin, settings);
    if (!tokenValid) {
      return { success: false, error: "Token do Mercado Pago expirado. Reconecte." };
    }

    try {
      const { orderId, amount, description, payerEmail, payerCpf } = data;

      const body = {
        transaction_amount: amount,
        description: description.slice(0, 60),
        payment_method_id: "pix",
        notification_url: `${getBaseUrl()}/api/webhook/mercado-pago`,
        external_reference: orderId,
        payer: {
          email: payerEmail,
          ...(payerCpf && {
            identification: { type: "CPF", number: payerCpf.replace(/\D/g, "") },
          }),
        },
      };

      const res = await fetch(`${MP_API_URL}/v1/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.mercado_pago_access_token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": orderId,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`MP Payment error: ${err}`);
      }

      const payment = await res.json();

      const { error: paymentError } = await admin.from("order_payments").insert({
        order_id: orderId,
        method: "mercado_pago",
        status: "pending",
        amount,
        mercado_pago_id: String(payment.id),
        pix_qr_code: payment.point_of_interaction?.transaction_data?.qr_code || null,
        pix_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });

      if (paymentError) console.warn("[createMercadoPagoPix] Erro ao salvar payment:", paymentError);

      return {
        success: true,
        qrCode: payment.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
        ticketUrl: payment.point_of_interaction?.transaction_data?.ticket_url,
        paymentId: String(payment.id),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar PIX";
      console.error("[createMercadoPagoPix]", err);
      return { success: false, error: message };
    }
  });

// ── 7. CHECK PIX PAYMENT STATUS ─────────────────────────────

interface PixPaymentStatus {
  success: boolean;
  status?: string;
  orderStatus?: string;
  payment?: {
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
  } | null;
  error?: string;
}

export const checkPixPaymentStatus = createServerFn({ method: "POST" })
  .validator((data: { orderId: string; userId: string }) => data)
  .handler(async ({ data }): Promise<PixPaymentStatus> => {
    const admin = getSupabaseAdmin();
    if (!admin) {
      return { success: false, error: "Serviço indisponível" };
    }

    try {
      const { data: order, error } = await admin
        .from("orders")
        .select("payment_status, status, payment:order_payments(*)")
        .eq("id", data.orderId)
        .eq("user_id", data.userId)
        .single();

      if (error || !order) {
        return { success: false, error: "Pedido não encontrado" };
      }

      const paymentData = order.payment as Array<{
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
      }> | null;

      const firstPayment = paymentData?.[0] ?? null;

      return {
        success: true,
        status: order.payment_status,
        orderStatus: order.status,
        payment: firstPayment,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao verificar pagamento";
      console.error("[checkPixPaymentStatus]", err);
      return { success: false, error: message };
    }
  });

// ── 8. VALIDAR WEBHOOK ─────────────────────────────────────

export const validateMercadoPagoWebhook = createServerFn({ method: "POST" })
  .validator((data: { signature: string; requestId: string; body: string }) => data)
  .handler(async ({ data }): Promise<{ valid: boolean }> => {
    if (!MP_WEBHOOK_SECRET) return { valid: true };

    try {
      const { requestId } = data;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return { valid: uuidRegex.test(requestId) };
    } catch {
      return { valid: false };
    }
  });

// ── HELPERS INTERNOS ───────────────────────────────────────

async function validateAndRefreshToken(
  admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  settings: SettingsWithOAuth
): Promise<boolean> {
  if (!settings.mercado_pago_access_token) return false;

  const res = await fetch(`${MP_API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${settings.mercado_pago_access_token}` },
  });

  if (res.ok) return true;

  return refreshMercadoPagoToken(admin, settings);
}