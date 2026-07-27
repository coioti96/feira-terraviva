// ============================================================
// ROOT ROUTE — Feirinha Orgânica Terra Viva
// Versão definitiva enterprise — NÃO EDITAR
// Configuração global: fonts, SEO, auth, PWA, error boundaries
// ============================================================

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { initAuthListener, useAuthStore } from "@/stores/auth";
import { Leaf, Home, RotateCcw, AlertTriangle } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// ERROR BOUNDARY — Design Terra Viva
// ─────────────────────────────────────────────────────────────

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--tv-linen)" }}>
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--tv-danger-lt)" }}>
          <AlertTriangle className="h-8 w-8" style={{ color: "var(--tv-danger)" }} />
        </div>
        <h1 className="tv-heading-4" style={{ color: "var(--tv-forest)" }}>
          Algo deu errado
        </h1>
        <p className="mt-3 tv-body-sm" style={{ color: "var(--tv-stone-500)" }}>
          Desculpe, encontramos um problema inesperado. Nossa equipe foi notificada.
        </p>

        {showDetails && (
          <div
            className="mt-4 rounded-xl p-4 text-left font-mono text-xs overflow-auto"
            style={{ background: "var(--tv-stone-100)", color: "var(--tv-danger)", maxHeight: "200px" }}
          >
            <p className="font-semibold">{error.name}: {error.message}</p>
            <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="tv-btn tv-btn--primary tv-btn--sm"
          >
            <RotateCcw className="h-4 w-4" />
            Tentar novamente
          </button>
          <Link
            to="/"
            className="tv-btn tv-btn--secondary tv-btn--sm"
          >
            <Home className="h-4 w-4" />
            Voltar ao início
          </Link>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-4 text-xs font-medium"
          style={{ color: "var(--tv-stone-400)" }}
        >
          {showDetails ? "Ocultar detalhes técnicos" : "Ver detalhes técnicos"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 404 NOT FOUND — Design Terra Viva
// ─────────────────────────────────────────────────────────────

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "var(--tv-linen)" }}>
      <div className="w-full max-w-md text-center">
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: "var(--tv-success-lt)" }}
        >
          <Leaf className="h-10 w-10" style={{ color: "var(--tv-moss)" }} />
        </div>
        <h1
          className="font-serif font-bold"
          style={{ fontSize: "var(--text-7xl)", color: "var(--tv-forest)", lineHeight: 1 }}
        >
          404
        </h1>
        <h2 className="mt-4 tv-heading-4" style={{ color: "var(--tv-forest)" }}>
          Página não encontrada
        </h2>
        <p className="mt-3 tv-body-sm" style={{ color: "var(--tv-stone-500)" }}>
          A página que você procura não existe ou foi movida. Que tal explorar nossos produtos orgânicos?
        </p>
        <Link
          to="/"
          className="tv-btn tv-btn--primary tv-btn--lg mt-8 inline-flex"
        >
          <Home className="h-5 w-5" />
          Voltar à loja
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT ROUTE CONFIG
// ─────────────────────────────────────────────────────────────

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover",
      },
      { name: "theme-color", content: "#0A1F0A" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Terra Viva" },
      { name: "description", content: "Feirinha Orgânica Terra Viva — Produtos frescos da terra para sua mesa. Entrega rápida, orgânicos certificados." },
      { name: "keywords", content: "orgânicos, feirinha, frutas, verduras, entrega, saudável, terra viva" },
      { name: "author", content: "Terra Viva Orgânicos" },
      { name: "robots", content: "index, follow" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Terra Viva Orgânicos" },
      { property: "og:title", content: "Terra Viva — Feirinha Orgânica" },
      { property: "og:description", content: "Produtos orgânicos frescos da terra para sua mesa." },
      { property: "og:image", content: "/icons/og-image.jpg" },
      { property: "og:url", content: "https://terraviva.com.br" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Terra Viva — Feirinha Orgânica" },
      { name: "twitter:description", content: "Produtos orgânicos frescos da terra para sua mesa." },
      { name: "twitter:image", content: "/icons/og-image.jpg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap",
      },
    ],
    scripts: [
      {
        children: `
          // Dark mode detection
          (function() {
            const theme = localStorage.getItem('terraviva-theme') || 'light';
            if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.setAttribute('data-theme', 'dark');
            }
          })();
        `,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

// ─────────────────────────────────────────────────────────────
// ROOT SHELL (SSR-safe)
// ─────────────────────────────────────────────────────────────

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
        <noscript>
          <div
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--tv-linen)",
              zIndex: 9999,
              padding: "2rem",
              textAlign: "center",
            }}
          >
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--tv-forest)" }}>
                JavaScript necessário
              </h2>
              <p style={{ color: "var(--tv-stone-500)", marginTop: "0.5rem" }}>
                O Terra Viva precisa de JavaScript para funcionar. Por favor, habilite-o no seu navegador.
              </p>
            </div>
          </div>
        </noscript>
      </body>
    </html>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Inicializa listener de auth state (detecta signOut em outras abas, token refresh, etc.)
    initAuthListener();

    // Busca profile do Supabase ao montar
    fetchProfile().then(() => {
      if (mounted) setIsAuthReady(true);
    });

    // Registra service worker (PWA)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] Service Worker registrado:", reg.scope);
        })
        .catch((err) => {
          console.warn("[PWA] Falha ao registrar Service Worker:", err);
        });
    }

    return () => {
      mounted = false;
    };
  }, [fetchProfile]);

  // Loading state enquanto auth inicializa
  if (!isAuthReady) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--tv-linen)" }}>
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-12 w-12 rounded-full border-2 border-transparent"
              style={{
                borderTopColor: "var(--tv-moss)",
                animation: "tv-spin-slow 0.8s linear infinite",
              }}
            />
            <p className="tv-caption" style={{ color: "var(--tv-stone-400)" }}>
              Carregando Terra Viva...
            </p>
          </div>
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster
        richColors
        position="bottom-center"
        toastOptions={{
          style: {
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            borderRadius: "var(--r-xl)",
            border: "1px solid var(--tv-stone-200)",
            boxShadow: "var(--shadow-xl)",
          },
        }}
      />
    </QueryClientProvider>
  );
}