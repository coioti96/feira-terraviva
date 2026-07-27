import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Search, Filter, ArrowUpDown, Eye, Package, CheckCircle2, ChefHat, Truck, Home,
  XCircle, RotateCcw, Download, Calendar, Phone, MapPin, CreditCard, Banknote,
  Receipt, Clock, ChevronDown, X, Loader2, AlertTriangle, ArrowRight, User,
  Hash, ShoppingBag, TrendingUp, TrendingDown, DollarSign, Truck as TruckIcon,
  Ban, CheckCheck, ClipboardList, ChevronRight, Copy, Wallet, CircleDollarSign
} from "lucide-react";
import { useAdminOrdersStore } from "@/stores/orders";
import { useAuthStore } from "@/stores/auth";
import {
  formatCurrency, formatDateTime, formatDateShort, formatDateRelative,
  formatPhone, cn, capitalize
} from "@/lib/utils";
import type { Order, OrderStatus, OrderStatusHistory, PaymentStatus } from "@/types";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  head: () => ({
    meta: [{ title: "Pedidos — Painel Administrativo Terra Viva" }],
  }),
  component: AdminOrders,
});

/* ────────────────────────────────────────────────────────────
   STATUS CONFIG
   ──────────────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  color: string;
  bg: string;
  dot: string;
  icon: React.ElementType;
  next: OrderStatus | null;
  actionLabel: string;
}> = {
  pending: {
    label: "Pendente",
    color: "text-[var(--tv-terracota-dk)]",
    bg: "bg-[var(--tv-warning-lt)]",
    dot: "bg-[var(--tv-terracota)]",
    icon: Clock,
    next: "confirmed",
    actionLabel: "Confirmar",
  },
  confirmed: {
    label: "Confirmado",
    color: "text-[var(--tv-info)]",
    bg: "bg-[var(--tv-info-lt)]",
    dot: "bg-[var(--tv-info)]",
    icon: CheckCircle2,
    next: "preparing",
    actionLabel: "Iniciar preparo",
  },
  preparing: {
    label: "Em preparo",
    color: "text-[var(--tv-success)]",
    bg: "bg-[var(--tv-success-lt)]",
    dot: "bg-[var(--tv-success)]",
    icon: ChefHat,
    next: "out_for_delivery",
    actionLabel: "Saiu para entrega",
  },
  out_for_delivery: {
    label: "Saiu para entrega",
    color: "text-[var(--tv-info)]",
    bg: "bg-[var(--tv-info-lt)]",
    dot: "bg-[var(--tv-info)]",
    icon: Truck,
    next: "delivered",
    actionLabel: "Marcar entregue",
  },
  delivered: {
    label: "Entregue",
    color: "text-[var(--tv-success)]",
    bg: "bg-[var(--tv-success-lt)]",
    dot: "bg-[var(--tv-success)]",
    icon: Home,
    next: null,
    actionLabel: "",
  },
  cancelled: {
    label: "Cancelado",
    color: "text-[var(--tv-danger)]",
    bg: "bg-[var(--tv-danger-lt)]",
    dot: "bg-[var(--tv-danger)]",
    icon: Ban,
    next: null,
    actionLabel: "",
  },
  refunded: {
    label: "Reembolsado",
    color: "text-[var(--tv-danger)]",
    bg: "bg-[var(--tv-danger-lt)]",
    dot: "bg-[var(--tv-danger)]",
    icon: RotateCcw,
    next: null,
    actionLabel: "",
  },
};

const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, {
  label: string;
  color: string;
  bg: string;
  dot: string;
}> = {
  pending: { label: "Pendente", color: "text-[var(--tv-terracota-dk)]", bg: "bg-[var(--tv-warning-lt)]", dot: "bg-[var(--tv-terracota)]" },
  paid: { label: "Pago", color: "text-[var(--tv-success)]", bg: "bg-[var(--tv-success-lt)]", dot: "bg-[var(--tv-success)]" },
  failed: { label: "Falhou", color: "text-[var(--tv-danger)]", bg: "bg-[var(--tv-danger-lt)]", dot: "bg-[var(--tv-danger)]" },
  refunded: { label: "Reembolsado", color: "text-[var(--tv-danger)]", bg: "bg-[var(--tv-danger-lt)]", dot: "bg-[var(--tv-danger)]" },
  cancelled: { label: "Cancelado", color: "text-[var(--tv-stone-400)]", bg: "bg-[var(--tv-stone-100)]", dot: "bg-[var(--tv-stone-400)]" },
};

const PAYMENT_ICONS: Record<string, React.ElementType> = {
  pix: CreditCard,
  cash: Banknote,
  card: CreditCard,
  mercado_pago: CreditCard,
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  cash: "Dinheiro",
  card: "Cartão na entrega",
  mercado_pago: "Mercado Pago",
};

/* ────────────────────────────────────────────────────────────
   TYPES
   ──────────────────────────────────────────────────────────── */
