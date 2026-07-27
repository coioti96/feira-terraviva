// ============================================================
// UTILS — Feirinha Orgânica Terra Viva
// Versão definitiva enterprise — NÃO EDITAR
// Helpers, formatters, validators, calculators
// ============================================================

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type {
  CouponType,
  ProductUnit,
  OpeningHours,
  OpeningHoursDay,
  DeliveryRate,
  Address,
} from "@/types";

// ─────────────────────────────────────────────────────────────
// CLASSNAME MERGE (shadcn/ui padrão)
// ─────────────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─────────────────────────────────────────────────────────────
// CURRENCY & NUMBER FORMATTING
// ─────────────────────────────────────────────────────────────

/**
 * Formata número como moeda brasileira (R$).
 * Seguro para null/undefined.
 */
export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

/**
 * Formata número com separador de milhar brasileiro.
 */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value ?? 0);
}

/**
 * Formata percentual brasileiro.
 */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format((value ?? 0) / 100);
}

/**
 * Formata tamanho de arquivo (bytes → KB, MB, GB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ─────────────────────────────────────────────────────────────
// DATE & TIME FORMATTING
// ─────────────────────────────────────────────────────────────

/**
 * Formata data completa: "25 de julho de 2026"
 * Seguro para null/undefined.
 */
export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Formata data curta: "25/07/2026"
 */
export function formatDateShort(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Formata data e hora: "25/07/2026, 14:30"
 */
export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Formata hora: "14:30"
 */
export function formatTime(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Data relativa: "há 2 minutos", "ontem", "há 3 dias"
 */
export function formatDateRelative(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "—";

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 10) return "agora";
  if (diffSec < 60) return `há ${diffSec}s`;
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHour < 24) return `há ${diffHour}h`;
  if (diffDay === 1) return "ontem";
  if (diffDay < 7) return `há ${diffDay} dias`;
  if (diffWeek < 4) return `há ${diffWeek} sem`;
  if (diffMonth < 12) return `há ${diffMonth} meses`;
  return formatDateShort(d);
}

/**
 * Retorna data ISO para input type="datetime-local".
 */
export function toDateTimeLocalValue(input: string | Date | null | undefined): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─────────────────────────────────────────────────────────────
// PHONE, CEP, DOCUMENT FORMATTING
// ─────────────────────────────────────────────────────────────

/**
 * Formata telefone/celular brasileiro.
 * Seguro para null/undefined.
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const d = phone.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3").replace(/-$/, "");
  }
  return d.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3").replace(/-$/, "");
}

/**
 * Formata CEP brasileiro.
 */
export function formatCEP(cep: string | null | undefined): string {
  if (!cep) return "—";
  const d = cep.replace(/\D/g, "").slice(0, 8);
  return d.replace(/^(\d{5})(\d{0,3}).*/, "$1-$2").replace(/-$/, "");
}

/**
 * Formata CPF: 000.000.000-00
 */
export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return "—";
  const d = cpf.replace(/\D/g, "").slice(0, 11);
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, "$1.$2.$3-$4").replace(/-$/, "");
}

/**
 * Formata CNPJ: 00.000.000/0000-00
 */
export function formatCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return "—";
  const d = cnpj.replace(/\D/g, "").slice(0, 14);
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, "$1.$2.$3/$4-$5").replace(/-$/, "");
}

/**
 * Mascara número de cartão: **** **** **** 1234
 */
export function maskCardNumber(card: string | null | undefined): string {
  if (!card) return "—";
  const d = card.replace(/\D/g, "");
  const last4 = d.slice(-4);
  return `**** **** **** ${last4}`;
}

// ─────────────────────────────────────────────────────────────
// STRING UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Capitaliza primeira letra de cada palavra.
 */
export function capitalize(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
}

/**
 * Trunca texto com ellipsis.
 */
export function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "…";
}

/**
 * Gera slug URL-friendly.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/**
 * Retorna iniciais de um nome (para avatares).
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Sanitiza HTML básico (prevenção XSS).
 * Remove tags perigosas, mantém básicas.
 */
