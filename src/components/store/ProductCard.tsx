import { Link } from "@tanstack/react-router";
import { Plus, Minus, Sparkles, Leaf, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import type { Product, ProductUnit } from "@/types";
import { cn, formatCurrency, isPromoActive } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCartStore, unitLabel } from "@/stores/cart";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
  index?: number;
}

/* ═══════════════════════════════════════════════════════════════
   ORDENAÇÃO DE UNIDADES — do menor para o maior
   ═══════════════════════════════════════════════════════════════ */
const UNIT_ORDER: ProductUnit[] = [
  "unidade",
  "100g",
  "250g",
  "500g",
  "1kg",
  "2kg",
  "5kg",
  "maço",
  "bandeja",
  "pacote",
  "dúzia",
  "caixa",
  "litro",
];

function sortUnits(units: ProductUnit[]): ProductUnit[] {
  return [...units].sort((a, b) => {
    const idxA = UNIT_ORDER.indexOf(a);
    const idxB = UNIT_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

function getUnitPrice(product: Product, unit: ProductUnit): number {
  if (isPromoActive(product) && product.promotional_price != null) {
    return product.promotional_price;
  }
  return product.unit_prices?.[unit] ?? product.base_price;
}

/* ═══════════════════════════════════════════════════════════════
   PRODUCT CARD — Layout profissional com seletor de unidade
   ═══════════════════════════════════════════════════════════════ */
export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addItem, items, updateQuantity, removeItem } = useCartStore();

  // Unidades disponíveis, ordenadas
  const availableUnits = useMemo(() => {
    const units = Object.keys(product.unit_prices || {}) as ProductUnit[];
    return sortUnits(units.length > 0 ? units : ["unidade"]);
  }, [product.unit_prices]);

  // Estado local: unidade selecionada e quantidade
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit>(availableUnits[0]);

  // Preço da unidade selecionada
  const unitPrice = useMemo(
    () => getUnitPrice(product, selectedUnit),
    [product, selectedUnit]
  );

  // Verifica se já tem este item no carrinho
  const cartItem = items.find(
    (i) => i.product_id === product.id && i.unit_type === selectedUnit
  );
  const cartQty = cartItem?.quantity ?? 0;

  // Preço original (para riscar em promoção)
  const originalPrice = product.unit_prices?.[selectedUnit] ?? product.base_price;
  const hasPromo = isPromoActive(product) && originalPrice > unitPrice;

  // Handlers
  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUnit(e.target.value as ProductUnit);
  };

  const handleIncrement = () => {
    if (cartQty > 0) {
      updateQuantity(cartItem!.id, cartQty + 1);
    } else {
      addItem({
        product_id: product.id,
        product_name: product.name,
        product_image: product.images?.[0] || "",
        product_slug: product.slug,
        unit_type: selectedUnit,
        quantity: 1,
        unit_price: unitPrice,
      });
    }
    toast.success(`${product.name} — ${unitLabel(selectedUnit)}`, {
      description: `Quantidade: ${cartQty + 1}`,
      icon: <Leaf className="h-4 w-4" />,
    });
  };

  const handleDecrement = () => {
    if (cartQty <= 1 && cartItem) {
      removeItem(cartItem.id);
      toast.info("Item removido do carrinho");
    } else if (cartItem) {
      updateQuantity(cartItem.id, cartQty - 1);
    }
  };

  const handleAddFirst = () => {
    addItem({
      product_id: product.id,
      product_name: product.name,
      product_image: product.images?.[0] || "",
      product_slug: product.slug,
      unit_type: selectedUnit,
      quantity: 1,
      unit_price: unitPrice,
    });
    toast.success(`${product.name} adicionado!`, {
      description: `${unitLabel(selectedUnit)} no carrinho`,
      icon: <Leaf className="h-4 w-4" />,
    });
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      className="group relative flex flex-col bg-[var(--tv-white)] rounded-[var(--r-xl)] border border-[var(--tv-stone-200)] overflow-hidden hover:shadow-[var(--shadow-lg)] hover:border-[var(--tv-moss-lt)] transition-all duration-300"
    >
      {/* ═════ Badges ═════ */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {isPromoActive(product) && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--tv-terracota)] text-white px-2.5 py-1 text-[11px] font-semibold shadow-lg"
            style={{ boxShadow: "var(--shadow-terra)" }}
          >
            <Sparkles className="h-3 w-3" />
            Promoção
          </motion.span>
        )}
        {product.tags?.includes("orgânico") && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-[var(--tv-moss)] text-white px-2.5 py-1 text-[11px] font-semibold shadow-lg"
            style={{ boxShadow: "0 4px 16px rgb(45 90 39 / 0.30)" }}
          >
            <Leaf className="h-3 w-3" />
            Orgânico
          </span>
        )}
        {product.is_featured && (
          <span
            className="inline-flex items-center rounded-full bg-[var(--tv-gold)] text-white px-2.5 py-1 text-[11px] font-semibold shadow-lg"
            style={{ boxShadow: "var(--shadow-gold)" }}
          >
            Destaque
          </span>
        )}
      </div>

      {/* ═════ Imagem ═════ */}
      <Link
        to="/produto/$slug"
        params={{ slug: product.slug }}
        className="block w-full"
        style={{ background: "linear-gradient(to bottom, var(--tv-cream), var(--tv-linen))" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            paddingTop: "1.25rem",
            paddingBottom: "0.75rem",
          }}
        >
          <div
            style={{
              width: "clamp(100px, 40%, 148px)",
              aspectRatio: "1",
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
              border: "3px solid rgba(45,90,39,0.10)",
              transition: "border-color 0.3s ease, box-shadow 0.3s ease",
            }}
            className="group-hover:border-[var(--tv-moss-lt)] group-hover:shadow-[0_6px_24px_rgba(45,90,39,0.18)]"
          >
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                loading="lazy"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  transition: "transform 0.5s ease",
                  display: "block",
                }}
                className="group-hover:scale-110"
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--tv-stone-100)",
                }}
              >
                <Leaf className="h-10 w-10 text-[var(--tv-stone-300)]" />
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* ═════ Conteúdo ═════ */}
      <div className="flex flex-col flex-1 p-4 gap-2.5">
        {/* Nome + descrição */}
        <Link to="/produto/$slug" params={{ slug: product.slug }} className="block">
          <h3 className="font-serif text-[15px] font-semibold text-[var(--tv-forest)] leading-snug group-hover:text-[var(--tv-moss)] transition-colors line-clamp-2">
            {product.name}
          </h3>
          <p className="mt-0.5 text-[12px] text-[var(--tv-stone-400)] line-clamp-1">
            {product.description}
          </p>
        </Link>

        {/* ═══════════════════════════════════════════════════════════════
           SELETOR DE UNIDADE + PREÇO + STEPPER — Layout profissional
           ═══════════════════════════════════════════════════════════════ */}
        <div className="mt-auto pt-1 flex flex-col gap-2.5">
          
          {/* Linha 1: Seletor de unidade */}
          <div className="flex items-center gap-2">
            <select
              value={selectedUnit}
              onChange={handleUnitChange}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "flex-1 min-w-0 rounded-lg border border-[var(--tv-stone-200)]",
                "bg-[var(--tv-cream)] text-[var(--tv-forest)] text-[13px] font-medium",
                "px-2.5 py-1.5 pr-8",
                "focus:outline-none focus:ring-2 focus:ring-[var(--tv-moss)] focus:border-transparent",
                "appearance-none cursor-pointer",
                "transition-colors hover:border-[var(--tv-moss-lt)]"
              )}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
              }}
            >
              {availableUnits.map((unit) => {
                const price = getUnitPrice(product, unit);
                return (
                  <option key={unit} value={unit}>
                    {unitLabel(unit)} — {formatCurrency(price)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Linha 2: Preço destacado + Stepper/Add */}
          <div className="flex items-center justify-between gap-3">
            {/* Preço */}
            <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
              {hasPromo && (
                <span className="text-[12px] text-[var(--tv-stone-400)] line-through decoration-[var(--tv-stone-300)]">
                  {formatCurrency(originalPrice)}
                </span>
              )}
              <span
                className={cn(
                  "text-xl font-bold font-serif",
                  hasPromo ? "text-[var(--tv-terracota)]" : "text-[var(--tv-moss)]"
                )}
              >
                {formatCurrency(unitPrice)}
              </span>
              <span className="text-[11px] text-[var(--tv-stone-400)]">
                / {unitLabel(selectedUnit)}
              </span>
            </div>

            {/* Stepper (se já no carrinho) ou Botão Add (se não) */}
            {cartQty > 0 ? (
              <div
                className="flex items-center gap-0 rounded-full overflow-hidden border border-[var(--tv-moss)]"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDecrement();
                  }}
                  className="flex items-center justify-center w-9 h-9 bg-[var(--tv-moss)] text-white hover:bg-[var(--tv-moss-mid)] active:scale-95 transition-all"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="flex items-center justify-center w-10 h-9 bg-white text-[var(--tv-forest)] text-sm font-bold">
                  {cartQty}
                </span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleIncrement();
                  }}
                  className="flex items-center justify-center w-9 h-9 bg-[var(--tv-moss)] text-white hover:bg-[var(--tv-moss-mid)] active:scale-95 transition-all"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                size="sm"
                className={cn(
                  "rounded-full gap-1.5 h-10 px-4 text-[13px] font-semibold transition-all duration-200",
                  "bg-[var(--tv-moss)] hover:bg-[var(--tv-moss-mid)] text-white active:scale-[0.96]",
                )}
                style={{ boxShadow: "var(--shadow-forest)" }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAddFirst();
                }}
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Adicionar</span>
              </Button>
            )}
          </div>

          {/* Quantidade no carrinho (hint) */}
          {cartQty > 0 && (
            <p className="text-[11px] text-[var(--tv-moss)] text-right font-medium">
              {cartQty} {unitLabel(selectedUnit)} no carrinho
            </p>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col bg-[var(--tv-white)] rounded-[var(--r-xl)] border border-[var(--tv-stone-200)] overflow-hidden">
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", paddingTop: "1.25rem", paddingBottom: "0.75rem", background: "linear-gradient(to bottom, var(--tv-cream), var(--tv-linen))" }}>
        <div style={{ width: "clamp(100px, 40%, 148px)", aspectRatio: "1", borderRadius: "50%", background: "var(--tv-stone-200)" }} className="animate-pulse" />
      </div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-[var(--tv-stone-200)] rounded animate-pulse w-3/4" />
        <div className="h-3 bg-[var(--tv-stone-200)] rounded animate-pulse w-1/2" />
        <div className="h-8 bg-[var(--tv-stone-200)] rounded animate-pulse w-full mt-2" />
        <div className="h-10 bg-[var(--tv-stone-200)] rounded-full animate-pulse mt-2" />
      </div>
    </div>
  );
}