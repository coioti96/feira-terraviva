import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import type { Product, ProductInput, Category, Coupon, CouponInput } from "@/types";

interface CatalogState {
  products: Product[];
  categories: Category[];
  coupons: Coupon[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  fetchAllProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchCoupons: () => Promise<void>;
  fetchAll: () => Promise<void>;
  addProduct: (p: ProductInput) => Promise<Product | null>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  addCoupon: (c: CouponInput) => Promise<Coupon | null>;
  updateCoupon: (id: string, patch: Partial<Coupon>) => Promise<boolean>;
  deleteCoupon: (id: string) => Promise<boolean>;
  getCouponByCode: (code: string) => Coupon | undefined;
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => ({
      products: [],
      categories: [],
      coupons: [],
      isLoading: false,
      error: null,

      /** Cliente: busca apenas produtos ATIVOS */
      async fetchProducts() {
        if (!supabaseConfigured || !supabase) {
          set({ error: "Supabase não configurado" });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from("products")
            .select("*, categories(id, name, slug)")
            .eq("is_active", true)
            .order("created_at", { ascending: false });
          if (error) throw error;
          set({ products: (data as Product[]) || [] });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erro ao carregar produtos" });
        } finally {
          set({ isLoading: false });
        }
      },

      /** Admin: busca TODOS os produtos (ativos e inativos) */
      async fetchAllProducts() {
        if (!supabaseConfigured || !supabase) {
          set({ error: "Supabase não configurado" });
          return;
        }
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from("products")
            .select("*, categories(id, name, slug)")
            .order("created_at", { ascending: false });
          if (error) throw error;
          set({ products: (data as Product[]) || [] });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erro ao carregar produtos" });
        } finally {
          set({ isLoading: false });
        }
      },

      async fetchCategories() {
        if (!supabaseConfigured || !supabase) return;
        try {
          const { data, error } = await supabase
            .from("categories")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });
          if (error) throw error;
          set({ categories: (data as Category[]) || [] });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erro ao carregar categorias" });
        }
      },

