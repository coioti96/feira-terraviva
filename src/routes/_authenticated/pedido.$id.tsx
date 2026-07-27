import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Store,
  MapPin,
  CreditCard,
  Banknote,
  Smartphone,
  QrCode,
  Receipt,
  ShoppingBag,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Home,
  StickyNote,
  ChevronRight,
  Calendar,
  User,
  Phone,
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { EmptyState } from "@/components/store/EmptyState";
import { useAuthStore } from "@/stores/auth";
import { useCartStore, unitLabel } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils";
import { getOrderDetail, cancelOrder } from "@/utils/server-function/orders";
import type { Order, OrderStatusHistory } from "@/types";

export const Route = createFileRoute("/_authenticated/pedido/$id")({
  head: () => ({
    meta: [{ title: "Pedido — Terra Viva" }],
  }),
  component: OrderDetailPage,
});

/* ────────────────────────────────────────────────────────────
   STATUS CONFIG
   ──────────────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType; description: string }
> = {
  pending: {
    label: "Pendente",
    color: "var(--tv-warning)",
    bg: "var(--tv-warning-lt)",
    icon: Clock,
    description: "Aguardando confirmação",
  },
  confirmed: {
    label: "Confirmado",
    color: "var(--tv-info)",
    bg: "var(--tv-info-lt)",
    icon: CheckCircle2,
    description: "Pedido confirmado",
  },
  preparing: {
    label: "Em preparação",
    color: "var(--tv-moss)",
    bg: "var(--tv-moss-lt)",
    icon: Package,
    description: "Separando seus itens",
  },
  ready: {
    label: "Pronto",
    color: "var(--tv-success)",
    bg: "var(--tv-success-lt)",
    icon: CheckCircle2,
    description: "Pronto para retirada/envio",
  },
  shipped: {
    label: "Saiu para entrega",
    color: "var(--tv-moss)",
    bg: "var(--tv-moss-lt)",
    icon: Truck,
    description: "Em rota de entrega",
  },
  delivered: {
    label: "Entregue",
    color: "var(--tv-success)",
    bg: "var(--tv-success-lt)",
    icon: CheckCircle2,
    description: "Pedido entregue",
  },
  cancelled: {
    label: "Cancelado",
    color: "var(--tv-danger)",
    bg: "var(--tv-danger-lt)",
    icon: XCircle,
    description: "Pedido cancelado",
  },
};

const PAYMENT_METHOD_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  mercado_pago: { label: "PIX Automático", icon: QrCode },
  pix: { label: "PIX Manual", icon: Smartphone },
  cash: { label: "Dinheiro", icon: Banknote },
  card: { label: "Cartão", icon: CreditCard },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "var(--tv-warning)" },
  paid: { label: "Pago", color: "var(--tv-success)" },
  failed: { label: "Falhou", color: "var(--tv-danger)" },
  refunded: { label: "Reembolsado", color: "var(--tv-stone-500)" },
  cancelled: { label: "Cancelado", color: "var(--tv-danger)" },
};

/* ────────────────────────────────────────────────────────────
   TIMELINE COMPONENT
   ──────────────────────────────────────────────────────────── */
