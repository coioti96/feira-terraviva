import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Users, Search, Filter, ArrowUpDown, X, Eye, Mail, Phone, MapPin,
  ShoppingBag, DollarSign, Calendar, Star, Clock, Package, ChevronDown,
  Loader2, AlertTriangle, ArrowUpRight, User, Download, UserCheck, UserX,
  Sparkles, ShieldCheck,
} from "lucide-react";
import { fetchClients } from "@/utils/server-function/fetchClients";
import { formatCurrency, cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export const Route = createFileRoute("/_authenticated/admin/clientes")({
  head: () => ({
    meta: [{ title: "Clientes — Painel Administrativo Terra Viva" }],
  }),
  component: AdminClients,
});

// ── Types ──
interface ClientOrder {
  id: string;
  order_number: string;
  total: number;
  status: OrderStatus;
  created_at: string;
}

interface Client {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrder: string | null;
  status: "active" | "vip" | "new" | "inactive";
  orders: ClientOrder[];
}

const STATUS_CONFIG = {
  vip: { label: "VIP", color: "gold", icon: Star },
  active: { label: "Ativo", color: "moss", icon: UserCheck },
  new: { label: "Novo", color: "info", icon: Sparkles },
  inactive: { label: "Inativo", color: "stone", icon: UserX },
} as const;

const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "tv-status--pending" },
  confirmed: { label: "Confirmado", className: "tv-status--confirmed" },
  preparing: { label: "Preparando", className: "tv-status--preparing" },
  out_for_delivery: { label: "Em entrega", className: "tv-status--out_for_delivery" },
  delivered: { label: "Entregue", className: "tv-status--delivered" },
  cancelled: { label: "Cancelado", className: "tv-status--cancelled" },
  refunded: { label: "Reembolsado", className: "tv-status--refunded" },
};

const SORT_OPTIONS = [
  { key: "full_name", label: "Nome" },
  { key: "totalSpent", label: "Total gasto" },
  { key: "orderCount", label: "Pedidos" },
  { key: "created_at", label: "Cadastro" },
  { key: "lastOrder", label: "Último pedido" },
] as const;

// ── Helpers ──
function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDaysSince(date: string | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

// ── Skeleton ──
function ClientsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="tv-card p-4 flex items-center gap-4">
          <div className="tv-skeleton tv-skeleton--avatar" />
          <div className="flex-1 space-y-2">
            <div className="tv-skeleton tv-skeleton--text" style={{ width: "30%" }} />
            <div className="tv-skeleton tv-skeleton--text-sm" style={{ width: "50%" }} />
          </div>
          <div className="tv-skeleton tv-skeleton--button" style={{ width: "80px" }} />
        </div>
      ))}
    </div>
  );
}

// ── Empty State ──
function EmptyClientsState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="tv-empty py-20">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--tv-moss)]/10 mb-4">
        <Users className="h-10 w-10 text-[var(--tv-moss)]" />
      </div>
      <h3 className="font-serif text-xl text-[var(--tv-forest)]">Nenhum cliente encontrado</h3>
      <p className="mt-2 text-sm text-[var(--tv-stone-500)] max-w-sm">
        Os clientes aparecerão aqui quando se cadastrarem na plataforma. Ajuste os filtros ou aguarde novos cadastros.
      </p>
      <button onClick={onRefresh} className="tv-btn tv-btn--primary mt-6 gap-2">
        <ArrowUpRight className="h-4 w-4" /> Atualizar lista
      </button>
    </div>
  );
}

