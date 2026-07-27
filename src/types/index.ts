// ============================================================
// TYPES INDEX — Feirinha Orgânica Terra Viva
// Versão definitiva enterprise — NÃO EDITAR
// Todos os tipos do projeto em um único arquivo centralizado
// ============================================================

// ─────────────────────────────────────────────────────────────
// ENUMS & UNION TYPES
// ─────────────────────────────────────────────────────────────

export type UserRole = "buyer" | "admin";

export type ProductStatus = "draft" | "published" | "archived";

export type ProductUnit =
  | "unidade"
  | "500g"
  | "1kg"
  | "maço"
  | "bandeja"
  | "caixa"
  | "pacote"
  | "dúzia"
  | "litro"
  | "100g"
  | "250g"
  | "2kg"
  | "5kg";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentMethod = "pix" | "cash" | "card" | "mercado_pago";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "cancelled";

export type DeliveryType = "delivery" | "pickup";

export type ShippingMethod = "fixed" | "distance" | "free_above";

export type CouponType = "percentage" | "fixed";

export type CouponStatus = "active" | "inactive" | "expired" | "exhausted" | "future";

export type NotificationType =
  | "order_status"
  | "payment_received"
  | "promotion"
  | "new_product"
  | "system";

export type NotificationChannel = "push" | "email" | "sms";

// ─────────────────────────────────────────────────────────────
// ADDRESS
// ─────────────────────────────────────────────────────────────

export interface Address {
  cep: string;
  street: string;
  number: string;
  complement?: string | null;
  reference?: string | null;
  neighborhood: string;
  city: string;
  state: string;
}

export interface AddressInput {
  cep: string;
  street: string;
  number: string;
  complement?: string | null;
  reference?: string | null;
  neighborhood: string;
  city: string;
  state: string;
}

// ─────────────────────────────────────────────────────────────
// PROFILE & USER
// ─────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  cep: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProfileInput {
  full_name?: string;
  phone?: string | null;
  avatar_url?: string | null;
  cep?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface UserRoleEntry {
  user_id: string;
  role: UserRole;
  created_at: string | null;
}

// ─────────────────────────────────────────────────────────────
// CUSTOMER (agregado para admin)
// ─────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  address: Address | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  created_at: string | null;
}

// ─────────────────────────────────────────────────────────────
// STORE SETTINGS
// ─────────────────────────────────────────────────────────────

export interface OpeningHoursDay {
  open: string;
  close: string;
  closed: boolean;
}

export interface OpeningHours {
  monday: OpeningHoursDay;
  tuesday: OpeningHoursDay;
  wednesday: OpeningHoursDay;
  thursday: OpeningHoursDay;
  friday: OpeningHoursDay;
  saturday: OpeningHoursDay;
  sunday: OpeningHoursDay;
}

export interface DeliveryRate {
  from_km: number;
  to_km: number;
  fee: number;
}

