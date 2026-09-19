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
import { trackBeginCheckout, trackClick, getMetaAttribution } from "@/lib/analytics";
import { PEPTIDES_PREVIEW_RESUME_KEY, resolveCampaignEngineChoiceDestination } from "@/lib/peptidesPreviewResume";
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

// 3 tiers : Solo (entry, no blood, no support) / Coached (recommandé, 1 blood, 30j support) / Tracked (2 blood, 90j support, 1 reécriture).
// Le rapport généré est IDENTIQUE dans les 3 tiers ; seul l'écosystème autour change.
export type PeptidesTier = "solo" | "coached" | "tracked";
type PaymentRail = "card" | "klarna";
type PreviewHandoffState = "absent" | "loading" | "ready" | "error";
type PreviewConfirmationField = "pep_blood_commit" | "pep_testo_bloodwork" | "pep_testo_fertility";
type PreviewCheckoutEstimate = {
  moleculeCount: number;
  durationLabel: string;
  estimatedGrandTotalUsd: number | null;
};

const TIER_CONFIG: Record<PeptidesTier, {
  label: string;
  price: number;
  bloodCredits: number;
  supportDays: number;
}> = {
  solo: { label: "Solo", price: 199, bloodCredits: 0, supportDays: 0 },
  coached: { label: "Coached", price: 299, bloodCredits: 1, supportDays: 30 },
  tracked: { label: "Tracked", price: 399, bloodCredits: 2, supportDays: 90 },
};

function readTierFromUrl(): PeptidesTier {
  if (typeof window === "undefined") return "coached";
  const raw = new URLSearchParams(window.location.search).get("tier");
  if (raw === "solo" || raw === "coached" || raw === "tracked") return raw;
  return "coached"; // default sweet spot
}

const PREVIEW_CONFIRMATION_COPY: Record<PreviewConfirmationField, {
  label: string;
  options: Array<{ value: string; label: string }>;
}> = {
  pep_blood_commit: {
    label: "Pour le suivi biologique, qu’est-ce qui te convient ?",
    options: [
      { value: "yes-both", label: "Bilan avant puis à mi-cycle" },
      { value: "yes-before", label: "Bilan avant uniquement" },
      { value: "maybe", label: "Je veux d’abord voir les recommandations" },
      { value: "no", label: "Je ne souhaite pas faire de bilan" },
    ],
  },
  pep_testo_bloodwork: {
    label: "Ton dernier bilan hormonal montre quoi ?",
    options: [
      { value: "recent-low", label: "Moins de 3 mois, testostérone basse" },
      { value: "recent-normal", label: "Moins de 3 mois, dans la norme" },
      { value: "old", label: "Plus de 3 mois" },
      { value: "never", label: "Jamais réalisé" },
    ],
  },
  pep_testo_fertility: {
    label: "La préservation de la fertilité est-elle une priorité ?",
    options: [
      { value: "critical", label: "Oui, projet proche" },
      { value: "important", label: "Oui, à moyen terme" },
      { value: "nice", label: "Préférable mais pas urgente" },
      { value: "no", label: "Non" },
    ],
  },
};

