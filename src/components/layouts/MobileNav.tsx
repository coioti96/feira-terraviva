import { Link, useNavigate } from "@tanstack/react-router";
import { Home, ShoppingBag, ShoppingCart, User } from "lucide-react";
import { useCartStore } from "@/stores/cart";
import { useAuthStore } from "@/stores/auth";

export function MobileNav() {
  const itemCount = useCartStore((s) => s.items.reduce((acc, i) => acc + i.quantity, 0));
  const { user } = useAuthStore();
  const navigate = useNavigate();

  function handleProfileClick(e: React.MouseEvent) {
    e.preventDefault();
    if (user) {
      navigate({ to: "/perfil" });
    } else {
      navigate({ to: "/auth/login", search: {} as never });
    }
  }

  return (
    <nav
      className="bottom-nav md:hidden"
      style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}
    >
      <NavItem to="/" icon={<Home size={22} />} label="Início" exact />
      <NavItem to="/produtos" icon={<ShoppingBag size={22} />} label="Produtos" />
      <CartNavItem count={itemCount} />
      <button
        onClick={handleProfileClick}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 3, padding: "4px 12px", background: "none", border: "none",
          cursor: "pointer", color: "var(--tv-stone-400)",
          transition: "color 0.18s ease", minWidth: 56,
        }}
        aria-label="Perfil"
      >
        <User size={22} />
        <span style={{ fontSize: 10, fontWeight: 500 }}>Perfil</span>
      </button>
    </nav>
  );
}

function NavItem({
  to,
  icon,
  label,
  exact = false,
}: {
  to: "/" | "/produtos" | "/carrinho" | "/pedidos" | "/perfil" | "/auth/login" | "/auth/register";
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
}) {
  return (
    <Link
      to={to}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 3, padding: "4px 12px", color: "var(--tv-stone-400)",
        textDecoration: "none", transition: "color 0.18s ease", minWidth: 56,
      }}
      activeProps={{ style: { color: "var(--tv-moss)" } }}
      activeOptions={{ exact }}
    >
      {icon}
      <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
    </Link>
  );
}

function CartNavItem({ count }: { count: number }) {
  return (
    <Link
      to="/carrinho"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 3, padding: "4px 12px", color: "var(--tv-stone-400)",
        textDecoration: "none", transition: "color 0.18s ease",
        position: "relative", minWidth: 56,
      }}
      activeProps={{ style: { color: "var(--tv-moss)" } }}
    >
      <div style={{ position: "relative" }}>
        <ShoppingCart size={22} />
        {count > 0 && (
          <span style={{
            position: "absolute", top: -6, right: -8, minWidth: 18, height: 18,
            borderRadius: 9999, background: "var(--tv-terracota)", color: "white",
            fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center",
            justifyContent: "center", padding: "0 4px", lineHeight: 1,
          }}>
            {count > 99 ? "99+" : count}
          </span>
        )}
      </div>
      <span style={{ fontSize: 10, fontWeight: 500 }}>Carrinho</span>
    </Link>
  );
}