type PeriodFilter = "today" | "yesterday" | "week" | "all";
type SortKey = "created_at" | "total" | "status" | "order_number";

/* ────────────────────────────────────────────────────────────
   PROFILE HELPER TYPE
   ──────────────────────────────────────────────────────────── */
interface OrderWithProfile extends Order {
  profile?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  } | null;
}

/* ────────────────────────────────────────────────────────────
   SKELETON
   ──────────────────────────────────────────────────────────── */
function OrdersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[var(--tv-stone-200)] bg-white p-4">
            <div className="tv-skeleton tv-skeleton--text" style={{ width: "60%" }} />
            <div className="tv-skeleton tv-skeleton--text-lg mt-2" style={{ width: "40%" }} />
          </div>
        ))}
      </div>
      <div className="tv-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tv-table w-full">
            <thead><tr>{Array.from({ length: 7 }).map((_, i) => (
              <th key={i}><div className="tv-skeleton tv-skeleton--text" style={{ width: `${50 + i * 8}%` }} /></th>
            ))}</tr></thead>
            <tbody>{Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td><div className="flex items-center gap-3"><div className="tv-skeleton tv-skeleton--avatar" /><div className="flex-1 space-y-1"><div className="tv-skeleton tv-skeleton--text" /><div className="tv-skeleton tv-skeleton--text-sm" /></div></div></td>
                {Array.from({ length: 5 }).map((_, j) => (
                  <td key={j}><div className="tv-skeleton tv-skeleton--text" style={{ width: `${50 + j * 10}%` }} /></td>
                ))}
                <td><div className="tv-skeleton tv-skeleton--button" /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   EMPTY STATE
   ──────────────────────────────────────────────────────────── */
function EmptyOrdersState({ period }: { period: PeriodFilter }) {
  const labels: Record<PeriodFilter, string> = {
    today: "Nenhum pedido hoje",
    yesterday: "Nenhum pedido ontem",
    week: "Nenhum pedido nos últimos 7 dias",
    all: "Nenhum pedido ainda",
  };
  return (
    <div className="tv-empty py-16">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--tv-moss)]/10 mb-4">
        <ClipboardList className="h-10 w-10 text-[var(--tv-moss)]" />
      </div>
      <h3 className="font-serif text-xl text-[var(--tv-forest)]">{labels[period]}</h3>
      <p className="mt-2 text-sm text-[var(--tv-stone-500)] max-w-sm">
        {period === "today"
          ? "Os pedidos do dia aparecerão aqui assim que os clientes começarem a comprar."
          : "Ajuste os filtros para ver pedidos de outros períodos."}
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   ORDER DETAIL MODAL
   ──────────────────────────────────────────────────────────── */
function OrderDetailModal({
  order,
  onClose,
  onUpdateStatus,
  onUpdatePayment,
  onCancel,
  isUpdating,
  adminId,
  adminName,
}: {
  order: OrderWithProfile;
  onClose: () => void;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
  onUpdatePayment: (id: string, status: PaymentStatus) => void;
  onCancel: (id: string, reason?: string) => void;
  isUpdating: boolean;
  adminId: string;
  adminName: string;
}) {
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [showPaymentActions, setShowPaymentActions] = useState(false);
  const config = STATUS_CONFIG[order.status];
  const nextStatus = config.next;
  const paymentConfig = PAYMENT_STATUS_CONFIG[order.payment_status];

  const customerName = order.profile?.full_name || "Cliente não identificado";
  const customerEmail = order.profile?.email || "";
  const customerPhone = order.profile?.phone || "";

  const statusFlow: { status: OrderStatus; label: string; active: boolean; completed: boolean }[] = [
    { status: "pending", label: "Recebido", active: order.status === "pending", completed: !["pending"].includes(order.status) && order.status !== "cancelled" && order.status !== "refunded" },
    { status: "confirmed", label: "Confirmado", active: order.status === "confirmed", completed: !["pending", "confirmed"].includes(order.status) && order.status !== "cancelled" && order.status !== "refunded" },
    { status: "preparing", label: "Preparo", active: order.status === "preparing", completed: !["pending", "confirmed", "preparing"].includes(order.status) && order.status !== "cancelled" && order.status !== "refunded" },
    { status: "out_for_delivery", label: "Entrega", active: order.status === "out_for_delivery", completed: order.status === "delivered" },
    { status: "delivered", label: "Entregue", active: order.status === "delivered", completed: false },
  ];

  const PaymentIcon = PAYMENT_ICONS[order.payment_method] || CreditCard;

  return (
    <div className="tv-modal-overlay" onClick={onClose}>
      <div className="tv-modal tv-modal--lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tv-modal__header">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--tv-moss)]/10 flex items-center justify-center">
              <Receipt className="h-5 w-5 text-[var(--tv-moss)]" />
            </div>
            <div>
              <h3 className="tv-modal__title text-lg">{order.order_number}</h3>
              <p className="text-xs text-[var(--tv-stone-400)]">
                {formatDateTime(order.created_at)} · {order.items?.length ?? 0} itens
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-[var(--tv-stone-400)] hover:bg-[var(--tv-stone-100)] transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="tv-modal__body space-y-6">
          {/* Status Timeline */}
          {order.status !== "cancelled" && order.status !== "refunded" && (
            <div>
              <h4 className="text-sm font-semibold text-[var(--tv-stone-700)] mb-3">Status do pedido</h4>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {statusFlow.map((step, idx) => (
                  <div key={step.status} className="flex items-center gap-1 flex-shrink-0">
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                      step.active && "bg-[var(--tv-moss)] text-white",
                      step.completed && "bg-[var(--tv-success-lt)] text-[var(--tv-success)]",
                      !step.active && !step.completed && "bg-[var(--tv-stone-100)] text-[var(--tv-stone-400)]"
                    )}>
                      {step.completed ? <CheckCheck className="h-3 w-3" /> : step.active ? <Clock className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border-2 border-current" />}
                      {step.label}
                    </div>
                    {idx < statusFlow.length - 1 && (
                      <ChevronRight className={cn("h-3.5 w-3.5 flex-shrink-0", step.completed ? "text-[var(--tv-success)]" : "text-[var(--tv-stone-300)]")} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Client Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-[var(--tv-cream)] border border-[var(--tv-stone-200)] p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--tv-stone-500)] mb-3">Cliente</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3.5 w-3.5 text-[var(--tv-stone-400)]" />
                  <span className="text-[var(--tv-stone-800)] font-medium">{customerName}</span>
                </div>
                {customerEmail && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[var(--tv-stone-400)] text-xs">@</span>
                    <span className="text-[var(--tv-stone-600)] text-xs">{customerEmail}</span>
                  </div>
                )}
                {customerPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-[var(--tv-stone-400)]" />
                    <span className="text-[var(--tv-stone-600)] text-xs">{formatPhone(customerPhone)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-[var(--tv-stone-400)] pt-1">
                  <Hash className="h-3 w-3" />
                  <span className="font-mono">{order.user_id?.slice(0, 12)}...</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(order.user_id); toast.success("ID copiado!"); }}
                    className="text-[var(--tv-stone-400)] hover:text-[var(--tv-moss)] transition-colors"
                    title="Copiar ID do cliente"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[var(--tv-cream)] border border-[var(--tv-stone-200)] p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--tv-stone-500)] mb-3">Entrega</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-[var(--tv-stone-400)]" />
                  <span className="text-[var(--tv-stone-800)]">
                    {order.delivery_type === "pickup" ? "Retirada na loja" : "Entrega no endereço"}
                  </span>
                </div>
                {order.address && order.delivery_type === "delivery" && (
                  <p className="text-xs text-[var(--tv-stone-600)] pl-5.5">
                    {order.address.street}, {order.address.number}
                    {order.address.complement && ` — ${order.address.complement}`}
                    <br />
                    {order.address.neighborhood}, {order.address.city}/{order.address.state}
                    {order.address.cep && ` · CEP ${order.address.cep}`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Payment + Controle de Pagamento */}
          <div className="rounded-xl bg-[var(--tv-cream)] border border-[var(--tv-stone-200)] p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--tv-stone-500)]">Pagamento</h4>
              {order.payment_status === "pending" && order.status !== "cancelled" && order.status !== "refunded" && (
                <button
                  onClick={() => setShowPaymentActions((s) => !s)}
                  className="text-xs text-[var(--tv-moss)] hover:underline flex items-center gap-1"
                >
                  <CircleDollarSign className="h-3 w-3" />
                  {showPaymentActions ? "Fechar" : "Confirmar pagamento"}
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PaymentIcon className="h-4 w-4 text-[var(--tv-moss)]" />
                <span className="text-sm font-medium text-[var(--tv-stone-800)]">{PAYMENT_LABELS[order.payment_method] || order.payment_method}</span>
                <span className={cn("tv-status text-[10px]", paymentConfig.bg, paymentConfig.color)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", paymentConfig.dot)} />
                  {paymentConfig.label}
                </span>
              </div>
              <span className="text-sm font-bold text-[var(--tv-moss)]">{formatCurrency(order.total)}</span>
            </div>
            {order.change_for && order.payment_method === "cash" && (
              <p className="text-xs text-[var(--tv-stone-500)] mt-2">Troco para: {formatCurrency(order.change_for)}</p>
            )}

            {/* Payment Actions */}
            {showPaymentActions && (
              <div className="mt-3 pt-3 border-t border-[var(--tv-stone-200)] flex gap-2">
                <button
                  onClick={() => { onUpdatePayment(order.id, "paid"); setShowPaymentActions(false); }}
                  className="tv-btn tv-btn--success tv-btn--sm gap-1.5"
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                  Marcar como pago
                </button>
                <button
                  onClick={() => { onUpdatePayment(order.id, "failed"); setShowPaymentActions(false); }}
                  className="tv-btn tv-btn--danger tv-btn--sm gap-1.5"
                  disabled={isUpdating}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Marcar como falhou
                </button>
                <button
                  onClick={() => setShowPaymentActions(false)}
                  className="tv-btn tv-btn--secondary tv-btn--sm"
                >
                  Voltar
                </button>
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--tv-stone-500)] mb-3">Itens do pedido</h4>
            <div className="rounded-xl border border-[var(--tv-stone-200)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[var(--tv-cream)]">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold text-[var(--tv-stone-500)]">Produto</th>
                    <th className="text-center p-3 text-xs font-semibold text-[var(--tv-stone-500)]">Qtd</th>
                    <th className="text-right p-3 text-xs font-semibold text-[var(--tv-stone-500)]">Unit.</th>
                    <th className="text-right p-3 text-xs font-semibold text-[var(--tv-stone-500)]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--tv-stone-100)]">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          {item.product_image ? (
                            <img src={item.product_image} alt={item.product_name} className="h-9 w-9 rounded-lg object-cover ring-1 ring-[var(--tv-stone-200)]" />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-[var(--tv-stone-100)] flex items-center justify-center">
                              <Package className="h-4 w-4 text-[var(--tv-stone-300)]" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-[var(--tv-stone-800)]">{item.product_name}</p>
                            <p className="text-[10px] text-[var(--tv-stone-400)]">{item.unit_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-center text-[var(--tv-stone-600)]">{item.quantity}</td>
                      <td className="p-3 text-right text-[var(--tv-stone-600)]">{formatCurrency(item.unit_price)}</td>
                      <td className="p-3 text-right font-medium text-[var(--tv-stone-800)]">{formatCurrency(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-xl bg-[var(--tv-forest)] text-white p-5">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-white/70">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Entrega</span>
                <span>{formatCurrency(order.delivery_fee)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-[var(--tv-gold-lt)]">
                  <span>Desconto {order.coupon_id && <span className="text-white/60">(cupom aplicado)</span>}</span>
                  <span>− {formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-white/15 flex justify-between items-baseline">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold font-display">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="rounded-xl bg-[var(--tv-warning-lt)] border border-[var(--tv-terracota)]/15 p-4">
              <h4 className="text-xs font-semibold text-[var(--tv-terracota-dk)] mb-1">Observações do cliente</h4>
              <p className="text-sm text-[var(--tv-stone-700)] italic">&ldquo;{order.notes}&rdquo;</p>
            </div>
          )}

          {/* History */}
          {order.history && order.history.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--tv-stone-500)] mb-3">Histórico</h4>
              <div className="space-y-2">
                {order.history.map((h: OrderStatusHistory) => (
                  <div key={h.id} className="flex items-center gap-3 text-sm">
                    <div className={cn("h-2 w-2 rounded-full flex-shrink-0", STATUS_CONFIG[h.status]?.dot || "bg-[var(--tv-stone-300)]")} />
                    <span className="text-[var(--tv-stone-600)]">{STATUS_CONFIG[h.status]?.label || h.status}</span>
                    {h.created_by_name && <span className="text-[var(--tv-stone-400)] text-xs">por {h.created_by_name}</span>}
                    {h.notes && <span className="text-[var(--tv-stone-400)] text-xs italic">— {h.notes}</span>}
                    <span className="text-[var(--tv-stone-400)] text-xs ml-auto">{formatDateRelative(h.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cancel Input */}
          {showCancelInput && (
            <div className="rounded-xl border border-[var(--tv-danger)]/30 bg-[var(--tv-danger-lt)] p-4">
              <label className="text-sm font-medium text-[var(--tv-danger)] mb-2 block">Motivo do cancelamento</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Informe o motivo..."
                rows={2}
                className="tv-input resize-none"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowCancelInput(false)} className="tv-btn tv-btn--secondary tv-btn--sm">Voltar</button>
                <button
                  onClick={() => { onCancel(order.id, cancelReason); setShowCancelInput(false); setCancelReason(""); }}
                  className="tv-btn tv-btn--danger tv-btn--sm gap-1.5"
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                  Confirmar cancelamento
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="tv-modal__footer">
          <button onClick={onClose} className="tv-btn tv-btn--secondary">Fechar</button>
          <div className="flex gap-2">
            {order.status !== "cancelled" && order.status !== "refunded" && order.status !== "delivered" && (
              <button
                onClick={() => setShowCancelInput(true)}
                className="tv-btn tv-btn--danger gap-1.5"
                disabled={isUpdating || showCancelInput}
              >
                <Ban className="h-4 w-4" /> Cancelar
              </button>
            )}
            {nextStatus && (
              <button
                onClick={() => onUpdateStatus(order.id, nextStatus)}
                className="tv-btn tv-btn--primary gap-1.5"
                disabled={isUpdating}
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {STATUS_CONFIG[nextStatus].actionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   CANCEL MODAL
   ──────────────────────────────────────────────────────────── */
function CancelModal({ order, onConfirm, onCancel, isUpdating }: {
  order: OrderWithProfile;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isUpdating: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="tv-modal-overlay" onClick={onCancel}>
      <div className="tv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tv-modal__header">
          <h3 className="tv-modal__title flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--tv-terracota)]" /> Cancelar pedido
          </h3>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-[var(--tv-stone-400)] hover:bg-[var(--tv-stone-100)]"><X className="h-5 w-5" /></button>
        </div>
        <div className="tv-modal__body">
          <p className="text-sm text-[var(--tv-stone-600)] mb-3">
            Cancelar <strong className="text-[var(--tv-forest)]">{order.order_number}</strong>? Esta ação não pode ser desfeita.
          </p>
          <label className="tv-label tv-label--sm">Motivo (opcional)</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Informe o motivo do cancelamento..." rows={2} className="tv-input resize-none" />
        </div>
        <div className="tv-modal__footer">
          <button onClick={onCancel} className="tv-btn tv-btn--secondary" disabled={isUpdating}>Voltar</button>
          <button onClick={() => onConfirm(reason)} className="tv-btn tv-btn--danger gap-2" disabled={isUpdating}>
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            Cancelar pedido
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ──────────────────────────────────────────────────────────── */
function AdminOrders() {
  // Typed selectors to avoid implicit any
  const orders: OrderWithProfile[] = useAdminOrdersStore((state) => state.orders);
  const isLoading: boolean = useAdminOrdersStore((state) => state.isLoading);
  const error: string | null = useAdminOrdersStore((state) => state.error);
  const total: number = useAdminOrdersStore((state) => state.total);
  const fetchOrders = useAdminOrdersStore((state) => state.fetchOrders);
  const updateStatus = useAdminOrdersStore((state) => state.updateStatus);
  const updatePayment = useAdminOrdersStore((state) => state.updatePayment);
  const cancelOrder = useAdminOrdersStore((state) => state.cancelOrder);

  const profile = useAuthStore((state) => state.profile);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | "all">("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("today");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [detailOrder, setDetailOrder] = useState<OrderWithProfile | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OrderWithProfile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const adminId = profile?.id || "";
  const adminName = profile?.full_name || "Admin";

  // Fetch orders on mount and when filters change
  useEffect(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfDay.getTime() - 24 * 60 * 60 * 1000);
    const startOfWeek = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);

    let dateFrom: string | null = null;
    let dateTo: string | null = null;

    switch (periodFilter) {
      case "today":
        dateFrom = startOfDay.toISOString();
        break;
      case "yesterday":
        dateFrom = startOfYesterday.toISOString();
        dateTo = startOfDay.toISOString();
        break;
      case "week":
        dateFrom = startOfWeek.toISOString();
        break;
      case "all":
        dateFrom = null;
        dateTo = null;
        break;
    }

    fetchOrders({
      status: statusFilter === "all" ? null : statusFilter,
      paymentStatus: paymentStatusFilter === "all" ? null : paymentStatusFilter,
      dateFrom,
      dateTo,
      search: searchQuery.trim() || null,
    });
  }, [fetchOrders, periodFilter, statusFilter, paymentStatusFilter, searchQuery]);

  /* ── Sort (client-side para os já carregados) ── */
  const filteredOrders = useMemo(() => {
    const result = [...orders];

    result.sort((a: OrderWithProfile, b: OrderWithProfile) => {
      let comparison = 0;
      switch (sortKey) {
        case "created_at": comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
        case "total": comparison = a.total - b.total; break;
        case "status": comparison = a.status.localeCompare(b.status); break;
        case "order_number": comparison = a.order_number.localeCompare(b.order_number); break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [orders, sortKey, sortOrder]);

  /* ── Stats (calculados dos pedidos carregados) ── */
  const stats = useMemo(() => {
    const revenue = orders.reduce((sum: number, o: OrderWithProfile) => {
      return sum + (o.status !== "cancelled" && o.status !== "refunded" ? o.total : 0);
    }, 0);
    const pending = orders.filter((o: OrderWithProfile) => o.status === "pending").length;
    const preparing = orders.filter((o: OrderWithProfile) => o.status === "preparing").length;
    const outDelivery = orders.filter((o: OrderWithProfile) => o.status === "out_for_delivery").length;
    const delivered = orders.filter((o: OrderWithProfile) => o.status === "delivered").length;
    const cancelled = orders.filter((o: OrderWithProfile) => o.status === "cancelled").length;
    const paid = orders.filter((o: OrderWithProfile) => o.payment_status === "paid").length;
    return { total: orders.length, revenue, pending, preparing, outDelivery, delivered, cancelled, paid };
  }, [orders]);

  /* ── Handlers ── */
  const handleUpdateStatus = useCallback(async (id: string, status: OrderStatus) => {
    if (!adminId) { toast.error("Admin não identificado"); return; }
    setIsUpdating(true);
    const success = await updateStatus(id, status, adminId, adminName);
    setIsUpdating(false);
    if (success) {
      toast.success(`Status atualizado: ${STATUS_CONFIG[status].label}`);
      setDetailOrder(null);
    } else {
      toast.error("Erro ao atualizar status");
    }
  }, [updateStatus, adminId, adminName]);

  const handleUpdatePayment = useCallback(async (id: string, paymentStatus: PaymentStatus) => {
    if (!adminId) { toast.error("Admin não identificado"); return; }
    setIsUpdating(true);
    const success = await updatePayment(id, paymentStatus, adminId, adminName, `Pagamento marcado como ${PAYMENT_STATUS_CONFIG[paymentStatus].label}`);
    setIsUpdating(false);
    if (success) {
      toast.success(`Pagamento atualizado: ${PAYMENT_STATUS_CONFIG[paymentStatus].label}`);
      setDetailOrder(null);
    } else {
      toast.error("Erro ao atualizar pagamento");
    }
  }, [updatePayment, adminId, adminName]);

  const handleCancel = useCallback(async (id: string, reason?: string) => {
    if (!adminId) { toast.error("Admin não identificado"); return; }
    setIsUpdating(true);
    const success = await cancelOrder(id, adminId, adminName, reason);
    setIsUpdating(false);
    if (success) {
      toast.success(reason ? `Pedido cancelado: ${reason}` : "Pedido cancelado");
      setCancelTarget(null);
      setDetailOrder(null);
    } else {
      toast.error("Erro ao cancelar pedido");
    }
  }, [cancelOrder, adminId, adminName]);

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortOrder("desc"); }
  }, [sortKey]);

  const exportCSV = useCallback(() => {
    const headers = ["Pedido", "Data", "Cliente", "Email", "Status", "Pagamento", "Subtotal", "Entrega", "Desconto", "Total", "Observacoes"];
    const rows = filteredOrders.map((o: OrderWithProfile) => {
      return [
        o.order_number,
        formatDateTime(o.created_at),
        o.profile?.full_name || "",
        o.profile?.email || "",
        STATUS_CONFIG[o.status].label,
        PAYMENT_LABELS[o.payment_method] || o.payment_method,
        o.subtotal,
        o.delivery_fee,
        o.discount,
        o.total,
        o.notes || "",
      ];
    });
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos-${periodFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  }, [filteredOrders, periodFilter]);

  if (isLoading && !orders.length) return <OrdersSkeleton />;

  if (error && !orders.length) {
    return (
      <div className="tv-empty py-20">
        <AlertTriangle className="h-10 w-10 text-[var(--tv-terracota)] mb-3" />
        <h3 className="font-serif text-xl text-[var(--tv-forest)]">Erro ao carregar pedidos</h3>
        <p className="mt-2 text-sm text-[var(--tv-stone-500)]">{error}</p>
        <button onClick={() => fetchOrders()} className="tv-btn tv-btn--primary mt-4 gap-2">
          <RotateCcw className="h-4 w-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[var(--tv-forest)]">Pedidos</h1>
          <p className="mt-1 text-sm text-[var(--tv-stone-500)]">
            {stats.total} pedido{stats.total !== 1 ? "s" : ""} no período
            {stats.revenue > 0 && <span className="text-[var(--tv-moss)] font-medium"> · {formatCurrency(stats.revenue)} em vendas</span>}
          </p>
        </div>
        <button onClick={exportCSV} className="tv-btn tv-btn--secondary gap-2 self-start sm:self-auto">
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {[
          { label: "Total", value: stats.total, color: "forest" as const, icon: Hash },
          { label: "Pendentes", value: stats.pending, color: "terracotta" as const, icon: Clock, alert: stats.pending > 0 },
          { label: "Em preparo", value: stats.preparing, color: "moss" as const, icon: ChefHat },
          { label: "Em rota", value: stats.outDelivery, color: "info" as const, icon: TruckIcon },
          { label: "Entregues", value: stats.delivered, color: "success" as const, icon: CheckCheck },
          { label: "Cancelados", value: stats.cancelled, color: "danger" as const, icon: Ban },
          { label: "Pagos", value: stats.paid, color: "success" as const, icon: CircleDollarSign },
        ].map((stat) => (
          <div key={stat.label} className={cn("rounded-xl border p-3 transition-all",
            stat.alert ? "bg-[var(--tv-warning-lt)] border-[var(--tv-terracota)]/20" : "bg-white border-[var(--tv-stone-200)]"
          )}>
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon className={cn("h-3.5 w-3.5",
                stat.color === "forest" && "text-[var(--tv-forest)]",
                stat.color === "terracotta" && "text-[var(--tv-terracota)]",
                stat.color === "moss" && "text-[var(--tv-moss)]",
                stat.color === "info" && "text-[var(--tv-info)]",
                stat.color === "success" && "text-[var(--tv-success)]",
                stat.color === "danger" && "text-[var(--tv-danger)]",
              )} />
              <p className="text-[10px] text-[var(--tv-stone-400)] uppercase tracking-wide">{stat.label}</p>
            </div>
            <p className={cn("text-2xl font-bold",
              stat.color === "forest" && "text-[var(--tv-forest)]",
              stat.color === "terracotta" && "text-[var(--tv-terracota)]",
              stat.color === "moss" && "text-[var(--tv-moss)]",
              stat.color === "info" && "text-[var(--tv-info)]",
              stat.color === "success" && "text-[var(--tv-success)]",
              stat.color === "danger" && "text-[var(--tv-danger)]",
            )}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Period Tabs */}
      <div className="tv-tabs tv-tabs--pills">
        {([
          { key: "today" as PeriodFilter, label: "Hoje" },
          { key: "yesterday" as PeriodFilter, label: "Ontem" },
          { key: "week" as PeriodFilter, label: "7 dias" },
          { key: "all" as PeriodFilter, label: "Todos" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setPeriodFilter(tab.key)}
            className={cn("tv-tab", periodFilter === tab.key && "tv-tab--active")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--tv-stone-400)] pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nº do pedido ou nome do cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tv-input pl-10 w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--tv-stone-400)] hover:text-[var(--tv-stone-600)]">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className={cn("tv-btn tv-btn--secondary tv-btn--sm gap-1.5", showFilters && "border-[var(--tv-moss-lt)] text-[var(--tv-moss)]")}
        >
          <Filter className="h-3.5 w-3.5" /> Filtros
          {(statusFilter !== "all" || paymentStatusFilter !== "all") && <span className="h-2 w-2 rounded-full bg-[var(--tv-moss)]" />}
        </button>
        <div className="relative">
          <select
            value={`${sortKey}-${sortOrder}`}
            onChange={(e) => { const [k, o] = e.target.value.split("-"); setSortKey(k as SortKey); setSortOrder(o as "asc" | "desc"); }}
            className="tv-input tv-input--sm appearance-none pr-8 cursor-pointer"
          >
            <option value="created_at-desc">Data ↓</option>
            <option value="created_at-asc">Data ↑</option>
            <option value="total-desc">Valor ↓</option>
            <option value="total-asc">Valor ↑</option>
            <option value="status-asc">Status</option>
            <option value="order_number-asc">Pedido</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--tv-stone-400)] pointer-events-none" />
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[var(--tv-cream)] border border-[var(--tv-stone-200)] animate-fade-in">
          <div>
            <label className="tv-label tv-label--sm">Status do pedido</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "all")} className="tv-input tv-input--sm mt-1">
              <option value="all">Todos os status</option>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="tv-label tv-label--sm">Status do pagamento</label>
            <select value={paymentStatusFilter} onChange={(e) => setPaymentStatusFilter(e.target.value as PaymentStatus | "all")} className="tv-input tv-input--sm mt-1">
              <option value="all">Todos</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="failed">Falhou</option>
              <option value="refunded">Reembolsado</option>
            </select>
          </div>
        </div>
      )}

      {/* Results count */}
      {filteredOrders.length !== total && (
        <p className="text-xs text-[var(--tv-stone-400)]">
          Mostrando {filteredOrders.length} de {total} pedidos{searchQuery && <span> para &quot;{searchQuery}&quot;</span>}
        </p>
      )}

      {/* Table */}
      {filteredOrders.length === 0 ? (
        <EmptyOrdersState period={periodFilter} />
      ) : (
        <div className="tv-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tv-table w-full">
              <thead>
                <tr>
                  <th className="cursor-pointer" onClick={() => toggleSort("order_number")}>
                    <span className="tv-table__sort">Pedido<ArrowUpDown className="h-3 w-3 tv-table__sort-icon" /></span>
                  </th>
                  <th className="cursor-pointer" onClick={() => toggleSort("created_at")}>
                    <span className="tv-table__sort">Data<ArrowUpDown className="h-3 w-3 tv-table__sort-icon" /></span>
                  </th>
                  <th>Cliente</th>
                  <th className="cursor-pointer" onClick={() => toggleSort("total")}>
                    <span className="tv-table__sort">Total<ArrowUpDown className="h-3 w-3 tv-table__sort-icon" /></span>
                  </th>
                  <th>Pagamento</th>
                  <th className="cursor-pointer" onClick={() => toggleSort("status")}>
                    <span className="tv-table__sort">Status<ArrowUpDown className="h-3 w-3 tv-table__sort-icon" /></span>
                  </th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order: OrderWithProfile) => {
                  const cfg = STATUS_CONFIG[order.status];
                  const NextIcon = cfg.next ? STATUS_CONFIG[cfg.next].icon : null;
                  const payCfg = PAYMENT_STATUS_CONFIG[order.payment_status];
                  const customerName = order.profile?.full_name || "Cliente não identificado";

                  return (
                    <tr key={order.id} className="group cursor-pointer" onClick={() => setDetailOrder(order)}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-lg bg-[var(--tv-moss)]/8 flex items-center justify-center">
                            <Receipt className="h-4 w-4 text-[var(--tv-moss)]" />
                          </div>
                          <div>
                            <span className="font-medium text-[var(--tv-forest)] text-sm">{order.order_number}</span>
                            <p className="text-[10px] text-[var(--tv-stone-400)]">{order.items?.length ?? 0} itens</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm text-[var(--tv-stone-700)]">{formatDateShort(order.created_at)}</div>
                        <div className="text-[10px] text-[var(--tv-stone-400)]">{formatDateRelative(order.created_at)}</div>
                      </td>
                      <td>
                        <div className="text-sm text-[var(--tv-stone-800)] font-medium">{customerName}</div>
                        <div className="text-[10px] text-[var(--tv-stone-400)] font-mono">{order.user_id?.slice(0, 8)}...</div>
                      </td>
                      <td>
                        <span className="text-sm font-semibold text-[var(--tv-moss)]">{formatCurrency(order.total)}</span>
                        {order.discount > 0 && <span className="text-[10px] text-[var(--tv-stone-400)] ml-1">−{formatCurrency(order.discount)}</span>}
                      </td>
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            {(() => {
                              const Icon = PAYMENT_ICONS[order.payment_method] || CreditCard;
                              return <Icon className="h-3.5 w-3.5 text-[var(--tv-stone-400)]" />;
                            })()}
                            <span className="text-xs text-[var(--tv-stone-600)]">{PAYMENT_LABELS[order.payment_method] || order.payment_method}</span>
                          </div>
                          <span className={cn("tv-status text-[9px] self-start", payCfg.bg, payCfg.color)}>
                            <span className={cn("h-1 w-1 rounded-full", payCfg.dot)} />
                            {payCfg.label}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={cn("tv-status", cfg.bg, cfg.color)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                          {cfg.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDetailOrder(order); }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--tv-stone-500)] hover:bg-[var(--tv-moss)]/10 hover:text-[var(--tv-moss)] transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {cfg.next && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.id, cfg.next!); }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--tv-stone-500)] hover:bg-[var(--tv-success-lt)] hover:text-[var(--tv-success)] transition-colors"
                              title={cfg.actionLabel}
                              disabled={isUpdating}
                            >
                              {NextIcon && <NextIcon className="h-4 w-4" />}
                            </button>
                          )}
                          {order.status !== "cancelled" && order.status !== "refunded" && order.status !== "delivered" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setCancelTarget(order); }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--tv-stone-500)] hover:bg-[var(--tv-danger-lt)] hover:text-[var(--tv-danger)] transition-colors"
                              title="Cancelar"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
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
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onUpdateStatus={handleUpdateStatus}
          onUpdatePayment={handleUpdatePayment}
          onCancel={handleCancel}
          isUpdating={isUpdating}
          adminId={adminId}
          adminName={adminName}
        />
      )}

      {/* Cancel Modal */}
      {cancelTarget && (
        <CancelModal
          order={cancelTarget}
          onConfirm={(reason) => handleCancel(cancelTarget.id, reason)}
          onCancel={() => setCancelTarget(null)}
          isUpdating={isUpdating}
        />
      )}
    </div>
  );
}