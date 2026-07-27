import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database"; // Gerado pelo supabase gen types

// ─────────────────────────────────────────────────────────────
// ENV VARS
// ─────────────────────────────────────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
) as string | undefined;

// ⚠️ SERVICE_ROLE_KEY — SÓ SERVER-SIDE (sem VITE_ prefix)
// Usar process.env no server, import.meta.env falha silenciosamente
const SUPABASE_SERVICE_KEY =
  (typeof process !== "undefined" && process.env?.SUPABASE_SERVICE_ROLE_KEY) ||
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_SERVICE_ROLE_KEY) ||
  "";

// ─────────────────────────────────────────────────────────────
// VALIDAÇÃO DE CONFIGURAÇÃO
// ─────────────────────────────────────────────────────────────

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (typeof window !== "undefined" && !supabaseConfigured) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados. " +
      "Algumas funcionalidades estarão indisponíveis."
  );
}

// ─────────────────────────────────────────────────────────────
// CLIENTE PÚBLICO (Anon Key) — Usado no frontend
// ─────────────────────────────────────────────────────────────

let _publicClient: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> | null {
  if (!supabaseConfigured) return null;
  if (!_publicClient) {
    _publicClient = createClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
    });
  }
  return _publicClient;
}

export const supabase = getSupabase();

// ─────────────────────────────────────────────────────────────
// CLIENTE ADMIN (Service Role Key) — SÓ SERVER-SIDE
// ─────────────────────────────────────────────────────────────

let _adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> | null {
  // Só executa no servidor (server functions do TanStack Start)
  if (typeof window !== "undefined") {
    console.error("[SupabaseAdmin] getSupabaseAdmin() NÃO pode ser chamado no browser!");
    return null;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn(
      "[SupabaseAdmin] SUPABASE_SERVICE_ROLE_KEY não configurada. " +
        "Server functions que precisam bypassar RLS vão falhar."
    );
    return null;
  }
  if (!_adminClient) {
    _adminClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _adminClient;
}

export const supabaseAdmin = getSupabaseAdmin;

// ─────────────────────────────────────────────────────────────
// HELPERS DE STORAGE
// ─────────────────────────────────────────────────────────────

export function getAvatarUserId(path: string): string | null {
  const parts = path.split("/");
  return parts.length >= 2 ? parts[1] : null;
}

export function generateAvatarPath(userId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `avatars/${userId}/${timestamp}-${random}.${ext}`;
}

export function generateProductImagePath(productId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `products/${productId}/${timestamp}-${random}.${ext}`;
}

export function generateStoreImagePath(type: "logo" | "cover" | "about", fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `store/${type}/${timestamp}-${random}.${ext}`;
}

export function generateCategoryImagePath(categoryId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `categories/${categoryId}/${timestamp}-${random}.${ext}`;
}

// ─────────────────────────────────────────────────────────────
// HELPERS DE URL PÚBLICA
// ─────────────────────────────────────────────────────────────

export function getPublicUrl(bucket: string, path: string): string | null {
  const client = getSupabase();
  if (!client) return null;
  const { data } = client.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ─────────────────────────────────────────────────────────────
// HELPERS DE ERRO
// ─────────────────────────────────────────────────────────────

export function getSupabaseErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as Record<string, unknown>).message);
  }
  return "Erro desconhecido";
}

export function isAuthError(error: unknown): boolean {
  const msg = getSupabaseErrorMessage(error).toLowerCase();
  return (
    msg.includes("jwt") ||
    msg.includes("token") ||
    msg.includes("auth") ||
    msg.includes("session") ||
    msg.includes("unauthorized")
  );
}

// ─────────────────────────────────────────────────────────────
// HELPERS DE REALTIME
// ─────────────────────────────────────────────────────────────

export function subscribeToTable(
  table: string,
  callback: (payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => void,
  filter?: string
): (() => void) | null {
  const client = getSupabase();
  if (!client) return null;

  const channel = client
    .channel(`table-changes-${table}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter },
      (payload) => {
        callback({
          eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
          new: payload.new as Record<string, unknown>,
          old: payload.old as Record<string, unknown>,
        });
      }
    )
    .subscribe();

  return () => { client.removeChannel(channel); };
}