// ============================================================
// USE REGISTER SW — Feirinha Orgânica Terra Viva
// Hook para registrar o Service Worker do PWA
// ============================================================

import { useEffect } from "react";

export function useRegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    // Só registra em produção (build)
    if (import.meta.env.DEV) {
      console.log("[PWA] Modo dev — SW não registrado");
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        console.log("[PWA] SW registrado:", registration.scope);

        // Detecta nova versão
        registration.addEventListener("updatefound", () => {
          const newWorker = registration?.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                console.log("[PWA] Nova versão disponível. Recarregue para atualizar.");
                // Pode mostrar um toast aqui se quiser
              }
            });
          }
        });
      } catch (err) {
        console.warn("[PWA] Erro ao registrar SW:", err);
      }
    };

    // Aguarda a página carregar completamente
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
    }

    return () => {
      window.removeEventListener("load", register);
    };
  }, []);
}