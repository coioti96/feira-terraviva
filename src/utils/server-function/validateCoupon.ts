import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdmin } from "@/lib/supabase";
import { calculateDiscount } from "@/lib/utils";
import type { Coupon, CouponType } from "@/types";

interface ValidateCouponInput {
  code: string;
  subtotal: number;
  productIds: string[];
  categoryIds: string[];
}

interface ValidateCouponResult {
  valid: boolean;
  coupon?: Coupon;
  discount: number;
  message: string;
  code: string;
}

/**
 * Valida um cupom de desconto server-side com segurança enterprise.
 * Verifica: existência, ativação, datas, limite de usos, mínimo de compra,
 * produtos/categorias aplicáveis.
 */
export const validateCoupon = createServerFn({ method: "POST" })
  .validator((data: ValidateCouponInput) => data)
  .handler(async ({ data }): Promise<ValidateCouponResult> => {
    const { code, subtotal, productIds, categoryIds } = data;

    // 1. Busca cupom no banco (bypass RLS com admin client)
    const admin = getSupabaseAdmin();
    if (!admin) {
      return {
        valid: false,
        discount: 0,
        message: "Serviço indisponível. Tente novamente.",
        code: code.toUpperCase(),
      };
    }

    const { data: coupon, error } = await admin
      .from("coupons")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .single();

    if (error || !coupon) {
      return {
        valid: false,
        discount: 0,
        message: "Cupom não encontrado",
        code: code.toUpperCase(),
      };
    }

    // 2. Verifica se está ativo
    if (!coupon.is_active) {
      return {
        valid: false,
        discount: 0,
        message: "Cupom está inativo",
        code: coupon.code,
      };
    }

    // 3. Verifica datas
    const now = new Date();
    const startDate = coupon.start_date ? new Date(coupon.start_date) : null;
    const endDate = coupon.end_date ? new Date(coupon.end_date) : null;

    if (startDate && now < startDate) {
      return {
        valid: false,
        discount: 0,
        message: `Cupom válido a partir de ${startDate.toLocaleDateString("pt-BR")}`,
        code: coupon.code,
      };
    }

    if (endDate && now > endDate) {
      return {
        valid: false,
        discount: 0,
        message: "Cupom expirado",
        code: coupon.code,
      };
    }

    // 4. Verifica limite de usos
    if (coupon.max_uses > 0 && coupon.current_uses >= coupon.max_uses) {
      return {
        valid: false,
        discount: 0,
        message: "Limite de usos deste cupom foi atingido",
        code: coupon.code,
      };
    }

    // 5. Verifica mínimo de compra
    if (coupon.min_purchase && subtotal < coupon.min_purchase) {
      return {
        valid: false,
        discount: 0,
        message: `Mínimo de compra: R$ ${coupon.min_purchase.toFixed(2).replace(".", ",")}`,
        code: coupon.code,
      };
    }

    // 6. Verifica produtos aplicáveis
    const applicableProducts = coupon.applicable_products as string[] | null;
    if (applicableProducts && applicableProducts.length > 0) {
      const hasApplicableProduct = productIds.some((id) => applicableProducts.includes(id));
      if (!hasApplicableProduct) {
        return {
          valid: false,
          discount: 0,
          message: "Este cupom não é válido para os produtos do seu carrinho",
          code: coupon.code,
        };
      }
    }

    // 7. Verifica categorias aplicáveis
    const applicableCategories = coupon.applicable_categories as string[] | null;
    if (applicableCategories && applicableCategories.length > 0) {
      const hasApplicableCategory = categoryIds.some((id) => applicableCategories.includes(id));
      if (!hasApplicableCategory) {
        return {
          valid: false,
          discount: 0,
          message: "Este cupom não é válido para as categorias dos produtos do seu carrinho",
          code: coupon.code,
        };
      }
    }

    // 8. Calcula desconto
    const discount = calculateDiscount(subtotal, coupon.type as CouponType, coupon.value);

    return {
      valid: true,
      coupon: coupon as Coupon,
      discount,
      message: `Cupom aplicado! ${coupon.type === "percentage" ? `${coupon.value}%` : `R$ ${coupon.value.toFixed(2).replace(".", ",")}`} de desconto`,
      code: coupon.code,
    };
  });