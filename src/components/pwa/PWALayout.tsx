// ============================================================
// PWA LAYOUT — Feirinha Orgânica Terra Viva
// Registra Service Worker e renderiza botão de instalação
// ============================================================

import { useEffect } from "react";
import { PWAInstallButton } from "./PWAInstallButton";

export function PWALayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Registra o Service Worker
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[PWA] SW registrado:", registration.scope);

          // Verifica atualizações do SW
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // Nova versão disponível
                  console.log("[PWA] Nova versão disponível. Recarregue para atualizar.");
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn("[PWA] Erro ao registrar SW:", err);
        });
    }
  }, []);

  return (
    <>
      {children}
      <PWAInstallButton />
    </>
  );
}