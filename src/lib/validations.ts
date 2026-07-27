// ============================================================
// VALIDATIONS — Feirinha Orgânica Terra Viva
// Versão definitiva enterprise — NÃO EDITAR
// Schemas Zod alinhados 1:1 com src/types/index.ts
// ============================================================

import { z } from "zod";
import type {
  ProductUnit,
  OrderStatus,
  PaymentMethod,
  DeliveryType,
  CouponType,
  ProductStatus,
  ShippingMethod,
  NotificationType,
  NotificationChannel,
} from "@/types";

// ─────────────────────────────────────────────────────────────
// CONSTANTES DE VALIDAÇÃO
// ─────────────────────────────────────────────────────────────

const PRODUCT_UNITS: ProductUnit[] = [
  "unidade",
  "500g",
  "1kg",
  "maço",
  "bandeja",
  "caixa",
  "pacote",
  "dúzia",
  "litro",
  "100g",
  "250g",
  "2kg",
  "5kg",
];

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "refunded",
];

const PAYMENT_METHODS: PaymentMethod[] = ["pix", "cash", "card", "mercado_pago"];
const DELIVERY_TYPES: DeliveryType[] = ["delivery", "pickup"];
const COUPON_TYPES: CouponType[] = ["percentage", "fixed"];
const PRODUCT_STATUSES: ProductStatus[] = ["draft", "published", "archived"];
const SHIPPING_METHODS: ShippingMethod[] = ["fixed", "distance", "free_above"];
const NOTIFICATION_TYPES: NotificationType[] = [
  "order_status",
  "payment_received",
  "promotion",
  "new_product",
  "system",
];
const NOTIFICATION_CHANNELS: NotificationChannel[] = ["push", "email", "sms"];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Sanitiza CEP: remove tudo que não é número */
function sanitizeCep(cep: string): string {
  return cep.replace(/\D/g, "");
}

/** Sanitiza telefone: remove tudo que não é número */
function sanitizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Valida se string é data ISO válida */
function isValidIsoDate(date: string): boolean {
  const d = new Date(date);
  return !isNaN(d.getTime()) && date.includes("T");
}

// ─────────────────────────────────────────────────────────────
// ADDRESS SCHEMA (reutilizável)
// ─────────────────────────────────────────────────────────────

