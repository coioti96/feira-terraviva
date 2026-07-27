import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import {
  updateSettingsServer,
  uploadStoreImageServer,
} from "@/utils/server-function/settings";
import type { StoreSettings } from "@/types";

const DEFAULT_SETTINGS: StoreSettings = {
  id: "",
  name: "Feirinha Orgânica - Terra Viva",
  description: "Produtos orgânicos frescos da terra para sua mesa",
  whatsapp: null,
  phone: null,
  email: null,
  address: null,
  logo_url: null,
  cover_url: null,
  primary_color: "#059669",
  secondary_color: "#d97706",
  opening_hours: {
    monday: { open: "08:00", close: "18:00", closed: false },
    tuesday: { open: "08:00", close: "18:00", closed: false },
    wednesday: { open: "08:00", close: "18:00", closed: false },
    thursday: { open: "08:00", close: "18:00", closed: false },
    friday: { open: "08:00", close: "18:00", closed: false },
    saturday: { open: "08:00", close: "14:00", closed: false },
    sunday: { open: "", close: "", closed: true },
  },
  delivery_fee: 0,
  delivery_type: "fixed",
  delivery_distance_rates: [],
  delivery_time_min: 30,
  delivery_radius_km: 5,
  pix_enabled: false,
  pix_key: null,
  pix_key_type: null,
  cash_enabled: true,
  card_enabled: true,
  mercado_pago_access_token: null,
  mercado_pago_public_key: null,
  mercado_pago_refresh_token: null,
  mercado_pago_user_id: null,
  about_text: null,
  about_images: null,
  created_at: null,
  updated_at: null,
};

interface SettingsState {
  settings: StoreSettings;
  isLoading: boolean;
  error: string | null;
  fetchSettings: () => Promise<void>;
  updateSettings: (patch: Partial<StoreSettings>) => Promise<boolean>;
  uploadStoreImage: (
    type: "logo" | "cover",
    file: File
  ) => Promise<{ success: boolean; publicUrl?: string; error?: string }>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      error: null,

      /* ── FETCH (client-side, só leitura, RLS permite) ── */
      async fetchSettings() {
        if (!supabaseConfigured || !supabase) {
          set({ error: "Supabase não configurado" });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from("store_settings")
            .select("*")
            .single();
          if (error) throw error;
          if (data) {
            set({ settings: { ...DEFAULT_SETTINGS, ...data } });
          }
        } catch (err) {
          set({
            error:
              err instanceof Error
                ? err.message
                : "Erro ao carregar configurações",
          });
        } finally {
          set({ isLoading: false });
        }
      },

      /* ── UPDATE (server function, bypass RLS) ── */
      async updateSettings(patch) {
        set({ isLoading: true, error: null });
        try {
          const current = get().settings;
          const result = await updateSettingsServer({
            data: { id: current.id, patch },
          });

          if (!result.success) {
            throw new Error(result.error || "Erro ao salvar");
          }

          // Atualiza o estado local com os novos valores
          set({ settings: { ...current, ...patch } });
          return true;
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Erro ao salvar configurações";
          set({ error: message });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      /* ── UPLOAD IMAGE (server function, bypass RLS no Storage) ── */
      async uploadStoreImage(type, file) {
        try {
          // Converte File para base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const result = await uploadStoreImageServer({
            data: {
              type,
              fileBase64: base64,
              fileName: file.name,
              contentType: file.type,
            },
          });

          if (!result.success) {
            return {
              success: false,
              error: result.error || "Erro no upload",
            };
          }

          // Atualiza o campo correspondente no estado
          const field = type === "logo" ? "logo_url" : "cover_url";
          const current = get().settings;
          set({
            settings: {
              ...current,
              [field]: result.publicUrl,
            },
          });

          return { success: true, publicUrl: result.publicUrl };
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Erro no upload da imagem";
          return { success: false, error: message };
        }
      },
    }),
    { name: "terraviva-settings-cache" },
  ),
);