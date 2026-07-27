import { createFileRoute } from "@tanstack/react-router";
import { uploadProductImage } from "@/utils/server-function/uploadProductImage";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import {
  Plus, Search, Filter, ArrowUpDown, Pencil, Trash2, Copy, Eye, EyeOff,
  Package, ImageIcon, X, ChevronDown, Check, AlertTriangle, Loader2,
  SlidersHorizontal, Grid3X3, List, Tag, DollarSign, Boxes, Sparkles,
  ArrowUpRight, Upload,
} from "lucide-react";
import { useCatalogStore } from "@/stores/catalog";
import { formatCurrency, generateSlug, cn } from "@/lib/utils";
import type { Product, ProductUnit, Category, ProductInput } from "@/types";

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  head: () => ({
    meta: [{ title: "Produtos — Painel Administrativo Terra Viva" }],
  }),
  component: AdminProducts,
});

const ALL_UNITS: ProductUnit[] = [
  "unidade", "100g", "250g", "500g", "1kg", "2kg", "5kg",
  "maço", "bandeja", "caixa", "pacote", "dúzia", "litro",
];

const VIEW_MODES = ["grid", "list"] as const;
type ViewMode = (typeof VIEW_MODES)[number];

const SORT_OPTIONS = [
  { key: "name", label: "Nome" },
  { key: "base_price", label: "Preço" },
  { key: "stock_total", label: "Estoque" },
  { key: "created_at", label: "Data" },
  { key: "is_featured", label: "Destaque" },
] as const;

function getTotalStock(stock: Record<string, number> | undefined): number {
  if (!stock) return 0;
  return Object.values(stock).reduce((sum, val) => sum + (val || 0), 0);
}

function getPriceRange(product: Product): string {
  const prices = Object.values(product.unit_prices || {});
  if (!prices.length) return formatCurrency(product.base_price || 0);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return formatCurrency(min);
  return `${formatCurrency(min)} – ${formatCurrency(max)}`;
}

