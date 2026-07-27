// ============================================================
// PEDIDOS — Histórico de Pedidos do Cliente
// Feirinha Orgânica Terra Viva · Enterprise
// Lista profissional com filtros, cores por status, e navegação
// ============================================================

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Store,
  ChevronRight,
  Search,
  Filter,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  Loader2,
  Receipt,
  Calendar,
  ArrowUpDown,
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { EmptyState } from "@/components/store/EmptyState";
import { useAuthStore } from "@/stores/auth";
import { formatCurrency } from "@/lib/utils";
import { getUserOrders } from "@/utils/server-function/orders";
import type { Order } from "@/types";

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({
    meta: [
      { title: "Meus pedidos — Terra Viva" },
      { name: "description", content: "Acompanhe todos os seus pedidos de orgânicos frescos." },
    ],
  }),
  component: OrdersPage,
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

const PAYMENT_STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  pending: { label: "Pendente", color: "var(--tv-warning)" },
  paid: { label: "Pago", color: "var(--tv-success)" },
  failed: { label: "Falhou", color: "var(--tv-danger)" },
  refunded: { label: "Reembolsado", color: "var(--tv-stone-500)" },
  cancelled: { label: "Cancelado", color: "var(--tv-danger)" },
};

/* ────────────────────────────────────────────────────────────
   ORDER CARD
   ──────────────────────────────────────────────────────────── */
function OrderCard({ order }: { order: Order }) {
  const navigate = useNavigate();
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const paymentConfig = PAYMENT_STATUS_CONFIG[order.payment_status] || PAYMENT_STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;

  const formattedDate = new Date(order.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const itemCount = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

  return (
    <div
      onClick={() => navigate({ to: `/pedido/${order.id}` })}
      style={{
        background: "var(--tv-white)",
        borderRadius: "var(--r-xl)",
        border: "1px solid var(--tv-stone-200)",
        boxShadow: "var(--shadow-sm)",
        padding: "var(--space-4)",
        cursor: "pointer",
        transition: "all var(--duration-fast) ease",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--tv-moss-lt)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--tv-stone-200)";
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "var(--space-3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "var(--r-lg)",
              background: statusConfig.bg,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <StatusIcon size={20} style={{ color: statusConfig.color }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontWeight: 700,
                fontSize: "var(--text-sm)",
                color: "var(--tv-forest)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Pedido #{order.order_number}
            </p>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)", marginTop: 2 }}>
              <Calendar size={10} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
              {formattedDate}
            </p>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              color: "var(--tv-forest)",
            }}
          >
            {formatCurrency(order.total)}
          </p>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)" }}>
            {itemCount} {itemCount === 1 ? "item" : "itens"}
          </p>
        </div>
      </div>

      {/* Status Badges */}
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: "var(--r-full)",
            background: statusConfig.bg,
            color: statusConfig.color,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <StatusIcon size={10} />
          {statusConfig.label}
        </span>
        <span
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: "var(--r-full)",
            background: "var(--tv-cream)",
            color: paymentConfig.color,
            border: "1px solid var(--tv-stone-200)",
          }}
        >
          <Receipt size={10} style={{ display: "inline", marginRight: 4 }} />
          {paymentConfig.label}
        </span>
        <span
          style={{
            fontSize: "var(--text-xs)",
            fontWeight: 500,
            padding: "4px 10px",
            borderRadius: "var(--r-full)",
            background: "var(--tv-cream)",
            color: "var(--tv-stone-500)",
            border: "1px solid var(--tv-stone-200)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {order.delivery_type === "pickup" ? <Store size={10} /> : <Truck size={10} />}
          {order.delivery_type === "pickup" ? "Retirada" : "Entrega"}
        </span>
      </div>

      {/* Items Preview */}
      {order.items && order.items.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "var(--space-2)",
            alignItems: "center",
            paddingTop: "var(--space-2)",
            borderTop: "1px solid var(--tv-stone-100)",
          }}
        >
          <div style={{ display: "flex", marginLeft: -4 }}>
            {order.items.slice(0, 3).map((item, idx) => (
              <div
                key={idx}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid var(--tv-white)",
                  marginLeft: -4,
                  flexShrink: 0,
                  background: "var(--tv-cream)",
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
            ))}
            {order.items.length > 3 && (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "2px solid var(--tv-white)",
                  marginLeft: -4,
                  flexShrink: 0,
                  background: "var(--tv-stone-100)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--tv-stone-500)",
                }}
              >
                +{order.items.length - 3}
              </div>
            )}
          </div>
          <p
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--tv-stone-400)",
              flex: 1,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {order.items.map((i) => i.product_name).join(", ")}
          </p>
          <ChevronRight size={16} style={{ color: "var(--tv-stone-300)", flexShrink: 0 }} />
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   FILTER CHIP
   ──────────────────────────────────────────────────────────── */
