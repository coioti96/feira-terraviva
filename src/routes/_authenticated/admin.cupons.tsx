import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Plus, Search, Filter, ArrowUpDown, Pencil, Trash2, Copy, Eye, EyeOff,
  Tag, X, ChevronDown, Check, AlertTriangle, Loader2,
  SlidersHorizontal, Grid3X3, List, Percent, DollarSign,
  Calendar, Package, Sparkles, ArrowUpRight, Download,
  Ticket, Clock, Ban, Lock, TrendingUp,
} from "lucide-react";
import { useCatalogStore } from "@/stores/catalog";
import {
  formatCurrency, formatDateShort, formatDateTime, cn,
  generateCouponCode, calculateDiscount,
} from "@/lib/utils";
import { listCoupons, createCoupon, updateCoupon, deleteCoupon, exportCouponsCsv } from "@/utils/server-function/coupons";
import type { Coupon, CouponType, CouponStatus, Product, Category, CouponInput } from "@/types";

export const Route = createFileRoute("/_authenticated/admin/cupons")({
  head: () => ({
    meta: [{ title: "Cupons — Painel Administrativo Terra Viva" }],
  }),
  component: AdminCoupons,
});

const COUPON_TYPES: { key: CouponType; label: string; icon: React.ElementType }[] = [
  { key: "percentage", label: "Percentual", icon: Percent },
  { key: "fixed", label: "Valor fixo", icon: DollarSign },
];

const VIEW_MODES = ["grid", "list"] as const;
type ViewMode = (typeof VIEW_MODES)[number];

const SORT_OPTIONS = [
  { key: "code", label: "Código" },
  { key: "value", label: "Valor" },
  { key: "current_uses", label: "Usos" },
  { key: "created_at", label: "Data criação" },
  { key: "end_date", label: "Data expiração" },
] as const;

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function getCouponStatus(coupon: Coupon): { status: CouponStatus; label: string; icon: React.ElementType; color: string } {
  const now = new Date();
  const startDate = coupon.start_date ? new Date(coupon.start_date) : null;
  const endDate = coupon.end_date ? new Date(coupon.end_date) : null;
  const isExpired = endDate ? now > endDate : false;
  const isFuture = startDate ? now < startDate : false;
  const isExhausted = coupon.max_uses > 0 && coupon.current_uses >= coupon.max_uses;

  if (!coupon.is_active) return { status: "inactive", label: "Inativo", icon: Ban, color: "stone" };
  if (isExhausted) return { status: "exhausted", label: "Esgotado", icon: Ticket, color: "danger" };
  if (isExpired) return { status: "expired", label: "Expirado", icon: Clock, color: "terracotta" };
  if (isFuture) return { status: "future", label: "Futuro", icon: Lock, color: "info" };
  return { status: "active", label: "Ativo", icon: Check, color: "success" };
}

function getDiscountPreview(value: number, type: CouponType): string {
  const examples = [50, 100, 200];
  return examples.map((price) => {
    const discount = calculateDiscount(price, type, value);
    const final = price - discount;
    return `R$${price} → R$${final.toFixed(2).replace(".", ",")}`;
  }).join(" · ");
}

// ─────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────

function CouponsSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "list") {
    return (
      <div className="tv-card overflow-hidden">
        <div className="tv-table w-full">
          <thead><tr>{Array.from({ length: 7 }).map((_, i) => (
            <th key={i}><div className="tv-skeleton tv-skeleton--text" style={{ width: `${60 + i * 8}%` }} /></th>
          ))}</tr></thead>
          <tbody>{Array.from({ length: 6 }).map((_, i) => (
            <tr key={i}>
              <td className="flex items-center gap-3">
                <div className="tv-skeleton tv-skeleton--avatar" style={{ width: 40, height: 40, borderRadius: 10 }} />
                <div className="flex-1 space-y-1">
                  <div className="tv-skeleton tv-skeleton--text" style={{ width: "70%" }} />
                  <div className="tv-skeleton tv-skeleton--text-sm" />
                </div>
              </td>
              {Array.from({ length: 5 }).map((_, j) => (
                <td key={j}><div className="tv-skeleton tv-skeleton--text" style={{ width: `${50 + j * 12}%` }} /></td>
              ))}
              <td><div className="tv-skeleton tv-skeleton--button" /></td>
            </tr>
          ))}</tbody>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="tv-card p-0">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="tv-skeleton tv-skeleton--text" style={{ width: "60%" }} />
              <div className="tv-skeleton tv-skeleton--button" style={{ width: 60, height: 24 }} />
            </div>
            <div className="tv-skeleton tv-skeleton--text-sm" style={{ width: "40%" }} />
            <div className="tv-skeleton tv-skeleton--text" style={{ width: "80%" }} />
            <div className="flex items-center justify-between pt-2">
              <div className="tv-skeleton tv-skeleton--text" style={{ width: "30%" }} />
              <div className="tv-skeleton tv-skeleton--button" style={{ width: 80 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────

function EmptyCouponsState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="tv-empty py-20">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--tv-moss)]/10 mb-4">
        <Ticket className="h-10 w-10 text-[var(--tv-moss)]" />
      </div>
      <h3 className="font-serif text-xl text-[var(--tv-forest)]">Nenhum cupom cadastrado</h3>
      <p className="mt-2 text-sm text-[var(--tv-stone-500)] max-w-sm">
        Crie cupons de desconto para atrair mais clientes e aumentar suas vendas.
      </p>
      <button onClick={onCreate} className="tv-btn tv-btn--primary mt-6 gap-2">
        <Plus className="h-4 w-4" /> Criar cupom
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DELETE MODAL
// ─────────────────────────────────────────────────────────────

function DeleteConfirmModal({ coupon, onConfirm, onCancel, isDeleting }: {
  coupon: Coupon; onConfirm: () => void; onCancel: () => void; isDeleting: boolean;
}) {
  return (
    <div className="tv-modal-overlay" onClick={onCancel}>
      <div className="tv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tv-modal__header">
          <h3 className="tv-modal__title flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--tv-terracota)]" /> Excluir cupom
          </h3>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-[var(--tv-stone-400)] hover:bg-[var(--tv-stone-100)] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="tv-modal__body">
          <p className="text-[var(--tv-stone-600)] text-sm leading-relaxed">
            Tem certeza que deseja excluir o cupom <strong className="text-[var(--tv-forest)]">{coupon.code}</strong>?
            Esta ação não pode ser desfeita.
          </p>
        </div>
        <div className="tv-modal__footer">
          <button onClick={onCancel} className="tv-btn tv-btn--secondary" disabled={isDeleting}>Cancelar</button>
          <button onClick={onConfirm} className="tv-btn tv-btn--danger gap-2" disabled={isDeleting}>
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Excluir permanentemente
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COUPON CARD (Grid)
// ─────────────────────────────────────────────────────────────

function CouponCard({ coupon, onEdit, onToggleActive, onDelete }: {
  coupon: Coupon; onEdit: (c: Coupon) => void; onToggleActive: (c: Coupon) => void; onDelete: (c: Coupon) => void;
}) {
  const status = getCouponStatus(coupon);
  const StatusIcon = status.icon;
  const usagePercent = coupon.max_uses > 0 ? Math.min((coupon.current_uses / coupon.max_uses) * 100, 100) : 0;

  return (
    <div className="tv-card group relative overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-serif text-lg text-[var(--tv-forest)] truncate">{coupon.code}</h3>
              <button
                onClick={() => { navigator.clipboard.writeText(coupon.code); toast.success("Código copiado!"); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--tv-stone-400)] hover:bg-[var(--tv-moss)]/10 hover:text-[var(--tv-moss)] transition-colors"
                title="Copiar código"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
              status.color === "success" && "bg-[var(--tv-success-lt)] text-[var(--tv-success)]",
              status.color === "danger" && "bg-[var(--tv-danger-lt)] text-[var(--tv-danger)]",
              status.color === "terracotta" && "bg-[var(--tv-warning-lt)] text-[var(--tv-terracota-dk)]",
              status.color === "info" && "bg-[var(--tv-info-lt)] text-[var(--tv-info)]",
              status.color === "stone" && "bg-[var(--tv-stone-100)] text-[var(--tv-stone-500)]",
            )}>
              <StatusIcon className="h-3 w-3" /> {status.label}
            </span>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[var(--tv-moss)]">
              {coupon.type === "percentage" ? `${coupon.value}%` : formatCurrency(coupon.value)}
            </p>
            <p className="text-[10px] text-[var(--tv-stone-400)] uppercase tracking-wide">OFF</p>
          </div>
        </div>

        {/* Usage bar */}
        {coupon.max_uses > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--tv-stone-500)]">{coupon.current_uses} de {coupon.max_uses} usos</span>
              <span className="text-[var(--tv-stone-400)]">{usagePercent.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--tv-stone-200)] overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  usagePercent >= 90 ? "bg-[var(--tv-danger)]" : usagePercent >= 70 ? "bg-[var(--tv-terracota)]" : "bg-[var(--tv-moss)]"
                )}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Details */}
        <div className="space-y-1.5 text-xs text-[var(--tv-stone-500)]">
          {coupon.min_purchase && coupon.min_purchase > 0 && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" /> Mín: {formatCurrency(coupon.min_purchase)}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            {coupon.start_date ? formatDateShort(coupon.start_date) : "Sem início"} → {coupon.end_date ? formatDateShort(coupon.end_date) : "Sem fim"}
          </div>
          {coupon.applicable_products && (coupon.applicable_products as string[]).length > 0 && (
            <div className="flex items-center gap-1.5">
              <Package className="h-3 w-3" /> {(coupon.applicable_products as string[]).length} produto(s)
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="p-2.5 rounded-lg bg-[var(--tv-cream)] border border-[var(--tv-stone-200)]">
          <p className="text-[10px] text-[var(--tv-stone-400)] uppercase tracking-wide mb-1">Preview</p>
          <p className="text-xs text-[var(--tv-stone-600)]">{getDiscountPreview(coupon.value, coupon.type)}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button onClick={() => onEdit(coupon)} className="tv-btn tv-btn--secondary tv-btn--sm flex-1 gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Editar
          </button>
          <button
            onClick={() => onToggleActive(coupon)}
            className={cn(
              "tv-btn tv-btn--sm flex-1 gap-1.5",
              coupon.is_active ? "tv-btn--secondary" : "tv-btn--success"
            )}
          >
            {coupon.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {coupon.is_active ? "Desativar" : "Ativar"}
          </button>
          <button onClick={() => onDelete(coupon)} className="tv-btn tv-btn--danger tv-btn--sm gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COUPON ROW (List)
// ─────────────────────────────────────────────────────────────

function CouponRow({ coupon, onEdit, onToggleActive, onDelete }: {
  coupon: Coupon; onEdit: (c: Coupon) => void; onToggleActive: (c: Coupon) => void; onDelete: (c: Coupon) => void;
}) {
  const status = getCouponStatus(coupon);
  const StatusIcon = status.icon;

  return (
    <tr className="group transition-colors">
      <td>
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0",
            coupon.type === "percentage" ? "bg-[var(--tv-info-lt)] text-[var(--tv-info)]" : "bg-[var(--tv-success-lt)] text-[var(--tv-success)]"
          )}>
            {coupon.type === "percentage" ? <Percent className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--tv-forest)] text-sm">{coupon.code}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(coupon.code); toast.success("Copiado!"); }}
                className="text-[var(--tv-stone-400)] hover:text-[var(--tv-moss)] transition-colors"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold",
              status.color === "success" && "text-[var(--tv-success)]",
              status.color === "danger" && "text-[var(--tv-danger)]",
              status.color === "terracotta" && "text-[var(--tv-terracota-dk)]",
              status.color === "info" && "text-[var(--tv-info)]",
              status.color === "stone" && "text-[var(--tv-stone-500)]",
            )}>
              <StatusIcon className="h-2.5 w-2.5" /> {status.label}
            </span>
          </div>
        </div>
      </td>
      <td>
        <span className="text-sm font-semibold text-[var(--tv-moss)]">
          {coupon.type === "percentage" ? `${coupon.value}%` : formatCurrency(coupon.value)}
        </span>
      </td>
      <td>
        <div className="text-sm text-[var(--tv-stone-700)]">
          {coupon.max_uses > 0 ? (
            <span className={cn(
              coupon.current_uses >= coupon.max_uses ? "text-[var(--tv-danger)] font-semibold" : ""
            )}>
              {coupon.current_uses} / {coupon.max_uses}
            </span>
          ) : (
            <span className="text-[var(--tv-stone-400)]">Ilimitado</span>
          )}
        </div>
      </td>
      <td>
        {coupon.min_purchase && coupon.min_purchase > 0 ? (
          <span className="text-sm text-[var(--tv-stone-700)]">{formatCurrency(coupon.min_purchase)}</span>
        ) : (
          <span className="text-sm text-[var(--tv-stone-400)]">—</span>
        )}
      </td>
      <td>
        <div className="text-xs text-[var(--tv-stone-500)]">
          <div>{coupon.start_date ? formatDateShort(coupon.start_date) : "—"}</div>
          <div className="text-[var(--tv-stone-400)]">→ {coupon.end_date ? formatDateShort(coupon.end_date) : "—"}</div>
        </div>
      </td>
      <td>
        <span className={cn(
          "tv-status",
          coupon.is_active ? "tv-status--published" : "tv-status--draft"
        )}>
          {coupon.is_active ? "Ativo" : "Inativo"}
        </span>
      </td>
      <td>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(coupon)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--tv-stone-500)] hover:bg-[var(--tv-moss)]/10 hover:text-[var(--tv-moss)] transition-colors" title="Editar">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => onToggleActive(coupon)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--tv-stone-500)] hover:bg-[var(--tv-moss)]/10 hover:text-[var(--tv-moss)] transition-colors" title={coupon.is_active ? "Desativar" : "Ativar"}>
            {coupon.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          <button onClick={() => onDelete(coupon)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--tv-stone-500)] hover:bg-[var(--tv-danger-lt)] hover:text-[var(--tv-danger)] transition-colors" title="Excluir">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────
