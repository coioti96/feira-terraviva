import { Link } from "@tanstack/react-router";
import { Plus, Sparkles, Leaf } from "lucide-react";
import { motion } from "framer-motion";
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
   ORDENAÇÃO DE UNIDADES — do menor peso/quantidade para o maior
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

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);

  // Todas as unidades disponíveis para este produto, ordenadas do menor para o maior
  const availableUnits = sortUnits(
    Object.keys(product.unit_prices || {}) as ProductUnit[]
  );

  // Se não houver unit_prices definidos, fallback para base_price com unidade "unidade"
  const unitsToShow =
    availableUnits.length > 0
      ? availableUnits
      : (["unidade"] as ProductUnit[]);

  const handleAddToCart = (e: React.MouseEvent, unit: ProductUnit) => {
    e.preventDefault();
    e.stopPropagation();
    const price = getUnitPrice(product, unit);
    addItem({
      product_id: product.id,
      product_name: product.name,
      product_image: product.images?.[0] || "",
      product_slug: product.slug,
      unit_type: unit,
      quantity: 1,
      unit_price: price,
    });
    toast.success(`${product.name} adicionado!`, {
      description: `${unitLabel(unit)} no carrinho`,
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
      {/* Badges */}
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

      {/* Imagem — centralizada, sem vazar para o lado */}
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

      {/* Conteúdo */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <Link to="/produto/$slug" params={{ slug: product.slug }} className="block">
          <h3 className="font-serif text-[15px] font-semibold text-[var(--tv-forest)] leading-snug group-hover:text-[var(--tv-moss)] transition-colors line-clamp-2">
            {product.name}
          </h3>
          <p className="mt-1 text-[12px] text-[var(--tv-stone-400)] line-clamp-1">{product.description}</p>
        </Link>

        {/* ═══════════════════════════════════════════════════════════════
           OPÇÕES DE UNIDADE — todas visíveis, menor primeiro
           ═══════════════════════════════════════════════════════════════ */}
        <div className="mt-auto pt-2 flex flex-col gap-2">
          {unitsToShow.map((unit) => {
            const price = getUnitPrice(product, unit);
            const hasPromo = isPromoActive(product);
            const originalPrice = product.unit_prices?.[unit] ?? product.base_price;

            return (
              <div
                key={unit}
                className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--tv-cream)]"
              >
                {/* Preço + unidade */}
                <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
                  {hasPromo && originalPrice > price && (
                    <span className="text-[11px] text-[var(--tv-stone-400)] line-through decoration-[var(--tv-stone-300)]">
                      {formatCurrency(originalPrice)}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-[15px] font-bold font-serif",
                      hasPromo ? "text-[var(--tv-terracota)]" : "text-[var(--tv-moss)]"
                    )}
                  >
                    {formatCurrency(price)}
                  </span>
                  <span className="text-[11px] text-[var(--tv-stone-400)] shrink-0">
                    / {unitLabel(unit)}
                  </span>
                </div>

                {/* Botão adicionar esta unidade */}
                <Button
                  size="sm"
                  className={cn(
                    "rounded-full gap-1 h-8 px-3 text-[12px] font-semibold transition-all duration-200 shrink-0",
                    "bg-[var(--tv-moss)] hover:bg-[var(--tv-moss-mid)] text-white active:scale-[0.96]",
                  )}
                  style={{ boxShadow: "var(--shadow-sm)" }}
                  onClick={(e) => handleAddToCart(e, unit)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Add</span>
                </Button>
              </div>
            );
          })}
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
        <div className="h-6 bg-[var(--tv-stone-200)] rounded animate-pulse w-1/3 mt-2" />
        <div className="h-10 bg-[var(--tv-stone-200)] rounded-full animate-pulse mt-2" />
      </div>
    </div>
  );
}