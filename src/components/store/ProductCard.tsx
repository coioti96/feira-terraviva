import { Link } from "@tanstack/react-router";
import { Plus, Sparkles, Leaf } from "lucide-react";
import { motion } from "framer-motion";
import type { Product } from "@/types";
import { cn, formatCurrency, isPromoActive } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCartStore, unitLabel } from "@/stores/cart";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const units = Object.keys(product.unit_prices || {}) as Array<keyof typeof product.unit_prices>;
  const defaultUnit = units[0] || "unidade";
  const price = isPromoActive(product)
    ? product.promotional_price!
    : product.unit_prices?.[defaultUnit] ?? product.base_price;
  const oldPrice = isPromoActive(product)
    ? product.unit_prices?.[defaultUnit] ?? product.base_price
    : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      product_id: product.id,
      product_name: product.name,
      product_image: product.images?.[0] || "",
      product_slug: product.slug,
      unit_type: defaultUnit,
      quantity: 1,
      unit_price: price,
    });
    toast.success(`${product.name} adicionado!`, {
      description: `${unitLabel(defaultUnit)} no carrinho`,
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

        {/* Preço */}
        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-2 flex-wrap">
            {oldPrice && (
              <span className="text-[13px] text-[var(--tv-stone-400)] line-through decoration-[var(--tv-stone-300)]">
                {formatCurrency(oldPrice)}
              </span>
            )}
            <span className={cn("text-lg font-bold font-serif", oldPrice ? "text-[var(--tv-terracota)]" : "text-[var(--tv-moss)]")}>
              {formatCurrency(price)}
            </span>
            <span className="text-[11px] text-[var(--tv-stone-400)]">/ {unitLabel(defaultUnit)}</span>
          </div>

          <Button
            size="sm"
            className={cn(
              "mt-3 w-full rounded-full gap-1.5 h-10 text-[13px] font-semibold transition-all duration-200",
              "bg-[var(--tv-moss)] hover:bg-[var(--tv-moss-mid)] text-white active:scale-[0.98]",
            )}
            style={{ boxShadow: "var(--shadow-forest)" }}
            onClick={handleAddToCart}
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
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