export function sanitizeHtml(html: string): string {
  const allowed = new Set(["b", "i", "em", "strong", "u", "br", "p", "span"]);
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, (tag) => {
      const match = tag.match(/<(\/?)(\w+)/);
      if (!match) return "";
      const [, , tagName] = match;
      return allowed.has(tagName.toLowerCase()) ? tag : "";
    });
}

/**
 * Converte quebras de linha em <br> tags.
 */
export function nl2br(text: string): string {
  return text.replace(/\n/g, "<br>");
}

// ─────────────────────────────────────────────────────────────
// ARRAY UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Agrupa array por chave.
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const k = String(item[key]);
    acc[k] = acc[k] || [];
    acc[k].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * Ordena array por chave.
 */
export function sortBy<T>(array: T[], key: keyof T, order: "asc" | "desc" = "asc"): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    if (aVal === null || aVal === undefined) return order === "asc" ? 1 : -1;
    if (bVal === null || bVal === undefined) return order === "asc" ? -1 : 1;
    if (aVal < bVal) return order === "asc" ? -1 : 1;
    if (aVal > bVal) return order === "asc" ? 1 : -1;
    return 0;
  });
}

/**
 * Remove duplicados por chave.
 */
export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set<string>();
  return array.filter((item) => {
    const k = String(item[key]);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Divide array em chunks.
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// DEBOUNCE / THROTTLE
// ─────────────────────────────────────────────────────────────

/**
 * Debounce: executa função após delay de inatividade.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Throttle: executa função no máximo uma vez a cada delay.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let last = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn(...args);
    }
  };
}

// ─────────────────────────────────────────────────────────────
// OBJECT UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Comparação profunda de objetos.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object") return false;
  if (a === null || b === null) return false;
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) =>
    deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key]
    )
  );
}

/**
 * Remove chaves com valor null/undefined de um objeto.
 */
export function cleanObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)
  ) as Partial<T>;
}

// ─────────────────────────────────────────────────────────────
// BUSINESS LOGIC — CALCULATORS
// ─────────────────────────────────────────────────────────────

/**
 * Calcula desconto de cupom com arredondamento.
 */
export function calculateDiscount(
  value: number,
  type: CouponType,
  discount: number
): number {
  let result: number;
  if (type === "percentage") {
    result = (value * discount) / 100;
  } else {
    result = discount;
  }
  return Math.round(Math.min(value, result) * 100) / 100;
}

/**
 * Calcula preço unitário baseado no peso.
 */
const UNIT_WEIGHT: Partial<Record<ProductUnit, number>> = {
  "100g": 0.1,
  "250g": 0.25,
  "500g": 0.5,
  "1kg": 1,
  "2kg": 2,
  "5kg": 5,
};

export function calculateUnitPrice(
  basePricePerKg: number,
  unit: ProductUnit
): number {
  const w = UNIT_WEIGHT[unit];
  return w ? Math.round(basePricePerKg * w * 100) / 100 : basePricePerKg;
}

/**
 * Verifica se promoção está ativa.
 */
export function isPromoActive(p: {
  promotional_price?: number | null;
  promotional_start?: string | null;
  promotional_end?: string | null;
}): boolean {
  if (!p.promotional_price) return false;
  const now = Date.now();
  if (p.promotional_start && new Date(p.promotional_start).getTime() > now) return false;
  if (p.promotional_end && new Date(p.promotional_end).getTime() < now) return false;
  return true;
}

/**
 * Retorna preço final do produto (considerando promoção).
 */
export function getProductPrice(p: {
  base_price: number;
  promotional_price?: number | null;
  promotional_start?: string | null;
  promotional_end?: string | null;
}): number {
  if (isPromoActive(p)) return p.promotional_price!;
  return p.base_price;
}

/**
 * Calcula frete por distância.
 */
export function calculateDeliveryFee(
  distanceKm: number,
  baseFee: number,
  rates: DeliveryRate[]
): number {
  if (rates.length === 0) return baseFee;
  const rate = rates.find((r) => distanceKm >= r.from_km && distanceKm <= r.to_km);
  return rate ? rate.fee : baseFee;
}