      /** Admin: busca TODOS os cupons (ativos e inativos) */
      async fetchCoupons() {
        if (!supabaseConfigured || !supabase) return;
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from("coupons")
            .select("*")
            .order("created_at", { ascending: false });
          if (error) throw error;
          set({ coupons: (data as Coupon[]) || [] });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erro ao carregar cupons" });
        } finally {
          set({ isLoading: false });
        }
      },

      async fetchAll() {
        set({ isLoading: true });
        await Promise.all([
          get().fetchCategories(),
          get().fetchAllProducts(),
          get().fetchCoupons(),
        ]);
        set({ isLoading: false });
      },

      /**
       * Cria um produto no Supabase.
       */
      async addProduct(productData) {
        if (!supabaseConfigured || !supabase) return null;
        try {
          const { generateSlug } = await import("@/lib/utils");
          const slug = generateSlug(productData.name);

          const payload = {
            name: productData.name,
            slug,
            description: productData.description ?? null,
            category_id: productData.category_id ?? null,
            base_price: productData.base_price ?? 0,
            unit_prices: productData.unit_prices ?? {},
            promotional_price: productData.promotional_price ?? null,
            promotional_start: productData.promotional_start ?? null,
            promotional_end: productData.promotional_end ?? null,
            stock: productData.stock ?? {},
            images: productData.images ?? [],
            tags: productData.tags ?? [],
            is_active: productData.is_active ?? true,
            is_featured: productData.is_featured ?? false,
            weight_kg: productData.weight_kg ?? null,
            nutritional_info: productData.nutritional_info ?? null,
          };

          const { data, error } = await supabase
            .from("products")
            .insert([payload])
            .select("*, categories(id, name, slug)")
            .single();

          if (error) throw error;

          if (data) {
            set((s) => ({ products: [data as Product, ...s.products] }));
          }
          return data as Product;
        } catch (err) {
          console.error("[addProduct] Erro:", err);
          set({ error: err instanceof Error ? err.message : "Erro ao criar produto" });
          return null;
        }
      },

      /**
       * Atualiza um produto.
       */
      async updateProduct(id, patch) {
        if (!supabaseConfigured || !supabase) return false;
        try {
          const allowedFields: (keyof Product)[] = [
            "name", "slug", "description", "category_id", "base_price",
            "unit_prices", "promotional_price", "promotional_start",
            "promotional_end", "stock", "images", "tags",
            "is_active", "is_featured", "weight_kg", "nutritional_info",
          ];

          const payload: Record<string, unknown> = {};
          for (const key of allowedFields) {
            if (key in patch) {
              payload[key] = patch[key];
            }
          }

          payload.updated_at = new Date().toISOString();

          const { error } = await supabase
            .from("products")
            .update(payload)
            .eq("id", id);

          if (error) throw error;

          set((s) => ({
            products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          }));
          return true;
        } catch (err) {
          console.error("[updateProduct] Erro:", err);
          set({ error: err instanceof Error ? err.message : "Erro ao atualizar produto" });
          return false;
        }
      },

      async deleteProduct(id) {
        if (!supabaseConfigured || !supabase) return false;
        try {
          const { error } = await supabase.from("products").delete().eq("id", id);
          if (error) throw error;
          set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
          return true;
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erro ao deletar produto" });
          return false;
        }
      },

      /**
       * Cria um cupom no Supabase com validações enterprise.
       */
      async addCoupon(couponData) {
        if (!supabaseConfigured || !supabase) return null;
        try {
          // Validações client-side antes de enviar
          if (!couponData.code || couponData.code.trim().length < 3) {
            throw new Error("Código do cupom deve ter pelo menos 3 caracteres");
          }
          if (couponData.value <= 0) {
            throw new Error("Valor do desconto deve ser maior que zero");
          }
          if (couponData.type === "percentage" && couponData.value > 100) {
            throw new Error("Desconto percentual não pode exceder 100%");
          }
          if (new Date(couponData.end_date) <= new Date(couponData.start_date)) {
            throw new Error("Data de término deve ser posterior à data de início");
          }

          const payload = {
            code: couponData.code.trim().toUpperCase(),
            type: couponData.type,
            value: couponData.value,
            max_uses: couponData.max_uses ?? 0,
            min_purchase: couponData.min_purchase ?? 0,
            start_date: couponData.start_date,
            end_date: couponData.end_date,
            applicable_categories: couponData.applicable_categories ?? [],
            applicable_products: couponData.applicable_products ?? [],
            is_active: couponData.is_active ?? true,
            current_uses: 0,
          };

          const { data, error } = await supabase
            .from("coupons")
            .insert([payload])
            .select()
            .single();

          if (error) {
            if (error.code === "23505") {
              throw new Error("Já existe um cupom com este código");
            }
            throw error;
          }

          if (data) {
            set((s) => ({ coupons: [data as Coupon, ...s.coupons] }));
          }
          return data as Coupon;
        } catch (err) {
          console.error("[addCoupon] Erro:", err);
          set({ error: err instanceof Error ? err.message : "Erro ao criar cupom" });
          return null;
        }
      },

      /**
       * Atualiza um cupom com validações.
       */
      async updateCoupon(id, patch) {
        if (!supabaseConfigured || !supabase) return false;
        try {
          // Validações se estiver atualizando datas
          if (patch.start_date && patch.end_date) {
            if (new Date(patch.end_date) <= new Date(patch.start_date)) {
              throw new Error("Data de término deve ser posterior à data de início");
            }
          }

          const payload: Record<string, unknown> = {};
          const allowedFields: (keyof Coupon)[] = [
            "code", "type", "value", "max_uses", "current_uses",
            "min_purchase", "start_date", "end_date",
            "applicable_categories", "applicable_products", "is_active",
          ];

          for (const key of allowedFields) {
            if (key in patch) {
              payload[key] = patch[key];
            }
          }

          payload.updated_at = new Date().toISOString();

          const { error } = await supabase
            .from("coupons")
            .update(payload)
            .eq("id", id);

          if (error) {
            if (error.code === "23505") {
              throw new Error("Já existe um cupom com este código");
            }
            throw error;
          }

          set((s) => ({
            coupons: s.coupons.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          }));
          return true;
        } catch (err) {
          console.error("[updateCoupon] Erro:", err);
          set({ error: err instanceof Error ? err.message : "Erro ao atualizar cupom" });
          return false;
        }
      },

      async deleteCoupon(id) {
        if (!supabaseConfigured || !supabase) return false;
        try {
          const { error } = await supabase.from("coupons").delete().eq("id", id);
          if (error) throw error;
          set((s) => ({ coupons: s.coupons.filter((c) => c.id !== id) }));
          return true;
        } catch (err) {
          set({ error: err instanceof Error ? err.message : "Erro ao deletar cupom" });
          return false;
        }
      },

      /** Busca cupom pelo código (cache local) */
      getCouponByCode(code: string) {
        return get().coupons.find((c) => c.code === code);
      },
    }),
    { name: "terraviva-catalog-cache" },
  ),
);