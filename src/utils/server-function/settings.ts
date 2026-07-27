// ============================================================
// SERVER FUNCTIONS — Store Settings (bypass RLS)
// Feirinha Orgânica Terra Viva · Enterprise
// ============================================================

import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { StoreSettings } from "@/types";

/* ────────────────────────────────────────────────────────────
   ALLOWED FIELDS — whitelist de campos atualizáveis no banco
   ──────────────────────────────────────────────────────────── */
const ALLOWED_FIELDS: (keyof StoreSettings)[] = [
  "name",
  "slug",
  "description",
  "whatsapp",
  "phone",
  "email",
  "address",
  "logo_url",
  "cover_url",
  "primary_color",
  "secondary_color",
  "opening_hours",
  "delivery_fee",
  "delivery_type",
  "delivery_distance_rates",
  "delivery_time_min",
  "delivery_radius_km",
  "pix_enabled",
  "pix_key",
  "pix_key_type",
  "cash_enabled",
  "card_enabled",
  "mercado_pago_enabled",
  "mercado_pago_access_token",
  "mercado_pago_public_key",
  "mercado_pago_refresh_token",
  "mercado_pago_user_id",
  "about_text",
  "about_images",
];

/* ────────────────────────────────────────────────────────────
   UPDATE SETTINGS — bypass RLS com admin client
   ──────────────────────────────────────────────────────────── */
export const updateSettingsServer = createServerFn({ method: "POST" })
  .validator((data: { id: string; patch: Partial<StoreSettings> }) => data)
  .handler(
    async ({ data }): Promise<{ success: boolean; error?: string }> => {
      const admin = getSupabaseAdmin();
      if (!admin) {
        return { success: false, error: "Serviço indisponível" };
      }

      try {
        const { id, patch } = data;

        // Whitelist: só permite campos que existem no banco
        const payload: Record<string, unknown> = {};
        for (const key of ALLOWED_FIELDS) {
          if (key in patch) {
            payload[key] = patch[key];
          }
        }

        // Não permite sobrescrever campos gerados automaticamente
        delete payload.id;
        delete payload.created_at;
        delete payload.updated_at;

        // Se não tem ID (primeira vez), faz insert. Se tem, update.
        if (!id || id === "") {
          const { error } = await admin
            .from("store_settings")
            .insert({ ...payload });
          if (error) throw error;
        } else {
          const { error } = await admin
            .from("store_settings")
            .update(payload)
            .eq("id", id);
          if (error) throw error;
        }

        return { success: true };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro ao salvar configurações";
        console.error("[updateSettingsServer]", err);
        return { success: false, error: message };
      }
    }
  );

/* ────────────────────────────────────────────────────────────
   UPLOAD STORE IMAGE — bypass RLS no Storage
   ──────────────────────────────────────────────────────────── */
export const uploadStoreImageServer = createServerFn({ method: "POST" })
  .validator(
    (data: {
      type: "logo" | "cover" | "about";
      fileBase64: string;
      fileName: string;
      contentType: string;
    }) => data
  )
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; publicUrl?: string; error?: string }> => {
      const admin = getSupabaseAdmin();
      if (!admin) {
        return { success: false, error: "Serviço indisponível" };
      }

      try {
        const { type, fileBase64, fileName, contentType } = data;

        // Validações
        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
        if (!allowedTypes.includes(contentType)) {
          return { success: false, error: "Formato inválido. Use PNG, JPG ou WEBP." };
        }

        // Decodifica base64 para Buffer
        const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Limite de 5MB
        const maxSize = 5 * 1024 * 1024;
        if (buffer.length > maxSize) {
          return { success: false, error: "Imagem muito grande. Máx. 5MB." };
        }

        // Gera path único
        const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const path = `store/${type}/${timestamp}-${random}.${ext}`;

        // Upload com admin client (bypass RLS)
        const { error: uploadError } = await admin.storage
          .from("store")
          .upload(path, buffer, {
            contentType,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // URL pública
        const {
          data: { publicUrl },
        } = admin.storage.from("store").getPublicUrl(path);

        return { success: true, publicUrl };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Erro no upload da imagem";
        console.error("[uploadStoreImageServer]", err);
        return { success: false, error: message };
      }
    }
  );