import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import {
  ShoppingBag,
  TrendingUp,
  Users,
  DollarSign,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Leaf,
  Loader2,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { useAuthStore } from "@/stores/auth";
import {
  formatCurrency,
  formatDateShort,
  formatDateTime,
  getInitials,
} from "@/lib/utils";
import type { Order, Product, DashboardStats, ProductUnit } from "@/types";
import {
  getDashboardStats,
  getRecentOrders,
  getLowStockProducts,
} from "@/utils/server-function/admin.function";

/* ═══════════════════════════════════════════════════════════════
   ADMIN DASHBOARD — Terra Viva
   Coração do painel administrativo. Enterprise-grade.
   ═══════════════════════════════════════════════════════════════ */

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Painel Administrativo — Terra Viva" },
      { name: "description", content: "Dashboard administrativo da Feirinha Orgânica Terra Viva." },
    ],
  }),
  component: AdminDashboard,
});

/* ── Loading State ─────────────────────────────────────────── */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-48 rounded-lg bg-stone-200" />
        <div className="h-4 w-64 rounded-lg bg-stone-200" />
      </div>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-stone-100 border border-stone-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-stone-200" />
              <div className="h-3 w-20 rounded bg-stone-200" />
            </div>
            <div className="h-8 w-24 rounded-lg bg-stone-200" />
            <div className="h-3 w-16 rounded bg-stone-200" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl bg-stone-100 border border-stone-200 p-4 h-72" />
        <div className="rounded-2xl bg-stone-100 border border-stone-200 p-4 h-72" />
      </div>
      <div className="rounded-2xl bg-stone-100 border border-stone-200 p-4 h-80" />
    </div>
  );
}

/* ── Empty State ───────────────────────────────────────────── */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--tv-moss)]/10">
        <Icon className="h-8 w-8 text-[var(--tv-moss)]" />
      </div>
      <h3 className="font-serif text-lg text-[var(--tv-forest)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--tv-stone-500)] max-w-xs">{description}</p>
      {action && (
        <Link
          to={action.to}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--tv-forest)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--tv-moss)] hover:shadow-lg"
        >
          {action.label}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/* ── Stat Card ─────────────────────────────────────────────── */
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  trend?: { value: number; label: string };
  color: "forest" | "gold" | "moss" | "terracotta";
  delay?: number;
}

const COLOR_MAP = {
  forest: { bg: "bg-[var(--tv-forest)]/10", icon: "text-[var(--tv-forest)]", border: "border-[var(--tv-forest)]/20" },
  gold: { bg: "bg-[var(--tv-gold)]/10", icon: "text-[var(--tv-gold)]", border: "border-[var(--tv-gold)]/20" },
  moss: { bg: "bg-[var(--tv-moss)]/10", icon: "text-[var(--tv-moss)]", border: "border-[var(--tv-moss)]/20" },
  terracotta: { bg: "bg-[var(--tv-terracotta)]/10", icon: "text-[var(--tv-terracotta)]", border: "border-[var(--tv-terracotta)]/20" },
};

function StatCard({ icon: Icon, label, value, trend, color, delay = 0 }: StatCardProps) {
  const colors = COLOR_MAP[color];
  const TrendIcon = trend && trend.value >= 0 ? ArrowUpRight : ArrowDownRight;
  const trendColor = trend && trend.value >= 0 ? "text-emerald-600" : "text-red-500";

  return (
    <div
      className={`tv-stat-card group relative overflow-hidden rounded-2xl border ${colors.border} bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${colors.bg}`}>
          <Icon className={`h-4 w-4 ${colors.icon}`} />
        </div>
        <span className="text-xs font-medium text-[var(--tv-stone-500)] uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="mt-3">
        <div className="font-serif text-2xl text-[var(--tv-forest)]">{value}</div>
        {trend && (
          <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span>{Math.abs(trend.value)}% {trend.label}</span>
          </div>
        )}
      </div>
      {/* Decorative leaf watermark */}
      <Leaf className="absolute -bottom-2 -right-2 h-16 w-16 text-[var(--tv-linen)] opacity-30 rotate-12 group-hover:rotate-45 transition-transform duration-500" />
    </div>
  );
}

/* ── Status Badge ──────────────────────────────────────────── */
function OrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: "Pendente", className: "tv-status--pending" },
    confirmed: { label: "Confirmado", className: "tv-status--confirmed" },
    preparing: { label: "Preparando", className: "tv-status--preparing" },
    shipped: { label: "Enviado", className: "tv-status--shipped" },
    delivered: { label: "Entregue", className: "tv-status--delivered" },
    cancelled: { label: "Cancelado", className: "tv-status--cancelled" },
    refunded: { label: "Reembolsado", className: "tv-status--refunded" },
  };
  const c = config[status] || { label: status, className: "tv-status--pending" };
  return <span className={`tv-badge ${c.className}`}>{c.label}</span>;
}

