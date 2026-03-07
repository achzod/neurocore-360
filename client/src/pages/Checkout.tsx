import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import {
  Check,
  Lock,
  Star,
  Shield,
  Zap,
  Gift,
  ArrowRight,
  Loader2,
  Tag,
  CheckCircle2,
  XCircle,
  CreditCard,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type PlanId = "gratuit" | "anabolic" | "ultimate";
type PricingPlan = {
  id: PlanId;
  name: string;
  subtitle: string;
  priceLabel: string;
  features: string[];
  lockedFeatures: string[];
  popular?: boolean;
  coachingNote?: string;
};

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "gratuit",
    name: "Discovery Scan",
    subtitle: "Diagnostic gratuit et rapide",
    priceLabel: "0€",
    features: [
      "66 questions essentielles",
      "Dashboard interactif",
      "Scores des domaines clés",
      "Radar de performance",
    ],
    lockedFeatures: [
      "Rapport complet 16 sections",
      "Protocoles 90 jours",
      "Stack suppléments",
      "Wearables & analyse photo",
    ],
  },
  {
    id: "anabolic",
    name: "Anabolic Bioscan",
    subtitle: "Audit complet sur-mesure",
    priceLabel: "59€",
    popular: true,
    coachingNote: "Le meilleur équilibre profondeur / prix",
    features: [
      "137 questions approfondies",
      "Rapport 16 sections",
      "Axes cliniques + hormones",
      "Protocoles 90 jours détaillés",
      "Stack suppléments personnalisé",
    ],
    lockedFeatures: [
      "Wearables & analyse photo",
      "Nutrition timing avancé",
      "HRV & performance cardio",
    ],
  },
  {
    id: "ultimate",
    name: "Ultimate Scan",
    subtitle: "Le scan le plus complet",
    priceLabel: "79€",
    features: [
      "183 questions ultra-détaillées",
      "Rapport 18 sections",
      "Wearables (Oura, Whoop, Garmin...)",
      "Analyse photo posturale",
      "Nutrition timing + cardio avancé",
      "HRV & performance",
    ],
    lockedFeatures: [],
  },
];

const PLAN_ID_TO_AUDIT_TYPE: Record<PlanId, "GRATUIT" | "PREMIUM" | "ELITE"> = {
  gratuit: "GRATUIT",
  anabolic: "PREMIUM",
  ultimate: "ELITE",
};

const normalizePlan = (plan: string | null | undefined): PlanId | null => {
  if (!plan) return null;
  const normalized = plan.toLowerCase();
  if (normalized === "gratuit" || normalized === "discovery" || normalized === "free") return "gratuit";
  if (normalized === "anabolic" || normalized === "premium" || normalized === "essential") return "anabolic";
  if (normalized === "ultimate" || normalized === "elite") return "ultimate";
  return null;
};