// COUPON MODAL (Create/Edit)
// ─────────────────────────────────────────────────────────────

function CouponModal({ coupon, products, categories, onSave, onClose, isSaving }: {
  coupon: Coupon | null; products: Product[]; categories: Category[];
  onSave: (input: CouponInput, id?: string) => void;
  onClose: () => void; isSaving: boolean;
}) {
  const isEditing = !!coupon;
  const [form, setForm] = useState<{
    code: string; type: CouponType; value: string; max_uses: string;
    min_purchase: string; start_date: string; end_date: string;
    applicable_products: string[]; applicable_categories: string[];
    is_active: boolean;
  }>(() => {
    if (coupon) {
      return {
        code: coupon.code,
        type: coupon.type,
        value: String(coupon.value),
        max_uses: String(coupon.max_uses),
        min_purchase: String(coupon.min_purchase || ""),
        start_date: coupon.start_date ? coupon.start_date.slice(0, 16) : "",
        end_date: coupon.end_date ? coupon.end_date.slice(0, 16) : "",
        applicable_products: (coupon.applicable_products as string[]) || [],
        applicable_categories: (coupon.applicable_categories as string[]) || [],
        is_active: coupon.is_active,
      };
    }
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const toLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return {
      code: generateCouponCode("TERRA"),
      type: "percentage",
      value: "10",
      max_uses: "100",
      min_purchase: "",
      start_date: toLocal(now),
      end_date: toLocal(tomorrow),
      applicable_products: [],
      applicable_categories: [],
      is_active: true,
    };
  });

  const [activeTab, setActiveTab] = useState<"basic" | "rules" | "products">("basic");

  const handleSave = useCallback(() => {
    const value = parseFloat(form.value);
    if (!form.code.trim() || form.code.trim().length < 3) {
      toast.error("Código deve ter pelo menos 3 caracteres");
      return;
    }
    if (isNaN(value) || value <= 0) {
      toast.error("Valor do desconto deve ser maior que zero");
      return;
    }
    if (form.type === "percentage" && value > 100) {
      toast.error("Desconto percentual não pode exceder 100%");
      return;
    }
    const startDate = new Date(form.start_date);
    const endDate = new Date(form.end_date);
    if (endDate <= startDate) {
      toast.error("Data de término deve ser posterior à data de início");
      return;
    }

    onSave({
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value,
      max_uses: parseInt(form.max_uses) || 0,
      min_purchase: form.min_purchase ? parseFloat(form.min_purchase) : null,
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
      applicable_products: form.applicable_products.length > 0 ? form.applicable_products : null,
      applicable_categories: form.applicable_categories.length > 0 ? form.applicable_categories : null,
      is_active: form.is_active,
    }, coupon?.id);
  }, [form, coupon, onSave]);

  const toggleProduct = (id: string) => {
    setForm((f) => ({
      ...f,
      applicable_products: f.applicable_products.includes(id)
        ? f.applicable_products.filter((p) => p !== id)
        : [...f.applicable_products, id],
    }));
  };

  const toggleCategory = (id: string) => {
    setForm((f) => ({
      ...f,
      applicable_categories: f.applicable_categories.includes(id)
        ? f.applicable_categories.filter((c) => c !== id)
        : [...f.applicable_categories, id],
    }));
  };

  const previewSubtotal = 100;
  const previewDiscount = form.value ? calculateDiscount(previewSubtotal, form.type, parseFloat(form.value) || 0) : 0;

  const tabs = [
    { key: "basic" as const, label: "Básico", icon: Tag },
    { key: "rules" as const, label: "Regras", icon: SlidersHorizontal },
    { key: "products" as const, label: "Produtos", icon: Package },
  ];

  return (
    <div className="tv-modal-overlay" onClick={onClose}>
      <div className="tv-modal tv-modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="tv-modal__header">
          <div>
            <h3 className="tv-modal__title">{isEditing ? "Editar cupom" : "Novo cupom"}</h3>
            <p className="text-xs text-[var(--tv-stone-400)] mt-0.5">
              {isEditing ? `Editando "${coupon?.code}"` : "Configure as regras do cupom de desconto"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-[var(--tv-stone-400)] hover:bg-[var(--tv-stone-100)] hover:text-[var(--tv-forest)] transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="tv-tabs px-6 border-b border-[var(--tv-stone-200)]">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn("tv-tab flex items-center gap-1.5", activeTab === tab.key && "tv-tab--active")}>
              <tab.icon className="h-3.5 w-3.5" />{tab.label}
            </button>
          ))}
        </div>

        <div className="tv-modal__body space-y-5">
          {activeTab === "basic" && (<>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="tv-label tv-label--required">Código do cupom</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="TERRA-XXXX"
                    className="tv-input flex-1 font-mono text-sm tracking-wider"
                    maxLength={20}
                  />
                  {!isEditing && (
                    <button
                      onClick={() => setForm((f) => ({ ...f, code: generateCouponCode("TERRA") }))}
                      className="tv-btn tv-btn--secondary tv-btn--sm gap-1.5 whitespace-nowrap"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Gerar
                    </button>
                  )}
                </div>
                <p className="tv-hint">Mínimo 3 caracteres. Será salvo em maiúsculas.</p>
              </div>

              <div>
                <label className="tv-label tv-label--required">Tipo de desconto</label>
                <div className="flex gap-2 mt-1.5">
                  {COUPON_TYPES.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setForm((f) => ({ ...f, type: t.key }))}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border",
                        form.type === t.key
                          ? "bg-[var(--tv-moss)] text-white border-[var(--tv-moss)] shadow-sm"
                          : "bg-white text-[var(--tv-stone-500)] border-[var(--tv-stone-200)] hover:border-[var(--tv-moss-lt)]"
                      )}
                    >
                      <t.icon className="h-4 w-4" /> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="tv-label tv-label--required">
                  Valor {form.type === "percentage" ? "(%)" : "(R$)"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tv-stone-400)] text-sm">
                    {form.type === "percentage" ? "%" : "R$"}
                  </span>
                  <input
                    type="number"
                    step={form.type === "percentage" ? "1" : "0.01"}
                    min="0.01"
                    max={form.type === "percentage" ? "100" : undefined}
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                    className="tv-input pl-8"
                    placeholder={form.type === "percentage" ? "10" : "15,00"}
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 rounded-xl bg-[var(--tv-moss)]/5 border border-[var(--tv-moss)]/15">
              <p className="text-xs text-[var(--tv-stone-500)] mb-2">Preview de desconto</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-[var(--tv-stone-600)]">R$ {previewSubtotal.toFixed(2).replace(".", ",")}</span>
                <ArrowUpRight className="h-4 w-4 text-[var(--tv-moss)]" />
                <span className="text-[var(--tv-stone-400)] line-through">R$ {previewSubtotal.toFixed(2).replace(".", ",")}</span>
                <span className="text-lg font-bold text-[var(--tv-moss)]">
                  R$ {(previewSubtotal - previewDiscount).toFixed(2).replace(".", ",")}
                </span>
                <span className="text-xs text-[var(--tv-success)] font-semibold">
                  {form.type === "percentage" ? `${parseFloat(form.value) || 0}% OFF` : `${formatCurrency(parseFloat(form.value) || 0)} OFF`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div
                  className={cn("relative h-6 w-11 rounded-full transition-colors", form.is_active ? "bg-[var(--tv-moss)]" : "bg-[var(--tv-stone-300)]")}
                  onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                >
                  <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform", form.is_active ? "left-[22px]" : "left-0.5")} />
                </div>
                <span className="text-sm font-medium text-[var(--tv-stone-700)]">Cupom ativo</span>
              </label>
            </div>
          </>)}

          {activeTab === "rules" && (<>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="tv-label">Limite de usos (0 = ilimitado)</label>
                <input
                  type="number"
                  min="0"
                  value={form.max_uses}
                  onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                  placeholder="100"
                  className="tv-input"
                />
              </div>
              <div>
                <label className="tv-label">Mínimo de compra (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tv-stone-400)] text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.min_purchase}
                    onChange={(e) => setForm((f) => ({ ...f, min_purchase: e.target.value }))}
                    placeholder="0,00"
                    className="tv-input pl-8"
                  />
                </div>
                <p className="tv-hint">Deixe vazio para não exigir mínimo</p>
              </div>
              <div>
                <label className="tv-label tv-label--required">Data de início</label>
                <input
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                  className="tv-input"
                />
              </div>
              <div>
                <label className="tv-label tv-label--required">Data de término</label>
                <input
                  type="datetime-local"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                  className="tv-input"
                />
              </div>
            </div>
          </>)}

          {activeTab === "products" && (<>
            <div className="bg-[var(--tv-cream)] rounded-xl p-4 border border-[var(--tv-stone-200)]">
              <p className="text-xs text-[var(--tv-stone-500)] leading-relaxed">
                <strong className="text-[var(--tv-forest)]">Dica:</strong> Selecione produtos ou categorias específicas para restringir o cupom. Deixe tudo vazio para aplicar em todos os produtos.
              </p>
            </div>

            {categories.length > 0 && (
              <div>
                <label className="tv-label">Categorias aplicáveis</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={cn(
                        "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                        form.applicable_categories.includes(cat.id)
                          ? "bg-[var(--tv-moss)] text-white border-[var(--tv-moss)]"
                          : "bg-white text-[var(--tv-stone-500)] border-[var(--tv-stone-200)] hover:border-[var(--tv-moss-lt)]"
                      )}
                    >
                      {form.applicable_categories.includes(cat.id) && <Check className="h-3 w-3" />}
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {products.length > 0 && (
              <div>
                <label className="tv-label">Produtos aplicáveis</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-40 overflow-y-auto">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => toggleProduct(p.id)}
                      className={cn(
                        "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                        form.applicable_products.includes(p.id)
                          ? "bg-[var(--tv-moss)] text-white border-[var(--tv-moss)]"
                          : "bg-white text-[var(--tv-stone-500)] border-[var(--tv-stone-200)] hover:border-[var(--tv-moss-lt)]"
                      )}
                    >
                      {form.applicable_products.includes(p.id) && <Check className="h-3 w-3" />}
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>)}
        </div>

        <div className="tv-modal__footer">
          <button onClick={onClose} className="tv-btn tv-btn--secondary" disabled={isSaving}>Cancelar</button>
          <button onClick={handleSave} className="tv-btn tv-btn--primary gap-2" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isEditing ? "Salvar alterações" : "Criar cupom"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────

function AdminCoupons() {
  const { products, categories, coupons, isLoading, error, fetchAll, addCoupon, updateCoupon: updateStoreCoupon, deleteCoupon: deleteStoreCoupon } = useCatalogStore();

  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [modalCoupon, setModalCoupon] = useState<Coupon | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredCoupons = useMemo(() => {
    let result = [...coupons];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => c.code.toLowerCase().includes(q));
    }

    if (statusFilter !== "all") {
      const now = new Date();
      result = result.filter((c) => {
        const startDate = c.start_date ? new Date(c.start_date) : null;
        const endDate = c.end_date ? new Date(c.end_date) : null;
        const isExpired = endDate ? now > endDate : false;
        const isFuture = startDate ? now < startDate : false;
        const isExhausted = c.max_uses > 0 && c.current_uses >= c.max_uses;

        switch (statusFilter) {
          case "active": return c.is_active && !isExpired && !isExhausted && !isFuture;
          case "inactive": return !c.is_active;
          case "expired": return isExpired;
          case "exhausted": return isExhausted;
          case "future": return isFuture;
          default: return true;
        }
      });
    }

    if (typeFilter !== "all") {
      result = result.filter((c) => c.type === typeFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "code": comparison = a.code.localeCompare(b.code); break;
        case "value": comparison = a.value - b.value; break;
        case "current_uses": comparison = a.current_uses - b.current_uses; break;
        case "created_at": comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(); break;
        case "end_date": comparison = new Date(a.end_date || 0).getTime() - new Date(b.end_date || 0).getTime(); break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [coupons, searchQuery, statusFilter, typeFilter, sortKey, sortOrder]);

  const stats = useMemo(() => {
    const now = new Date();
    const total = coupons.length;
    const active = coupons.filter((c) => {
      const endDate = c.end_date ? new Date(c.end_date) : null;
      const isExpired = endDate ? now > endDate : false;
      const isExhausted = c.max_uses > 0 && c.current_uses >= c.max_uses;
      return c.is_active && !isExpired && !isExhausted;
    }).length;
    const expired = coupons.filter((c) => {
      const endDate = c.end_date ? new Date(c.end_date) : null;
      return endDate ? now > endDate : false;
    }).length;
    const exhausted = coupons.filter((c) => c.max_uses > 0 && c.current_uses >= c.max_uses).length;
    const totalUses = coupons.reduce((sum, c) => sum + c.current_uses, 0);
    return { total, active, expired, exhausted, totalUses };
  }, [coupons]);

  const handleCreate = useCallback(() => { setModalCoupon(null); setIsModalOpen(true); }, []);
  const handleEdit = useCallback((coupon: Coupon) => { setModalCoupon(coupon); setIsModalOpen(true); }, []);

  const handleSave = useCallback(async (input: CouponInput, id?: string) => {
    setIsSaving(true);
    try {
      if (id) {
        const success = await updateStoreCoupon(id, input as Partial<Coupon>);
        if (success) {
          toast.success("Cupom atualizado com sucesso!");
          setIsModalOpen(false);
        } else {
          toast.error(useCatalogStore.getState().error || "Erro ao atualizar cupom");
        }
      } else {
        const result = await addCoupon(input);
        if (result) {
          toast.success("Cupom criado com sucesso!");
          setIsModalOpen(false);
        } else {
          toast.error(useCatalogStore.getState().error || "Erro ao criar cupom");
        }
      }
    } catch (err) {
      console.error("[handleSave] Erro:", err);
      toast.error("Erro inesperado");
    } finally {
      setIsSaving(false);
    }
  }, [addCoupon, updateStoreCoupon]);

  const handleToggleActive = useCallback(async (coupon: Coupon) => {
    const newActive = !coupon.is_active;
    const success = await updateStoreCoupon(coupon.id, { is_active: newActive });
    if (success) toast.success(newActive ? "Cupom ativado" : "Cupom desativado");
    else toast.error("Erro ao alterar status");
  }, [updateStoreCoupon]);

  const handleDelete = useCallback((coupon: Coupon) => { setDeleteTarget(coupon); }, []);
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const success = await deleteStoreCoupon(deleteTarget.id);
      if (success) toast.success("Cupom excluído");
      else toast.error("Erro ao excluir cupom");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteStoreCoupon]);

  const handleExportCsv = useCallback(async () => {
    try {
      const result = await exportCouponsCsv();
      if (result.success && result.csv) {
        const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `cupons-terra-viva-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        toast.success("CSV exportado com sucesso!");
      } else {
        toast.error(result.error || "Erro ao exportar");
      }
    } catch (err) {
      toast.error("Erro ao exportar CSV");
    }
  }, []);

  const toggleSort = useCallback((key: string) => {
    if (sortKey === key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortOrder("asc"); }
  }, [sortKey]);

  if (isLoading && !coupons.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="tv-skeleton tv-skeleton--text" style={{ width: "200px", height: "36px" }} />
            <div className="tv-skeleton tv-skeleton--text-sm" style={{ width: "300px" }} />
          </div>
          <div className="tv-skeleton tv-skeleton--button" />
        </div>
        <CouponsSkeleton viewMode={viewMode} />
      </div>
    );
  }

  if (error && !coupons.length) {
    return (
      <div className="tv-empty py-20">
        <AlertTriangle className="h-10 w-10 text-[var(--tv-terracota)] mb-3" />
        <h3 className="font-serif text-xl text-[var(--tv-forest)]">Erro ao carregar cupons</h3>
        <p className="mt-2 text-sm text-[var(--tv-stone-500)]">{error}</p>
        <button onClick={fetchAll} className="tv-btn tv-btn--primary mt-4 gap-2">
          <ArrowUpRight className="h-4 w-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[var(--tv-forest)]">Cupons</h1>
          <p className="mt-1 text-sm text-[var(--tv-stone-500)]">
            {stats.total} cupom{stats.total !== 1 ? "s" : ""} cadastrado{stats.total !== 1 ? "s" : ""}
            {stats.active !== stats.total && <span className="text-[var(--tv-stone-400)]"> · {stats.active} ativo{stats.active !== 1 ? "s" : ""}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCsv} className="tv-btn tv-btn--secondary tv-btn--sm gap-1.5">
            <Download className="h-3.5 w-3.5" /> Exportar CSV
          </button>
          <button onClick={handleCreate} className="tv-btn tv-btn--primary gap-2">
            <Plus className="h-4 w-4" /> Novo cupom
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "forest" as const },
          { label: "Ativos", value: stats.active, color: "moss" as const },
          { label: "Expirados", value: stats.expired, color: "terracotta" as const, alert: stats.expired > 0 },
          { label: "Esgotados", value: stats.exhausted, color: "danger" as const, alert: stats.exhausted > 0 },
          { label: "Usos totais", value: stats.totalUses, color: "gold" as const },
        ].map((stat) => (
          <div key={stat.label} className={cn(
            "rounded-xl border p-3 transition-all",
            stat.alert ? "bg-[var(--tv-warning-lt)] border-[var(--tv-terracota)]/20" : "bg-white border-[var(--tv-stone-200)]"
          )}>
            <p className="text-xs text-[var(--tv-stone-400)] uppercase tracking-wide">{stat.label}</p>
            <p className={cn(
              "text-2xl font-bold mt-0.5",
              stat.color === "forest" && "text-[var(--tv-forest)]",
              stat.color === "moss" && "text-[var(--tv-moss)]",
              stat.color === "terracotta" && "text-[var(--tv-terracota)]",
              stat.color === "danger" && "text-[var(--tv-danger)]",
              stat.color === "gold" && "text-[var(--tv-gold)]",
            )}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--tv-stone-400)] pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar cupons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tv-input pl-10 w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tv-stone-400)] hover:text-[var(--tv-stone-600)]">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button onClick={() => setShowFilters((s) => !s)} className={cn("tv-btn tv-btn--secondary tv-btn--sm gap-1.5", showFilters && "border-[var(--tv-moss-lt)] text-[var(--tv-moss)]")}>
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros
          {(statusFilter !== "all" || typeFilter !== "all") && <span className="h-2 w-2 rounded-full bg-[var(--tv-moss)]" />}
        </button>
        <div className="relative">
          <select value={`${sortKey}-${sortOrder}`} onChange={(e) => { const [key, order] = e.target.value.split("-"); setSortKey(key); setSortOrder(order as "asc" | "desc"); }} className="tv-input tv-input--sm appearance-none pr-8 cursor-pointer">
            {SORT_OPTIONS.map((opt) => (<option key={`${opt.key}-asc`} value={`${opt.key}-asc`}>{opt.label} ↑</option>))}
            {SORT_OPTIONS.map((opt) => (<option key={`${opt.key}-desc`} value={`${opt.key}-desc`}>{opt.label} ↓</option>))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--tv-stone-400)] pointer-events-none" />
        </div>
        <div className="flex items-center rounded-lg border border-[var(--tv-stone-200)] overflow-hidden">
          <button onClick={() => setViewMode("grid")} className={cn("flex h-9 w-9 items-center justify-center transition-colors", viewMode === "grid" ? "bg-[var(--tv-moss)] text-white" : "text-[var(--tv-stone-400)] hover:bg-[var(--tv-cream)]")}>
            <Grid3X3 className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode("list")} className={cn("flex h-9 w-9 items-center justify-center transition-colors", viewMode === "list" ? "bg-[var(--tv-moss)] text-white" : "text-[var(--tv-stone-400)] hover:bg-[var(--tv-cream)]")}>
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[var(--tv-cream)] border border-[var(--tv-stone-200)] animate-fade-in">
          <div>
            <label className="tv-label tv-label--sm">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="tv-input tv-input--sm mt-1">
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
              <option value="expired">Expirados</option>
              <option value="exhausted">Esgotados</option>
              <option value="future">Futuros</option>
            </select>
          </div>
          <div>
            <label className="tv-label tv-label--sm">Tipo</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="tv-input tv-input--sm mt-1">
              <option value="all">Todos</option>
              <option value="percentage">Percentual (%)</option>
              <option value="fixed">Valor fixo (R$)</option>
            </select>
          </div>
        </div>
      )}

      {filteredCoupons.length !== coupons.length && (
        <p className="text-xs text-[var(--tv-stone-400)]">
          Mostrando {filteredCoupons.length} de {coupons.length} cupons{searchQuery && <span> para &quot;{searchQuery}&quot;</span>}
        </p>
      )}

      {/* Content */}
      {filteredCoupons.length === 0 ? (
        <EmptyCouponsState onCreate={handleCreate} />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCoupons.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} onEdit={handleEdit} onToggleActive={handleToggleActive} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="tv-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tv-table w-full">
              <thead>
                <tr>
                  <th className="cursor-pointer" onClick={() => toggleSort("code")}><span className="tv-table__sort">Cupom<ArrowUpDown className="h-3 w-3 tv-table__sort-icon" /></span></th>
                  <th className="cursor-pointer" onClick={() => toggleSort("value")}><span className="tv-table__sort">Desconto<ArrowUpDown className="h-3 w-3 tv-table__sort-icon" /></span></th>
                  <th className="cursor-pointer" onClick={() => toggleSort("current_uses")}><span className="tv-table__sort">Usos<ArrowUpDown className="h-3 w-3 tv-table__sort-icon" /></span></th>
                  <th>Mín. Compra</th>
                  <th>Período</th>
                  <th className="cursor-pointer" onClick={() => toggleSort("created_at")}><span className="tv-table__sort">Status<ArrowUpDown className="h-3 w-3 tv-table__sort-icon" /></span></th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((coupon) => (
                  <CouponRow key={coupon.id} coupon={coupon} onEdit={handleEdit} onToggleActive={handleToggleActive} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {isModalOpen && (
        <CouponModal coupon={modalCoupon} products={products} categories={categories} onSave={handleSave} onClose={() => setIsModalOpen(false)} isSaving={isSaving} />
      )}

      {deleteTarget && (
        <DeleteConfirmModal coupon={deleteTarget} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} isDeleting={isDeleting} />
      )}
    </div>
  );
}