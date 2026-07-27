import { Check, Circle } from "lucide-react";
import type { OrderStatus } from "@/types";
import { cn, formatDateTime } from "@/lib/utils";

const flow: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
];

const labels: Record<OrderStatus, string> = {
  pending: "Pedido recebido",
  confirmed: "Confirmado",
  preparing: "Em preparo",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export function OrderTimeline({
  current,
  history = [],
}: {
  current: OrderStatus;
  history?: { status: OrderStatus; created_at: string }[];
}) {
  if (current === "cancelled") {
    return (
      <div className="rounded-xl bg-rose-50 text-rose-900 p-4 text-sm">
        Este pedido foi cancelado.
      </div>
    );
  }
  const currentIdx = flow.indexOf(current);
  return (
    <ol className="relative border-l-2 border-border pl-6 space-y-5">
      {flow.map((s, i) => {
        const done = i <= currentIdx;
        const at = history.find((h) => h.status === s)?.created_at;
        return (
          <li key={s} className="relative">
            <span
              className={cn(
                "absolute -left-[33px] top-0 grid place-items-center h-6 w-6 rounded-full border-2",
                done
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-background border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
            </span>
            <div className={cn("text-sm", done ? "font-medium" : "text-muted-foreground")}>
              {labels[s]}
            </div>
            {at && <div className="text-[11px] text-muted-foreground">{formatDateTime(at)}</div>}
          </li>
        );
      })}
    </ol>
  );
}