export const addressSchema = z.object({
  cep: z
    .string()
    .min(8, "CEP inválido")
    .max(9, "CEP inválido")
    .transform(sanitizeCep)
    .refine((v) => /^\d{8}$/.test(v), "CEP deve ter 8 dígitos"),
  street: z.string().min(3, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().max(100).optional().nullable(),
  reference: z.string().max(200).optional().nullable(),
  neighborhood: z.string().min(2, "Bairro é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z
    .string()
    .length(2, "UF deve ter 2 letras")
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "UF inválida (ex: SP, RJ, MG)"),
});

export type AddressFormValues = z.infer<typeof addressSchema>;

// ─────────────────────────────────────────────────────────────
// AUTH SCHEMAS
// ─────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(3, "Nome deve ter pelo menos 3 caracteres")
      .max(100, "Nome muito longo")
      .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras"),
    email: z
      .string()
      .min(1, "Email é obrigatório")
      .email("Email inválido"),
    phone: z
      .string()
      .min(11, "Celular inválido (mínimo 11 dígitos)")
      .max(15, "Celular inválido")
      .transform(sanitizePhone)
      .refine(
        (v) => /^\d{11}$/.test(v),
        "Celular deve ter 11 dígitos (DDD + número)"
      ),
    cep: z
      .string()
      .min(8, "CEP inválido")
      .max(9)
      .transform(sanitizeCep)
      .refine((v) => /^\d{8}$/.test(v), "CEP deve ter 8 dígitos"),
    address: z.string().min(3, "Endereço é obrigatório"),
    number: z.string().min(1, "Número é obrigatório"),
    complement: z.string().max(100).optional().nullable(),
    reference: z.string().max(200).optional().nullable(),
    neighborhood: z.string().min(2, "Bairro é obrigatório"),
    city: z.string().min(2, "Cidade é obrigatória"),
    state: z
      .string()
      .length(2, "UF deve ter 2 letras")
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "UF inválida"),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .max(128, "Senha muito longa")
      .regex(/[A-Z]/, "Precisa de 1 letra maiúscula")
      .regex(/[a-z]/, "Precisa de 1 letra minúscula")
      .regex(/[0-9]/, "Precisa de 1 número")
      .regex(/[^A-Za-z0-9]/, "Precisa de 1 caractere especial"),
    confirmPassword: z.string().min(1, "Confirme sua senha"),
    acceptTerms: z.boolean().refine((v) => v === true, "Aceite os termos para continuar"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem",
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

// ─────────────────────────────────────────────────────────────
// PROFILE SCHEMA
// ─────────────────────────────────────────────────────────────

export const profileSchema = z.object({
  full_name: z
    .string()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100),
  phone: z
    .string()
    .min(11, "Celular inválido")
    .max(15)
    .transform(sanitizePhone)
    .refine((v) => /^\d{11}$/.test(v), "Celular deve ter 11 dígitos"),
  avatar_url: z.string().url("URL inválida").optional().nullable(),
  cep: z
    .string()
    .min(8)
    .max(9)
    .transform(sanitizeCep)
    .refine((v) => /^\d{8}$/.test(v), "CEP deve ter 8 dígitos")
    .optional()
    .nullable(),
  address: z.string().min(3).optional().nullable(),
  number: z.string().min(1).optional().nullable(),
  complement: z.string().max(100).optional().nullable(),
  reference: z.string().max(200).optional().nullable(),
  neighborhood: z.string().min(2).optional().nullable(),
  city: z.string().min(2).optional().nullable(),
  state: z
    .string()
    .length(2)
    .toUpperCase()
    .regex(/^[A-Z]{2}$/)
    .optional()
    .nullable(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

// ─────────────────────────────────────────────────────────────
// CATEGORY SCHEMA
// ─────────────────────────────────────────────────────────────

export const categorySchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(50, "Nome muito longo"),
  slug: z
    .string()
    .min(2, "Slug é obrigatório")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  description: z.string().max(500).optional().nullable(),
  icon: z.string().min(1, "Ícone é obrigatório"),
  image_url: z.string().url("URL inválida").optional().nullable(),
  sort_order: z.coerce.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

// ─────────────────────────────────────────────────────────────
// NUTRITIONAL INFO SCHEMA
// ─────────────────────────────────────────────────────────────

export const nutritionalInfoSchema = z.object({
  calories: z.coerce.number().nonnegative().nullable().default(null),
  protein: z.coerce.number().nonnegative().nullable().default(null),
  carbs: z.coerce.number().nonnegative().nullable().default(null),
  fat: z.coerce.number().nonnegative().nullable().default(null),
  fiber: z.coerce.number().nonnegative().nullable().default(null),
  sodium: z.coerce.number().nonnegative().nullable().default(null),
  serving_size: z.string().max(50).optional().nullable(),
});

export type NutritionalInfoFormValues = z.infer<typeof nutritionalInfoSchema>;

// ─────────────────────────────────────────────────────────────
// PRODUCT IMAGE SCHEMA
// ─────────────────────────────────────────────────────────────

export const productImageSchema = z.object({
  url: z.string().url("URL de imagem inválida"),
  alt: z.string().max(200, "Alt muito longo").default(""),
  sort_order: z.coerce.number().int().nonnegative().default(0),
});

export type ProductImageFormValues = z.infer<typeof productImageSchema>;

// ─────────────────────────────────────────────────────────────
// PRODUCT SCHEMA
// ─────────────────────────────────────────────────────────────

const unitPriceEntrySchema = z.object({
  unit: z.enum(PRODUCT_UNITS as [string, ...string[]]),
  price: z.coerce.number().nonnegative("Preço não pode ser negativo"),
});

const stockEntrySchema = z.object({
  unit: z.enum(PRODUCT_UNITS as [string, ...string[]]),
  quantity: z.coerce.number().int().nonnegative("Estoque não pode ser negativo"),
});

export const productSchema = z.object({
  name: z
    .string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  slug: z
    .string()
    .min(2, "Slug é obrigatório")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  description: z.string().min(5, "Descrição deve ter pelo menos 5 caracteres").max(2000),
  short_description: z.string().max(300).optional().nullable(),
  category_id: z.string().uuid("Categoria inválida").min(1, "Categoria é obrigatória"),
  base_price: z.coerce.number().nonnegative("Preço base não pode ser negativo"),
  unit_prices: z
    .record(z.enum(PRODUCT_UNITS as [string, ...string[]]), z.coerce.number().nonnegative())
    .default({}),
  promotional_price: z.coerce.number().nonnegative().nullable().optional(),
  promotional_start: z
    .string()
    .refine((v) => !v || isValidIsoDate(v), "Data de início inválida")
    .optional()
    .nullable(),
  promotional_end: z
    .string()
    .refine((v) => !v || isValidIsoDate(v), "Data de término inválida")
    .optional()
    .nullable(),
  stock: z
    .record(z.enum(PRODUCT_UNITS as [string, ...string[]]), z.coerce.number().int().nonnegative())
    .default({}),
  images: z.array(z.string().url()).min(1, "Adicione pelo menos 1 imagem"),
  product_images: z.array(productImageSchema).optional().default([]),
  tags: z.array(z.string().min(1).max(30)).max(10, "Máximo 10 tags").default([]),
  status: z.enum(PRODUCT_STATUSES as [string, ...string[]]).default("published"),
  is_featured: z.boolean().default(false),
  weight_kg: z.coerce.number().nonnegative().nullable().optional(),
  nutritional_info: nutritionalInfoSchema.optional().nullable(),
  seo_title: z.string().max(70).optional().nullable(),
  seo_description: z.string().max(160).optional().nullable(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

// ─────────────────────────────────────────────────────────────
// PRODUCT REVIEW SCHEMA
// ─────────────────────────────────────────────────────────────

export const productReviewSchema = z.object({
  product_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5, "Avaliação deve ser de 1 a 5"),
  comment: z.string().max(1000).optional().nullable(),
});

export type ProductReviewFormValues = z.infer<typeof productReviewSchema>;

// ─────────────────────────────────────────────────────────────
// CART SCHEMA
// ─────────────────────────────────────────────────────────────

export const cartItemSchema = z.object({
  product_id: z.string().uuid(),
  unit_type: z.enum(PRODUCT_UNITS as [string, ...string[]]),
  quantity: z.coerce.number().int().positive("Quantidade deve ser maior que 0"),
});

export type CartItemFormValues = z.infer<typeof cartItemSchema>;

// ─────────────────────────────────────────────────────────────
// COUPON SCHEMA
// ─────────────────────────────────────────────────────────────

export const couponSchema = z.object({
  code: z
    .string()
    .min(3, "Código deve ter pelo menos 3 caracteres")
    .max(20, "Código muito longo")
    .transform((s) => s.toUpperCase().replace(/\s/g, "")),
  type: z.enum(COUPON_TYPES as [string, ...string[]]),
  value: z.coerce.number().positive("Valor deve ser maior que 0"),
  max_uses: z.coerce.number().int().positive().default(100),
  min_purchase: z.coerce.number().nonnegative().nullable().optional(),
  start_date: z
    .string()
    .refine((v) => isValidIsoDate(v), "Data de início inválida (formato ISO)"),
  end_date: z
    .string()
    .refine((v) => isValidIsoDate(v), "Data de término inválida (formato ISO)"),
  applicable_categories: z.array(z.string().uuid()).optional().nullable(),
  applicable_products: z.array(z.string().uuid()).optional().nullable(),
  is_active: z.boolean().default(true),
});

export type CouponFormValues = z.infer<typeof couponSchema>;

// ─────────────────────────────────────────────────────────────
// ORDER SCHEMA
// ─────────────────────────────────────────────────────────────

export const orderSchema = z.object({
  delivery_type: z.enum(DELIVERY_TYPES as [string, ...string[]]),
  payment_method: z.enum(PAYMENT_METHODS as [string, ...string[]]),
  address: addressSchema.optional().nullable(),
  change_for: z.coerce.number().positive().optional().nullable(),
  notes: z.string().max(500, "Observação muito longa").optional().nullable(),
  coupon_code: z
    .string()
    .max(20)
    .transform((s) => s.toUpperCase().trim())
    .optional()
    .nullable(),
});

export type OrderFormValues = z.infer<typeof orderSchema>;

// Schema de atualização de status (admin)
export const orderStatusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES as [string, ...string[]]),
  notes: z.string().max(500).optional().nullable(),
  estimated_delivery: z
    .string()
    .refine((v) => !v || isValidIsoDate(v), "Data inválida")
    .optional()
    .nullable(),
});

export type OrderStatusUpdateFormValues = z.infer<typeof orderStatusUpdateSchema>;

// ─────────────────────────────────────────────────────────────
// STORE SETTINGS SCHEMA
// ─────────────────────────────────────────────────────────────

const openingHoursDaySchema = z.object({
  open: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Formato HH:MM"),
  close: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "Formato HH:MM"),
  closed: z.boolean().default(false),
});

const deliveryRateSchema = z.object({
  from_km: z.coerce.number().nonnegative(),
  to_km: z.coerce.number().positive(),
  fee: z.coerce.number().nonnegative(),
});

export const storeSettingsSchema = z.object({
  name: z.string().min(2, "Nome da loja é obrigatório").max(100),
  description: z.string().max(500).optional().nullable(),
  whatsapp: z
    .string()
    .min(11, "WhatsApp inválido")
    .max(15)
    .transform(sanitizePhone)
    .optional()
    .nullable(),
  phone: z
    .string()
    .min(10, "Telefone inválido")
    .max(15)
    .transform(sanitizePhone)
    .optional()
    .nullable(),
  email: z.string().email("Email inválido").optional().nullable(),
  address: z.string().min(3).optional().nullable(),
  logo_url: z.string().url().optional().nullable(),
  cover_url: z.string().url().optional().nullable(),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser HEX (ex: #059669)")
    .default("#059669"),
  secondary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser HEX")
    .default("#d97706"),
  opening_hours: z.object({
    monday: openingHoursDaySchema,
    tuesday: openingHoursDaySchema,
    wednesday: openingHoursDaySchema,
    thursday: openingHoursDaySchema,
    friday: openingHoursDaySchema,
    saturday: openingHoursDaySchema,
    sunday: openingHoursDaySchema,
  }),
  delivery_fee: z.coerce.number().nonnegative().default(0),
  delivery_type: z.enum(SHIPPING_METHODS as [string, ...string[]]).default("fixed"),
  delivery_distance_rates: z.array(deliveryRateSchema).default([]),
  delivery_time_min: z.coerce.number().int().positive().default(30),
  delivery_radius_km: z.coerce.number().nonnegative().default(5),
  free_delivery_above: z.coerce.number().nonnegative().nullable().optional(),
  pix_enabled: z.boolean().default(false),
  pix_key: z.string().max(100).optional().nullable(),
  pix_key_type: z
    .enum(["cpf", "email", "phone", "random", "cnpj"])
    .optional()
    .nullable(),
  cash_enabled: z.boolean().default(true),
  card_enabled: z.boolean().default(true),
  mercado_pago_enabled: z.boolean().default(false),
  mercado_pago_access_token: z.string().optional().nullable(),
  mercado_pago_public_key: z.string().optional().nullable(),
  about_text: z.string().max(5000).optional().nullable(),
  about_images: z.array(z.string().url()).max(10).optional().nullable(),
  meta_title: z.string().max(70).optional().nullable(),
  meta_description: z.string().max(160).optional().nullable(),
  facebook_url: z.string().url().optional().nullable(),
  instagram_url: z.string().url().optional().nullable(),
  google_maps_url: z.string().url().optional().nullable(),
});

export type StoreSettingsFormValues = z.infer<typeof storeSettingsSchema>;

// ─────────────────────────────────────────────────────────────
// NOTIFICATION SCHEMA
// ─────────────────────────────────────────────────────────────

export const notificationSchema = z.object({
  user_id: z.string().uuid().optional().nullable(),
  type: z.enum(NOTIFICATION_TYPES as [string, ...string[]]),
  title: z.string().min(1, "Título é obrigatório").max(100),
  body: z.string().min(1, "Conteúdo é obrigatório").max(500),
  data: z.record(z.unknown()).optional().nullable(),
  image_url: z.string().url().optional().nullable(),
  channels: z.array(z.enum(NOTIFICATION_CHANNELS as [string, ...string[]])).min(1),
});

export type NotificationFormValues = z.infer<typeof notificationSchema>;

// ─────────────────────────────────────────────────────────────
// PAGINATION PARAMS SCHEMA
// ─────────────────────────────────────────────────────────────

export const paginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(["asc", "desc"]).optional(),
  search: z.string().max(100).optional(),
});

