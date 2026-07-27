import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Store,
  Save,
  Upload,
  Palette,
  Clock,
  Truck,
  CreditCard,
  Info,
  Loader2,
  Image as ImageIcon,
  Check,
  Leaf,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Instagram,
  Facebook,
  Globe,
  ChevronRight,
  Eye,
  EyeOff,
  Zap,
  Link2,
  Unlink,
  AlertCircle,
  ShieldCheck,
  QrCode,
} from "lucide-react";
import { useSettingsStore } from "@/stores/settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { StoreSettings } from "@/types";
import {
  getMercadoPagoAuthUrl,
  disconnectMercadoPago,
  getMercadoPagoStatus,
} from "@/utils/server-function/mercado-pago";

/* ──────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────── */
const WEEKDAYS = [
  { key: "monday", label: "Segunda-feira", short: "Seg" },
  { key: "tuesday", label: "Terça-feira", short: "Ter" },
  { key: "wednesday", label: "Quarta-feira", short: "Qua" },
  { key: "thursday", label: "Quinta-feira", short: "Qui" },
  { key: "friday", label: "Sexta-feira", short: "Sex" },
  { key: "saturday", label: "Sábado", short: "Sáb" },
  { key: "sunday", label: "Domingo", short: "Dom" },
] as const;

const TABS = [
  { value: "info", label: "Loja", icon: Store },
  { value: "appearance", label: "Aparência", icon: Palette },
  { value: "hours", label: "Horários", icon: Clock },
  { value: "delivery", label: "Entrega", icon: Truck },
  { value: "payments", label: "Pagamentos", icon: CreditCard },
  { value: "about", label: "Sobre", icon: Info },
] as const;

type Tab = (typeof TABS)[number]["value"];

/* ──────────────────────────────────────────────────────
   ROUTE
────────────────────────────────────────────────────── */
export const Route = createFileRoute(
  "/_authenticated/admin/configuracoes"
)({
  head: () => ({ meta: [{ title: "Configurações — Terra Viva Admin" }] }),
  component: ConfiguracoesPage,
});

/* ──────────────────────────────────────────────────────
   SUB-COMPONENTS
────────────────────────────────────────────────────── */

/** Bloco de seção com título e conteúdo */
function Section({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--tv-white)",
        borderRadius: "var(--r-2xl)",
        border: "1px solid var(--tv-stone-200)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "var(--space-5) var(--space-6) var(--space-4)",
          borderBottom: "1px solid var(--tv-stone-100)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-3)",
        }}
      >
        {Icon && (
          <div
            style={{
              height: 36,
              width: 36,
              borderRadius: "var(--r-lg)",
              background: "var(--tv-success-lt)",
              color: "var(--tv-success)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={16} />
          </div>
        )}
        <div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              color: "var(--tv-forest)",
              lineHeight: 1.2,
            }}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--tv-stone-400)",
                marginTop: 2,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div style={{ padding: "var(--space-5) var(--space-6)" }}>{children}</div>
    </div>
  );
}