export interface StoreSettings {
  id: string;
  name: string;
  description: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  cover_url: string | null;
  primary_color: string;
  secondary_color: string;
  opening_hours: OpeningHours;
  delivery_fee: number;
  delivery_type: ShippingMethod;
  delivery_distance_rates: DeliveryRate[];
  delivery_time_min: number;
  delivery_radius_km: number;
  free_delivery_above: number | null;
  pix_enabled: boolean;
  pix_key: string | null;
  pix_key_type: "cpf" | "email" | "phone" | "random" | "cnpj" | null;
  cash_enabled: boolean;
  card_enabled: boolean;
  mercado_pago_enabled: boolean;
  mercado_pago_access_token: string | null;
  mercado_pago_public_key: string | null;
  mercado_pago_refresh_token: string | null;
  mercado_pago_user_id: string | null;
  about_text: string | null;
  about_images: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  google_maps_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface StoreSettingsInput {
  name?: string;
  description?: string | null;
  whatsapp?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  opening_hours?: Partial<OpeningHours>;
  delivery_fee?: number;
  delivery_type?: ShippingMethod;
  delivery_distance_rates?: DeliveryRate[];
  delivery_time_min?: number;
  delivery_radius_km?: number;
  free_delivery_above?: number | null;
  pix_enabled?: boolean;
  pix_key?: string | null;
  pix_key_type?: "cpf" | "email" | "phone" | "random" | "cnpj" | null;
  cash_enabled?: boolean;
  card_enabled?: boolean;
  mercado_pago_enabled?: boolean;
  mercado_pago_access_token?: string | null;
  mercado_pago_public_key?: string | null;
  about_text?: string | null;
  about_images?: string[] | null;
  meta_title?: string | null;
  meta_description?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  google_maps_url?: string | null;
}

// ─────────────────────────────────────────────────────────────
// CATEGORY
// ─────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  product_count?: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface CategoryInput {
  name: string;
  slug: string;
  description?: string | null;
  icon?: string;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

// ─────────────────────────────────────────────────────────────
// NUTRITIONAL INFO
// ─────────────────────────────────────────────────────────────

export interface NutritionalInfo {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sodium: number | null;
  serving_size: string | null;
}

// ─────────────────────────────────────────────────────────────
// PRODUCT
// ─────────────────────────────────────────────────────────────

export type UnitPriceMap = Partial<Record<ProductUnit, number>>;
export type StockMap = Partial<Record<ProductUnit, number>>;

export interface ProductImage {
  url: string;
  alt: string;
  sort_order: number;
}

/**
 * Product — tipo que reflete EXATAMENTE o schema do Supabase.
 * Campos que existem no banco: is_active, is_featured, weight_kg, nutritional_info
 * Campos que NÃO existem no banco: status, seo_title, seo_description, short_description
 */
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  category?: Category;
  base_price: number;
  unit_prices: UnitPriceMap;
  promotional_price: number | null;
  promotional_start: string | null;
  promotional_end: string | null;
  stock: StockMap;
  images: string[];
  product_images?: ProductImage[];
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  weight_kg: number | null;
  nutritional_info: NutritionalInfo | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * ProductInput — dados para CRIAR um produto.
 * Omite campos gerados automaticamente pelo banco.
 */
export interface ProductInput {
  name: string;
  slug?: string;
  description?: string | null;
  category_id: string | null;
  base_price?: number;
  unit_prices?: UnitPriceMap;
  promotional_price?: number | null;
  promotional_start?: string | null;
  promotional_end?: string | null;
  stock?: StockMap;
  images?: string[];
  tags?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  weight_kg?: number | null;
  nutritional_info?: NutritionalInfo | null;
}

export interface ProductWithCategory extends Product {
  category: Category;
}

// ─────────────────────────────────────────────────────────────
// PRODUCT REVIEW
// ─────────────────────────────────────────────────────────────

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// CART
// ─────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  product_slug: string;
  unit_type: ProductUnit;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface CartState {
  items: CartItem[];
  coupon_id: string | null;
  discount: number;
  subtotal: number;
  delivery_fee: number;
  total: number;
}

// ─────────────────────────────────────────────────────────────
// COUPON
// ─────────────────────────────────────────────────────────────

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  max_uses: number;
  current_uses: number;
  min_purchase: number | null;
  start_date: string;
  end_date: string;
  applicable_categories: string[] | null;
  applicable_products: string[] | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CouponInput {
  code: string;
  type: CouponType;
  value: number;
  max_uses?: number;
  min_purchase?: number | null;
  start_date: string;
  end_date: string;
  applicable_categories?: string[] | null;
  applicable_products?: string[] | null;
  is_active?: boolean;
}

// ─────────────────────────────────────────────────────────────
// ORDER
// ─────────────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  unit_type: ProductUnit;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string | null;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  status: OrderStatus;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export interface OrderPayment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  transaction_id: string | null;
  pix_qr_code: string | null;
  pix_expiration: string | null;
  mercado_pago_id: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  payment_id: string | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  coupon_id: string | null;
  delivery_type: DeliveryType;
  address: Address | null;
  change_for: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  history?: OrderStatusHistory[];
  payment?: OrderPayment | null;
}

export interface OrderInput {
  delivery_type: DeliveryType;
  payment_method: PaymentMethod;
  address?: AddressInput | null;
  change_for?: number | null;
  notes?: string | null;
}

