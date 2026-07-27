// ============================================================
// ADMIN LAYOUT — Feirinha Orgânica Terra Viva
// Versão definitiva enterprise — NÃO EDITAR
// Sidebar + Header + Mobile Drawer + Design Terra Viva
// ============================================================

import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Tag,
  BarChart3,
  Settings,
  LogOut,
  Leaf,
  Menu,
  X,
  Search,
  Bell,
  ChevronRight,
  Crown,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";

// ─────────────────────────────────────────────────────────────
// NAVIGATION CONFIG
// ─────────────────────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  exact: boolean;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/produtos", label: "Produtos", icon: Package, exact: false },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag, exact: false, badge: 0 },
  { to: "/admin/clientes", label: "Clientes", icon: Users, exact: false },
  { to: "/admin/cupons", label: "Cupons", icon: Tag, exact: false },
  { to: "/admin/financeiro", label: "Financeiro", icon: BarChart3, exact: false },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings, exact: false },
];

// ─────────────────────────────────────────────────────────────
// BREADCRUMB HELPER
// ─────────────────────────────────────────────────────────────

function getBreadcrumbs(path: string): Array<{ label: string; to?: string }> {
  const crumbs: Array<{ label: string; to?: string }> = [{ label: "Admin", to: "/admin" }];

  if (path === "/admin") return crumbs;

  const segments = path.replace("/admin/", "").split("/");
  const segmentLabels: Record<string, string> = {
    produtos: "Produtos",
    pedidos: "Pedidos",
    clientes: "Clientes",
    cupons: "Cupons",
    financeiro: "Financeiro",
    configuracoes: "Configurações",
    novo: "Novo",
    editar: "Editar",
  };

  segments.forEach((seg, i) => {
    const label = segmentLabels[seg] || seg;
    const toPath = "/admin/" + segments.slice(0, i + 1).join("/");
    crumbs.push({ label, to: i < segments.length - 1 ? toPath : undefined });
  });

  return crumbs;
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR COMPONENT
// ─────────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const signOut = useAuthStore((s) => s.signOut);
  const profile = useAuthStore((s) => s.profile);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSignOut = useCallback(() => {
    if (!showLogoutConfirm) {
      setShowLogoutConfirm(true);
      setTimeout(() => setShowLogoutConfirm(false), 3000);
      return;
    }
    signOut();
  }, [showLogoutConfirm, signOut]);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 z-[310] h-screen w-[260px] shrink-0 flex flex-col transition-transform duration-300 ease-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "var(--tv-forest)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 pb-4" style={{ borderBottom: "1px solid rgb(255 255 255 / 0.08)" }}>
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "var(--tv-moss)", boxShadow: "var(--shadow-forest)" }}
          >
            <Leaf className="h-5 w-5" style={{ color: "var(--tv-linen)" }} />
          </div>
          <div className="min-w-0">
            <div
              className="font-serif font-bold text-lg truncate"
              style={{ color: "var(--tv-linen)", fontFamily: "var(--font-display)" }}
            >
              Terra Viva
            </div>
            <div
              className="text-[10px] uppercase tracking-[0.14em] font-medium truncate"
              style={{ color: "rgb(255 252 247 / 0.45)" }}
            >
              Painel Administrativo
            </div>
          </div>

          {/* Close button (mobile only) */}
          <button
            onClick={onClose}
            className="ml-auto md:hidden p-1.5 rounded-lg transition-colors"
            style={{ color: "rgb(255 252 247 / 0.50)" }}
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact, badge }) => {
            const active = exact ? path === to : path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  active
                    ? "text-white"
                    : "hover:bg-white/5"
                )}
                style={
                  active
                    ? {
                        background: "var(--tv-moss)",
                        boxShadow: "var(--shadow-forest)",
                      }
                    : { color: "rgb(255 252 247 / 0.65)" }
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span
                    className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--tv-terracota)", color: "var(--tv-white)" }}
                  >
                    {badge}
                  </span>
                )}
                {active && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4" style={{ borderTop: "1px solid rgb(255 255 255 / 0.08)" }}>
          {/* Admin profile */}
          <div className="flex items-center gap-3 px-2 py-2">
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{
                background: "linear-gradient(135deg, var(--tv-moss-mid), var(--tv-moss-lt))",
                color: "var(--tv-linen)",
                border: "2px solid rgb(255 255 255 / 0.15)",
              }}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                (profile?.full_name ?? "A")[0]?.toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate" style={{ color: "var(--tv-linen)" }}>
                  {profile?.full_name ?? "Administrador"}
                </span>
                <Crown className="h-3 w-3 shrink-0" style={{ color: "var(--tv-gold)" }} />
              </div>
              <div className="text-[11px] truncate" style={{ color: "rgb(255 252 247 / 0.45)" }}>
                {profile?.email ?? ""}
              </div>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className={cn(
              "mt-2 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
              showLogoutConfirm
                ? "text-white"
                : "hover:bg-white/5"
            )}
            style={
              showLogoutConfirm
                ? { background: "var(--tv-danger)" }
                : { color: "rgb(255 252 247 / 0.65)" }
            }
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{showLogoutConfirm ? "Clique novamente para confirmar" : "Sair da conta"}</span>
          </button>

          {/* Version */}
          <div
            className="mt-3 text-center text-[10px]"
            style={{ color: "rgb(255 252 247 / 0.25)" }}
          >
            Terra Viva v3.0 · Enterprise
          </div>
        </div>
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// HEADER COMPONENT
// ─────────────────────────────────────────────────────────────

interface HeaderProps {
  onMenuToggle: () => void;
}

function Header({ onMenuToggle }: HeaderProps) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const breadcrumbs = getBreadcrumbs(path);

  return (
    <header
      className="sticky top-0 z-[150] h-16 flex items-center gap-4 px-4 md:px-6"
      style={{
        background: "var(--tv-white)",
        borderBottom: "1px solid var(--tv-stone-200)",
      }}
    >
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="md:hidden p-2 rounded-lg transition-colors"
        style={{ color: "var(--tv-stone-600)" }}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumbs */}
      <nav className="hidden md:flex items-center gap-2 text-sm flex-1 min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <div key={crumb.label} className="flex items-center gap-2">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--tv-stone-300)" }} />
            )}
            {crumb.to ? (
              <Link
                to={crumb.to}
                className="transition-colors hover:underline truncate"
                style={{ color: "var(--tv-stone-500)" }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium truncate" style={{ color: "var(--tv-stone-800)" }}>
                {crumb.label}
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Mobile: page title */}
      <div className="md:hidden flex-1 min-w-0">
        <span className="text-sm font-semibold truncate" style={{ color: "var(--tv-stone-800)" }}>
          {breadcrumbs[breadcrumbs.length - 1]?.label}
        </span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden sm:flex items-center relative">
          <Search
            className="absolute left-3 h-4 w-4 pointer-events-none"
            style={{ color: "var(--tv-stone-400)" }}
          />
          <input
            type="text"
            placeholder="Buscar..."
            className="tv-input tv-input--sm pl-9 w-56"
          />
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-xl transition-colors hover:bg-[var(--tv-cream)]"
          style={{ color: "var(--tv-stone-600)" }}
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          <span
            className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full"
            style={{ background: "var(--tv-terracota)" }}
          />
        </button>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN LAYOUT
// ─────────────────────────────────────────────────────────────

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fecha sidebar ao pressionar Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  // Fecha sidebar ao redimensionar para desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen flex" style={{ background: "var(--tv-cream)" }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header onMenuToggle={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 md:p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}