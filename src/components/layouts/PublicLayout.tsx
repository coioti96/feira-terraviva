import { Link } from "@tanstack/react-router";
import {
  Leaf,
  MessageCircle,
  MapPin,
  Clock,
  Phone,
  Mail,
  Instagram,
  Facebook,
  ArrowUpRight,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settings";
import { MobileNav } from "./MobileNav";
import { HeaderActions } from "./HeaderActions";
import { PWAInstallButton } from "@/components/pwa/PWAInstallButton";
import { useRegisterSW } from "@/hooks/useRegisterSW";
import type { ReactNode } from "react";
import { useEffect } from "react";

const WEEKDAYS = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terça" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
] as const;

export function PublicLayout({ children }: { children: ReactNode }) {
  const { settings, fetchSettings } = useSettingsStore();

  // Registra Service Worker (só em produção)
  useRegisterSW();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const today = new Date().getDay();
  const todayKey = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][today] as keyof typeof settings.opening_hours;
  const todayHours = settings.opening_hours?.[todayKey];

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/85 border-b border-stone-200/60 shadow-sm shadow-stone-900/5">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 group">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt={settings.name}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-100 shadow-md"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white grid place-items-center shadow-md shadow-emerald-500/20 ring-2 ring-emerald-100">
                <Leaf className="h-5 w-5" />
              </div>
            )}
            <div className="hidden sm:block leading-tight">
              <div className="font-serif text-[17px] font-semibold text-stone-800">
                {settings.name?.split(" - ")[0] || "Feirinha Orgânica"}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-medium">
                Terra Viva
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium">
            <Link to="/" className="text-stone-600 hover:text-emerald-600 transition-colors">
              Início
            </Link>
            <Link to="/produtos" className="text-stone-600 hover:text-emerald-600 transition-colors">
              Produtos
            </Link>
            <Link to="/pedidos" className="text-stone-600 hover:text-emerald-600 transition-colors">
              Meus Pedidos
            </Link>
            <Link to="/perfil" className="text-stone-600 hover:text-emerald-600 transition-colors">
              Perfil
            </Link>
          </nav>

          <HeaderActions />
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200/60 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 md:grid-cols-3 lg:grid-cols-4">
            {/* Marca */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3">
                {settings.logo_url ? (
                  <img
                    src={settings.logo_url}
                    alt={settings.name}
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-100"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white grid place-items-center shadow-md">
                    <Leaf className="h-6 w-6" />
                  </div>
                )}
                <div>
                  <div className="font-serif text-lg font-semibold text-stone-800">
                    {settings.name?.split(" - ")[0] || "Feirinha Orgânica"}
                  </div>
                  <div className="text-[11px] text-stone-400">Terra Viva</div>
                </div>
              </div>
              <p className="mt-4 text-[13px] text-stone-500 leading-relaxed max-w-xs">
                {settings.description || "Produtos orgânicos frescos da terra para sua mesa. Qualidade, sabor e saúde em cada entrega."}
              </p>
            </div>

            {/* Horário */}
            <div>
              <h4 className="text-[13px] font-semibold text-stone-800 uppercase tracking-wider mb-4">
                Horário de Funcionamento
              </h4>
              <ul className="space-y-2 text-[13px]">
                {WEEKDAYS.map(({ key, label }) => {
                  const hours = settings.opening_hours?.[key as keyof typeof settings.opening_hours];
                  const isToday = key === todayKey;
                  return (
                    <li
                      key={key}
                      className={`flex justify-between ${isToday ? "text-emerald-700 font-semibold" : "text-stone-500"}`}
                    >
                      <span>{label}</span>
                      <span>
                        {hours?.closed
                          ? "Fechado"
                          : `${hours?.open || "--:--"} – ${hours?.close || "--:--"}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {todayHours && !todayHours.closed && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 text-[11px] font-medium">
                  <Clock className="h-3 w-3" />
                  Aberto hoje até {todayHours.close}
                </div>
              )}
            </div>

            {/* Contato */}
            <div>
              <h4 className="text-[13px] font-semibold text-stone-800 uppercase tracking-wider mb-4">
                Contato
              </h4>
              <ul className="space-y-3 text-[13px]">
                {settings.address && (
                  <li className="flex items-start gap-2.5 text-stone-500">
                    <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="leading-snug">{settings.address}</span>
                  </li>
                )}
                {settings.phone && (
                  <li className="flex items-center gap-2.5 text-stone-500">
                    <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{settings.phone}</span>
                  </li>
                )}
                {settings.email && (
                  <li className="flex items-center gap-2.5 text-stone-500">
                    <Mail className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{settings.email}</span>
                  </li>
                )}
                {settings.whatsapp && (
                  <li>
                    <a
                      href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2.5 text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>WhatsApp</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {/* Redes */}
            <div>
              <h4 className="text-[13px] font-semibold text-stone-800 uppercase tracking-wider mb-4">
                Redes Sociais
              </h4>
              <div className="flex gap-3">
                <a
                  href="#"
                  className="h-10 w-10 rounded-full bg-stone-100 hover:bg-emerald-50 text-stone-400 hover:text-emerald-600 grid place-items-center transition-colors"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="h-10 w-10 rounded-full bg-stone-100 hover:bg-emerald-50 text-stone-400 hover:text-emerald-600 grid place-items-center transition-colors"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-10 pt-6 border-t border-stone-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-stone-400">
            <span>
              © {new Date().getFullYear()} {settings.name || "Feirinha Orgânica Terra Viva"}. Todos os direitos reservados.
            </span>
            <span className="flex items-center gap-1">
              Feito com <Leaf className="h-3 w-3 text-emerald-500" /> em terras brasileiras
            </span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Nav */}
      <MobileNav />

      {/* PWA Install Button — aparece em todas as telas */}
      <PWAInstallButton />
    </div>
  );
}