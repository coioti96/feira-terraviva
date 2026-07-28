import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf,
  ArrowRight,
  Truck,
  ShieldCheck,
  Sprout,
  Clock,
  Star,
  ShoppingBag,
  MessageCircle,
  Award,
  ChevronRight,
  Sparkles,
  MapPin,
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { ProductCard, ProductCardSkeleton } from "@/components/store/ProductCard";
import { useCatalogStore } from "@/stores/catalog";
import { useSettingsStore } from "@/stores/settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Feirinha Orgânica Terra Viva — Produtos Frescos" },
      { name: "description", content: "Produtos orgânicos frescos da terra para sua mesa. Verduras, frutas, legumes com entrega rápida em Marília – SP." },
      { property: "og:title", content: "Terra Viva — Feirinha Orgânica" },
    ],
  }),
  component: HomePage,
});

const ease = [0.22, 1, 0.36, 1] as const;

function useStoreStatus(opening_hours: Record<string, { open: string; close: string; closed: boolean }> | undefined) {
  const today = new Date().getDay();
  const keys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const key = keys[today];
  const hours = opening_hours?.[key];
  const isOpen = !!hours && !hours.closed;
  return { isOpen, closeTime: hours?.close ?? "" };
}

function Reveal({ children, delay = 0, y = 24, className = "" }: {
  children: React.ReactNode; delay?: number; y?: number; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{ duration: 0.65, ease, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function LogoGlow({ src, size = 120 }: { src?: string | null; size?: number }) {
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.08, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", inset: -8, borderRadius: "50%", background: "conic-gradient(from 0deg, #B8860B, #d4a017, #f0c040, #d4a017, #B8860B)", filter: "blur(8px)", opacity: 0.7 }}
      />
      <div style={{ position: "absolute", inset: -3, borderRadius: "50%", background: "conic-gradient(from 0deg, #B8860B 0%, #f0c040 30%, #B8860B 60%, #e8b830 80%, #B8860B 100%)", padding: 2 }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "#0A1F0A" }} />
      </div>
      <div style={{ position: "absolute", inset: 2, borderRadius: "50%", overflow: "hidden", background: "linear-gradient(135deg, #143314, #2D5A27)" }}>
        {src ? (
          <img src={src} alt="Terra Viva" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", background: "linear-gradient(135deg, #143314, #2D5A27)" }}>
            <Leaf size={size * 0.35} color="#7bc070" />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label, icon: Icon }: { value: string; label: string; icon?: React.ElementType }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 80 }}>
      {Icon && <Icon size={14} color="rgba(255,252,247,0.45)" />}
      <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 700, color: "var(--tv-linen)", lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: "var(--text-xs)", color: "rgba(255,252,247,0.50)", letterSpacing: "0.04em", textAlign: "center", lineHeight: 1.3 }}>{label}</span>
    </div>
  );
}

function TrustPill({ icon: Icon, label, sub }: { icon: React.ElementType; label: string; sub: string }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", background: "var(--tv-white)", border: "1px solid var(--tv-stone-200)", borderRadius: "var(--r-2xl)", padding: "var(--space-3) var(--space-4)", boxShadow: "var(--shadow-sm)" }}
    >
      <div style={{ width: 38, height: 38, borderRadius: "var(--r-lg)", flexShrink: 0, background: "linear-gradient(135deg, #e8f5e1, #c8e8c0)", color: "var(--tv-moss)", display: "grid", placeItems: "center" }}>
        <Icon size={16} />
      </div>
      <div>
        <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--tv-forest)", lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)", marginTop: 1 }}>{sub}</div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CATEGORY CAROUSEL — Carrossel horizontal infinito
   Auto-scroll + drag manual + snap + pause no hover
   ═══════════════════════════════════════════════════════════════ */

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
}

