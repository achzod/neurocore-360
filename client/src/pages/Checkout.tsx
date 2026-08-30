import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trackBeginCheckout, trackAddPaymentInfo, trackPurchase, trackDiscoveryScanLead, getMetaAttribution } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { LiveStatsBar } from "@/components/LiveStatsBar";
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
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type PlanId = "gratuit" | "anabolic" | "ultimate";
type PaymentRail = "card" | "klarna";
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
      "Analyse photo posturale",
    ],
  },
  {
    id: "anabolic",
    name: "Anabolic Bioscan",
    subtitle: "Focus hormonal & protocoles",
    priceLabel: "59€ d'acompte",
    popular: true,
    coachingNote: "100% déduit de ton coaching Achzod",
    features: [
      "137 questions approfondies",
      "Rapport 16 sections",
      "Axes cliniques + hormones",
      "Protocoles 90 jours détaillés",
      "Stack suppléments personnalisé",
    ],
    lockedFeatures: [
      "Analyse photo posturale",
      "Nutrition timing avancé",
      "HRV & performance cardio",
    ],
  },
  {
    id: "ultimate",
    name: "Ultimate Scan",
    subtitle: "L'analyse la plus complète du marché",
    priceLabel: "79€ d'acompte",
    features: [
      "183 questions ultra-détaillées",
      "Rapport 18 sections",
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

// ─────────────────────────────────────────────────────────────────────────────
// Social proof ,  3 curated reviews shown between comparison table and plan cards
// ─────────────────────────────────────────────────────────────────────────────

type CheckoutReview = {
  name: string;
  role: string;
  rating: number;
  excerpt: string;
  metric: string;
  metricLabel: string;
};

const CHECKOUT_REVIEWS: CheckoutReview[] = [
  {
    name: "Antoine B.",
    role: "Dev backend, 29 ans",
    rating: 5,
    excerpt: "2 ans que je dormais mal. L'audit a montré que mon timing caféine était pourri et mon magnésium au ras des pâquerettes.",
    metric: "+2h",
    metricLabel: "deep sleep",
  },
  {
    name: "Marc D.",
    role: "Cadre sup', 42 ans",
    rating: 5,
    excerpt: "J'étais en pré-burnout sans le savoir. Mon HRV était dans les choux. Achzod me l'a montré noir sur blanc avec des données que même mon médecin n'avait pas.",
    metric: "HRV +40%",
    metricLabel: "récupération",
  },
  {
    name: "Pierre L.",
    role: "Avocat, 45 ans",
    rating: 5,
    excerpt: "L'audit a détecté mon pré-diabète. Mon médecin traitant n'avait rien vu sur mes analyses standards. Achzod regarde les valeurs optimales.",
    metric: "HbA1c 5.2%",
    metricLabel: "normalisé",
  },
];

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} étoiles sur 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5 fill-current"
          style={{ color: i < rating ? "#FCDD00" : undefined }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function CheckoutSocialProof() {
  return (
    <section aria-labelledby="social-proof-heading" className="mt-10">
      <div className="flex flex-col items-center gap-2 mb-5 sm:flex-row sm:justify-center sm:gap-4">
        <h2
          id="social-proof-heading"
          className="text-sm font-semibold text-muted-foreground uppercase tracking-wider"
        >
          Ce que disent nos utilisateurs
        </h2>
        <Badge
          variant="secondary"
          className="gap-1.5 text-xs font-medium"
          aria-label="10 avis vérifiés, note moyenne 5 sur 5"
        >
          <Star className="h-3 w-3 fill-current" style={{ color: "#FCDD00" }} aria-hidden="true" />
          10 avis ,  5.0 / 5 moyenne
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {CHECKOUT_REVIEWS.map((review) => (
          <Card
            key={review.name}
            className="flex flex-col gap-3 p-4 border-border/60 bg-muted/20"
          >
            <div className="flex items-center justify-between">
              <StarRow rating={review.rating} />
              <span className="text-xs font-semibold text-primary tabular-nums">
                {review.metric}{" "}
                <span className="text-muted-foreground font-normal">{review.metricLabel}</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              &ldquo;{review.excerpt}&rdquo;
            </p>
            <div>
              <p className="text-sm font-semibold text-foreground">{review.name}</p>
              <p className="text-xs text-muted-foreground">{review.role}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline comparison table ,  no Theme dependency, pure Tailwind + shadcn
// ─────────────────────────────────────────────────────────────────────────────

type CellValue = boolean | string;

const COMPARISON_FEATURES: {
  label: string;
  discovery: CellValue;
  anabolic: CellValue;
  ultimate: CellValue;
}[] = [
  { label: "Domaines analysés", discovery: "10", anabolic: "16", ultimate: "18" },
  { label: "Score global 0-100", discovery: true, anabolic: true, ultimate: true },
  { label: "Recommandations", discovery: "Générales", anabolic: "Personnalisées", ultimate: "Personnalisées" },
  { label: "Stack Suppléments", discovery: false, anabolic: "Personnalisé", ultimate: "Personnalisé" },
  {
    label: "5 Protocoles (Matin/Soir/Digestion/Bureau/Training)",
    discovery: false,
    anabolic: true,
    ultimate: true,
  },
  { label: "Plan 30-60-90 jours", discovery: false, anabolic: true, ultimate: true },
  { label: "Profil hormonal détaillé", discovery: false, anabolic: true, ultimate: true },
  { label: "Analyse posturale 3D (photos)", discovery: false, anabolic: false, ultimate: true },
  { label: "Dashboard temps réel", discovery: false, anabolic: false, ultimate: "À vie" },
];

function ComparisonCell({ value }: { value: CellValue }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center">
        <Check className="h-4 w-4 text-emerald-500" aria-label="Inclus" />
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center justify-center">
        <X className="h-4 w-4 text-muted-foreground/40" aria-label="Non inclus" />
      </span>
    );
  }
  return <span className="text-xs font-medium text-foreground">{value}</span>;
}

function CheckoutComparisonTable() {
  return (
    <section aria-labelledby="comparison-heading" className="mt-12">
      <div className="text-center mb-6">
        <h2
          id="comparison-heading"
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Compare les niveaux d'analyse
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choisis en connaissance de cause ,  chaque scan est différent, pas juste "plus cher".
        </p>
      </div>

      {/* Scrollable wrapper for mobile */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[40%]"
              >
                Fonctionnalité
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[20%]"
              >
                <div className="font-bold text-foreground">Discovery</div>
                <div className="text-muted-foreground font-normal normal-case tracking-normal">Gratuit</div>
              </th>
              <th
                scope="col"
                className="relative px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider w-[20%] bg-primary/5 border-x border-primary/20"
              >
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <Badge className="text-[10px] px-2 py-0.5 whitespace-nowrap">
                    <Star className="h-2.5 w-2.5 mr-1" />
                    Populaire
                  </Badge>
                </div>
                <div className="font-bold text-foreground">Anabolic</div>
                <div className="text-primary font-bold normal-case tracking-normal">59€ d'acompte</div>
              </th>
              <th
                scope="col"
                className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[20%]"
              >
                <div className="font-bold text-foreground">Ultimate</div>
                <div className="text-muted-foreground font-normal normal-case tracking-normal">79€ d'acompte</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_FEATURES.map((feature, idx) => (
              <tr
                key={feature.label}
                className={`border-b border-border last:border-0 ${
                  idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                }`}
              >
                <td className="px-4 py-3 text-sm text-foreground">{feature.label}</td>
                <td className="px-3 py-3 text-center">
                  <ComparisonCell value={feature.discovery} />
                </td>
                <td className="px-3 py-3 text-center bg-primary/5 border-x border-primary/20">
                  <ComparisonCell value={feature.anabolic} />
                </td>
                <td className="px-3 py-3 text-center">
                  <ComparisonCell value={feature.ultimate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Coaching note */}
      <p className="mt-4 text-center text-sm text-muted-foreground italic">
        Le montant de ton scan est intégralement déduit si tu prends un coaching Achzod. C'est un acompte, pas une dépense.
      </p>
    </section>
  );
}

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
  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [paymentRail, setPaymentRail] = useState<PaymentRail>("card");

  useEffect(() => {
    const savedEmail = localStorage.getItem("neurocore_email");
    const savedResponses = localStorage.getItem("neurocore_responses");
    const savedPhotos = localStorage.getItem("neurocore_photos");
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
    const parsedResponses = JSON.parse(savedResponses);
    const parsedPhotos = savedPhotos ? JSON.parse(savedPhotos) : {};
    setResponses({ ...parsedResponses, ...parsedPhotos });
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

      const metaAttr = getMetaAttribution();

      if (planId === "gratuit") {
        return apiRequest("POST", "/api/audit/create", {
          email,
          type,
          responses,
          ...metaAttr,
        });
      }

      // Default: Stripe ,  server has fallback price IDs if frontend VITE vars are missing
      const checkoutPayload: Record<string, unknown> = {
        email,
        planType: type,
        responses,
        promoCode: validatedPromo?.code || null,
        paymentRail,
        ...metaAttr,
      };
      // Only send priceId if it's actually defined (VITE vars may be missing from build)
      const clientPriceId = STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS];
      if (clientPriceId) {
        checkoutPayload.priceId = clientPriceId;
      }
      const response = await apiRequest("POST", "/api/stripe/create-checkout-session", checkoutPayload);
      return response.json();
    },
    onSuccess: (data: any) => {
      const selectedPlanInfo = selectedPlan ? PRICING_PLANS.find((p) => p.id === selectedPlan) : undefined;
      const selectedAuditType = selectedPlan ? PLAN_ID_TO_AUDIT_TYPE[selectedPlan] : "audit";
      const selectedPrice = selectedPlanInfo ? Number(selectedPlanInfo.priceLabel.replace(/[^0-9]/g, "")) || 0 : 0;

      if (selectedPlan === "gratuit") {
        try { trackDiscoveryScanLead(data?.auditId || 'free'); } catch {}
        toast({
          title: "Audit créé avec succès !",
          description: "Tu vas recevoir un email avec tes résultats.",
        });
        localStorage.removeItem("neurocore_responses");
        localStorage.removeItem("neurocore_section");
        navigate("/auth/check-email");
      } else if (data?.free && data?.success && data?.auditId) {
        // 100% promo: audit created directly without payment
        try { trackPurchase(data.auditId || 'promo-100', selectedAuditType, selectedPlanInfo?.name || selectedAuditType, 0); } catch {}
        toast({
          title: "Code promo 100% appliqué !",
          description: "Ton audit a été créé gratuitement.",
        });
        localStorage.removeItem("neurocore_responses");
        localStorage.removeItem("neurocore_section");
        // Map auditType to the correct report route
        const reportPath =
          data.auditType === "ELITE" ? `/ultimate/${data.auditId}` :
          data.auditType === "PREMIUM" ? `/anabolic/${data.auditId}` :
          `/scan/${data.auditId}`;
        navigate(reportPath);
      } else if (data?.free && data?.auditType === "BLOOD_ANALYSIS") {
        toast({
          title: "Code promo 100% appliqué !",
          description: "Tes 2 crédits Blood Analysis ont été ajoutés. Accède à ton dashboard.",
        });
        navigate("/auth/login?next=/blood-dashboard&paid=true");
      } else if (data?.url) {
        try { trackBeginCheckout(selectedAuditType, selectedPlanInfo?.name || selectedAuditType, selectedPrice); } catch {}
        window.location.href = data.url; // Stripe redirect
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

  // Always show all plans - never hide paid options from free users
  const visiblePlans = PRICING_PLANS;

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

        {/* Comparison table ,  always visible so users see what they're missing */}
        <CheckoutComparisonTable />

        {/* Social proof ,  reinforces buying decision before plan selection */}
        <CheckoutSocialProof />

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

        {/* Payment Method */}
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentRail("card")}
                    className={`flex items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
                      paymentRail === "card"
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                    aria-pressed={paymentRail === "card"}
                  >
                    <CreditCard className="h-4 w-4" />
                    Carte
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentRail("klarna")}
                    className={`rounded-md border px-4 py-3 text-sm font-semibold transition-colors ${
                      paymentRail === "klarna"
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                    aria-pressed={paymentRail === "klarna"}
                  >
                    Klarna
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* CGV + Retractation acceptance */}
        {selectedPlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.38 }}
            className="mt-6 max-w-md mx-auto"
          >
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="cgv-accept"
                    checked={cgvAccepted}
                    onCheckedChange={(checked) => setCgvAccepted(checked === true)}
                    data-testid="checkbox-cgv"
                  />
                  <Label htmlFor="cgv-accept" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                    J'ai lu et j'accepte les{" "}
                    <a href="/cgv" target="_blank" className="text-primary underline">Conditions Generales de Vente</a>
                    {selectedPlan !== "gratuit" && (
                      <>
                        {" "}et je demande l'execution immediate du service. Je reconnais perdre mon droit de retractation une fois le rapport genere.
                      </>
                    )}
                    <span className="ml-1 text-destructive">*</span>
                  </Label>
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
                    ? paymentRail === "klarna"
                      ? "Tu seras redirigé vers le paiement Klarna sécurisé."
                      : "Tu seras redirigé vers le paiement carte sécurisé."
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
                disabled={!selectedPlan || !cgvAccepted || createAuditMutation.isPending}
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
                    {selectedPlan && selectedPlan !== "gratuit" && paymentRail === "klarna" ? "Confirmer Klarna" : "Confirmer"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Live social proof ,  real counters from DB */}
        <div className="mt-8">
          <LiveStatsBar variant="checkout" />
        </div>

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
            100% deductible du coaching
          </div>
        </div>
      </div>
    </div>
  );
}