/** Campo de formulário com label */
function Field({
  label,
  hint,
  required,
  children,
  span2 = false,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  span2?: boolean;
}) {
  return (
    <div style={span2 ? { gridColumn: "1 / -1" } : {}}>
      <Label
        className="tv-label"
        style={{ marginBottom: "var(--space-2)" }}
      >
        {label}
        {required && (
          <span style={{ color: "var(--tv-danger)", marginLeft: 2 }}>*</span>
        )}
      </Label>
      {children}
      {hint && (
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--tv-stone-400)",
            marginTop: "var(--space-1)",
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/** Toggle de pagamento estilizado */
function PaymentToggle({
  icon: Icon,
  label,
  desc,
  checked,
  onCheckedChange,
  iconBg = "var(--tv-success-lt)",
  iconColor = "var(--tv-success)",
  children,
}: {
  icon: React.ElementType;
  label: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  iconBg?: string;
  iconColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-4)",
          borderRadius: "var(--r-xl)",
          background: checked ? "var(--tv-success-lt)" : "var(--tv-cream)",
          border: `1.5px solid ${checked ? "var(--tv-moss-lt)" : "var(--tv-stone-200)"}`,
          transition: "all var(--duration-normal) var(--ease-out)",
          gap: "var(--space-3)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              height: 40,
              width: 40,
              borderRadius: "var(--r-lg)",
              background: iconBg,
              color: iconColor,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={18} />
          </div>
          <div>
            <div
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: 600,
                color: "var(--tv-stone-800)",
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--tv-stone-400)",
              }}
            >
              {desc}
            </div>
          </div>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
      {checked && children && (
        <div style={{ marginTop: "var(--space-3)", marginLeft: "var(--space-5)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

/** Preview de cor */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-600)", display: "block", marginBottom: "var(--space-2)" }}>
        {label}
      </Label>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <label
          style={{
            height: 44,
            width: 44,
            borderRadius: "var(--r-lg)",
            overflow: "hidden",
            border: "2px solid var(--tv-stone-200)",
            cursor: "pointer",
            flexShrink: 0,
            display: "block",
          }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              height: "200%",
              width: "200%",
              marginTop: "-50%",
              marginLeft: "-50%",
              border: "none",
              cursor: "pointer",
            }}
          />
        </label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="tv-input"
          style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", flex: 1 }}
          placeholder="#059669"
        />
        <div
          style={{
            height: 44,
            width: 44,
            borderRadius: "var(--r-lg)",
            background: value,
            flexShrink: 0,
            boxShadow: "var(--shadow-sm)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   MERCADO PAGO CONNECTION COMPONENT
────────────────────────────────────────────────────── */
function MercadoPagoConnection({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [status, setStatus] = useState<{
    connected: boolean;
    account_name?: string;
    account_email?: string;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Busca status ao montar e quando enabled muda
  useEffect(() => {
    if (!enabled) {
      setStatus(null);
      return;
    }
    loadStatus();
  }, [enabled]);

  async function loadStatus() {
    setLoadingStatus(true);
    try {
      const result = await getMercadoPagoStatus();
      setStatus(result);
    } catch (err) {
      console.error("[MercadoPagoConnection] Erro ao buscar status:", err);
    } finally {
      setLoadingStatus(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const result = await getMercadoPagoAuthUrl();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // Abre popup de autorização
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        result.url,
        "mercado_pago_auth",
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );

      if (!popup) {
        toast.error("Permita popups para conectar com Mercado Pago");
        // Fallback: redireciona na mesma janela
        window.location.href = result.url;
        return;
      }

      // Poll para verificar se popup fechou
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setConnecting(false);
          loadStatus();
          // Verifica se conectou verificando a URL
          onToggle(true);
          toast.success("Conexão com Mercado Pago atualizada");
        }
      }, 1000);

      // Timeout de 5 minutos
      setTimeout(() => {
        clearInterval(checkClosed);
        if (!popup.closed) popup.close();
        setConnecting(false);
      }, 5 * 60 * 1000);

    } catch (err) {
      toast.error("Erro ao iniciar conexão");
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Deseja desconectar sua conta do Mercado Pago? Os pagamentos via PIX não estarão mais disponíveis.")) {
      return;
    }
    setDisconnecting(true);
    try {
      const result = await disconnectMercadoPago();
      if (result.success) {
        setStatus(null);
        onToggle(false);
        toast.success("Conta desconectada com sucesso");
      } else {
        toast.error(result.error || "Erro ao desconectar");
      }
    } catch {
      toast.error("Erro ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  }

  const isConnected = status?.connected && enabled;

  return (
    <div>
      <PaymentToggle
        icon={QrCode}
        label="Mercado Pago PIX"
        desc="QR Code automático com confirmação instantânea"
        checked={enabled}
        onCheckedChange={(v) => {
          if (v && !isConnected) {
            // Ativa toggle mas precisa conectar
            onToggle(true);
            handleConnect();
          } else if (!v) {
            onToggle(false);
            if (isConnected) handleDisconnect();
          }
        }}
        iconBg="var(--tv-info-lt)"
        iconColor="var(--tv-info)"
      >
        {/* Painel de conexão */}
        <div
          style={{
            padding: "var(--space-4)",
            background: "var(--tv-cream)",
            borderRadius: "var(--r-xl)",
            border: "1px solid var(--tv-stone-200)",
          }}
        >
          {loadingStatus ? (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", color: "var(--tv-stone-400)" }}>
              <Loader2 size={14} style={{ animation: "tv-spin-slow 0.8s linear infinite" }} />
              <span style={{ fontSize: "var(--text-sm)" }}>Verificando conexão...</span>
            </div>
          ) : isConnected ? (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  marginBottom: "var(--space-3)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "var(--tv-success-lt)",
                    color: "var(--tv-success)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--tv-forest)" }}>
                    {status?.account_name || "Conta conectada"}
                  </div>
                  {status?.account_email && (
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)" }}>
                      {status.account_email}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 2,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "var(--tv-success)",
                      }}
                    />
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--tv-success)", fontWeight: 500 }}>
                      Conectado e ativo
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="tv-btn tv-btn--secondary tv-btn--sm"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
              >
                {disconnecting ? (
                  <Loader2 size={12} style={{ animation: "tv-spin-slow 0.8s linear infinite" }} />
                ) : (
                  <Unlink size={12} />
                )}
                {disconnecting ? "Desconectando..." : "Desconectar conta"}
              </button>
            </div>
          ) : enabled ? (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  marginBottom: "var(--space-3)",
                  color: "var(--tv-warning)",
                }}
              >
                <AlertCircle size={14} />
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>
                  Conta não conectada
                </span>
              </div>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="tv-btn tv-btn--primary tv-btn--sm"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
              >
                {connecting ? (
                  <Loader2 size={12} style={{ animation: "tv-spin-slow 0.8s linear infinite" }} />
                ) : (
                  <Link2 size={12} />
                )}
                {connecting ? "Abrindo Mercado Pago..." : "Conectar com Mercado Pago"}
              </button>
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--tv-stone-400)",
                  marginTop: "var(--space-2)",
                }}
              >
                Você será redirecionado para o Mercado Pago para autorizar o acesso.
              </p>
            </div>
          ) : null}
        </div>
      </PaymentToggle>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   MAIN PAGE
