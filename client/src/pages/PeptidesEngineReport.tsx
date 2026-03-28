/**
 * Peptides Engine Report v2 — Full protocol display
 * Reconstitution guide, weekly schedule, shopping list, NDA gate
 */
import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { Shield, Syringe, FlaskConical, Activity, AlertTriangle, ExternalLink, ChevronDown, ShoppingCart, Calendar, Lock } from "lucide-react";
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
    // Check if NDA was already accepted for this report
    const stored = localStorage.getItem(`nda_accepted_${id}`);
    if (stored === "true") setNdaAccepted(true);

    fetch(`/api/peptides-engine/report/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.report) {
          setReport(data.report);
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
              <div key={i} className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 hover:border-amber-500/30 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: AMBER }}>{pep.name}</h3>
                    <p className="text-white/50 text-sm">{pep.purpose}</p>
                  </div>
                  {pep.purchaseUrl && (
                    <a href={pep.purchaseUrl} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 text-xs font-mono px-3 py-1.5 rounded-full border border-amber-500/30 hover:bg-amber-500/10 transition-colors flex-shrink-0" style={{ color: AMBER }}>
                      Acheter sur Peptaura <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Why this peptide */}
                {pep.whyThisPeptide && (
                  <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 mb-3">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-amber-500/60 mb-1">Pourquoi ce peptide pour toi</p>
                    <p className="text-white/60 text-sm">{pep.whyThisPeptide}</p>
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
                <div className="grid md:grid-cols-3 gap-3">
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
              </div>
            ))}
          </div>
        </motion.div>

        {/* Report Sections (collapsible) */}
        <div className="space-y-4 mb-12">
          {report.sections.map((section, i) => (
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
                  {section.id === "reconstitution-guide" && <Syringe className="w-4 h-4" style={{ color: AMBER }} />}
                  {section.id === "protocole-pratique" && <Calendar className="w-4 h-4" style={{ color: AMBER }} />}
                  {section.id === "shopping-list" && <ShoppingCart className="w-4 h-4" style={{ color: AMBER }} />}
                  {section.id === "securite-surveillance" && <Shield className="w-4 h-4" style={{ color: AMBER }} />}
                  {section.title}
                </h3>
                <motion.div animate={{ rotate: expandedSections.has(section.id) ? 180 : 0 }}>
                  <ChevronDown className="w-5 h-5 text-white/40" />
                </motion.div>
              </button>
              {expandedSections.has(section.id) && (
                <div className="px-6 pb-6 text-white/70 leading-relaxed whitespace-pre-wrap text-sm">
                  {section.content}
                </div>
              )}
            </motion.div>
          ))}
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
            <div className="flex flex-wrap gap-2">
              {report.bloodMarkers.map((marker, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-mono">
                  {marker}
                </span>
              ))}
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
