import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const STATUS_MAP: Record<OrderStatus, {
  label: string;
  bg: string;
  text: string;
  dot: string;
}> = {
  pending: {
    label: "Pendente",
    bg: "bg-[var(--tv-warning-lt)]",
    text: "text-[var(--tv-terracota-dk)]",
    dot: "bg-[var(--tv-terracota)]",
  },
  confirmed: {
    label: "Confirmado",
    bg: "bg-[var(--tv-info-lt)]",
    text: "text-[var(--tv-info)]",
    dot: "bg-[var(--tv-info)]",
  },
  preparing: {
    label: "Em preparo",
    bg: "bg-[var(--tv-success-lt)]",
    text: "text-[var(--tv-success)]",
    dot: "bg-[var(--tv-success)]",
  },
  out_for_delivery: {
    label: "Saiu para entrega",
    bg: "bg-[var(--tv-info-lt)]",
    text: "text-[var(--tv-info)]",
    dot: "bg-[var(--tv-info)]",
  },
  delivered: {
    label: "Entregue",
    bg: "bg-[var(--tv-success-lt)]",
    text: "text-[var(--tv-success)]",
    dot: "bg-[var(--tv-success)]",
  },
  cancelled: {
    label: "Cancelado",
    bg: "bg-[var(--tv-danger-lt)]",
    text: "text-[var(--tv-danger)]",
    dot: "bg-[var(--tv-danger)]",
  },
  refunded: {
    label: "Reembolsado",
    bg: "bg-[var(--tv-danger-lt)]",
    text: "text-[var(--tv-danger)]",
    dot: "bg-[var(--tv-danger)]",
  },
};

interface StatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md";
  showDot?: boolean;
}

export function StatusBadge({ status, size = "sm", showDot = true }: StatusBadgeProps) {
  const cfg = STATUS_MAP[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold whitespace-nowrap",
        size === "sm" && "px-2.5 py-0.5 text-[11px]",
        size === "md" && "px-3 py-1 text-xs",
        cfg.bg,
        cfg.text,
      )}
    >
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />}
      {cfg.label}
    </span>
  );
}