export type PaginationParamsFormValues = z.infer<typeof paginationParamsSchema>;

// ─────────────────────────────────────────────────────────────
// PRODUCT FILTER SCHEMA
// ─────────────────────────────────────────────────────────────

export const productFilterSchema = z.object({
  category_id: z.string().uuid().optional().nullable(),
  min_price: z.coerce.number().nonnegative().optional().nullable(),
  max_price: z.coerce.number().nonnegative().optional().nullable(),
  status: z.enum(PRODUCT_STATUSES as [string, ...string[]]).optional().nullable(),
  is_featured: z.boolean().optional().nullable(),
  in_stock: z.boolean().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  search: z.string().max(100).optional().nullable(),
});

export type ProductFilterFormValues = z.infer<typeof productFilterSchema>;

// ─────────────────────────────────────────────────────────────
// ORDER FILTER SCHEMA (admin)
// ─────────────────────────────────────────────────────────────

export const orderFilterSchema = z.object({
  status: z.enum(ORDER_STATUSES as [string, ...string[]]).optional().nullable(),
  payment_status: z.enum(["pending", "paid", "failed", "refunded", "cancelled"]).optional().nullable(),
  payment_method: z.enum(PAYMENT_METHODS as [string, ...string[]]).optional().nullable(),
  delivery_type: z.enum(DELIVERY_TYPES as [string, ...string[]]).optional().nullable(),
  date_from: z.string().optional().nullable(),
  date_to: z.string().optional().nullable(),
  user_id: z.string().uuid().optional().nullable(),
  search: z.string().max(100).optional().nullable(),
});

export type OrderFilterFormValues = z.infer<typeof orderFilterSchema>;