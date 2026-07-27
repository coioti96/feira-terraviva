import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Leaf,
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Store,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { loginSchema } from "@/lib/validations";

/* ─────────────────────────────────────────────────────────
   ROUTE
───────────────────────────────────────────────────────── */
export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Terra Viva" },
      { name: "description", content: "Acesse sua conta na feirinha orgânica." },
      { property: "og:title", content: "Entrar — Terra Viva" },
      { property: "og:description", content: "Faça login para finalizar seus pedidos." },
    ],
  }),
  validateSearch: (s) => ({ redirect: (s.redirect as string) ?? "/" }),
  component: LoginPage,
});

type FormValues = z.infer<typeof loginSchema>;

/* ─────────────────────────────────────────────────────────
   LOGIN PAGE — Enterprise Terra Viva
───────────────────────────────────────────────────────── */
function LoginPage() {
  const signIn = useAuthStore((s) => s.signIn);
  const { redirect } = useSearch({ from: "/auth/login" });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);

  // Carrega preferência salva
  useEffect(() => {
    setRememberDevice(localStorage.getItem("terraviva-remember") === "true");
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      // ← CORREÇÃO: signIn aceita apenas 2 parâmetros
      const result = await signIn(data.email, data.password);
      
      // Persistência local do "lembrar dispositivo"
      if (rememberDevice) {
        localStorage.setItem("terraviva-remember", "true");
      } else {
        localStorage.removeItem("terraviva-remember");
      }
      
      toast.success("Bem-vindo(a) de volta!");
      const target = result.role === "admin" ? "/admin" : redirect || "/";
      navigate({ to: target, replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao entrar";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "var(--space-4)",
        background: "linear-gradient(160deg, #060f06 0%, #0A1F0A 40%, #101a0f 70%, #162e0f 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grain overlay */}
      <div
        className="grain-overlay"
        aria-hidden="true"
        style={{ opacity: 0.04 }}
      />

      {/* Glow decorativo dourado */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at 50% 30%, rgba(184,134,11,0.08) 0%, rgba(45,90,39,0.05) 50%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Card principal */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 420,
          background: "var(--tv-linen)",
          borderRadius: "var(--r-2xl)",
          border: "1px solid var(--tv-stone-200)",
          boxShadow: "var(--shadow-xl)",
          padding: "clamp(2rem, 5vw, 2.5rem)",
          animation: "tv-fade-up 0.5s var(--ease-out)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-3)",
            marginBottom: "var(--space-6)",
          }}
        >
          {/* Logo da loja */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              overflow: "hidden",
              border: "3px solid var(--tv-moss-lt)",
              boxShadow: "var(--shadow-md)",
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #143314, #2D5A27)",
              flexShrink: 0,
            }}
          >
            <img
              src="/icons/logo.png"
              alt="Terra Viva"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = "";
                  const icon = document.createElement("div");
                  icon.style.cssText = "display:grid;place-items:center;";
                  icon.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7bc070" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.6C9.5 5.3 10 4 11 3s1.5-1 2.5 0 1.5 2.3 1.2 3.6A7 7 0 0 1 13 20z"/></svg>`;
                  parent.appendChild(icon);
                }
              }}
            />
          </div>

          <div style={{ textAlign: "center" }}>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-2xl)",
                fontWeight: 700,
                color: "var(--tv-forest)",
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              Terra Viva
            </h1>
            <p
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--tv-stone-500)",
                marginTop: "var(--space-1)",
              }}
            >
              Entre na sua conta
            </p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
        >
          {/* Email */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                color: "var(--tv-stone-700)",
                marginBottom: "var(--space-1)",
              }}
            >
              Email
            </label>
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
              <input
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                {...register("email")}
                className="tv-input"
                style={{ paddingLeft: "2.25rem" }}
              />
            </div>
            {errors.email && (
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--tv-danger)",
                  marginTop: "var(--space-1)",
                }}
              >
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                color: "var(--tv-stone-700)",
                marginBottom: "var(--space-1)",
              }}
            >
              Senha
            </label>
            <div style={{ position: "relative" }}>
              <Lock
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
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password")}
                className="tv-input"
                style={{ paddingLeft: "2.25rem", paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--tv-stone-400)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && (
              <p
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--tv-danger)",
                  marginTop: "var(--space-1)",
                }}
              >
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Lembrar dispositivo */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <input
              type="checkbox"
              checked={rememberDevice}
              onChange={(e) => setRememberDevice(e.target.checked)}
              style={{
                width: 16,
                height: 16,
                accentColor: "var(--tv-moss)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--tv-stone-600)",
              }}
            >
              Lembrar deste dispositivo
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="tv-btn tv-btn--primary"
            style={{ marginTop: "var(--space-1)" }}
          >
            {loading ? (
              <>
                <Loader2
                  size={16}
                  style={{ animation: "tv-spin-slow 0.8s linear infinite" }}
                />
                Entrando…
              </>
            ) : (
              <>
                Entrar
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer links */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-3)",
            marginTop: "var(--space-6)",
            paddingTop: "var(--space-5)",
            borderTop: "1px solid var(--tv-stone-200)",
          }}
        >
          <Link
            to="/auth/register"
            search={{}} // ← CORREÇÃO: evita erro de search required
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--tv-moss)",
              fontWeight: 500,
              textDecoration: "none",
              transition: "color var(--duration-fast) ease",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.color = "var(--tv-moss-mid)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.color = "var(--tv-moss)";
            }}
          >
            Criar nova conta
          </Link>
          <Link
            to="/"
            search={{}} // ← CORREÇÃO: evita erro de search required
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--tv-stone-400)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "var(--space-1)",
              transition: "color var(--duration-fast) ease",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.color = "var(--tv-stone-600)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.color = "var(--tv-stone-400)";
            }}
          >
            <Store size={12} />
            Voltar à loja
          </Link>
        </div>
      </div>
    </div>
  );
}