function emptyProductInput(): ProductInput {
  return {
    name: "", description: null, category_id: null, base_price: 0,
    unit_prices: {}, promotional_price: null, promotional_start: null,
    promotional_end: null, stock: {}, images: [], tags: [],
    is_active: true, is_featured: false, weight_kg: null, nutritional_info: null,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ProductsSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "list") {
    return (
      <div className="tv-card overflow-hidden">
        <div className="tv-table w-full">
          <thead><tr>{Array.from({ length: 6 }).map((_, i) => (
            <th key={i}><div className="tv-skeleton tv-skeleton--text" style={{ width: `${60 + i * 10}%` }} /></th>
          ))}</tr></thead>
          <tbody>{Array.from({ length: 6 }).map((_, i) => (
            <tr key={i}>
              <td className="flex items-center gap-3">
                <div className="tv-skeleton tv-skeleton--avatar" />
                <div className="flex-1 space-y-1">
                  <div className="tv-skeleton tv-skeleton--text" style={{ width: "70%" }} />
                  <div className="tv-skeleton tv-skeleton--text-sm" />
                </div>
              </td>
              {Array.from({ length: 4 }).map((_, j) => (
                <td key={j}><div className="tv-skeleton tv-skeleton--text" style={{ width: `${50 + j * 15}%` }} /></td>
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
          <div className="tv-skeleton tv-skeleton--image" style={{ aspectRatio: "4/3" }} />
          <div className="p-4 space-y-3">
            <div className="tv-skeleton tv-skeleton--text" style={{ width: "80%" }} />
            <div className="tv-skeleton tv-skeleton--text-sm" style={{ width: "50%" }} />
            <div className="flex items-center justify-between pt-2">
              <div className="tv-skeleton tv-skeleton--text" style={{ width: "40%" }} />
              <div className="tv-skeleton tv-skeleton--button" style={{ width: "80px" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyProductsState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="tv-empty py-20">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--tv-moss)]/10 mb-4">
        <Package className="h-10 w-10 text-[var(--tv-moss)]" />
      </div>
      <h3 className="font-serif text-xl text-[var(--tv-forest)]">Nenhum produto cadastrado</h3>
      <p className="mt-2 text-sm text-[var(--tv-stone-500)] max-w-sm">
        Comece adicionando seu primeiro produto orgânico. Você pode gerenciar estoque, preços e visibilidade.
      </p>
      <button onClick={onCreate} className="tv-btn tv-btn--primary mt-6 gap-2">
        <Plus className="h-4 w-4" /> Adicionar produto
      </button>
    </div>
  );
}

function DeleteConfirmModal({ product, onConfirm, onCancel, isDeleting }: {
  product: Product; onConfirm: () => void; onCancel: () => void; isDeleting: boolean;
}) {
  return (
    <div className="tv-modal-overlay" onClick={onCancel}>
      <div className="tv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tv-modal__header">
          <h3 className="tv-modal__title flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--tv-terracota)]" /> Excluir produto
          </h3>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-[var(--tv-stone-400)] hover:bg-[var(--tv-stone-100)] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="tv-modal__body">
          <p className="text-[var(--tv-stone-600)] text-sm leading-relaxed">
            Tem certeza que deseja excluir <strong className="text-[var(--tv-forest)]">{product.name}</strong>?
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

function ProductCard({ product, category, onEdit, onToggleActive, onDuplicate, onDelete }: {
  product: Product; category?: Category; onEdit: (p: Product) => void;
  onToggleActive: (p: Product) => void; onDuplicate: (p: Product) => void; onDelete: (p: Product) => void;
}) {
  const stockTotal = getTotalStock(product.stock);
  const isLowStock = stockTotal > 0 && stockTotal <= 5;
  const isOutOfStock = stockTotal === 0;
  const isInactive = !product.is_active;

  return (
    <div className={cn("tv-product-card group relative", isInactive && "opacity-60 grayscale-[0.3]")}>
      <div className="tv-product-card__image relative">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--tv-stone-100)]">
            <ImageIcon className="h-10 w-10 text-[var(--tv-stone-300)]" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.is_featured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--tv-gold)] text-white text-[10px] font-semibold shadow-sm">
              <Sparkles className="h-3 w-3" /> Destaque
            </span>
          )}
          {product.promotional_price && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--tv-terracota)] text-white text-[10px] font-semibold shadow-sm">Promo</span>
          )}
          {!product.is_active && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--tv-stone-500)] text-white text-[10px] font-semibold shadow-sm">Inativo</span>
          )}
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button onClick={() => onEdit(product)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm shadow-sm text-[var(--tv-stone-600)] hover:text-[var(--tv-moss)] hover:bg-white transition-all" title="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onToggleActive(product)} className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 backdrop-blur-sm shadow-sm transition-all", isInactive ? "text-[var(--tv-stone-400)] hover:text-[var(--tv-moss)]" : "text-[var(--tv-stone-600)] hover:text-[var(--tv-terracota)]")} title={isInactive ? "Ativar" : "Desativar"}>
            {isInactive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm">
            <Boxes className={cn("h-3 w-3", isOutOfStock ? "text-[var(--tv-danger)]" : isLowStock ? "text-[var(--tv-terracota)]" : "text-[var(--tv-moss)]")} />
            <span className={cn("text-[10px] font-semibold", isOutOfStock ? "text-[var(--tv-danger)]" : isLowStock ? "text-[var(--tv-terracota)]" : "text-[var(--tv-stone-600)]")}>
              {isOutOfStock ? "Sem estoque" : isLowStock ? `${stockTotal} unid. (baixo)` : `${stockTotal} unid.`}
            </span>
          </div>
        </div>
      </div>
      <div className="tv-product-card__content">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="tv-product-card__title truncate">{product.name}</h3>
            <p className="text-xs text-[var(--tv-stone-400)] mt-0.5">{category?.name || "Sem categoria"}</p>
          </div>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="tv-product-card__price">{getPriceRange(product)}</p>
            {product.promotional_price && <p className="tv-product-card__price--promo">{formatCurrency(product.base_price)}</p>}
          </div>
          <div className="flex items-center gap-1">
            {product.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[var(--tv-moss)]/10 text-[var(--tv-moss)] text-[10px] font-medium">
                <Tag className="h-2.5 w-2.5" />{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="tv-product-card__actions border-t border-[var(--tv-stone-100)] pt-3">
        <button onClick={() => onDuplicate(product)} className="tv-btn tv-btn--secondary tv-btn--sm flex-1 gap-1.5">
          <Copy className="h-3.5 w-3.5" /> Duplicar
        </button>
        <button onClick={() => onDelete(product)} className="tv-btn tv-btn--danger tv-btn--sm flex-1 gap-1.5">
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </button>
      </div>
    </div>
  );
}

function ProductRow({ product, category, onEdit, onToggleActive, onDuplicate, onDelete }: {
  product: Product; category?: Category; onEdit: (p: Product) => void;
  onToggleActive: (p: Product) => void; onDuplicate: (p: Product) => void; onDelete: (p: Product) => void;
}) {
  const stockTotal = getTotalStock(product.stock);
  const isLowStock = stockTotal > 0 && stockTotal <= 5;
  const isOutOfStock = stockTotal === 0;
  const isInactive = !product.is_active;

  return (
    <tr className={cn("group transition-colors", isInactive && "opacity-50")}>
      <td>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl overflow-hidden bg-[var(--tv-stone-100)] flex-shrink-0 ring-1 ring-[var(--tv-stone-200)]">
            {product.images?.[0] ? (
              <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="h-full w-full flex items-center justify-center"><ImageIcon className="h-5 w-5 text-[var(--tv-stone-300)]" /></div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-[var(--tv-forest)] text-sm truncate max-w-[180px]">{product.name}</span>
              {product.is_featured && <Sparkles className="h-3.5 w-3.5 text-[var(--tv-gold)] flex-shrink-0" />}
            </div>
            <span className="text-xs text-[var(--tv-stone-400)]">{category?.name || "—"}</span>
          </div>
        </div>
      </td>
      <td>
        <div>
          <span className="text-sm font-semibold text-[var(--tv-moss)]">{getPriceRange(product)}</span>
          {product.promotional_price && <span className="text-xs text-[var(--tv-stone-400)] line-through ml-1">{formatCurrency(product.base_price)}</span>}
        </div>
      </td>
      <td>
        <div className="flex items-center gap-1.5">
          <Boxes className={cn("h-3.5 w-3.5", isOutOfStock ? "text-[var(--tv-danger)]" : isLowStock ? "text-[var(--tv-terracota)]" : "text-[var(--tv-moss)]")} />
          <span className={cn("text-sm font-medium", isOutOfStock ? "text-[var(--tv-danger)]" : isLowStock ? "text-[var(--tv-terracota)]" : "text-[var(--tv-stone-700)]")}>{stockTotal}</span>
          {(isOutOfStock || isLowStock) && (
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", isOutOfStock ? "bg-[var(--tv-danger-lt)] text-[var(--tv-danger)]" : "bg-[var(--tv-warning-lt)] text-[var(--tv-terracota-dk)]")}>
              {isOutOfStock ? "Esgotado" : "Baixo"}
            </span>
          )}
        </div>
      </td>
      <td>
        <span className={cn("tv-status", isInactive ? "tv-status--draft" : "tv-status--published")}>{isInactive ? "Inativo" : "Ativo"}</span>
      </td>
      <td>
        <div className="flex items-center gap-1">
          {product.tags?.slice(0, 2).map((tag) => (
            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--tv-moss)]/8 text-[var(--tv-moss)] text-[10px] font-medium">{tag}</span>
          ))}
        </div>
      </td>
      <td>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(product)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--tv-stone-500)] hover:bg-[var(--tv-moss)]/10 hover:text-[var(--tv-moss)] transition-colors" title="Editar"><Pencil className="h-4 w-4" /></button>
          <button onClick={() => onToggleActive(product)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--tv-stone-500)] hover:bg-[var(--tv-moss)]/10 hover:text-[var(--tv-moss)] transition-colors" title={isInactive ? "Ativar" : "Desativar"}>{isInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
          <button onClick={() => onDuplicate(product)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--tv-stone-500)] hover:bg-[var(--tv-moss)]/10 hover:text-[var(--tv-moss)] transition-colors" title="Duplicar"><Copy className="h-4 w-4" /></button>
          <button onClick={() => onDelete(product)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--tv-stone-500)] hover:bg-[var(--tv-danger-lt)] hover:text-[var(--tv-danger)] transition-colors" title="Excluir"><Trash2 className="h-4 w-4" /></button>
        </div>
      </td>
    </tr>
  );
}

