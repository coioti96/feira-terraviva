// ============================================================
// PERFIL — Página de Perfil do Cliente
// Feirinha Orgânica Terra Viva · Enterprise
// Visualizar, editar dados, alterar senha, upload de avatar
// ============================================================

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  User, Mail, Phone, MapPin, Home, Hash, Building2, Landmark,
  Camera, Pencil, LogOut, Shield, Crown, Package, Heart,
  ChevronRight, Loader2, Check, X, Eye, EyeOff, Lock,
  Save, ArrowLeft, AlertCircle, ShoppingBag,
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { useAuthStore } from "@/stores/auth";
import { formatCurrency, formatPhone, formatCEP } from "@/lib/utils";
import { getUserOrders } from "@/utils/server-function/orders";
import { updateProfile } from "@/utils/server-function/profile";
import { supabase } from "@/lib/supabase";
import type { Profile, Order } from "@/types";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Terra Viva" },
      { name: "description", content: "Gerencie seus dados e acompanhe seus pedidos." },
    ],
  }),
  component: ProfilePage,
});

/* ────────────────────────────────────────────────────────────
   SECTION CARD
   ──────────────────────────────────────────────────────────── */
function SectionCard({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="tv-card" style={{ marginBottom: "var(--space-5)" }}>
      <div
        className="tv-card__header"
        style={{ padding: "var(--space-4) var(--space-5)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Icon size={18} style={{ color: "var(--tv-moss)" }} />
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              fontWeight: 600,
              color: "var(--tv-forest)",
            }}
          >
            {title}
          </h2>
        </div>
        {action}
      </div>
      <div className="tv-card__body">{children}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   INFO ROW
   ──────────────────────────────────────────────────────────── */
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-3)",
        padding: "var(--space-3) 0",
        borderBottom: "1px solid var(--tv-stone-100)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "var(--r-lg)",
          background: "var(--tv-cream)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={16} style={{ color: "var(--tv-moss)" }} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)", marginBottom: 2 }}>
          {label}
        </p>
        <p
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            color: value ? "var(--tv-stone-800)" : "var(--tv-stone-300)",
            wordBreak: "break-word",
          }}
        >
          {value || "Não informado"}
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   EDIT FORM FIELD
   ──────────────────────────────────────────────────────────── */
function EditField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
  error,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  error?: string;
  icon?: React.ElementType;
}) {
  return (
    <div style={{ marginBottom: "var(--space-3)" }}>
      <label
        style={{
          display: "block",
          fontSize: "var(--text-xs)",
          fontWeight: 600,
          color: "var(--tv-stone-700)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "var(--space-1-5)",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {Icon && (
          <Icon
            size={14}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--tv-stone-400)",
              pointerEvents: "none",
            }}
          />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="tv-input"
          style={{
            paddingLeft: Icon ? 36 : 14,
            borderColor: error ? "var(--tv-danger)" : undefined,
            background: error ? "var(--tv-danger-lt)" : undefined,
          }}
        />
      </div>
      {error && (
        <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-danger)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   ORDER MINI CARD
   ──────────────────────────────────────────────────────────── */
function OrderMiniCard({ order }: { order: Order }) {
  const navigate = useNavigate();
  const statusColors: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: "var(--tv-warning-lt)", color: "var(--tv-terracota-dk)", label: "Pendente" },
    confirmed: { bg: "var(--tv-info-lt)", color: "var(--tv-info)", label: "Confirmado" },
    preparing: { bg: "#e8f5e9", color: "var(--tv-success)", label: "Em preparo" },
    out_for_delivery: { bg: "var(--tv-info-lt)", color: "var(--tv-info)", label: "Saiu p/ entrega" },
    delivered: { bg: "var(--tv-success-lt)", color: "var(--tv-success)", label: "Entregue" },
    cancelled: { bg: "var(--tv-danger-lt)", color: "var(--tv-danger)", label: "Cancelado" },
    refunded: { bg: "var(--tv-danger-lt)", color: "var(--tv-danger)", label: "Reembolsado" },
  };
  const cfg = statusColors[order.status] || statusColors.pending;

  return (
    <div
      onClick={() => navigate({ to: `/pedido/${order.id}` })}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-3) var(--space-4)",
        borderRadius: "var(--r-xl)",
        background: "var(--tv-cream)",
        border: "1px solid var(--tv-stone-200)",
        cursor: "pointer",
        transition: "all var(--duration-fast) ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--tv-moss-lt)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--tv-stone-200)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 2 }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--tv-forest)" }}>
            #{order.order_number}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "var(--r-full)",
              background: cfg.bg,
              color: cfg.color,
            }}
          >
            {cfg.label}
          </span>
        </div>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)" }}>
          {new Date(order.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--tv-forest)" }}>
          {formatCurrency(order.total)}
        </p>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)" }}>
          {order.items?.reduce((s, i) => s + i.quantity, 0) || 0} itens
        </p>
      </div>
      <ChevronRight size={16} style={{ color: "var(--tv-stone-300)", flexShrink: 0 }} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ──────────────────────────────────────────────────────────── */
