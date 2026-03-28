/**
 * Peptides Engine Report — Display the generated protocol
 */
import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { Shield, Syringe, Clock, FlaskConical, Pill, Activity, AlertTriangle, ExternalLink, ChevronDown, FileText } from "lucide-react";
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
}

interface ReportSection {
  id: string;
  title: string;
  content: string;
}

interface PeptidesReport {
  clientName: string;
  sections: ReportSection[];
  peptides: PeptideRec[];
  bloodMarkers: string[];
  promoCodes: string[];
  generatedAt: string;
}

export default function PeptidesEngineReport() {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<PeptidesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["intro", "peptides"]));

  useEffect(() => {
    if (!id) return;
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
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold" style={{ color: AMBER }}>{pep.name}</h3>
                    <p className="text-white/50 text-sm">{pep.purpose}</p>
                  </div>
                  {pep.purchaseUrl && (
                    <a href={pep.purchaseUrl} target="_blank" rel="noopener noreferrer"
                       className="flex items-center gap-1 text-xs font-mono px-3 py-1.5 rounded-full border border-amber-500/30 hover:bg-amber-500/10 transition-colors" style={{ color: AMBER }}>
                      Acheter <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                {pep.priceEstimate && (
                  <p className="text-white/30 text-xs font-mono mt-3">Prix estime: {pep.priceEstimate}</p>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Report Sections */}
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
                <h3 className="font-bold">{section.title}</h3>
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
        {report.bloodMarkers.length > 0 && (
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
          <p className="text-white/50 mb-4">Tes 149 EUR sont 100% deductibles du coaching Achzod.</p>
          <a href="https://www.achzodcoaching.com/formules-coaching"
             className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-black"
             style={{ background: AMBER }}>
            Voir le coaching
          </a>
          <p className="text-white/30 text-xs font-mono mt-3">Code: PEPTIDES149</p>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
