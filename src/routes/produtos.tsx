import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Filter, X, Leaf } from "lucide-react";
import { motion } from "framer-motion";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { ProductCard, ProductCardSkeleton } from "@/components/store/ProductCard";
import { EmptyState } from "@/components/store/EmptyState";
import { useCatalogStore } from "@/stores/catalog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn, isPromoActive } from "@/lib/utils";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — Feirinha Orgânica Terra Viva" },
      { name: "description", content: "Catálogo completo de orgânicos frescos, verduras, frutas, legumes e mais." },
      { property: "og:title", content: "Nossos Produtos — Terra Viva" },
      { property: "og:description", content: "Filtre por categoria, preço e promoções." },
    ],
  }),
  component: ProductsPage,
});

function ProductGridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="rounded-3xl border border-[var(--tv-stone-200)] p-4 flex flex-col items-center gap-3">
          <div className="h-32 w-32 rounded-full bg-[var(--tv-stone-100)] animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-[var(--tv-stone-100)] animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-[var(--tv-stone-100)] animate-pulse" />
          <div className="h-8 w-full rounded-full bg-[var(--tv-stone-100)] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function ProductsPage() {
  const products = useCatalogStore((s) => s.products);
  const categories = useCatalogStore((s) => s.categories);
  const isLoading = useCatalogStore((s) => s.isLoading);
  const [search, setSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [inStock, setInStock] = useState(false);

  const maxPrice = useMemo(
    () => Math.max(30, ...products.map((p) => p.base_price || 0)),
    [products],
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (!p.is_active) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (selectedCats.length && !selectedCats.includes(p.category_id || "")) return false;
      const price = isPromoActive(p) ? p.promotional_price! : p.base_price;
      if (price < priceRange[0] || price > priceRange[1]) return false;
      if (onlyPromo && !isPromoActive(p)) return false;
      if (inStock && !Object.values(p.stock ?? {}).some((n) => (n ?? 0) > 0)) return false;
      return true;
    });
  }, [products, search, selectedCats, priceRange, onlyPromo, inStock]);

  const Filters = (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-[var(--tv-stone-500)]">
          Categorias
        </label>
        <div className="mt-2 space-y-2">
          {categories.length === 0 ? (
            <p className="text-sm text-[var(--tv-stone-400)]">Carregando categorias...</p>
          ) : (
            categories
              .filter((c) => c.is_active)
              .map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer text-[var(--tv-stone-700)]">
                  <Checkbox
                    checked={selectedCats.includes(c.id)}
                    onCheckedChange={(v) =>
                      setSelectedCats((s) =>
                        v ? [...s, c.id] : s.filter((x) => x !== c.id),
                      )
                    }
                  />
                  {c.name}
                </label>
              ))
          )}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-[var(--tv-stone-500)]">
          Preço: R$ {priceRange[0]} — R$ {priceRange[1]}
        </label>
        <Slider
          className="mt-3"
          min={0}
          max={Math.ceil(maxPrice)}
          step={1}
          value={priceRange}
          onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])}
        />
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-[var(--tv-stone-700)]">
          <Checkbox checked={onlyPromo} onCheckedChange={(v) => setOnlyPromo(!!v)} />
          Somente em promoção
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--tv-stone-700)]">
          <Checkbox checked={inStock} onCheckedChange={(v) => setInStock(!!v)} />
          Em estoque
        </label>
      </div>
      <Button
        variant="ghost"
        className="w-full text-[var(--tv-stone-500)] hover:text-[var(--tv-forest)]"
        onClick={() => {
          setSelectedCats([]);
          setOnlyPromo(false);
          setInStock(false);
          setPriceRange([0, Math.ceil(maxPrice)]);
        }}
      >
        <X className="h-4 w-4 mr-1" /> Limpar filtros
      </Button>
    </div>
  );

  return (
    <PublicLayout>
      {/* Header */}
      <div className="mb-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 text-[var(--tv-gold)] text-xs font-semibold uppercase tracking-widest mb-3"
        >
          <Leaf className="h-3.5 w-3.5" />
          Nosso Catálogo
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-serif text-3xl sm:text-4xl text-[var(--tv-forest)]"
        >
          Produtos Orgânicos
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-2 text-[var(--tv-stone-500)] max-w-md mx-auto"
        >
          Frutas, verduras, legumes e muito mais. Frescos da terra para sua mesa.
        </motion.p>
      </div>

      {/* Busca e Filtros */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--tv-stone-400)]" />
          <Input
            placeholder="Buscar produtos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-full h-11 border-[var(--tv-stone-200)] bg-[var(--tv-white)] focus:border-[var(--tv-moss-lt)] focus:ring-[var(--tv-moss)]/20"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="rounded-full md:hidden gap-1 border-[var(--tv-stone-200)]">
              <Filter className="h-4 w-4" /> Filtros
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 bg-[var(--tv-white)]">
            <SheetHeader>
              <SheetTitle className="font-serif text-[var(--tv-forest)]">Filtros</SheetTitle>
            </SheetHeader>
            <div className="mt-6 px-4">{Filters}</div>
          </SheetContent>
        </Sheet>
      </div>

      <div className="mt-6 grid md:grid-cols-[240px_1fr] gap-8">
        <aside className={cn("hidden md:block sticky top-24 self-start")}>
          <div className="bg-[var(--tv-white)] rounded-[var(--r-xl)] border border-[var(--tv-stone-200)] p-5 shadow-sm">
            {Filters}
          </div>
        </aside>
        <div>
          {isLoading && products.length === 0 ? (
            <ProductGridSkeleton n={8} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Nada por aqui"
              description="Ajuste os filtros para ver mais produtos."
            />
          ) : (
            <>
              <p className="text-xs text-[var(--tv-stone-400)] mb-4">
                {filtered.length} produto{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
              </p>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                {filtered.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}