function ProfilePage() {
  const profile = useAuthStore((s) => s.profile)!;
  const signOut = useAuthStore((s) => s.signOut);
  const updateAuthProfile = useAuthStore((s) => s.updateProfile);
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const isAdmin = profile.role === "admin";

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!profile?.id) return;
      setOrdersLoading(true);
      try {
        const result = await getUserOrders({ data: { userId: profile.id } });
        if (result.success && result.orders) {
          setOrders(result.orders.slice(0, 5));
        }
      } catch (e) {
        console.error("[Profile] Erro ao buscar pedidos:", e);
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [profile?.id]);

  // Start editing
  const startEdit = useCallback(() => {
    setEditForm({
      full_name: profile.full_name || "",
      phone: profile.phone || "",
      cep: profile.cep || "",
      address: profile.address || "",
      number: profile.number || "",
      complement: profile.complement || "",
      neighborhood: profile.neighborhood || "",
      city: profile.city || "",
      state: profile.state || "",
    });
    setEditErrors({});
    setIsEditing(true);
  }, [profile]);

  // Cancel edit
  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditForm({});
    setEditErrors({});
  }, []);

  // Validate edit form
  const validateEdit = (): boolean => {
    const errs: Record<string, string> = {};
    if (!editForm.full_name?.trim()) errs.full_name = "Nome é obrigatório";
    if (editForm.phone && editForm.phone.length < 10) errs.phone = "Telefone inválido";
    if (editForm.cep && editForm.cep.replace(/\D/g, "").length !== 8) errs.cep = "CEP inválido";
    if (editForm.state && editForm.state.length !== 2) errs.state = "Use a sigla (ex: SP)";
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save profile
  const saveProfile = useCallback(async () => {
    if (!validateEdit()) return;
    setIsSaving(true);
    try {
      const result = await updateProfile({ data: { userId: profile.id, patch: editForm } });
      if (result.success) {
        await updateAuthProfile(editForm);
        toast.success("Perfil atualizado com sucesso!");
        setIsEditing(false);
      } else {
        toast.error(result.error || "Erro ao atualizar perfil");
      }
    } catch (err) {
      console.error("[Profile] Erro ao salvar:", err);
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }, [editForm, profile.id, updateAuthProfile]);

  // Avatar upload
  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAvatarChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Selecione uma imagem válida");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Imagem deve ter no máximo 5MB");
        return;
      }

      setIsUploadingAvatar(true);
      try {
        const uploadFn = useAuthStore.getState().uploadAvatar;
        const url = await uploadFn(file);
        if (url) {
          toast.success("Foto atualizada!");
        } else {
          toast.error("Erro ao enviar foto");
        }
      } catch (err) {
        console.error("[Profile] Erro upload avatar:", err);
        toast.error("Erro ao enviar foto");
      } finally {
        setIsUploadingAvatar(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    []
  );

  // Password change — CLIENT-SIDE via Supabase
  const validatePassword = (): boolean => {
    const errs: Record<string, string> = {};
    if (!passwordForm.current) errs.current = "Digite sua senha atual";
    if (!passwordForm.new || passwordForm.new.length < 6) errs.new = "Mínimo 6 caracteres";
    if (passwordForm.new !== passwordForm.confirm) errs.confirm = "Senhas não conferem";
    setPasswordErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChangePassword = useCallback(async () => {
    if (!validatePassword()) return;
    if (!supabase) {
      toast.error("Supabase não configurado");
      return;
    }

    setIsChangingPassword(true);
    try {
      // 1. Reautentica com senha atual para validar
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: passwordForm.current,
      });

      if (signInError) {
        setPasswordErrors({ current: "Senha atual incorreta" });
        setIsChangingPassword(false);
        return;
      }

      // 2. Atualiza a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.new,
      });

      if (updateError) {
        toast.error(updateError.message || "Erro ao alterar senha");
      } else {
        toast.success("Senha alterada com sucesso!");
        setShowPasswordModal(false);
        setPasswordForm({ current: "", new: "", confirm: "" });
      }
    } catch (err) {
      console.error("[Profile] Erro ao mudar senha:", err);
      toast.error("Erro ao alterar senha");
    } finally {
      setIsChangingPassword(false);
    }
  }, [passwordForm, profile.email]);

  // Avatar initials
  const initials = profile.full_name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  return (
    <PublicLayout>
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "var(--space-6) var(--space-4)",
        }}
      >
        {/* ── Header ── */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <button
            onClick={() => navigate({ to: "/" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1-5)",
              fontSize: "var(--text-sm)",
              color: "var(--tv-moss)",
              background: "none",
              border: "none",
              cursor: "pointer",
              marginBottom: "var(--space-3)",
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-2xl)",
              fontWeight: 700,
              color: "var(--tv-forest)",
              lineHeight: 1.1,
            }}
          >
            Meu perfil
          </h1>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "var(--space-5)",
          }}
          className="profile-grid"
        >
          {/* ── LEFT COLUMN: Avatar + Quick Actions ── */}
          <div>
            {/* Avatar Card */}
            <div
              className="tv-card"
              style={{ marginBottom: "var(--space-5)", textAlign: "center", padding: "var(--space-6)" }}
            >
              {/* Avatar */}
              <div
                style={{
                  position: "relative",
                  width: 120,
                  height: 120,
                  margin: "0 auto var(--space-4)",
                  cursor: "pointer",
                }}
                onClick={handleAvatarClick}
              >
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "3px solid var(--tv-moss-lt)",
                    background: profile.avatar_url ? "transparent" : "var(--tv-moss)",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "var(--shadow-md)",
                  }}
                >
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "var(--text-3xl)",
                        fontWeight: 700,
                        color: "var(--tv-linen)",
                      }}
                    >
                      {initials}
                    </span>
                  )}
                </div>
                {/* Camera overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "var(--tv-moss)",
                    display: "grid",
                    placeItems: "center",
                    border: "3px solid var(--tv-white)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {isUploadingAvatar ? (
                    <Loader2 size={16} style={{ color: "var(--tv-linen)" }} className="animate-spin" />
                  ) : (
                    <Camera size={16} style={{ color: "var(--tv-linen)" }} />
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: "none" }}
              />

              {/* Name */}
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-xl)",
                  fontWeight: 700,
                  color: "var(--tv-forest)",
                  marginBottom: 2,
                }}
              >
                {profile.full_name}
              </h2>
              <p style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-400)", marginBottom: "var(--space-3)" }}>
                {profile.email}
              </p>

              {/* Admin Badge */}
              {isAdmin && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-1-5)",
                    padding: "var(--space-1) var(--space-3)",
                    borderRadius: "var(--r-full)",
                    background: "var(--tv-warning-lt)",
                    border: "1px solid var(--tv-gold)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  <Crown size={14} style={{ color: "var(--tv-gold)" }} />
                  <span style={{ fontSize: "var(--text-xs)", fontWeight: 700, color: "var(--tv-gold-dk)" }}>
                    Administrador
                  </span>
                </div>
              )}

              {/* Quick Stats */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "var(--space-3)",
                  marginTop: "var(--space-3)",
                }}
              >
                <div
                  style={{
                    padding: "var(--space-3)",
                    background: "var(--tv-cream)",
                    borderRadius: "var(--r-xl)",
                    border: "1px solid var(--tv-stone-200)",
                  }}
                >
                  <Package size={18} style={{ color: "var(--tv-moss)", marginBottom: 4 }} />
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--tv-forest)" }}>
                    {orders.length}
                  </p>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)" }}>Pedidos</p>
                </div>
                <div
                  style={{
                    padding: "var(--space-3)",
                    background: "var(--tv-cream)",
                    borderRadius: "var(--r-xl)",
                    border: "1px solid var(--tv-stone-200)",
                  }}
                >
                  <Heart size={18} style={{ color: "var(--tv-terracota)", marginBottom: 4 }} />
                  <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 700, color: "var(--tv-forest)" }}>
                    {orders.filter((o) => o.status === "delivered").length}
                  </p>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)" }}>Entregues</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="tv-card" style={{ overflow: "hidden" }}>
              {isAdmin && (
                <Link
                  to="/admin"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    padding: "var(--space-4) var(--space-5)",
                    borderBottom: "1px solid var(--tv-stone-100)",
                    color: "var(--tv-moss)",
                    fontWeight: 600,
                    fontSize: "var(--text-sm)",
                    transition: "background var(--duration-fast) ease",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "var(--tv-cream)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  }}
                >
                  <Shield size={18} />
                  Painel Administrativo
                  <ChevronRight size={16} style={{ marginLeft: "auto", color: "var(--tv-stone-300)" }} />
                </Link>
              )}
              <Link
                to="/pedidos"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-4) var(--space-5)",
                  borderBottom: "1px solid var(--tv-stone-100)",
                  color: "var(--tv-stone-700)",
                  fontWeight: 500,
                  fontSize: "var(--text-sm)",
                  transition: "background var(--duration-fast) ease",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "var(--tv-cream)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                }}
              >
                <Package size={18} />
                Meus pedidos
                <ChevronRight size={16} style={{ marginLeft: "auto", color: "var(--tv-stone-300)" }} />
              </Link>
              <button
                onClick={() => setShowPasswordModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-4) var(--space-5)",
                  borderBottom: "1px solid var(--tv-stone-100)",
                  color: "var(--tv-stone-700)",
                  fontWeight: 500,
                  fontSize: "var(--text-sm)",
                  transition: "background var(--duration-fast) ease",
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--tv-cream)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <Lock size={18} />
                Alterar senha
                <ChevronRight size={16} style={{ marginLeft: "auto", color: "var(--tv-stone-300)" }} />
              </button>
              <button
                onClick={async () => {
                  await signOut();
                  toast.success("Você saiu da sua conta");
                  navigate({ to: "/" });
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-4) var(--space-5)",
                  color: "var(--tv-danger)",
                  fontWeight: 500,
                  fontSize: "var(--text-sm)",
                  transition: "background var(--duration-fast) ease",
                  width: "100%",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--tv-danger-lt)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <LogOut size={18} />
                Sair da conta
              </button>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Dados + Pedidos ── */}
          <div>
            {/* Dados Pessoais */}
            <SectionCard
              title="Dados pessoais"
              icon={User}
              action={
                !isEditing ? (
                  <button
                    onClick={startEdit}
                    className="tv-btn tv-btn--secondary tv-btn--sm"
                    style={{ gap: "var(--space-1-5)" }}
                  >
                    <Pencil size={14} />
                    Editar
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button
                      onClick={cancelEdit}
                      className="tv-btn tv-btn--secondary tv-btn--sm"
                      style={{ gap: "var(--space-1-5)" }}
                      disabled={isSaving}
                    >
                      <X size={14} />
                      Cancelar
                    </button>
                    <button
                      onClick={saveProfile}
                      className="tv-btn tv-btn--primary tv-btn--sm"
                      style={{ gap: "var(--space-1-5)" }}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      {isSaving ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                )
              }
            >
              {!isEditing ? (
                <div>
                  <InfoRow icon={User} label="Nome completo" value={profile.full_name} />
                  <InfoRow icon={Mail} label="Email" value={profile.email} />
                  <InfoRow
                    icon={Phone}
                    label="Telefone"
                    value={profile.phone ? formatPhone(profile.phone) : null}
                  />
                </div>
              ) : (
                <div>
                  <EditField
                    label="Nome completo"
                    value={editForm.full_name || ""}
                    onChange={(v) => setEditForm((f) => ({ ...f, full_name: v }))}
                    placeholder="Seu nome completo"
                    error={editErrors.full_name}
                    icon={User}
                  />
                  <EditField
                    label="Telefone"
                    value={editForm.phone || ""}
                    onChange={(v) => setEditForm((f) => ({ ...f, phone: v }))}
                    placeholder="(00) 00000-0000"
                    error={editErrors.phone}
                    icon={Phone}
                  />
                </div>
              )}
            </SectionCard>

            {/* Endereço */}
            <SectionCard
              title="Endereço de entrega"
              icon={MapPin}
              action={
                isEditing && (
                  <span style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)" }}>
                    Preencha para entregas
                  </span>
                )
              }
            >
              {!isEditing ? (
                <div>
                  <InfoRow
                    icon={Home}
                    label="Rua"
                    value={
                      profile.address
                        ? `${profile.address}, ${profile.number}${profile.complement ? ` — ${profile.complement}` : ""}`
                        : null
                    }
                  />
                  <InfoRow icon={Building2} label="Bairro" value={profile.neighborhood} />
                  <InfoRow
                    icon={Landmark}
                    label="Cidade/Estado"
                    value={
                      profile.city && profile.state
                        ? `${profile.city} / ${profile.state}`
                        : null
                    }
                  />
                  <InfoRow
                    icon={Hash}
                    label="CEP"
                    value={profile.cep ? formatCEP(profile.cep) : null}
                  />
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "var(--space-3)",
                  }}
                  className="profile-address-grid"
                >
                  <div style={{ gridColumn: "1 / -1" }}>
                    <EditField
                      label="Rua"
                      value={editForm.address || ""}
                      onChange={(v) => setEditForm((f) => ({ ...f, address: v }))}
                      placeholder="Nome da rua"
                      icon={Home}
                    />
                  </div>
                  <EditField
                    label="Número"
                    value={editForm.number || ""}
                    onChange={(v) => setEditForm((f) => ({ ...f, number: v }))}
                    placeholder="123"
                    icon={Hash}
                  />
                  <EditField
                    label="Complemento"
                    value={editForm.complement || ""}
                    onChange={(v) => setEditForm((f) => ({ ...f, complement: v || null }))}
                    placeholder="Apto, bloco..."
                  />
                  <EditField
                    label="Bairro"
                    value={editForm.neighborhood || ""}
                    onChange={(v) => setEditForm((f) => ({ ...f, neighborhood: v }))}
                    placeholder="Bairro"
                    icon={Building2}
                  />
                  <EditField
                    label="CEP"
                    value={editForm.cep || ""}
                    onChange={(v) => setEditForm((f) => ({ ...f, cep: v }))}
                    placeholder="00000-000"
                    error={editErrors.cep}
                    icon={Hash}
                  />
                  <EditField
                    label="Cidade"
                    value={editForm.city || ""}
                    onChange={(v) => setEditForm((f) => ({ ...f, city: v }))}
                    placeholder="Cidade"
                    icon={Landmark}
                  />
                  <EditField
                    label="Estado"
                    value={editForm.state || ""}
                    onChange={(v) => setEditForm((f) => ({ ...f, state: v.toUpperCase() }))}
                    placeholder="UF"
                    maxLength={2}
                    error={editErrors.state}
                  />
                </div>
              )}
            </SectionCard>

            {/* Últimos Pedidos */}
            <SectionCard
              title="Últimos pedidos"
              icon={Package}
              action={
                orders.length > 0 && (
                  <Link
                    to="/pedidos"
                    style={{
                      fontSize: "var(--text-xs)",
                      fontWeight: 600,
                      color: "var(--tv-moss)",
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-1)",
                      textDecoration: "none",
                    }}
                  >
                    Ver todos <ChevronRight size={14} />
                  </Link>
                )
              }
            >
              {ordersLoading ? (
                <div style={{ textAlign: "center", padding: "var(--space-8)" }}>
                  <Loader2
                    size={28}
                    className="animate-spin"
                    style={{ color: "var(--tv-moss)", margin: "0 auto" }}
                  />
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-400)", marginTop: "var(--space-3)" }}>
                    Carregando pedidos...
                  </p>
                </div>
              ) : orders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "var(--space-6)" }}>
                  <Package size={32} style={{ color: "var(--tv-stone-200)", margin: "0 auto var(--space-3)" }} />
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-400)", marginBottom: "var(--space-3)" }}>
                    Você ainda não fez nenhum pedido
                  </p>
                  <Link to="/produtos" className="tv-btn tv-btn--primary tv-btn--sm">
                    <ShoppingBag size={14} />
                    Explorar produtos
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {orders.map((order) => (
                    <OrderMiniCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>

      {/* ── PASSWORD CHANGE MODAL ── */}
      {showPasswordModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 400,
            display: "grid",
            placeItems: "center",
            padding: "var(--space-4)",
          }}
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            style={{
              background: "var(--tv-white)",
              borderRadius: "var(--r-2xl)",
              maxWidth: 420,
              width: "100%",
              boxShadow: "var(--shadow-2xl)",
              animation: "tv-scale-in 0.25s var(--ease-out)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "var(--space-5) var(--space-6)",
                borderBottom: "1px solid var(--tv-stone-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "var(--r-lg)",
                    background: "var(--tv-moss)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Lock size={18} style={{ color: "var(--tv-linen)" }} />
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "var(--text-lg)",
                      fontWeight: 700,
                      color: "var(--tv-forest)",
                    }}
                  >
                    Alterar senha
                  </h3>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)" }}>
                    Escolha uma senha segura
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  border: "none",
                  background: "var(--tv-stone-100)",
                  cursor: "pointer",
                  color: "var(--tv-stone-500)",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "var(--space-5) var(--space-6)" }}>
              {/* Current password */}
              <div style={{ marginBottom: "var(--space-3)" }}>
                <label className="tv-label">Senha atual</label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={14}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--tv-stone-400)",
                    }}
                  />
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
                    placeholder="Sua senha atual"
                    className="tv-input"
                    style={{ paddingLeft: 36, paddingRight: 40 }}
                  />
                  <button
                    onClick={() => setShowCurrentPassword((v) => !v)}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--tv-stone-400)",
                      padding: 4,
                    }}
                  >
                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.current && (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-danger)", marginTop: 4 }}>
                    {passwordErrors.current}
                  </p>
                )}
              </div>

              {/* New password */}
              <div style={{ marginBottom: "var(--space-3)" }}>
                <label className="tv-label">Nova senha</label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={14}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--tv-stone-400)",
                    }}
                  />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.new}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, new: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                    className="tv-input"
                    style={{ paddingLeft: 36, paddingRight: 40 }}
                  />
                  <button
                    onClick={() => setShowNewPassword((v) => !v)}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--tv-stone-400)",
                      padding: 4,
                    }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {passwordErrors.new && (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-danger)", marginTop: 4 }}>
                    {passwordErrors.new}
                  </p>
                )}
              </div>

              {/* Confirm password */}
              <div style={{ marginBottom: "var(--space-4)" }}>
                <label className="tv-label">Confirmar nova senha</label>
                <div style={{ position: "relative" }}>
                  <Check
                    size={14}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--tv-stone-400)",
                    }}
                  />
                  <input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                    placeholder="Repita a nova senha"
                    className="tv-input"
                    style={{ paddingLeft: 36 }}
                  />
                </div>
                {passwordErrors.confirm && (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-danger)", marginTop: 4 }}>
                    {passwordErrors.confirm}
                  </p>
                )}
              </div>

              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="tv-btn tv-btn--primary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Alterando...
                  </>
                ) : (
                  <>
                    <Lock size={16} />
                    Alterar senha
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive styles */}
      <style>{`
        @media (min-width: 768px) {
          .profile-grid {
            grid-template-columns: 320px 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .profile-address-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </PublicLayout>
  );
}