function FilterChip({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "var(--space-2) var(--space-3)",
        borderRadius: "var(--r-full)",
        border: active ? "none" : "1px solid var(--tv-stone-200)",
        background: active ? "var(--tv-moss)" : "var(--tv-white)",
        color: active ? "var(--tv-linen)" : "var(--tv-stone-600)",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all var(--duration-fast) ease",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {label}
      {count !== undefined && (
        <span
          style={{
            fontSize: 10,
            padding: "1px 6px",
            borderRadius: "var(--r-full)",
            background: active ? "rgba(255,255,255,0.2)" : "var(--tv-stone-100)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────
   MAIN PAGE
   ──────────────────────────────────────────────────────────── */
function OrdersPage() {
  const profile = useAuthStore((s) => s.profile);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");

  const fetchOrders = async (showRefresh = false) => {
    if (!profile?.id) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await getUserOrders({ data: { userId: profile.id } });
      if (result.success && result.orders) {
        setOrders(result.orders);
      } else {
        toast.error(result.error || "Erro ao carregar pedidos");
      }
    } catch (err) {
      console.error("[OrdersPage] Erro:", err);
      toast.error("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [profile?.id]);

  // Filter & Sort
  useEffect(() => {
    let result = [...orders];

    // Filter by status
    if (activeFilter !== "all") {
      result = result.filter((o) => o.status === activeFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (o) =>
          o.order_number?.toLowerCase().includes(q) ||
          o.items?.some((i) => i.product_name?.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "highest":
          return b.total - a.total;
        case "lowest":
          return a.total - b.total;
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredOrders(result);
  }, [orders, activeFilter, searchQuery, sortBy]);

  const filterCounts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  if (loading) {
    return (
      <PublicLayout>
        <div style={{ minHeight: "60dvh", display: "grid", placeItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <Loader2 size={40} className="animate-spin" style={{ color: "var(--tv-moss)", margin: "0 auto" }} />
            <p style={{ marginTop: "var(--space-3)", color: "var(--tv-stone-500)", fontSize: "var(--text-sm)" }}>
              Carregando seus pedidos...
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "var(--space-6) var(--space-4)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "var(--space-6)",
            flexWrap: "wrap",
            gap: "var(--space-3)",
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
              Meus pedidos
            </h1>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-400)", marginTop: "var(--space-1)" }}>
              {orders.length} {orders.length === 1 ? "pedido" : "pedidos"} no total
            </p>
          </div>
          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-3)",
              borderRadius: "var(--r-lg)",
              border: "1px solid var(--tv-stone-200)",
              background: "var(--tv-white)",
              color: "var(--tv-stone-600)",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        {orders.length === 0 ? (
          <div style={{ minHeight: "40dvh", display: "grid", placeItems: "center" }}>
            <EmptyState
              title="Nenhum pedido ainda"
              description="Que tal fazer seu primeiro pedido de produtos orgânicos frescos?"
              action={
                <Link to="/produtos" className="tv-btn tv-btn--primary" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <ShoppingBag size={16} />
                  Ver produtos
                </Link>
              }
            />
          </div>
        ) : (
          <>
            {/* Search & Sort */}
            <div
              style={{
                display: "flex",
                gap: "var(--space-3)",
                marginBottom: "var(--space-4)",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 200,
                  position: "relative",
                }}
              >
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--tv-stone-400)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Buscar por número ou produto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "var(--space-3) var(--space-3) var(--space-3) 40px",
                    borderRadius: "var(--r-xl)",
                    border: "1px solid var(--tv-stone-200)",
                    background: "var(--tv-white)",
                    fontSize: "var(--text-sm)",
                    color: "var(--tv-stone-800)",
                    outline: "none",
                  }}
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: "var(--r-xl)",
                  border: "1px solid var(--tv-stone-200)",
                  background: "var(--tv-white)",
                  fontSize: "var(--text-sm)",
                  color: "var(--tv-stone-700)",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="newest">Mais recentes</option>
                <option value="oldest">Mais antigos</option>
                <option value="highest">Maior valor</option>
                <option value="lowest">Menor valor</option>
              </select>
            </div>

            {/* Filter Chips */}
            <div
              style={{
                display: "flex",
                gap: "var(--space-2)",
                marginBottom: "var(--space-5)",
                overflowX: "auto",
                paddingBottom: "var(--space-2)",
                scrollbarWidth: "none",
              }}
            >
              <FilterChip
                label="Todos"
                active={activeFilter === "all"}
                onClick={() => setActiveFilter("all")}
                count={filterCounts.all}
              />
              <FilterChip
                label="Pendentes"
                active={activeFilter === "pending"}
                onClick={() => setActiveFilter("pending")}
                count={filterCounts.pending}
              />
              <FilterChip
                label="Confirmados"
                active={activeFilter === "confirmed"}
                onClick={() => setActiveFilter("confirmed")}
                count={filterCounts.confirmed}
              />
              <FilterChip
                label="Em preparo"
                active={activeFilter === "preparing"}
                onClick={() => setActiveFilter("preparing")}
                count={filterCounts.preparing}
              />
              <FilterChip
                label="Em entrega"
                active={activeFilter === "shipped"}
                onClick={() => setActiveFilter("shipped")}
                count={filterCounts.shipped}
              />
              <FilterChip
                label="Entregues"
                active={activeFilter === "delivered"}
                onClick={() => setActiveFilter("delivered")}
                count={filterCounts.delivered}
              />
              <FilterChip
                label="Cancelados"
                active={activeFilter === "cancelled"}
                onClick={() => setActiveFilter("cancelled")}
                count={filterCounts.cancelled}
              />
            </div>

            {/* Orders List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {filteredOrders.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "var(--space-8)",
                    color: "var(--tv-stone-400)",
                  }}
                >
                  <AlertCircle size={32} style={{ margin: "0 auto var(--space-3)", opacity: 0.5 }} />
                  <p style={{ fontSize: "var(--text-sm)" }}>Nenhum pedido encontrado com esses filtros</p>
                  <button
                    onClick={() => {
                      setActiveFilter("all");
                      setSearchQuery("");
                    }}
                    style={{
                      marginTop: "var(--space-3)",
                      fontSize: "var(--text-sm)",
                      color: "var(--tv-moss)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Limpar filtros
                  </button>
                </div>
              ) : (
                filteredOrders.map((order) => <OrderCard key={order.id} order={order} />)
              )}
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  );
}