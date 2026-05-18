import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import {
  User,
  Target,
  Shield,
  Settings,
  Layers,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Lock,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/Header";
import { LiveStatsBar } from "@/components/LiveStatsBar";
import { apiRequest } from "@/lib/queryClient";
import { trackBeginCheckout, getMetaAttribution } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import {
  PEPTIDES_SECTIONS,
  shouldShowQuestion,
  shouldBlockPurchase,
  getQuestionsForSection,
  type PeptidesQuestion,
} from "@/lib/peptides-questionnaire";

// ─── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "peptides_engine_responses";
const PRICE_EUR = 299;

// Peptides Engine consent ─ versioned wording for legal traceability.
// IMPORTANT : ne JAMAIS modifier silencieusement le texte ci-dessous, toujours
// bumper TERMS_VERSION quand la formulation change. Le serveur stocke la
// version acceptée dans order.metadata.peptidesEngineConsent pour preuve en
// cas de litige PayPal/Stripe.
const PEPTIDES_TERMS_VERSION = "peptides-engine-cgv-v1-2026-05-18";
const PEPTIDES_TERMS_TEXT =
  "Je reconnais que le rapport Peptides Engine est un document personnalisé qu'Achzod rédige sur-mesure pour mon profil, livré sous 24 à 48h après ma commande. Je demande expressément qu'Achzod commence la préparation immédiatement après paiement. En raison de la nature digitale et personnalisée du rapport, aucun remboursement n'est possible une fois le rapport livré, et je renonce expressément et de manière irrévocable à mon droit de rétractation conformément à l'article L221-28 du Code de la consommation (contenu numérique personnalisé). Je confirme avoir lu et accepté les Conditions Générales de Vente.";

const SECTION_ICONS: Record<string, React.ElementType> = {
  profil: User,
  objectifs: Target,
  sante: Shield,
  pratique: Settings,
  stack: Layers,
  attentes: CheckCircle,
};

// ─── Question field renderer ─────────────────────────────────────────────────

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: PeptidesQuestion;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (question.type) {
    case "text":
      return (
        <Input
          type="text"
          placeholder={question.placeholder}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-500 max-w-md"
        />
      );

    case "email":
      return (
        <Input
          type="email"
          placeholder={question.placeholder}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-500 max-w-md"
        />
      );

    case "number":
      return (
        <Input
          type="number"
          placeholder={question.placeholder}
          min={question.min}
          max={question.max}
          value={(value as number) || ""}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-500 max-w-[140px]"
        />
      );

    case "textarea":
      return (
        <Textarea
          placeholder={question.placeholder}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-amber-500 min-h-24 max-w-lg"
        />
      );

    case "select": {
      return (
        <Select value={(value as string) || ""} onValueChange={onChange}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white max-w-md focus:border-amber-500 data-[placeholder]:text-white/30">
            <SelectValue placeholder="Selectionner..." />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
            {question.options?.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="focus:bg-amber-500/20 focus:text-white"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    case "checkbox": {
      const selected = (value as string[]) || [];
      return (
        <div className="flex flex-wrap gap-3">
          {question.options?.map((opt) => (
            <div
              key={opt.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                selected.includes(opt.value)
                  ? "border-amber-500 bg-amber-500/10 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:border-white/30"
              }`}
              onClick={() => {
                if (selected.includes(opt.value)) {
                  onChange(selected.filter((v) => v !== opt.value));
                } else {
                  onChange([...selected, opt.value]);
                }
              }}
            >
              <Checkbox
                id={`${question.id}-${opt.value}`}
                checked={selected.includes(opt.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...selected, opt.value]);
                  } else {
                    onChange(selected.filter((v) => v !== opt.value));
                  }
                }}
                className="border-white/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
              />
              <Label
                htmlFor={`${question.id}-${opt.value}`}
                className="cursor-pointer text-sm"
              >
                {opt.label}
              </Label>
            </div>
          ))}
        </div>
      );
    }

    case "scale": {
      const scaleVal = (value as number) ?? Math.round(((question.min ?? 0) + (question.max ?? 10)) / 2);
      return (
        <div className="space-y-3 max-w-md">
          <Slider
            value={[scaleVal]}
            onValueChange={([v]) => onChange(v)}
            min={question.min ?? 0}
            max={question.max ?? 10}
            step={1}
            className="[&_[data-slot=slider-track]]:bg-white/10 [&_[data-slot=slider-range]]:bg-amber-500 [&_[data-slot=slider-thumb]]:border-amber-500"
          />
          <div className="flex justify-between text-xs text-white/40">
            <span>{question.min ?? 0}</span>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{scaleVal}</Badge>
            <span>{question.max ?? 10}</span>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

// ─── Section view ────────────────────────────────────────────────────────────

function SectionView({
  sectionIndex,
  responses,
  onAnswer,
}: {
  sectionIndex: number;
  responses: Record<string, unknown>;
  onAnswer: (id: string, value: unknown) => void;
}) {
  const section = PEPTIDES_SECTIONS[sectionIndex];
  const questions = getQuestionsForSection(section.id).filter((q) =>
    shouldShowQuestion(q, responses)
  );

  return (
    <div className="space-y-8">
      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <Label className="text-white font-medium text-sm">
            {q.label}
            {q.required && <span className="text-amber-500 ml-1">*</span>}
          </Label>
          <QuestionField
            question={q}
            value={responses[q.id]}
            onChange={(v) => onAnswer(q.id, v)}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Safety banner ───────────────────────────────────────────────────────────

function SafetyBanner({ reason }: { reason: string }) {
  return (
    <div
      role="alert"
      className="flex gap-3 items-start p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-red-400" aria-hidden="true" />
      <p>{reason}</p>
    </div>
  );
}

// ─── Checkout card ───────────────────────────────────────────────────────────

function CheckoutCard({
  responses,
  onConfirmStripe,
  onConfirmPaypal,
  isLoading,
  paymentMethod,
  onPaymentMethodChange,
  promoCode,
  onPromoCodeChange,
  acceptedTerms,
  onAcceptedTermsChange,
}: {
  responses: Record<string, unknown>;
  onConfirmStripe: () => void;
  onConfirmPaypal: () => void;
  isLoading: boolean;
  paymentMethod: "stripe" | "paypal";
  onPaymentMethodChange: (m: "stripe" | "paypal") => void;
  promoCode: string;
  onPromoCodeChange: (v: string) => void;
  acceptedTerms: boolean;
  onAcceptedTermsChange: (v: boolean) => void;
}) {
  const safetyCheck = shouldBlockPurchase(responses);

  const valueItems = [
    { label: "Protocole personnalise (2-5 peptides)", value: "297€" },
    { label: "2 Blood Analyses incluses", value: "198€" },
    { label: "Acces source premium (-60% vs revendeurs)", value: "200€+" },
    { label: "Total valeur", value: "697€+" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Ton protocole est pret</h2>
        <p className="text-white/50 text-sm">
          Rempli le paiement pour recevoir ton protocole complet sous 48h
        </p>
      </div>

      {/* Value breakdown */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
          Ce qui est inclus
        </p>
        {valueItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-white/70">
              <Check className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
              {item.label}
            </span>
            <span
              className={
                item.label === "Total valeur"
                  ? "font-bold text-white/30 line-through"
                  : "text-white/40"
              }
            >
              {item.value}
            </span>
          </div>
        ))}

        <div className="border-t border-white/10 pt-3 flex items-center justify-between">
          <span className="font-bold text-white text-base">Peptides Engine</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-amber-400">{PRICE_EUR}€</span>
          </div>
        </div>
      </div>

      {/* Live social proof — real counters from DB, empty-state safe */}
      <LiveStatsBar variant="peptides" />

      {/* Safety gate */}
      {safetyCheck.blocked && safetyCheck.reason && (
        <SafetyBanner reason={safetyCheck.reason} />
      )}

      {/* Payment method toggle */}
      {!safetyCheck.blocked && (
        <div className="flex gap-2">
          <button
            onClick={() => onPaymentMethodChange("stripe")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              paymentMethod === "stripe"
                ? "border-amber-500 bg-amber-500/10 text-amber-400"
                : "border-white/10 bg-white/5 text-white/50 hover:border-white/30"
            }`}
            aria-pressed={paymentMethod === "stripe"}
          >
            Carte bancaire
          </button>
          <button
            onClick={() => onPaymentMethodChange("paypal")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
              paymentMethod === "paypal"
                ? "border-amber-500 bg-amber-500/10 text-amber-400"
                : "border-white/10 bg-white/5 text-white/50 hover:border-white/30"
            }`}
            aria-pressed={paymentMethod === "paypal"}
          >
            PayPal
          </button>
        </div>
      )}

      {/* Promo code */}
      {!safetyCheck.blocked && (
        <div className="flex gap-2">
          <input
            type="text"
            value={promoCode}
            onChange={(e) => onPromoCodeChange(e.target.value.toUpperCase())}
            placeholder="Code promo (optionnel)"
            className="flex-1 h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/30 focus:border-amber-500/50 focus:outline-none"
          />
        </div>
      )}

      {/* Consent — required before any payment can be initiated.
          Acceptance is captured server-side with timestamp + IP + UA + text
          version for legal traceability against PayPal/Stripe disputes. */}
      {!safetyCheck.blocked && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={acceptedTerms}
              onCheckedChange={(v) => onAcceptedTermsChange(v === true)}
              className="mt-1 border-amber-500/60 data-[state=checked]:bg-amber-500 data-[state=checked]:text-black"
              aria-label="J'accepte les conditions de la commande Peptides Engine"
            />
            <span className="text-xs text-white/70 leading-relaxed">
              Je reconnais que le rapport Peptides Engine est un document personnalisé qu'Achzod
              rédige sur-mesure pour mon profil, livré sous 24 à 48h après ma commande. Je demande
              expressément qu'Achzod commence la préparation immédiatement après paiement. En raison
              de la nature digitale et personnalisée du rapport, <strong className="text-white">aucun
              remboursement n'est possible une fois le rapport livré</strong>, et je renonce
              expressément à mon droit de rétractation conformément à l'article L221-28 du Code de
              la consommation. Je confirme avoir lu et accepté les{" "}
              <a
                href="/cgv"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 underline hover:text-amber-300"
              >
                Conditions Générales de Vente
              </a>
              .
            </span>
          </label>
        </div>
      )}

      {/* CTA */}
      <Button
        onClick={paymentMethod === "paypal" ? onConfirmPaypal : onConfirmStripe}
        disabled={safetyCheck.blocked || isLoading || !acceptedTerms}
        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-base h-12 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-disabled={safetyCheck.blocked || !acceptedTerms}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Redirection...
          </span>
        ) : safetyCheck.blocked ? (
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4" aria-hidden="true" />
            Achat desactive
          </span>
        ) : !acceptedTerms ? (
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4" aria-hidden="true" />
            Accepte les conditions pour continuer
          </span>
        ) : promoCode.trim() ? (
          `Utiliser mon code promo`
        ) : (
          `Confirmer — ${PRICE_EUR}€`
        )}
      </Button>

      {/* Trust line */}
      <p className="text-center text-xs text-white/30 flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" aria-hidden="true" />
        Paiement 100% securise — Stripe
      </p>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function PeptidesEnginePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [sectionIndex, setSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal">("stripe");
  const [showCheckout, setShowCheckout] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const totalSections = PEPTIDES_SECTIONS.length;
  const isLastSection = sectionIndex === totalSections - 1;
  const progress = showCheckout ? 100 : Math.round(((sectionIndex + 1) / totalSections) * 100);

  // Load from localStorage on mount + recovery save to server
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.responses) setResponses(parsed.responses);
        if (typeof parsed.sectionIndex === "number") setSectionIndex(parsed.sectionIndex);
        if (parsed.showCheckout) setShowCheckout(true);

        // Recovery: if responses have email, send to server as backup
        const email = parsed.responses?.pep_email as string;
        if (email && email.includes("@") && Object.keys(parsed.responses).length >= 5) {
          apiRequest("POST", "/api/peptides-engine/save-progress", {
            email,
            currentSection: parsed.sectionIndex ?? 0,
            totalSections: PEPTIDES_SECTIONS.length,
            responses: parsed.responses,
          }).catch(() => {});
        }
      }
    } catch {
      // Corrupted storage — start fresh
    }
  }, []);

  // Save to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ responses, sectionIndex, showCheckout })
      );
    } catch {
      // Storage full — ignore
    }
  }, [responses, sectionIndex, showCheckout]);

  const handleAnswer = (id: string, value: unknown) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
  };

  // Auto-save responses server-side on section change (fire-and-forget)
  const saveToServer = useCallback(async (section: number, currentResponses: Record<string, unknown>) => {
    const email = currentResponses["pep_email"] as string;
    if (!email || !email.includes("@")) return;
    try {
      await apiRequest("POST", "/api/peptides-engine/save-progress", {
        email,
        currentSection: section,
        totalSections: PEPTIDES_SECTIONS.length,
        responses: currentResponses,
      });
    } catch {
      // Auto-save is best-effort during questionnaire
    }
  }, []);

  const handleNext = () => {
    if (isLastSection) {
      setShowCheckout(true);
      saveToServer(sectionIndex + 1, responses);
    } else {
      setSectionIndex((i) => Math.min(i + 1, totalSections - 1));
      saveToServer(sectionIndex + 1, responses);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (showCheckout) {
      setShowCheckout(false);
    } else if (sectionIndex > 0) {
      setSectionIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Validation: check required questions in current section are filled
  const canContinue = (): boolean => {
    const section = PEPTIDES_SECTIONS[sectionIndex];
    const required = getQuestionsForSection(section.id).filter(
      (q) => q.required && shouldShowQuestion(q, responses)
    );
    return required.every((q) => {
      const v = responses[q.id];
      if (v === undefined || v === null || v === "") return false;
      if (Array.isArray(v) && v.length === 0) return false;
      // Email-type questions must be a properly formatted address — otherwise
      // the user can advance with "nom@gmail" or "test@.com" and only get
      // bounced at the backend Zod gate with a cryptic error (Achzod report
      // 2026-05-10: client thought PEPTIDES100 was broken, was actually his
      // email field that had been typed incomplete).
      if (q.type === "email" && typeof v === "string") {
        const trimmed = v.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return false;
      }
      return true;
    });
  };

  // Stripe mutation
  const checkoutMutation = useMutation({
    mutationFn: async (method: "stripe" | "paypal") => {
      const email = (responses["pep_email"] as string) || "";

      // Guard: server also rejects PEPTIDES_ENGINE without consent, but we
      // surface a friendly client error first so the user sees a normal
      // message instead of a 400 toast from the API layer.
      if (!acceptedTerms) {
        throw new Error("Accepte les conditions de la commande pour continuer.");
      }

      // CRITICAL: Save responses to server BEFORE checkout — MANDATORY
      // If this fails, abort checkout. A client must never pay without responses saved.
      const saveRes = await apiRequest("POST", "/api/peptides-engine/save-progress", {
        email,
        currentSection: PEPTIDES_SECTIONS.length,
        totalSections: PEPTIDES_SECTIONS.length,
        responses,
      });
      if (!saveRes.ok) {
        throw new Error("Impossible de sauvegarder tes reponses. Reessaie.");
      }

      // Verify responses exist server-side (double-check)
      const verifyRes = await apiRequest("GET", `/api/peptides-engine/verify-responses?email=${encodeURIComponent(email)}`);
      const verifyData = await verifyRes.json();
      if (!verifyData.verified) {
        throw new Error("Verification echouee. Reessaie dans quelques secondes.");
      }

      // Capture referrer from URL
      const urlRef = new URLSearchParams(window.location.search).get("ref") || "";

      const metaAttr = getMetaAttribution();

      // Versioned consent payload. The server timestamps acceptance with its
      // own clock to prevent client-side tampering, and pairs it with IP + UA
      // already captured from request headers. Used as legal evidence in any
      // PayPal/Stripe dispute.
      const peptidesEngineConsent = {
        accepted: true,
        version: PEPTIDES_TERMS_VERSION,
        text: PEPTIDES_TERMS_TEXT,
        clientAcceptedAt: new Date().toISOString(),
      };

      if (method === "paypal") {
        const res = await apiRequest("POST", "/api/paypal/create-order", {
          email,
          planType: "PEPTIDES_ENGINE",
          responses,
          promoCode: promoCode.trim() || undefined,
          peptidesEngineConsent,
          ...metaAttr,
        });
        return res.json();
      }

      const res = await apiRequest("POST", "/api/stripe/create-checkout-session", {
        email,
        planType: "PEPTIDES_ENGINE",
        responses,
        referrer: urlRef || undefined,
        promoCode: promoCode.trim() || undefined,
        peptidesEngineConsent,
        ...metaAttr,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      try {
        trackBeginCheckout("PEPTIDES_ENGINE", "Peptides Engine", PRICE_EUR);
      } catch {
        // analytics failure must never block redirect
      }

      if (data?.alreadyPaid && data?.redirect) {
        // Already paid — redirect to report or dashboard
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = data.redirect;
      } else if (data?.url) {
        // Stripe checkout redirect
        window.location.href = data.url;
      } else if (data?.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de rediriger vers le paiement. Reessaie.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error?.message || "Une erreur est survenue. Reessaie.",
        variant: "destructive",
      });
    },
  });

  const currentSection = PEPTIDES_SECTIONS[sectionIndex];
  const SectionIcon = SECTION_ICONS[currentSection.id] ?? User;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-10 pb-24">
        {/* Progress bar */}
        <div className="mb-8 space-y-2" aria-label={`Progression: ${progress}%`}>
          <div className="flex justify-between text-xs text-white/40">
            <span>
              {showCheckout
                ? "Paiement"
                : `Section ${sectionIndex + 1} / ${totalSections}`}
            </span>
            <span>{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden"
          >
            <motion.div
              className="h-full bg-amber-500 rounded-full"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!showCheckout ? (
            <motion.div
              key={`section-${sectionIndex}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {/* Section header */}
              <div className="mb-8 flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <SectionIcon className="h-5 w-5 text-amber-400" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{currentSection.title}</h1>
                  <p className="text-sm text-white/50 mt-0.5">{currentSection.subtitle}</p>
                </div>
              </div>

              {/* Questions */}
              <SectionView
                sectionIndex={sectionIndex}
                responses={responses}
                onAnswer={handleAnswer}
              />

              {/* Safety banner for current section */}
              {(() => {
                const safetyCheck = shouldBlockPurchase(responses);
                if (!safetyCheck.blocked) return null;
                return (
                  <div className="mt-6">
                    <SafetyBanner reason={safetyCheck.reason!} />
                  </div>
                );
              })()}

              {/* Navigation */}
              <div className="mt-10 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={sectionIndex === 0}
                  className="text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-0 disabled:pointer-events-none"
                  aria-label="Section precedente"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                  Retour
                </Button>

                <Button
                  onClick={handleNext}
                  disabled={!canContinue() || shouldBlockPurchase(responses).blocked}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={isLastSection ? "Aller au paiement" : "Section suivante"}
                >
                  {isLastSection ? "Voir mon protocole" : "Continuer"}
                  <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {/* Back button */}
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="text-white/50 hover:text-white hover:bg-white/5"
                  aria-label="Retour aux questions"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                  Modifier mes reponses
                </Button>
              </div>

              <CheckoutCard
                responses={responses}
                onConfirmStripe={() => checkoutMutation.mutate("stripe")}
                onConfirmPaypal={() => checkoutMutation.mutate("paypal")}
                isLoading={checkoutMutation.isPending}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                promoCode={promoCode}
                onPromoCodeChange={setPromoCode}
                acceptedTerms={acceptedTerms}
                onAcceptedTermsChange={setAcceptedTerms}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
