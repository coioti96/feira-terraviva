import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  Home,
  Building2,
  MapPinned,
  Check,
  Store,
} from "lucide-react";
import { registerSchema } from "@/lib/validations";
import { useAuthStore } from "@/stores/auth";
import { formatCEP, formatPhone } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────
   ROUTE
───────────────────────────────────────────────────────── */
export const Route = createFileRoute("/auth/register")({
  head: () => ({
    meta: [
      { title: "Criar conta — Terra Viva" },
      { name: "description", content: "Cadastre-se e receba orgânicos frescos no seu bairro." },
      { property: "og:title", content: "Nova conta — Terra Viva" },
      { property: "og:description", content: "Cadastro em 3 passos rápidos." },
    ],
  }),
  component: RegisterPage,
});

type FormValues = z.infer<typeof registerSchema>;

/* ─────────────────────────────────────────────────────────
   STEP CONFIG
───────────────────────────────────────────────────────── */
const STEPS = [
  { label: "Dados pessoais", icon: User },
  { label: "Endereço", icon: MapPin },
  { label: "Confirmar", icon: Check },
] as const;

/* ─────────────────────────────────────────────────────────
   REGISTER PAGE — Enterprise Terra Viva
───────────────────────────────────────────────────────── */
function RegisterPage() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const signUp = useAuthStore((s) => s.signUp);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: {
      acceptTerms: false,
      complement: undefined,
    },
  });

  const phone = watch("phone");
  const cep = watch("cep");

  const next = async () => {
    const fields =
      step === 0
        ? (["full_name", "email", "password", "confirmPassword"] as const)
        : step === 1
          ? (["phone", "cep", "address", "number", "neighborhood", "city", "state"] as const)
          : ([] as const);
    const ok = await trigger(fields);
    if (ok) setStep((s) => (s + 1) as 0 | 1 | 2);
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      // ← CORREÇÃO: Usa undefined em vez de null para compatibilidade com SignUpData
      const payload = {
        full_name: data.full_name,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        cep: data.cep || undefined,
        address: data.address || undefined,
        number: data.number || undefined,
        complement: data.complement || undefined,
        neighborhood: data.neighborhood || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
      };
      await signUp(payload);
      toast.success("Conta criada com sucesso!");
      navigate({ to: "/checkout" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar conta";
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

      {/* Glow decorativo */}
      <div
        style={{
          position: "absolute",
          top: "5%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 700,
          height: 700,
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
          maxWidth: 480,
          background: "var(--tv-linen)",
          borderRadius: "var(--r-2xl)",
          border: "1px solid var(--tv-stone-200)",
          boxShadow: "var(--shadow-xl)",
          padding: "clamp(1.75rem, 5vw, 2.5rem)",
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
              Criar conta · {STEPS[step].label}
            </p>
          </div>

          {/* Stepper */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              marginTop: "var(--space-2)",
            }}
          >
            {STEPS.map((s, i) => {
              const isActive = i === step;
              const isCompleted = i < step;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "var(--space-1)",
                      padding: isActive ? "var(--space-2) var(--space-3)" : "var(--space-2)",
                      borderRadius: "var(--r-full)",
                      background: isActive
                        ? "var(--tv-moss)"
                        : isCompleted
                          ? "var(--tv-success-lt)"
                          : "var(--tv-stone-100)",
                      color: isActive
                        ? "var(--tv-linen)"
                        : isCompleted
                          ? "var(--tv-success)"
                          : "var(--tv-stone-400)",
                      fontSize: "var(--text-xs)",
                      fontWeight: 600,
                      transition: "all var(--duration-normal) ease",
                      minWidth: isActive ? undefined : 28,
                      height: 28,
                    }}
                  >
                    {isCompleted ? (
                      <Check size={14} />
                    ) : (
                      <>
                        <s.icon size={12} />
                        {isActive && <span>{s.label}</span>}
                      </>
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      style={{
                        width: 24,
                        height: 2,
                        borderRadius: 1,
                        background: isCompleted ? "var(--tv-success)" : "var(--tv-stone-200)",
                        transition: "background var(--duration-normal) ease",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
        >
          {/* ── STEP 0: Dados pessoais ── */}
          {step === 0 && (
            <>
              <Field
                label="Nome completo"
                icon={User}
                error={errors.full_name?.message}
              >
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  {...register("full_name")}
                  className="tv-input"
                  style={{ paddingLeft: "2.25rem" }}
                />
              </Field>

              <Field
                label="Email"
                icon={Mail}
                error={errors.email?.message}
              >
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  {...register("email")}
                  className="tv-input"
                  style={{ paddingLeft: "2.25rem" }}
                />
              </Field>

              <Field
                label="Senha"
                icon={Lock}
                error={errors.password?.message}
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres, 1 maiúscula, 1 número, 1 especial"
                  {...register("password")}
                  className="tv-input"
                  style={{ paddingLeft: "2.25rem" }}
                />
              </Field>

              <Field
                label="Confirmar senha"
                icon={Lock}
                error={errors.confirmPassword?.message}
              >
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                  {...register("confirmPassword")}
                  className="tv-input"
                  style={{ paddingLeft: "2.25rem" }}
                />
              </Field>
            </>
          )}

          {/* ── STEP 1: Endereço ── */}
          {step === 1 && (
            <>
              <Field
                label="Telefone"
                icon={Phone}
                error={errors.phone?.message}
              >
                <input
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={phone ? formatPhone(phone) : ""}
                  onChange={(e) => setValue("phone", e.target.value.replace(/\D/g, ""))}
                  className="tv-input"
                  style={{ paddingLeft: "2.25rem" }}
                />
              </Field>

              <Field
                label="CEP"
                icon={MapPin}
                error={errors.cep?.message}
              >
                <input
                  type="text"
                  placeholder="00000-000"
                  value={cep ? formatCEP(cep) : ""}
                  onChange={(e) => setValue("cep", e.target.value.replace(/\D/g, ""))}
                  className="tv-input"
                  style={{ paddingLeft: "2.25rem" }}
                />
              </Field>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr",
                  gap: "var(--space-3)",
                }}
              >
                <Field
                  label="Rua"
                  icon={Home}
                  error={errors.address?.message}
                >
                  <input
                    type="text"
                    placeholder="Nome da rua"
                    {...register("address")}
                    className="tv-input"
                    style={{ paddingLeft: "2.25rem" }}
                  />
                </Field>

                <Field
                  label="Número"
                  error={errors.number?.message}
                >
                  <input
                    type="text"
                    placeholder="123"
                    {...register("number")}
                    className="tv-input"
                  />
                </Field>
              </div>

              <Field
                label="Complemento (opcional)"
                icon={Building2}
              >
                <input
                  type="text"
                  placeholder="Apto, bloco, etc."
                  {...register("complement")}
                  className="tv-input"
                  style={{ paddingLeft: "2.25rem" }}
                />
              </Field>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.5fr 0.8fr",
                  gap: "var(--space-3)",
                }}
              >
                <Field
                  label="Bairro"
                  icon={MapPinned}
                  error={errors.neighborhood?.message}
                >
                  <input
                    type="text"
                    placeholder="Seu bairro"
                    {...register("neighborhood")}
                    className="tv-input"
                    style={{ paddingLeft: "2.25rem" }}
                  />
                </Field>

                <Field
                  label="Cidade"
                  error={errors.city?.message}
                >
                  <input
                    type="text"
                    placeholder="Cidade"
                    {...register("city")}
                    className="tv-input"
                  />
                </Field>

                <Field
                  label="UF"
                  error={errors.state?.message}
                >
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="SP"
                    {...register("state")}
                    className="tv-input"
                    style={{ textTransform: "uppercase" }}
                  />
                </Field>
              </div>
            </>
          )}

          {/* ── STEP 2: Confirmar ── */}
          {step === 2 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
              }}
            >
              <div
                style={{
                  padding: "var(--space-5)",
                  background: "var(--tv-cream)",
                  borderRadius: "var(--r-xl)",
                  border: "1px solid var(--tv-stone-200)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "var(--tv-success-lt)",
                    color: "var(--tv-success)",
                    display: "grid",
                    placeItems: "center",
                    margin: "0 auto var(--space-3)",
                  }}
                >
                  <Check size={22} />
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-xl)",
                    fontWeight: 600,
                    color: "var(--tv-forest)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  Quase lá!
                </h3>
                <p
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--tv-stone-600)",
                    lineHeight: 1.6,
                  }}
                >
                  Revise seus dados e aceite os termos para finalizar o cadastro.
                </p>
              </div>

              {/* Terms */}
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "var(--space-3)",
                  padding: "var(--space-3) var(--space-4)",
                  background: "var(--tv-cream)",
                  borderRadius: "var(--r-lg)",
                  border: "1px solid var(--tv-stone-200)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={!!watch("acceptTerms")}
                  onChange={(e) => setValue("acceptTerms", e.target.checked, { shouldValidate: true })}
                  style={{
                    width: 18,
                    height: 18,
                    marginTop: 2,
                    accentColor: "var(--tv-moss)",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--tv-stone-700)",
                    lineHeight: 1.5,
                  }}
                >
                  Aceito os{" "}
                  <span style={{ color: "var(--tv-moss)", fontWeight: 500 }}>
                    termos de uso
                  </span>{" "}
                  e a{" "}
                  <span style={{ color: "var(--tv-moss)", fontWeight: 500 }}>
                    política de privacidade
                  </span>{" "}
                  da Feirinha Orgânica Terra Viva.
                </span>
              </label>
              {errors.acceptTerms && (
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--tv-danger)",
                    marginTop: -8,
                  }}
                >
                  {errors.acceptTerms.message}
                </p>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "var(--space-2)",
              paddingTop: "var(--space-4)",
              borderTop: "1px solid var(--tv-stone-200)",
            }}
          >
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 0 | 1 | 2)}
                className="tv-btn tv-btn--secondary tv-btn--sm"
              >
                <ArrowLeft size={14} />
                Voltar
              </button>
            ) : (
              <Link
                to="/auth/login"
                search={{ redirect: "/" }} // ← CORREÇÃO: satisfaz validateSearch da rota login
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--tv-stone-500)",
                  textDecoration: "none",
                  transition: "color var(--duration-fast) ease",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.color = "var(--tv-moss)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.color = "var(--tv-stone-500)";
                }}
              >
                Já tenho conta
              </Link>
            )}

            {step < 2 ? (
              <button
                type="button"
                onClick={next}
                className="tv-btn tv-btn--primary tv-btn--sm"
              >
                Continuar
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="tv-btn tv-btn--primary tv-btn--sm"
              >
                {loading ? (
                  <>
                    <Loader2
                      size={14}
                      style={{ animation: "tv-spin-slow 0.8s linear infinite" }}
                    />
                    Criando…
                  </>
                ) : (
                  <>
                    Criar conta
                    <Check size={14} />
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "var(--space-5)",
          }}
        >
          <Link
            to="/"
            search={{ redirect: "/" }} // ← CORREÇÃO: satisfaz validateSearch da rota /
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

/* ─────────────────────────────────────────────────────────
   FIELD COMPONENT
───────────────────────────────────────────────────────── */
function Field({
  label,
  icon: Icon,
  error,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  error?: string;
  children: React.ReactNode;
}) {
  return (
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
        {label}
      </label>
      <div style={{ position: "relative" }}>
        {Icon && (
          <Icon
            size={14}
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--tv-stone-400)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        )}
        {children}
      </div>
      {error && (
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--tv-danger)",
            marginTop: "var(--space-1)",
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}