function CategoryCarousel({
  categories,
  activeCategory,
  onSelect,
}: {
  categories: CategoryItem[];
  activeCategory: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoScrollRef = useRef<number | null>(null);
  const velocityRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);

  // Mapeia slug → imagem PNG em public/categorias
  const getCategoryImage = useCallback((slug: string): string => {
    const map: Record<string, string> = {
      bebidas: "/categorias/bebida.png",
      frutas: "/categorias/frutas.png",
      graos: "/categorias/graos.png",
      graos_e_cereais: "/categorias/graos.png",
      laticinios: "/categorias/laticinios.png",
      organico: "/categorias/organico.png",
      organicos: "/categorias/organico.png",
      outros: "/categorias/outros.png",
      temperos: "/categorias/tempero.png",
      tempero: "/categorias/tempero.png",
      vegetais: "/categorias/vegetal.png",
      vegetal: "/categorias/vegetal.png",
      verduras: "/categorias/verduras.png",
      verdura: "/categorias/verduras.png",
    };
    return map[slug] || `/categorias/${slug}.png`;
  }, []);

  // Itens do carrossel: Todos + categorias
  const allItems: Array<{ type: "all" | "category"; data?: CategoryItem }> = [
    { type: "all" },
    ...categories.map((cat) => ({ type: "category" as const, data: cat })),
  ];

  // Duplica os itens para loop infinito visual
  const duplicatedItems = [...allItems, ...allItems, ...allItems];

  // Auto-scroll infinito
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const scroll = () => {
      if (!track || isPaused || isDragging) {
        autoScrollRef.current = requestAnimationFrame(scroll);
        return;
      }

      track.scrollLeft += 0.6; // velocidade suave

      // Loop infinito: quando chega no final do primeiro conjunto, volta pro início
      const itemWidth = track.scrollWidth / 3;
      if (track.scrollLeft >= itemWidth * 2) {
        track.scrollLeft = itemWidth;
      }

      autoScrollRef.current = requestAnimationFrame(scroll);
    };

    // Posiciona no meio (segundo conjunto) para permitir scroll para ambos os lados
    const itemWidth = track.scrollWidth / 3;
    track.scrollLeft = itemWidth;

    autoScrollRef.current = requestAnimationFrame(scroll);

    return () => {
      if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
    };
  }, [isPaused, isDragging]);

  // Handlers de drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - trackRef.current.offsetLeft);
    setScrollLeft(trackRef.current.scrollLeft);
    lastXRef.current = e.pageX;
    lastTimeRef.current = Date.now();
    velocityRef.current = 0;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!trackRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - trackRef.current.offsetLeft);
    setScrollLeft(trackRef.current.scrollLeft);
    lastXRef.current = e.touches[0].pageX;
    lastTimeRef.current = Date.now();
    velocityRef.current = 0;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !trackRef.current) return;
    e.preventDefault();
    const x = e.pageX - trackRef.current.offsetLeft;
    const walk = (x - startX) * 1.2;
    trackRef.current.scrollLeft = scrollLeft - walk;

    // Calcula velocidade para inércia
    const now = Date.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      velocityRef.current = (e.pageX - lastXRef.current) / dt;
    }
    lastXRef.current = e.pageX;
    lastTimeRef.current = now;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !trackRef.current) return;
    const x = e.touches[0].pageX - trackRef.current.offsetLeft;
    const walk = (x - startX) * 1.2;
    trackRef.current.scrollLeft = scrollLeft - walk;

    const now = Date.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      velocityRef.current = (e.touches[0].pageX - lastXRef.current) / dt;
    }
    lastXRef.current = e.touches[0].pageX;
    lastTimeRef.current = now;
  };

  const handleEnd = () => {
    if (!isDragging || !trackRef.current) return;
    setIsDragging(false);

    // Inércia suave
    const track = trackRef.current;
    const inertia = () => {
      if (Math.abs(velocityRef.current) < 0.01) return;
      track.scrollLeft -= velocityRef.current * 16;
      velocityRef.current *= 0.92; // fricção
      requestAnimationFrame(inertia);
    };
    requestAnimationFrame(inertia);
  };

  // Snap ao item mais próximo
  const snapToItem = () => {
    if (!trackRef.current || isDragging) return;
    const track = trackRef.current;
    const itemWidth = track.scrollWidth / 3 / allItems.length;
    const targetScroll = Math.round(track.scrollLeft / itemWidth) * itemWidth;
    track.scrollTo({ left: targetScroll, behavior: "smooth" });
  };

  const handleClick = (e: React.MouseEvent, slug: string | null) => {
    // Só clica se não estava arrastando
    if (Math.abs(velocityRef.current) > 0.05) return;
    onSelect(slug);
  };

  const renderCategoryButton = (
    item: { type: "all" | "category"; data?: CategoryItem },
    index: number
  ) => {
    const isAll = item.type === "all";
    const slug = isAll ? null : item.data!.slug;
    const name = isAll ? "Todos" : item.data!.name;
    const imageUrl = isAll ? "/categorias/todos.png" : getCategoryImage(item.data!.slug);
    const isActive = isAll ? activeCategory === null : activeCategory === slug;

    return (
      <button
        key={`${isAll ? "all" : item.data!.id}-${index}`}
        onClick={(e) => handleClick(e, slug)}
        onMouseDown={(e) => e.preventDefault()}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          padding: "8px 6px",
          background: "transparent",
          border: "none",
          borderRadius: 16,
          cursor: isDragging ? "grabbing" : "pointer",
          outline: "none",
          WebkitTapHighlightColor: "transparent",
          flexShrink: 0,
          width: "clamp(72px, 18vw, 90px)",
          minWidth: 72,
          userSelect: "none",
          touchAction: "pan-x",
        }}
      >
        {/* Círculo com imagem */}
        <div
          style={{
            position: "relative",
            width: "clamp(56px, 14vw, 72px)",
            height: "clamp(56px, 14vw, 72px)",
            borderRadius: "50%",
            flexShrink: 0,
          }}
        >
          {/* Glow no ativo */}
          {isActive && (
            <motion.div
              layoutId="catActiveGlow"
              style={{
                position: "absolute",
                inset: -5,
                borderRadius: "50%",
                background: "conic-gradient(from 0deg, var(--tv-moss), var(--tv-gold), var(--tv-terracota), var(--tv-moss))",
                opacity: 0.5,
                filter: "blur(5px)",
              }}
              transition={{ duration: 0.3 }}
            />
          )}

          {/* Anel de borda */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              padding: isActive ? 3 : 2,
              background: isActive
                ? "conic-gradient(from 0deg, var(--tv-moss), var(--tv-gold), var(--tv-terracota), var(--tv-moss))"
                : "linear-gradient(135deg, var(--tv-stone-200), var(--tv-stone-300))",
              transition: "all 0.25s ease",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                background: isActive ? "var(--tv-moss)" : "var(--tv-white)",
                transition: "background 0.25s ease",
              }}
            />
          </div>

          {/* Imagem */}
          <div
            style={{
              position: "absolute",
              inset: isActive ? 3 : 2,
              borderRadius: "50%",
              overflow: "hidden",
              background: isActive ? "var(--tv-moss)" : "var(--tv-cream)",
            }}
          >
            <img
              src={imageUrl}
              alt={name}
              loading="lazy"
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                transition: "transform 0.3s ease",
                pointerEvents: "none",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/icons/maskable_icon.png";
              }}
            />
          </div>
        </div>

        {/* Label */}
        <span
          style={{
            fontSize: "clamp(10px, 2.6vw, 12px)",
            fontWeight: isActive ? 700 : 500,
            lineHeight: 1.25,
            textAlign: "center",
            color: isActive ? "var(--tv-moss)" : "var(--tv-stone-600)",
            transition: "color 0.2s ease, font-weight 0.2s ease",
            maxWidth: "100%",
            wordBreak: "break-word",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
            overflow: "hidden",
            padding: "0 2px",
          }}
        >
          {name}
        </span>
      </button>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        cursor: isDragging ? "grabbing" : "grab",
        padding: "4px 0",
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        setIsPaused(false);
        snapToItem();
      }}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => {
        setIsPaused(false);
        setTimeout(snapToItem, 100);
      }}
    >
      {/* Fade edges */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 40,
          background: "linear-gradient(to right, var(--tv-linen), transparent)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 40,
          background: "linear-gradient(to left, var(--tv-linen), transparent)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      {/* Track */}
      <div
        ref={trackRef}
        style={{
          display: "flex",
          gap: "clamp(8px, 2vw, 16px)",
          padding: "8px 12px",
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          scrollBehavior: isDragging ? "auto" : "smooth",
          userSelect: "none",
        }}
        className="no-scrollbar"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleEnd}
      >
        {duplicatedItems.map((item, i) => renderCategoryButton(item, i))}
      </div>
    </div>
  );
}