/* ── Payment Status Badge ──────────────────────────────────── */
function PaymentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: "Aguardando", className: "tv-status--pending" },
    paid: { label: "Pago", className: "tv-status--paid" },
    failed: { label: "Falhou", className: "tv-status--failed" },
    refunded: { label: "Reembolsado", className: "tv-status--refunded" },
  };
  const c = config[status] || { label: status, className: "tv-status--pending" };
  return <span className={`tv-badge ${c.className}`}>{c.label}</span>;
}

/* ── Custom Chart Tooltip ──────────────────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--tv-stone-200)] bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-[var(--tv-stone-500)]">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold text-[var(--tv-forest)]">
          {p.name === "receita" ? formatCurrency(p.value) : `${p.value} pedidos`}
        </p>
      ))}
    </div>
  );
}

/* ── Helper: Calcula estoque total do StockMap ─────────────── */
function getTotalStock(stock: Record<ProductUnit, number> | undefined): number {
  if (!stock) return 0;
  return Object.values(stock).reduce<number>((sum, val) => sum + (val || 0), 0);
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

function AdminDashboard() {
  const { profile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  /* ── Fetch Dashboard Data ──────────────────────────────── */
  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, ordersData, productsData] = await Promise.all([
        getDashboardStats(),
        getRecentOrders(),
        getLowStockProducts(),
      ]);
      setStats(statsData);
      setRecentOrders(ordersData);
      setLowStockProducts(productsData);
    } catch (err) {
      console.error("[Dashboard] Erro ao carregar dados:", err);
      setError(err instanceof Error ? err.message : "Erro ao carregar dados do dashboard");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ── Derived Data ────────────────────────────────────────── */
  const greeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const chartData = stats?.sales_chart || [];

  /* ── Render ──────────────────────────────────────────────── */
  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <XCircle className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="font-serif text-lg text-[var(--tv-forest)]">Erro ao carregar</h3>
        <p className="mt-1 text-sm text-[var(--tv-stone-500)] max-w-sm">{error}</p>
        <button
          onClick={loadDashboard}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--tv-forest)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--tv-moss)] hover:shadow-lg"
        >
          <Loader2 className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "Administrador";

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[var(--tv-forest)]">
            {greeting()}, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-[var(--tv-stone-500)]">
            Aqui está o panorama da sua feirinha hoje,{" "}
            <span className="font-medium text-[var(--tv-moss)]">
              {formatDateShort(new Date())}
            </span>
            .
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--tv-stone-400)]">
          <Clock className="h-3.5 w-3.5" />
          <span>Atualizado às {formatDateTime(new Date()).split(" ")[1]}</span>
        </div>
      </div>

      {/* ── Stats Cards ────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ShoppingBag}
          label="Pedidos hoje"
          value={String(stats?.orders_today ?? 0)}
          trend={stats?.orders_trend}
          color="forest"
          delay={0}
        />
        <StatCard
          icon={DollarSign}
          label="Faturamento hoje"
          value={formatCurrency(stats?.revenue_today ?? 0)}
          trend={stats?.revenue_trend}
          color="gold"
          delay={100}
        />
        <StatCard
          icon={Receipt}
          label="Ticket médio"
          value={formatCurrency(stats?.average_ticket ?? 0)}
          trend={stats?.ticket_trend}
          color="moss"
          delay={200}
        />
        <StatCard
          icon={Users}
          label="Clientes novos"
          value={String(stats?.new_customers_today ?? 0)}
          trend={stats?.customers_trend}
          color="terracotta"
          delay={300}
        />
      </div>

      {/* ── Charts & Alerts Row ────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sales Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-[var(--tv-stone-200)] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg text-[var(--tv-forest)]">Vendas nos últimos 7 dias</h3>
              <p className="text-xs text-[var(--tv-stone-500)]">Receita e volume de pedidos</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--tv-forest)]" />
                <span className="text-[var(--tv-stone-500)]">Receita</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[var(--tv-gold)]" />
                <span className="text-[var(--tv-stone-500)]">Pedidos</span>
              </div>
            </div>
          </div>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--tv-forest)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--tv-forest)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--tv-stone-200)" opacity={0.5} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: "var(--tv-stone-500)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: "var(--tv-stone-500)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11, fill: "var(--tv-stone-500)" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--tv-forest)"
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                    name="receita"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    stroke="var(--tv-gold)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--tv-gold)", strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: "var(--tv-gold)", stroke: "white", strokeWidth: 2 }}
                    name="pedidos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="Sem dados de vendas"
                description="Os dados de vendas aparecerão aqui assim que houver pedidos."
              />
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="rounded-2xl border border-[var(--tv-stone-200)] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--tv-terracotta)]/10">
              <AlertTriangle className="h-4 w-4 text-[var(--tv-terracotta)]" />
            </div>
            <div>
              <h3 className="font-serif text-base text-[var(--tv-forest)]">Estoque baixo</h3>
              <p className="text-xs text-[var(--tv-stone-500)]">
                {lowStockProducts.length} produto{lowStockProducts.length !== 1 ? "s" : ""} precisa{lowStockProducts.length !== 1 ? "m" : ""} atenção
              </p>
            </div>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
              <p className="text-sm font-medium text-[var(--tv-forest)]">Tudo em ordem!</p>
              <p className="text-xs text-[var(--tv-stone-500)] mt-0.5">
                Nenhum produto com estoque crítico.
              </p>
            </div>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {lowStockProducts.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center gap-3 rounded-xl bg-[var(--tv-linen)]/50 p-2.5 transition-colors hover:bg-[var(--tv-linen)]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-[var(--tv-stone-200)] overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="h-5 w-5 text-[var(--tv-stone-300)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--tv-forest)]">
                      {product.name}
                    </p>
                    <p className="text-xs text-[var(--tv-stone-500)]">
                      Estoque: <span className="font-semibold text-[var(--tv-terracotta)]">{getTotalStock(product.stock)}</span> unidades
                    </p>
                  </div>
                  <Link
                    to="/admin/produtos"
                    className="shrink-0 rounded-lg p-1.5 text-[var(--tv-stone-400)] transition-colors hover:bg-[var(--tv-stone-100)] hover:text-[var(--tv-forest)]"
                    title="Gerenciar produtos"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Recent Orders ──────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--tv-stone-200)] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-serif text-lg text-[var(--tv-forest)]">Últimos pedidos</h3>
            <p className="text-xs text-[var(--tv-stone-500)]">
              {recentOrders.length > 0
                ? `Mostrando os ${recentOrders.length} pedidos mais recentes`
                : "Nenhum pedido ainda"}
            </p>
          </div>
          <Link
            to="/admin/pedidos"
            className="inline-flex items-center gap-1 rounded-xl bg-[var(--tv-linen)] px-3 py-1.5 text-xs font-medium text-[var(--tv-forest)] transition-all hover:bg-[var(--tv-moss)]/20"
          >
            Ver todos
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Nenhum pedido ainda"
            description="Os pedidos dos clientes aparecerão aqui automaticamente assim que forem realizados."
            action={{ label: "Ver produtos", to: "/admin/produtos" }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="tv-table w-full">
              <thead>
                <tr>
                  <th className="text-left">Pedido</th>
                  <th className="text-left hidden sm:table-cell">Cliente</th>
                  <th className="text-left hidden md:table-cell">Data</th>
                  <th className="text-center">Status</th>
                  <th className="text-center hidden sm:table-cell">Pagamento</th>
                  <th className="text-right">Total</th>
                  <th className="text-right w-10"></th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="group">
                    <td>
                      <span className="font-medium text-[var(--tv-forest)]">
                        {order.order_number}
                      </span>
                      <div className="text-xs text-[var(--tv-stone-400)] mt-0.5">
                        {order.delivery_type === "delivery" ? "Entrega" : "Retirada"}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--tv-moss)]/10 text-xs font-medium text-[var(--tv-moss)]">
                          {getInitials(order.user_name || "Cliente")}
                        </div>
                        <span className="text-sm text-[var(--tv-stone-700)] truncate max-w-[120px]">
                          {order.user_name || "Cliente"}
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell text-sm text-[var(--tv-stone-500)]">
                      {formatDateShort(order.created_at)}
                      <div className="text-xs text-[var(--tv-stone-400)]">
                        {formatDateTime(order.created_at).split(" ")[1]}
                      </div>
                    </td>
                    <td className="text-center">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="text-center hidden sm:table-cell">
                      <PaymentStatusBadge status={order.payment_status || "pending"} />
                    </td>
                    <td className="text-right font-medium text-[var(--tv-forest)]">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="text-right">
                      <span className="inline-flex rounded-lg p-1.5 text-[var(--tv-stone-400)] opacity-0 transition-all group-hover:opacity-100 hover:bg-[var(--tv-stone-100)] hover:text-[var(--tv-forest)] cursor-pointer">
                        <ChevronRight className="h-4 w-4" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Quick Actions Footer ───────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { icon: Package, label: "Novo produto", to: "/admin/produtos" },
          { icon: ShoppingBag, label: "Ver pedidos", to: "/admin/pedidos" },
          { icon: Users, label: "Clientes", to: "/admin/clientes" },
          { icon: TrendingUp, label: "Relatórios", to: "/admin/relatorios" },
        ].map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="flex items-center gap-3 rounded-xl border border-[var(--tv-stone-200)] bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--tv-moss)]/30"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--tv-linen)]">
              <action.icon className="h-4 w-4 text-[var(--tv-moss)]" />
            </div>
            <span className="text-sm font-medium text-[var(--tv-forest)]">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}