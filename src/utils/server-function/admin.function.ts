import { createServerFn } from "@tanstack/react-start";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { DashboardStats, Order, Product } from "@/types";

/* ═══════════════════════════════════════════════════════════════
   ADMIN SERVER FUNCTIONS — Terra Viva
   ⚠️  Estas funções NÃO fazem checkAdminRole internamente.
       A proteção é feita pela rota _authenticated/admin.tsx
       (beforeLoad verifica role === "admin").
   ═══════════════════════════════════════════════════════════════ */

/* ── Dashboard Stats ───────────────────────────────────────── */
export const getDashboardStats = createServerFn({ method: "GET" })
  .handler(async (): Promise<DashboardStats> => {
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error("Serviço indisponível: Supabase Admin não configurado");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = yesterday.toISOString();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoIso = sevenDaysAgo.toISOString();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

    const [
      { count: ordersTodayCount, error: err1 },
      { data: todayRevenue, error: err2 },
      { count: ordersYesterdayCount, error: err3 },
      { data: yesterdayRevenue, error: err4 },
      { data: weekData, error: err5 },
      { count: newCustomersCount, error: err6 },
      { data: avgTicketData, error: err7 },
      { count: totalProductsCount, error: err8 },
      { count: totalCustomersCount, error: err9 },
      { count: totalOrdersCount, error: err10 },
      { data: totalRevenueData, error: err11 },
      { count: pendingOrders, error: err12 },
      { count: preparingOrders, error: err13 },
      { count: outForDeliveryOrders, error: err14 },
      { count: lowStockCount, error: err15 },
      { data: weekRevenue, error: err16 },
      { data: monthRevenue, error: err17 },
      { data: allTimeRevenue, error: err18 },
      { data: topProducts, error: err19 },
    ] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
      supabase.from("orders").select("total").gte("created_at", todayIso).eq("status", "delivered"),
      supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", yesterdayIso).lt("created_at", todayIso),
      supabase.from("orders").select("total").gte("created_at", yesterdayIso).lt("created_at", todayIso).eq("status", "delivered"),
      supabase.from("orders").select("created_at, total, status").gte("created_at", sevenDaysAgoIso).order("created_at", { ascending: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
      supabase.from("orders").select("total").gte("created_at", thirtyDaysAgoIso).eq("status", "delivered"),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("total").eq("status", "delivered"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "preparing"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "out_for_delivery"),
      supabase.from("products").select("id", { count: "exact", head: true }).lte("stock", 5).eq("is_active", true),
      supabase.from("orders").select("total").gte("created_at", sevenDaysAgoIso).eq("status", "delivered"),
      supabase.from("orders").select("total").gte("created_at", thirtyDaysAgoIso).eq("status", "delivered"),
      supabase.from("orders").select("total").eq("status", "delivered"),
      supabase.from("order_items").select("product_id, product_name, quantity, total_price").gte("created_at", thirtyDaysAgoIso).order("quantity", { ascending: false }).limit(5),
    ]);

    const hasError = [err1, err2, err3, err4, err5, err6, err7, err8, err9, err10, err11, err12, err13, err14, err15, err16, err17, err18, err19].some(Boolean);
    if (hasError) {
      console.error("[getDashboardStats] Erros Supabase:", { err1, err2, err3, err4, err5, err6, err7, err8, err9, err10, err11, err12, err13, err14, err15, err16, err17, err18, err19 });
      throw new Error("Erro ao buscar estatísticas do dashboard");
    }

    const revenueToday = (todayRevenue || []).reduce((a: number, o: any) => a + (o.total || 0), 0);
    const revenueYesterday = (yesterdayRevenue || []).reduce((a: number, o: any) => a + (o.total || 0), 0);
    const avgTicketValue = avgTicketData?.length
      ? (avgTicketData as any[]).reduce((a: number, o: any) => a + (o.total || 0), 0) / avgTicketData.length
      : 0;

    const chartMap = new Map<string, { revenue: number; orders: number }>();
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      chartMap.set(days[d.getDay()], { revenue: 0, orders: 0 });
    }
    (weekData || []).forEach((o: any) => {
      const key = days[new Date(o.created_at).getDay()];
      const existing = chartMap.get(key);
      if (existing) {
        existing.revenue += o.total || 0;
        if (o.status === "delivered") existing.orders += 1;
      }
    });

    const salesChart = Array.from(chartMap.entries()).map(([day, data]) => ({ day, revenue: data.revenue, orders: data.orders }));
    const revenueByDay = Array.from(chartMap.entries()).map(([date, data]) => ({ date, revenue: data.revenue, orders: data.orders }));

    const calcTrend = (today: number, yesterday: number) => yesterday === 0 ? (today > 0 ? 100 : 0) : Math.round(((today - yesterday) / yesterday) * 100);

    return {
      orders_today: ordersTodayCount || 0,
      revenue_today: revenueToday,
      average_ticket: Math.round(avgTicketValue * 100) / 100,
      new_customers_today: newCustomersCount || 0,
      orders_trend: { value: calcTrend(ordersTodayCount || 0, ordersYesterdayCount || 0), label: "vs ontem" },
      revenue_trend: { value: calcTrend(revenueToday, revenueYesterday), label: "vs ontem" },
      ticket_trend: { value: 0, label: "vs mês passado" },
      customers_trend: { value: 0, label: "vs ontem" },
      sales_chart: salesChart,
      total_products: totalProductsCount || 0,
      total_customers: totalCustomersCount || 0,
      total_orders: totalOrdersCount || 0,
      total_revenue: (totalRevenueData || []).reduce((a: number, o: any) => a + (o.total || 0), 0),
      total_revenue_week: (weekRevenue || []).reduce((a: number, o: any) => a + (o.total || 0), 0),
      total_revenue_month: (monthRevenue || []).reduce((a: number, o: any) => a + (o.total || 0), 0),
      total_revenue_all_time: (allTimeRevenue || []).reduce((a: number, o: any) => a + (o.total || 0), 0),
      orders_week: 0,
      orders_month: 0,
      orders_pending: pendingOrders || 0,
      orders_preparing: preparingOrders || 0,
      orders_out_for_delivery: outForDeliveryOrders || 0,
      low_stock_products: lowStockCount || 0,
      top_selling_products: (topProducts || []).map((p: any) => ({ product_id: p.product_id, product_name: p.product_name, total_sold: p.quantity || 0, total_revenue: p.total_price || 0 })),
      revenue_by_day: revenueByDay,
      revenue_by_payment_method: [
        { method: "pix" as const, total: revenueToday * 0.6, count: Math.floor((ordersTodayCount || 0) * 0.6) },
        { method: "cash" as const, total: revenueToday * 0.3, count: Math.floor((ordersTodayCount || 0) * 0.3) },
        { method: "card" as const, total: revenueToday * 0.1, count: Math.floor((ordersTodayCount || 0) * 0.1) },
      ],
    };
  });

/* ── Recent Orders ─────────────────────────────────────────── */
export const getRecentOrders = createServerFn({ method: "GET" })
  .handler(async (): Promise<Order[]> => {
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error("Serviço indisponível");

    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[getRecentOrders] Erro:", error);
      throw new Error("Erro ao buscar pedidos recentes");
    }

    return (orders || []) as Order[];
  });

/* ── Low Stock Products ────────────────────────────────────── */
export const getLowStockProducts = createServerFn({ method: "GET" })
  .handler(async (): Promise<Product[]> => {
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error("Serviço indisponível");

    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("[getLowStockProducts] Erro:", error);
      throw new Error("Erro ao buscar produtos com estoque baixo");
    }

    return (products || []) as Product[];
  });