export default function Checkout() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [lockedPlan, setLockedPlan] = useState<PlanId | null>(null);
  const [email, setEmail] = useState("");
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [promoCode, setPromoCode] = useState("");
  const [promoValidating, setPromoValidating] = useState(false);
  const [validatedPromo, setValidatedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal">("stripe");

  useEffect(() => {
    const savedEmail = localStorage.getItem("neurocore_email");
    const savedResponses = localStorage.getItem("neurocore_responses");
    const urlParams = new URLSearchParams(window.location.search);
    const urlPlan = normalizePlan(urlParams.get("plan"));
    const storedPlan = normalizePlan(localStorage.getItem("neurocore_plan"));
    const plan = urlPlan ?? storedPlan;

    if (plan) {
      localStorage.setItem("neurocore_plan", plan);
      setSelectedPlan(plan);
      setLockedPlan(plan);
    }

    if (!savedEmail || !savedResponses) {
      const targetPlan = plan ? `?plan=${plan}` : "";
      navigate(`/audit-complet/questionnaire${targetPlan}`);
      return;
    }

    setEmail(savedEmail);
    setResponses(JSON.parse(savedResponses));
  }, [navigate]);

  const validatePromoCode = async () => {
    if (!promoCode.trim()) return;

    setPromoValidating(true);
    setPromoError(null);

    try {
      const response = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoCode.trim(),
          auditType: selectedPlan ? PLAN_ID_TO_AUDIT_TYPE[selectedPlan] : "ALL",
        }),
      });
      const data = await response.json();

      if (data.valid) {
        setValidatedPromo({ code: promoCode.trim().toUpperCase(), discount: data.discount });
        setPromoError(null);
        toast({
          title: "Code promo appliqué !",
          description: `-${data.discount}% de réduction sur ton analyse`,
        });
      } else {
        setValidatedPromo(null);
        setPromoError(data.error || "Code invalide");
      }
    } catch {
      setPromoError("Erreur de validation");
    } finally {
      setPromoValidating(false);
    }
  };

  const removePromoCode = () => {
    setValidatedPromo(null);
    setPromoCode("");
    setPromoError(null);
  };

  // Re-validate promo when plan changes
  useEffect(() => {
    if (validatedPromo && selectedPlan) {
      validatePromoCode();
    }
  }, [selectedPlan]);