/**
 * Calcula frete grátis (se aplicável).
 */
export function isFreeDelivery(
  subtotal: number,
  freeAbove: number | null | undefined
): boolean {
  if (!freeAbove || freeAbove <= 0) return false;
  return subtotal >= freeAbove;
}

/**
 * Calcula total do pedido.
 */
export function calculateOrderTotal(
  subtotal: number,
  deliveryFee: number,
  discount: number
): number {
  return Math.round((subtotal + deliveryFee - discount) * 100) / 100;
}

// ─────────────────────────────────────────────────────────────
// STORE HOURS
// ─────────────────────────────────────────────────────────────

const DAY_NAMES: Record<string, keyof OpeningHours> = {
  "0": "sunday",
  "1": "monday",
  "2": "tuesday",
  "3": "wednesday",
  "4": "thursday",
  "5": "friday",
  "6": "saturday",
};

/**
 * Verifica se a loja está aberta agora.
 */
export function isStoreOpen(hours: OpeningHours, date = new Date()): boolean {
  const dayKey = DAY_NAMES[String(date.getDay())];
  const day: OpeningHoursDay | undefined = hours[dayKey];
  if (!day || day.closed) return false;

  const now = date.getHours() * 60 + date.getMinutes();
  const [openH, openM] = day.open.split(":").map(Number);
  const [closeH, closeM] = day.close.split(":").map(Number);
  const open = openH * 60 + openM;
  const close = closeH * 60 + closeM;

  return now >= open && now < close;
}

/**
 * Retorna próximo horário de entrega estimado.
 */
export function getNextDeliveryTime(
  deliveryTimeMin: number,
  date = new Date()
): string {
  const d = new Date(date.getTime() + deliveryTimeMin * 60000);
  return formatTime(d);
}

/**
 * Formata horário de funcionamento: "08:00 - 18:00" ou "Fechado"
 */
export function formatOpeningHours(day: OpeningHoursDay): string {
  if (day.closed) return "Fechado";
  return `${day.open} - ${day.close}`;
}

// ─────────────────────────────────────────────────────────────
// ORDER UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Gera número de pedido único: TV-20260725-XXXX
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TV-${date}-${random}`;
}

/**
 * Gera código de cupom aleatório: TERRA-XXXX
 */
export function generateCouponCode(prefix = "TERRA"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${code}`;
}

/**
 * Formata endereço completo em uma linha.
 */
export function formatAddress(address: Address | null | undefined): string {
  if (!address) return "—";
  const parts = [
    address.street,
    address.number,
    address.complement,
    address.neighborhood,
    address.city,
    address.state,
  ].filter(Boolean);
  return parts.join(", ");
}

// ─────────────────────────────────────────────────────────────
// COLOR UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Escurece uma cor HEX.
 */
export function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
  const b = Math.max(0, (num & 0x0000ff) - amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Clareia uma cor HEX.
 */
export function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amount);
  const b = Math.min(255, (num & 0x0000ff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// ─────────────────────────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Valida se string é email válido.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Valida se string é CPF válido (formato e dígitos verificadores).
 */
export function isValidCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(.)(\1){10}$/.test(d)) return false;

  let sum = 0;
  let remainder: number;

  for (let i = 1; i <= 9; i++) sum += parseInt(d.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(d.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(d.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(d.substring(10, 11))) return false;

  return true;
}

/**
 * Valida se string é CNPJ válido.
 */
export function isValidCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14 || /^(.)(\1){13}$/.test(d)) return false;

  let size = d.length - 2;
  let numbers = d.substring(0, size);
  const digits = d.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  size++;
  numbers = d.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

/**
 * Valida se string é CEP válido.
 */
export function isValidCEP(cep: string): boolean {
  return /^\d{8}$/.test(cep.replace(/\D/g, ""));
}

/**
 * Valida se string é telefone brasileiro válido.
 */
export function isValidPhone(phone: string): boolean {
  const d = phone.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 11;
}