────────────────────────────────────────────────────── */
function ConfiguracoesPage() {
  const { settings, isLoading, fetchSettings, updateSettings, uploadStoreImage } =
    useSettingsStore();
  const [form, setForm] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [saved, setSaved] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  // Verifica query params (retorno do MP OAuth)
  useEffect(() => {
    const url = new URL(window.location.href);
    const mpStatus = url.searchParams.get("mp");
    const tabParam = url.searchParams.get("tab");
    
    if (tabParam && TABS.some(t => t.value === tabParam)) {
      setActiveTab(tabParam as Tab);
    }
    
    if (mpStatus === "connected") {
      toast.success("Mercado Pago conectado com sucesso!");
      // Limpa query params
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  function handleChange<K extends keyof StoreSettings>(
    field: K,
    value: StoreSettings[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const ok = await updateSettings(form);
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast.success("Configurações salvas com sucesso!");
    } else {
      toast.error("Erro ao salvar configurações");
    }
  }

  async function handleUpload(type: "logo" | "cover", file: File) {
    setUploading(type);
    try {
      const result = await uploadStoreImage(type, file);
      if (result.success && result.publicUrl) {
        handleChange(
          type === "logo" ? "logo_url" : "cover_url",
          result.publicUrl
        );
        toast.success(
          `${type === "logo" ? "Logo" : "Capa"} enviada com sucesso!`
        );
      } else {
        toast.error(result.error || "Erro no upload");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(null);
    }
  }

  function updateHours(
    day: string,
    field: "open" | "close" | "closed",
    value: string | boolean
  ) {
    setForm((prev) => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: {
          ...(prev.opening_hours?.[
            day as keyof typeof prev.opening_hours
          ] ?? {}),
          [field]: value,
        },
      },
    }));
  }

  /* ── RENDER ── */
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          {/* Logo preview */}
          <div
            style={{
              height: 52,
              width: 52,
              borderRadius: "50%",
              overflow: "hidden",
              flexShrink: 0,
              boxShadow: "var(--shadow-md)",
              border: "2px solid var(--tv-stone-200)",
            }}
          >
            {form.logo_url ? (
              <img
                src={form.logo_url}
                alt="Logo"
                style={{ height: "100%", width: "100%", objectFit: "cover" }}
              />
            ) : (
              <img
                src="/icons/maskable_icon.png"
                alt="Terra Viva"
                style={{ height: "100%", width: "100%", objectFit: "cover" }}
              />
            )}
          </div>
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-3xl)",
                fontWeight: 700,
                color: "var(--tv-forest)",
                lineHeight: 1.1,
              }}
            >
              Configurações
            </h1>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--tv-stone-400)",
                marginTop: "var(--space-1)",
              }}
            >
              {form.name || "Terra Viva"} · Personalize sua loja
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || isLoading}
          className="tv-btn tv-btn--primary"
          style={{ minWidth: 120 }}
        >
          {saving ? (
            <Loader2 size={16} style={{ animation: "tv-spin-slow 0.8s linear infinite" }} />
          ) : saved ? (
            <Check size={16} />
          ) : (
            <Save size={16} />
          )}
          {saving ? "Salvando…" : saved ? "Salvo!" : "Salvar"}
        </button>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: "var(--space-1)",
          overflowX: "auto",
          scrollbarWidth: "none",
          background: "var(--tv-cream)",
          borderRadius: "var(--r-2xl)",
          padding: "var(--space-1)",
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value as Tab)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-4)",
                borderRadius: "var(--r-xl)",
                fontSize: "var(--text-sm)",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--tv-moss)" : "var(--tv-stone-500)",
                background: isActive ? "var(--tv-white)" : "transparent",
                boxShadow: isActive ? "var(--shadow-sm)" : "none",
                whiteSpace: "nowrap",
                transition: "all var(--duration-fast) ease",
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <tab.icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB: INFORMAÇÕES ── */}
      {activeTab === "info" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Section
            title="Informações da Loja"
            subtitle="Dados públicos exibidos para os clientes"
            icon={Store}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              <Field label="Nome da loja" required>
                <Input
                  value={form.name || ""}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Feirinha Orgânica – Terra Viva"
                  className="tv-input"
                />
              </Field>
              <Field label="E-mail">
                <div style={{ position: "relative" }}>
                  <Mail
                    size={14}
                    style={{
                      position: "absolute",
                      left: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--tv-stone-400)",
                      pointerEvents: "none",
                    }}
                  />
                  <Input
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="contato@terraviva.com"
                    className="tv-input"
                    style={{ paddingLeft: "2.25rem" }}
                  />
                </div>
              </Field>
              <Field label="Telefone">
                <div style={{ position: "relative" }}>
                  <Phone
                    size={14}
                    style={{
                      position: "absolute",
                      left: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--tv-stone-400)",
                      pointerEvents: "none",
                    }}
                  />
                  <Input
                    value={form.phone || ""}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="(14) 99999-9999"
                    className="tv-input"
                    style={{ paddingLeft: "2.25rem" }}
                  />
                </div>
              </Field>
              <Field
                label="WhatsApp"
                hint="Formato internacional: 5511999999999"
              >
                <div style={{ position: "relative" }}>
                  <MessageCircle
                    size={14}
                    style={{
                      position: "absolute",
                      left: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--tv-stone-400)",
                      pointerEvents: "none",
                    }}
                  />
                  <Input
                    value={form.whatsapp || ""}
                    onChange={(e) => handleChange("whatsapp", e.target.value)}
                    placeholder="5514999999999"
                    className="tv-input"
                    style={{ paddingLeft: "2.25rem" }}
                  />
                </div>
              </Field>
              <Field label="Endereço completo" span2>
                <div style={{ position: "relative" }}>
                  <MapPin
                    size={14}
                    style={{
                      position: "absolute",
                      left: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--tv-stone-400)",
                      pointerEvents: "none",
                    }}
                  />
                  <Input
                    value={form.address || ""}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Rua das Flores, 123 – Centro, Marília – SP"
                    className="tv-input"
                    style={{ paddingLeft: "2.25rem" }}
                  />
                </div>
              </Field>
              <Field label="Descrição da loja" span2>
                <Textarea
                  value={form.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Produtos orgânicos frescos da terra para sua mesa…"
                  rows={3}
                  className="tv-input"
                  style={{ resize: "none", lineHeight: 1.65 }}
                />
              </Field>
            </div>
          </Section>

          {/* Redes sociais */}
          <Section
            title="Redes Sociais & Links"
            subtitle="Exibidos no rodapé e na página Sobre"
            icon={Globe}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              {[
                { icon: Instagram, field: "instagram_url" as const, label: "Instagram", placeholder: "https://instagram.com/terraviva" },
                { icon: Facebook, field: "facebook_url" as const, label: "Facebook", placeholder: "https://facebook.com/terraviva" },
                { icon: Globe, field: "google_maps_url" as const, label: "Google Maps", placeholder: "https://maps.google.com/…" },
              ].map(({ icon: Icon, field, label, placeholder }) => (
                <Field key={field} label={label}>
                  <div style={{ position: "relative" }}>
                    <Icon
                      size={14}
                      style={{
                        position: "absolute",
                        left: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--tv-stone-400)",
                        pointerEvents: "none",
                      }}
                    />
                    <Input
                      value={(form[field] as string) || ""}
                      onChange={(e) => handleChange(field, e.target.value)}
                      placeholder={placeholder}
                      className="tv-input"
                      style={{ paddingLeft: "2.25rem" }}
                    />
                  </div>
                </Field>
              ))}
            </div>
          </Section>

          {/* Imagens */}
          <Section
            title="Imagens da Loja"
            subtitle="Logo redonda e imagem de capa do hero"
            icon={ImageIcon}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "var(--space-6)",
              }}
            >
              {/* Logo */}
              <div>
                <Label style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-600)", display: "block", marginBottom: "var(--space-3)" }}>
                  Logo da loja
                </Label>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)" }}>
                  <div
                    style={{
                      height: 80,
                      width: 80,
                      borderRadius: "50%",
                      overflow: "hidden",
                      border: "2px solid var(--tv-stone-200)",
                      background: "var(--tv-stone-100)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {form.logo_url ? (
                      <img
                        src={form.logo_url}
                        alt="Logo"
                        style={{ height: "100%", width: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <img
                        src="/icons/maskable_icon.png"
                        alt="Logo padrão"
                        style={{ height: "100%", width: "100%", objectFit: "cover" }}
                      />
                    )}
                  </div>
                  <div>
                    <input
                      ref={logoRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload("logo", file);
                      }}
                    />
                    <button
                      className="tv-btn tv-btn--secondary tv-btn--sm"
                      onClick={() => logoRef.current?.click()}
                      disabled={uploading === "logo"}
                    >
                      {uploading === "logo" ? (
                        <Loader2 size={14} style={{ animation: "tv-spin-slow 0.8s linear infinite" }} />
                      ) : (
                        <Upload size={14} />
                      )}
                      {form.logo_url ? "Trocar logo" : "Enviar logo"}
                    </button>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)", marginTop: "var(--space-2)" }}>
                      PNG ou JPG · Mín. 256×256px
                    </p>
                  </div>
                </div>
              </div>

              {/* Cover */}
              <div>
                <Label style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-600)", display: "block", marginBottom: "var(--space-3)" }}>
                  Imagem de capa (hero)
                </Label>
                {form.cover_url ? (
                  <img
                    src={form.cover_url}
                    alt="Capa"
                    style={{
                      width: "100%",
                      height: 120,
                      objectFit: "cover",
                      borderRadius: "var(--r-xl)",
                      marginBottom: "var(--space-3)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: 120,
                      borderRadius: "var(--r-xl)",
                      background: "var(--tv-stone-100)",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--tv-stone-300)",
                      marginBottom: "var(--space-3)",
                      border: "1.5px dashed var(--tv-stone-200)",
                    }}
                  >
                    <ImageIcon size={32} />
                  </div>
                )}
                <input
                  ref={coverRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload("cover", file);
                  }}
                />
                <button
                  className="tv-btn tv-btn--secondary tv-btn--sm"
                  onClick={() => coverRef.current?.click()}
                  disabled={uploading === "cover"}
                >
                  {uploading === "cover" ? (
                    <Loader2 size={14} style={{ animation: "tv-spin-slow 0.8s linear infinite" }} />
                  ) : (
                    <Upload size={14} />
                  )}
                  {form.cover_url ? "Trocar capa" : "Enviar capa"}
                </button>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ── TAB: APARÊNCIA ── */}
      {activeTab === "appearance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Section
            title="Cores da Marca"
            subtitle="Definem botões, badges e acentos em toda a loja"
            icon={Palette}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "var(--space-6)",
              }}
            >
              <ColorField
                label="Cor primária (botões e destaques)"
                value={form.primary_color || "#059669"}
                onChange={(v) => handleChange("primary_color", v)}
              />
              <ColorField
                label="Cor secundária (badges e promoções)"
                value={form.secondary_color || "#d97706"}
                onChange={(v) => handleChange("secondary_color", v)}
              />
            </div>

            {/* Preview live */}
            <div
              style={{
                marginTop: "var(--space-6)",
                padding: "var(--space-5)",
                borderRadius: "var(--r-xl)",
                background: "var(--tv-cream)",
                border: "1px solid var(--tv-stone-200)",
              }}
            >
              <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--tv-stone-500)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "var(--space-4)" }}>
                Pré-visualização
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
                <button
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "0.625rem 1.25rem",
                    borderRadius: 9999,
                    background: form.primary_color || "#059669",
                    color: "white",
                    fontSize: "var(--text-sm)",
                    fontWeight: 500,
                    border: "none",
                    cursor: "default",
                  }}
                >
                  <Leaf size={14} />
                  Comprar agora
                </button>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    padding: "4px 12px",
                    borderRadius: 9999,
                    background: form.secondary_color || "#d97706",
                    color: "white",
                    fontSize: "var(--text-xs)",
                    fontWeight: 600,
                  }}
                >
                  Promoção
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    padding: "4px 12px",
                    borderRadius: 9999,
                    background: form.primary_color ? `${form.primary_color}22` : "#05966922",
                    color: form.primary_color || "#059669",
                    fontSize: "var(--text-xs)",
                    fontWeight: 600,
                  }}
                >
                  <Leaf size={11} />
                  Orgânico
                </span>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ── TAB: HORÁRIOS ── */}
      {activeTab === "hours" && (
        <Section
          title="Horário de Funcionamento"
          subtitle="Exibido no rodapé e no status da loja no topo da home"
          icon={Clock}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {WEEKDAYS.map(({ key, label, short }) => {
              const hours = form.opening_hours?.[key as keyof typeof form.opening_hours];
              const isClosed = hours?.closed ?? false;
              return (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-4)",
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--r-xl)",
                    background: isClosed ? "var(--tv-cream)" : "var(--tv-success-lt)",
                    border: `1px solid ${isClosed ? "var(--tv-stone-200)" : "var(--tv-moss-lt)"}`,
                    transition: "all var(--duration-normal) ease",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Dia */}
                  <div style={{ minWidth: 100, flexShrink: 0 }}>
                    <span
                      style={{
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        color: isClosed ? "var(--tv-stone-400)" : "var(--tv-forest)",
                      }}
                    >
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">{short}</span>
                    </span>
                  </div>

                  {/* Toggle */}
                  <Switch
                    checked={!isClosed}
                    onCheckedChange={(checked) =>
                      updateHours(key, "closed", !checked)
                    }
                  />

                  {/* Horários */}
                  {!isClosed ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-2)",
                        flex: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Input
                        type="time"
                        value={hours?.open || "08:00"}
                        onChange={(e) => updateHours(key, "open", e.target.value)}
                        className="tv-input"
                        style={{ width: 112, fontSize: "var(--text-sm)" }}
                      />
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)" }}>
                        até
                      </span>
                      <Input
                        type="time"
                        value={hours?.close || "18:00"}
                        onChange={(e) => updateHours(key, "close", e.target.value)}
                        className="tv-input"
                        style={{ width: 112, fontSize: "var(--text-sm)" }}
                      />
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--tv-stone-400)",
                        fontStyle: "italic",
                      }}
                    >
                      Fechado
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ── TAB: ENTREGA ── */}
      {activeTab === "delivery" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Section
            title="Configurações de Entrega"
            subtitle="Informações exibidas na home e no checkout"
            icon={Truck}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              <Field label="Taxa de entrega (R$)">
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.delivery_fee || 0}
                  onChange={(e) =>
                    handleChange("delivery_fee", parseFloat(e.target.value) || 0)
                  }
                  className="tv-input"
                />
              </Field>

              <Field label="Tempo estimado (min)">
                <Input
                  type="number"
                  min={1}
                  value={form.delivery_time_min || 30}
                  onChange={(e) =>
                    handleChange(
                      "delivery_time_min",
                      parseInt(e.target.value) || 30
                    )
                  }
                  className="tv-input"
                />
              </Field>

              <Field label="Raio de entrega (km)">
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  value={form.delivery_radius_km || 5}
                  onChange={(e) =>
                    handleChange(
                      "delivery_radius_km",
                      parseFloat(e.target.value) || 5
                    )
                  }
                  className="tv-input"
                />
              </Field>

              <Field label="Grátis acima de (R$)" hint="Deixe 0 para desativar">
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.free_delivery_above ?? 0}
                  onChange={(e) =>
                    handleChange(
                      "free_delivery_above",
                      parseFloat(e.target.value) || null
                    )
                  }
                  className="tv-input"
                />
              </Field>
            </div>

            {/* Tipo de taxa */}
            <div style={{ marginTop: "var(--space-5)" }}>
              <Label style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-600)", display: "block", marginBottom: "var(--space-3)" }}>
                Tipo de taxa de entrega
              </Label>
              <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
                {(
                  [
                    { value: "fixed", label: "Taxa fixa", desc: "Sempre o mesmo valor" },
                    { value: "distance", label: "Por distância", desc: "Varia com o km" },
                    { value: "free_above", label: "Grátis acima de", desc: "Acima de um valor" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleChange("delivery_type", opt.value)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 2,
                      padding: "var(--space-3) var(--space-4)",
                      borderRadius: "var(--r-xl)",
                      border: `1.5px solid ${form.delivery_type === opt.value ? "var(--tv-moss-lt)" : "var(--tv-stone-200)"}`,
                      background:
                        form.delivery_type === opt.value
                          ? "var(--tv-success-lt)"
                          : "var(--tv-white)",
                      cursor: "pointer",
                      transition: "all var(--duration-fast) ease",
                      minWidth: 140,
                    }}
                  >
                    <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: form.delivery_type === opt.value ? "var(--tv-moss)" : "var(--tv-stone-700)" }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)" }}>
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ── TAB: PAGAMENTOS ── */}
      {activeTab === "payments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Section
            title="Formas de Pagamento"
            subtitle="Ative as formas aceitas — exibidas na home e no checkout"
            icon={CreditCard}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {/* PIX */}
              <PaymentToggle
                icon={Zap}
                label="PIX Manual"
                desc="Chave PIX informada pelo cliente — sem confirmação automática"
                checked={form.pix_enabled || false}
                onCheckedChange={(v) => handleChange("pix_enabled", v)}
                iconBg="var(--tv-success-lt)"
                iconColor="var(--tv-success)"
              >
                <div
                  style={{
                    padding: "var(--space-4)",
                    borderRadius: "var(--r-xl)",
                    background: "var(--tv-cream)",
                    border: "1px solid var(--tv-stone-200)",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "var(--space-4)",
                  }}
                >
                  <Field label="Chave PIX">
                    <Input
                      value={form.pix_key || ""}
                      onChange={(e) => handleChange("pix_key", e.target.value)}
                      placeholder="Sua chave PIX"
                      className="tv-input"
                    />
                  </Field>
                  <Field label="Tipo da chave">
                    <select
                      value={form.pix_key_type || ""}
                      onChange={(e) =>
                        handleChange(
                          "pix_key_type",
                          e.target.value as StoreSettings["pix_key_type"]
                        )
                      }
                      className="tv-input"
                      style={{ cursor: "pointer" }}
                    >
                      <option value="">Selecione…</option>
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                      <option value="email">E-mail</option>
                      <option value="phone">Telefone</option>
                      <option value="random">Chave aleatória</option>
                    </select>
                  </Field>
                </div>
              </PaymentToggle>

              {/* Mercado Pago PIX */}
              <MercadoPagoConnection
                enabled={form.mercado_pago_enabled || false}
                onToggle={(v) => handleChange("mercado_pago_enabled", v)}
              />

              {/* Dinheiro */}
              <PaymentToggle
                icon={CreditCard}
                label="Dinheiro na entrega"
                desc="Pagamento em espécie no ato da entrega"
                checked={form.cash_enabled !== false}
                onCheckedChange={(v) => handleChange("cash_enabled", v)}
                iconBg="var(--tv-warning-lt)"
                iconColor="var(--tv-terracota-dk)"
              />

              {/* Cartão */}
              <PaymentToggle
                icon={CreditCard}
                label="Cartão na entrega"
                desc="Maquininha levada pelo entregador"
                checked={form.card_enabled !== false}
                onCheckedChange={(v) => handleChange("card_enabled", v)}
                iconBg="var(--tv-info-lt)"
                iconColor="var(--tv-info)"
              />
            </div>

            {/* Resumo visual */}
            <div
              style={{
                marginTop: "var(--space-5)",
                padding: "var(--space-4)",
                borderRadius: "var(--r-xl)",
                background: "var(--tv-cream)",
                border: "1px solid var(--tv-stone-200)",
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-3)",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-500)", fontWeight: 600 }}>
                Exibido na home:
              </span>
              {form.pix_enabled && (
                <span
                  className="tv-status tv-status--delivered"
                  style={{ paddingInline: "var(--space-3)" }}
                >
                  PIX Manual
                </span>
              )}
              {form.mercado_pago_enabled && (
                <span
                  className="tv-status tv-status--confirmed"
                  style={{ paddingInline: "var(--space-3)" }}
                >
                  PIX MP
                </span>
              )}
              {form.cash_enabled !== false && (
                <span
                  className="tv-status tv-status--pending"
                  style={{ paddingInline: "var(--space-3)" }}
                >
                  Dinheiro
                </span>
              )}
              {form.card_enabled !== false && (
                <span
                  className="tv-status tv-status--confirmed"
                  style={{ paddingInline: "var(--space-3)" }}
                >
                  Cartão
                </span>
              )}
              {!form.pix_enabled && !form.mercado_pago_enabled && form.cash_enabled === false && form.card_enabled === false && (
                <span style={{ fontSize: "var(--text-xs)", color: "var(--tv-danger)", fontStyle: "italic" }}>
                  Nenhuma forma ativa — ative ao menos uma
                </span>
              )}
            </div>
          </Section>
        </div>
      )}

      {/* ── TAB: SOBRE ── */}
      {activeTab === "about" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Section
            title="Sobre a Loja"
            subtitle="Texto exibido na seção 'Nossa história' da home"
            icon={Info}
          >
            <Field
              label="Texto sobre nós"
              hint="Conte a história da sua feirinha. Aparece na home quando preenchido."
            >
              <Textarea
                value={form.about_text || ""}
                onChange={(e) => handleChange("about_text", e.target.value)}
                placeholder="Somos uma família apaixonada pela terra e pelo que ela nos oferece. Nossa horta orgânica nasceu do desejo de levar alimentos saudáveis e frescos para as mesas de Marília…"
                rows={8}
                className="tv-input"
                style={{ resize: "vertical", lineHeight: 1.7 }}
              />
            </Field>

            {form.about_text && (
              <div
                style={{
                  marginTop: "var(--space-5)",
                  padding: "var(--space-5)",
                  borderRadius: "var(--r-xl)",
                  background: "var(--tv-cream)",
                  border: "1px solid var(--tv-stone-200)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    marginBottom: "var(--space-4)",
                  }}
                >
                  <Eye size={14} style={{ color: "var(--tv-stone-400)" }} />
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--tv-stone-500)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                    Pré-visualização
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--space-5)",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      height: 60,
                      width: 60,
                      borderRadius: "50%",
                      overflow: "hidden",
                      flexShrink: 0,
                      opacity: 0.6,
                    }}
                  >
                    <img
                      src={form.logo_url || "/icons/maskable_icon.png"}
                      alt=""
                      style={{ height: "100%", width: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-gold)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "var(--space-2)" }}>
                      Nossa história
                    </p>
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "var(--text-xl)",
                        color: "var(--tv-forest)",
                        fontWeight: 700,
                        marginBottom: "var(--space-3)",
                      }}
                    >
                      Da terra para <em>a sua mesa</em>
                    </h3>
                    <p
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--tv-stone-600)",
                        lineHeight: 1.75,
                        maxWidth: "55ch",
                      }}
                    >
                      {form.about_text.slice(0, 200)}
                      {form.about_text.length > 200 ? "…" : ""}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Section>

          {/* Meta SEO */}
          <Section
            title="SEO & Metadados"
            subtitle="Título e descrição exibidos nos resultados de busca"
            icon={Globe}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <Field label="Título da página (meta title)" hint="Ideal: 50–60 caracteres">
                <Input
                  value={form.meta_title || ""}
                  onChange={(e) => handleChange("meta_title", e.target.value)}
                  placeholder="Feirinha Orgânica Terra Viva — Produtos Frescos em Marília"
                  className="tv-input"
                />
                {form.meta_title && (
                  <p style={{ fontSize: "var(--text-xs)", color: form.meta_title.length > 60 ? "var(--tv-danger)" : "var(--tv-stone-400)", marginTop: "var(--space-1)" }}>
                    {form.meta_title.length}/60 caracteres
                  </p>
                )}
              </Field>
              <Field label="Descrição (meta description)" hint="Ideal: 140–160 caracteres">
                <Textarea
                  value={form.meta_description || ""}
                  onChange={(e) => handleChange("meta_description", e.target.value)}
                  placeholder="Produtos orgânicos frescos com entrega rápida em Marília – SP. Verduras, frutas e legumes colhidos no dia, sem agrotóxicos."
                  rows={3}
                  className="tv-input"
                  style={{ resize: "none" }}
                />
              </Field>
            </div>
          </Section>
        </div>
      )}

      {/* Floating save bar */}
      <div
        style={{
          position: "sticky",
          bottom: "var(--space-5)",
          display: "flex",
          justifyContent: "flex-end",
          pointerEvents: "none",
        }}
      >
        <button
          onClick={handleSave}
          disabled={saving || isLoading}
          className="tv-btn tv-btn--primary"
          style={{
            pointerEvents: "all",
            boxShadow: "var(--shadow-xl)",
          }}
        >
          {saving ? (
            <Loader2 size={16} style={{ animation: "tv-spin-slow 0.8s linear infinite" }} />
          ) : saved ? (
            <Check size={16} />
          ) : (
            <Save size={16} />
          )}
          {saving ? "Salvando…" : saved ? "Salvo!" : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}