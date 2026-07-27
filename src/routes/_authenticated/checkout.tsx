import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  MapPin, Store, CreditCard, Banknote, QrCode, Tag, Truck, ChevronRight,
  Check, AlertCircle, Minus, Plus, Trash2, Home, StickyNote,
  ShieldCheck, Clock, Loader2, ShoppingBag, X, Ticket, Copy,
  ArrowLeft, Wallet, Smartphone, PackageCheck,
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { EmptyState } from "@/components/store/EmptyState";
import { useCartStore, unitLabel } from "@/stores/cart";
import { useAuthStore } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";
import { formatCurrency, isValidCEP } from "@/lib/utils";
import { createOrder } from "@/utils/server-function/orders";
import { createMercadoPagoPix, checkPixPaymentStatus } from "@/utils/server-function/mercado-pago";
import { validateCoupon } from "@/utils/server-function/validateCoupon";
import type { PaymentMethod, Address } from "@/types";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "Finalizar pedido — Terra Viva" },
      { name: "description", content: "Complete seu pedido de orgânicos frescos." },
    ],
  }),
  component: CheckoutPage,
});

/* ────────────────────────────────────────────────────────────
   PAYMENT CONFIG
   ──────────────────────────────────────────────────────────── */
const PAYMENT_METHODS: {
  key: PaymentMethod;
  label: string;
  description: string;
  icon: React.ElementType;
  online: boolean;
  requiresSetting: keyof ReturnType<typeof useSettingsStore.getState>["settings"];
}[] = [
  {
    key: "mercado_pago",
    label: "PIX Automático",
    description: "QR Code instantâneo com confirmação automática",
    icon: QrCode,
    online: true,
    requiresSetting: "mercado_pago_enabled",
  },
  {
    key: "pix",
    label: "PIX Manual",
    description: "Transferência para a chave PIX da loja",
    icon: Smartphone,
    online: false,
    requiresSetting: "pix_enabled",
  },
  {
    key: "cash",
    label: "Dinheiro na entrega",
    description: "Pague quando receber seu pedido",
    icon: Banknote,
    online: false,
    requiresSetting: "cash_enabled",
  },
  {
    key: "card",
    label: "Cartão na entrega",
    description: "Maquininha levada pelo entregador",
    icon: CreditCard,
    online: false,
    requiresSetting: "card_enabled",
  },
];

/* ────────────────────────────────────────────────────────────
   STEPPER
   ──────────────────────────────────────────────────────────── */
