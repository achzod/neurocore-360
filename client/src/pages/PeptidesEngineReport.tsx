/**
 * Peptides Engine Report v3 :Structured protocol display
 * Parsed sections, weekly schedule table, shopping list cards
 */
import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { splitWeeklyScheduleEntries } from "@/lib/peptidesSchedule";
import { motion } from "framer-motion";
import {
  Shield, Syringe, FlaskConical, Activity, AlertTriangle, ExternalLink,
  ChevronDown, ShoppingCart, Calendar, Lock, User, Brain, ArrowRight,
  CheckCircle2, Globe, Droplets, HelpCircle, Star, Send, Loader2, MessageCircle,
} from "lucide-react";
import { Header } from "@/components/Header";
import { CoachingPromoBanner } from "@/components/CoachingPromoBanner";
import { Footer } from "@/components/Footer";
import { ReconstitutionStepByStep, FiveReconstitutionErrors, DoseCalculatorVisual } from "@/components/peptides/ReconstitutionVisualGuide";
import { trackWhatsAppClick } from "@/lib/analytics";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const AMBER = "#F59E0B";

interface PeptideRec {
  name: string;
  purpose: string;
  dosage: string;
  timing: string;
  route: string;
  cycleDuration: string;
  purchaseUrl: string;
  priceEstimate: string;
  reconstitution?: string;
  whyThisPeptide?: string;
  vialsNeeded?: string;
}

interface ReportSection {
  id: string;
  title: string;
  content: string;
}

interface PeptidesReport {
  clientName: string;
  tier?: PeptidesTier;
  qualityVersion?: string;
  sections: ReportSection[];
  peptides: PeptideRec[];
  bloodMarkers: string[];
  weeklySchedule?: string;
  shoppingList?: string;
  promoCodes: string[];
  generatedAt: string;
  _generationMeta?: {
    generatedAt?: string;
    model?: string;
    provider?: string;
  };
  _catalogLiveSync?: {
    country?: string;
    syncedAt?: string;
    catalogRefreshedAt?: string;
  };
}

type PeptidesTier = "solo" | "coached" | "tracked";
type PeptidesWhatsAppPlacement = "report_primary" | "report_sticky";

function PeptidesWhatsAppLink({
  placement,
  clientName,
  tier,
  label,
  className = "",
}: {
  placement: PeptidesWhatsAppPlacement;
  clientName?: string;
  tier: PeptidesTier;
  label: string;
  className?: string;
}) {
  const identity = clientName && clientName !== "Profil" ? ` Je suis ${clientName}.` : "";
  const destination = buildWhatsAppUrl(
    `Salut Achzod, je viens de consulter mon rapport Peptides Engine.${identity} Je veux ton aide pour piloter le protocole et choisir le coaching le plus adapte.`
  );

  return (
    <a
      href={destination}
      target="_blank"
      rel="noopener noreferrer"
      data-testid={`peptides-whatsapp-${placement}`}
      aria-label={`${label} (ouvre WhatsApp dans un nouvel onglet)`}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 font-bold text-white shadow-[0_12px_34px_rgba(37,211,102,0.28)] transition-all hover:-translate-y-0.5 hover:bg-[#20BD5A] hover:shadow-[0_16px_38px_rgba(37,211,102,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:ring-offset-black ${className}`}
      onClick={() => {
        try {
          trackWhatsAppClick({
            offer: "Peptides Engine",
            placement,
            tier,
            destination,
          });
        } catch {
          // Analytics must never block access to WhatsApp.
        }
      }}
    >
      <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </a>
  );
}

// ============================================================================
// CONTENT PARSER :converts raw text to structured JSX
// ============================================================================
function FormatSectionContent({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="space-y-1.5 my-3 ml-1">
          {listItems.map((item, i) => (
            <li key={i} className="flex min-w-0 items-start gap-2 text-sm text-white/65">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: AMBER }} />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{item}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip separator lines
    if (/^[━═─\-]{3,}$/.test(trimmed)) continue;
    if (!trimmed) {
      flushList();
      continue;
    }

    // Sub-headers: ALL CAPS lines (min 5 chars, not a list item)
    if (trimmed === trimmed.toUpperCase() && trimmed.length >= 5 && !trimmed.startsWith("-") && !trimmed.startsWith("•") && /[A-Z]/.test(trimmed)) {
      flushList();
      elements.push(
        <h4 key={key++} className="font-bold text-white text-sm mt-5 mb-2 flex items-center gap-2">
          <div className="w-1 h-4 rounded-full" style={{ background: AMBER }} />
          {trimmed}
        </h4>
      );
      continue;
    }

    // List items
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || /^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^[-•]\s+/, "").replace(/^\d+\.\s+/, "");
      listItems.push(text);
      continue;
    }

    // Key-value lines (contains : with short label)
    const kvMatch = trimmed.match(/^([^:]{3,40}):\s+(.+)$/);
    if (kvMatch && !trimmed.startsWith("http")) {
      flushList();
      elements.push(
        <p key={key++} className="min-w-0 break-words [overflow-wrap:anywhere] text-sm text-white/65 my-1">
          <span className="font-semibold text-white/90">{kvMatch[1]}:</span> {kvMatch[2]}
        </p>
      );
      continue;
    }

    // Normal paragraph
    flushList();
    elements.push(
      <p key={key++} className="min-w-0 break-words [overflow-wrap:anywhere] text-[15px] text-white/70 leading-[1.8] my-2">
        {trimmed}
      </p>
    );
  }

  flushList();
  return <div className="min-w-0 max-w-full overflow-hidden space-y-0.5">{elements}</div>;
}