const STRIPE_PRICE_IDS: Record<Exclude<PlanId, "gratuit">, string> = {
  anabolic: import.meta.env.VITE_STRIPE_PRICE_ANABOLIC,
  ultimate: import.meta.env.VITE_STRIPE_PRICE_ULTIMATE,
};

  const createAuditMutation = useMutation({
    mutationFn: async (planId: PlanId) => {
      const type = PLAN_ID_TO_AUDIT_TYPE[planId];

      if (planId === "gratuit") {
        return apiRequest("POST", "/api/audit/create", {
          email,
          type,
          responses,
        });
      }

      if (paymentMethod === "paypal") {
        const response = await apiRequest("POST", "/api/paypal/create-order", {
          email,
          planType: type,
          responses,
          promoCode: validatedPromo?.code || null,
        });
        return response.json();
      }

      // Default: Stripe
      const response = await apiRequest("POST", "/api/stripe/create-checkout-session", {
        priceId: STRIPE_PRICE_IDS[planId],
        email,
        planType: type,
        responses,
        promoCode: validatedPromo?.code || null,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      if (selectedPlan === "gratuit") {
        toast({
          title: "Audit créé avec succès !",
          description: "Tu vas recevoir un email avec tes résultats.",
        });
        localStorage.removeItem("neurocore_responses");
        localStorage.removeItem("neurocore_section");
        navigate("/auth/check-email");
      } else if (data?.url) {
        window.location.href = data.url; // Stripe redirect
      } else if (data?.approvalUrl) {
        window.location.href = data.approvalUrl; // PayPal redirect
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de rediriger vers le paiement. Réessaie.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Réessaie.",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (planId: PlanId) => {
    if (lockedPlan && planId !== lockedPlan) return;
    setSelectedPlan(planId);
  };

  const handleConfirm = () => {
    if (selectedPlan) {
      createAuditMutation.mutate(selectedPlan);
    }
  };

  const visiblePlans = lockedPlan
    ? PRICING_PLANS.filter((plan) => plan.id === lockedPlan)
    : PRICING_PLANS;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="mx-auto max-w-5xl px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Badge variant="secondary" className="mb-4">
            Questionnaire complété
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Choisis ton niveau d'analyse
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Felicitations ! Tu as termine le questionnaire. Selectionne maintenant le niveau
            d'analyse qui te convient.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 items-stretch max-w-4xl mx-auto">
          {visiblePlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative flex"
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                  <Badge className="gap-1 px-3 py-1">
                    <Star className="h-3 w-3" />
                    Le + populaire
                  </Badge>
                </div>
              )}
              <Card
                className={`h-full cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? "border-primary ring-2 ring-primary"
                    : plan.popular
                    ? "border-primary/50"
                    : ""
                }`}
                onClick={() => handleSelectPlan(plan.id)}
                data-testid={`card-plan-${plan.id}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    {selectedPlan === plan.id && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{plan.priceLabel}</span>
                  </div>

                  {"coachingNote" in plan && plan.coachingNote && (
                    <div className="mb-6 rounded-md bg-primary/10 px-3 py-2">
                      <p className="text-xs font-medium text-primary">{plan.coachingNote}</p>
                    </div>
                  )}

                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    {plan.lockedFeatures.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-muted-foreground"
                      >
                        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Code Promo */}
        {selectedPlan && selectedPlan !== "gratuit" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 max-w-md mx-auto"
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Code promo</span>
                </div>

                {validatedPromo ? (
                  <div className="flex items-center justify-between rounded-md bg-green-500/10 border border-green-500/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="font-mono font-medium">{validatedPromo.code}</span>
                      <Badge variant="secondary" className="ml-2">
                        -{validatedPromo.discount}%
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removePromoCode}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Entre ton code promo"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value.toUpperCase());
                          setPromoError(null);
                        }}
                        onKeyDown={(e) => e.key === "Enter" && validatePromoCode()}
                        className={`font-mono ${promoError ? "border-red-500" : ""}`}
                      />
                      {promoError && (
                        <p className="text-xs text-red-500 mt-1">{promoError}</p>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      onClick={validatePromoCode}
                      disabled={promoValidating || !promoCode.trim()}
                    >
                      {promoValidating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Appliquer"
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Payment Method Selector */}
        {selectedPlan && selectedPlan !== "gratuit" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-6 max-w-md mx-auto"
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Moyen de paiement</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("stripe")}
                    className={`flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-all ${
                      paymentMethod === "stripe"
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                    </svg>
                    Carte bancaire
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("paypal")}
                    className={`flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-all ${
                      paymentMethod === "paypal"
                        ? "border-[#0070ba] bg-[#0070ba]/10 text-[#0070ba] ring-1 ring-[#0070ba]"
                        : "border-border hover:border-[#0070ba]/50"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c1.67 0 3.44-.175 4.857-1.344 1.287-1.06 2.072-2.71 2.072-5.044 0-2.508-.953-4.285-2.63-5.24C23.456.266 21.573 0 19.295 0h-8.38c-.79 0-1.467.574-1.59 1.353L5.793 22.766a.964.964 0 0 0 .952 1.114h4.945l1.246-7.907a1.588 1.588 0 0 1 1.564-1.353h2.602c5.246 0 9.353-2.132 10.546-8.297.037-.193.068-.382.097-.569a6.04 6.04 0 0 0-6.523-6.837z"/>
                    </svg>
                    PayPal
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8"
        >
          <Card className="bg-muted/30">
            <CardContent className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedPlan
                    ? `Tu as sélectionné : ${PRICING_PLANS.find((p) => p.id === selectedPlan)?.name}`
                    : "Sélectionne un plan pour continuer"}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedPlan === "gratuit"
                    ? "Tu recevras un email avec un lien vers ton rapport de base."
                    : selectedPlan
                    ? `Tu seras redirigé vers ${paymentMethod === "paypal" ? "PayPal" : "le paiement sécurisé par carte"}.`
                    : "Clique sur l'une des offres ci-dessus."}
                </p>
                {validatedPromo && selectedPlan && selectedPlan !== "gratuit" && (
                  <p className="mt-2 text-sm font-medium text-green-500">
                    Code promo {validatedPromo.code} appliqué : -{validatedPromo.discount}% de réduction
                  </p>
                )}
              </div>
              <Button
                size="lg"
                disabled={!selectedPlan || createAuditMutation.isPending}
                onClick={handleConfirm}
                className="w-full sm:w-auto"
                data-testid="button-confirm-plan"
              >
                {createAuditMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    Confirmer
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Paiement sécurisé
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Résultats instantanés
          </div>
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Garantie satisfait
          </div>
        </div>
      </div>
    </div>
  );
}
