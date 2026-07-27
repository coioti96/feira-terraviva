// ============================================================
// PWA INSTALL BUTTON — Feirinha Orgânica Terra Viva
// Botão flutuante discreto para instalar o app
// Aparece em todas as telas quando o app é instalável
// ============================================================

import { useState, useEffect, useCallback } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      toast.success("App instalado com sucesso!");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        toast.info(
          "Para instalar no iPhone: toque em Compartilhar → Adicionar à Tela de Início",
          { duration: 6000 }
        );
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast.success("Instalando app...");
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("[PWA] Erro ao instalar:", err);
      toast.error("Erro ao instalar. Tente novamente.");
    }
  }, [deferredPrompt, isIOS]);

  const dismiss = useCallback(() => {
    setDeferredPrompt(null);
  }, []);

  return {
    isInstallable: !!deferredPrompt || isIOS,
    isInstalled,
    isIOS,
    promptInstall,
    dismiss,
  };
}

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, promptInstall, dismiss } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("pwa-install-dismissed");
    if (wasDismissed) setDismissed(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    sessionStorage.setItem("pwa-install-dismissed", "true");
    dismiss();
  }, [dismiss]);

  if (!isInstallable || isInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-3 px-4 py-3 bg-emerald-900 text-white rounded-full shadow-lg animate-fade-up max-w-[calc(100%-2rem)] whitespace-nowrap">
      <Smartphone className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium overflow-hidden text-ellipsis">
        {isIOS ? "Adicione à tela de início" : "Instalar app Terra Viva"}
      </span>
      <button
        onClick={promptInstall}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-full transition-colors"
      >
        <Download className="h-3 w-3" />
        {isIOS ? "Como fazer" : "Instalar"}
      </button>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 text-white/60 hover:text-white transition-colors"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}