const STEPS = [
  { key: "review", label: "Revisar", icon: ShoppingBag },
  { key: "delivery", label: "Entrega", icon: Truck },
  { key: "payment", label: "Pagamento", icon: Wallet },
  { key: "confirm", label: "Confirmar", icon: PackageCheck },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

function Stepper({ currentStep }: { currentStep: StepKey }) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStep);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-2)",
        marginBottom: "var(--space-8)",
        flexWrap: "wrap",
      }}
    >
      {STEPS.map((step, idx) => {
        const isActive = idx === currentIdx;
        const isCompleted = idx < currentIdx;
        const StepIcon = step.icon;
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: isActive ? "var(--space-2) var(--space-4)" : "var(--space-2)",
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
                minWidth: isActive ? undefined : 32,
                height: 32,
                justifyContent: "center",
              }}
            >
              {isCompleted ? (
                <Check size={14} />
              ) : (
                <StepIcon size={14} />
              )}
              {isActive && <span>{step.label}</span>}
            </div>
            {idx < STEPS.length - 1 && (
              <ChevronRight
                size={14}
                style={{
                  color: isCompleted ? "var(--tv-success)" : "var(--tv-stone-300)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   PIX MODAL — COM VERIFICAÇÃO DEFENSIVA
   ──────────────────────────────────────────────────────────── */
function PixModal({
  isOpen,
  onClose,
  qrCode,
  qrCodeBase64,
  ticketUrl,
  orderId,
  amount,
  userId,
  onPaymentConfirmed,
}: {
  isOpen: boolean;
  onClose: () => void;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
  orderId: string;
  amount: number;
  userId: string;
  onPaymentConfirmed: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"pending" | "paid" | "expired">("pending");
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Verificação defensiva — não renderiza se dados essenciais faltarem
  if (!isOpen) return null;
  if (!qrCode || !qrCodeBase64 || !orderId) {
    console.error("[PixModal] Dados incompletos:", { qrCode: !!qrCode, qrCodeBase64: !!qrCodeBase64, orderId: !!orderId });
    return null;
  }

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus("expired");
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const result = await checkPixPaymentStatus({ data: { orderId, userId } });
        if (result.success && result.status === "paid") {
          setStatus("paid");
          if (pollRef.current) clearInterval(pollRef.current);
          if (intervalRef.current) clearInterval(intervalRef.current);
          onPaymentConfirmed();
        }
      } catch (e) {
        // Silencioso
      }
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [orderId, userId, onPaymentConfirmed]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const copyQrCode = () => {
    navigator.clipboard.writeText(qrCode);
    setCopied(true);
    toast.success("Código PIX copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "grid",
        placeItems: "center",
        padding: "var(--space-4)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--tv-white)",
          borderRadius: "var(--r-2xl)",
          maxWidth: 420,
          width: "100%",
          maxHeight: "90dvh",
          overflow: "auto",
          boxShadow: "var(--shadow-2xl)",
          animation: "tv-fade-up 0.3s var(--ease-out)",
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
                background: "var(--tv-success-lt)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <QrCode size={20} style={{ color: "var(--tv-success)" }} />
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
                Pagar com PIX
              </h3>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)" }}>
                Escaneie o QR Code ou copie o código
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
        <div
          style={{
            padding: "var(--space-5) var(--space-6)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-4)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)" }}>Total a pagar</p>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-3xl)",
                fontWeight: 700,
                color: "var(--tv-forest)",
              }}
            >
              {formatCurrency(amount)}
            </p>
          </div>

          {status === "paid" ? (
            <div
              style={{
                padding: "var(--space-4)",
                background: "var(--tv-success-lt)",
                borderRadius: "var(--r-xl)",
                border: "1px solid var(--tv-success)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <Check size={20} style={{ color: "var(--tv-success)" }} />
              <span style={{ fontWeight: 600, color: "var(--tv-success)" }}>Pagamento confirmado!</span>
            </div>
          ) : status === "expired" ? (
            <div
              style={{
                padding: "var(--space-4)",
                background: "var(--tv-danger-lt)",
                borderRadius: "var(--r-xl)",
                border: "1px solid var(--tv-danger)",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <AlertCircle size={20} style={{ color: "var(--tv-danger)" }} />
              <span style={{ fontWeight: 600, color: "var(--tv-danger)" }}>QR Code expirado</span>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-2) var(--space-4)",
                  background: "var(--tv-cream)",
                  borderRadius: "var(--r-full)",
                  border: "1px solid var(--tv-stone-200)",
                }}
              >
                <Clock
                  size={14}
                  style={{ color: timeLeft < 300 ? "var(--tv-danger)" : "var(--tv-stone-400)" }}
                />
                <span
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                    color: timeLeft < 300 ? "var(--tv-danger)" : "var(--tv-stone-700)",
                  }}
                >
                  {formatTime(timeLeft)}
                </span>
              </div>

              {qrCodeBase64 && (
                <div
                  style={{
                    padding: "var(--space-4)",
                    background: "var(--tv-white)",
                    borderRadius: "var(--r-xl)",
                    border: "2px solid var(--tv-stone-200)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <img
                    src={`data:image/png;base64,${qrCodeBase64}`}
                    alt="QR Code PIX"
                    style={{ width: 200, height: 200 }}
                  />
                </div>
              )}

              <div style={{ width: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    padding: "var(--space-3)",
                    background: "var(--tv-cream)",
                    borderRadius: "var(--r-lg)",
                    border: "1px solid var(--tv-stone-200)",
                  }}
                >
                  <input
                    type="text"
                    value={qrCode}
                    readOnly
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      fontSize: "var(--text-xs)",
                      fontFamily: "var(--font-mono)",
                      color: "var(--tv-stone-600)",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={copyQrCode}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-1)",
                      padding: "var(--space-2) var(--space-3)",
                      background: copied ? "var(--tv-success-lt)" : "var(--tv-moss)",
                      color: copied ? "var(--tv-success)" : "var(--tv-linen)",
                      borderRadius: "var(--r-lg)",
                      border: "none",
                      fontSize: "var(--text-xs)",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all var(--duration-fast) ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  padding: "var(--space-4)",
                  background: "var(--tv-cream)",
                  borderRadius: "var(--r-xl)",
                  border: "1px solid var(--tv-stone-200)",
                  width: "100%",
                }}
              >
                <p
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: 600,
                    color: "var(--tv-stone-700)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  Como pagar:
                </p>
                <ol
                  style={{
                    fontSize: "var(--text-xs)",
                    color: "var(--tv-stone-500)",
                    lineHeight: 1.8,
                    paddingLeft: "var(--space-4)",
                  }}
                >
                  <li>Abra o app do seu banco</li>
                  <li>Escolha pagar com PIX (QR Code ou Copia e Cola)</li>
                  <li>Escaneie o QR Code acima ou cole o código</li>
                  <li>Confirme o pagamento no app</li>
                  <li>Aguarde a confirmação automática aqui</li>
                </ol>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "var(--space-4) var(--space-6)",
            borderTop: "1px solid var(--tv-stone-100)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          {status === "paid" ? (
            <button onClick={onClose} className="tv-btn tv-btn--primary">
              Ver meu pedido
            </button>
          ) : status === "expired" ? (
            <button onClick={onClose} className="tv-btn tv-btn--secondary">
              Fechar
            </button>
          ) : (
            <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)", textAlign: "center" }}>
              Não feche esta janela até confirmar o pagamento
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ──────────────────────────────────────────────────────────── */
function CheckoutPage() {
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const updateQty = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const settings = useSettingsStore((s) => s.settings);
  const profile = useAuthStore((s) => s.profile)!;
  const navigate = useNavigate();

  const [step, setStep] = useState<StepKey>("review");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [payment, setPayment] = useState<PaymentMethod>("mercado_pago");
  const [needChange, setNeedChange] = useState(false);
  const [changeFor, setChangeFor] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    couponId: string | null;
  } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // PIX Modal state
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<{
    qrCode: string;
    qrCodeBase64: string;
    ticketUrl: string;
    paymentId: string;
    orderId: string;
  } | null>(null);

  // Address state
  const [address, setAddress] = useState<Address>({
    cep: profile?.cep ?? "",
    street: profile?.address ?? "",
    number: profile?.number ?? "",
    complement: profile?.complement ?? null,
    reference: null,
    neighborhood: profile?.neighborhood ?? "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
  });
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof Address, string>>>({});

  // Calculations
  const subtotal = useMemo(() => items.reduce((a, i) => a + i.total_price, 0), [items]);
  const discount = appliedCoupon?.discount ?? 0;
  const deliveryFee = useMemo(
    () => (deliveryType === "pickup" ? 0 : settings?.delivery_fee ?? 0),
    [deliveryType, settings]
  );
  const total = useMemo(() => Math.max(0, subtotal - discount + deliveryFee), [subtotal, discount, deliveryFee]);

  const productIds = useMemo(() => items.map((i) => i.product_id), [items]);

  if (items.length === 0) {
    return (
      <PublicLayout>
        <div style={{ minHeight: "60dvh", display: "grid", placeItems: "center" }}>
          <EmptyState
            title="Sua cesta está vazia"
            description="Que tal escolher alguns produtos frescos?"
            action={
              <button
                onClick={() => navigate({ to: "/produtos" })}
                className="tv-btn tv-btn--primary"
              >
                Ver produtos
              </button>
            }
          />
        </div>
      </PublicLayout>
    );
  }

  const validateAddress = (): boolean => {
    if (deliveryType === "pickup") return true;
    const errs: Partial<Record<keyof Address, string>> = {};
    if (!address.street?.trim()) errs.street = "Rua é obrigatória";
    if (!address.number?.trim()) errs.number = "Número é obrigatório";
    if (!address.neighborhood?.trim()) errs.neighborhood = "Bairro é obrigatório";
    if (!address.city?.trim()) errs.city = "Cidade é obrigatória";
    if (!address.state?.trim()) errs.state = "Estado é obrigatório";
    if (address.cep && !isValidCEP(address.cep)) errs.cep = "CEP inválido";
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === "review") setStep("delivery");
    else if (step === "delivery") {
      if (validateAddress()) setStep("payment");
    } else if (step === "payment") setStep("confirm");
  };

  const handleBack = () => {
    if (step === "delivery") setStep("review");
    else if (step === "payment") setStep("delivery");
    else if (step === "confirm") setStep("payment");
  };

  const applyCoupon = useCallback(async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) {
      toast.error("Digite um código de cupom");
      return;
    }
    setIsValidatingCoupon(true);
    try {
      const result = await validateCoupon({
        data: {
          code,
          subtotal,
          productIds,
          categoryIds: [],
        },
      });

      if (result.valid && result.coupon) {
        setAppliedCoupon({
          code: result.code,
          discount: result.discount,
          couponId: result.coupon.id,
        });
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error("[applyCoupon] Erro:", err);
      toast.error("Erro ao validar cupom. Tente novamente.");
    } finally {
      setIsValidatingCoupon(false);
    }
  }, [couponCode, subtotal, productIds]);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast.success("Cupom removido");
  }, []);

  const handlePaymentConfirmed = useCallback(() => {
    setPixModalOpen(false);
    toast.success("Pagamento confirmado!");
    navigate({ to: "/pedidos" });
  }, [navigate]);

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const orderItems = items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
        unit_type: item.unit_type,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const orderData = {
        user_id: profile.id,
        status: "pending" as const,
        payment_status: "pending" as const,
        payment_method: payment,
        payment_id: null as string | null,
        subtotal,
        delivery_fee: deliveryFee,
        discount,
        total,
        coupon_id: appliedCoupon?.couponId ?? null,
        delivery_type: deliveryType,
        address: deliveryType === "delivery" ? (address as unknown as Record<string, unknown>) : null,
        change_for: payment === "cash" && needChange && typeof changeFor === "number" ? changeFor : null,
        notes: notes.trim() || null,
        items: orderItems,
      };

      console.log("[Checkout] Criando pedido...", { payment, total });
      const result = await createOrder({ data: orderData });
      console.log("[Checkout] createOrder result:", result);

      if (!result.success || !result.order) {
        toast.error(result.error || "Erro ao criar pedido. Tente novamente.");
        setIsSubmitting(false);
        return;
      }

      console.log("[Checkout] Pedido criado:", result.order.id);

      // Se for PIX MP, gera QR Code
      if (payment === "mercado_pago") {
        console.log("[Checkout] Gerando PIX...");
        
        const pixResult = await createMercadoPagoPix({
          data: {
            orderId: result.order.id,
            amount: total,
            description: `Pedido ${result.order.order_number} - Terra Viva`,
            payerEmail: profile.email,
            payerCpf: undefined,
          },
        });

        console.log("[Checkout] PIX result:", pixResult);

        if (pixResult.success && pixResult.qrCode && pixResult.qrCodeBase64) {
          console.log("[Checkout] Abrindo modal PIX...");
          
          // Primeiro seta os dados, depois abre o modal
          setPixData({
            qrCode: pixResult.qrCode,
            qrCodeBase64: pixResult.qrCodeBase64,
            ticketUrl: pixResult.ticketUrl || "",
            paymentId: pixResult.paymentId || "",
            orderId: result.order.id,
          });
          
          // Use setTimeout para garantir que o estado foi atualizado
          setTimeout(() => {
            setPixModalOpen(true);
          }, 0);
          
          clear();
          setAppliedCoupon(null);
          setCouponCode("");
          setIsSubmitting(false);
          return;
        } else {
          console.error("[Checkout] PIX falhou:", pixResult.error);
          toast.error(pixResult.error || "Erro ao gerar QR Code. Pague via PIX manual.");
          clear();
          setAppliedCoupon(null);
          setCouponCode("");
          setIsSubmitting(false);
          navigate({ to: "/pedidos" });
          return;
        }
      }

      // Pagamento offline
      clear();
      setAppliedCoupon(null);
      setCouponCode("");
      toast.success("Pedido confirmado! Estamos preparando com carinho.");
      setIsSubmitting(false);
      navigate({ to: "/pedidos" });
    } catch (err) {
      console.error("[Checkout] Erro inesperado:", err);
      toast.error("Erro inesperado. Tente novamente.");
      setIsSubmitting(false);
    }
  };

  // ── STEP: REVIEW ──
  const ReviewStep = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div className="tv-card">
        <div className="tv-card__header">
          <h2 className="tv-heading-4" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <ShoppingBag size={20} style={{ color: "var(--tv-moss)" }} />
            Itens do pedido
          </h2>
          <span style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-400)" }}>
            {items.length} item{items.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="tv-card__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {items.map((it) => (
            <div
              key={it.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-3)",
                borderRadius: "var(--r-xl)",
                background: "var(--tv-cream)",
                border: "1px solid var(--tv-stone-200)",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  overflow: "hidden",
                  flexShrink: 0,
                  border: "2px solid var(--tv-moss-lt)",
                }}
              >
                <img
                  src={it.product_image}
                  alt={it.product_name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/icons/maskable_icon.png";
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontWeight: 600,
                    fontSize: "var(--text-sm)",
                    color: "var(--tv-stone-800)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {it.product_name}
                </p>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-400)" }}>{unitLabel(it.unit_type)}</p>
                <p style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--tv-moss)", marginTop: 2 }}>
                  {formatCurrency(it.unit_price)}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-1)",
                  background: "var(--tv-white)",
                  borderRadius: "var(--r-full)",
                  padding: "var(--space-1)",
                  border: "1px solid var(--tv-stone-200)",
                }}
              >
                <button
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                  onClick={() => updateQty(it.id, it.quantity - 1)}
                >
                  <Minus size={14} />
                </button>
                <span style={{ width: 24, textAlign: "center", fontSize: "var(--text-sm)", fontWeight: 600 }}>
                  {it.quantity}
                </span>
                <button
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                  }}
                  onClick={() => updateQty(it.id, it.quantity + 1)}
                >
                  <Plus size={14} />
                </button>
              </div>
              <div style={{ minWidth: 70, textAlign: "right" }}>
                <p style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--tv-forest)" }}>
                  {formatCurrency(it.total_price)}
                </p>
              </div>
              <button
                onClick={() => removeItem(it.id)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--r-lg)",
                  display: "grid",
                  placeItems: "center",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--tv-stone-400)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--tv-danger)";
                  (e.currentTarget as HTMLButtonElement).style.background = "var(--tv-danger-lt)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--tv-stone-400)";
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Coupon */}
      <div className="tv-card">
        <div className="tv-card__body">
          <h3
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              color: "var(--tv-stone-700)",
              marginBottom: "var(--space-3)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <Ticket size={16} style={{ color: "var(--tv-gold)" }} /> Cupom de desconto
          </h3>
          {appliedCoupon ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-3)",
                borderRadius: "var(--r-xl)",
                background: "var(--tv-success-lt)",
                border: "1px solid var(--tv-success)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <Check size={16} style={{ color: "var(--tv-success)" }} />
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--tv-success)" }}>
                  {appliedCoupon.code}
                </span>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-500)" }}>
                  {formatCurrency(appliedCoupon.discount)} de desconto
                </span>
              </div>
              <button
                onClick={removeCoupon}
                style={{ fontSize: "var(--text-xs)", color: "var(--tv-danger)", background: "none", border: "none", cursor: "pointer" }}
              >
                <X size={14} /> Remover
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <input
                type="text"
                placeholder="Digite seu cupom"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCoupon())}
                className="tv-input"
                style={{ flex: 1, fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", letterSpacing: "0.05em" }}
                disabled={isValidatingCoupon}
              />
              <button
                onClick={applyCoupon}
                disabled={isValidatingCoupon || !couponCode.trim()}
                className="tv-btn tv-btn--secondary tv-btn--sm"
                style={{ display: "flex", alignItems: "center", gap: "var(--space-1-5)" }}
              >
                {isValidatingCoupon ? <Loader2 size={14} className="animate-spin" /> : <Tag size={14} />}
                Aplicar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── STEP: DELIVERY ──
  const DeliveryStep = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div className="tv-card">
        <div className="tv-card__header">
          <h2 className="tv-heading-4" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Truck size={20} style={{ color: "var(--tv-moss)" }} />
            Forma de entrega
          </h2>
        </div>
        <div className="tv-card__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-3)",
              padding: "var(--space-4)",
              borderRadius: "var(--r-xl)",
              border: `2px solid ${deliveryType === "delivery" ? "var(--tv-moss)" : "var(--tv-stone-200)"}`,
              background: deliveryType === "delivery" ? "rgba(5, 150, 105, 0.03)" : "transparent",
              cursor: "pointer",
              transition: "all var(--duration-fast) ease",
            }}
          >
            <input
              type="radio"
              name="delivery"
              value="delivery"
              checked={deliveryType === "delivery"}
              onChange={() => setDeliveryType("delivery")}
              style={{ marginTop: 2, accentColor: "var(--tv-moss)" }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <MapPin size={16} style={{ color: "var(--tv-moss)" }} />
                <span style={{ fontWeight: 600, color: "var(--tv-stone-800)" }}>Entrega no endereço</span>
              </div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-500)", marginTop: 2 }}>
                Receba no conforto da sua casa · {formatCurrency(settings?.delivery_fee ?? 0)}
              </p>
            </div>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--tv-moss)" }}>
              {formatCurrency(settings?.delivery_fee ?? 0)}
            </span>
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-3)",
              padding: "var(--space-4)",
              borderRadius: "var(--r-xl)",
              border: `2px solid ${deliveryType === "pickup" ? "var(--tv-moss)" : "var(--tv-stone-200)"}`,
              background: deliveryType === "pickup" ? "rgba(5, 150, 105, 0.03)" : "transparent",
              cursor: "pointer",
              transition: "all var(--duration-fast) ease",
            }}
          >
            <input
              type="radio"
              name="delivery"
              value="pickup"
              checked={deliveryType === "pickup"}
              onChange={() => setDeliveryType("pickup")}
              style={{ marginTop: 2, accentColor: "var(--tv-moss)" }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <Store size={16} style={{ color: "var(--tv-moss)" }} />
                <span style={{ fontWeight: 600, color: "var(--tv-stone-800)" }}>Retirar na loja</span>
              </div>
              <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-500)", marginTop: 2 }}>
                {settings?.address || "Retire diretamente conosco"}
              </p>
            </div>
            <span style={{ fontSize: "var(--text-sm)", fontWeight: 700, color: "var(--tv-success)" }}>Grátis</span>
          </label>
        </div>
      </div>

      {deliveryType === "delivery" && (
        <div className="tv-card">
          <div className="tv-card__header">
            <h2 className="tv-heading-4" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <Home size={20} style={{ color: "var(--tv-moss)" }} />
              Endereço de entrega
            </h2>
          </div>
          <div className="tv-card__body">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--space-4)",
              }}
              className="checkout-address-grid"
            >
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="tv-label">
                  Rua <span style={{ color: "var(--tv-danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={address.street}
                  onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
                  placeholder="Nome da rua"
                  className="tv-input"
                  style={{ borderColor: addressErrors.street ? "var(--tv-danger)" : undefined }}
                />
                {addressErrors.street && (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-danger)", marginTop: 4 }}>
                    {addressErrors.street}
                  </p>
                )}
              </div>
              <div>
                <label className="tv-label">
                  Número <span style={{ color: "var(--tv-danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={address.number}
                  onChange={(e) => setAddress((a) => ({ ...a, number: e.target.value }))}
                  placeholder="123"
                  className="tv-input"
                  style={{ borderColor: addressErrors.number ? "var(--tv-danger)" : undefined }}
                />
                {addressErrors.number && (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-danger)", marginTop: 4 }}>
                    {addressErrors.number}
                  </p>
                )}
              </div>
              <div>
                <label className="tv-label">Complemento</label>
                <input
                  type="text"
                  value={address.complement || ""}
                  onChange={(e) => setAddress((a) => ({ ...a, complement: e.target.value || null }))}
                  placeholder="Apto, bloco, etc."
                  className="tv-input"
                />
              </div>
              <div>
                <label className="tv-label">
                  Bairro <span style={{ color: "var(--tv-danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={address.neighborhood}
                  onChange={(e) => setAddress((a) => ({ ...a, neighborhood: e.target.value }))}
                  placeholder="Bairro"
                  className="tv-input"
                  style={{ borderColor: addressErrors.neighborhood ? "var(--tv-danger)" : undefined }}
                />
                {addressErrors.neighborhood && (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-danger)", marginTop: 4 }}>
                    {addressErrors.neighborhood}
                  </p>
                )}
              </div>
              <div>
                <label className="tv-label">CEP</label>
                <input
                  type="text"
                  value={address.cep}
                  onChange={(e) => setAddress((a) => ({ ...a, cep: e.target.value }))}
                  placeholder="00000-000"
                  className="tv-input"
                  style={{ borderColor: addressErrors.cep ? "var(--tv-danger)" : undefined }}
                />
                {addressErrors.cep && (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-danger)", marginTop: 4 }}>
                    {addressErrors.cep}
                  </p>
                )}
              </div>
              <div>
                <label className="tv-label">
                  Cidade <span style={{ color: "var(--tv-danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                  placeholder="Cidade"
                  className="tv-input"
                  style={{ borderColor: addressErrors.city ? "var(--tv-danger)" : undefined }}
                />
                {addressErrors.city && (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-danger)", marginTop: 4 }}>
                    {addressErrors.city}
                  </p>
                )}
              </div>
              <div>
                <label className="tv-label">
                  Estado <span style={{ color: "var(--tv-danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={address.state}
                  onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value.toUpperCase() }))}
                  placeholder="UF"
                  maxLength={2}
                  className="tv-input"
                  style={{
                    borderColor: addressErrors.state ? "var(--tv-danger)" : undefined,
                    textTransform: "uppercase",
                  }}
                />
                {addressErrors.state && (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-danger)", marginTop: 4 }}>
                    {addressErrors.state}
                  </p>
                )}
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="tv-label">Ponto de referência</label>
                <input
                  type="text"
                  value={address.reference || ""}
                  onChange={(e) => setAddress((a) => ({ ...a, reference: e.target.value || null }))}
                  placeholder="Ex: Próximo ao mercado, casa verde..."
                  className="tv-input"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="tv-card">
        <div className="tv-card__body">
          <label className="tv-label" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <StickyNote size={16} style={{ color: "var(--tv-stone-400)" }} /> Observações
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Alguma instrução especial para o preparo ou entrega?"
            rows={3}
            maxLength={500}
            className="tv-input"
            style={{ resize: "none", marginTop: "var(--space-2)" }}
          />
          <p style={{ fontSize: 10, color: "var(--tv-stone-400)", textAlign: "right", marginTop: 4 }}>
            {notes.length}/500
          </p>
        </div>
      </div>
    </div>
  );

  // ── STEP: PAYMENT ──
  const PaymentStep = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div className="tv-card">
        <div className="tv-card__header">
          <h2 className="tv-heading-4" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Wallet size={20} style={{ color: "var(--tv-moss)" }} />
            Forma de pagamento
          </h2>
        </div>
        <div className="tv-card__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {PAYMENT_METHODS.map((method) => {
            const isEnabled = settings?.[method.requiresSetting] ?? true;
            if (!isEnabled) return null;
            const Icon = method.icon;
            const isSelected = payment === method.key;
            return (
              <label
                key={method.key}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "var(--space-3)",
                  padding: "var(--space-4)",
                  borderRadius: "var(--r-xl)",
                  border: `2px solid ${isSelected ? "var(--tv-moss)" : "var(--tv-stone-200)"}`,
                  background: isSelected ? "rgba(5, 150, 105, 0.03)" : "transparent",
                  cursor: "pointer",
                  transition: "all var(--duration-fast) ease",
                }}
              >
                <input
                  type="radio"
                  name="payment"
                  value={method.key}
                  checked={isSelected}
                  onChange={() => setPayment(method.key)}
                  style={{ marginTop: 2, accentColor: "var(--tv-moss)" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
                    <Icon size={16} style={{ color: "var(--tv-moss)" }} />
                    <span style={{ fontWeight: 600, color: "var(--tv-stone-800)", fontSize: "var(--text-sm)" }}>
                      {method.label}
                    </span>
                    {method.online && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "var(--r-full)",
                          background: "var(--tv-info-lt)",
                          color: "var(--tv-info)",
                        }}
                      >
                        ONLINE
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-500)", marginTop: 2 }}>
                    {method.description}
                  </p>

                  {method.key === "pix" && isSelected && settings?.pix_key && (
                    <div
                      style={{
                        marginTop: "var(--space-3)",
                        padding: "var(--space-3)",
                        background: "var(--tv-cream)",
                        borderRadius: "var(--r-lg)",
                        border: "1px solid var(--tv-stone-200)",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "var(--text-xs)",
                          fontWeight: 600,
                          color: "var(--tv-stone-700)",
                          marginBottom: "var(--space-2)",
                        }}
                      >
                        Chave PIX da loja:
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <code
                          style={{
                            flex: 1,
                            fontSize: "var(--text-xs)",
                            fontFamily: "var(--font-mono)",
                            background: "var(--tv-white)",
                            padding: "var(--space-2) var(--space-3)",
                            borderRadius: "var(--r-lg)",
                            border: "1px solid var(--tv-stone-200)",
                            color: "var(--tv-stone-700)",
                          }}
                        >
                          {settings.pix_key}
                        </code>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "var(--r-full)",
                            background: "var(--tv-success-lt)",
                            color: "var(--tv-success)",
                            textTransform: "uppercase",
                          }}
                        >
                          {settings.pix_key_type}
                        </span>
                      </div>
                    </div>
                  )}

                  {method.key === "cash" && isSelected && (
                    <div style={{ marginTop: "var(--space-3)" }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          fontSize: "var(--text-sm)",
                          color: "var(--tv-stone-700)",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={needChange}
                          onChange={(e) => setNeedChange(e.target.checked)}
                          style={{ accentColor: "var(--tv-moss)" }}
                        />
                        Preciso de troco
                      </label>
                      {needChange && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-3)",
                            marginTop: "var(--space-2)",
                          }}
                        >
                          <span style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-600)" }}>Troco para R$</span>
                          <input
                            type="number"
                            step="0.01"
                            min={total}
                            value={changeFor}
                            onChange={(e) => setChangeFor(e.target.value ? Number(e.target.value) : "")}
                            placeholder={`Min. ${formatCurrency(total)}`}
                            className="tv-input"
                            style={{ width: 120 }}
                          />
                          {typeof changeFor === "number" && changeFor > total && (
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--tv-success)" }}>
                              Devolveremos {formatCurrency(changeFor - total)}
                            </span>
                          )}
                          {typeof changeFor === "number" && changeFor < total && changeFor > 0 && (
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--tv-danger)" }}>
                              Valor insuficiente
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--space-3)",
          padding: "var(--space-4)",
          borderRadius: "var(--r-xl)",
          background: "var(--tv-success-lt)",
          border: "1px solid rgba(5, 150, 105, 0.15)",
        }}
      >
        <ShieldCheck size={20} style={{ color: "var(--tv-success)", flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--tv-success)" }}>Pagamento seguro</p>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-500)", marginTop: 2 }}>
            {payment === "mercado_pago"
              ? "QR Code PIX gerado automaticamente com confirmação em tempo real."
              : payment === "pix"
                ? "Transfira para a chave PIX da loja. O pedido será confirmado após análise."
                : "Pague apenas quando receber seu pedido. Verifique os itens antes de pagar."}
          </p>
        </div>
      </div>
    </div>
  );

  // ── STEP: CONFIRM ──
  const ConfirmStep = (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div className="tv-card">
        <div className="tv-card__body" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(5, 150, 105, 0.1)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto var(--space-3)",
              }}
            >
              <Check size={32} style={{ color: "var(--tv-moss)" }} />
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-2xl)",
                color: "var(--tv-forest)",
                fontWeight: 700,
              }}
            >
              Tudo certo!
            </h2>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-500)", marginTop: "var(--space-1)" }}>
              Revise os detalhes antes de confirmar
            </p>
          </div>

          <div
            style={{
              padding: "var(--space-4)",
              borderRadius: "var(--r-xl)",
              background: "var(--tv-cream)",
              border: "1px solid var(--tv-stone-200)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-500)" }}>Entrega</span>
              <span
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: "var(--tv-stone-800)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {deliveryType === "pickup" ? <Store size={14} /> : <MapPin size={14} />}
                {deliveryType === "pickup" ? "Retirada na loja" : "Entrega no endereço"}
              </span>
            </div>
            {deliveryType === "delivery" && address.street && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-500)" }}>Endereço</span>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: 500,
                    color: "var(--tv-stone-800)",
                    textAlign: "right",
                  }}
                >
                  {address.street}, {address.number}
                  {address.complement && ` — ${address.complement}`}
                  <br />
                  {address.neighborhood}, {address.city}/{address.state}
                </span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-500)" }}>Pagamento</span>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--tv-stone-800)" }}>
                {PAYMENT_METHODS.find((m) => m.key === payment)?.label}
              </span>
            </div>
            {appliedCoupon && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-500)" }}>Cupom</span>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--tv-success)" }}>
                  {appliedCoupon.code}
                </span>
              </div>
            )}
            {payment === "cash" && needChange && typeof changeFor === "number" && changeFor > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-500)" }}>Troco para</span>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--tv-stone-800)" }}>
                  {formatCurrency(changeFor)}
                </span>
              </div>
            )}
            {notes && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: "var(--text-sm)", color: "var(--tv-stone-500)" }}>Observações</span>
                <span
                  style={{
                    fontSize: "var(--text-xs)",
                    fontWeight: 500,
                    color: "var(--tv-stone-800)",
                    textAlign: "right",
                    maxWidth: 200,
                  }}
                >
                  {notes}
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              padding: "var(--space-5)",
              borderRadius: "var(--r-xl)",
              background: "var(--tv-forest)",
              color: "var(--tv-linen)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "var(--text-sm)", opacity: 0.8 }}>Subtotal</span>
                <span style={{ fontSize: "var(--text-sm)" }}>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "var(--text-sm)", opacity: 0.8 }}>Desconto</span>
                  <span style={{ fontSize: "var(--text-sm)", color: "var(--tv-success-lt)" }}>
                    −{formatCurrency(discount)}
                  </span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "var(--text-sm)", opacity: 0.8 }}>Entrega</span>
                <span style={{ fontSize: "var(--text-sm)" }}>
                  {deliveryFee === 0 ? "Grátis" : formatCurrency(deliveryFee)}
                </span>
              </div>
              <div
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.2)",
                  margin: "var(--space-1) 0",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Total</span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-2xl)",
                    fontWeight: 700,
                  }}
                >
                  {formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── RENDER ──
  return (
    <PublicLayout>
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "var(--space-6) var(--space-4)",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <button
            onClick={() => navigate({ to: "/carrinho" })}
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
            Voltar ao carrinho
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
            Finalizar pedido
          </h1>
        </div>

        <Stepper currentStep={step} />

        {/* Step Content */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          {step === "review" && ReviewStep}
          {step === "delivery" && DeliveryStep}
          {step === "payment" && PaymentStep}
          {step === "confirm" && ConfirmStep}
        </div>

        {/* Navigation Buttons */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "var(--space-4)",
            borderTop: "1px solid var(--tv-stone-200)",
          }}
        >
          {step !== "review" ? (
            <button
              onClick={handleBack}
              className="tv-btn tv-btn--secondary"
              style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          ) : (
            <div />
          )}

          {step !== "confirm" ? (
            <button
              onClick={handleNext}
              className="tv-btn tv-btn--primary"
              style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}
            >
              Continuar
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={isSubmitting}
              className="tv-btn tv-btn--primary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                minWidth: 200,
                justifyContent: "center",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Confirmar pedido · {formatCurrency(total)}
                </>
              )}
            </button>
          )}
        </div>

        {/* Order Summary Sidebar (desktop) */}
        <div
          style={{
            position: "fixed",
            top: 120,
            right: 32,
            width: 280,
            background: "var(--tv-white)",
            borderRadius: "var(--r-2xl)",
            border: "1px solid var(--tv-stone-200)",
            boxShadow: "var(--shadow-lg)",
            padding: "var(--space-5)",
            display: "none",
          }}
          className="checkout-summary-desktop"
        >
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-sm)",
              fontWeight: 700,
              color: "var(--tv-forest)",
              marginBottom: "var(--space-3)",
            }}
          >
            Resumo
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-500)" }}>Subtotal</span>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-500)" }}>Desconto</span>
                <span style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--tv-success)" }}>
                  −{formatCurrency(discount)}
                </span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "var(--text-xs)", color: "var(--tv-stone-500)" }}>Entrega</span>
              <span style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>
                {deliveryFee === 0 ? "Grátis" : formatCurrency(deliveryFee)}
              </span>
            </div>
            <div style={{ height: 1, background: "var(--tv-stone-200)", margin: "var(--space-1) 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Total</span>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-lg)",
                  fontWeight: 700,
                  color: "var(--tv-forest)",
                }}
              >
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PIX Modal — SÓ RENDERIZA SE TODOS OS DADOS EXISTIREM */}
      {pixModalOpen && pixData && pixData.qrCode && pixData.qrCodeBase64 && (
        <PixModal
          isOpen={pixModalOpen}
          onClose={() => setPixModalOpen(false)}
          qrCode={pixData.qrCode}
          qrCodeBase64={pixData.qrCodeBase64}
          ticketUrl={pixData.ticketUrl}
          orderId={pixData.orderId}
          amount={total}
          userId={profile.id}
          onPaymentConfirmed={handlePaymentConfirmed}
        />
      )}

      <style>{`
        @media (min-width: 1200px) {
          .checkout-summary-desktop {
            display: block !important;
          }
        }
        @media (max-width: 600px) {
          .checkout-address-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </PublicLayout>
  );
}