// Peptides Engine consent ─ versioned wording for legal traceability.
// IMPORTANT : ne JAMAIS modifier silencieusement le texte ci-dessous, toujours
// bumper TERMS_VERSION quand la formulation change. Le serveur stocke la
// version acceptée dans order.metadata.peptidesEngineConsent pour preuve en
// cas de litige Stripe.
const PEPTIDES_TERMS_VERSION = "peptides-engine-consent-v2-2026-08-13";
const PEPTIDES_TERMS_TEXT =
  "Je demande la création immédiate d'un protocole Peptides Engine personnalisé à partir de mes réponses. Je comprends qu'il s'agit d'un contenu éducatif, que certaines molécules peuvent être expérimentales ou non approuvées pour cet usage, et que le rapport ne remplace ni diagnostic ni ordonnance. Je confirme avoir fourni des informations exactes, avoir lu les contre-indications et critères d'arrêt, accepter la confidentialité de mes données et de la source fournisseur, et assumer mes décisions d'achat et d'utilisation. En raison de la nature digitale et personnalisée du rapport, aucun remboursement n'est possible une fois le rapport livré, et je renonce expressément à mon droit de rétractation conformément à l'article L221-28 du Code de la consommation. Je confirme avoir lu et accepté les Conditions Générales de Vente.";

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
  isLoading,
  promoCode,
  onPromoCodeChange,
  acceptedTerms,
  onAcceptedTermsChange,
  paymentRail,
  onPaymentRailChange,
  tier,
  onTierChange,
}: {
  responses: Record<string, unknown>;
  onConfirmStripe: () => void;
  isLoading: boolean;
  promoCode: string;
  onPromoCodeChange: (v: string) => void;
  acceptedTerms: boolean;
  onAcceptedTermsChange: (v: boolean) => void;
  paymentRail: PaymentRail;
  onPaymentRailChange: (v: PaymentRail) => void;
  tier: PeptidesTier;
  onTierChange: (t: PeptidesTier) => void;
}) {
  const safetyCheck = shouldBlockPurchase(responses);
  const tierCfg = TIER_CONFIG[tier];

  const tierFeatures: Record<PeptidesTier, { label: string; value: string }[]> = {
    solo: [
      { label: "Protocole personnalisé sur-mesure", value: "Inclus" },
      { label: "Accès source directe (-60 à -90%)", value: "Inclus" },
      { label: "Crédit déduction coaching 199€", value: "Inclus" },
      { label: "Bilan sanguin", value: "Non" },
      { label: "Support écrit post-livraison", value: "Non" },
    ],
    coached: [
      { label: "Protocole personnalisé sur-mesure", value: "Inclus" },
      { label: "Accès source directe (-60 à -90%)", value: "Inclus" },
      { label: "Crédit déduction coaching 299€", value: "Inclus" },
      { label: "1 Bilan sanguin (au choix)", value: "Inclus" },
      { label: "Support écrit 30 jours", value: "Inclus" },
    ],
    tracked: [
      { label: "Protocole personnalisé sur-mesure", value: "Inclus" },
      { label: "Accès source directe (-60 à -90%)", value: "Inclus" },
      { label: "Crédit déduction coaching 399€", value: "Inclus" },
      { label: "2 Bilans sanguins (baseline + mi-cycle)", value: "Inclus" },
      { label: "Support écrit 90 jours", value: "Inclus" },
      { label: "1 réécriture protocole sur évolution", value: "Inclus" },
    ],
  };
  const valueItems = tierFeatures[tier];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Ton protocole est pret</h2>
        <p className="text-white/50 text-sm">
          Choisis ton niveau d'accompagnement et confirme le paiement
        </p>
      </div>

      {/* Tier selector , 3 buttons */}
      <div className="grid grid-cols-3 gap-2">
        {(["solo", "coached", "tracked"] as const).map((t) => {
          const cfg = TIER_CONFIG[t];
          const active = tier === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onTierChange(t)}
              className={`relative rounded-xl border px-3 py-3 text-left transition-all ${
                active
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-white/10 bg-white/5 hover:border-white/30"
              }`}
              aria-pressed={active}
            >
              {t === "coached" && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 text-black px-2 py-0.5 text-[9px] font-bold whitespace-nowrap">
                  POPULAIRE
                </span>
              )}
              <div className={`text-xs font-bold ${active ? "text-amber-400" : "text-white/70"}`}>
                {cfg.label}
              </div>
              <div className={`text-xl font-bold mt-1 ${active ? "text-white" : "text-white/50"}`}>
                {cfg.price}€
              </div>
            </button>
          );
        })}
      </div>

      {/* Value breakdown , tier specific */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">
          Tier {tierCfg.label} , ce qui est inclus
        </p>
        {valueItems.map((item) => {
          const isExcluded = item.value === "Non";
          return (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-white/70">
                {isExcluded ? (
                  <span className="h-3.5 w-3.5 rounded-full border border-white/20 shrink-0" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                )}
                <span className={isExcluded ? "text-white/30 line-through" : ""}>
                  {item.label}
                </span>
              </span>
              <span className={isExcluded ? "text-white/20" : "text-white/40"}>{item.value}</span>
            </div>
          );
        })}

        <div className="border-t border-white/10 pt-3 flex items-center justify-between">
          <span className="font-bold text-white text-base">Peptides Engine {tierCfg.label}</span>
          <div className="text-right">
            <span className="text-2xl font-bold text-amber-400">{tierCfg.price}€</span>
          </div>
        </div>
      </div>

      {/* Live social proof ,  real counters from DB, empty-state safe */}
      <LiveStatsBar variant="peptides" />

      {/* Safety gate */}
      {safetyCheck.blocked && safetyCheck.reason && (
        <SafetyBanner reason={safetyCheck.reason} />
      )}

      {!safetyCheck.blocked && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onPaymentRailChange("card")}
            className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
              paymentRail === "card"
                ? "border-amber-500 bg-amber-500/10 text-amber-400"
                : "border-white/10 bg-white/5 text-white/50 hover:border-white/30"
            }`}
            aria-pressed={paymentRail === "card"}
          >
            Carte
          </button>
          <button
            type="button"
            onClick={() => onPaymentRailChange("klarna")}
            className={`rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
              paymentRail === "klarna"
                ? "border-amber-500 bg-amber-500/10 text-amber-400"
                : "border-white/10 bg-white/5 text-white/50 hover:border-white/30"
            }`}
            aria-pressed={paymentRail === "klarna"}
          >
            Klarna
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

      {/* Consent ,  required before any payment can be initiated.
          Acceptance is captured server-side with timestamp + IP + UA + text
          version for legal traceability against Stripe disputes. */}
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
              Je demande la création immédiate d'un protocole Peptides Engine personnalisé à partir
              de mes réponses. Je comprends qu'il s'agit d'un contenu éducatif, que certaines molécules
              peuvent être expérimentales ou non approuvées pour cet usage, et que le rapport ne remplace
              ni diagnostic ni ordonnance. Je confirme avoir fourni des informations exactes, lu les
              contre-indications et critères d'arrêt, accepté la confidentialité de mes données et de la
              source fournisseur, et assumer mes décisions d'achat et d'utilisation. En raison de la nature
              digitale et personnalisée du rapport, <strong className="text-white">aucun
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
        onClick={onConfirmStripe}
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
        ) : paymentRail === "klarna" ? (
          `Confirmer avec Klarna , ${tierCfg.price}€`
        ) : (
          `Confirmer par carte , ${tierCfg.price}€`
        )}
      </Button>

      {/* Trust line */}
      <p className="text-center text-xs text-white/30 flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" aria-hidden="true" />
        Paiement 100% securise ,  Stripe
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
  const [showCheckout, setShowCheckout] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [paymentRail, setPaymentRail] = useState<PaymentRail>("card");
  const [previewToken] = useState(() => {
    if (typeof window === "undefined") return "";
    const fragmentToken = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("preview_token");
    return fragmentToken || new URLSearchParams(window.location.search).get("preview_token") || "";
  });
  const [campaignEngineChoiceDestination] = useState(() => {
    if (typeof window === "undefined" || previewToken) return "";
    let storedResume: string | null = null;
    try {
      storedResume = localStorage.getItem(PEPTIDES_PREVIEW_RESUME_KEY);
    } catch {
      storedResume = null;
    }
    return resolveCampaignEngineChoiceDestination(window.location.search, storedResume) || "";
  });
  const [previewLeadId, setPreviewLeadId] = useState("");
  const [previewHandoffState, setPreviewHandoffState] = useState<PreviewHandoffState>(
    previewToken ? "loading" : "absent",
  );
  const [previewConfirmationFields, setPreviewConfirmationFields] = useState<PreviewConfirmationField[]>([]);
  const [previewEstimate, setPreviewEstimate] = useState<PreviewCheckoutEstimate | null>(null);
  // Tier preselected from ?tier= URL param (set by landing page CTAs).
  // Default to "coached" (sweet spot) so direct visits land on the recommended.
  const [tier, setTier] = useState<PeptidesTier>(() => readTierFromUrl());

  const totalSections = PEPTIDES_SECTIONS.length;
  const isLastSection = sectionIndex === totalSections - 1;
  const needsPreviewConfirmation = Boolean(previewToken && previewConfirmationFields.length && !showCheckout);
  const progress = showCheckout ? 100 : needsPreviewConfirmation ? 95 : Math.round(((sectionIndex + 1) / totalSections) * 100);

  // A direct Peptides Engine CTA from the campaign must never drop a cold
  // reader into the legacy full questionnaire. Resume a recent signed Preview
  // on the same browser; otherwise route to the short free Preview first.
  useEffect(() => {
    if (!campaignEngineChoiceDestination) return;
    window.location.replace(campaignEngineChoiceDestination);
  }, [campaignEngineChoiceDestination]);

  // Generic visits can recover the generic questionnaire. A signed Preview
  // handoff always reloads its server-mapped answers and only restores the
  // small confirmation fields saved for that exact lead.
  useEffect(() => {
    if (previewToken || campaignEngineChoiceDestination) return;
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
      // Corrupted storage ,  start fresh
    }
  }, [previewToken, campaignEngineChoiceDestination]);

  const recordPreviewEvent = useCallback(async (
    eventType: string,
    metadata: Record<string, string | number | boolean> = {},
  ) => {
    if (!previewToken) return;
    try {
      await apiRequest("POST", "/api/peptides-preview/conversion-event", {
        token: previewToken,
        eventType,
        metadata,
      });
    } catch {
      // Conversion telemetry never blocks the questionnaire or checkout.
    }
  }, [previewToken]);

  useEffect(() => {
    if (!previewToken) return;
    let cancelled = false;
    const loadHandoff = async () => {
      try {
        const sourceParams = new URLSearchParams(window.location.search);
        const response = await fetch("/api/peptides-preview/checkout-context", {
          method: "POST",
          credentials: "same-origin",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            token: previewToken,
            source: sourceParams.get("utm_source") || undefined,
            campaign: sourceParams.get("utm_campaign") || undefined,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data?.success || !data?.leadId || !data?.responses) {
          throw new Error(data?.error || "preview_context_unavailable");
        }
        if (cancelled) return;
        const leadId = String(data.leadId);
        setPreviewLeadId(leadId);
        setPreviewEstimate(data.estimate || null);
        const serverResponses = data.responses as Record<string, unknown>;
        const rawConfirmationFields: unknown[] = Array.isArray(data.confirmationFields) ? data.confirmationFields : [];
        const requestedFields = rawConfirmationFields.filter((field): field is PreviewConfirmationField =>
          field === "pep_blood_commit" || field === "pep_testo_bloodwork" || field === "pep_testo_fertility"
        );
        let mergedResponses = serverResponses;
        try {
          const saved = localStorage.getItem(`${STORAGE_KEY}:${leadId}`);
          if (saved) {
            const parsed = JSON.parse(saved);
            const savedResponses = parsed.responses && typeof parsed.responses === "object"
              ? parsed.responses as Record<string, unknown>
              : {};
            const restoredConfirmations = Object.fromEntries(
              requestedFields
                .filter((field) => savedResponses[field] !== undefined && savedResponses[field] !== "")
                .map((field) => [field, savedResponses[field]]),
            );
            mergedResponses = { ...serverResponses, ...restoredConfirmations };
          }
        } catch {
          mergedResponses = serverResponses;
        }
        const stillMissing = requestedFields.filter((field) => !mergedResponses[field]);
        setResponses(mergedResponses);
        setPreviewConfirmationFields(stillMissing);
        setSectionIndex(PEPTIDES_SECTIONS.length - 1);
        setShowCheckout(stillMissing.length === 0);
        setPreviewHandoffState("ready");
      } catch {
        if (!cancelled) setPreviewHandoffState("error");
      }
    };
    void loadHandoff();
    return () => { cancelled = true; };
  }, [previewToken]);

  // Save to localStorage on every change
  useEffect(() => {
    if (previewToken && (previewHandoffState !== "ready" || !previewLeadId)) return;
    try {
      localStorage.setItem(
        previewLeadId ? `${STORAGE_KEY}:${previewLeadId}` : STORAGE_KEY,
        JSON.stringify({ responses, sectionIndex, showCheckout })
      );
    } catch {
      // Storage full ,  ignore
    }
  }, [previewToken, previewLeadId, previewHandoffState, responses, sectionIndex, showCheckout]);

  // Handle ?cancelled=true return from Stripe cancel flow.
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("cancelled") === "true") {
      toast({
        title: "Paiement annulé",
        description: "Tu peux relancer le paiement quand tu veux, tes réponses sont gardées.",
      });
      urlParams.delete("cancelled");
      const cleanQuery = urlParams.toString();
      window.history.replaceState({}, "", `/peptides-engine${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash}`);
      setShowCheckout(true);
    }
  }, [toast]);

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
      void recordPreviewEvent("questionnaire_completed", { responseCount: Object.keys(responses).length });
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
      // Email-type questions must be a properly formatted address ,  otherwise
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
    mutationFn: async () => {
      const email = (responses["pep_email"] as string) || "";

      // Guard: server also rejects PEPTIDES_ENGINE without consent, but we
      // surface a friendly client error first so the user sees a normal
      // message instead of a 400 toast from the API layer.
      if (!acceptedTerms) {
        throw new Error("Accepte les conditions de la commande pour continuer.");
      }

      // Save responses to server BEFORE checkout. Server also re-saves them at
      // order creation time from the checkout payload (belt-and-suspenders),
      // so we tolerate a save failure here to keep the flow fast.
      try {
        const saveRes = await apiRequest("POST", "/api/peptides-engine/save-progress", {
          email,
          currentSection: PEPTIDES_SECTIONS.length,
          totalSections: PEPTIDES_SECTIONS.length,
          responses,
        });
        if (!saveRes.ok) {
          console.warn("[PeptidesEngine] save-progress non-2xx, server will re-save from checkout payload");
        }
      } catch (saveErr) {
        console.warn("[PeptidesEngine] save-progress errored, server will re-save from checkout payload:", saveErr);
      }
      // NOTE: verify-responses removed , its 1-3s read-after-write polling was
      // the dominant cause of Safari iOS dropping the redirect gesture window.
      // The responses payload below + server-side re-save is enough redundancy.

      // Capture referrer from URL
      const urlRef = new URLSearchParams(window.location.search).get("ref") || "";

      const metaAttr = getMetaAttribution();

      // Versioned consent payload. The server timestamps acceptance with its
      // own clock to prevent client-side tampering, and pairs it with IP + UA
      // already captured from request headers. Used as legal evidence in any
      // Stripe dispute.
      const peptidesEngineConsent = {
        accepted: true,
        version: PEPTIDES_TERMS_VERSION,
        text: PEPTIDES_TERMS_TEXT,
        clientAcceptedAt: new Date().toISOString(),
      };

      const res = await apiRequest("POST", "/api/stripe/create-checkout-session", {
        email,
        planType: "PEPTIDES_ENGINE",
        peptidesTier: tier,
        responses,
        previewToken: previewToken || undefined,
        referrer: urlRef || undefined,
        promoCode: promoCode.trim() || undefined,
        paymentRail,
        peptidesEngineConsent,
        ...metaAttr,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      try {
        trackBeginCheckout("PEPTIDES_ENGINE", `Peptides Engine ${TIER_CONFIG[tier].label}`, TIER_CONFIG[tier].price);
      } catch {
        // analytics failure must never block redirect
      }

      if (data?.alreadyPaid && data?.redirect) {
        // Already paid ,  redirect to report or dashboard
        localStorage.removeItem(previewLeadId ? `${STORAGE_KEY}:${previewLeadId}` : STORAGE_KEY);
        window.location.href = data.redirect;
      } else if (data?.url) {
        // Stripe checkout redirect
        window.location.href = data.url;
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de rediriger vers le paiement. Reessaie.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      void recordPreviewEvent("checkout_error", {
        tier,
        errorCode: String(error?.message || "checkout_error").slice(0, 160),
      });
      toast({
        title: "Erreur",
        description: error?.message || "Une erreur est survenue. Reessaie.",
        variant: "destructive",
      });
    },
  });

  const currentSection = PEPTIDES_SECTIONS[sectionIndex];
  const SectionIcon = SECTION_ICONS[currentSection.id] ?? User;

  if (campaignEngineChoiceDestination) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-20">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-amber-400" aria-hidden="true" />
            <h1 className="mt-5 text-xl font-bold">Je prépare le parcours le plus court</h1>
            <p className="mt-2 text-sm leading-6 text-white/55">Ton profil déjà calculé sera repris automatiquement. Sinon, tu commences par l’estimation gratuite.</p>
          </div>
        </main>
      </div>
    );
  }

  if (previewToken && previewHandoffState !== "ready") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-20">
          {previewHandoffState === "loading" ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <Loader2 className="mx-auto h-7 w-7 animate-spin text-amber-400" aria-hidden="true" />
              <h1 className="mt-5 text-xl font-bold">Je récupère ton estimation</h1>
              <p className="mt-2 text-sm leading-6 text-white/55">Tes réponses sont reprises automatiquement. Tu ne recommences pas le questionnaire.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-red-400/25 bg-red-400/5 p-8 text-center">
              <AlertTriangle className="mx-auto h-7 w-7 text-red-300" aria-hidden="true" />
              <h1 className="mt-5 text-xl font-bold">Le lien n’a pas pu être vérifié</h1>
              <p className="mt-2 text-sm leading-6 text-white/55">Je ne peux pas associer ce parcours à ton estimation. Recharge la page ou écris directement à Achzod pour récupérer un accès valide.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button onClick={() => window.location.reload()} className="bg-amber-500 font-bold text-black hover:bg-amber-400">Réessayer</Button>
                <a href="https://wa.me/971585210514" className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5">Écrire sur WhatsApp</a>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-10 pb-24">
        {!previewToken && <a
          href="/peptides-preview?utm_source=peptides_questionnaire&utm_medium=top_banner&utm_campaign=pre_peptides_engine"
          data-testid="peptides-questionnaire-preview-cta"
          onClick={() => trackClick("peptides_preview_entry_questionnaire", "/peptides-preview")}
          className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-amber-400/35 bg-amber-400/10 px-5 py-4 transition hover:border-amber-300 hover:bg-amber-400/15"
        >
          <span>
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-amber-400">Nouveau · gratuit</span>
            <span className="mt-1 block text-sm font-semibold text-white">Estime d'abord les molécules et le budget adaptés à ton profil</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
        </a>}

        {/* Progress bar */}
        <div className="mb-8 space-y-2" aria-label={`Progression: ${progress}%`}>
          <div className="flex justify-between text-xs text-white/40">
            <span>
              {showCheckout
                ? "Paiement"
                : needsPreviewConfirmation
                  ? "Confirmation rapide"
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
              key={needsPreviewConfirmation ? "preview-confirmation" : `section-${sectionIndex}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {needsPreviewConfirmation ? (
                <>
                  <div className="mb-8 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                      <div>
                        <h1 className="text-xl font-bold text-white">Tes réponses sont récupérées</h1>
                        <p className="mt-1 text-sm leading-6 text-white/60">
                          Il reste {previewConfirmationFields.length} confirmation{previewConfirmationFields.length > 1 ? "s" : ""} avant de choisir ton offre et payer.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {previewConfirmationFields.map((field) => {
                      const copy = PREVIEW_CONFIRMATION_COPY[field];
                      return (
                        <label key={field} className="block rounded-2xl border border-white/10 bg-white/[.035] p-5">
                          <span className="mb-3 block text-sm font-semibold text-white">{copy.label}</span>
                          <select
                            value={String(responses[field] || "")}
                            onChange={(event) => handleAnswer(field, event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[#111318] px-4 py-3 text-sm text-white outline-none focus:border-amber-400"
                          >
                            <option value="">Choisir</option>
                            {copy.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-8 flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <SectionIcon className="h-5 w-5 text-amber-400" aria-hidden="true" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white">{currentSection.title}</h1>
                      <p className="text-sm text-white/50 mt-0.5">{currentSection.subtitle}</p>
                    </div>
                  </div>
                  <SectionView sectionIndex={sectionIndex} responses={responses} onAnswer={handleAnswer} />
                </>
              )}

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
              <div className={`mt-10 flex items-center ${needsPreviewConfirmation ? "justify-end" : "justify-between"}`}>
                {!needsPreviewConfirmation && (
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
                )}

                <Button
                  onClick={() => {
                    if (!needsPreviewConfirmation) {
                      handleNext();
                      return;
                    }
                    setPreviewConfirmationFields([]);
                    setShowCheckout(true);
                    void recordPreviewEvent("delta_completed", { mode: "preview_confirmation", responseCount: Object.keys(responses).length });
                    void saveToServer(PEPTIDES_SECTIONS.length, responses);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  disabled={(needsPreviewConfirmation
                    ? previewConfirmationFields.some((field) => !responses[field])
                    : !canContinue()) || shouldBlockPurchase(responses).blocked}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={needsPreviewConfirmation ? "Choisir mon offre" : isLastSection ? "Aller au paiement" : "Section suivante"}
                >
                  {needsPreviewConfirmation ? "Choisir mon offre" : isLastSection ? "Voir mon protocole" : "Continuer"}
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
              {!previewToken && <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="text-white/50 hover:text-white hover:bg-white/5"
                  aria-label="Retour aux questions"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                  Modifier mes reponses
                </Button>
              </div>}

              {previewToken && (
                <div className="mb-6 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                    <div>
                      <p className="font-bold text-white">Ton profil Pré-Peptides est déjà repris</p>
                      <p className="mt-1 text-sm leading-6 text-white/60">
                        {previewEstimate?.moleculeCount
                          ? `${previewEstimate.moleculeCount} molécule${previewEstimate.moleculeCount > 1 ? "s" : ""} estimée${previewEstimate.moleculeCount > 1 ? "s" : ""} · ${previewEstimate.durationLabel || "durée conservée"}`
                          : "Tes réponses sont reliées à cette commande."}
                        {previewEstimate?.estimatedGrandTotalUsd != null ? ` · produits et livraison estimés à $${previewEstimate.estimatedGrandTotalUsd.toFixed(2)}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <CheckoutCard
                responses={responses}
                onConfirmStripe={() => checkoutMutation.mutate()}
                isLoading={checkoutMutation.isPending}
                promoCode={promoCode}
                onPromoCodeChange={setPromoCode}
                acceptedTerms={acceptedTerms}
                onAcceptedTermsChange={setAcceptedTerms}
                paymentRail={paymentRail}
                onPaymentRailChange={setPaymentRail}
                tier={tier}
                onTierChange={(nextTier) => {
                  setTier(nextTier);
                  void recordPreviewEvent("tier_selected", { tier: nextTier });
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