function HomePage() {
  const { settings } = useSettingsStore();
  const { products, categories, isLoading, fetchProducts, fetchCategories } = useCatalogStore();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { isOpen, closeTime } = useStoreStatus(
    settings.opening_hours as Record<string, { open: string; close: string; closed: boolean }>
  );

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const storeName = settings.name?.split(" - ")[0] || "Feirinha Orgânica";
  const logoSrc = settings.logo_url || "/icons/maskable_icon.png";
  const activeProducts = products.filter((p) => p.is_active);
  const displayProducts = activeCategory
  ? activeProducts.filter((p) => p.categories?.slug === activeCategory).slice(0, 12)
  : activeProducts.slice(0, 12);

const hasMore = activeCategory
  ? activeProducts.filter((p) => p.categories?.slug === activeCategory).length > 12
  : activeProducts.length > 12;

  const deliveryTime = 45;

  return (
    <PublicLayout>

      {/* ══════════ HERO ══════════ */}
      <section style={{ position: "relative", marginTop: "-1.5rem", marginInline: "-1rem", background: "linear-gradient(160deg, #060f06 0%, #0A1F0A 40%, #101a0f 70%, #162e0f 100%)", overflow: "hidden", paddingBottom: 0 }}>
        {settings.cover_url && (
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            <img src={settings.cover_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.18 }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, rgba(6,15,6,0.95) 0%, rgba(10,31,10,0.85) 50%, rgba(22,46,15,0.90) 100%)" }} />
          </div>
        )}
        <div className="grain-overlay" aria-hidden="true" style={{ opacity: 0.06, zIndex: 1 }} />
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse at 50% 30%, rgba(184,134,11,0.12) 0%, rgba(45,90,39,0.08) 50%, transparent 75%)", zIndex: 1, pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: "clamp(3rem, 8vw, 5rem)", paddingBottom: 0, paddingInline: "clamp(1rem, 5vw, 3rem)", gap: "var(--space-5)" }}>
          {/* Status badge */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,252,247,0.08)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,252,247,0.14)", borderRadius: 9999, padding: "5px 14px", fontSize: "var(--text-xs)", color: "rgba(255,252,247,0.75)", letterSpacing: "0.06em", fontWeight: 500 }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: isOpen ? "#7bc070" : "#ef4444", boxShadow: isOpen ? "0 0 0 2px rgba(123,192,112,0.3)" : "none" }} />
            {isOpen ? `Aberto agora · fecha às ${closeTime}` : "Fechado no momento"}
            <span style={{ color: "rgba(255,252,247,0.30)", margin: "0 2px" }}>·</span>
            <Leaf size={11} /><span>Marília – SP</span>
          </motion.div>

          {/* Logo */}
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.1, ease }}>
            <LogoGlow src={logoSrc} size={136} />
          </motion.div>

          {/* Nome */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25, ease }} style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", alignItems: "center" }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2.2rem, 6vw, 4rem)", fontWeight: 700, fontStyle: "italic", color: "var(--tv-linen)", lineHeight: 1.02, letterSpacing: "-0.02em", margin: 0 }}>
              {storeName}
            </h1>
            <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--tv-gold-lt)" }}>
              Terra Viva · Orgânico Certificado
            </p>
          </motion.div>

          {/* Descrição */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.4 }}
            style={{ fontSize: "clamp(0.85rem, 2vw, var(--text-base))", color: "rgba(255,252,247,0.65)", lineHeight: 1.65, maxWidth: "42ch", margin: 0, fontWeight: 300 }}>
            {settings.description || "Da horta para a sua mesa — sem intermediários, sem agrotóxicos. Qualidade que você prova na primeira mordida."}
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.52 }}
            style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", justifyContent: "center" }}>
            <Link to="/produtos" className="tv-btn tv-btn--primary tv-btn--lg">
              <ShoppingBag size={17} />Ver produtos<ArrowRight size={15} />
            </Link>
            {settings.whatsapp && (
              <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="tv-btn tv-btn--ghost tv-btn--lg">
                <MessageCircle size={17} />WhatsApp
              </a>
            )}
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.68 }}
            style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "clamp(1rem, 3vw, 1.5rem)", paddingTop: "var(--space-5)", paddingBottom: "var(--space-6)", borderTop: "1px solid rgba(255,252,247,0.08)", width: "100%", maxWidth: 600 }}>
            <Stat value="150+" label="Clientes ativos" icon={Star} />
            <div style={{ width: 1, background: "rgba(255,252,247,0.10)", alignSelf: "stretch" }} />
            <Stat value="100%" label="Orgânico certificado" icon={ShieldCheck} />
            <div style={{ width: 1, background: "rgba(255,252,247,0.10)", alignSelf: "stretch" }} />
            <Stat value={`${deliveryTime}min`} label="Entrega estimada" icon={Truck} />
            <div style={{ width: 1, background: "rgba(255,252,247,0.10)", alignSelf: "stretch" }} />
            <Stat value="PIX · Dinheiro · Cartão" label="Pagamentos aceitos" icon={Award} />
          </motion.div>
        </div>

        <div style={{ lineHeight: 0, overflow: "hidden", marginTop: -2 }} aria-hidden="true">
          <svg viewBox="0 0 1440 48" fill="none" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 48 }}>
            <path d="M0 24 C360 48 1080 0 1440 24 L1440 48 L0 48 Z" fill="var(--tv-cream)" />
          </svg>
        </div>
      </section>

      {/* ══════════ TRUST STRIP ══════════ */}
      <section style={{ paddingBlock: "var(--space-8)", background: "var(--tv-cream)" }}>
        <div style={{ maxWidth: 1280, marginInline: "auto", paddingInline: "clamp(1rem, 4vw, 2.5rem)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-3)" }} className="sm:grid-cols-4">
            {[
              { icon: Sprout, label: "100% Orgânico", sub: "Sem agrotóxicos" },
              { icon: Truck, label: "Entrega rápida", sub: `Até ${deliveryTime} min` },
              { icon: ShieldCheck, label: "Qualidade garantida", sub: "Sabor de verdade" },
              { icon: Clock, label: "Colhido na semana", sub: "Do campo à mesa" },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 0.07}>
                <TrustPill icon={item.icon} label={item.label} sub={item.sub} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ CATEGORIAS — CARROSSEL HORIZONTAL INFINITO ══════════ */}
      {categories.length > 0 && (
        <section style={{ background: "var(--tv-linen)", paddingBlock: "clamp(1.5rem, 3vw, 2.5rem)", borderTop: "1px solid var(--tv-stone-100)" }}>
          <div style={{ maxWidth: 1280, marginInline: "auto", paddingInline: "clamp(0.75rem, 3vw, 2rem)" }}>
            <Reveal>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)", marginBottom: "var(--space-4)", flexWrap: "wrap", paddingInline: "clamp(0.25rem, 1vw, 0.5rem)" }}>
                <div>
                  <p className="eyebrow" style={{ marginBottom: "var(--space-1)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Leaf size={11} />Navegue por departamento
                  </p>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.3rem, 3vw, 1.8rem)", fontWeight: 700, color: "var(--tv-forest)", margin: 0 }}>
                    Categorias
                  </h2>
                </div>
                <Link to="/produtos" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-sm)", color: "var(--tv-moss)", fontWeight: 500, textDecoration: "none", flexShrink: 0 }}>
                  Ver todas <ChevronRight size={14} />
                </Link>
              </div>
            </Reveal>

            <CategoryCarousel
              categories={categories}
              activeCategory={activeCategory}
              onSelect={setActiveCategory}
            />
          </div>
        </section>
      )}

      {/* ══════════ PRODUTOS ══════════ */}
      <section style={{ background: "linear-gradient(180deg, #0A1F0A 0%, #0d1f0d 100%)", paddingBlock: "clamp(2.5rem, 5vw, 4.5rem)", position: "relative", overflow: "hidden" }}>
        <div className="grain-overlay" aria-hidden="true" style={{ opacity: 0.04 }} />
        <div style={{ position: "absolute", top: -120, right: -120, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(184,134,11,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1280, marginInline: "auto", paddingInline: "clamp(1rem, 4vw, 2.5rem)", position: "relative", zIndex: 1 }}>
          <Reveal>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--space-4)", marginBottom: "var(--space-6)", flexWrap: "wrap" }}>
              <div>
                <p className="eyebrow eyebrow--light" style={{ marginBottom: "var(--space-2)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Star size={11} />
                  {activeCategory ? categories.find((c) => c.slug === activeCategory)?.name ?? "Categoria" : "Frescos do dia"}
                </p>
                <h2 className="tv-heading-2 tv-heading-2--light" style={{ marginBottom: 0 }}>
                  {activeCategory ? "Produtos" : "Todos os produtos"}
                </h2>
              </div>
              <Link to="/produtos" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--text-sm)", color: "rgba(123,192,112,0.9)", fontWeight: 500, flexShrink: 0, textDecoration: "none" }}>
                Ver todos <ChevronRight size={14} />
              </Link>
            </div>
          </Reveal>

          <AnimatePresence mode="wait">
            <motion.div key={activeCategory ?? "all"} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              {isLoading ? (
                <div className="tv-product-grid">
                  {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
                </div>
              ) : displayProducts.length > 0 ? (
                <div className="tv-product-grid">
                  {displayProducts.map((product, i) => <ProductCard key={product.id} product={product} index={i} />)}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-16)", borderRadius: "var(--r-2xl)", border: "1.5px dashed rgba(255,252,247,0.12)", textAlign: "center" }}>
                  <Sprout size={40} color="rgba(255,252,247,0.2)" />
                  <p style={{ fontSize: "var(--text-sm)", color: "rgba(255,252,247,0.40)" }}>Em breve novos produtos fresquinhos!</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {hasMore && (
            <Reveal>
              <div style={{ display: "flex", justifyContent: "center", marginTop: "var(--space-8)" }}>
                <Link to="/produtos" className="tv-btn tv-btn--ghost tv-btn--lg">
                  Ver todos os produtos <ArrowRight size={16} />
                </Link>
              </div>
            </Reveal>
          )}
        </div>

        <div style={{ lineHeight: 0, overflow: "hidden", marginTop: "clamp(2.5rem, 5vw, 4.5rem)", marginInline: -1 }} aria-hidden="true">
          <svg viewBox="0 0 1440 48" fill="none" preserveAspectRatio="none" style={{ display: "block", width: "calc(100% + 2px)", height: 48 }}>
            <path d="M0 0 C360 48 1080 0 1440 24 L1440 48 L0 48 Z" fill="var(--tv-cream)" />
          </svg>
        </div>
      </section>

      {/* ══════════ COMO FUNCIONA ══════════ */}
      <section style={{ background: "var(--tv-cream)", paddingBlock: "clamp(2.5rem, 5vw, 4.5rem)" }}>
        <div style={{ maxWidth: 1280, marginInline: "auto", paddingInline: "clamp(1rem, 4vw, 2.5rem)" }}>
          <Reveal>
            <div style={{ textAlign: "center", marginBottom: "clamp(2rem, 4vw, 3rem)" }}>
              <p className="eyebrow" style={{ justifyContent: "center", marginBottom: "var(--space-2)", display: "flex", alignItems: "center", gap: 6 }}>
                <Leaf size={11} />Simples como deve ser
              </p>
              <h2 className="tv-heading-2">Sua cesta em 3 passos</h2>
            </div>
          </Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-4)" }}>
            {[
              { num: "01", Icon: ShoppingBag, title: "Escolha seus produtos", desc: "Navegue pelas categorias e adicione ao carrinho o que sua família precisa." },
              { num: "02", Icon: MapPin, title: "Finalize o pedido", desc: "Informe o endereço e pague por PIX, Dinheiro ou Cartão." },
              { num: "03", Icon: Truck, title: "Receba em casa", desc: `Entregamos em até ${deliveryTime} min. Frescos, colhidos no dia.` },
            ].map((step, i) => (
              <Reveal key={step.num} delay={i * 0.1}>
                <div className="tv-how-card">
                  <span className="tv-how-card__num">{step.num}</span>
                  <div className="tv-how-card__icon-wrap"><step.Icon size={20} /></div>
                  <h3 className="tv-how-card__title">{step.title}</h3>
                  <p className="tv-how-card__desc">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ INFO CARDS ══════════ */}
      <section style={{ background: "var(--tv-linen)", paddingBlock: "clamp(2rem, 4vw, 3.5rem)" }}>
        <div style={{ maxWidth: 1280, marginInline: "auto", paddingInline: "clamp(1rem, 4vw, 2.5rem)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
            {[
              { icon: Truck,  bg: "#dcfce7", color: "#16a34a", value: "Taxa fixa",              label: "Taxa de entrega" },
              { icon: MapPin, bg: "#dbeafe", color: "#2563eb", value: "15 km",                   label: "Raio de cobertura" },
              { icon: Clock,  bg: "#fef3c7", color: "#b45309", value: `${deliveryTime} min`,     label: "Entrega estimada" },
              { icon: Award,  bg: "#e8f5e1", color: "#16a34a", value: "PIX · Dinheiro · Cartão", label: "Formas de pagamento" },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 0.06}>
                <motion.div
                  whileHover={{ y: -2, boxShadow: "var(--shadow-md)" }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", padding: "var(--space-5)", background: "var(--tv-white)", borderRadius: "var(--r-xl)", border: "1px solid var(--tv-stone-200)", boxShadow: "var(--shadow-sm)" }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: "var(--r-lg)", flexShrink: 0, background: item.bg, color: item.color, display: "grid", placeItems: "center" }}>
                    <item.icon size={20} />
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--tv-forest)", lineHeight: 1.1 }}>{item.value}</div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)", marginTop: 2 }}>{item.label}</div>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ ABOUT ══════════ */}
      {settings.about_text && (
        <section style={{ background: "var(--tv-cream)", paddingBlock: "clamp(2.5rem, 5vw, 4.5rem)" }}>
          <div style={{ maxWidth: 1280, marginInline: "auto", paddingInline: "clamp(1rem, 4vw, 2.5rem)" }}>
            <Reveal>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "var(--space-8)", background: "linear-gradient(135deg, var(--tv-cream) 0%, var(--tv-cream-dk) 100%)", border: "1px solid var(--tv-stone-200)", borderRadius: "var(--r-2xl)", padding: "clamp(2rem, 5vw, 4rem)", position: "relative", overflow: "hidden" }} className="md:grid-cols-[180px_1fr]">
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <div style={{ width: 140, height: 140, borderRadius: "50%", overflow: "hidden", opacity: 0.25, border: "3px solid var(--tv-moss-lt)" }}>
                    <img src={logoSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                </div>
                <div>
                  <p className="eyebrow" style={{ marginBottom: "var(--space-3)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Leaf size={11} />Nossa história
                  </p>
                  <h2 className="tv-heading-2" style={{ marginBottom: "var(--space-5)" }}>
                    Da terra para <em style={{ color: "var(--tv-terracota)", fontStyle: "italic" }}>a sua mesa</em>
                  </h2>
                  <p style={{ fontSize: "var(--text-base)", color: "var(--tv-stone-600)", lineHeight: 1.75, whiteSpace: "pre-line", marginBottom: "var(--space-6)", maxWidth: "60ch" }}>
                    {settings.about_text}
                  </p>
                  {settings.whatsapp && (
                    <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="tv-btn tv-btn--terracotta">
                      <MessageCircle size={16} />Fale com a gente<ArrowRight size={15} />
                    </a>
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ══════════ CTA FINAL ══════════ */}
      <section style={{ background: "linear-gradient(160deg, #060f06 0%, #0A1F0A 50%, #101a0f 100%)", paddingBlock: "clamp(3rem, 7vw, 5rem)", position: "relative", overflow: "hidden" }}>
        <div className="grain-overlay" aria-hidden="true" style={{ opacity: 0.05 }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(184,134,11,0.08) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1280, marginInline: "auto", paddingInline: "clamp(1rem, 4vw, 2.5rem)", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "var(--space-5)" }}>
          <Reveal><LogoGlow src={logoSrc} size={88} /></Reveal>
          <Reveal delay={0.1}>
            <p className="eyebrow eyebrow--light" style={{ justifyContent: "center", display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={11} />Frescos todo dia
            </p>
            <h2 className="tv-heading-2 tv-heading-2--light" style={{ marginTop: "var(--space-2)" }}>Pronto para pedir?</h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p style={{ fontSize: "var(--text-base)", color: "rgba(255,252,247,0.55)", maxWidth: "38ch", lineHeight: 1.65, fontWeight: 300 }}>
              Orgânicos frescos entregues na sua porta. Sem complicação, sem agrotóxico.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", justifyContent: "center" }}>
              <Link to="/produtos" className="tv-btn tv-btn--primary tv-btn--lg">
                <ShoppingBag size={18} />Ver produtos<ArrowRight size={16} />
              </Link>
              {settings.whatsapp && (
                <a href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="tv-btn tv-btn--ghost tv-btn--lg">
                  <MessageCircle size={16} />WhatsApp
                </a>
              )}
            </div>
          </Reveal>
        </div>
      </section>

    </PublicLayout>
  );
}