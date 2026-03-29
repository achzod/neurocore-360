/**
 * Peptides Engine Report v3 — Structured protocol display
 * Parsed sections, weekly schedule table, shopping list cards
 */
import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import {
  Shield, Syringe, FlaskConical, Activity, AlertTriangle, ExternalLink,
  ChevronDown, ShoppingCart, Calendar, Lock, User, Brain, ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

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
  tier?: string;
  sections: ReportSection[];
  peptides: PeptideRec[];
  bloodMarkers: string[];
  weeklySchedule?: string;
  shoppingList?: string;
  promoCodes: string[];
  generatedAt: string;
}

// ============================================================================
// CONTENT PARSER — converts raw text to structured JSX
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
            <li key={i} className="flex items-start gap-2 text-sm text-white/65">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: AMBER }} />
              <span>{item}</span>
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
        <p key={key++} className="text-sm text-white/65 my-1">
          <span className="font-semibold text-white/90">{kvMatch[1]}:</span> {kvMatch[2]}
        </p>
      );
      continue;
    }

    // Normal paragraph
    flushList();
    elements.push(
      <p key={key++} className="text-sm text-white/65 leading-relaxed my-1.5">
        {trimmed}
      </p>
    );
  }

  flushList();
  return <div className="space-y-0.5">{elements}</div>;
}

// ============================================================================
// WEEKLY SCHEDULE TABLE
// ============================================================================
function WeeklyScheduleTable({ schedule }: { schedule: string }) {
  if (!schedule) return null;

  // Parse "LUNDI AM: ... | LUNDI PM: ... | MARDI AM: ..." format
  const entries = schedule.split("|").map(s => s.trim()).filter(Boolean);
  const days: Record<string, { am: string; pm: string }> = {};
  const DAY_ORDER = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"];

  for (const entry of entries) {
    const match = entry.match(/^(LUNDI|MARDI|MERCREDI|JEUDI|VENDREDI|SAMEDI|DIMANCHE)\s+(AM|PM):\s*(.+)$/i);
    if (match) {
      const day = match[1].toUpperCase();
      const period = match[2].toUpperCase() as "AM" | "PM";
      const content = match[3].trim();
      if (!days[day]) days[day] = { am: "", pm: "" };
      if (period === "AM") days[day].am = content;
      else days[day].pm = content;
    }
  }

  const sortedDays = DAY_ORDER.filter(d => days[d]);
  if (sortedDays.length === 0) return null;

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm border-collapse">
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
              <td className="p-3 text-white/60 text-xs">{days[day].am || <span className="text-white/20">repos</span>}</td>
              <td className="p-3 text-white/60 text-xs">{days[day].pm || <span className="text-white/20">repos</span>}</td>
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

  const items = list.split("|").map(s => s.trim()).filter(Boolean);
  const peptideItems: { name: string; details: string }[] = [];
  const equipmentItems: string[] = [];
  let totalLine = "";

  for (const item of items) {
    if (item.toUpperCase().startsWith("TOTAL")) {
      totalLine = item;
    } else if (item.includes("$") || item.includes("vial")) {
      peptideItems.push({ name: item.split("×")[0]?.trim() || item.split("=")[0]?.trim() || item, details: item });
    } else {
      equipmentItems.push(item);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Peptide items */}
      {peptideItems.map((item, i) => (
        <div key={i} className="bg-white/5 border border-white/8 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: AMBER }} />
            <span className="text-sm text-white/80 font-mono">{item.details}</span>
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
  "reconstitution-guide": Syringe,
  "protocole-pratique": Calendar,
  "shopping-list": ShoppingCart,
  "securite-surveillance": Shield,
  "prochaines-etapes": ArrowRight,
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
    new Set(["profil-synthese", "rationale", "reconstitution-guide", "protocole-pratique", "shopping-list"])
  );

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
          r.generatedAt = r.generatedAt || data.createdAt || new Date().toISOString();
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
                <p><strong className="text-white">1. Usage strictement personnel</strong> — Ce protocole est genere exclusivement pour toi. Il ne peut etre partage, reproduit, publie ou distribue sous quelque forme que ce soit.</p>
                <p><strong className="text-white">2. Interdiction de diffusion</strong> — Toute publication sur internet (reseaux sociaux, forums, YouTube, blogs, groupes Telegram/Discord) est strictement interdite.</p>
                <p><strong className="text-white">3. Propriete intellectuelle</strong> — Le contenu du protocole, incluant les recommandations, dosages et guides, est la propriete intellectuelle d'APEXLABS by Achzod.</p>
                <p><strong className="text-white">4. Usage educatif</strong> — Ce protocole est fourni a titre educatif et informatif. Il ne constitue pas un avis medical. Consulte un medecin avant toute supplementation.</p>
                <p><strong className="text-white">5. Violation</strong> — Toute violation de ces conditions entrainera la resiliation immediate de l'acces au protocole et pourra donner lieu a des <span className="text-amber-400">poursuites judiciaires</span> (dommages et interets). Juridiction : Tribunaux de Paris.</p>
              </div>
            </div>
            <button
              onClick={acceptNda}
              className="w-full py-4 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2"
              style={{ background: AMBER }}
            >
              <Shield className="w-4 h-4" />
              J'accepte les conditions — Acceder a mon protocole
            </button>
          </motion.div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

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
            Genere le {new Date(report.generatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </motion.div>

        {/* Peptides Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
                    Acheter sur Peptaura <ExternalLink className="w-3 h-3" />
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
            <p className="text-white/40 text-xs font-mono mb-3">Semaine type — rotation des sites d'injection</p>
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
              Liste de Courses Peptaura
            </h2>
            <p className="text-white/40 text-xs font-mono mb-1">Tout ce dont tu as besoin pour le cycle complet</p>
            <ShoppingListCards list={report.shoppingList} />
          </motion.div>
        )}

        {/* Report Sections (collapsible, parsed) */}
        <div className="space-y-4 mb-12">
          {report.sections.map((section, i) => {
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
                  <div className="px-6 pb-6">
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

        {/* Promo Codes */}
        {report.promoCodes && report.promoCodes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-6 mb-12"
          >
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: AMBER }} />
              Tes 2 Blood Analyses incluses
            </h2>
            <p className="text-white/50 text-sm mb-4">Utilise ces codes sur la page Blood Analysis pour tes bilans gratuits (avant cycle + mi-cycle).</p>
            <div className="grid md:grid-cols-2 gap-3">
              {report.promoCodes.map((code, i) => (
                <div key={i} className="bg-black/50 border border-dashed border-amber-500/30 rounded-xl p-4 text-center">
                  <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-2">
                    {i === 0 ? "Bilan pre-cycle" : "Bilan mi-cycle"}
                  </p>
                  <p className="text-amber-400 text-xl font-bold font-mono tracking-widest">{code}</p>
                </div>
              ))}
            </div>
            <a href="/offers/blood-analysis" className="mt-4 inline-flex items-center gap-2 text-sm font-mono" style={{ color: AMBER }}>
              Acceder a Blood Analysis <ExternalLink className="w-3 h-3" />
            </a>
          </motion.div>
        )}

        {/* CTA Coaching */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 text-center"
        >
          <h2 className="text-xl font-bold mb-2">Tu veux un suivi personnalise?</h2>
          <p className="text-white/50 mb-4">Tes 299 EUR sont 100% deductibles du coaching Achzod.</p>
          <a href="https://www.achzodcoaching.com/formules-coaching"
             className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-black"
             style={{ background: AMBER }}>
            Voir le coaching
          </a>
          <p className="text-white/30 text-xs font-mono mt-3">Code: PEPTIDES299</p>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
