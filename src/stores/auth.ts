// ============================================================
// AUTH STORE — Feirinha Orgânica Terra Viva
// Versão definitiva enterprise — NÃO EDITAR
// Zustand + Persist + Supabase Auth completo
// ============================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, supabaseConfigured, getSupabaseErrorMessage } from "@/lib/supabase";
import type { Profile, UserRole } from "@/types";
import type { Session, User } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface SignUpData {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string | null;
  reference?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface AuthState {
  // Estado
  profile: Profile | null;
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Getters computados
  isAdmin: boolean;
  isAuthenticated: boolean;

  // Ações
  signIn: (email: string, password: string) => Promise<Profile>;
  signUp: (data: SignUpData) => Promise<Profile>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<boolean>;
  uploadAvatar: (file: File) => Promise<string | null>;
  fetchProfile: () => Promise<Profile | null>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

// ─────────────────────────────────────────────────────────────
// HELPER: Busca profile completo com role do Supabase
// ─────────────────────────────────────────────────────────────

async function fetchFullProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;

  // 1. Busca o profile na tabela profiles
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileError) {
    console.warn("[Auth] Erro ao buscar profile:", profileError.message);
  }

  // 2. Busca TODOS os roles do usuário
  const { data: rolesData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles = rolesData?.map((r) => r.role as UserRole) ?? [];
  const role: UserRole = roles.includes("admin") ? "admin" : (roles[0] ?? "buyer");

  // 3. Se profile existe, retorna com role correto
  if (profileData) {
    return { ...profileData, role } as Profile;
  }

  // 4. Se profile não existe (trigger falhou), busca do auth.users
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) return null;

  // Fallback: cria profile mínimo com dados do auth
  return {
    id: userId,
    role,
    full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário",
    email: user.email || "",
    phone: user.user_metadata?.phone || null,
    avatar_url: user.user_metadata?.avatar_url || null,
    cep: null,
    address: null,
    number: null,
    complement: null,
    neighborhood: null,
    city: null,
    state: null,
    created_at: user.created_at || new Date().toISOString(),
    updated_at: user.updated_at || new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// ZUSTAND STORE
// ─────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ── Estado inicial ──
      profile: null,
      session: null,
      user: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      // ── Getters computados ──
      get isAdmin() {
        return get().profile?.role === "admin";
      },
      get isAuthenticated() {
        return !!get().profile && !!get().session;
      },

      // ── Sign In ──
      async signIn(email, password) {
        if (!supabaseConfigured || !supabase) {
          throw new Error("Supabase não configurado. Verifique as variáveis de ambiente.");
        }

        set({ isLoading: true, error: null });

        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });

          if (authError) {
            // Mapeia erros comuns para mensagens amigáveis
            const msg = authError.message.toLowerCase();
            if (msg.includes("invalid login credentials")) {
              throw new Error("Email ou senha incorretos.");
            }
            if (msg.includes("email not confirmed")) {
              throw new Error("Email não confirmado. Verifique sua caixa de entrada.");
            }
            throw new Error(authError.message);
          }

          if (!authData.user) {
            throw new Error("Usuário não encontrado após login.");
          }

          const profile = await fetchFullProfile(authData.user.id);

          if (!profile) {
            throw new Error("Não foi possível carregar seu perfil. Tente novamente.");
          }

          set({
            profile,
            session: authData.session,
            user: authData.user,
            isInitialized: true,
            error: null,
          });

          return profile;
        } catch (err) {
          const message = getSupabaseErrorMessage(err);
          set({ error: message, profile: null, session: null, user: null });
          throw new Error(message);
        } finally {
          set({ isLoading: false });
        }
      },

      // ── Sign Up ──
      async signUp(data) {
        if (!supabaseConfigured || !supabase) {
          throw new Error("Supabase não configurado.");
        }

        set({ isLoading: true, error: null });

        try {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email.trim().toLowerCase(),
            password: data.password,
            options: {
              data: {
                full_name: data.full_name,
                phone: data.phone,
              },
            },
          });

          if (authError) {
            const msg = authError.message.toLowerCase();
            if (msg.includes("user already registered")) {
              throw new Error("Este email já está cadastrado.");
            }
            throw new Error(authError.message);
          }

          if (!authData.user) {
            throw new Error("Erro ao criar conta. Tente novamente.");
          }

          // Aguarda o trigger handle_new_user criar o profile
          await new Promise((resolve) => setTimeout(resolve, 500));

          const profile = await fetchFullProfile(authData.user.id);

          if (!profile) {
            throw new Error("Conta criada, mas não foi possível carregar o perfil.");
          }

          set({
            profile,
            session: authData.session,
            user: authData.user,
            isInitialized: true,
            error: null,
          });

          return profile;
        } catch (err) {
          const message = getSupabaseErrorMessage(err);
          set({ error: message });
          throw new Error(message);
        } finally {
          set({ isLoading: false });
        }
      },

      // ── Sign Out ──
      async signOut() {
        if (supabase) {
          await supabase.auth.signOut();
        }
        set({
          profile: null,
          session: null,
          user: null,
          error: null,
          isInitialized: true,
        });
      },

      // ── Update Profile ──
      async updateProfile(patch) {
        const current = get().profile;
        if (!current || !supabaseConfigured || !supabase) return false;

        try {
          const { error } = await supabase
            .from("profiles")
            .update({
              ...patch,
              updated_at: new Date().toISOString(),
            })
            .eq("id", current.id);

          if (error) throw error;

          set({ profile: { ...current, ...patch } });
          return true;
        } catch (err) {
          const message = getSupabaseErrorMessage(err);
          set({ error: message });
          return false;
        }
      },

      // ── Upload Avatar ──
      async uploadAvatar(file) {
        const current = get().profile;
        if (!current || !supabase) return null;

        try {
          const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
          const fileName = `avatars/${current.id}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(fileName, file, {
              cacheControl: "3600",
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
          const publicUrl = urlData.publicUrl;

          // Atualiza o profile com a nova URL
          await get().updateProfile({ avatar_url: publicUrl });

          return publicUrl;
        } catch (err) {
          console.error("[Auth] Erro ao fazer upload do avatar:", err);
          set({ error: getSupabaseErrorMessage(err) });
          return null;
        }
      },

      // ── Fetch Profile ──
      async fetchProfile() {
        if (!supabaseConfigured || !supabase) {
          set({ isInitialized: true });
          return null;
        }

        try {
          // Tenta getUser primeiro (valida token no servidor)
          const { data: userData, error: userError } = await supabase.auth.getUser();
          let user = userData?.user;

          // Fallback para getSession (local)
          if (userError || !user) {
            const { data: sessionData } = await supabase.auth.getSession();
            user = sessionData?.session?.user ?? null;
          }

          if (!user) {
            set({ profile: null, session: null, user: null, isInitialized: true });
            return null;
          }

          const profile = await fetchFullProfile(user.id);

          if (profile) {
            set({
              profile,
              session: get().session, // Mantém sessão existente
              user,
              isInitialized: true,
            });
            return profile;
          }

          // Fallback se profile não existe
          const fallback: Profile = {
            id: user.id,
            role: "buyer",
            full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário",
            email: user.email || "",
            phone: user.user_metadata?.phone || null,
            avatar_url: null,
            cep: null,
            address: null,
            number: null,
            complement: null,
            neighborhood: null,
            city: null,
            state: null,
            created_at: user.created_at || new Date().toISOString(),
            updated_at: user.updated_at || new Date().toISOString(),
          };

          set({ profile: fallback, session: get().session, user, isInitialized: true });
          return fallback;
        } catch (err) {
          console.error("[Auth] Erro ao buscar profile:", err);
          set({ profile: null, session: null, user: null, isInitialized: true });
          return null;
        }
      },

      // ── Reset Password ──
      async resetPassword(email) {
        if (!supabaseConfigured || !supabase) {
          throw new Error("Supabase não configurado.");
        }

        set({ isLoading: true, error: null });

        try {
          const { error } = await supabase.auth.resetPasswordForEmail(
            email.trim().toLowerCase(),
            {
              redirectTo: `${window.location.origin}/auth/reset-password`,
            }
          );

          if (error) throw error;
        } catch (err) {
          const message = getSupabaseErrorMessage(err);
          set({ error: message });
          throw new Error(message);
        } finally {
          set({ isLoading: false });
        }
      },

      // ── Clear Error ──
      clearError() {
        set({ error: null });
      },
    }),
    {
      name: "terraviva-auth-cache",
      // Só persiste o session ID — nunca o profile (role pode mudar)
      partialize: (state) => ({
        session: state.session,
      }),
    }
  )
);

// ─────────────────────────────────────────────────────────────
// LISTENER DE AUTH STATE (fora do store para evitar loops)
// ─────────────────────────────────────────────────────────────

let _authListenerInitialized = false;

export function initAuthListener() {
  if (_authListenerInitialized || typeof window === "undefined" || !supabase) return;
  _authListenerInitialized = true;

  supabase.auth.onAuthStateChange((event, session) => {
    console.log("[Auth] State change:", event);

    if (event === "SIGNED_OUT") {
      useAuthStore.setState({
        profile: null,
        session: null,
        user: null,
        isInitialized: true,
      });
    } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      if (session?.user) {
        // Revalida o profile em background
        useAuthStore.getState().fetchProfile();
      }
    } else if (event === "USER_UPDATED") {
      if (session?.user) {
        useAuthStore.setState({ user: session.user, session });
      }
    }
  });
}