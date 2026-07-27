import { createFileRoute } from "@tanstack/react-router";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { useOrdersStore } from "@/stores/orders";
import { formatCurrency } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Painel" }] }),
  component: AdminFinance,
});

const COLORS = ["#059669", "#d97706", "#3b82f6"];

function AdminFinance() {
  const orders = useOrdersStore((s) => s.orders);
  const totalRevenue = orders.reduce((a, o) => a + o.total, 0);
  const monthRevenue = orders
    .filter((o) => new Date(o.created_at).getMonth() === new Date().getMonth())
    .reduce((a, o) => a + o.total, 0);
  const ticket = orders.length ? totalRevenue / orders.length : 0;

  const chart = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toDateString();
    const total = orders.filter((o) => new Date(o.created_at).toDateString() === key).reduce((a, o) => a + o.total, 0);
    return { day: d.getDate().toString(), total };
  });

  const payments = ["pix", "cash", "card"].map((m) => ({
    name: m.toUpperCase(),
    value: orders.filter((o) => o.payment_method === m).length,
  }));

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl">Financeiro</h1>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card label="Faturamento total" value={formatCurrency(totalRevenue)} />
        <Card label="Faturamento do mês" value={formatCurrency(monthRevenue)} />
        <Card label="Ticket médio" value={formatCurrency(ticket)} />
      </div>
      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="font-medium mb-3">Faturamento (30 dias)</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="font-medium mb-3">Formas de pagamento</div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={payments} dataKey="value" nameKey="name" outerRadius={80} label>
                {payments.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-serif">{value}</div>
    </div>
  );
}
