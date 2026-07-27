import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, ArrowLeft, Sparkles, Leaf, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { ProductCard } from "@/components/store/ProductCard";
import { UnitSelector } from "@/components/store/UnitSelector";
import { Button } from "@/components/ui/button";
import { useCatalogStore } from "@/stores/catalog";
import { useCartStore, unitLabel } from "@/stores/cart";
import { formatCurrency, isPromoActive } from "@/lib/utils";
import type { ProductUnit } from "@/types";

export const Route = createFileRoute("/produto/$slug")({
  component: ProductDetail,
  notFoundComponent: () => (
    <PublicLayout>
      <div className="py-16 text-center">
        <Leaf className="h-12 w-12 text-[var(--tv-stone-300)] mx-auto mb-4" />
        <h1 className="font-serif text-2xl text-[var(--tv-forest)]">Produto não encontrado</h1>
        <p className="mt-2 text-[var(--tv-stone-500)]">O produto que você procura não existe ou foi removido.</p>
        <Link to="/produtos" className="inline-flex items-center gap-1 mt-4 text-[var(--tv-moss)] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Ver todos os produtos
        </Link>
      </div>
    </PublicLayout>
  ),
  loader: ({ params }) => {
    const { products } = useCatalogStore.getState();
    const product = products.find((p) => p.slug === params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    const product = loaderData?.product;
    // Garante que content nunca seja null — sempre string ou undefined
    const description = product?.description ?? undefined;
    const name = product?.name ?? "Produto";
    const image = product?.images?.[0];

    return {
      meta: [
        { title: `${name} — Terra Viva` },
        { name: "description", content: description },
        { property: "og:title", content: name },
        { property: "og:description", content: description },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
});

function ProductDetail() {
  const { slug } = Route.useParams();
  const products = useCatalogStore((s) => s.products);
  const product = products.find((p) => p.slug === slug);
  const addItem = useCartStore((s) => s.addItem);

  const units = (product ? Object.keys(product.unit_prices) : []) as ProductUnit[];
  const [unit, setUnit] = useState<ProductUnit>(units[0] ?? "unidade");
  const [qty, setQty] = useState(1);

  if (!product) return null;

  const promo = isPromoActive(product);
  const unitPrice = promo ? product.promotional_price! : product.unit_prices[unit] ?? product.base_price;
  const oldPrice = promo ? product.unit_prices[unit] ?? product.base_price : null;
  const related = products
    .filter((p) => p.category_id === product.category_id && p.id !== product.id && p.is_active)
    .slice(0, 4);

  const handleAddToCart = () => {
    addItem({
      product_id: product.id,
      product_name: product.name,
      product_image: product.images?.[0] || "",
      product_slug: product.slug,
      unit_type: unit,
      quantity: qty,
      unit_price: unitPrice,
    });
    toast.success(`${product.name} adicionado ao carrinho!`, {
      description: `${qty}x ${unitLabel(unit)} — ${formatCurrency(unitPrice * qty)}`,
      icon: <ShoppingCart className="h-4 w-4" />,
    });
  };

  return (
    <PublicLayout>
      {/* Breadcrumb */}
      <nav className="tv-breadcrumb mb-6">
        <Link to="/produtos" className="tv-breadcrumb__link hover:text-[var(--tv-moss)] transition-colors inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Produtos
        </Link>
        <span className="tv-breadcrumb__separator">/</span>
        <span className="tv-breadcrumb__current">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 mt-4">
        {/* Imagem */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <div className="relative">
            {/* Foto principal redonda grande */}
            <div className="h-72 w-72 sm:h-96 sm:w-96 rounded-full overflow-hidden ring-8 ring-[var(--tv-moss)]/10 shadow-xl">
              {product.images?.[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-[var(--tv-stone-100)]">
                  <Leaf className="h-20 w-20 text-[var(--tv-stone-300)]" />
                </div>
              )}
            </div>

            {/* Badge promo */}
            {promo && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-[var(--tv-terracota)] text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg"
                style={{ boxShadow: "var(--shadow-terra)" }}
              >
                <Sparkles className="h-3 w-3 inline mr-1" />
                Promoção
              </motion.div>
            )}
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="mt-6 flex justify-center gap-3">
              {product.images.map((src, i) => (
                <div
                  key={i}
                  className="h-14 w-14 rounded-full overflow-hidden border-2 border-[var(--tv-stone-200)] hover:border-[var(--tv-moss-lt)] transition-colors cursor-pointer"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        >
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {product.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--tv-moss)]/10 text-[var(--tv-moss)] text-xs font-medium"
              >
                {tag}
              </span>
            ))}
            {product.is_featured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--tv-gold)]/15 text-[var(--tv-gold-dk)] text-xs font-medium">
                <Sparkles className="h-3 w-3" /> Destaque
              </span>
            )}
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl text-[var(--tv-forest)]">{product.name}</h1>
          <p className="mt-3 text-[var(--tv-stone-600)] leading-relaxed">{product.description}</p>

          {/* Seletor de unidade */}
          <div className="mt-6">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--tv-stone-500)]">
              Escolha a unidade
            </label>
            <div className="mt-2">
              <UnitSelector
                units={units}
                value={unit}
                onChange={setUnit}
                className="bg-[var(--tv-cream)]"
              />
            </div>
          </div>

          {/* Preço */}
          <div className="mt-6 flex items-baseline gap-3">
            {oldPrice && (
              <span className="text-lg line-through text-[var(--tv-stone-400)]">
                {formatCurrency(oldPrice)}
              </span>
            )}
            <span className="text-3xl sm:text-4xl font-serif font-bold text-[var(--tv-moss)]">
              {formatCurrency(unitPrice)}
            </span>
            <span className="text-sm text-[var(--tv-stone-400)]">/ {unitLabel(unit)}</span>
          </div>

          {promo && (
            <p className="mt-1 text-sm text-[var(--tv-terracota)]">
              Economia de {formatCurrency(oldPrice! - unitPrice)}
            </p>
          )}

          {/* Quantidade + Botão */}
          <div className="mt-6 flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--tv-stone-200)] bg-[var(--tv-white)] px-2 py-1">
              <button
                className="h-9 w-9 grid place-items-center rounded-full hover:bg-[var(--tv-cream)] transition-colors text-[var(--tv-stone-600)]"
                onClick={() => setQty(Math.max(1, qty - 1))}
                aria-label="Diminuir"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center font-semibold text-[var(--tv-forest)]">{qty}</span>
              <button
                className="h-9 w-9 grid place-items-center rounded-full hover:bg-[var(--tv-cream)] transition-colors text-[var(--tv-stone-600)]"
                onClick={() => setQty(qty + 1)}
                aria-label="Aumentar"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              className="rounded-full flex-1 h-12 text-base font-semibold gap-2 bg-[var(--tv-moss)] hover:bg-[var(--tv-moss-mid)] text-white"
              style={{ boxShadow: "var(--shadow-forest)" }}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4" />
              Adicionar — {formatCurrency(unitPrice * qty)}
            </Button>
          </div>

          {/* Info nutricional */}
          {product.nutritional_info && (
            <div className="mt-8 rounded-2xl bg-[var(--tv-cream)] border border-[var(--tv-stone-200)] p-5">
              <div className="font-semibold text-[var(--tv-forest)] mb-3 flex items-center gap-2">
                <Leaf className="h-4 w-4 text-[var(--tv-moss)]" />
                Informações nutricionais
                {product.weight_kg && (
                  <span className="text-xs text-[var(--tv-stone-400)] font-normal">
                    (por {product.weight_kg * 1000}g)
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(product.nutritional_info)
                  .filter(([_, v]) => v !== null && v !== undefined)
                  .map(([k, v]) => (
                    <div key={k} className="bg-[var(--tv-white)] rounded-xl p-3 border border-[var(--tv-stone-100)]">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--tv-stone-400)]">
                        {k === "calories" ? "Calorias" : k === "protein" ? "Proteínas" : k === "carbs" ? "Carboidratos" : k === "fat" ? "Gorduras" : k === "fiber" ? "Fibras" : k === "sodium" ? "Sódio" : k}
                      </p>
                      <p className="text-lg font-semibold text-[var(--tv-forest)] mt-0.5">
                        {v}
                        <span className="text-xs text-[var(--tv-stone-400)] ml-0.5">
                          {k === "calories" ? "kcal" : k === "sodium" ? "mg" : "g"}
                        </span>
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Produtos relacionados */}
      {related.length > 0 && (
        <section className="mt-16">
          <div className="flex items-center gap-2 mb-6">
            <Leaf className="h-5 w-5 text-[var(--tv-moss)]" />
            <h2 className="font-serif text-2xl text-[var(--tv-forest)]">Você também vai gostar</h2>
          </div>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </PublicLayout>
  );
}