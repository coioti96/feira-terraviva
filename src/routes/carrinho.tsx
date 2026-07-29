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
   CART ITEM ROW — Mobile-first, centralizado, sem cortar
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
        gap: "clamp(6px, 2vw, 14px)",
        padding: "clamp(10px, 3vw, 14px)",
        background: "var(--tv-white)",
        borderRadius: "var(--r-xl)",
        border: "1px solid var(--tv-stone-200)",
        transition: "all var(--duration-fast) ease",
        minWidth: 0,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Product Image */}
      <div
        style={{
          width: "clamp(48px, 13vw, 64px)",
          height: "clamp(48px, 13vw, 64px)",
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

      {/* Product Info */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
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
            fontSize: "clamp(10px, 3vw, 11px)",
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

      {/* Quantity Controls + Remove */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "2px",
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
              width: "clamp(26px, 7vw, 30px)",
              height: "clamp(26px, 7vw, 30px)",
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
            <Minus size={13} />
          </button>
          <span
            style={{
              width: "clamp(22px, 6vw, 28px)",
              textAlign: "center",
              fontSize: "clamp(11px, 3.2vw, 13px)",
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
              width: "clamp(26px, 7vw, 30px)",
              height: "clamp(26px, 7vw, 30px)",
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
            <Plus size={13} />
          </button>
        </div>

        {/* Remove Button */}
        <button
          onClick={() => {
            onRemove(item.id);
            toast.success("Item removido");
          }}
          style={{
            width: "clamp(26px, 7vw, 32px)",
            height: "clamp(26px, 7vw, 32px)",
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
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUMMARY CARD — Responsivo, centralizado
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
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "clamp(12px, 4vw, 18px) clamp(14px, 4vw, 22px)",
          borderBottom: "1px solid var(--tv-stone-100)",
          background: "var(--tv-cream)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(14px, 4vw, 17px)",
            fontWeight: 700,
            color: "var(--tv-forest)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <ShoppingBag size={17} style={{ color: "var(--tv-moss)", flexShrink: 0 }} />
          Resumo do pedido
        </h2>
      </div>

      {/* Body */}
      <div style={{ padding: "clamp(12px, 4vw, 18px) clamp(14px, 4vw, 22px)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "clamp(11px, 3.3vw, 13px)", color: "var(--tv-stone-500)" }}>
              Subtotal ({itemCount} {itemCount === 1 ? "item" : "itens"})
            </span>
            <span style={{ fontSize: "clamp(11px, 3.3vw, 13px)", fontWeight: 500, color: "var(--tv-stone-800)" }}>
              {formatCurrency(subtotal)}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "clamp(11px, 3.3vw, 13px)", color: "var(--tv-stone-500)", display: "flex", alignItems: "center", gap: 4 }}>
              <MapPin size={11} style={{ flexShrink: 0 }} />
              Entrega
            </span>
            <span
              style={{
                fontSize: "clamp(11px, 3.3vw, 13px)",
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
              margin: "var(--space-1) 0",
            }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 600, color: "var(--tv-stone-700)" }}>
              Total
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(18px, 5.5vw, 26px)",
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
            marginTop: "var(--space-4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-2)",
            padding: "clamp(10px, 3vw, 13px)",
            fontSize: "clamp(12px, 3.5vw, 14px)",
          }}
        >
          {isLoggedIn ? (
            <>
              Finalizar pedido
              <ArrowRight size={15} />
            </>
          ) : (
            <>
              Entrar e finalizar
              <ArrowRight size={15} />
            </>
          )}
        </button>

        {/* Trust Badges */}
        <div
          style={{
            marginTop: "var(--space-3)",
            paddingTop: "var(--space-3)",
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
              fontSize: "clamp(10px, 3vw, 11px)",
              color: "var(--tv-stone-400)",
            }}
          >
            <Leaf size={11} style={{ color: "var(--tv-moss)", flexShrink: 0 }} />
            Produtos frescos e orgânicos
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              fontSize: "clamp(10px, 3vw, 11px)",
              color: "var(--tv-stone-400)",
            }}
          >
            <MapPin size={11} style={{ color: "var(--tv-moss)", flexShrink: 0 }} />
            Entrega rápida no seu bairro
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE — Centralizado, sem cortar, mobile-first
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
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
          padding: "clamp(12px, 4vw, 24px)",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "clamp(14px, 4vw, 24px)", padding: "0 clamp(4px, 1vw, 8px)" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(20px, 6.5vw, 30px)",
              fontWeight: 700,
              color: "var(--tv-forest)",
              lineHeight: 1.1,
            }}
          >
            Seu carrinho
          </h1>
          <p style={{ fontSize: "clamp(11px, 3.2vw, 13px)", color: "var(--tv-stone-400)", marginTop: "var(--space-1)" }}>
            {itemCount} {itemCount === 1 ? "item" : "itens"} selecionado{itemCount === 1 ? "" : "s"}
          </p>
        </div>

        {/* Grid — 1 coluna mobile, 2 colunas desktop */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            gap: "clamp(14px, 4vw, 24px)",
            width: "100%",
          }}
          className="cart-layout"
        >
          {/* Items List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(8px, 2vw, 12px)", minWidth: 0 }}>
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
                fontSize: "clamp(11px, 3.2vw, 13px)",
                color: "var(--tv-moss)",
                fontWeight: 500,
                textDecoration: "none",
                marginTop: "var(--space-2)",
                padding: "0 clamp(4px, 1vw, 8px)",
                transition: "color var(--duration-fast) ease",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.color = "var(--tv-moss-mid)";
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.color = "var(--tv-moss)";
              }}
            >
              <ArrowRight size={13} style={{ transform: "rotate(180deg)" }} />
              Continuar comprando
            </Link>
          </div>

          {/* Summary Sidebar */}
          <div style={{ minWidth: 0 }}>
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
      </div>

      {/* Responsive: desktop 2 columns */}
      <style>{`
        @media (min-width: 900px) {
          .cart-layout {
            grid-template-columns: minmax(0, 1fr) minmax(260px, 320px) !important;
          }
        }
        @media (min-width: 1024px) {
          .cart-layout {
            grid-template-columns: minmax(0, 1fr) minmax(280px, 360px) !important;
          }
        }
      `}</style>
    </PublicLayout>
  );
}