function OrderTimeline({ history, currentStatus }: { history: OrderStatusHistory[]; currentStatus: string }) {
  const allStatuses = ["pending", "confirmed", "preparing", "ready", "shipped", "delivered"];
  const currentIdx = allStatuses.indexOf(currentStatus);
  const isCancelled = currentStatus === "cancelled";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {allStatuses.map((status, idx) => {
        const config = STATUS_CONFIG[status];
        const StatusIcon = config.icon;
        const isCompleted = isCancelled ? false : idx <= currentIdx;
        const isCurrent = !isCancelled && idx === currentIdx;
        const historyEntry = history?.find((h) => h.status === status);

        return (
          <div key={status} style={{ display: "flex", gap: "var(--space-3)" }}>
            {/* Line + Dot */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: isCompleted || isCurrent ? config.bg : "var(--tv-stone-100)",
                  border: `2px solid ${isCompleted || isCurrent ? config.color : "var(--tv-stone-200)"}`,
                  transition: "all var(--duration-fast) ease",
                }}
              >
                <StatusIcon size={14} style={{ color: isCompleted || isCurrent ? config.color : "var(--tv-stone-400)" }} />
              </div>
              {idx < allStatuses.length - 1 && (
                <div
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 32,
                    background: isCompleted && !isCancelled ? config.color : "var(--tv-stone-200)",
                    margin: "4px 0",
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div style={{ paddingBottom: "var(--space-3)", flex: 1 }}>
              <p
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: isCurrent ? 700 : 600,
                  color: isCompleted || isCurrent ? "var(--tv-stone-800)" : "var(--tv-stone-400)",
                }}
              >
                {config.label}
              </p>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)", marginTop: 2 }}>
                {config.description}
              </p>
              {historyEntry && (
                <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-500)", marginTop: 4 }}>
                  <Calendar size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                  {new Date(historyEntry.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {historyEntry.notes && ` · ${historyEntry.notes}`}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {isCancelled && (
        <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: STATUS_CONFIG.cancelled.bg,
              border: `2px solid ${STATUS_CONFIG.cancelled.color}`,
            }}
          >
            <XCircle size={14} style={{ color: STATUS_CONFIG.cancelled.color }} />
          </div>
          <div>
            <p style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--tv-danger)" }}>
              Cancelado
            </p>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)", marginTop: 2 }}>
              {STATUS_CONFIG.cancelled.description}
            </p>
            {history?.find((h) => h.status === "cancelled")?.notes && (
              <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-500)", marginTop: 4 }}>
                Motivo: {history.find((h) => h.status === "cancelled")?.notes}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   MAIN PAGE
   ──────────────────────────────────────────────────────────── */
function OrderDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const addItem = useCartStore((s) => s.addItem);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [repeating, setRepeating] = useState(false);

  // Fetch order on mount
  useState(() => {
    const fetchOrder = async () => {
      if (!profile?.id || !id) return;
      try {
        const result = await getOrderDetail({ data: { orderId: id, userId: profile.id } });
        if (result.success && result.order) {
          setOrder(result.order);
        } else {
          toast.error(result.error || "Pedido não encontrado");
          navigate({ to: "/pedidos" });
        }
      } catch (err) {
        console.error("[OrderDetail] Erro:", err);
        toast.error("Erro ao carregar pedido");
        navigate({ to: "/pedidos" });
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  });

  const handleCancel = useCallback(async () => {
    if (!profile?.id || !order?.id) return;
    if (!confirm("Tem certeza que deseja cancelar este pedido?")) return;

    setCancelling(true);
    try {
      const result = await cancelOrder({ data: { orderId: order.id, userId: profile.id } });
      if (result.success) {
        toast.success("Pedido cancelado com sucesso");
        // Refresh order data
        const refreshed = await getOrderDetail({ data: { orderId: order.id, userId: profile.id } });
        if (refreshed.success && refreshed.order) {
          setOrder(refreshed.order);
        }
      } else {
        toast.error(result.error || "Erro ao cancelar pedido");
      }
    } catch (err) {
      console.error("[handleCancel] Erro:", err);
      toast.error("Erro ao cancelar pedido");
    } finally {
      setCancelling(false);
    }
  }, [order?.id, profile?.id]);

  const handleRepeat = useCallback(() => {
    if (!order?.items?.length) return;
    setRepeating(true);

    try {
      order.items.forEach((i) => {
        addItem({
          product_id: i.product_id || "",
          product_name: i.product_name || "",
          product_image: i.product_image || "",
          product_slug: "",
          unit_type: i.unit_type || "unidade",
          quantity: i.quantity || 1,
          unit_price: i.unit_price || 0,
        });
      });
      toast.success("Itens adicionados ao carrinho");
      navigate({ to: "/carrinho" });
    } catch (err) {
      console.error("[handleRepeat] Erro:", err);
      toast.error("Erro ao repetir pedido");
    } finally {
      setRepeating(false);
    }
  }, [order?.items, addItem, navigate]);

  if (loading) {
    return (
      <PublicLayout>
        <div style={{ minHeight: "60dvh", display: "grid", placeItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <Loader2 size={40} className="animate-spin" style={{ color: "var(--tv-moss)", margin: "0 auto" }} />
            <p style={{ marginTop: "var(--space-3)", color: "var(--tv-stone-500)", fontSize: "var(--text-sm)" }}>
              Carregando pedido...
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!order) {
    return (
      <PublicLayout>
        <div style={{ minHeight: "60dvh", display: "grid", placeItems: "center" }}>
          <EmptyState
            title="Pedido não encontrado"
            description="O pedido que você procura não existe ou não pertence a você."
            action={
              <Link to="/pedidos" className="tv-btn tv-btn--primary" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                <ArrowLeft size={16} />
                Ver meus pedidos
              </Link>
            }
          />
        </div>
      </PublicLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const paymentConfig = PAYMENT_METHOD_CONFIG[order.payment_method] || { label: order.payment_method, icon: Receipt };
  const paymentStatusConfig = PAYMENT_STATUS_CONFIG[order.payment_status] || PAYMENT_STATUS_CONFIG.pending;
  const PaymentIcon = paymentConfig.icon;
  const formattedDate = new Date(order.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <PublicLayout>
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "var(--space-6) var(--space-4)",
        }}
      >
        {/* Back Link */}
        <Link
          to="/pedidos"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1-5)",
            fontSize: "var(--text-sm)",
            color: "var(--tv-moss)",
            textDecoration: "none",
            fontWeight: 500,
            marginBottom: "var(--space-4)",
          }}
        >
          <ArrowLeft size={16} />
          Meus pedidos
        </Link>

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "var(--space-3)",
            marginBottom: "var(--space-6)",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-2xl)",
                fontWeight: 700,
                color: "var(--tv-forest)",
                lineHeight: 1.1,
              }}
            >
              Pedido #{order.order_number}
            </h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-400)", marginTop: "var(--space-1)" }}>
              <Calendar size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              {formattedDate}
            </p>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: "var(--r-full)",
                background: statusConfig.bg,
                color: statusConfig.color,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <statusConfig.icon size={12} />
              {statusConfig.label}
            </span>
            <span
              style={{
                fontSize: "var(--text-xs)",
                fontWeight: 600,
                padding: "6px 12px",
                borderRadius: "var(--r-full)",
                background: "var(--tv-cream)",
                color: paymentStatusConfig.color,
                border: "1px solid var(--tv-stone-200)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Receipt size={12} />
              {paymentStatusConfig.label}
            </span>
          </div>
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            gap: "var(--space-6)",
          }}
          className="order-detail-grid"
        >
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            {/* Timeline */}
            <div
              style={{
                background: "var(--tv-white)",
                borderRadius: "var(--r-2xl)",
                border: "1px solid var(--tv-stone-200)",
                boxShadow: "var(--shadow-sm)",
                padding: "var(--space-5)",
              }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-lg)",
                  fontWeight: 700,
                  color: "var(--tv-forest)",
                  marginBottom: "var(--space-4)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
              >
                <Package size={18} style={{ color: "var(--tv-moss)" }} />
                Progresso do pedido
              </h2>
              <OrderTimeline history={order.history || []} currentStatus={order.status} />
            </div>

            {/* Items */}
            <div
              style={{
                background: "var(--tv-white)",
                borderRadius: "var(--r-2xl)",
                border: "1px solid var(--tv-stone-200)",
                boxShadow: "var(--shadow-sm)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "var(--space-4) var(--space-5)",
                  borderBottom: "1px solid var(--tv-stone-100)",
                  background: "var(--tv-cream)",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-lg)",
                    fontWeight: 700,
                    color: "var(--tv-forest)",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  <ShoppingBag size={18} style={{ color: "var(--tv-moss)" }} />
                  Itens do pedido
                </h2>
              </div>
              <div style={{ padding: "var(--space-3) var(--space-5)" }}>
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      padding: "var(--space-3) 0",
                      borderBottom: "1px solid var(--tv-stone-100)",
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        overflow: "hidden",
                        flexShrink: 0,
                        border: "2px solid var(--tv-moss-lt)",
                      }}
                    >
                      <img
                        src={item.product_image || "/icons/maskable_icon.png"}
                        alt={item.product_name || ""}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/icons/maskable_icon.png";
                        }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontWeight: 600,
                          fontSize: "var(--text-sm)",
                          color: "var(--tv-stone-800)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.product_name}
                      </p>
                      <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)", marginTop: 2 }}>
                        {item.quantity} × {unitLabel(item.unit_type || "unidade")} @ {formatCurrency(item.unit_price || 0)}
                      </p>
                    </div>
                    <p style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--tv-forest)", flexShrink: 0 }}>
                      {formatCurrency(item.total_price || 0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Info */}
            <div
              style={{
                background: "var(--tv-white)",
                borderRadius: "var(--r-2xl)",
                border: "1px solid var(--tv-stone-200)",
                boxShadow: "var(--shadow-sm)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "var(--space-4) var(--space-5)",
                  borderBottom: "1px solid var(--tv-stone-100)",
                  background: "var(--tv-cream)",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-lg)",
                    fontWeight: 700,
                    color: "var(--tv-forest)",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  {order.delivery_type === "pickup" ? (
                    <Store size={18} style={{ color: "var(--tv-moss)" }} />
                  ) : (
                    <MapPin size={18} style={{ color: "var(--tv-moss)" }} />
                  )}
                  {order.delivery_type === "pickup" ? "Retirada na loja" : "Endereço de entrega"}
                </h2>
              </div>
              <div style={{ padding: "var(--space-4) var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {order.delivery_type === "delivery" && order.address ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--tv-stone-700)" }}>
                      <Home size={14} style={{ color: "var(--tv-moss)", flexShrink: 0 }} />
                      {order.address.street}, {order.address.number}
                      {order.address.complement && ` — ${order.address.complement}`}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--tv-stone-700)" }}>
                      <MapPin size={14} style={{ color: "var(--tv-moss)", flexShrink: 0 }} />
                      {order.address.neighborhood}, {order.address.city}/{order.address.state}
                      {order.address.cep && ` · CEP ${order.address.cep}`}
                    </div>
                    {order.address.reference && (
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--tv-stone-500)" }}>
                        <StickyNote size={12} style={{ flexShrink: 0 }} />
                        Ref: {order.address.reference}
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-600)" }}>
                    Você escolheu retirar seu pedido diretamente na loja.
                  </p>
                )}
                {order.notes && (
                  <div
                    style={{
                      marginTop: "var(--space-2)",
                      padding: "var(--space-3)",
                      background: "var(--tv-cream)",
                      borderRadius: "var(--r-lg)",
                      border: "1px solid var(--tv-stone-200)",
                      fontSize: "var(--text-xs)",
                      color: "var(--tv-stone-600)",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>Observações:</span> {order.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Info */}
            <div
              style={{
                background: "var(--tv-white)",
                borderRadius: "var(--r-2xl)",
                border: "1px solid var(--tv-stone-200)",
                boxShadow: "var(--shadow-sm)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "var(--space-4) var(--space-5)",
                  borderBottom: "1px solid var(--tv-stone-100)",
                  background: "var(--tv-cream)",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-lg)",
                    fontWeight: 700,
                    color: "var(--tv-forest)",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  <PaymentIcon size={18} style={{ color: "var(--tv-moss)" }} />
                  Pagamento
                </h2>
              </div>
              <div style={{ padding: "var(--space-4) var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-500)" }}>Método</span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--tv-stone-800)", display: "flex", alignItems: "center", gap: 4 }}>
                    <PaymentIcon size={14} />
                    {paymentConfig.label}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-500)" }}>Status</span>
                  <span
                    style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "var(--r-full)",
                      background: paymentStatusConfig.color + "15",
                      color: paymentStatusConfig.color,
                    }}
                  >
                    {paymentStatusConfig.label}
                  </span>
                </div>
                {order.change_for && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-500)" }}>Troco para</span>
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--tv-stone-800)" }}>
                      {formatCurrency(order.change_for)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column — Summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <div
              style={{
                position: "sticky",
                top: 96,
                background: "var(--tv-white)",
                borderRadius: "var(--r-2xl)",
                border: "1px solid var(--tv-stone-200)",
                boxShadow: "var(--shadow-lg)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "var(--space-5)",
                  background: "var(--tv-forest)",
                  color: "var(--tv-linen)",
                }}
              >
                <p style={{ fontSize: "var(--text-xs)", opacity: 0.7, marginBottom: "var(--space-1)" }}>Total do pedido</p>
                <p
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-3xl)",
                    fontWeight: 700,
                  }}
                >
                  {formatCurrency(order.total)}
                </p>
              </div>
              <div style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)" }}>
                  <span style={{ color: "var(--tv-stone-500)" }}>Subtotal</span>
                  <span style={{ fontWeight: 500, color: "var(--tv-stone-800)" }}>{formatCurrency(order.subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)" }}>
                  <span style={{ color: "var(--tv-stone-500)" }}>Entrega</span>
                  <span style={{ fontWeight: 500, color: "var(--tv-stone-800)" }}>
                    {order.delivery_fee === 0 ? "Grátis" : formatCurrency(order.delivery_fee)}
                  </span>
                </div>
                {order.discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--text-sm)" }}>
                    <span style={{ color: "var(--tv-success)" }}>Desconto</span>
                    <span style={{ fontWeight: 500, color: "var(--tv-success)" }}>−{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div style={{ height: 1, background: "var(--tv-stone-200)", margin: "var(--space-1) 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--tv-stone-800)" }}>Total</span>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-xl)",
                      fontWeight: 700,
                      color: "var(--tv-forest)",
                    }}
                  >
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding: "0 var(--space-5) var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {order.status === "pending" && (
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    style={{
                      width: "100%",
                      padding: "var(--space-3)",
                      borderRadius: "var(--r-xl)",
                      border: "1px solid var(--tv-danger)",
                      background: "var(--tv-danger-lt)",
                      color: "var(--tv-danger)",
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "var(--space-2)",
                      opacity: cancelling ? 0.6 : 1,
                    }}
                  >
                    {cancelling ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    {cancelling ? "Cancelando..." : "Cancelar pedido"}
                  </button>
                )}
                <button
                  onClick={handleRepeat}
                  disabled={repeating}
                  style={{
                    width: "100%",
                    padding: "var(--space-3)",
                    borderRadius: "var(--r-xl)",
                    border: "1px solid var(--tv-stone-200)",
                    background: "var(--tv-cream)",
                    color: "var(--tv-moss)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  <RotateCcw size={14} />
                  Repetir pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .order-detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </PublicLayout>
  );
}