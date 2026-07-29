import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Leaf, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { EmptyState } from "@/components/store/EmptyState";
import { useCartStore, unitLabel } from "@/stores/cart";
import { useAuthStore } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — Terra Viva" },
      { name: "description", content: "Revise seu pedido e finalize a compra." },
      { property: "og:title", content: "Seu carrinho — Terra Viva" },
      { property: "og:description", content: "Frescos escolhidos para você." },
    ],
  }),
  component: CartPage,
});

/* ═══════════════════════════════════════════════════════════════
   CART ITEM ROW — Mobile-first, sem cortar
   ═══════════════════════════════════════════════════════════════ */
function CartItemRow({
  item,
  onUpdateQty,
  onRemove,
}: {
  item: ReturnType<typeof useCartStore.getState>["items"][number];
  onUpdateQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "clamp(8px, 2vw, 16px)",
        padding: "clamp(10px, 3vw, 16px)",
        background: "var(--tv-white)",
        borderRadius: "var(--r-xl)",
        border: "1px solid var(--tv-stone-200)",
        transition: "all var(--duration-fast) ease",
        minWidth: 0, // evita overflow
      }}
    >
      {/* Product Image */}
      <div
        style={{
          width: "clamp(56px, 15vw, 72px)",
          height: "clamp(56px, 15vw, 72px)",
          borderRadius: "50%",
          overflow: "hidden",
          flexShrink: 0,
          border: "2px solid var(--tv-moss-lt)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <img
          src={item.product_image}
          alt={item.product_name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/icons/maskable_icon.png";
          }}
        />
      </div>

      {/* Product Info — flex-1 com minWidth:0 para ellipsis */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <p
          style={{
            fontWeight: 600,
            fontSize: "clamp(12px, 3.5vw, 14px)",
            color: "var(--tv-forest)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {item.product_name}
        </p>
        <p
          style={{
            fontSize: "clamp(10px, 3vw, 12px)",
            color: "var(--tv-stone-400)",
          }}
        >
          {unitLabel(item.unit_type)} · {formatCurrency(item.unit_price)} cada
        </p>
        <p
          style={{
            fontSize: "clamp(12px, 3.5vw, 14px)",
            fontWeight: 700,
            color: "var(--tv-moss)",
          }}
        >
          {formatCurrency(item.total_price)}
        </p>
      </div>

      {/* Quantity Controls + Remove — layout compacto */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          flexShrink: 0,
        }}
      >
        {/* Stepper */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            background: "var(--tv-cream)",
            borderRadius: "var(--r-full)",
            padding: "2px",
            border: "1px solid var(--tv-stone-200)",
          }}
        >
          <button
            onClick={() => onUpdateQty(item.id, item.quantity - 1)}
            style={{
              width: "clamp(28px, 8vw, 32px)",
              height: "clamp(28px, 8vw, 32px)",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--tv-stone-600)",
              transition: "all var(--duration-fast) ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--tv-stone-200)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <Minus size={14} />
          </button>
          <span
            style={{
              width: "clamp(24px, 7vw, 32px)",
              textAlign: "center",
              fontSize: "clamp(12px, 3.5vw, 14px)",
              fontWeight: 600,
              color: "var(--tv-forest)",
              flexShrink: 0,
            }}
          >
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQty(item.id, item.quantity + 1)}
            style={{
              width: "clamp(28px, 8vw, 32px)",
              height: "clamp(28px, 8vw, 32px)",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--tv-stone-600)",
              transition: "all var(--duration-fast) ease",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "var(--tv-stone-200)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            }}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Remove Button */}
        <button
          onClick={() => {
            onRemove(item.id);
            toast.success("Item removido");
          }}
          style={{
            width: "clamp(28px, 8vw, 36px)",
            height: "clamp(28px, 8vw, 36px)",
            borderRadius: "var(--r-lg)",
            display: "grid",
            placeItems: "center",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--tv-stone-400)",
            transition: "all var(--duration-fast) ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--tv-danger)";
            (e.currentTarget as HTMLButtonElement).style.background = "var(--tv-danger-lt)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--tv-stone-400)";
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
          aria-label="Remover item"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUMMARY CARD — Responsivo, não corta
   ═══════════════════════════════════════════════════════════════ */
function SummaryCard({
  itemCount,
  subtotal,
  deliveryFee,
  total,
  onCheckout,
  isLoggedIn,
}: {
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  onCheckout: () => void;
  isLoggedIn: boolean;
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: 96,
        background: "var(--tv-white)",
        borderRadius: "var(--r-2xl)",
        border: "1px solid var(--tv-stone-200)",
        boxShadow: "var(--shadow-lg)",
        overflow: "hidden",
        width: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "clamp(12px, 4vw, 20px) clamp(16px, 5vw, 24px)",
          borderBottom: "1px solid var(--tv-stone-100)",
          background: "var(--tv-cream)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(15px, 4.5vw, 18px)",
            fontWeight: 700,
            color: "var(--tv-forest)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <ShoppingBag size={18} style={{ color: "var(--tv-moss)" }} />
          Resumo do pedido
        </h2>
      </div>

      {/* Body */}
      <div style={{ padding: "clamp(12px, 4vw, 20px) clamp(16px, 5vw, 24px)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "clamp(12px, 3.5vw, 14px)", color: "var(--tv-stone-500)" }}>
              Subtotal ({itemCount} {itemCount === 1 ? "item" : "itens"})
            </span>
            <span style={{ fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 500, color: "var(--tv-stone-800)" }}>
              {formatCurrency(subtotal)}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "clamp(12px, 3.5vw, 14px)", color: "var(--tv-stone-500)", display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={12} />
              Entrega
            </span>
            <span
              style={{
                fontSize: "clamp(12px, 3.5vw, 14px)",
                fontWeight: 500,
                color: deliveryFee === 0 ? "var(--tv-success)" : "var(--tv-stone-800)",
              }}
            >
              {deliveryFee === 0 ? "Grátis" : formatCurrency(deliveryFee)}
            </span>
          </div>

          <div
            style={{
              height: 1,
              background: "var(--tv-stone-200)",
              margin: "var(--space-2) 0",
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "clamp(13px, 4vw, 15px)", fontWeight: 600, color: "var(--tv-stone-700)" }}>
              Total
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(20px, 6vw, 28px)",
                fontWeight: 700,
                color: "var(--tv-forest)",
              }}
            >
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          onClick={onCheckout}
          className="tv-btn tv-btn--primary"
          style={{
            width: "100%",
            marginTop: "var(--space-5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-2)",
            padding: "clamp(10px, 3vw, 14px) clamp(16px, 5vw, 24px)",
            fontSize: "clamp(13px, 4vw, 15px)",
          }}
        >
          {isLoggedIn ? (
            <>
              Finalizar pedido
              <ArrowRight size={16} />
            </>
          ) : (
            <>
              Entrar e finalizar
              <ArrowRight size={16} />
            </>
          )}
        </button>

        {/* Trust Badges */}
        <div
          style={{
            marginTop: "var(--space-4)",
            paddingTop: "var(--space-4)",
            borderTop: "1px solid var(--tv-stone-100)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontSize: "clamp(10px, 3vw, 12px)",
              color: "var(--tv-stone-400)",
            }}
          >
            <Leaf size={12} style={{ color: "var(--tv-moss)", flexShrink: 0 }} />
            Produtos frescos e orgânicos
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontSize: "clamp(10px, 3vw, 12px)",
              color: "var(--tv-stone-400)",
            }}
          >
            <MapPin size={12} style={{ color: "var(--tv-moss)", flexShrink: 0 }} />
            Entrega rápida no seu bairro
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE — Grid responsivo, mobile-first
   ═══════════════════════════════════════════════════════════════ */
function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQuantity);
  const remove = useCartStore((s) => s.removeItem);
  const settings = useSettingsStore((s) => s.settings);
  const profile = useAuthStore((s) => s.profile);
  const navigate = useNavigate();

  const subtotal = items.reduce((a, i) => a + i.total_price, 0);
  const deliveryFee = subtotal > 0 ? (settings?.delivery_fee ?? 0) : 0;
  const total = Math.max(0, subtotal + deliveryFee);
  const itemCount = items.reduce((a, i) => a + i.quantity, 0);

  if (items.length === 0) {
    return (
      <PublicLayout>
        <div style={{ minHeight: "60dvh", display: "grid", placeItems: "center" }}>
          <EmptyState
            title="Sua cesta está vazia"
            description="Que tal escolher alguns produtos frescos e orgânicos?"
            action={
              <Link
                to="/produtos"
                className="tv-btn tv-btn--primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}
              >
                <Leaf size={16} />
                Ver produtos
              </Link>
            }
          />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(16px, 5vw, 24px) clamp(12px, 4vw, 16px)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "clamp(16px, 5vw, 24px)" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(22px, 7vw, 32px)",
              fontWeight: 700,
              color: "var(--tv-forest)",
              lineHeight: 1.1,
            }}
          >
            Seu carrinho
          </h1>
          <p style={{ fontSize: "clamp(12px, 3.5vw, 14px)", color: "var(--tv-stone-400)", marginTop: "var(--space-1)" }}>
            {itemCount} {itemCount === 1 ? "item" : "itens"} selecionado{itemCount === 1 ? "" : "s"}
          </p>
        </div>

        {/* Grid — 1 coluna mobile, 2 colunas desktop */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "clamp(16px, 5vw, 24px)",
          }}
          className="cart-layout"
        >
          {/* Items List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(8px, 2.5vw, 12px)" }}>
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                onUpdateQty={updateQty}
                onRemove={remove}
              />
            ))}

            {/* Continue Shopping */}
            <Link
              to="/produtos"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--space-2)",
                fontSize: "clamp(12px, 3.5vw, 14px)",
                color: "var(--tv-moss)",
                fontWeight: 500,
                textDecoration: "none",
                marginTop: "var(--space-2)",
                transition: "color var(--duration-fast) ease",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.color = "var(--tv-moss-mid)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.color = "var(--tv-moss)";
              }}
            >
              <ArrowRight size={14} style={{ transform: "rotate(180deg)" }} />
              Continuar comprando
            </Link>
          </div>

          {/* Summary Sidebar */}
          <SummaryCard
            itemCount={itemCount}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            total={total}
            isLoggedIn={!!profile}
            onCheckout={() => {
              if (!profile) {
                navigate({ to: "/auth/login", search: { redirect: "/checkout" } });
              } else {
                navigate({ to: "/checkout" });
              }
            }}
          />
        </div>
      </div>

      {/* Desktop: 2 colunas */}
      <style>{`
        @media (min-width: 900px) {
          .cart-layout {
            grid-template-columns: 1fr 340px !important;
          }
        }
        @media (min-width: 1024px) {
          .cart-layout {
            grid-template-columns: 1fr 380px !important;
          }
        }
      `}</style>
    </PublicLayout>
  );
}