import { Link } from "@tanstack/react-router";
import { ShoppingBasket, User } from "lucide-react";
import { useCartStore } from "@/stores/cart";
import { useAuthStore } from "@/stores/auth";

export function HeaderActions() {
  const count = useCartStore((s) => s.items.reduce((a, i) => a + i.quantity, 0));
  const profile = useAuthStore((s) => s.profile);
  return (
    <div className="flex items-center gap-2">
      <Link
        to="/carrinho"
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-full hover:bg-accent"
        aria-label="Carrinho"
      >
        <ShoppingBasket className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[11px] grid place-items-center font-medium">
            {count}
          </span>
        )}
      </Link>
      <Link
        to={profile ? "/perfil" : "/auth/login"}
        className="inline-flex items-center justify-center h-10 w-10 rounded-full hover:bg-accent"
        aria-label="Perfil"
      >
        <User className="h-5 w-5" />
      </Link>
    </div>
  );
}