function ProductModal({ product, categories, onSave, onClose, isSaving }: {
  product: Product | null; categories: Category[];
  onSave: (input: ProductInput, id?: string) => void;
  onClose: () => void; isSaving: boolean;
}) {
  const isEditing = !!product;
  const [form, setForm] = useState<ProductInput>(
    product ? {
      name: product.name, description: product.description, category_id: product.category_id,
      base_price: product.base_price, unit_prices: product.unit_prices,
      promotional_price: product.promotional_price, promotional_start: product.promotional_start,
      promotional_end: product.promotional_end, stock: product.stock,
      images: product.images, tags: product.tags, is_active: product.is_active,
      is_featured: product.is_featured, weight_kg: product.weight_kg,
      nutritional_info: product.nutritional_info,
    } : emptyProductInput()
  );
  const [activeTab, setActiveTab] = useState<"basic" | "pricing" | "inventory" | "seo">("basic");
  const [imageUrl, setImageUrl] = useState(product?.images?.[0] || "");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedUnits = Object.keys(form.unit_prices || {}) as ProductUnit[];

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImageUrl(previewUrl);
    setIsUploadingImage(true);

    try {
      const base64 = await fileToBase64(file);
      const result = await uploadProductImage({
        data: {
          fileBase64: base64,
          fileName: file.name,
          contentType: file.type,
        },
      });

      if (result.success && result.url) {
        setImageUrl(result.url);
        setForm((f) => ({ ...f, images: [result.url] }));
        toast.success("Foto enviada com sucesso!");
      } else {
        throw new Error("Falha no upload");
      }
    } catch (err) {
      console.error("[Upload] Erro:", err);
      toast.error(err instanceof Error ? err.message : "Erro ao enviar foto. Tente novamente.");
    } finally {
      setIsUploadingImage(false);
    }
  }, []);

  const addUnit = useCallback((unit: ProductUnit) => {
    setForm((f) => ({ ...f, unit_prices: { ...f.unit_prices, [unit]: 0 }, stock: { ...f.stock, [unit]: 0 } }));
  }, []);
  const removeUnit = useCallback((unit: ProductUnit) => {
    setForm((f) => { const up = { ...f.unit_prices }; const st = { ...f.stock }; delete up[unit]; delete st[unit]; return { ...f, unit_prices: up, stock: st }; });
  }, []);
  const addTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (!tag || form.tags?.includes(tag)) return;
    setForm((f) => ({ ...f, tags: [...(f.tags || []), tag] }));
    setTagInput("");
  }, [tagInput, form.tags]);
  const removeTag = useCallback((tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags?.filter((t) => t !== tag) || [] }));
  }, []);

  const handleSave = useCallback(() => {
    if (!form.name.trim()) { toast.error("Nome do produto é obrigatório"); return; }
    if (!form.category_id) { toast.error("Selecione uma categoria"); return; }
    if (!Object.keys(form.unit_prices || {}).length) { toast.error("Adicione pelo menos uma unidade com preço"); return; }
    onSave({ ...form, images: imageUrl ? [imageUrl] : [] }, product?.id);
  }, [form, imageUrl, product, onSave]);

  const tabs = [
    { key: "basic" as const, label: "Básico", icon: Package },
    { key: "pricing" as const, label: "Preços", icon: DollarSign },
    { key: "inventory" as const, label: "Estoque", icon: Boxes },
    { key: "seo" as const, label: "SEO", icon: Tag },
  ];

  return (
    <div className="tv-modal-overlay" onClick={onClose}>
      <div className="tv-modal tv-modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="tv-modal__header">
          <div>
            <h3 className="tv-modal__title">{isEditing ? "Editar produto" : "Novo produto"}</h3>
            <p className="text-xs text-[var(--tv-stone-400)] mt-0.5">
              {isEditing ? `Editando "${product?.name}"` : "Preencha as informações do novo produto"}
            </p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-[var(--tv-stone-400)] hover:bg-[var(--tv-stone-100)] hover:text-[var(--tv-forest)] transition-all"><X className="h-5 w-5" /></button>
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
            <div>
              <label className="tv-label">Foto do produto</label>
              <div className="flex items-center gap-4 mt-1.5">
                <div className="h-24 w-24 rounded-xl border-2 border-dashed border-[var(--tv-stone-200)] flex items-center justify-center overflow-hidden bg-[var(--tv-cream)] cursor-pointer hover:border-[var(--tv-moss-lt)] transition-colors relative" onClick={() => fileInputRef.current?.click()}>
                  {imageUrl ? <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" /> : <ImageIcon className="h-8 w-8 text-[var(--tv-stone-300)]" />}
                  {isUploadingImage && <div className="absolute inset-0 bg-black/30 flex items-center justify-center"><Loader2 className="h-6 w-6 text-white animate-spin" /></div>}
                </div>
                <div className="flex-1 space-y-2">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploadingImage} />
                  <button onClick={() => fileInputRef.current?.click()} className="tv-btn tv-btn--secondary tv-btn--sm gap-1.5" disabled={isUploadingImage}>
                    <Upload className="h-3.5 w-3.5" />{imageUrl ? "Trocar foto" : "Adicionar foto"}
                  </button>
                  <p className="tv-hint">Ou cole uma URL abaixo</p>
                  <input type="text" placeholder="https://..." value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); setForm((f) => ({ ...f, images: [e.target.value] })); }} className="tv-input tv-input--sm" />
                </div>
              </div>
            </div>
            <div>
              <label className="tv-label tv-label--required">Nome do produto</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Cenoura Orgânica" className="tv-input" />
            </div>
            <div>
              <label className="tv-label tv-label--required">Categoria</label>
              <select value={form.category_id || ""} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value || null }))} className="tv-input">
                <option value="">Selecione uma categoria...</option>
                {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div>
              <label className="tv-label">Descrição</label>
              <textarea value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))} placeholder="Descreva o produto..." rows={3} className="tv-input resize-none" />
            </div>
            <div>
              <label className="tv-label">Tags</label>
              <div className="flex items-center gap-2 mt-1.5">
                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="orgânico, fresco, sem agrotóxicos..." className="tv-input flex-1" />
                <button onClick={addTag} className="tv-btn tv-btn--secondary tv-btn--sm"><Plus className="h-3.5 w-3.5" /></button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags?.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--tv-moss)]/10 text-[var(--tv-moss)] text-xs font-medium">
                    {tag}<button onClick={() => removeTag(tag)} className="hover:text-[var(--tv-danger)]"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div className={cn("relative h-6 w-11 rounded-full transition-colors", form.is_featured ? "bg-[var(--tv-moss)]" : "bg-[var(--tv-stone-300)]")} onClick={() => setForm((f) => ({ ...f, is_featured: !f.is_featured }))}>
                  <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform", form.is_featured ? "left-[22px]" : "left-0.5")} />
                </div>
                <span className="text-sm font-medium text-[var(--tv-stone-700)]">Destaque na loja</span><Sparkles className="h-3.5 w-3.5 text-[var(--tv-gold)]" />
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div className={cn("relative h-6 w-11 rounded-full transition-colors", form.is_active ? "bg-[var(--tv-moss)]" : "bg-[var(--tv-stone-300)]")} onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}>
                  <div className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform", form.is_active ? "left-[22px]" : "left-0.5")} />
                </div>
                <span className="text-sm font-medium text-[var(--tv-stone-700)]">Produto ativo</span>
              </label>
            </div>
          </>)}

          {activeTab === "pricing" && (<>
            <div className="bg-[var(--tv-cream)] rounded-xl p-4 border border-[var(--tv-stone-200)]">
              <p className="text-xs text-[var(--tv-stone-500)] leading-relaxed"><strong className="text-[var(--tv-forest)]">Dica:</strong> Adicione múltiplas unidades (500g, 1kg, etc.) com preços diferentes. O cliente escolhe a unidade no carrinho.</p>
            </div>
            <div>
              <label className="tv-label">Adicionar unidade</label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {ALL_UNITS.map((unit) => {
                  const isActive = unit in (form.unit_prices || {});
                  return (
                    <button key={unit} onClick={() => isActive ? removeUnit(unit) : addUnit(unit)} className={cn("inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border", isActive ? "bg-[var(--tv-moss)] text-white border-[var(--tv-moss)] shadow-sm" : "bg-white text-[var(--tv-stone-500)] border-[var(--tv-stone-200)] hover:border-[var(--tv-moss-lt)] hover:text-[var(--tv-moss)]")}>
                      {isActive && <Check className="h-3 w-3" />}{unit}
                    </button>
                  );
                })}
              </div>
            </div>
            {selectedUnits.length > 0 && (
              <div className="space-y-3">
                <label className="tv-label">Preços por unidade</label>
                {selectedUnits.map((unit) => (
                  <div key={unit} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--tv-cream)] border border-[var(--tv-stone-200)]">
                    <span className="w-20 text-sm font-medium text-[var(--tv-forest)]">{unit}</span>
                    <div className="flex-1">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tv-stone-400)] text-sm">R$</span>
                        <input type="number" step="0.01" min="0" value={form.unit_prices?.[unit] || ""} onChange={(e) => setForm((f) => ({ ...f, unit_prices: { ...f.unit_prices, [unit]: Number(e.target.value) } }))} className="tv-input pl-8" placeholder="0,00" />
                      </div>
                    </div>
                    <button onClick={() => removeUnit(unit)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--tv-stone-400)] hover:bg-[var(--tv-danger-lt)] hover:text-[var(--tv-danger)] transition-colors"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-2 border-t border-[var(--tv-stone-200)]">
              <label className="tv-label flex items-center gap-2"><Tag className="h-3.5 w-3.5 text-[var(--tv-terracota)]" />Preço promocional (opcional)</label>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tv-stone-400)] text-sm">R$</span>
                  <input type="number" step="0.01" min="0" value={form.promotional_price || ""} onChange={(e) => setForm((f) => ({ ...f, promotional_price: e.target.value ? Number(e.target.value) : null }))} placeholder="Preço promocional" className="tv-input pl-8" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="tv-label tv-label--sm">Início da promoção</label>
                  <input type="datetime-local" value={form.promotional_start?.slice(0, 16) || ""} onChange={(e) => setForm((f) => ({ ...f, promotional_start: e.target.value ? new Date(e.target.value).toISOString() : null }))} className="tv-input" />
                </div>
                <div>
                  <label className="tv-label tv-label--sm">Fim da promoção</label>
                  <input type="datetime-local" value={form.promotional_end?.slice(0, 16) || ""} onChange={(e) => setForm((f) => ({ ...f, promotional_end: e.target.value ? new Date(e.target.value).toISOString() : null }))} className="tv-input" />
                </div>
              </div>
            </div>
          </>)}

          {activeTab === "inventory" && (<>
            <div className="bg-[var(--tv-warning-lt)] rounded-xl p-4 border border-[var(--tv-terracota)]/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-[var(--tv-terracota)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[var(--tv-terracota-dk)]">Gerenciamento de estoque</p>
                  <p className="text-xs text-[var(--tv-stone-500)] mt-0.5">O estoque é controlado por unidade. Produtos com estoque zero ou inativos não aparecem na loja para o cliente.</p>
                </div>
              </div>
            </div>
            {selectedUnits.length === 0 ? (
              <div className="text-center py-8"><Boxes className="h-10 w-10 text-[var(--tv-stone-300)] mx-auto mb-2" /><p className="text-sm text-[var(--tv-stone-500)]">Adicione unidades na aba "Preços" primeiro</p></div>
            ) : (
              <div className="space-y-3">
                {selectedUnits.map((unit) => (
                  <div key={unit} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--tv-cream)] border border-[var(--tv-stone-200)]">
                    <span className="w-20 text-sm font-medium text-[var(--tv-forest)]">{unit}</span>
                    <div className="flex-1">
                      <input type="number" min="0" value={form.stock?.[unit] || ""} onChange={(e) => setForm((f) => ({ ...f, stock: { ...f.stock, [unit]: Number(e.target.value) } }))} placeholder="Quantidade em estoque" className="tv-input" />
                    </div>
                    <span className="text-xs text-[var(--tv-stone-400)]">unid.</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--tv-moss)]/5 border border-[var(--tv-moss)]/15">
              <span className="text-sm font-medium text-[var(--tv-forest)]">Estoque total</span>
              <span className="text-lg font-bold text-[var(--tv-moss)]">{getTotalStock(form.stock)} unidades</span>
            </div>
          </>)}

          {activeTab === "seo" && (<>
            <div>
              <label className="tv-label">Peso (kg)</label>
              <input type="number" step="0.01" min="0" value={form.weight_kg || ""} onChange={(e) => setForm((f) => ({ ...f, weight_kg: e.target.value ? Number(e.target.value) : null }))} placeholder="Ex: 0.5" className="tv-input" />
            </div>
            <div>
              <label className="tv-label">Informações nutricionais</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "calories", label: "Calorias (kcal)" },
                  { key: "protein", label: "Proteínas (g)" },
                  { key: "carbs", label: "Carboidratos (g)" },
                  { key: "fat", label: "Gorduras (g)" },
                  { key: "fiber", label: "Fibras (g)" },
                  { key: "sodium", label: "Sódio (mg)" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="tv-label tv-label--sm">{field.label}</label>
                    <input type="number" step="0.1" min="0" value={form.nutritional_info?.[field.key as keyof typeof form.nutritional_info] || ""} onChange={(e) => setForm((f) => ({ ...f, nutritional_info: { ...f.nutritional_info, [field.key]: e.target.value ? Number(e.target.value) : null } as typeof f.nutritional_info }))} className="tv-input" />
                  </div>
                ))}
              </div>
            </div>
          </>)}
        </div>
        <div className="tv-modal__footer">
          <button onClick={onClose} className="tv-btn tv-btn--secondary" disabled={isSaving || isUploadingImage}>Cancelar</button>
          <button onClick={handleSave} className="tv-btn tv-btn--primary gap-2" disabled={isSaving || isUploadingImage}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {isEditing ? "Salvar alterações" : "Criar produto"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminProducts() {
  const { products, categories, isLoading, error, fetchAllProducts, fetchCategories, addProduct, updateProduct, deleteProduct } = useCatalogStore();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchAllProducts();
  }, [fetchCategories, fetchAllProducts]);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (categoryFilter !== "all") result = result.filter((p) => p.category_id === categoryFilter);
    if (statusFilter === "active") result = result.filter((p) => p.is_active);
    else if (statusFilter === "inactive") result = result.filter((p) => !p.is_active);
    if (stockFilter === "low") result = result.filter((p) => { const total = getTotalStock(p.stock); return total > 0 && total <= 5; });
    else if (stockFilter === "out") result = result.filter((p) => getTotalStock(p.stock) === 0);
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "name": comparison = a.name.localeCompare(b.name); break;
        case "base_price": comparison = (a.base_price || 0) - (b.base_price || 0); break;
        case "stock_total": comparison = getTotalStock(a.stock) - getTotalStock(b.stock); break;
        case "created_at": comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(); break;
        case "is_featured": comparison = (a.is_featured ? 1 : 0) - (b.is_featured ? 1 : 0); break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return result;
  }, [products, searchQuery, categoryFilter, statusFilter, stockFilter, sortKey, sortOrder]);

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.is_active).length;
    const lowStock = products.filter((p) => { const s = getTotalStock(p.stock); return s > 0 && s <= 5; }).length;
    const outOfStock = products.filter((p) => getTotalStock(p.stock) === 0).length;
    const featured = products.filter((p) => p.is_featured).length;
    return { total, active, lowStock, outOfStock, featured };
  }, [products]);

  const handleCreate = useCallback(() => { setModalProduct(null); setIsModalOpen(true); }, []);
  const handleEdit = useCallback((product: Product) => { setModalProduct(product); setIsModalOpen(true); }, []);

  const handleSave = useCallback(async (input: ProductInput, id?: string) => {
    setIsSaving(true);
    try {
      if (id) {
        const patch: Partial<Product> = {
          name: input.name, description: input.description, category_id: input.category_id,
          base_price: input.base_price, unit_prices: input.unit_prices,
          promotional_price: input.promotional_price, promotional_start: input.promotional_start,
          promotional_end: input.promotional_end, stock: input.stock,
          images: input.images, tags: input.tags, is_active: input.is_active,
          is_featured: input.is_featured, weight_kg: input.weight_kg,
          nutritional_info: input.nutritional_info,
        };
        const success = await updateProduct(id, patch);
        if (success) { toast.success("Produto atualizado com sucesso!"); setIsModalOpen(false); }
        else toast.error("Erro ao atualizar produto");
      } else {
        const result = await addProduct(input);
        if (result) { toast.success("Produto criado com sucesso!"); setIsModalOpen(false); }
        else toast.error("Erro ao criar produto");
      }
    } catch (err) {
      console.error("[handleSave] Erro:", err);
      toast.error("Erro ao salvar produto");
    } finally { setIsSaving(false); }
  }, [addProduct, updateProduct]);

  const handleToggleActive = useCallback(async (product: Product) => {
    const newActive = !product.is_active;
    const success = await updateProduct(product.id, { is_active: newActive });
    if (success) toast.success(newActive ? "Produto ativado" : "Produto desativado");
    else toast.error("Erro ao alterar status");
  }, [updateProduct]);

  const handleDuplicate = useCallback(async (product: Product) => {
    const copy: ProductInput = {
      name: `${product.name} (cópia)`, description: product.description, category_id: product.category_id,
      base_price: product.base_price, unit_prices: product.unit_prices,
      promotional_price: product.promotional_price, promotional_start: product.promotional_start,
      promotional_end: product.promotional_end, stock: product.stock,
      images: product.images, tags: product.tags, is_active: false, is_featured: false,
      weight_kg: product.weight_kg, nutritional_info: product.nutritional_info,
    };
    const result = await addProduct(copy);
    if (result) toast.success("Produto duplicado!");
    else toast.error("Erro ao duplicar produto");
  }, [addProduct]);

  const handleDelete = useCallback((product: Product) => { setDeleteTarget(product); }, []);
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const success = await deleteProduct(deleteTarget.id);
      if (success) toast.success("Produto excluído");
      else toast.error("Erro ao excluir produto");
    } finally { setIsDeleting(false); setDeleteTarget(null); }
  }, [deleteTarget, deleteProduct]);

  const toggleSort = useCallback((key: string) => {
    if (sortKey === key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortOrder("asc"); }
  }, [sortKey]);

  if (isLoading && !products.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="tv-skeleton tv-skeleton--text" style={{ width: "200px", height: "36px" }} />
            <div className="tv-skeleton tv-skeleton--text-sm" style={{ width: "300px" }} />
          </div>
          <div className="tv-skeleton tv-skeleton--button" />
        </div>
        <ProductsSkeleton viewMode={viewMode} />
      </div>
    );
  }

  if (error && !products.length) {
    return (
      <div className="tv-empty py-20">
        <AlertTriangle className="h-10 w-10 text-[var(--tv-terracota)] mb-3" />
        <h3 className="font-serif text-xl text-[var(--tv-forest)]">Erro ao carregar produtos</h3>
        <p className="mt-2 text-sm text-[var(--tv-stone-500)]">{error}</p>
        <button onClick={fetchAllProducts} className="tv-btn tv-btn--primary mt-4 gap-2">
          <ArrowUpRight className="h-4 w-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[var(--tv-forest)]">Produtos</h1>
          <p className="mt-1 text-sm text-[var(--tv-stone-500)]">
            {stats.total} produto{stats.total !== 1 ? "s" : ""} no catálogo
            {stats.active !== stats.total && <span className="text-[var(--tv-stone-400)]"> · {stats.active} ativo{stats.active !== 1 ? "s" : ""}</span>}
          </p>
        </div>
        <button onClick={handleCreate} className="tv-btn tv-btn--primary gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> Novo produto
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "forest" as const },
          { label: "Ativos", value: stats.active, color: "moss" as const },
          { label: "Estoque baixo", value: stats.lowStock, color: "terracotta" as const, alert: stats.lowStock > 0 },
          { label: "Destaques", value: stats.featured, color: "gold" as const },
        ].map((stat) => (
          <div key={stat.label} className={cn("rounded-xl border p-3 transition-all", stat.alert ? "bg-[var(--tv-warning-lt)] border-[var(--tv-terracota)]/20" : "bg-white border-[var(--tv-stone-200)]")}>
            <p className="text-xs text-[var(--tv-stone-400)] uppercase tracking-wide">{stat.label}</p>
            <p className={cn("text-2xl font-bold mt-0.5", stat.color === "forest" && "text-[var(--tv-forest)]", stat.color === "moss" && "text-[var(--tv-moss)]", stat.color === "terracotta" && "text-[var(--tv-terracota)]", stat.color === "gold" && "text-[var(--tv-gold)]")}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--tv-stone-400)] pointer-events-none" />
          <input type="text" placeholder="Buscar produtos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="tv-input pl-10 w-full" />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tv-stone-400)] hover:text-[var(--tv-stone-600)]"><X className="h-4 w-4" /></button>
          )}
        </div>
        <button onClick={() => setShowFilters((s) => !s)} className={cn("tv-btn tv-btn--secondary tv-btn--sm gap-1.5", showFilters && "border-[var(--tv-moss-lt)] text-[var(--tv-moss)]")}>
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros
          {(categoryFilter !== "all" || statusFilter !== "all" || stockFilter !== "all") && <span className="h-2 w-2 rounded-full bg-[var(--tv-moss)]" />}
        </button>
        <div className="relative">
          <select value={`${sortKey}-${sortOrder}`} onChange={(e) => { const [key, order] = e.target.value.split("-"); setSortKey(key); setSortOrder(order as "asc" | "desc"); }} className="tv-input tv-input--sm appearance-none pr-8 cursor-pointer">
            {SORT_OPTIONS.map((opt) => (<option key={`${opt.key}-asc`} value={`${opt.key}-asc`}>{opt.label} ↑</option>))}
            {SORT_OPTIONS.map((opt) => (<option key={`${opt.key}-desc`} value={`${opt.key}-desc`}>{opt.label} ↓</option>))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--tv-stone-400)] pointer-events-none" />
        </div>
        <div className="flex items-center rounded-lg border border-[var(--tv-stone-200)] overflow-hidden">
          <button onClick={() => setViewMode("grid")} className={cn("flex h-9 w-9 items-center justify-center transition-colors", viewMode === "grid" ? "bg-[var(--tv-moss)] text-white" : "text-[var(--tv-stone-400)] hover:bg-[var(--tv-cream)]")}><Grid3X3 className="h-4 w-4" /></button>
          <button onClick={() => setViewMode("list")} className={cn("flex h-9 w-9 items-center justify-center transition-colors", viewMode === "list" ? "bg-[var(--tv-moss)] text-white" : "text-[var(--tv-stone-400)] hover:bg-[var(--tv-cream)]")}><List className="h-4 w-4" /></button>
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[var(--tv-cream)] border border-[var(--tv-stone-200)] animate-fade-in">
          <div>
            <label className="tv-label tv-label--sm">Categoria</label>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="tv-input tv-input--sm mt-1">
              <option value="all">Todas as categorias</option>
              {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="tv-label tv-label--sm">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="tv-input tv-input--sm mt-1">
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
          <div>
            <label className="tv-label tv-label--sm">Estoque</label>
            <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="tv-input tv-input--sm mt-1">
              <option value="all">Qualquer estoque</option>
              <option value="low">Estoque baixo (≤5)</option>
              <option value="out">Sem estoque</option>
            </select>
          </div>
        </div>
      )}

      {filteredProducts.length !== products.length && (
        <p className="text-xs text-[var(--tv-stone-400)]">
          Mostrando {filteredProducts.length} de {products.length} produtos{searchQuery && <span> para &quot;{searchQuery}&quot;</span>}
        </p>
      )}

      {filteredProducts.length === 0 ? (
        <EmptyProductsState onCreate={handleCreate} />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} category={categories.find((c) => c.id === product.category_id)} onEdit={handleEdit} onToggleActive={handleToggleActive} onDuplicate={handleDuplicate} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="tv-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tv-table w-full">
              <thead>
                <tr>
                  <th className="cursor-pointer" onClick={() => toggleSort("name")}><span className="tv-table__sort">Produto<ArrowUpDown className="h-3 w-3 tv-table__sort-icon" /></span></th>
                  <th className="cursor-pointer" onClick={() => toggleSort("base_price")}><span className="tv-table__sort">Preço<ArrowUpDown className="h-3 w-3 tv-table__sort-icon" /></span></th>
                  <th className="cursor-pointer" onClick={() => toggleSort("stock_total")}><span className="tv-table__sort">Estoque<ArrowUpDown className="h-3 w-3 tv-table__sort-icon" /></span></th>
                  <th className="cursor-pointer" onClick={() => toggleSort("is_featured")}><span className="tv-table__sort">Status<ArrowUpDown className="h-3 w-3 tv-table__sort-icon" /></span></th>
                  <th>Tags</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <ProductRow key={product.id} product={product} category={categories.find((c) => c.id === product.category_id)} onEdit={handleEdit} onToggleActive={handleToggleActive} onDuplicate={handleDuplicate} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <ProductModal product={modalProduct} categories={categories} onSave={handleSave} onClose={() => setIsModalOpen(false)} isSaving={isSaving} />
      )}

      {deleteTarget && (
        <DeleteConfirmModal product={deleteTarget} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} isDeleting={isDeleting} />
      )}
    </div>
  );
}