// ── Client Detail Modal ──
function ClientDetailModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const statusConfig = STATUS_CONFIG[client.status];
  const StatusIcon = statusConfig.icon;
  const daysSinceSignup = getDaysSince(client.created_at);
  const daysSinceLastOrder = getDaysSince(client.lastOrder);

  return (
    <div className="tv-modal-overlay" onClick={onClose}>
      <div className="tv-modal tv-modal--lg max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tv-modal__header">
          <div className="flex items-center gap-3">
            {client.avatar_url ? (
              <img
                src={client.avatar_url}
                alt={client.full_name || ""}
                className="h-12 w-12 rounded-full object-cover ring-2 ring-[var(--tv-moss)]/20"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-[var(--tv-moss)]/10 flex items-center justify-center ring-2 ring-[var(--tv-moss)]/20">
                <span className="text-sm font-bold text-[var(--tv-moss)]">{getInitials(client.full_name)}</span>
              </div>
            )}
            <div>
              <h3 className="tv-modal__title text-xl">{client.full_name || "Sem nome"}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={cn("tv-status",
                  client.status === "vip" && "bg-[var(--tv-gold)]/15 text-[var(--tv-gold-dk)]",
                  client.status === "active" && "tv-status--published",
                  client.status === "new" && "tv-status--confirmed",
                  client.status === "inactive" && "tv-status--draft",
                )}>
                  <StatusIcon className="h-3 w-3" />
                  {statusConfig.label}
                </span>
                {client.email && (
                  <span className="text-xs text-[var(--tv-stone-400)] flex items-center gap-1">
                    <Mail className="h-3 w-3" />{client.email}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--tv-stone-400)] hover:bg-[var(--tv-stone-100)] hover:text-[var(--tv-forest)] transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="tv-modal__body space-y-6 overflow-y-auto">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-[var(--tv-stone-200)] bg-[var(--tv-cream)] p-3">
              <p className="text-xs text-[var(--tv-stone-400)] uppercase tracking-wide">Pedidos</p>
              <p className="text-2xl font-bold text-[var(--tv-forest)] mt-0.5">{client.orderCount}</p>
            </div>
            <div className="rounded-xl border border-[var(--tv-stone-200)] bg-[var(--tv-cream)] p-3">
              <p className="text-xs text-[var(--tv-stone-400)] uppercase tracking-wide">Total gasto</p>
              <p className="text-2xl font-bold text-[var(--tv-moss)] mt-0.5">{formatCurrency(client.totalSpent)}</p>
            </div>
            <div className="rounded-xl border border-[var(--tv-stone-200)] bg-[var(--tv-cream)] p-3">
              <p className="text-xs text-[var(--tv-stone-400)] uppercase tracking-wide">Cadastro</p>
              <p className="text-lg font-bold text-[var(--tv-forest)] mt-0.5">{formatDate(client.created_at)}</p>
              {daysSinceSignup !== null && (
                <p className="text-[10px] text-[var(--tv-stone-400)]">{daysSinceSignup} dia{daysSinceSignup !== 1 ? "s" : ""}</p>
              )}
            </div>
            <div className="rounded-xl border border-[var(--tv-stone-200)] bg-[var(--tv-cream)] p-3">
              <p className="text-xs text-[var(--tv-stone-400)] uppercase tracking-wide">Último pedido</p>
              <p className="text-lg font-bold text-[var(--tv-forest)] mt-0.5">{formatDate(client.lastOrder)}</p>
              {daysSinceLastOrder !== null && (
                <p className="text-[10px] text-[var(--tv-stone-400)]">{daysSinceLastOrder} dia{daysSinceLastOrder !== 1 ? "s" : ""} atrás</p>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="rounded-2xl bg-[var(--tv-cream)] border border-[var(--tv-stone-200)] p-5">
            <h4 className="font-semibold text-[var(--tv-forest)] mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-[var(--tv-moss)]" />
              Informações de contato
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {client.phone && (
                <div className="flex items-center gap-2 text-sm text-[var(--tv-stone-600)]">
                  <Phone className="h-4 w-4 text-[var(--tv-moss)]" />
                  {client.phone}
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-sm text-[var(--tv-stone-600)]">
                  <Mail className="h-4 w-4 text-[var(--tv-moss)]" />
                  {client.email}
                </div>
              )}
              {(client.address || client.city) && (
                <div className="flex items-start gap-2 text-sm text-[var(--tv-stone-600)] sm:col-span-2">
                  <MapPin className="h-4 w-4 text-[var(--tv-moss)] flex-shrink-0 mt-0.5" />
                  <span>
                    {[client.address, client.number, client.complement, client.neighborhood, client.city, client.state, client.cep]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Order History */}
          <div>
            <h4 className="font-semibold text-[var(--tv-forest)] mb-3 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-[var(--tv-moss)]" />
              Histórico de pedidos
              <span className="text-xs font-normal text-[var(--tv-stone-400)]">({client.orderCount})</span>
            </h4>
            {client.orders.length === 0 ? (
              <div className="text-center py-8 rounded-2xl bg-[var(--tv-cream)] border border-dashed border-[var(--tv-stone-200)]">
                <Package className="h-8 w-8 text-[var(--tv-stone-300)] mx-auto mb-2" />
                <p className="text-sm text-[var(--tv-stone-500)]">Nenhum pedido realizado ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {client.orders.map((order) => {
                  const statusCfg = ORDER_STATUS_CONFIG[order.status];
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--tv-white)] border border-[var(--tv-stone-100)] hover:border-[var(--tv-moss-lt)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-[var(--tv-moss)]/10 flex items-center justify-center">
                          <Package className="h-5 w-5 text-[var(--tv-moss)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--tv-forest)]">{order.order_number}</p>
                          <p className="text-xs text-[var(--tv-stone-400)] flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDateTime(order.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[var(--tv-moss)]">{formatCurrency(order.total)}</p>
                        <span className={cn("tv-status text-[10px]", statusCfg.className)}>{statusCfg.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="tv-modal__footer">
          <button onClick={onClose} className="tv-btn tv-btn--secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [minSpend, setMinSpend] = useState<number>(0);
  const [maxSpend, setMaxSpend] = useState<number>(999999);
  const [showFilters, setShowFilters] = useState(false);

  // Sort
  const [sortKey, setSortKey] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Detail modal
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchClients({
        data: {
          search: searchQuery,
          status: statusFilter as "all" | "active" | "vip" | "new" | "inactive",
          minSpend,
          maxSpend,
        },
      });

      if (result.success) {
        setClients(result.clients as Client[]);
      } else {
        setError(result.error || "Erro ao carregar clientes");
        toast.error(result.error || "Erro ao carregar clientes");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar clientes";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, minSpend, maxSpend]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Client-side sort (server already filtered)
  const sortedClients = useMemo(() => {
    const result = [...clients];
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "full_name":
          comparison = (a.full_name || "").localeCompare(b.full_name || "");
          break;
        case "totalSpent":
          comparison = a.totalSpent - b.totalSpent;
          break;
        case "orderCount":
          comparison = a.orderCount - b.orderCount;
          break;
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "lastOrder":
          const aLast = a.lastOrder ? new Date(a.lastOrder).getTime() : 0;
          const bLast = b.lastOrder ? new Date(b.lastOrder).getTime() : 0;
          comparison = aLast - bLast;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    return result;
  }, [clients, sortKey, sortOrder]);

  // Stats
  const stats = useMemo(() => {
    const total = clients.length;
    const vip = clients.filter((c) => c.status === "vip").length;
    const active = clients.filter((c) => c.status === "active").length;
    const newClients = clients.filter((c) => c.status === "new").length;
    const inactive = clients.filter((c) => c.status === "inactive").length;
    const totalRevenue = clients.reduce((sum, c) => sum + c.totalSpent, 0);
    const totalOrders = clients.reduce((sum, c) => sum + c.orderCount, 0);
    return { total, vip, active, newClients, inactive, totalRevenue, totalOrders };
  }, [clients]);

  const toggleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  }, [sortKey]);

  const handleExport = useCallback(() => {
    const csv = [
      ["Nome", "Email", "Telefone", "Status", "Pedidos", "Total Gasto", "Cidade", "Cadastro"].join(";"),
      ...sortedClients.map((c) =>
        [
          c.full_name || "",
          c.email || "",
          c.phone || "",
          STATUS_CONFIG[c.status].label,
          c.orderCount,
          c.totalSpent.toFixed(2).replace(".", ","),
          c.city || "",
          formatDate(c.created_at),
        ].join(";")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clientes-terra-viva-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Lista exportada com sucesso!");
  }, [sortedClients]);

  if (isLoading && clients.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="tv-skeleton tv-skeleton--text" style={{ width: "200px", height: "36px" }} />
            <div className="tv-skeleton tv-skeleton--text-sm" style={{ width: "300px" }} />
          </div>
          <div className="tv-skeleton tv-skeleton--button" />
        </div>
        <ClientsSkeleton />
      </div>
    );
  }

  if (error && clients.length === 0) {
    return (
      <div className="tv-empty py-20">
        <AlertTriangle className="h-10 w-10 text-[var(--tv-terracota)] mb-3" />
        <h3 className="font-serif text-xl text-[var(--tv-forest)]">Erro ao carregar clientes</h3>
        <p className="mt-2 text-sm text-[var(--tv-stone-500)]">{error}</p>
        <button onClick={loadClients} className="tv-btn tv-btn--primary mt-4 gap-2">
          <ArrowUpRight className="h-4 w-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[var(--tv-forest)]">Clientes</h1>
          <p className="mt-1 text-sm text-[var(--tv-stone-500)]">
            {stats.total} cliente{stats.total !== 1 ? "s" : ""} cadastrado{stats.total !== 1 ? "s" : ""}
            {stats.total > 0 && (
              <span className="text-[var(--tv-stone-400)]">
                {" "}· {stats.totalOrders} pedido{stats.totalOrders !== 1 ? "s" : ""} · {formatCurrency(stats.totalRevenue)} em vendas
              </span>
            )}
          </p>
        </div>
        <button onClick={handleExport} className="tv-btn tv-btn--secondary gap-2 self-start sm:self-auto">
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total, color: "forest" as const },
          { label: "VIP", value: stats.vip, color: "gold" as const },
          { label: "Ativos", value: stats.active, color: "moss" as const },
          { label: "Novos", value: stats.newClients, color: "info" as const },
          { label: "Inativos", value: stats.inactive, color: "stone" as const },
          { label: "Pedidos", value: stats.totalOrders, color: "terracotta" as const },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[var(--tv-stone-200)] bg-white p-3 transition-all hover:shadow-md"
          >
            <p className="text-xs text-[var(--tv-stone-400)] uppercase tracking-wide">{stat.label}</p>
            <p
              className={cn(
                "text-2xl font-bold mt-0.5",
                stat.color === "forest" && "text-[var(--tv-forest)]",
                stat.color === "moss" && "text-[var(--tv-moss)]",
                stat.color === "terracotta" && "text-[var(--tv-terracota)]",
                stat.color === "gold" && "text-[var(--tv-gold)]",
                stat.color === "info" && "text-[var(--tv-info)]",
                stat.color === "stone" && "text-[var(--tv-stone-500)]",
              )}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--tv-stone-400)] pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, email, telefone, cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tv-input pl-10 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tv-stone-400)] hover:text-[var(--tv-stone-600)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={cn(
            "tv-btn tv-btn--secondary tv-btn--sm gap-1.5",
            showFilters && "border-[var(--tv-moss-lt)] text-[var(--tv-moss)]",
          )}
        >
          <Filter className="h-3.5 w-3.5" /> Filtros
          {(statusFilter !== "all" || minSpend > 0 || maxSpend < 999999) && (
            <span className="h-2 w-2 rounded-full bg-[var(--tv-moss)]" />
          )}
        </button>
        <div className="relative">
          <select
            value={`${sortKey}-${sortOrder}`}
            onChange={(e) => {
              const [key, order] = e.target.value.split("-");
              setSortKey(key);
              setSortOrder(order as "asc" | "desc");
            }}
            className="tv-input tv-input--sm appearance-none pr-8 cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={`${opt.key}-asc`} value={`${opt.key}-asc`}>
                {opt.label} ↑
              </option>
            ))}
            {SORT_OPTIONS.map((opt) => (
              <option key={`${opt.key}-desc`} value={`${opt.key}-desc`}>
                {opt.label} ↓
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--tv-stone-400)] pointer-events-none" />
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[var(--tv-cream)] border border-[var(--tv-stone-200)] animate-fade-in">
          <div>
            <label className="tv-label tv-label--sm">Status do cliente</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="tv-input tv-input--sm mt-1"
            >
              <option value="all">Todos</option>
              <option value="vip">VIP</option>
              <option value="active">Ativo</option>
              <option value="new">Novo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
          <div>
            <label className="tv-label tv-label--sm">Gasto mínimo (R$)</label>
            <input
              type="number"
              min={0}
              value={minSpend}
              onChange={(e) => setMinSpend(Number(e.target.value))}
              className="tv-input tv-input--sm mt-1"
            />
          </div>
          <div>
            <label className="tv-label tv-label--sm">Gasto máximo (R$)</label>
            <input
              type="number"
              min={0}
              value={maxSpend}
              onChange={(e) => setMaxSpend(Number(e.target.value))}
              className="tv-input tv-input--sm mt-1"
            />
          </div>
        </div>
      )}

      {/* Results count */}
      {sortedClients.length !== clients.length && (
        <p className="text-xs text-[var(--tv-stone-400)]">
          Mostrando {sortedClients.length} de {clients.length} clientes
          {searchQuery && <span> para &quot;{searchQuery}&quot;</span>}
        </p>
      )}

      {/* Clients List */}
      {sortedClients.length === 0 ? (
        <EmptyClientsState onRefresh={loadClients} />
      ) : (
        <div className="tv-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tv-table w-full">
              <thead>
                <tr>
                  <th className="cursor-pointer" onClick={() => toggleSort("full_name")}>
                    <span className="tv-table__sort">
                      Cliente
                      <ArrowUpDown className="h-3 w-3 tv-table__sort-icon" />
                    </span>
                  </th>
                  <th className="cursor-pointer" onClick={() => toggleSort("totalSpent")}>
                    <span className="tv-table__sort">
                      Total gasto
                      <ArrowUpDown className="h-3 w-3 tv-table__sort-icon" />
                    </span>
                  </th>
                  <th className="cursor-pointer" onClick={() => toggleSort("orderCount")}>
                    <span className="tv-table__sort">
                      Pedidos
                      <ArrowUpDown className="h-3 w-3 tv-table__sort-icon" />
                    </span>
                  </th>
                  <th>Status</th>
                  <th className="cursor-pointer" onClick={() => toggleSort("lastOrder")}>
                    <span className="tv-table__sort">
                      Último pedido
                      <ArrowUpDown className="h-3 w-3 tv-table__sort-icon" />
                    </span>
                  </th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedClients.map((client) => {
                  const statusCfg = STATUS_CONFIG[client.status];
                  const StatusIcon = statusCfg.icon;
                  const daysSince = getDaysSince(client.lastOrder);

                  return (
                    <tr
                      key={client.id}
                      className="group cursor-pointer hover:bg-[var(--tv-cream)] transition-colors"
                      onClick={() => setSelectedClient(client)}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          {client.avatar_url ? (
                            <img
                              src={client.avatar_url}
                              alt={client.full_name || ""}
                              className="h-10 w-10 rounded-full object-cover ring-2 ring-[var(--tv-stone-100)] flex-shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-[var(--tv-moss)]/10 flex items-center justify-center ring-2 ring-[var(--tv-stone-100)] flex-shrink-0">
                              <span className="text-xs font-bold text-[var(--tv-moss)]">
                                {getInitials(client.full_name)}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--tv-forest)] truncate">
                              {client.full_name || "Sem nome"}
                            </p>
                            <p className="text-xs text-[var(--tv-stone-400)] truncate">
                              {client.email || "Sem email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="text-sm font-semibold text-[var(--tv-moss)]">
                          {formatCurrency(client.totalSpent)}
                        </p>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <ShoppingBag className="h-3.5 w-3.5 text-[var(--tv-stone-400)]" />
                          <span className="text-sm text-[var(--tv-stone-700)]">{client.orderCount}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={cn(
                            "tv-status",
                            client.status === "vip" && "bg-[var(--tv-gold)]/15 text-[var(--tv-gold-dk)]",
                            client.status === "active" && "tv-status--published",
                            client.status === "new" && "tv-status--confirmed",
                            client.status === "inactive" && "tv-status--draft",
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusCfg.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[var(--tv-stone-400)]" />
                          <span className="text-sm text-[var(--tv-stone-700)]">
                            {daysSince !== null ? `${daysSince}d` : "—"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClient(client);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--tv-stone-500)] hover:bg-[var(--tv-moss)]/10 hover:text-[var(--tv-moss)] transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedClient && (
        <ClientDetailModal client={selectedClient} onClose={() => setSelectedClient(null)} />
      )}
    </div>
  );
}