export interface OrderUpdateInput {
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  notes?: string | null;
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATION
// ─────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  image_url: string | null;
  channels: NotificationChannel[];
  is_read: boolean;
  sent_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationInput {
  user_id?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  image_url?: string | null;
  channels?: NotificationChannel[];
}

// ─────────────────────────────────────────────────────────────
// ADMIN DASHBOARD — ÚNICA declaração, definitiva
// ─────────────────────────────────────────────────────────────

export interface TrendData {
  value: number;
  label: string;
}

export interface SalesChartPoint {
  day: string;
  revenue: number;
  orders: number;
}

export interface TopSellingProduct {
  product_id: string;
  product_name: string;
  total_sold: number;
  total_revenue: number;
}

export interface RevenueByDay {
  date: string;
  revenue: number;
  orders: number;
}

export interface RevenueByPaymentMethod {
  method: PaymentMethod;
  total: number;
  count: number;
}

/**
 * DashboardStats — ÚNICA declaração, completa.
 * Funde os campos do dashboard visual + relatórios admin.
 */
export interface DashboardStats {
  // ── Hoje ──
  orders_today: number;
  revenue_today: number;
  average_ticket: number;
  new_customers_today: number;

  // ── Tendências (vs período anterior) ──
  orders_trend: TrendData;
  revenue_trend: TrendData;
  ticket_trend: TrendData;
  customers_trend: TrendData;

  // ── Gráfico de vendas (últimos 7 dias) ──
  sales_chart: SalesChartPoint[];

  // ── Totais acumulados ──
  total_products: number;
  total_customers: number;
  total_orders: number;
  total_revenue: number;

  // ── Período ──
  total_revenue_week: number;
  total_revenue_month: number;
  total_revenue_all_time: number;
  orders_week: number;
  orders_month: number;
  orders_pending: number;
  orders_preparing: number;
  orders_out_for_delivery: number;
  low_stock_products: number;

  // ── Detalhamentos ──
  top_selling_products: TopSellingProduct[];
  revenue_by_day: RevenueByDay[];
  revenue_by_payment_method: RevenueByPaymentMethod[];
}

export interface SalesReport {
  period: "day" | "week" | "month" | "year" | "custom";
  start_date: string;
  end_date: string;
  total_revenue: number;
  total_orders: number;
  total_items_sold: number;
  average_order_value: number;
  revenue_by_category: Array<{
    category_id: string;
    category_name: string;
    revenue: number;
    orders: number;
  }>;
  revenue_by_product: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    revenue: number;
  }>;
}

// ─────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  search?: string;
  filters?: Record<string, string | number | boolean | null>;
}

// ─────────────────────────────────────────────────────────────
// API RESPONSE
// ─────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────────────────────
// SEARCH & FILTER
// ─────────────────────────────────────────────────────────────

export interface ProductFilter {
  category_id?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  is_active?: boolean | null;
  is_featured?: boolean | null;
  in_stock?: boolean | null;
  tags?: string[] | null;
  search?: string | null;
}

export interface OrderFilter {
  status?: OrderStatus | null;
  payment_status?: PaymentStatus | null;
  payment_method?: PaymentMethod | null;
  delivery_type?: DeliveryType | null;
  date_from?: string | null;
  date_to?: string | null;
  user_id?: string | null;
  search?: string | null;
}

// ─────────────────────────────────────────────────────────────
// MERCADO PAGO
// ─────────────────────────────────────────────────────────────

export interface MercadoPagoPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
}

export interface MercadoPagoPayment {
  id: string;
  status: string;
  status_detail: string;
  transaction_amount: number;
  date_created: string;
  date_approved: string | null;
  payer: {
    email: string;
    identification: { type: string; number: string } | null;
  };
}

// ─────────────────────────────────────────────────────────────
// PWA & SERVICE WORKER
// ─────────────────────────────────────────────────────────────

export interface PWAInstallPrompt {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// ─────────────────────────────────────────────────────────────
// UTILITY TYPES
// ─────────────────────────────────────────────────────────────

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WithTimestamps = {
  created_at: string | null;
  updated_at: string | null;
};

export type DatabaseTable =
  | "profiles"
  | "user_roles"
  | "categories"
  | "products"
  | "product_reviews"
  | "orders"
  | "order_items"
  | "order_status_history"
  | "order_payments"
  | "coupons"
  | "store_settings"
  | "notifications";