// ============================================================================
// WEEKLY SCHEDULE TABLE
// ============================================================================
function WeeklyScheduleTable({ schedule }: { schedule: string }) {
  if (!schedule) return null;

  // Parse "LUNDI AM: ... | LUNDI PM: ... | MARDI AM: ..." format
  // A dose can itself contain pipes, for example "S1: ... | S2: ...".
  // Split only when the next segment starts with a real weekday so the full
  // titration remains visible in the table cell.
  const entries = splitWeeklyScheduleEntries(schedule);
  const days: Record<string, { am: string; pm: string }> = {};
  const DAY_ORDER = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"];

  for (const entry of entries) {
    // Flexible matching: LUNDI AM/PM/MATIN/SOIR/À JEUN/etc.
    const match = entry.match(/^(LUNDI|MARDI|MERCREDI|JEUDI|VENDREDI|SAMEDI|DIMANCHE)\s+(.+?):\s*(.+)$/i);
    if (match) {
      const day = match[1].toUpperCase();
      const periodRaw = match[2].toUpperCase();
      const content = match[3].trim();
      const isAM = /AM|MATIN|JEUN|REVEIL/.test(periodRaw);
      if (!days[day]) days[day] = { am: "", pm: "" };
      if (isAM) days[day].am = content;
      else days[day].pm = content;
    }
  }

  const sortedDays = DAY_ORDER.filter(d => days[d]);

  // Fallback: if parsing failed, show raw text
  if (sortedDays.length === 0) {
    return (
      <div className="mt-4 space-y-2">
        {entries.map((e, i) => (
          <div key={i} className="bg-white/5 rounded-lg p-3">
            <p className="text-sm text-white/70">{e}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-auto mt-4">
      <table className="w-full min-w-[38rem] text-sm border-collapse table-fixed">
        <thead>
          <tr>
            <th className="text-left p-3 text-[10px] font-mono uppercase tracking-widest text-white/40 border-b border-white/10">Jour</th>
            <th className="text-left p-3 text-[10px] font-mono uppercase tracking-widest border-b border-white/10" style={{ color: AMBER }}>Matin (AM)</th>
            <th className="text-left p-3 text-[10px] font-mono uppercase tracking-widest border-b border-white/10" style={{ color: AMBER }}>Soir (PM)</th>
          </tr>
        </thead>
        <tbody>
          {sortedDays.map((day) => (
            <tr key={day} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
              <td className="p-3 font-semibold text-white text-xs">{day}</td>
              <td className="p-3 text-white/60 text-xs break-words [overflow-wrap:anywhere]">{days[day].am || <span className="text-white/20">repos</span>}</td>
              <td className="p-3 text-white/60 text-xs break-words [overflow-wrap:anywhere]">{days[day].pm || <span className="text-white/20">repos</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// SHOPPING LIST CARDS
// ============================================================================
function ShoppingListCards({ list }: { list: string }) {
  if (!list) return null;

  const items = list.includes("\n")
    ? list.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
    : list.split("|").map(s => s.trim()).filter(Boolean);
  const peptideItems: { name: string; details: string }[] = [];
  const equipmentItems: string[] = [];
  let totalLine = "";

  for (const item of items) {
    const lines = item.split(/\n+/).map(line => line.trim()).filter(Boolean);
    const firstLine = lines[0] || item;
    const readableName = firstLine.replace(/^\d+\.\s*/, "");
    const details = lines.length > 1 ? lines.slice(1).join(" ") : item;
    if (firstLine.toUpperCase().startsWith("TOTAL")) {
      totalLine = lines.join(" ");
    } else if (details.includes("$") || details.includes("vial")) {
      peptideItems.push({
        name: readableName.split("×")[0]?.trim() || readableName.split("=")[0]?.trim() || readableName,
        details,
      });
    } else {
      equipmentItems.push(lines.join(" "));
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Peptide items */}
      {peptideItems.map((item, i) => (
        <div key={i} className="bg-white/5 border border-white/8 rounded-xl p-3 min-w-0">
          <div className="flex items-start gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: AMBER }} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white mb-1 break-words">{item.name}</p>
              <p className="text-xs sm:text-sm text-white/70 font-mono break-words [overflow-wrap:anywhere]">
                {item.details}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Equipment */}
      {equipmentItems.length > 0 && (
        <div className="bg-white/5 border border-white/8 rounded-xl p-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">Equipement</p>
          {equipmentItems.map((eq, i) => (
            <p key={i} className="text-sm text-white/60 flex items-center gap-2">
              <span className="text-white/20">•</span> {eq}
            </p>
          ))}
        </div>
      )}

      {/* Total */}
      {totalLine && (
        <div className="border border-amber-500/20 rounded-xl p-4 text-center" style={{ background: `${AMBER}08` }}>
          <p className="font-bold text-lg" style={{ color: AMBER }}>{totalLine}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SECTION ICON MAP
// ============================================================================
const SECTION_ICONS: Record<string, typeof Syringe> = {
  "profil-synthese": User,
  "rationale": Brain,
  "guide-fournisseur": Globe,
  "reconstitution-guide": FlaskConical,
  "guide-injection": Syringe,
  "protocole-pratique": Calendar,
  "shopping-list": ShoppingCart,
  "hygiene-conservation": Droplets,
  "nutrition-protocole": Activity,
  "checklist-demarrage": CheckCircle2,
  "effets-secondaires": AlertTriangle,
  "securite-surveillance": Shield,
  "prochaines-etapes": ArrowRight,
  "faq": HelpCircle,
  "disclaimer-support": HelpCircle,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function PeptidesEngineReport() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<PeptidesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["profil-synthese", "rationale", "guide-fournisseur", "reconstitution-guide", "guide-injection", "protocole-pratique", "nutrition-protocole", "shopping-list", "checklist-demarrage"])
  );
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewEmail, setReviewEmail] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const stored = localStorage.getItem(`nda_accepted_${id}`);
    if (stored === "true") setNdaAccepted(true);

    fetch(`/api/peptides-engine/report/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.report) {
          const r = data.report;
          r.promoCodes = r.promoCodes || r.promoCodesGenerated || [];
          r.generatedAt = r._generationMeta?.generatedAt || r.generatedAt || data.createdAt || new Date().toISOString();
          setReport(r);
        } else {
          setError(data.error || "Rapport non trouve");
        }
      })
      .catch(() => setError("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [id]);

  const acceptNda = () => {
    setNdaAccepted(true);
    if (id) localStorage.setItem(`nda_accepted_${id}`, "true");
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60 font-mono text-sm">Generation du protocole...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Rapport non disponible</h1>
          <p className="text-white/60">{error || "Le rapport est en cours de generation. Reviens dans quelques minutes."}</p>
        </div>
      </div>
    );
  }

  // NDA Gate
  if (!ndaAccepted) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="max-w-2xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#0a0a0a] border border-amber-500/20 rounded-2xl p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <Lock className="w-8 h-8" style={{ color: AMBER }} />
              <h1 className="text-2xl font-bold">Clause de Confidentialite</h1>
            </div>
            <div className="space-y-4 text-white/70 text-sm leading-relaxed mb-8">
              <p>Avant d'acceder a ton protocole personnalise, tu dois accepter les conditions suivantes :</p>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <p><strong className="text-white">1. Usage strictement personnel</strong> : Ce protocole est genere exclusivement pour toi. Il ne peut etre partage, reproduit, publie ou distribue sous quelque forme que ce soit.</p>
                <p><strong className="text-white">2. Interdiction de diffusion</strong> : Toute publication sur internet (reseaux sociaux, forums, YouTube, blogs, groupes Telegram/Discord) est strictement interdite.</p>
                <p><strong className="text-white">3. Propriete intellectuelle</strong> : Le contenu du protocole, incluant les recommandations, dosages et guides, est la propriete intellectuelle d'APEXLABS by Achzod.</p>
                <p><strong className="text-white">4. Usage educatif</strong> : Ce protocole est fourni a titre educatif et informatif. Il ne constitue pas un avis medical. Consulte un medecin avant toute supplementation.</p>
                <p><strong className="text-white">5. Violation</strong> : Toute violation de ces conditions entrainera la resiliation immediate de l'acces au protocole et pourra donner lieu a des <span className="text-amber-400">poursuites judiciaires</span> (dommages et interets). Juridiction : Tribunaux de Paris.</p>
              </div>
            </div>
            <button
              onClick={acceptNda}
              className="w-full py-4 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2"
              style={{ background: AMBER }}
            >
              <Shield className="w-4 h-4" />
              J'accepte les conditions : Acceder a mon protocole
            </button>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  const reportTier: PeptidesTier = report.tier === "solo" || report.tier === "tracked"
    ? report.tier
    : "coached";
  const bloodCredits = reportTier === "tracked" ? 2 : reportTier === "coached" ? 1 : 0;
  const liveSyncDate = report._catalogLiveSync?.syncedAt
    ? new Date(report._catalogLiveSync.syncedAt)
    : null;

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <CoachingPromoBanner auditType="PEPTIDES_ENGINE" peptidesTier={reportTier} />

      <div className="max-w-4xl mx-auto px-6 py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${AMBER}20` }}>
              <FlaskConical className="w-5 h-5" style={{ color: AMBER }} />
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-widest" style={{ color: AMBER }}>Peptides Engine</p>
              <p className="text-white/40 text-sm">Protocole personnalise</p>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Ton protocole, {report.clientName}
          </h1>
          <p className="text-white/50 text-sm font-mono">
            {report._generationMeta?.generatedAt ? "Mis a jour le" : "Genere le"}{" "}
            {new Date(report.generatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-12 overflow-hidden rounded-2xl border border-[#25D366]/25 bg-gradient-to-br from-[#25D366]/12 via-[#0a0a0a] to-[#0a0a0a] p-6 sm:p-8"
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-[#25D366]">Execution et ajustements</p>
              <h2 className="mb-2 text-xl font-bold sm:text-2xl">Tu veux que je pilote la suite avec toi ?</h2>
              <p className="text-sm leading-relaxed text-white/65">
                Ton rapport pose la strategie. En coaching, je reprends ton dossier, tes retours et tes marqueurs pour ajuster la trajectoire avec toi, sans te laisser improviser seul.
              </p>
            </div>
            <PeptidesWhatsAppLink
              placement="report_primary"
              clientName={report.clientName}
              tier={reportTier}
              label="Parler a Achzod sur WhatsApp"
              className="w-full shrink-0 md:w-auto"
            />
          </div>
        </motion.div>

        {/* Intro :Profile Synthesis (pulled out of collapsible sections) */}
        {(() => {
          const introSection = report.sections.find(s => s.id === "profil-synthese");
          const rationaleSection = report.sections.find(s => s.id === "rationale");
          return (
            <>
              {introSection && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-10"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${AMBER}15` }}>
                      <User className="w-4 h-4" style={{ color: AMBER }} />
                    </div>
                    <h2 className="text-xl font-bold">{introSection.title}</h2>
                  </div>
                  <div className="bg-gradient-to-br from-[#0a0a0a] to-[#0f0f0f] border border-amber-500/10 rounded-2xl p-8 md:p-10">
                    <FormatSectionContent content={introSection.content} />
                  </div>
                </motion.div>
              )}
              {rationaleSection && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mb-12"
                >
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${AMBER}15` }}>
                      <Brain className="w-4 h-4" style={{ color: AMBER }} />
                    </div>
                    <h2 className="text-xl font-bold">{rationaleSection.title}</h2>
                  </div>
                  <div className="bg-gradient-to-br from-[#0a0a0a] to-[#0f0f0f] border border-white/8 rounded-2xl p-8 md:p-10">
                    <FormatSectionContent content={rationaleSection.content} />
                  </div>
                </motion.div>
              )}
            </>
          );
        })()}

        {/* Peptides Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Syringe className="w-5 h-5" style={{ color: AMBER }} />
            Ton Stack Peptides
          </h2>
          <div className="grid gap-4">
            {report.peptides.map((pep, i) => (
              <div key={i} className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 hover:border-amber-500/30 transition-colors relative">
                {/* Number badge */}
                <div className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
                  <span className="font-mono text-xs text-white/40">{String(i + 1).padStart(2, "0")}</span>
                </div>

                <div className="mb-3 pr-12">
                  <h3 className="text-lg font-bold" style={{ color: AMBER }}>{pep.name}</h3>
                  <p className="text-white/50 text-sm">{pep.purpose}</p>
                </div>

                {/* Why this peptide */}
                {pep.whyThisPeptide && (
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 mb-4">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-amber-500/60 mb-1">Pourquoi ce peptide pour toi</p>
                    <p className="text-white/60 text-sm leading-relaxed">{pep.whyThisPeptide}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-1">Dosage</p>
                    <p className="text-sm font-medium">{pep.dosage}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-1">Timing</p>
                    <p className="text-sm font-medium">{pep.timing}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-1">Voie</p>
                    <p className="text-sm font-medium">{pep.route}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-1">Cycle</p>
                    <p className="text-sm font-medium">{pep.cycleDuration}</p>
                  </div>
                </div>

                {/* Reconstitution + Vials + Price */}
                <div className="grid md:grid-cols-3 gap-3 mb-3">
                  {pep.reconstitution && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-1">Reconstitution</p>
                      <p className="text-sm font-medium text-white/80">{pep.reconstitution}</p>
                    </div>
                  )}
                  {pep.vialsNeeded && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-1">Vials necessaires</p>
                      <p className="text-sm font-medium">{pep.vialsNeeded}</p>
                    </div>
                  )}
                  {pep.priceEstimate && (
                    <div className="bg-white/5 rounded-xl p-3">
                      <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-1">Cout estime</p>
                      <p className="text-sm font-medium" style={{ color: AMBER }}>{pep.priceEstimate}</p>
                    </div>
                  )}
                </div>

                {/* Purchase link */}
                {pep.purchaseUrl && (
                  <a href={pep.purchaseUrl} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1.5 text-xs font-mono px-4 py-2 rounded-lg border border-amber-500/30 hover:bg-amber-500/10 transition-colors" style={{ color: AMBER }}>
                    Acceder au fournisseur <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Weekly Schedule (standalone if exists) */}
        {report.weeklySchedule && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 mb-12"
          >
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Calendar className="w-5 h-5" style={{ color: AMBER }} />
              Calendrier Hebdomadaire
            </h2>
            <p className="text-white/40 text-xs font-mono mb-3">Semaine type, rotation des sites d'injection</p>
            <WeeklyScheduleTable schedule={report.weeklySchedule} />
          </motion.div>
        )}

        {/* Shopping List (standalone if exists) */}
        {report.shoppingList && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 mb-12"
          >
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" style={{ color: AMBER }} />
              Liste de courses personnalisee
            </h2>
            <p className="text-white/40 text-xs font-mono mb-1">Tout ce dont tu as besoin pour le cycle complet</p>
            {liveSyncDate && !Number.isNaN(liveSyncDate.getTime()) && (
              <p className="mb-4 text-xs leading-relaxed text-emerald-300/75">
                Prix, formats, stock et livraison vers {report._catalogLiveSync?.country || "ton pays"} controles le {liveSyncDate.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}. Verifie une derniere fois les liens juste avant de payer, le catalogue peut bouger.
              </p>
            )}
            <ShoppingListCards list={report.shoppingList} />
          </motion.div>
        )}

        {report.qualityVersion === "medical-review-v1" ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-12 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: AMBER }} />
              <div>
                <h2 className="text-lg font-bold mb-2">Calcul et manipulation a faire valider</h2>
                <p className="text-sm text-white/65 leading-relaxed">
                  Le calculateur automatique et les guides generiques de reconstitution sont desactives pour ce rapport.
                  Fais confirmer la concentration, le volume, le materiel et le geste par un medecin ou un pharmacien
                  avant toute manipulation.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mb-12"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `#06b6d415` }}>
                  <FlaskConical className="w-4 h-4" style={{ color: "#06b6d4" }} />
                </div>
                <h2 className="text-xl font-bold">Guide visuel de reconstitution</h2>
              </div>
              <ReconstitutionStepByStep />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-12"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `#ef444415` }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: "#ef4444" }} />
                </div>
                <h2 className="text-xl font-bold">Les 5 erreurs a eviter</h2>
              </div>
              <FiveReconstitutionErrors />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="mb-12"
            >
              <div className="flex items-center gap-2 mb-6">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${AMBER}15` }}>
                  <Syringe className="w-4 h-4" style={{ color: AMBER }} />
                </div>
                <h2 className="text-xl font-bold">Calcule ta dose en 30 secondes</h2>
              </div>
              <DoseCalculatorVisual />
            </motion.div>
          </>
        )}

        {/* Report Sections (collapsible, parsed) :skip intro sections already shown above */}
        <div className="space-y-4 mb-12">
          {report.sections.filter(s => s.id !== "profil-synthese" && s.id !== "rationale").map((section, i) => {
            const Icon = SECTION_ICONS[section.id] || FlaskConical;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                >
                  <h3 className="font-bold flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color: AMBER }} />
                    {section.title}
                  </h3>
                  <motion.div animate={{ rotate: expandedSections.has(section.id) ? 180 : 0 }}>
                    <ChevronDown className="w-5 h-5 text-white/40" />
                  </motion.div>
                </button>
                {expandedSections.has(section.id) && (
                  <div className="px-6 md:px-8 pb-8">
                    <FormatSectionContent content={section.content} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Blood Markers */}
        {report.bloodMarkers && report.bloodMarkers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[#0a0a0a] border border-amber-500/20 rounded-2xl p-6 mb-12"
          >
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" style={{ color: AMBER }} />
              Marqueurs sanguins a surveiller
            </h2>
            <div className="grid sm:grid-cols-2 gap-2">
              {report.bloodMarkers.map((marker, i) => {
                // Split marker on parenthesis for cleaner display
                const parts = marker.match(/^([^(]+)(\(.+\))?$/);
                return (
                  <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg p-2.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: AMBER }} />
                    <div>
                      <span className="text-xs font-semibold text-amber-400">{parts?.[1]?.trim() || marker}</span>
                      {parts?.[2] && <span className="text-xs text-white/30 ml-1">{parts[2]}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Blood Analysis credits */}
        {bloodCredits > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-6 mb-12"
          >
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: AMBER }} />
              {bloodCredits === 1 ? "Ton credit Blood Analysis inclus" : "Tes 2 credits Blood Analysis inclus"}
            </h2>
            <p className="text-white/70 text-sm mb-4">
              <strong className="text-amber-400">{bloodCredits} credit{bloodCredits > 1 ? "s" : ""} Blood Analysis</strong> {bloodCredits > 1 ? "ont ete ajoutes" : "a ete ajoute"} a ton compte. {bloodCredits === 2 ? "L'usage ideal est le premier avant la mise en place des recommandations, puis le second environ 2 a 3 mois apres." : "Tu peux l'utiliser au moment le plus utile pour ton suivi."} Pas de code a saisir, connecte-toi avec l'email de ta commande.
            </p>
            <div className={`grid gap-3 ${bloodCredits === 2 ? "md:grid-cols-2" : ""}`}>
              <div className="bg-black/50 border border-dashed border-amber-500/30 rounded-xl p-4 text-center">
                <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-2">Bilan pre-cycle</p>
                <p className="text-amber-400 text-sm font-mono">1 credit pret</p>
              </div>
              {bloodCredits === 2 && (
                <div className="bg-black/50 border border-dashed border-amber-500/30 rounded-xl p-4 text-center">
                  <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-2">Controle apres recommandations</p>
                  <p className="text-amber-400 text-sm font-mono">1 credit pret</p>
                </div>
              )}
            </div>
            <a href="/blood-dashboard" className="mt-4 inline-flex items-center gap-2 text-sm font-mono" style={{ color: AMBER }}>
              Acceder a mon dashboard Blood Analysis <ExternalLink className="w-3 h-3" />
            </a>
          </motion.div>
        )}

        {/* Review Section */}
        <motion.div
          id="review"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-[#0a0a0a] border border-amber-500/20 rounded-2xl p-8"
        >
          <div className="text-center mb-6">
            <Star className="w-8 h-8 mx-auto mb-3" style={{ color: AMBER }} />
            <h2 className="text-xl font-bold mb-2">Ton avis compte</h2>
            <p className="text-white/50 text-sm">
              30 secondes pour noter ton experience Peptides Engine.
            </p>
          </div>

          {reviewSubmitted ? (
            <div className="text-center p-8 rounded-xl bg-white/5 border border-white/10">
              <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-green-500" />
              <h4 className="text-lg font-bold mb-2">Merci pour ton avis !</h4>
              <p className="text-sm text-white/50">Ton retour m'aide a ameliorer le service pour tous les clients.</p>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!id || reviewRating === 0 || reviewComment.length < 10 || !reviewEmail) {
                  setReviewError("Remplis tous les champs (commentaire 10 caracteres minimum)");
                  return;
                }
                setReviewSubmitting(true);
                setReviewError(null);
                try {
                  const res = await fetch("/api/submit-review", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      auditId: id,
                      email: reviewEmail,
                      auditType: "PEPTIDES_ENGINE",
                      rating: reviewRating,
                      comment: reviewComment,
                    }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    setReviewSubmitted(true);
                  } else {
                    setReviewError(data.error || "Erreur");
                  }
                } catch {
                  setReviewError("Erreur de connexion");
                } finally {
                  setReviewSubmitting(false);
                }
              }}
              className="space-y-5"
            >
              <div className="text-center">
                <p className="text-xs text-white/40 mb-3 uppercase tracking-widest font-mono">Ta note</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={star <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-500"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-white/40 block mb-2 font-mono uppercase tracking-widest">
                  Ton email
                </label>
                <input
                  type="email"
                  value={reviewEmail}
                  onChange={(e) => setReviewEmail(e.target.value)}
                  placeholder="ton@email.com"
                  required
                  className="w-full px-4 py-3 rounded-lg text-sm bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-white/40 block mb-2 font-mono uppercase tracking-widest">
                  Ton commentaire (min. 10 caracteres)
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Ton retour sur Peptides Engine..."
                  rows={4}
                  required
                  minLength={10}
                  className="w-full px-4 py-3 rounded-lg text-sm bg-black/50 border border-white/10 text-white focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
                />
                <p className="text-xs text-white/30 mt-1">{reviewComment.length}/10 caracteres minimum</p>
              </div>

              {reviewError && (
                <div className="text-red-400 text-sm text-center p-3 rounded-lg bg-red-500/10">
                  {reviewError}
                </div>
              )}

              <button
                type="submit"
                disabled={reviewSubmitting}
                className="w-full py-3 rounded-lg font-bold text-sm text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: AMBER }}
              >
                {reviewSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Envoi...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Envoyer mon avis
                  </span>
                )}
              </button>
            </form>
          )}
        </motion.div>

      </div>

      <PeptidesWhatsAppLink
        placement="report_sticky"
        clientName={report.clientName}
        tier={reportTier}
        label="WhatsApp direct"
        className="fixed bottom-4 right-4 z-50 px-4 py-3 text-sm sm:bottom-6 sm:right-6"
      />

      <Footer />
    </div>
  );
}
