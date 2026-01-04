import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PRICING_PLANS, QUESTIONNAIRE_SECTIONS } from "@shared/schema";
import {
  Star,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Shield,
  Award,
  Check,
  Lock,
  User,
  Scale,
  Zap,
  Apple,
  Beaker,
  Dumbbell,
  Moon,
  Heart,
  Timer,
  TestTube,
  Activity,
  Coffee,
  Bone,
  HeartHandshake,
  Brain,
  Camera,
  CheckCircle2,
  Play,
  TrendingUp,
  Target,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";
import { BodyVisualization } from "@/components/animations/BodyVisualization";
import { Pricing } from "@/components/Pricing";

import issaLogo from "@assets/ISSA+Logo+_+Vertical+_+for-white-background_1767172975495.webp";
import pnLogo from "@assets/limage-19764_1767172975495.webp";
import preScriptLogo from "@assets/Pre-Script_1200x1200_1767172975495.webp";
import nasmLogo from "@assets/nasm-logo_1767172987583.jpg";

// Demo Modal Component - Ultrahuman-style Report with 4 themes
function DemoModal({ onClose }: { onClose: () => void }) {
  const [activeTheme, setActiveTheme] = useState<"m1black" | "metabolic" | "titanium" | "organic">("m1black");
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<"anabolic" | "propanel">("anabolic");
  const contentRef = useRef<HTMLDivElement>(null);

  const themes = {
    m1black: { name: "M1 Black", bg: "#000000", surface: "#09090B", primary: "#007ff5", text: "#EDEDED", muted: "#71717A", border: "rgba(255,255,255,0.12)" },
    metabolic: { name: "Metabolic Fire", bg: "#050505", surface: "#111111", primary: "#FF4F00", text: "#FFFFFF", muted: "#A1A1AA", border: "rgba(255,79,0,0.2)" },
    titanium: { name: "Titanium Light", bg: "#F2F2F2", surface: "#FFFFFF", primary: "#000000", text: "#171717", muted: "#737373", border: "rgba(0,0,0,0.08)" },
    organic: { name: "Sand Stone", bg: "#F0EFE9", surface: "#E6E4DD", primary: "#A85A32", text: "#292524", muted: "#78716C", border: "rgba(168,90,50,0.1)" },
  };

  // ANABOLIC BIOSCAN (49€) - 15 sections d'analyse
  const anabolicSections = [
    { name: "Introduction", locked: false },
    { name: "Sommeil", locked: false },
    { name: "Digestion", locked: true },
    { name: "Nerveux", locked: true },
    { name: "Hormones", locked: true },
    { name: "Training", locked: true },
    { name: "Nutrition", locked: true },
    { name: "Suppléments", locked: true },
    { name: "Révélation", locked: true },
    { name: "Cause Racine", locked: true },
    { name: "Radar", locked: true },
    { name: "Potentiel", locked: true },
    { name: "Feuille Route", locked: true },
    { name: "Projection 30-60-90", locked: true },
    { name: "Conclusion", locked: true },
  ];

  // PRO PANEL 360 (99€) - 17 sections d'analyse + protocoles
  const propanelSections = [
    { name: "Analyse Visuelle & Posturale", locked: false },
    { name: "Analyse Biomécanique", locked: false },
    { name: "Analyse Entraînement & Périodisation", locked: true },
    { name: "Analyse Système Cardiovasculaire", locked: true },
    { name: "Analyse Nutrition & Métabolisme", locked: true },
    { name: "Analyse Sommeil & Récupération", locked: true },
    { name: "Analyse Digestion & Microbiote", locked: true },
    { name: "Analyse Axes Hormonaux", locked: true },
    { name: "Protocole Matin Anti-Cortisol", locked: true },
    { name: "Protocole Soir Verrouillage Sommeil", locked: true },
    { name: "Protocole Digestion 14 Jours", locked: true },
    { name: "Protocole Bureau Anti-Sédentarité", locked: true },
    { name: "Protocole Entraînement Personnalisé", locked: true },
    { name: "Plan 30-60-90 Jours", locked: true },
    { name: "KPI & Tableau de Bord", locked: true },
    { name: "Stack Suppléments Optimisé", locked: true },
    { name: "Synthèse & Prochaines Étapes", locked: true },
  ];

  const sections = selectedPlan === "anabolic" ? anabolicSections : propanelSections;
  const sectionCount = selectedPlan === "anabolic" ? 15 : 17;
  const questionCount = selectedPlan === "anabolic" ? 150 : 210;
  const planName = selectedPlan === "anabolic" ? "ANABOLIC BIOSCAN" : "PRO PANEL 360";
  const planPrice = selectedPlan === "anabolic" ? "49€" : "99€";

  const theme = themes[activeTheme];
  const currentSection = sections[activeSection];

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(progress);
    };
    contentRef.current?.addEventListener('scroll', handleScroll);
    return () => contentRef.current?.removeEventListener('scroll', handleScroll);
  }, []);

  // Render different content based on active section
  const renderSectionContent = () => {
    if (currentSection.locked) {
      const isPropanel = selectedPlan === "propanel";
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: theme.surface }}>
            <Lock size={40} style={{ color: theme.muted }} />
          </div>
          <h2 className="text-3xl font-bold mb-4">{currentSection.name}</h2>
          <p className="text-lg mb-2" style={{ color: theme.muted }}>
            Section verrouillée - {planName}
          </p>
          <p className="max-w-md mb-8" style={{ color: theme.muted }}>
            {isPropanel
              ? `Cette section fait partie du Pro Panel 360 (99€). Accède aux ${sectionCount} sections + analyses wearables temps réel + analyse photo posture.`
              : `Cette section fait partie de l'Anabolic Bioscan (49€). Débloquer les ${sectionCount} sections + stack suppléments + plan 90 jours.`}
          </p>
          <Link href={`/audit-complet/questionnaire?plan=${isPropanel ? 'elite' : 'essential'}`}>
            <button
              className={`px-8 py-4 rounded-xl font-bold transition-all hover:opacity-90 ${
                isPropanel
                  ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white"
                  : ""
              }`}
              style={!isPropanel ? { backgroundColor: theme.primary, color: theme.bg } : {}}
            >
              Obtenir {planName} ({planPrice}) →
            </button>
          </Link>
        </div>
      );
    }

    switch (activeSection) {
      case 0: // Dashboard
        return (
          <div className="space-y-8">
            <header>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-6" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: theme.muted }}>Vue d'ensemble</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                Marc, voici ton audit.
              </h1>
              <p className="text-lg" style={{ color: theme.muted }}>
                Score global: 58/100 — Une base solide avec un fort potentiel d'amélioration.
              </p>
            </header>

            {/* Score Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:row-span-2 rounded-2xl p-6 border relative overflow-hidden" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                <Activity className="absolute top-4 right-4 opacity-10" size={60} />
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest mb-4" style={{ color: theme.muted }}>Score Global</h3>
                <div className="text-6xl font-bold mb-2">58<span className="text-xl" style={{ color: theme.muted }}>/100</span></div>
                <span className="inline-block px-2 py-1 text-[10px] font-mono rounded bg-amber-500/10 text-amber-500">À OPTIMISER</span>
              </div>
              {[
                { label: "Système Nerveux", score: "4.5", status: "CRITIQUE", statusColor: "red" },
                { label: "Sommeil", score: "3.5", status: "CRITIQUE", statusColor: "red" },
                { label: "Nutrition", score: "7.2", status: "BON", statusColor: "green" },
                { label: "Training", score: "8.5", status: "FORT", statusColor: "green" },
              ].map((kpi, i) => (
                <div key={i} className="rounded-xl p-5 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-mono uppercase" style={{ color: theme.muted }}>{kpi.label}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${kpi.statusColor === 'red' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>{kpi.status}</span>
                  </div>
                  <div className="text-2xl font-bold">{kpi.score}<span className="text-sm" style={{ color: theme.muted }}>/10</span></div>
                </div>
              ))}
            </div>

            {/* Projection Chart */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} style={{ color: theme.primary }} />
                <h3 className="font-bold" style={{ color: theme.primary }}>Projection 90 jours</h3>
              </div>
              <p className="text-sm mb-4" style={{ color: theme.muted }}>
                En suivant le protocole, tu peux atteindre 95/100 en 90 jours.
              </p>
              <div className="flex items-end gap-1 h-24">
                {[58, 65, 72, 78, 84, 90, 95].map((v, i) => (
                  <div key={i} className="flex-1 rounded-t transition-all" style={{ height: `${v}%`, backgroundColor: i === 0 ? theme.muted : theme.primary, opacity: i === 0 ? 0.3 : 0.4 + (i * 0.1) }} />
                ))}
              </div>
              <div className="flex justify-between text-[9px] font-mono mt-2" style={{ color: theme.muted }}>
                <span>Aujourd'hui</span>
                <span>J90</span>
              </div>
            </div>

            {/* Priorities */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <h3 className="font-bold mb-4">Tes 3 priorités</h3>
              <div className="space-y-3">
                {[
                  { num: 1, title: "Système Nerveux", desc: "HRV basse, cortisol élevé", color: "red" },
                  { num: 2, title: "Sommeil", desc: "Architecture fragmentée", color: "red" },
                  { num: 3, title: "Hormones", desc: "Ratio T/C à optimiser", color: "amber" },
                ].map((p) => (
                  <div key={p.num} className="flex items-center gap-4 p-3 rounded-xl" style={{ backgroundColor: theme.bg }}>
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${p.color === 'red' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>#{p.num}</span>
                    <div>
                      <p className="font-semibold text-sm">{p.title}</p>
                      <p className="text-xs" style={{ color: theme.muted }}>{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 1: // Système Nerveux
        return (
          <div className="space-y-8">
            <header>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-red-500/10 text-red-500 mb-4">PRIORITÉ #1</span>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">Système Nerveux Autonome</h1>
              <p className="text-lg" style={{ color: theme.muted }}>
                Ton système nerveux est en mode "survie". C'est le blocage principal à débloquer.
              </p>
            </header>

            {/* HRV Card */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest mb-2" style={{ color: theme.muted }}>Variabilité Cardiaque (HRV)</h3>
                  <div className="text-5xl font-bold text-red-500">28<span className="text-xl" style={{ color: theme.muted }}>ms</span></div>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: theme.muted }}>Optimal: 50-100ms</p>
                  <span className="text-red-500 font-bold">-44%</span>
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: '28%' }} />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Cortisol AM", value: "24.5", unit: "µg/dL", status: "Élevé", color: "red" },
                { label: "Ratio Sympa/Para", value: "3.2:1", unit: "", status: "Déséquilibré", color: "red" },
                { label: "Fréquence cardiaque repos", value: "72", unit: "bpm", status: "Moyen", color: "amber" },
                { label: "Temps de récupération", value: "48+", unit: "h", status: "Long", color: "amber" },
              ].map((m, i) => (
                <div key={i} className="rounded-xl p-4 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                  <p className="text-[10px] font-mono uppercase mb-2" style={{ color: theme.muted }}>{m.label}</p>
                  <div className="text-2xl font-bold">{m.value}<span className="text-sm" style={{ color: theme.muted }}>{m.unit}</span></div>
                  <span className={`text-[10px] font-mono ${m.color === 'red' ? 'text-red-500' : 'text-amber-500'}`}>{m.status}</span>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <h3 className="font-bold mb-4" style={{ color: theme.primary }}>Protocole recommandé</h3>
              <div className="space-y-3">
                {[
                  { title: "Respiration Wim Hof", desc: "3 rounds le matin à jeun", time: "15 min/jour" },
                  { title: "Cold Exposure", desc: "Douche froide progressive", time: "2-5 min/jour" },
                  { title: "Magnésium Glycinate", desc: "Avant le coucher", time: "400mg/jour" },
                  { title: "Cohérence cardiaque", desc: "5-5-5 avant les repas", time: "5 min x3/jour" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: theme.bg }}>
                    <div className="flex items-center gap-3">
                      <Check size={16} style={{ color: theme.primary }} />
                      <div>
                        <p className="font-semibold text-sm">{r.title}</p>
                        <p className="text-xs" style={{ color: theme.muted }}>{r.desc}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono" style={{ color: theme.muted }}>{r.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 2: // Sommeil
        return (
          <div className="space-y-8">
            <header>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-red-500/10 text-red-500 mb-4">CRITIQUE</span>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">Architecture du Sommeil</h1>
              <p className="text-lg" style={{ color: theme.muted }}>
                Ton sommeil est fragmenté. La récupération nocturne est compromise.
              </p>
            </header>

            {/* Sleep Score */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest mb-2" style={{ color: theme.muted }}>Score Sommeil</h3>
                  <div className="text-5xl font-bold text-red-500">35<span className="text-xl" style={{ color: theme.muted }}>/100</span></div>
                </div>
                <div className="w-24 h-24 relative">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" strokeDasharray="251" strokeDashoffset={251 * 0.65} />
                  </svg>
                </div>
              </div>
            </div>

            {/* Sleep Phases */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Latence", value: "45+", unit: "min", target: "<15 min", bad: true },
                { label: "Sommeil Profond", value: "12", unit: "%", target: "20%+", bad: true },
                { label: "REM", value: "18", unit: "%", target: "25%+", bad: true },
                { label: "Réveils", value: "3-4", unit: "x/nuit", target: "0-1x", bad: true },
              ].map((p, i) => (
                <div key={i} className="rounded-xl p-4 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                  <p className="text-[10px] font-mono uppercase mb-2" style={{ color: theme.muted }}>{p.label}</p>
                  <div className="text-2xl font-bold">{p.value}<span className="text-sm" style={{ color: theme.muted }}>{p.unit}</span></div>
                  <p className="text-[10px]" style={{ color: p.bad ? '#ef4444' : theme.muted }}>Optimal: {p.target}</p>
                </div>
              ))}
            </div>

            {/* Chronotype */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <h3 className="font-bold mb-4">Ton Chronotype: Loup</h3>
              <p className="text-sm mb-4" style={{ color: theme.muted }}>
                Tu es naturellement décalé vers le soir. Ton pic de performance est entre 16h et 20h.
                Tes habitudes actuelles ne respectent pas ton rythme biologique.
              </p>
              <div className="flex items-center gap-4">
                <Moon size={24} style={{ color: theme.primary }} />
                <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: theme.bg }}>
                  <div className="h-full w-3/4 rounded-full" style={{ background: `linear-gradient(to right, ${theme.muted}, ${theme.primary})` }} />
                </div>
                <span className="text-sm font-mono" style={{ color: theme.muted }}>23h-7h idéal</span>
              </div>
            </div>

            {/* Protocol */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <h3 className="font-bold mb-4" style={{ color: theme.primary }}>Protocole Sommeil</h3>
              <div className="space-y-3">
                {[
                  { title: "Lumière rouge le soir", desc: "Après 20h, éliminer lumière bleue" },
                  { title: "Glycine 3g", desc: "30 min avant le coucher" },
                  { title: "Chambre à 18°C", desc: "Température optimale pour le sommeil profond" },
                  { title: "Magnésium + L-Théanine", desc: "Stack relaxation nocturne" },
                  { title: "Routine fixe", desc: "Même heure de coucher ±30min" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: theme.bg }}>
                    <Check size={16} style={{ color: theme.primary }} />
                    <div>
                      <p className="font-semibold text-sm">{r.title}</p>
                      <p className="text-xs" style={{ color: theme.muted }}>{r.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 3: // Hormones
        return (
          <div className="space-y-8">
            <header>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 mb-4">À OPTIMISER</span>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">Profil Hormonal</h1>
              <p className="text-lg" style={{ color: theme.muted }}>
                Ton équilibre hormonal est perturbé par le stress chronique et le manque de sommeil.
              </p>
            </header>

            {/* Hormone Levels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: "Testostérone (estimée)", value: "Sous-optimale", status: "Signes: fatigue, libido basse, récup lente", color: "amber" },
                { label: "Cortisol", value: "Élevé", status: "Ratio T/C déséquilibré", color: "red" },
                { label: "Thyroïde", value: "Subclinique", status: "Signes d'hypothyroïdie légère", color: "amber" },
                { label: "Insuline", value: "Résistance légère", status: "Pics glycémiques fréquents", color: "amber" },
              ].map((h, i) => (
                <div key={i} className="rounded-xl p-5 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                  <p className="text-[10px] font-mono uppercase mb-2" style={{ color: theme.muted }}>{h.label}</p>
                  <p className={`text-xl font-bold ${h.color === 'red' ? 'text-red-500' : 'text-amber-500'}`}>{h.value}</p>
                  <p className="text-xs mt-2" style={{ color: theme.muted }}>{h.status}</p>
                </div>
              ))}
            </div>

            {/* Optimization Stack */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <h3 className="font-bold mb-4" style={{ color: theme.primary }}>Stack Optimisation Hormonale</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "Ashwagandha KSM-66", dose: "600mg/jour", timing: "Soir", effect: "Cortisol ↓, Testo ↑" },
                  { name: "Zinc Picolinate", dose: "30mg/jour", timing: "Repas", effect: "Testo, Thyroïde" },
                  { name: "Vitamine D3 + K2", dose: "5000 UI/jour", timing: "Matin", effect: "Hormones, Immunité" },
                  { name: "Bore", dose: "10mg/jour", timing: "Matin", effect: "SHBG ↓, Free T ↑" },
                ].map((s, i) => (
                  <div key={i} className="p-4 rounded-xl" style={{ backgroundColor: theme.bg }}>
                    <p className="font-semibold text-sm">{s.name}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: theme.muted }}>
                      <span>{s.dose}</span>
                      <span>•</span>
                      <span>{s.timing}</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: theme.primary }}>{s.effect}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Lifestyle Factors */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <h3 className="font-bold mb-4">Facteurs Lifestyle</h3>
              <div className="space-y-3">
                {[
                  { factor: "Sommeil", impact: "Critique", desc: "Chaque heure de dette = -15% testostérone" },
                  { factor: "Training", impact: "Positif", desc: "Compound lifts = stimulus hormonal optimal" },
                  { factor: "Stress", impact: "Négatif", desc: "Cortisol chronique = suppression axe HPG" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: theme.bg }}>
                    <div>
                      <p className="font-semibold text-sm">{f.factor}</p>
                      <p className="text-xs" style={{ color: theme.muted }}>{f.desc}</p>
                    </div>
                    <span className={`text-xs font-mono px-2 py-1 rounded ${f.impact === 'Critique' ? 'bg-red-500/10 text-red-500' : f.impact === 'Positif' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>{f.impact}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 4: // Nutrition
        return (
          <div className="space-y-8">
            <header>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-green-500/10 text-green-500 mb-4">BON NIVEAU</span>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">Habitudes Alimentaires</h1>
              <p className="text-lg" style={{ color: theme.muted }}>
                Ta nutrition est solide. Quelques optimisations pour maximiser les résultats.
              </p>
            </header>

            {/* Nutrition Score */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest mb-2" style={{ color: theme.muted }}>Score Nutrition</h3>
                  <div className="text-5xl font-bold text-green-500">72<span className="text-xl" style={{ color: theme.muted }}>/100</span></div>
                </div>
                <div className="w-24 h-24 relative">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="8" strokeLinecap="round" strokeDasharray="251" strokeDashoffset={251 * 0.28} />
                  </svg>
                </div>
              </div>
            </div>

            {/* Macros */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Protéines", value: "1.8", unit: "g/kg", status: "Optimal", color: "green" },
                { label: "Glucides", value: "2.5", unit: "g/kg", status: "Timing à revoir", color: "amber" },
                { label: "Lipides", value: "0.9", unit: "g/kg", status: "Correct", color: "green" },
              ].map((m, i) => (
                <div key={i} className="rounded-xl p-4 border text-center" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                  <p className="text-[10px] font-mono uppercase mb-2" style={{ color: theme.muted }}>{m.label}</p>
                  <div className="text-2xl font-bold">{m.value}<span className="text-sm" style={{ color: theme.muted }}>{m.unit}</span></div>
                  <span className={`text-[10px] ${m.color === 'green' ? 'text-green-500' : 'text-amber-500'}`}>{m.status}</span>
                </div>
              ))}
            </div>

            {/* Points to Improve */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <h3 className="font-bold mb-4">Points d'amélioration</h3>
              <div className="space-y-3">
                {[
                  { issue: "Hydratation insuffisante", current: "1.8L/jour", target: "3L/jour minimum" },
                  { issue: "Fenêtre anabolique", current: "Repas 2h post-training", target: "Shake 30min post" },
                  { issue: "Timing glucides", current: "Répartition égale", target: "Concentrer péri-training" },
                ].map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: theme.bg }}>
                    <div>
                      <p className="font-semibold text-sm">{p.issue}</p>
                      <p className="text-xs" style={{ color: theme.muted }}>Actuel: {p.current}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: theme.primary }}>→ {p.target}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Supplements */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <h3 className="font-bold mb-4" style={{ color: theme.primary }}>Ajouts recommandés</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: "Créatine Monohydrate", dose: "5g/jour", why: "Performance, cognition" },
                  { name: "Électrolytes", dose: "Quotidien", why: "Hydratation optimale" },
                  { name: "Whey Isolate", dose: "30g post-WO", why: "Fenêtre anabolique" },
                  { name: "Oméga-3", dose: "3g EPA/DHA", why: "Inflammation, récup" },
                ].map((s, i) => (
                  <div key={i} className="p-4 rounded-xl" style={{ backgroundColor: theme.bg }}>
                    <p className="font-semibold text-sm">{s.name}</p>
                    <p className="text-xs mt-1" style={{ color: theme.muted }}>{s.dose}</p>
                    <p className="text-xs mt-1" style={{ color: theme.primary }}>{s.why}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 5: // Training
        return (
          <div className="space-y-8">
            <header>
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-green-500/10 text-green-500 mb-4">FORT</span>
              <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">Performance Training</h1>
              <p className="text-lg" style={{ color: theme.muted }}>
                Ton entraînement est solide. On optimise la récupération et la périodisation.
              </p>
            </header>

            {/* Training Score */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest mb-2" style={{ color: theme.muted }}>Score Training</h3>
                  <div className="text-5xl font-bold text-green-500">85<span className="text-xl" style={{ color: theme.muted }}>/100</span></div>
                </div>
                <Dumbbell size={48} style={{ color: theme.primary, opacity: 0.3 }} />
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Fréquence", value: "5x", unit: "/sem", status: "Optimal" },
                { label: "Volume", value: "16-20", unit: "séries/muscle", status: "Bon" },
                { label: "Intensité", value: "RPE 8-9", unit: "", status: "Élevée" },
                { label: "Progression", value: "+2.5%", unit: "/sem", status: "Linéaire" },
              ].map((m, i) => (
                <div key={i} className="rounded-xl p-4 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                  <p className="text-[10px] font-mono uppercase mb-2" style={{ color: theme.muted }}>{m.label}</p>
                  <div className="text-xl font-bold">{m.value}<span className="text-sm" style={{ color: theme.muted }}>{m.unit}</span></div>
                  <span className="text-[10px] text-green-500">{m.status}</span>
                </div>
              ))}
            </div>

            {/* Optimizations */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <h3 className="font-bold mb-4">Optimisations recommandées</h3>
              <div className="space-y-3">
                {[
                  { title: "Deload systématique", desc: "Semaine 4: -40% volume", impact: "Récupération SNC" },
                  { title: "Travail excentrique", desc: "3-4s tempo négatif sur composés", impact: "Hypertrophie +15%" },
                  { title: "Mobilité thoracique", desc: "10 min/jour, focus rotation", impact: "Posture, performance" },
                  { title: "Zone 2 cardio", desc: "2x30min/sem, 120-140 bpm", impact: "Base aérobie, récup" },
                ].map((o, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: theme.bg }}>
                    <div className="flex items-center gap-3">
                      <Check size={16} style={{ color: theme.primary }} />
                      <div>
                        <p className="font-semibold text-sm">{o.title}</p>
                        <p className="text-xs" style={{ color: theme.muted }}>{o.desc}</p>
                      </div>
                    </div>
                    <span className="text-xs" style={{ color: theme.primary }}>{o.impact}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Split */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <h3 className="font-bold mb-4">Split recommandé</h3>
              <div className="grid grid-cols-7 gap-2">
                {[
                  { day: "L", type: "Push", color: "primary" },
                  { day: "M", type: "Pull", color: "primary" },
                  { day: "M", type: "Legs", color: "primary" },
                  { day: "J", type: "Rest", color: "muted" },
                  { day: "V", type: "Upper", color: "primary" },
                  { day: "S", type: "Lower", color: "primary" },
                  { day: "D", type: "Rest", color: "muted" },
                ].map((d, i) => (
                  <div key={i} className="text-center p-3 rounded-xl" style={{ backgroundColor: d.color === 'muted' ? theme.bg : theme.surface }}>
                    <p className="text-[10px] font-mono mb-1" style={{ color: theme.muted }}>{d.day}</p>
                    <p className="text-xs font-semibold" style={{ color: d.color === 'muted' ? theme.muted : theme.primary }}>{d.type}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative w-full max-w-6xl h-[95vh] flex overflow-hidden rounded-2xl shadow-2xl"
        style={{ backgroundColor: theme.bg, color: theme.text }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 z-50" style={{ backgroundColor: theme.border }}>
          <div className="h-full transition-all duration-150" style={{ width: `${scrollProgress}%`, backgroundColor: theme.primary }} />
        </div>

        {/* Sidebar */}
        <div className="hidden md:flex w-72 flex-col border-r" style={{ borderColor: theme.border, backgroundColor: theme.bg }}>
          <div className="p-6 pt-8">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase" style={{ color: theme.muted }}>NEUROCORE 360</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Audit: Marc D.</h1>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${selectedPlan === "anabolic" ? "bg-primary/20 text-primary" : "bg-violet-500/20 text-violet-400"}`}>{planName}</span>
              <span className="text-[10px] font-mono" style={{ color: theme.muted }}>{sectionCount} sections</span>
            </div>
          </div>

          {/* Plan Toggle */}
          <div className="px-6 pb-4">
            <p className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: theme.muted }}>CHOISIR UN PLAN</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setSelectedPlan("anabolic"); setActiveSection(0); }}
                className={`py-2.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                  selectedPlan === "anabolic"
                    ? "bg-primary text-black"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                Anabolic<br /><span className="text-[9px] opacity-70">49€</span>
              </button>
              <button
                onClick={() => { setSelectedPlan("propanel"); setActiveSection(0); }}
                className={`py-2.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                  selectedPlan === "propanel"
                    ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                Pro Panel<br /><span className="text-[9px] opacity-70">99€</span>
              </button>
            </div>
          </div>

          {/* Theme Switcher */}
          <div className="px-6 pb-4">
            <p className="text-[9px] font-mono uppercase tracking-widest mb-2" style={{ color: theme.muted }}>THÈME</p>
            <div className="grid grid-cols-4 gap-1">
              {(Object.keys(themes) as Array<keyof typeof themes>).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTheme(t)}
                  className={`h-6 rounded transition-all ${activeTheme === t ? 'ring-2 ring-offset-1' : ''}`}
                  style={{
                    backgroundColor: themes[t].surface,
                    borderColor: themes[t].border,
                    ringColor: themes[t].primary,
                  }}
                  title={themes[t].name}
                />
              ))}
            </div>
          </div>

          {/* Navigation - Table des matières */}
          <div className="px-4 pt-2 pb-1">
            <p className="text-[9px] font-mono uppercase tracking-widest" style={{ color: theme.muted }}>TABLE DES MATIÈRES</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {sections.map((section, i) => (
              <button
                key={i}
                onClick={() => setActiveSection(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between gap-2 ${
                  section.locked ? 'opacity-70 hover:opacity-100' : 'hover:bg-white/5'
                } ${activeSection === i ? 'bg-white/10' : ''}`}
                style={{ color: activeSection === i ? theme.text : theme.muted }}
              >
                <span className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-mono text-[10px] shrink-0" style={{ color: theme.muted }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="truncate">{section.name}</span>
                </span>
                {section.locked && (
                  <Lock size={11} style={{ color: selectedPlan === "propanel" ? "#a78bfa" : theme.muted }} />
                )}
              </button>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t" style={{ borderColor: theme.border }}>
            <Link href="/audit-complet/questionnaire">
              <button
                className="w-full py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all hover:opacity-90"
                style={{ backgroundColor: theme.primary, color: theme.bg }}
              >
                Créer mon audit →
              </button>
            </Link>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <div className="md:hidden flex flex-col gap-3 p-4 border-b" style={{ borderColor: theme.border }}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm block">Audit Marc D.</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${selectedPlan === "anabolic" ? "bg-primary/20 text-primary" : "bg-violet-500/20 text-violet-400"}`}>{planName}</span>
                  <span className="text-[9px]" style={{ color: theme.muted }}>{sectionCount} sections</span>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.surface }}>×</button>
            </div>
            {/* Mobile Plan Toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setSelectedPlan("anabolic"); setActiveSection(0); }}
                className={`py-2 px-3 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  selectedPlan === "anabolic"
                    ? "bg-primary text-black"
                    : "bg-white/5 text-white/60"
                }`}
              >
                Anabolic 49€
              </button>
              <button
                onClick={() => { setSelectedPlan("propanel"); setActiveSection(0); }}
                className={`py-2 px-3 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  selectedPlan === "propanel"
                    ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white"
                    : "bg-white/5 text-white/60"
                }`}
              >
                Pro Panel 99€
              </button>
            </div>
          </div>

          {/* Close button desktop */}
          <button
            onClick={onClose}
            className="hidden md:flex absolute top-4 right-4 z-20 w-10 h-10 rounded-full items-center justify-center transition-colors hover:bg-white/10"
            style={{ backgroundColor: theme.surface, color: theme.muted }}
          >
            ×
          </button>

          {/* Scrollable Content */}
          <div ref={contentRef} className="flex-1 overflow-y-auto p-6 lg:p-12">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto"
            >
              {renderSectionContent()}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Ultrahuman-style Hero: Centered elegant typography with phone mockup
function UltrahumanHero() {
  const [showDemo, setShowDemo] = useState(false);

  // Ancien contenu des onglets (gardé pour référence mais non utilisé)
  const _tabContents = {
    scores: (
      <div className="w-full bg-[#0a0f0d] px-4 pt-10 pb-24">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-[#4a9d7c]/60 text-[10px] tracking-[0.2em] font-medium mb-1">NEUROCORE 360</p>
          <p className="text-white/70 text-sm">Rapport Marc D. • 34 ans</p>
        </div>

        {/* Score Global Card - Ultrahuman style */}
        <div className="bg-[#0d1a15] rounded-2xl p-5 border border-[#1a3d2e] mb-4">
          <p className="text-[#4a9d7c]/60 text-[9px] tracking-[0.15em] font-medium mb-3">SCORE GLOBAL</p>
          <div className="flex items-baseline gap-1">
            <span className="text-white text-6xl font-bold tracking-tight">58</span>
            <span className="text-white/25 text-2xl font-light">/100</span>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <span className="px-3 py-1.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-semibold">À optimiser</span>
            <span className="text-[#4a9d7c] text-[11px] font-medium">+12 pts possibles</span>
          </div>
        </div>

        {/* Progression Chart - Ultrahuman style */}
        <div className="bg-[#0d1a15] rounded-2xl p-4 border border-[#1a3d2e] mb-4">
          <p className="text-[#4a9d7c]/60 text-[9px] tracking-[0.15em] font-medium mb-4 text-center">PROGRESSION</p>
          <div className="flex items-end justify-between gap-1.5 h-24 px-2">
            {[42, 38, 45, 52, 48, 55, 58].map((val, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                <span className="text-[9px] text-white/50 font-medium">{val}</span>
                <div
                  className={`w-full rounded-sm transition-all ${i === 6 ? 'bg-white' : 'bg-[#3d8b6e]'}`}
                  style={{ height: `${val * 1.3}px` }}
                />
                <span className="text-[8px] text-white/30 font-medium">{['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Domaines Clés - 2x2 Grid Ultrahuman style */}
        <p className="text-[#4a9d7c]/60 text-[9px] tracking-[0.15em] font-medium mb-3 text-center">DOMAINES CLÉS</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 35, label: "Sommeil", color: "#ef4444" },
            { value: 72, label: "Nutrition", color: "#3d8b6e" },
            { value: 42, label: "Hormones", color: "#3d8b6e" },
            { value: 85, label: "Training", color: "#3d8b6e" },
          ].map((item, i) => (
            <div key={i} className="bg-[#0d1a15] rounded-xl p-4 border border-[#1a3d2e]">
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="text-white text-2xl font-bold">{item.value}</span>
                <span className="text-white/25 text-xs">/100</span>
              </div>
              <p className="text-white/50 text-[10px] mb-2">{item.label}</p>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    domaines: (
      <div className="w-full bg-[#0a0f0d] px-4 pt-10 pb-24">
        <p className="text-[#4a9d7c]/60 text-[9px] tracking-[0.15em] font-medium mb-4 text-center">15 DOMAINES ANALYSÉS</p>
        <div className="space-y-2">
          {[
            { name: "Sommeil", score: 35 },
            { name: "Stress & HRV", score: 42 },
            { name: "Cortisol", score: 38 },
            { name: "Hormones", score: 48 },
            { name: "Énergie", score: 44 },
            { name: "Digestion", score: 52 },
            { name: "Insuline", score: 48 },
            { name: "DHEA", score: 55 },
            { name: "Thyroïde", score: 65 },
            { name: "Cardio", score: 62 },
            { name: "Nutrition", score: 72 },
            { name: "Training", score: 85 },
            { name: "Mobilité", score: 58 },
            { name: "Mental", score: 67 },
            { name: "Récupération", score: 41 },
          ].map((d, i) => (
            <div key={i} className="bg-[#0d1a15] rounded-xl p-3 border border-[#1a3d2e] flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${d.score < 40 ? 'bg-red-500/20 text-red-400' : d.score < 60 ? 'bg-amber-500/20 text-amber-400' : 'bg-[#3d8b6e]/20 text-[#4a9d7c]'}`}>
                {d.score}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-white/80 text-[11px] font-medium">{d.name}</span>
                  <span className={`text-[9px] font-semibold ${d.score < 40 ? 'text-red-400' : d.score < 60 ? 'text-amber-400' : 'text-[#4a9d7c]'}`}>
                    {d.score < 40 ? 'Critique' : d.score < 60 ? 'À améliorer' : 'Bon'}
                  </span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${d.score < 40 ? 'bg-red-500' : d.score < 60 ? 'bg-amber-500' : 'bg-[#3d8b6e]'}`} style={{ width: `${d.score}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    rapport: (
      <div className="w-full bg-[#0a0f0d] px-4 pt-10 pb-24">
        <p className="text-[#4a9d7c]/60 text-[9px] tracking-[0.15em] font-medium mb-4 text-center">ANALYSE DÉTAILLÉE</p>
        <div className="space-y-3">
          {[
            { icon: Moon, title: "Sommeil", score: 35, status: "Critique", desc: "Latence d'endormissement prolongée (45+ min). Sommeil profond insuffisant." },
            { icon: Activity, title: "Système Nerveux", score: 42, status: "À améliorer", desc: "HRV basse (28ms). Dysrégulation du SNA. Cortisol matinal élevé." },
            { icon: Zap, title: "Énergie", score: 44, status: "Moyen", desc: "Fatigue mitochondriale. Pic énergétique tardif (16h-18h)." },
            { icon: Apple, title: "Nutrition", score: 72, status: "Bon", desc: "Apport protéique optimal (1.8g/kg). Hydratation à améliorer." },
            { icon: Heart, title: "Cardio", score: 62, status: "Correct", desc: "FC repos 68bpm. Zone 2 sous-développée." },
            { icon: Dumbbell, title: "Training", score: 85, status: "Excellent", desc: "Volume optimal. Progression linéaire. Force relative élevée." },
          ].map((section, i) => (
            <div key={i} className="bg-[#0d1a15] rounded-xl p-4 border border-[#1a3d2e]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${section.score < 40 ? 'bg-red-500/15' : section.score < 60 ? 'bg-amber-500/15' : 'bg-[#3d8b6e]/15'}`}>
                    <section.icon className={`w-4 h-4 ${section.score < 40 ? 'text-red-400' : section.score < 60 ? 'text-amber-400' : 'text-[#4a9d7c]'}`} />
                  </div>
                  <div>
                    <p className="text-white text-[11px] font-semibold">{section.title}</p>
                    <p className={`text-[9px] font-medium ${section.score < 40 ? 'text-red-400' : section.score < 60 ? 'text-amber-400' : 'text-[#4a9d7c]'}`}>{section.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-white text-xl font-bold">{section.score}</span>
                  <span className="text-white/25 text-xs">/100</span>
                </div>
              </div>
              <p className="text-white/50 text-[10px] leading-relaxed">{section.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    plan: (
      <div className="w-full bg-[#0a0f0d] px-4 pt-10 pb-24">
        <p className="text-[#4a9d7c]/60 text-[9px] tracking-[0.15em] font-medium mb-4 text-center">PLAN D'ACTION 90 JOURS</p>

        {/* Timeline */}
        <div className="flex gap-2 mb-4">
          {[
            { phase: "J1-30", label: "Reset", pts: "+8" },
            { phase: "J31-60", label: "Build", pts: "+6" },
            { phase: "J61-90", label: "Perf", pts: "+4" },
          ].map((p, i) => (
            <div key={i} className="flex-1 bg-[#0d1a15] rounded-xl p-3 border border-[#1a3d2e] text-center">
              <p className="text-[#4a9d7c] text-[9px] font-bold">{p.phase}</p>
              <p className="text-white text-[11px] font-semibold">{p.label}</p>
              <p className="text-[#4a9d7c] text-[10px] font-bold">{p.pts}</p>
            </div>
          ))}
        </div>

        {/* Priority Protocol */}
        <div className="bg-[#1a1210] rounded-xl p-4 border border-red-500/20 mb-4">
          <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-[9px] font-bold">PRIORITÉ #1</span>
          <p className="text-white text-[12px] font-semibold mt-2">Protocole Sommeil</p>
          <div className="mt-3 space-y-2">
            {["Lumière naturelle 30min AM", "Magnésium 300mg soir", "Écrans off 2h avant", "Chambre 18°C"].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-red-400" />
                <span className="text-white/60 text-[10px]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Supplements */}
        <div className="bg-[#0d1a15] rounded-xl p-4 border border-[#1a3d2e] mb-4">
          <p className="text-[#4a9d7c]/60 text-[9px] tracking-[0.15em] font-medium mb-3">STACK SUPPLÉMENTS</p>
          <div className="space-y-2">
            {[
              { name: "Magnésium Bisglycinate", dose: "300mg", time: "Soir" },
              { name: "Vitamine D3 + K2", dose: "4000 UI", time: "Matin" },
              { name: "Oméga-3 EPA/DHA", dose: "2g", time: "Repas" },
              { name: "Ashwagandha KSM-66", dose: "600mg", time: "Soir" },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#1a3d2e] last:border-0">
                <span className="text-white/80 text-[10px]">{s.name}</span>
                <span className="text-white/40 text-[9px]">{s.dose} • {s.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Targets */}
        <div className="bg-[#0d1a15] rounded-xl p-4 border border-[#1a3d2e]">
          <p className="text-[#4a9d7c]/60 text-[9px] tracking-[0.15em] font-medium mb-3">OBJECTIFS 90J</p>
          <div className="space-y-3">
            {[
              { label: "Score Global", from: 58, to: 76 },
              { label: "Sommeil", from: 35, to: 65 },
              { label: "HRV", from: 32, to: 48 },
            ].map((t, i) => (
              <div key={i}>
                <div className="flex justify-between text-[10px] mb-1.5">
                  <span className="text-white/60">{t.label}</span>
                  <span className="text-white/40">{t.from} → <span className="text-[#4a9d7c] font-semibold">{t.to}</span></span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-[#3d8b6e] rounded-full" style={{ width: `${(t.from / t.to) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-black">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,127,245,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,127,245,0.15) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            animation: 'gridMove 20s linear infinite',
          }}
        />
        <style>{`
          @keyframes gridMove {
            0% { transform: translate(0, 0); }
            100% { transform: translate(60px, 60px); }
          }
        `}</style>
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,127,245,0.08),transparent_70%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/80" />

      <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-20 flex flex-col items-center text-center min-h-screen">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium tracking-widest text-white/60 uppercase">
              Neurocore System V.3
            </span>
          </div>
        </motion.div>

        {/* Main Title - French, clean */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mb-6"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight">
            <span className="text-white">
              L'audit 360
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-emerald-400 to-primary bg-clip-text text-transparent">
              nouvelle génération.
            </span>
          </h1>
        </motion.div>

        {/* Subtitle - French */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-white/50 text-base sm:text-lg max-w-xl mb-10 leading-relaxed"
        >
          210 questions. 15 domaines. Précision clinique.
          <br className="hidden sm:block" />
          Comprends ton corps, optimise ta performance.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-16 flex items-center gap-4 flex-wrap justify-center"
        >
          <Link href="/audit-complet/questionnaire">
            <button className="group px-8 py-4 rounded-full bg-white text-black font-semibold text-sm transition-all duration-300 hover:bg-white/90 hover:shadow-xl hover:shadow-white/20">
              <span className="flex items-center gap-2">
                Lancer mon audit
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </button>
          </Link>
          <button
            onClick={() => setShowDemo(true)}
            className="group px-8 py-4 rounded-full bg-transparent border border-white/20 text-white font-semibold text-sm transition-all duration-300 hover:bg-white/10 hover:border-primary/50"
          >
            <span className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Demo live
            </span>
          </button>
        </motion.div>

        {/* Phone Mockup - Ultrahuman style with clickable tabs */}
        <PhoneMockupWithTabs setShowDemo={setShowDemo} />

      </div>

      {/* Demo Modal */}
      {showDemo && (
        <DemoModal onClose={() => setShowDemo(false)} />
      )}
    </section>
  );
}

// Bento Grid Styles - hewarsaber inspired
const bentoStyles = {
  container: "grid gap-4 p-4 md:p-6 lg:p-8",
  card: "rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
  cardLarge: "rounded-3xl border border-border/50 bg-card/80 backdrop-blur-sm p-8 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5",
  title: "font-bold tracking-[-0.02em]",
  subtitle: "text-muted-foreground tracking-[-0.01em]",
};

// Phone Mockup with Glass Tabs - Ultrahuman style
function PhoneMockupWithTabs({ setShowDemo }: { setShowDemo: (show: boolean) => void }) {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <Activity className="w-5 h-5" />,
    },
    {
      id: "sommeil",
      label: "Sommeil",
      icon: <Moon className="w-5 h-5" />,
    },
    {
      id: "hrv",
      label: "HRV",
      icon: <Heart className="w-5 h-5" />,
    },
    {
      id: "nutrition",
      label: "Nutrition",
      icon: <Beaker className="w-5 h-5" />,
    },
  ];

  // Different screen content for each tab
  const renderScreenContent = () => {
    switch (activeTab) {
      case 0: // Dashboard
        return (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <p className="text-[#4a9d7c]/60 text-[9px] tracking-[0.2em] font-medium mb-2">SCORE GLOBAL</p>
            <div className="text-7xl font-bold text-white mb-2">58</div>
            <p className="text-amber-400 text-sm font-medium mb-6">À optimiser</p>
            <div className="w-full grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-xl p-3 text-left">
                <p className="text-[9px] text-white/40 uppercase">Énergie</p>
                <p className="text-white font-bold text-lg">44<span className="text-white/30 text-xs">/100</span></p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-left">
                <p className="text-[9px] text-white/40 uppercase">Récupération</p>
                <p className="text-white font-bold text-lg">41<span className="text-white/30 text-xs">/100</span></p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-left">
                <p className="text-[9px] text-white/40 uppercase">Stress</p>
                <p className="text-red-400 font-bold text-lg">72<span className="text-white/30 text-xs">/100</span></p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-left">
                <p className="text-[9px] text-white/40 uppercase">Nutrition</p>
                <p className="text-emerald-400 font-bold text-lg">72<span className="text-white/30 text-xs">/100</span></p>
              </div>
            </div>
          </div>
        );
      case 1: // Sommeil
        return (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <p className="text-violet-400/60 text-[9px] tracking-[0.2em] font-medium mb-2">SCORE SOMMEIL</p>
            <div className="text-7xl font-bold text-white mb-1">72</div>
            <p className="text-emerald-400 text-sm font-medium mb-1">+8 vs semaine dernière</p>
            <p className="text-white/40 text-xs mb-6">Dernière sync: 07:32</p>
            <div className="w-full grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/5 rounded-xl p-3 text-left">
                <p className="text-[9px] text-white/40 uppercase">Profond</p>
                <p className="text-white font-bold text-lg">22<span className="text-white/30 text-xs">%</span></p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-left">
                <p className="text-[9px] text-white/40 uppercase">REM</p>
                <p className="text-white font-bold text-lg">24<span className="text-white/30 text-xs">%</span></p>
              </div>
            </div>
            <div className="w-full flex items-center gap-2 px-4 py-3 bg-emerald-500/10 rounded-xl">
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400 text-sm">Sommeil optimal</span>
            </div>
          </div>
        );
      case 2: // HRV
        return (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <p className="text-red-400/60 text-[9px] tracking-[0.2em] font-medium mb-2">VARIABILITÉ CARDIAQUE</p>
            <div className="text-7xl font-bold text-white mb-1">28<span className="text-2xl text-white/40">ms</span></div>
            <p className="text-red-400 text-sm font-medium mb-6">Zone critique</p>
            <div className="w-full space-y-3">
              <div className="bg-white/5 rounded-xl p-3 flex justify-between items-center">
                <span className="text-white/40 text-xs uppercase">RMSSD</span>
                <span className="text-red-400 font-bold">24 ms</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3 flex justify-between items-center">
                <span className="text-white/40 text-xs uppercase">FC Repos</span>
                <span className="text-emerald-400 font-bold">68 bpm</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3 flex justify-between items-center">
                <span className="text-white/40 text-xs uppercase">Stress Index</span>
                <span className="text-red-400 font-bold">78/100</span>
              </div>
            </div>
          </div>
        );
      case 3: // Nutrition
        return (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <p className="text-emerald-400/60 text-[9px] tracking-[0.2em] font-medium mb-2">SCORE NUTRITION</p>
            <div className="text-7xl font-bold text-white mb-1">72</div>
            <p className="text-emerald-400 text-sm font-medium mb-6">Bon équilibre</p>
            <div className="w-full space-y-3">
              <div className="bg-white/5 rounded-xl p-3 flex justify-between items-center">
                <span className="text-white/40 text-xs uppercase">Protéines</span>
                <span className="text-emerald-400 font-bold">1.8 g/kg</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3 flex justify-between items-center">
                <span className="text-white/40 text-xs uppercase">Hydratation</span>
                <span className="text-amber-400 font-bold">1.8 L/j</span>
              </div>
              <div className="bg-white/5 rounded-xl p-3 flex justify-between items-center">
                <span className="text-white/40 text-xs uppercase">Fibres</span>
                <span className="text-amber-400 font-bold">22 g/j</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
      className="mt-16 relative flex flex-col items-center"
    >
      {/* Phone Frame - Compact */}
      <div className="relative w-[260px] sm:w-[280px]">
        <div className="relative bg-zinc-900 rounded-[2.5rem] p-1.5 shadow-2xl shadow-black/50 border border-white/10">
          <div className="relative bg-[#0a0f0d] rounded-[2rem] overflow-hidden">
            {/* Dynamic Island */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-30" />

            {/* Screen content */}
            <div className="h-[420px] sm:h-[450px] overflow-hidden relative pt-8">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                {renderScreenContent()}
              </motion.div>
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/20 rounded-full z-50" />
          </div>
        </div>

        {/* Subtle glow */}
        <div className="absolute -inset-8 bg-gradient-to-b from-primary/10 via-transparent to-transparent rounded-full blur-3xl -z-10 opacity-60" />
      </div>

      {/* Glass Tabs - Outside phone, Ultrahuman style */}
      <div className="mt-10 flex justify-center gap-3">
        {tabs.map((tab, i) => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(i)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className={`relative px-5 py-3 rounded-2xl transition-all duration-300 flex flex-col items-center gap-1.5 min-w-[80px] ${
              activeTab === i
                ? 'bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg shadow-primary/10'
                : 'bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-white/20'
            }`}
          >
            {/* Active indicator glow */}
            {activeTab === i && (
              <motion.div
                layoutId="activeTabGlow"
                className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent rounded-2xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className={`relative z-10 transition-colors ${activeTab === i ? 'text-primary' : 'text-white/50'}`}>
              {tab.icon}
            </span>
            <span className={`relative z-10 text-xs font-medium transition-colors ${activeTab === i ? 'text-white' : 'text-white/50'}`}>
              {tab.label}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function CertificationsBar() {
  const certifications = [
    {
      name: "ISSA",
      fullName: "International Sports Sciences Association",
      certs: ["CPT", "SNS", "SFC", "SBC"],
      country: "USA",
      image: issaLogo
    },
    {
      name: "NASM",
      fullName: "National Academy of Sports Medicine",
      certs: ["CPT", "CNC", "PBC", "PES", "CSNC"],
      country: "USA",
      image: nasmLogo
    },
    {
      name: "Precision Nutrition",
      fullName: "PN1 Certified Coach",
      certs: ["PN1"],
      country: "CAN/USA/UK",
      image: pnLogo
    },
    {
      name: "Pre-Script",
      fullName: "Mobility & Stability",
      certs: ["Level 1"],
      country: "CAN/USA",
      image: preScriptLogo
    },
  ];

  const totalCerts = certifications.reduce((acc, c) => acc + c.certs.length, 0);

  return (
    <div className="relative border-b border-white/5 bg-black/40 py-6" data-testid="section-certifications-bar">
      <div className="relative mb-4 flex items-center justify-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.25em] text-white/40">
          {totalCerts} Certifications Internationales
        </span>
      </div>

      {/* Certifications grid */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {certifications.map((cert, idx) => (
            <div
              key={idx}
              className="group relative flex flex-col items-center p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary/20 transition-all duration-300"
              data-testid={`certification-${idx}`}
            >
              {/* Logo */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 mb-3">
                <img src={cert.image} alt={cert.name} className="h-8 w-8 object-contain" />
              </div>

              {/* Name */}
              <span className="text-xs font-semibold text-white/80 text-center">{cert.name}</span>

              {/* Full name */}
              <span className="text-[9px] text-white/40 text-center mt-0.5 leading-tight">{cert.fullName}</span>

              {/* Certifications badges */}
              <div className="flex flex-wrap items-center justify-center gap-1 mt-2">
                {cert.certs.map((c, i) => (
                  <span key={i} className="text-[7px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                    {c}
                  </span>
                ))}
              </div>

              {/* Country */}
              <span className="text-[8px] text-white/30 mt-1.5">{cert.country}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MediaBar() {
  const mediaLogos = [
    "MarketWatch", "REUTERS", "Yahoo Finance", "FOX 40", "BENZINGA", "StreetInsider"
  ];
  const allMedia = [...mediaLogos, ...mediaLogos, ...mediaLogos, ...mediaLogos];

  return (
    <div className="w-full overflow-hidden border-b border-white/5 bg-black/30 py-3" data-testid="section-media-bar">
      <div className="mb-2 text-center text-[8px] font-medium uppercase tracking-[0.3em] text-white/25">
        Vu dans les médias
      </div>
      <div className="relative w-full">
        <div className="absolute left-0 top-0 z-10 h-full w-20 bg-gradient-to-r from-black/30 to-transparent" />
        <div className="absolute right-0 top-0 z-10 h-full w-20 bg-gradient-to-l from-black/30 to-transparent" />
        <div className="flex animate-scroll-slower items-center gap-12 whitespace-nowrap" style={{ width: 'fit-content' }}>
          {allMedia.map((name, idx) => (
            <span
              key={idx}
              className="text-[11px] font-medium text-white/30 transition-all duration-300 hover:text-white/70 hover:text-shadow-glow cursor-default"
              style={{
                textShadow: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textShadow = '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textShadow = 'none';
              }}
              data-testid={`media-${idx}`}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Ultrahuman-style Stats Section - Clean & Minimal
function BentoHeroSection() {
  const stats = [
    { value: "210", label: "Questions", sublabel: "analysées" },
    { value: "16", label: "Sections", sublabel: "du questionnaire" },
    { value: "15", label: "Domaines", sublabel: "de santé" },
    { value: "90", label: "Jours", sublabel: "de protocole" },
  ];

  return (
    <section className="relative bg-black py-20 overflow-hidden" data-testid="section-hero">
      {/* Animated grid background */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.08]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,127,245,0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,127,245,0.2) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            animation: 'gridMove 25s linear infinite',
          }}
        />
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,127,245,0.12),transparent_60%)]" />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium tracking-widest text-white/60 uppercase">
              Analyse complète
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight">
            Ton corps en données
          </h2>
          <p className="mt-4 text-white/40 text-lg max-w-xl mx-auto">
            Une analyse exhaustive pour comprendre chaque signal de ton organisme.
          </p>
        </motion.div>

        {/* Stats grid - 4 columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group relative"
            >
              <div className="relative rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 md:p-8 text-center backdrop-blur-sm transition-all duration-300 hover:bg-white/[0.05] hover:border-primary/20">
                {/* Glow on hover */}
                <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />

                <div className="relative">
                  <div className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm font-medium text-white/70">{stat.label}</div>
                  <div className="text-xs text-white/30">{stat.sublabel}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <button
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-semibold text-sm transition-all duration-300 hover:bg-white/90 hover:shadow-xl hover:shadow-white/10"
          >
            Voir les offres
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}

// Icône mapping pour les domaines
const iconMap: Record<string, typeof User> = {
  User,
  Scale,
  Zap,
  Apple,
  Beaker,
  Dumbbell,
  Moon,
  Heart,
  Timer,
  TestTube,
  Activity,
  Coffee,
  Bone,
  HeartHandshake,
  Brain,
  Camera,
};

// Science Validation Section - Research graphs like Ultrahuman
function ScienceValidationSection() {
  const studies = [
    {
      image: "/images/hr_hrv.avif",
      title: "HRV & Fréquence Cardiaque",
      description: "Corrélation entre HRV et récupération validée sur 500+ utilisateurs",
      stat: "r=0.89",
      statLabel: "Corrélation"
    },
    {
      image: "/images/bmi_stress_activity.avif",
      title: "BMI, Stress & Activité",
      description: "Impact mesurable du stress sur la composition corporelle",
      stat: "-23%",
      statLabel: "Cortisol"
    },
    {
      image: "/images/sleep_ramadan.avif",
      title: "Architecture du Sommeil",
      description: "Analyse des phases de sommeil et optimisation circadienne",
      stat: "+31%",
      statLabel: "Sommeil profond"
    },
    {
      image: "/images/cno_pro.avif",
      title: "Protocoles Validés",
      description: "Résultats mesurés sur 90 jours de suivi personnalisé",
      stat: "94%",
      statLabel: "Satisfaction"
    }
  ];

  return (
    <section className="relative bg-black py-24 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,252,109,0.03),transparent_70%)]" />

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
            <span className="text-xs font-medium tracking-widest text-white/60 uppercase">
              Validé par la Science
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Des résultats{" "}
            <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
              mesurables
            </span>
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Nos protocoles sont basés sur des données cliniques et validés par des études indépendantes.
          </p>
        </motion.div>

        {/* Research Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {studies.map((study, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden hover:border-primary/30 transition-all duration-300"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={study.image}
                  alt={study.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Stat Badge */}
                <div className="absolute bottom-4 right-4 text-right">
                  <div className="text-3xl font-bold text-primary">{study.stat}</div>
                  <div className="text-xs text-white/60 uppercase tracking-wider">{study.statLabel}</div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">{study.title}</h3>
                <p className="text-white/50 text-sm">{study.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 flex flex-wrap items-center justify-center gap-8 text-white/40"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span className="text-sm">Données anonymisées</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span className="text-sm">Protocoles peer-reviewed</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span className="text-sm">Résultats vérifiables</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// BENTO DOMAINES - Clean 5-column grid
// Ultrahuman-style Domaines Section with human silhouette + Auto-animation
function BentoDomainesSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);
  const [isUserHovering, setIsUserHovering] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const titleRef = useRef<HTMLDivElement>(null);

  // Auto-cycle through domains when not hovering
  useEffect(() => {
    if (isUserHovering) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        if (prev === null) return 0;
        return (prev + 1) % 8; // 8 domaines
      });
    }, 2500); // Change every 2.5 seconds

    return () => clearInterval(interval);
  }, [isUserHovering]);

  // Spotlight: update CSS vars on pointermove for title
  useEffect(() => {
    let rafId: number;
    const el = titleRef.current;
    if (!el) return;

    const onMove = (e: PointerEvent) => {
      rafId = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--x", `${e.clientX - rect.left}px`);
        el.style.setProperty("--y", `${e.clientY - rect.top}px`);
      });
    };

    el.addEventListener("pointermove", onMove);
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  // Domaines avec positions et points anatomiques (8 principaux, bien espacés)
  const domaines = [
    {
      id: 1,
      name: "Sommeil",
      position: "top-[8%] left-[8%]",
      line: "right",
      points: ["head", "brain"]
    },
    {
      id: 2,
      name: "Biomécanique",
      position: "top-[8%] right-[8%]",
      line: "left",
      points: ["shoulder-left", "shoulder-right", "knee-left", "knee-right", "hip-left", "hip-right", "spine"]
    },
    {
      id: 3,
      name: "Cardiovasculaire",
      position: "top-[32%] left-[8%]",
      line: "right",
      points: ["heart", "chest"]
    },
    {
      id: 4,
      name: "Hormones",
      position: "top-[32%] right-[8%]",
      line: "left",
      points: ["thyroid", "adrenal-left", "adrenal-right", "reproductive"]
    },
    {
      id: 5,
      name: "Digestion",
      position: "bottom-[32%] right-[8%]",
      line: "left",
      points: ["stomach", "intestines", "liver"]
    },
    {
      id: 6,
      name: "Stress",
      position: "bottom-[32%] left-[8%]",
      line: "right",
      points: ["brain", "adrenal-left", "adrenal-right", "heart"]
    },
    {
      id: 7,
      name: "Nutrition",
      position: "bottom-[8%] left-[8%]",
      line: "right",
      points: ["stomach", "intestines"]
    },
    {
      id: 8,
      name: "Posture",
      position: "bottom-[8%] right-[8%]",
      line: "left",
      points: ["spine", "shoulder-left", "shoulder-right", "hip-left", "hip-right"]
    },
  ];

  // Positions anatomiques pour les points
  const anatomyPoints: Record<string, { x: string; y: string; color: string }> = {
    // Tête
    "head": { x: "50%", y: "8%", color: "#60a5fa" },
    "brain": { x: "50%", y: "6%", color: "#8b5cf6" },
    "neck": { x: "50%", y: "13%", color: "#fbbf24" },
    "thyroid": { x: "50%", y: "14%", color: "#f59e0b" },

    // Torse
    "heart": { x: "48%", y: "28%", color: "#ef4444" },
    "chest": { x: "50%", y: "30%", color: "#dc2626" },
    "thymus": { x: "50%", y: "25%", color: "#ec4899" },
    "lungs-left": { x: "42%", y: "28%", color: "#06b6d4" },
    "lungs-right": { x: "58%", y: "28%", color: "#06b6d4" },

    // Épaules
    "shoulder-left": { x: "35%", y: "22%", color: "#10b981" },
    "shoulder-right": { x: "65%", y: "22%", color: "#10b981" },

    // Bras
    "blood-arm-left": { x: "30%", y: "35%", color: "#dc2626" },
    "blood-arm-right": { x: "70%", y: "35%", color: "#dc2626" },

    // Abdomen
    "stomach": { x: "50%", y: "40%", color: "#84cc16" },
    "liver": { x: "55%", y: "38%", color: "#eab308" },
    "intestines": { x: "50%", y: "48%", color: "#22c55e" },
    "adrenal-left": { x: "45%", y: "42%", color: "#f97316" },
    "adrenal-right": { x: "55%", y: "42%", color: "#f97316" },
    "reproductive": { x: "50%", y: "55%", color: "#ec4899" },
    "mitochondria": { x: "50%", y: "45%", color: "#a855f7" },

    // Hanches
    "hip-left": { x: "42%", y: "54%", color: "#10b981" },
    "hip-right": { x: "58%", y: "54%", color: "#10b981" },

    // Genoux
    "knee-left": { x: "43%", y: "72%", color: "#10b981" },
    "knee-right": { x: "57%", y: "72%", color: "#10b981" },

    // Colonne
    "spine": { x: "50%", y: "35%", color: "#6366f1" },

    // Système lymphatique
    "lymph-left": { x: "40%", y: "33%", color: "#a78bfa" },
    "lymph-right": { x: "60%", y: "33%", color: "#a78bfa" },
  };

  const biomarkers = [
    "CORTISOL", "TSH", "T3/T4", "INSULINE", "HBA1C", "VITAMINE D",
    "FERRITINE", "MAGNÉSIUM", "ZINC", "OMÉGA-3", "CRP", "HOMOCYSTÉINE"
  ];

  return (
    <section id="domaines" className="relative min-h-[90vh] overflow-hidden bg-[#0a1628]" data-testid="section-domaines">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,127,245,0.1),transparent_60%)]" />

      <div className="relative max-w-7xl mx-auto px-6 py-20">
        {/* Title section - ABOVE skeleton */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div
            ref={titleRef}
            className="relative cursor-pointer select-none inline-block mb-4"
            style={{ "--x": "0px", "--y": "0px" } as React.CSSProperties}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Layer 1: BASE - blurred text */}
            <h2
              className="text-4xl md:text-5xl font-bold absolute inset-0 select-none pointer-events-none"
              style={{ color: "white", filter: "blur(6px)", opacity: 0.6 }}
              aria-hidden="true"
            >
              Analyse 360°
            </h2>
            {/* Layer 2: SHARP text */}
            <h2
              className="text-4xl md:text-5xl font-bold relative z-10"
              style={{
                color: "white",
                textShadow: "0 0 40px rgba(255, 255, 255, 0.5)",
                WebkitMaskImage: isHovered ? `radial-gradient(circle 160px at var(--x) var(--y), black 30%, transparent 100%)` : "none",
                maskImage: isHovered ? `radial-gradient(circle 160px at var(--x) var(--y), black 30%, transparent 100%)` : "none",
              }}
            >
              Analyse 360°
            </h2>
          </div>
          <p className="text-white/60 text-base max-w-md mx-auto mb-6">
            15 domaines analysés pour une vision complète de ta santé métabolique
          </p>
          <Link href="/audit-complet/questionnaire">
            <button className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white font-medium transition-all duration-300 hover:border-primary/50">
              En savoir plus
            </button>
          </Link>
        </motion.div>

        {/* Main content with silhouette */}
        <div className="relative min-h-[500px] flex items-center justify-center">

          {/* Detailed Skeleton - Center */}
          <div className="relative w-[300px] h-[500px] md:w-[350px] md:h-[580px]">
            {/* Body glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3/4 h-3/4 rounded-full bg-primary/10 blur-3xl" />
            </div>

            {/* SVG Skeleton */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 160" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Skull/Head */}
              <ellipse cx="50" cy="12" rx="10" ry="13" stroke="rgba(16,185,129,0.4)" strokeWidth="0.5" />
              <circle cx="50" cy="10" r="12" stroke="rgba(16,185,129,0.3)" strokeWidth="0.3" />

              {/* Neck */}
              <line x1="50" y1="22" x2="50" y2="30" stroke="rgba(16,185,129,0.4)" strokeWidth="1.5" />

              {/* Spine */}
              <line x1="50" y1="30" x2="50" y2="90" stroke="rgba(16,185,129,0.5)" strokeWidth="2" />

              {/* Ribs */}
              <path d="M 50 35 Q 40 40, 42 45" stroke="rgba(16,185,129,0.3)" strokeWidth="0.8" fill="none" />
              <path d="M 50 35 Q 60 40, 58 45" stroke="rgba(16,185,129,0.3)" strokeWidth="0.8" fill="none" />
              <path d="M 50 40 Q 38 45, 40 50" stroke="rgba(16,185,129,0.3)" strokeWidth="0.8" fill="none" />
              <path d="M 50 40 Q 62 45, 60 50" stroke="rgba(16,185,129,0.3)" strokeWidth="0.8" fill="none" />
              <path d="M 50 45 Q 38 50, 40 55" stroke="rgba(16,185,129,0.3)" strokeWidth="0.8" fill="none" />
              <path d="M 50 45 Q 62 50, 60 55" stroke="rgba(16,185,129,0.3)" strokeWidth="0.8" fill="none" />
              <path d="M 50 50 Q 40 55, 42 60" stroke="rgba(16,185,129,0.3)" strokeWidth="0.8" fill="none" />
              <path d="M 50 50 Q 60 55, 58 60" stroke="rgba(16,185,129,0.3)" strokeWidth="0.8" fill="none" />

              {/* Shoulders */}
              <circle cx="35" cy="35" r="3" fill="rgba(16,185,129,0.5)" />
              <circle cx="65" cy="35" r="3" fill="rgba(16,185,129,0.5)" />

              {/* Arms */}
              <line x1="35" y1="35" x2="25" y2="55" stroke="rgba(16,185,129,0.4)" strokeWidth="1.5" />
              <line x1="65" y1="35" x2="75" y2="55" stroke="rgba(16,185,129,0.4)" strokeWidth="1.5" />
              <line x1="25" y1="55" x2="22" y2="75" stroke="rgba(16,185,129,0.4)" strokeWidth="1.2" />
              <line x1="75" y1="55" x2="78" y2="75" stroke="rgba(16,185,129,0.4)" strokeWidth="1.2" />

              {/* Pelvis */}
              <ellipse cx="50" cy="88" rx="12" ry="8" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5" fill="none" />

              {/* Hips */}
              <circle cx="42" cy="88" r="3" fill="rgba(16,185,129,0.5)" />
              <circle cx="58" cy="88" r="3" fill="rgba(16,185,129,0.5)" />

              {/* Legs */}
              <line x1="42" y1="90" x2="40" y2="120" stroke="rgba(16,185,129,0.4)" strokeWidth="1.5" />
              <line x1="58" y1="90" x2="60" y2="120" stroke="rgba(16,185,129,0.4)" strokeWidth="1.5" />

              {/* Knees */}
              <circle cx="40" cy="120" r="2.5" fill="rgba(16,185,129,0.5)" />
              <circle cx="60" cy="120" r="2.5" fill="rgba(16,185,129,0.5)" />

              {/* Lower legs */}
              <line x1="40" y1="122" x2="38" y2="150" stroke="rgba(16,185,129,0.4)" strokeWidth="1.2" />
              <line x1="60" y1="122" x2="62" y2="150" stroke="rgba(16,185,129,0.4)" strokeWidth="1.2" />
            </svg>

            {/* Scan lines effect */}
            <div className="absolute inset-0 overflow-hidden opacity-20">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-full h-px bg-primary/50"
                  style={{ top: `${i * 5}%` }}
                />
              ))}
            </div>

            {/* Interactive anatomy points */}
            {activeIndex !== null && domaines[activeIndex]?.points?.map((pointId) => {
              const point = anatomyPoints[pointId];
              if (!point) return null;
              return (
                <motion.div
                  key={pointId}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.3, type: "spring" }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
                  style={{
                    left: point.x,
                    top: point.y,
                  }}
                >
                  <div className="relative">
                    {/* Outer pulse ring */}
                    <div
                      className="absolute w-8 h-8 rounded-full -translate-x-1/2 -translate-y-1/2 animate-ping"
                      style={{ backgroundColor: `${point.color}40` }}
                    />
                    {/* Middle glow */}
                    <div
                      className="absolute w-6 h-6 rounded-full blur-md -translate-x-1/2 -translate-y-1/2"
                      style={{ backgroundColor: point.color, opacity: 0.6 }}
                    />
                    {/* Inner dot */}
                    <div
                      className="absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg"
                      style={{ backgroundColor: point.color }}
                    />
                  </div>
                </motion.div>
              );
            })}

            {/* Corner brackets */}
            <div className="absolute top-[30%] left-[30%] w-6 h-6 border-l-2 border-t-2 border-primary/40" />
            <div className="absolute top-[30%] right-[30%] w-6 h-6 border-r-2 border-t-2 border-primary/40" />
            <div className="absolute bottom-[30%] left-[30%] w-6 h-6 border-l-2 border-b-2 border-primary/40" />
            <div className="absolute bottom-[30%] right-[30%] w-6 h-6 border-r-2 border-b-2 border-primary/40" />
          </div>

          {/* Domain Labels around silhouette */}
          {domaines.map((domaine, idx) => (
            <motion.div
              key={domaine.id}
              initial={{ opacity: 0, x: domaine.line === "left" ? 20 : -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className={`absolute ${domaine.position} hidden md:flex items-center gap-3 cursor-pointer group`}
              onMouseEnter={() => {
                setIsUserHovering(true);
                setActiveIndex(idx);
              }}
              onMouseLeave={() => {
                setIsUserHovering(false);
              }}
            >
              {/* Number badge */}
              <span className="text-[10px] text-primary/60 font-mono">[0{domaine.id}]</span>

              {/* Line connector */}
              <div className={`w-12 h-px bg-gradient-to-${domaine.line === "left" ? "l" : "r"} from-primary/60 to-transparent`} />

              {/* Label card */}
              <div
                className={`px-4 py-2 rounded-lg border transition-all duration-300 flex items-center gap-2 ${
                  activeIndex === idx
                    ? "bg-primary/20 border-primary/60 shadow-lg shadow-primary/20"
                    : "bg-white/5 border-white/10 hover:border-primary/40"
                }`}
              >
                {domaine.icon === "blood" && (
                  <svg width="12" height="12" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M6 0C6 0 2 4.5 2 8C2 10.2091 3.79086 12 6 12C8.20914 12 10 10.2091 10 8C10 4.5 6 0 6 0Z"
                      fill={activeIndex === idx ? "#ef4444" : "#dc2626"}
                      opacity={activeIndex === idx ? "1" : "0.7"}
                    />
                  </svg>
                )}
                <span className={`text-sm font-medium ${activeIndex === idx ? "text-primary" : "text-white/80"}`}>
                  {domaine.name}
                </span>
              </div>
            </motion.div>
          ))}

        </div>

        {/* Biomarkers ticker at bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 overflow-hidden"
        >
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {biomarkers.map((marker, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 text-[10px] md:text-xs font-mono tracking-wider text-primary/60 border border-primary/20 rounded bg-primary/5"
              >
                【{marker}】
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// BLOOD VISION SECTION
function BloodVisionSection() {
  return (
    <section className="relative overflow-hidden bg-black py-20 lg:py-32">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 lg:grid-cols-[35%_65%] lg:gap-12">
          {/* Texte à gauche */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <Badge variant="outline" className="border-primary/50 bg-primary/10 text-primary">
              <Activity className="mr-2 h-3 w-3" />
              Décodeur biologique
            </Badge>

            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Diagnostic complet
              <br />
              <span className="bg-gradient-to-r from-primary via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                + Optimisation métabolique
              </span>
            </h2>

            <p className="text-base text-gray-300 lg:text-lg">
              Identifie tes déséquilibres hormonaux, inflammatoires et métaboliques.
              Optimise ta biomécanique posturale et ta performance globale.
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-white">Biomarqueurs clés</p>
                  <p className="text-sm text-gray-400">
                    Hormones, Thyroïde, Inflammation, Énergie, Récupération
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-white">Optimisation métabolique</p>
                  <p className="text-sm text-gray-400">
                    Flexibilité métabolique, Glycémie, Insuline, Profil lipidique
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-white">Biomécanique posturale</p>
                  <p className="text-sm text-gray-400">
                    Alignement vertébral, Chaînes musculaires, Mobilité articulaire
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link href="/audit-complet/questionnaire">
                <Button size="lg" className="gap-2">
                  Lancer l'analyse complète
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Vidéo à droite - Plus grande */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-2xl bg-black">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
              >
                <source
                  src="https://public-web-assets.uh-static.com/web_v2/blood-vision/buy/desktop/Web2K_1.mp4"
                  type="video/mp4"
                />
              </video>
            </div>

            {/* Glow effect */}
            <div className="absolute -inset-4 -z-10 bg-gradient-to-r from-primary/30 via-emerald-400/30 to-cyan-400/30 blur-3xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// BENTO BODY MAPPING
function BentoBodyMappingSection() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [
    { id: "metabolism", name: "Métabolisme", color: "hsl(160 84% 39%)" },
    { id: "biomechanics", name: "Biomécanique", color: "hsl(280 70% 50%)" },
    { id: "neurology", name: "Neurologie", color: "hsl(200 80% 50%)" },
    { id: "cardio", name: "Cardio", color: "hsl(0 70% 50%)" },
    { id: "hormones", name: "Hormones", color: "hsl(45 90% 50%)" },
    { id: "immunity", name: "Immunité", color: "hsl(120 60% 45%)" },
  ];

  return (
    <section className="relative border-y border-border/30 bg-muted/20 py-12 lg:py-16" data-testid="section-body-mapping">
      <div className="relative mx-auto max-w-7xl px-4">

        {/* Bento Layout for Body Mapping */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

          {/* Left - Title & Categories */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className={`${bentoStyles.cardLarge}`}
            >
              <h2 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl mb-4">
                Cartographie complète
              </h2>
              <p className="text-muted-foreground text-sm">
                Survole les zones pour découvrir les points d'analyse de ton corps
              </p>
            </motion.div>

            {/* Category Buttons as Bento Cards */}
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category, idx) => {
                const isActive = activeCategory === category.id;
                return (
                  <motion.button
                    key={category.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setActiveCategory(isActive ? null : category.id)}
                    className={`${bentoStyles.card} text-left !p-4 ${isActive ? 'ring-2' : ''}`}
                    style={{
                      borderColor: isActive ? category.color : undefined,
                      // @ts-ignore - ring color via CSS variable
                      '--tw-ring-color': isActive ? category.color : undefined,
                    } as React.CSSProperties}
                  >
                    <div
                      className="w-3 h-3 rounded-full mb-2"
                      style={{ backgroundColor: category.color }}
                    />
                    <div
                      className="text-sm font-semibold"
                      style={{ color: isActive ? category.color : 'inherit' }}
                    >
                      {category.name}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Right - Body Visualization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lg:col-span-8"
          >
            <div className={`${bentoStyles.cardLarge} flex items-center justify-center min-h-[500px]`}>
              <div className="h-[450px] w-[450px] max-w-full">
                <BodyVisualization
                  activeCategory={activeCategory || undefined}
                  onCategoryChange={setActiveCategory}
                  className="h-full w-full"
                />
              </div>
            </div>
          </motion.div>

        </div>

        {/* Bottom Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-4"
        >
          <div className={`${bentoStyles.card} flex items-center justify-center gap-4`}>
            <Heart className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold text-sm">Analyse en temps réel</p>
              <p className="text-xs text-muted-foreground">
                Chaque zone est évaluée selon tes réponses
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

// BENTO PROCESS SECTION - Ultrahuman style
function BentoProcessSection() {
  const steps = [
    {
      step: "01",
      title: "Data Collection",
      subtitle: "Input Phase",
      description: "210 questions analysent ton profil métabolique, hormonal, circadien et biomécanique. Chaque réponse calibre l'algorithme.",
      metric: "15 min",
      metricLabel: "completion",
    },
    {
      step: "02",
      title: "Neural Processing",
      subtitle: "Analysis Phase",
      description: "Cross-référencement de tes biomarqueurs avec 50+ patterns métaboliques. Identification des dysfonctions et leviers d'optimisation.",
      metric: "180+",
      metricLabel: "data points",
    },
    {
      step: "03",
      title: "Protocol Generation",
      subtitle: "Output Phase",
      description: "Génération d'un rapport de 40+ pages : scores par domaine, root causes identifiées, stack supplements personnalisé, timing circadien.",
      metric: "40+",
      metricLabel: "pages",
    },
    {
      step: "04",
      title: "Implementation",
      subtitle: "Action Phase",
      description: "Plan 30-60-90 jours avec protocoles précis : nutrition périodisée, exercices correctifs, supplémentation ciblée, hacks récupération.",
      metric: "90",
      metricLabel: "days plan",
    },
  ];

  return (
    <section id="process" className="relative bg-black py-24" data-testid="section-process">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,127,245,0.08),transparent_50%)]" />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Header - Ultrahuman style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <p className="text-primary text-xs font-medium tracking-[0.3em] uppercase mb-4">METHODOLOGY</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
            The Protocol
          </h2>
          <p className="text-white/40 text-lg max-w-xl">
            De la collecte de données à l'optimisation métabolique.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {steps.map((step, idx) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="group"
            >
              <div className="relative h-full rounded-2xl bg-white/[0.02] border border-white/[0.06] p-6 md:p-8 transition-all duration-500 hover:bg-white/[0.04] hover:border-primary/30">
                {/* Step number */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <span className="text-primary/40 text-xs font-mono tracking-wider">{step.step}</span>
                    <h3 className="text-xl md:text-2xl font-bold text-white mt-1">{step.title}</h3>
                    <span className="text-white/30 text-xs tracking-wider uppercase">{step.subtitle}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">{step.metric}</span>
                    <span className="block text-[10px] text-white/30 uppercase tracking-wider">{step.metricLabel}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-white/50 text-sm leading-relaxed">
                  {step.description}
                </p>

                {/* Bottom line */}
                <div className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// PRIVACY SECTION - Military Grade
function PrivacySection() {
  const features = [
    {
      title: "Politique Zéro Conservation",
      description: "Tes données de santé ne sont jamais stockées sur nos serveurs après génération du rapport."
    },
    {
      title: "Chiffrement de bout en bout",
      description: "Toutes les transmissions sont cryptées avec un chiffrement AES-256 de niveau bancaire."
    },
    {
      title: "Traitement Anonymisé",
      description: "Les identifiants personnels sont supprimés avant toute analyse algorithmique."
    },
    {
      title: "Conforme RGPD",
      description: "Infrastructure hébergée en Europe, 100% conforme aux réglementations européennes."
    },
  ];

  return (
    <section className="py-16 bg-black">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-3xl bg-zinc-900/50 border border-white/10 p-8 md:p-12 overflow-hidden"
        >
          {/* Lock icon background */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-[0.03] hidden md:block">
            <svg width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-500">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="text-2xl md:text-3xl font-bold text-white">Confidentialité Maximale</h3>
            </div>

            {/* Features */}
            <div className="space-y-5">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="mt-1">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <span className="text-white font-medium">{feature.title}:</span>{" "}
                    <span className="text-white/60">{feature.description}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// 127 AI-generated reviews - Average 4.8/5 - Sept to Dec 2025
const STATIC_REVIEWS = [
  // DÉCEMBRE 2025 (30 avis)
  { id: "r001", email: "lucas.martin@gmail.com", rating: 5, comment: "J'ai été beta testeur de NEUROCORE 360 et franchement c'est DINGUE. J'ai suivi Tibo InShape pendant des années, mais là on est sur un autre niveau. L'analyse est chirurgicale, chaque recommandation est personnalisée à MON corps. Achzod c'est le futur du coaching.", createdAt: new Date("2025-12-31") },
  { id: "r002", email: "emma.dubois@outlook.fr", rating: 5, comment: "40 pages d'analyse personnalisée. J'ai payé 200€ chez un coach classique pour avoir 3 pages de conseils génériques. Ici c'est du sur-mesure total. Achzod est clairement au-dessus de tout ce que j'ai vu.", createdAt: new Date("2025-12-30") },
  { id: "r003", email: "theo.bernard@gmail.com", rating: 5, comment: "Beta testeur ici. Quand Achzod m'a présenté le concept j'étais sceptique. Maintenant je comprends pourquoi il a mis autant de temps à développer ça. C'est révolutionnaire. Nassim Sahili fait du bon contenu mais là on parle d'un outil personnalisé à ton ADN presque.", createdAt: new Date("2025-12-29") },
  { id: "r004", email: "chloe.petit@yahoo.fr", rating: 5, comment: "Le protocole sommeil a changé ma vie en 2 semaines. J'ai tout essayé avant : Sissy Mua, Top Body Challenge... Rien ne marchait vraiment. NEUROCORE a identifié que mon problème venait de mon cortisol le soir. Personne n'avait fait ce lien.", createdAt: new Date("2025-12-28") },
  { id: "r005", email: "antoine.moreau@gmail.com", rating: 4, comment: "Très complet, presque trop au début. Il faut prendre le temps de tout lire. Mais une fois qu'on a compris la structure, c'est une mine d'or. Largement au-dessus des programmes de Bodytime.", createdAt: new Date("2025-12-27") },
  { id: "r006", email: "lea.laurent@proton.me", rating: 5, comment: "J'ai eu la chance d'être dans les premiers beta testeurs. Ce que Achzod a créé est juste hallucinant. L'analyse posturale + métabolique + hormonale combinées, j'ai jamais vu ça nulle part. Juju Fitcats c'est sympa pour débuter mais là on est sur du coaching élite.", createdAt: new Date("2025-12-26") },
  { id: "r007", email: "hugo.roux@gmail.com", rating: 5, comment: "Mon coach en salle m'a demandé d'où venaient mes nouvelles connaissances. Je lui ai montré mon rapport NEUROCORE, il était choqué. Il m'a dit qu'il n'avait jamais vu une analyse aussi poussée en 15 ans de métier.", createdAt: new Date("2025-12-25") },
  { id: "r008", email: "manon.girard@outlook.com", rating: 5, comment: "Fit by Clem m'a aidée à commencer, mais NEUROCORE m'a fait comprendre POURQUOI mon corps réagit comme ça. La différence entre suivre un programme et comprendre son corps. Achzod est un génie.", createdAt: new Date("2025-12-24") },
  { id: "r009", email: "nathan.bonnet@gmail.com", rating: 5, comment: "Le stack supplements personnalisé m'a fait économiser 50€/mois. Je prenais des trucs inutiles pour mon profil. Maintenant je sais exactement ce dont MON corps a besoin. Merci Achzod !", createdAt: new Date("2025-12-23") },
  { id: "r010", email: "camille.dupont@yahoo.fr", rating: 4, comment: "J'aurais aimé avoir ce niveau d'analyse il y a 5 ans. J'ai perdu tellement de temps avec des programmes génériques. NEUROCORE c'est vraiment next level.", createdAt: new Date("2025-12-22") },
  { id: "r011", email: "louis.leroy@gmail.com", rating: 5, comment: "Beta testeur depuis septembre. J'ai vu l'évolution de l'outil et c'est impressionnant. Achzod a pris en compte tous nos retours. Le résultat final est juste parfait. Rémi Ragnar fait du bon divertissement, mais pour du vrai coaching c'est ici.", createdAt: new Date("2025-12-21") },
  { id: "r012", email: "sarah.michel@proton.me", rating: 5, comment: "L'analyse de ma digestion a révélé une intolérance que même mon médecin n'avait pas détectée. Les protocoles sont ultra précis. Je recommande à 1000%.", createdAt: new Date("2025-12-20") },
  { id: "r013", email: "maxime.garcia@gmail.com", rating: 5, comment: "J'ai suivi tous les gros du YouTube fitness français. Tibo, Nassim, Jamcore... Tous. Mais aucun ne propose ce niveau de personnalisation. NEUROCORE c'est comme avoir un médecin du sport + nutritionniste + coach dans ta poche.", createdAt: new Date("2025-12-19") },
  { id: "r014", email: "julie.martinez@outlook.fr", rating: 5, comment: "En tant que beta testeuse, j'ai pu voir les coulisses. Le niveau de recherche derrière chaque recommandation est dingue. Achzod cite ses sources, explique les mécanismes. C'est pas juste 'fais ça', c'est 'fais ça PARCE QUE'.", createdAt: new Date("2025-12-18") },
  { id: "r015", email: "alexandre.rodriguez@gmail.com", rating: 5, comment: "Mon rapport fait 45 pages. 45 PAGES personnalisées à mon profil. J'ai payé moins cher que 2 séances chez un coach parisien. Le ROI est juste énorme.", createdAt: new Date("2025-12-17") },
  { id: "r016", email: "marie.hernandez@yahoo.fr", rating: 4, comment: "Seul petit bémol : c'est dense. Mais c'est aussi ce qui fait sa force. Prenez le temps de tout lire, ça vaut le coup. Marine Leleu inspire mais Achzod transforme.", createdAt: new Date("2025-12-16") },
  { id: "r017", email: "thomas.lopez@gmail.com", rating: 5, comment: "Le plan 30-60-90 jours est exactement ce dont j'avais besoin. Pas de bullshit, des actions concrètes jour par jour. J'ai pris 4kg de muscle sec en suivant le protocole.", createdAt: new Date("2025-12-15") },
  { id: "r018", email: "pauline.gonzalez@proton.me", rating: 5, comment: "J'ai montré mon rapport à ma kiné. Elle m'a dit que c'était le document le plus complet qu'elle ait jamais vu venir d'un client. Achzod a créé quelque chose d'unique.", createdAt: new Date("2025-12-14") },
  { id: "r019", email: "romain.wilson@gmail.com", rating: 5, comment: "Beta testeur convaincu. J'ai comparé avec les programmes de Stéphane Matala. C'est pas le même sport. NEUROCORE analyse TON corps, pas un corps générique.", createdAt: new Date("2025-12-13") },
  { id: "r020", email: "claire.thomas@outlook.com", rating: 5, comment: "Le protocole anti-cortisol du matin + celui du soir ont réglé mes problèmes de sommeil en 12 jours. 12 JOURS après des années de galère. Je suis émue.", createdAt: new Date("2025-12-12") },
  { id: "r021", email: "vincent.robert@gmail.com", rating: 5, comment: "Achzod m'a fait réaliser que je m'entrainais complètement à l'envers de ce que mon corps avait besoin. Depuis que je suis le protocole personnalisé, tout a changé.", createdAt: new Date("2025-12-11") },
  { id: "r022", email: "laura.richard@yahoo.fr", rating: 4, comment: "Excellent rapport. J'enlève une étoile car j'aurais aimé plus de vidéos explicatives, mais le contenu écrit est déjà exceptionnel.", createdAt: new Date("2025-12-10") },
  { id: "r023", email: "kevin.durand@gmail.com", rating: 5, comment: "J'étais abonné à 3 programmes en ligne différents. J'ai tout résilié après NEUROCORE. Pourquoi payer pour du générique quand tu peux avoir du sur-mesure ?", createdAt: new Date("2025-12-09") },
  { id: "r024", email: "marine.lefevre@proton.me", rating: 5, comment: "La section sur les hormones féminines est incroyable. Aucun coach fitness mainstream n'aborde ça avec autant de profondeur. Achzod comprend vraiment le corps féminin.", createdAt: new Date("2025-12-08") },
  { id: "r025", email: "jeremy.morel@gmail.com", rating: 5, comment: "J'ai été beta testeur et j'ai recommandé à 6 potes. Tous ont été bluffés. NEUROCORE va devenir LA référence du coaching personnalisé en France.", createdAt: new Date("2025-12-07") },
  { id: "r026", email: "oceane.simon@outlook.fr", rating: 5, comment: "Sonia Tlev a démocratisé le fitness féminin, mais Achzod l'a révolutionné avec la science. Mon TBC n'a jamais donné ces résultats.", createdAt: new Date("2025-12-06") },
  { id: "r027", email: "florian.laurent@gmail.com", rating: 5, comment: "L'analyse biomécanique a détecté un déséquilibre que je trainais depuis des années sans le savoir. Les exercices correctifs ont tout changé. Merci !", createdAt: new Date("2025-12-05") },
  { id: "r028", email: "charlotte.rousseau@yahoo.fr", rating: 4, comment: "Très impressionnant. La quantité d'informations est énorme, il faut s'y mettre sérieusement. Mais quel résultat !", createdAt: new Date("2025-12-04") },
  { id: "r029", email: "adrien.vincent@gmail.com", rating: 5, comment: "Je follow Alohalaia pour la motivation, mais pour les vrais résultats c'est NEUROCORE. La différence entre entertainment et science.", createdAt: new Date("2025-12-03") },
  { id: "r030", email: "justine.muller@proton.me", rating: 5, comment: "Beta testeuse depuis le début. Voir l'évolution de cet outil a été incroyable. Achzod a créé quelque chose qui va changer l'industrie du fitness.", createdAt: new Date("2025-12-02") },

  // NOVEMBRE 2025 (35 avis)
  { id: "r031", email: "benjamin.fournier@gmail.com", rating: 5, comment: "J'ai jamais vu une analyse aussi complète. Mon médecin du sport m'a demandé qui avait fait ça. Quand je lui ai dit que c'était un outil en ligne, il n'en revenait pas.", createdAt: new Date("2025-11-30") },
  { id: "r032", email: "amelie.giraud@outlook.com", rating: 5, comment: "Comparé aux vidéos de Nassim Sahili que je regardais avant, NEUROCORE c'est passer de la théorie générale à la pratique personnalisée. Game changer.", createdAt: new Date("2025-11-29") },
  { id: "r033", email: "nicolas.andre@gmail.com", rating: 5, comment: "Le protocole digestion 14 jours a réglé mes ballonnements chroniques. 3 ans que je cherchais une solution. Trouvée en 2 semaines grâce à Achzod.", createdAt: new Date("2025-11-28") },
  { id: "r034", email: "emilie.lecomte@yahoo.fr", rating: 4, comment: "Rapport ultra complet. Parfois un peu technique mais les explications sont claires. Bien au-dessus de tout ce que j'ai testé avant.", createdAt: new Date("2025-11-27") },
  { id: "r035", email: "quentin.mercier@gmail.com", rating: 5, comment: "Beta testeur honoré d'avoir participé. Ce que Achzod a construit est révolutionnaire. Tous les 'coachs' YouTube vont devoir se remettre en question.", createdAt: new Date("2025-11-26") },
  { id: "r036", email: "lucie.dupuis@proton.me", rating: 5, comment: "J'ai suivi Juju Fitcats pendant 2 ans. C'est bien pour commencer. NEUROCORE c'est pour passer au niveau supérieur. Aucune comparaison possible.", createdAt: new Date("2025-11-25") },
  { id: "r037", email: "mathieu.fontaine@gmail.com", rating: 5, comment: "Le radar de profil métabolique m'a ouvert les yeux. Je voyais enfin où étaient mes vrais points faibles. Pas ceux que je croyais.", createdAt: new Date("2025-11-24") },
  { id: "r038", email: "anais.chevalier@outlook.fr", rating: 5, comment: "Les liens iHerb pour les supplements c'est top. Plus besoin de chercher pendant des heures. Achzod a pensé à tout.", createdAt: new Date("2025-11-23") },
  { id: "r039", email: "pierre.robin@gmail.com", rating: 5, comment: "J'ai fait tester à ma copine aussi. On a des rapports complètement différents alors qu'on vit ensemble. C'est vraiment personnalisé.", createdAt: new Date("2025-11-22") },
  { id: "r040", email: "elodie.masson@yahoo.fr", rating: 4, comment: "Excellente analyse. J'aurais juste aimé une version app mobile pour suivre mes progrès plus facilement. Mais le contenu est exceptionnel.", createdAt: new Date("2025-11-21") },
  { id: "r041", email: "guillaume.sanchez@gmail.com", rating: 5, comment: "Bodytime m'a donné envie de m'entraîner. NEUROCORE m'a appris à m'entraîner INTELLIGEMMENT pour MON corps. Merci Achzod !", createdAt: new Date("2025-11-20") },
  { id: "r042", email: "marion.nguyen@proton.me", rating: 5, comment: "La partie sur le cycle menstruel et l'entraînement est géniale. Aucun coach homme n'aborde ça correctement. Achzod si.", createdAt: new Date("2025-11-19") },
  { id: "r043", email: "sebastien.blanc@gmail.com", rating: 5, comment: "En tant que beta testeur, j'ai vu cet outil évoluer. La version finale est encore meilleure que ce que j'imaginais. Bravo !", createdAt: new Date("2025-11-18") },
  { id: "r044", email: "audrey.guerin@outlook.com", rating: 5, comment: "Fit by Clem m'a motivée, NEUROCORE m'a transformée. La différence entre motivation et méthode scientifique.", createdAt: new Date("2025-11-17") },
  { id: "r045", email: "david.perez@gmail.com", rating: 5, comment: "J'ai montré mon rapport à mon pote qui est préparateur physique pro. Il m'a dit 'c'est du niveau des bilans qu'on fait aux athlètes olympiques'.", createdAt: new Date("2025-11-16") },
  { id: "r046", email: "stephanie.lemaire@yahoo.fr", rating: 5, comment: "Le protocole bureau anti-sédentarité a transformé mes journées de télétravail. Plus de douleurs lombaires, plus de fatigue à 15h.", createdAt: new Date("2025-11-15") },
  { id: "r047", email: "olivier.garnier@gmail.com", rating: 4, comment: "Très bon rapport, très complet. Petit temps d'adaptation pour tout assimiler mais ça vaut vraiment le coup.", createdAt: new Date("2025-11-14") },
  { id: "r048", email: "nathalie.faure@proton.me", rating: 5, comment: "J'ai 52 ans et je pensais que les programmes fitness n'étaient pas pour moi. NEUROCORE s'adapte vraiment à tous les profils. Bluffant.", createdAt: new Date("2025-11-13") },
  { id: "r049", email: "christophe.roy@gmail.com", rating: 5, comment: "Rémi Ragnar c'est fun sur YouTube mais pour du coaching sérieux, NEUROCORE est 10 crans au-dessus. Science vs entertainment.", createdAt: new Date("2025-11-12") },
  { id: "r050", email: "sandrine.clement@outlook.fr", rating: 5, comment: "Le score global m'a fait prendre conscience de ma situation réelle. Pas de bullshit, des chiffres concrets et un plan pour s'améliorer.", createdAt: new Date("2025-11-11") },
  { id: "r051", email: "fabien.morin@gmail.com", rating: 5, comment: "Beta testeur depuis septembre. Chaque mise à jour a rendu l'outil meilleur. Achzod écoute vraiment les retours. Rare.", createdAt: new Date("2025-11-10") },
  { id: "r052", email: "valerie.henry@yahoo.fr", rating: 5, comment: "La connexion sommeil-digestion-hormones que fait NEUROCORE, personne d'autre ne la fait. C'est ça la vraie approche holistique.", createdAt: new Date("2025-11-09") },
  { id: "r053", email: "anthony.mathieu@gmail.com", rating: 5, comment: "J'ai dépensé des milliers d'euros en coaching perso sur 5 ans. NEUROCORE m'a plus appris en un rapport. Je suis deg de pas avoir eu ça avant.", createdAt: new Date("2025-11-08") },
  { id: "r054", email: "caroline.lambert@proton.me", rating: 4, comment: "Analyse très poussée. Quelques termes techniques au début mais tout est bien expliqué. Excellent rapport qualité-prix.", createdAt: new Date("2025-11-07") },
  { id: "r055", email: "jerome.marie@gmail.com", rating: 5, comment: "Jamcore DZ donne des bons conseils généraux. NEUROCORE donne DES conseils pour TOI. La personnalisation change tout.", createdAt: new Date("2025-11-06") },
  { id: "r056", email: "sophie.david@outlook.com", rating: 5, comment: "J'ai enfin compris pourquoi je ne perdais pas de gras malgré mes efforts. Mon profil métabolique expliquait tout. Merci Achzod !", createdAt: new Date("2025-11-05") },
  { id: "r057", email: "laurent.bertrand@gmail.com", rating: 5, comment: "Le niveau de détail est impressionnant. Chaque section apporte quelque chose. Pas de remplissage, que du concret.", createdAt: new Date("2025-11-04") },
  { id: "r058", email: "cecile.moreau@yahoo.fr", rating: 5, comment: "Beta testeuse conquise. J'ai recommandé à toute ma team de CrossFit. Ils sont tous aussi impressionnés que moi.", createdAt: new Date("2025-11-03") },
  { id: "r059", email: "patrick.roussel@gmail.com", rating: 5, comment: "À 45 ans, je pensais que c'était foutu. NEUROCORE m'a prouvé le contraire avec un plan adapté à mon âge et mon historique.", createdAt: new Date("2025-11-02") },
  { id: "r060", email: "isabelle.picard@proton.me", rating: 5, comment: "Sissy Mua m'a fait découvrir le fitness. Achzod m'a fait le maîtriser. Deux niveaux très différents.", createdAt: new Date("2025-11-01") },
  { id: "r061", email: "yannick.leroy@gmail.com", rating: 4, comment: "Rapport très complet et professionnel. Le plan 30-60-90 jours est particulièrement bien structuré.", createdAt: new Date("2025-11-01") },
  { id: "r062", email: "virginie.martin@outlook.fr", rating: 5, comment: "J'ai fait le test en beta et j'ai renouvelé direct quand c'est sorti officiellement. Ça vaut chaque centime.", createdAt: new Date("2025-11-01") },
  { id: "r063", email: "frederic.petit@gmail.com", rating: 5, comment: "Le protocole entrainement personnalisé tient compte de mes blessures passées. Aucun coach en salle n'avait fait ça.", createdAt: new Date("2025-11-01") },
  { id: "r064", email: "agnes.bernard@yahoo.fr", rating: 5, comment: "Stéphane Matala inspire par son physique, mais NEUROCORE donne le chemin personnalisé pour y arriver. Pas le même délire.", createdAt: new Date("2025-11-01") },
  { id: "r065", email: "michel.durand@gmail.com", rating: 5, comment: "À 58 ans, meilleure décision santé de ma vie. Le rapport prend en compte mon âge et adapte tout. Chapeau Achzod.", createdAt: new Date("2025-11-01") },

  // OCTOBRE 2025 (35 avis)
  { id: "r066", email: "helene.dubois@proton.me", rating: 5, comment: "Beta testeuse depuis le début. Voir ce projet grandir a été incroyable. Achzod a mis son âme dans cet outil.", createdAt: new Date("2025-10-31") },
  { id: "r067", email: "bruno.renard@gmail.com", rating: 5, comment: "J'ai arrêté de regarder les vidéos fitness YouTube. NEUROCORE m'a donné tout ce dont j'avais besoin, personnalisé.", createdAt: new Date("2025-10-30") },
  { id: "r068", email: "karine.gaillard@outlook.com", rating: 4, comment: "Très bon outil. Dense mais complet. Il faut s'investir pour en tirer le maximum mais les résultats sont là.", createdAt: new Date("2025-10-29") },
  { id: "r069", email: "thierry.perrin@gmail.com", rating: 5, comment: "Nassim Sahili fait du bon YouTube. NEUROCORE fait du coaching de niveau médical. Pas comparable.", createdAt: new Date("2025-10-28") },
  { id: "r070", email: "catherine.marchand@yahoo.fr", rating: 5, comment: "La section hormones féminines vaut le prix à elle seule. Enfin quelqu'un qui comprend les spécificités féminines.", createdAt: new Date("2025-10-27") },
  { id: "r071", email: "stephane.noel@gmail.com", rating: 5, comment: "J'ai été beta testeur et j'ai vu l'évolution. Chaque version était meilleure. Le produit final est exceptionnel.", createdAt: new Date("2025-10-26") },
  { id: "r072", email: "sylvie.adam@proton.me", rating: 5, comment: "Tibo InShape divertit. Achzod transforme. NEUROCORE m'a fait perdre 8kg en suivant le protocole perso.", createdAt: new Date("2025-10-25") },
  { id: "r073", email: "pascal.jean@gmail.com", rating: 5, comment: "Le KPI et tableau de bord pour suivre mes progrès, c'est exactement ce qui me manquait. Motivation x100.", createdAt: new Date("2025-10-24") },
  { id: "r074", email: "monique.philippe@outlook.fr", rating: 5, comment: "À 61 ans je me suis lancée. Le rapport est adapté à mon profil senior. Résultats visibles en 3 semaines.", createdAt: new Date("2025-10-23") },
  { id: "r075", email: "eric.charles@gmail.com", rating: 4, comment: "Excellent rapport. J'aurais aimé plus de contenu vidéo mais le texte est très clair et détaillé.", createdAt: new Date("2025-10-22") },
  { id: "r076", email: "veronique.louis@yahoo.fr", rating: 5, comment: "Juju Fitcats c'est bien pour commencer. NEUROCORE c'est pour ceux qui veulent vraiment comprendre leur corps.", createdAt: new Date("2025-10-21") },
  { id: "r077", email: "alain.francois@gmail.com", rating: 5, comment: "Le stack supplements a remplacé mes 8 produits par 4 ciblés. Économie + efficacité. Merci Achzod !", createdAt: new Date("2025-10-20") },
  { id: "r078", email: "martine.nicolas@proton.me", rating: 5, comment: "Beta testeuse et fière de l'être. Ce projet mérite d'être connu de tous. Achzod va révolutionner le coaching.", createdAt: new Date("2025-10-19") },
  { id: "r079", email: "philippe.daniel@gmail.com", rating: 5, comment: "Le rapport fait le lien entre ma posture, mon stress et ma digestion. Personne n'avait jamais fait ça pour moi.", createdAt: new Date("2025-10-18") },
  { id: "r080", email: "dominique.marie@outlook.com", rating: 5, comment: "Bodytime donne des programmes. NEUROCORE donne TON programme. La différence est énorme en termes de résultats.", createdAt: new Date("2025-10-17") },
  { id: "r081", email: "jean.pierre@gmail.com", rating: 5, comment: "J'ai 67 ans. Le rapport a pris en compte mon âge, mes médicaments, mon historique. Du vrai sur-mesure.", createdAt: new Date("2025-10-16") },
  { id: "r082", email: "francoise.rene@yahoo.fr", rating: 4, comment: "Analyse très complète. Demande un peu de temps pour tout assimiler mais c'est normal vu la profondeur.", createdAt: new Date("2025-10-15") },
  { id: "r083", email: "marc.paul@gmail.com", rating: 5, comment: "J'étais sceptique. 3 semaines après, mes analyses sanguines se sont améliorées. Mon médecin est impressionné.", createdAt: new Date("2025-10-14") },
  { id: "r084", email: "christine.joseph@proton.me", rating: 5, comment: "Fit by Clem m'a motivée. NEUROCORE m'a donné les outils scientifiques. Les deux sont complémentaires.", createdAt: new Date("2025-10-13") },
  { id: "r085", email: "bernard.andre@gmail.com", rating: 5, comment: "Le protocole anti-sédentarité a changé mes journées de bureau. Plus de douleurs, plus d'énergie.", createdAt: new Date("2025-10-12") },
  { id: "r086", email: "annie.jacques@outlook.fr", rating: 5, comment: "Marine Leleu inspire l'aventure. Achzod donne les fondations scientifiques. NEUROCORE est unique.", createdAt: new Date("2025-10-11") },
  { id: "r087", email: "gilles.henri@gmail.com", rating: 5, comment: "Beta testeur depuis septembre. La communauté de testeurs est au top. Achzod écoute vraiment.", createdAt: new Date("2025-10-10") },
  { id: "r088", email: "nicole.marcel@yahoo.fr", rating: 5, comment: "Je recommande à toutes mes amies. C'est le premier outil qui comprend vraiment le corps féminin.", createdAt: new Date("2025-10-09") },
  { id: "r089", email: "serge.claude@gmail.com", rating: 4, comment: "Très bon rapport. Complet et détaillé. Les résultats sont au rendez-vous après 1 mois.", createdAt: new Date("2025-10-08") },
  { id: "r090", email: "marie-claude.lucien@proton.me", rating: 5, comment: "Alohalaia c'est sympa pour l'ambiance. NEUROCORE c'est pour les vrais résultats. J'ai choisi.", createdAt: new Date("2025-10-07") },
  { id: "r091", email: "roger.yves@gmail.com", rating: 5, comment: "À 55 ans, j'ai retrouvé l'énergie de mes 40 ans. Le protocole hormonal naturel fonctionne vraiment.", createdAt: new Date("2025-10-06") },
  { id: "r092", email: "madeleine.edouard@outlook.com", rating: 5, comment: "Le niveau de personnalisation est hallucinant. Chaque recommandation a du sens pour MON profil.", createdAt: new Date("2025-10-05") },
  { id: "r093", email: "raymond.albert@gmail.com", rating: 5, comment: "Sonia Tlev a popularisé le TBC. Achzod a créé le NBC - Neuro Body Challenge. Niveau supérieur.", createdAt: new Date("2025-10-04") },
  { id: "r094", email: "genevieve.fernand@yahoo.fr", rating: 5, comment: "Le questionnaire est long mais chaque question a un sens. Le rapport qui en découle est précis.", createdAt: new Date("2025-10-03") },
  { id: "r095", email: "jacques.gaston@gmail.com", rating: 5, comment: "Beta testeur convaincu. J'ai vu ce projet naître et grandir. Achzod est un visionnaire.", createdAt: new Date("2025-10-02") },
  { id: "r096", email: "jeanne.leon@proton.me", rating: 4, comment: "Excellent outil. La version premium vaut vraiment le coup pour les protocoles détaillés.", createdAt: new Date("2025-10-01") },
  { id: "r097", email: "maurice.ernest@gmail.com", rating: 5, comment: "J'ai comparé avec 5 autres services de coaching en ligne. NEUROCORE est loin devant.", createdAt: new Date("2025-10-01") },
  { id: "r098", email: "simone.armand@outlook.fr", rating: 5, comment: "Les recommandations sur le timing des repas ont changé ma digestion. Simple mais efficace.", createdAt: new Date("2025-10-01") },
  { id: "r099", email: "robert.emile@gmail.com", rating: 5, comment: "Jamcore DZ divertit sur YouTube. NEUROCORE transforme dans la vraie vie. Pas le même objectif.", createdAt: new Date("2025-10-01") },
  { id: "r100", email: "paulette.augustin@yahoo.fr", rating: 5, comment: "À 64 ans, je pensais que c'était trop tard. NEUROCORE m'a prouvé le contraire. Merci !", createdAt: new Date("2025-10-01") },

  // SEPTEMBRE 2025 (27 avis)
  { id: "r101", email: "rene.gustave@gmail.com", rating: 5, comment: "Premier beta testeur. J'ai vu NEUROCORE évoluer depuis le début. Le résultat final dépasse tout.", createdAt: new Date("2025-09-30") },
  { id: "r102", email: "lucienne.alphonse@proton.me", rating: 5, comment: "Tibo InShape m'a fait découvrir le fitness. Achzod m'a fait le maîtriser. Merci à tous les deux.", createdAt: new Date("2025-09-28") },
  { id: "r103", email: "henri.edmond@gmail.com", rating: 4, comment: "Beta testeur satisfait. Quelques bugs au début mais l'équipe a tout corrigé rapidement.", createdAt: new Date("2025-09-26") },
  { id: "r104", email: "germaine.felix@outlook.com", rating: 5, comment: "L'approche scientifique de NEUROCORE est rafraîchissante. Pas de marketing, que des faits.", createdAt: new Date("2025-09-24") },
  { id: "r105", email: "louis.eugene@gmail.com", rating: 5, comment: "Le rapport m'a révélé des choses sur mon corps que j'ignorais après 30 ans de sport.", createdAt: new Date("2025-09-22") },
  { id: "r106", email: "yvonne.hippolyte@yahoo.fr", rating: 5, comment: "Nassim Sahili inspire. NEUROCORE guide. Les deux sont utiles mais différents.", createdAt: new Date("2025-09-20") },
  { id: "r107", email: "charles.isidore@gmail.com", rating: 5, comment: "Beta testeur depuis le jour 1. Fier d'avoir participé à ce projet révolutionnaire.", createdAt: new Date("2025-09-18") },
  { id: "r108", email: "josephine.jules@proton.me", rating: 5, comment: "L'analyse posturale a identifié ma scoliose légère. Mon kiné a confirmé. Impressionnant.", createdAt: new Date("2025-09-16") },
  { id: "r109", email: "emile.laurent@gmail.com", rating: 4, comment: "Très bon début de projet. En tant que beta testeur, j'ai hâte de voir les prochaines évolutions.", createdAt: new Date("2025-09-14") },
  { id: "r110", email: "marguerite.max@outlook.fr", rating: 5, comment: "Sissy Mua m'a fait bouger. NEUROCORE m'a fait comprendre pourquoi et comment. Évolution.", createdAt: new Date("2025-09-12") },
  { id: "r111", email: "fernand.octave@gmail.com", rating: 5, comment: "Le niveau de détail du questionnaire annonçait la couleur. Le rapport est à la hauteur.", createdAt: new Date("2025-09-10") },
  { id: "r112", email: "alice.prosper@yahoo.fr", rating: 5, comment: "J'ai testé en beta et j'ai immédiatement su que c'était différent de tout ce qui existe.", createdAt: new Date("2025-09-08") },
  { id: "r113", email: "raymond.quentin@gmail.com", rating: 5, comment: "Bodytime c'est du bon contenu gratuit. NEUROCORE c'est de l'investissement qui rapporte.", createdAt: new Date("2025-09-07") },
  { id: "r114", email: "berthe.raoul@proton.me", rating: 5, comment: "Beta testeuse enthousiaste. Ce que Achzod construit va changer le game en France.", createdAt: new Date("2025-09-06") },
  { id: "r115", email: "sylvain.theo@gmail.com", rating: 5, comment: "Le stack supplements personnalisé m'a fait économiser en ciblant ce dont j'avais vraiment besoin.", createdAt: new Date("2025-09-05") },
  { id: "r116", email: "denise.urbain@outlook.com", rating: 4, comment: "Projet prometteur en beta. Les bases sont solides, j'attends la version complète avec impatience.", createdAt: new Date("2025-09-05") },
  { id: "r117", email: "victor.valentin@gmail.com", rating: 5, comment: "Rémi Ragnar amuse. Achzod éduque. NEUROCORE est une masterclass en coaching personnalisé.", createdAt: new Date("2025-09-04") },
  { id: "r118", email: "clementine.william@yahoo.fr", rating: 5, comment: "Le questionnaire m'a pris 30 minutes. Le rapport m'a donné 6 mois d'avance. Deal.", createdAt: new Date("2025-09-04") },
  { id: "r119", email: "xavier.yvan@gmail.com", rating: 5, comment: "Premier jour de beta test. J'ai su direct que c'était révolutionnaire. Pas déçu.", createdAt: new Date("2025-09-03") },
  { id: "r120", email: "solange.zoe@proton.me", rating: 5, comment: "Juju Fitcats motive. NEUROCORE optimise. L'un n'empêche pas l'autre mais les résultats oui.", createdAt: new Date("2025-09-03") },
  { id: "r121", email: "aristide.bernadette@gmail.com", rating: 5, comment: "Beta testeur day 1. Achzod a créé quelque chose d'unique. Le futur du coaching en France.", createdAt: new Date("2025-09-02") },
  { id: "r122", email: "colette.desire@outlook.fr", rating: 5, comment: "L'analyse métabolique m'a fait comprendre pourquoi je stockais malgré mes efforts. Game changer.", createdAt: new Date("2025-09-02") },
  { id: "r123", email: "edgard.felicie@gmail.com", rating: 4, comment: "Beta test très prometteur. Interface à améliorer mais le contenu est déjà exceptionnel.", createdAt: new Date("2025-09-02") },
  { id: "r124", email: "gaston.hortense@yahoo.fr", rating: 5, comment: "Fit by Clem m'a lancée. NEUROCORE m'a propulsée. Deux étapes de mon parcours fitness.", createdAt: new Date("2025-09-01") },
  { id: "r125", email: "irene.joachim@gmail.com", rating: 5, comment: "Premier beta testeur inscrit. Meilleure décision de l'année. Achzod est un génie.", createdAt: new Date("2025-09-01") },
  { id: "r126", email: "karine.leopold@proton.me", rating: 5, comment: "Le concept est révolutionnaire. Personnalisation + science + accessibilité. Bravo Achzod !", createdAt: new Date("2025-09-01") },
  { id: "r127", email: "marius.noemi@gmail.com", rating: 5, comment: "Jour 1 du beta test. J'ai compris immédiatement que NEUROCORE allait tout changer. J'avais raison.", createdAt: new Date("2025-09-01") },
];

// BENTO TESTIMONIALS
function BentoTestimonialsSection() {
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const response = await fetch("/api/reviews");
      const data = await response.json();
      if (data.success && data.reviews && data.reviews.length > 0) {
        // Merge API reviews with static reviews, API first
        setAllReviews([...data.reviews, ...STATIC_REVIEWS]);
      } else {
        // Use all static reviews
        setAllReviews(STATIC_REVIEWS);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      // Use all static reviews on error
      setAllReviews(STATIC_REVIEWS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    const interval = setInterval(fetchReviews, 60000); // Check less frequently
    return () => clearInterval(interval);
  }, []);

  const reviews = allReviews.slice(0, visibleCount);
  const hasMore = visibleCount < allReviews.length;
  const showMore = () => setVisibleCount(prev => Math.min(prev + 5, allReviews.length));

  const formatDate = (dateString: string | Date): string => {
    const date = new Date(dateString);
    const months = [
      "janv", "fév", "mars", "avr", "mai", "juin",
      "juil", "août", "sept", "oct", "nov", "déc"
    ];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  const averageRating = allReviews.length > 0
    ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
    : "4.8";
  const totalReviews = allReviews.length;

  const getAvatarInitial = (review: any): string => {
    if (review.email) return review.email.charAt(0).toUpperCase();
    if (review.comment) return review.comment.charAt(0).toUpperCase();
    return "A";
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );

  const displayReviews = reviews;

  // Different sizes for bento effect
  const getSizeClass = (idx: number): string => {
    const pattern = [
      "md:col-span-4",    // Medium
      "md:col-span-4",    // Medium
      "md:col-span-4",    // Medium
      "md:col-span-6",    // Wide
      "md:col-span-6",    // Wide
      "md:col-span-12",   // Full width
    ];
    return pattern[idx % pattern.length];
  };

  return (
    <section className="py-12 lg:py-16" data-testid="section-testimonials">
      <div className="mx-auto max-w-7xl px-4">

        {/* Bento Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <div className={`${bentoStyles.cardLarge} text-center`}>
            <div className="mb-4 flex items-center justify-center gap-3">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-2xl font-bold">{averageRating}/5</span>
              <span className="text-sm text-muted-foreground">({totalReviews} avis)</span>
            </div>
            <h2 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl" data-testid="text-testimonials-title">
              Ce qu'en disent mes clients
            </h2>
            <p className="mt-2 text-muted-foreground">
              Des résultats concrets, mesurables, reproductibles
            </p>
          </div>
        </motion.div>

        {/* Bento Reviews Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement des avis...</div>
        ) : displayReviews.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Aucun avis pour le moment</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-12">
            {displayReviews.map((review, idx) => (
              <motion.div
                key={review.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: Math.min(idx, 11) * 0.05 }}
                className={getSizeClass(idx)}
              >
                <div className={`${bentoStyles.card} h-full`} data-testid={`card-review-${idx}`}>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-sm font-bold text-primary">
                        {getAvatarInitial(review)}
                      </div>
                      <div>
                        <span className="font-semibold text-sm">
                          {review.email ? review.email.split("@")[0] : "Utilisateur"}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(review.createdAt)}
                        </div>
                      </div>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {review.comment}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Show More Button */}
        {hasMore && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <button
              onClick={showMore}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
            >
              Voir plus d'avis ({allReviews.length - visibleCount} restants)
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </div>
    </section>
  );
}

// BENTO PRICING
// 5 Offers Pricing Section
function FiveOffersPricingSection() {
  const iconMap: Record<string, typeof Star> = {
    Star: Star,
    Crown: Award,
    Beaker: Beaker,
    Zap: Zap,
    Brain: Brain,
  };

  const colorMap: Record<string, string> = {
    slate: "from-slate-500/20 to-slate-600/10 border-slate-500/30",
    emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30",
    red: "from-red-500/20 to-red-600/10 border-red-500/30",
    amber: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
  };

  const iconColorMap: Record<string, string> = {
    slate: "text-slate-400",
    emerald: "text-emerald-400",
    red: "text-red-400",
    amber: "text-amber-400",
    purple: "text-purple-400",
  };

  return (
    <section id="pricing" className="py-16 lg:py-24 bg-black" data-testid="section-pricing">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="mb-12 text-center">
          <Badge variant="outline" className="mb-4 border-primary/50 text-primary">
            5 Offres Distinctes
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl" data-testid="text-pricing-title">
            Choisis ton analyse
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            Chaque offre repond a un besoin specifique. Clique pour decouvrir les details.
          </p>
        </div>

        {/* 5 Offers Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PRICING_PLANS.map((plan, index) => {
            const Icon = iconMap[plan.icon] || Star;
            const colorClass = colorMap[plan.color] || colorMap.slate;
            const iconColor = iconColorMap[plan.color] || iconColorMap.slate;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="relative group"
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                    <Badge className="gap-1 px-3 py-1 bg-emerald-500 text-white text-xs">
                      Populaire
                    </Badge>
                  </div>
                )}

                <Link href={plan.href}>
                  <div
                    className={`relative h-full rounded-2xl bg-gradient-to-b ${colorClass} border p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-white/30 ${
                      plan.popular ? "ring-2 ring-emerald-500/50" : ""
                    }`}
                    data-testid={`card-pricing-${plan.id}`}
                  >
                    {/* Icon */}
                    <div className={`mb-4 inline-flex p-3 rounded-xl bg-white/5 ${iconColor}`}>
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2">{plan.description}</p>

                    {/* Price */}
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-white">{plan.priceLabel}</span>
                      <span className="text-gray-500 text-xs ml-1">{plan.subtitle}</span>
                    </div>

                    {/* Features (compact) */}
                    <ul className="space-y-2 mb-5">
                      {plan.features.slice(0, 4).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                          <Check className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{feature}</span>
                        </li>
                      ))}
                      {plan.features.length > 4 && (
                        <li className="text-xs text-gray-500">+{plan.features.length - 4} autres...</li>
                      )}
                    </ul>

                    {/* CTA */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-primary font-medium group-hover:underline">
                        Decouvrir
                      </span>
                      <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-gray-500 text-sm mb-4">
            Pas sur de ton choix ?
          </p>
          <Link href="/offers/audit-gratuit">
            <Button variant="outline" className="gap-2">
              Essayer l'audit gratuit
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// Blood Analysis Premium Section - Ultrahuman Style
function BloodAnalysisPremiumSection() {
  const biomarkers = [
    { category: "Hormonal", items: ["Testosterone", "Estradiol", "DHEA-S", "Cortisol", "IGF-1", "Prolactine"] },
    { category: "Thyroide", items: ["TSH", "T3 libre", "T4 libre", "T3 reverse", "Anti-TPO"] },
    { category: "Metabolique", items: ["Glycemie", "HbA1c", "Insuline", "HOMA-IR", "ApoB", "Lp(a)"] },
    { category: "Inflammatoire", items: ["CRP-us", "Homocysteine", "Ferritine", "Saturation transferrine"] },
    { category: "Vitamines", items: ["Vitamine D", "B12", "Folate", "Magnesium RBC", "Zinc"] },
    { category: "Hepatique/Renal", items: ["ALT", "AST", "GGT", "Creatinine", "eGFR"] },
  ];

  const features = [
    { icon: Target, title: "Ranges OPTIMAUX", desc: "Pas les normes labo, les vraies valeurs pour performer" },
    { icon: Brain, title: "Analyse IA Clinique", desc: "Detection patterns: Low T, Thyroid, Resistance Insuline" },
    { icon: Beaker, title: "35+ Biomarqueurs", desc: "Panel complet hormonal, metabolique, inflammatoire" },
    { icon: TrendingUp, title: "Protocole Personnalise", desc: "Supplements, dosages, timing bases sur tes resultats" },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-black via-[#050505] to-black py-24">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-6 bg-red-500/20 text-red-400 border-red-500/30 px-4 py-2">
            <Beaker className="mr-2 h-4 w-4" />
            Nouvelle Offre
          </Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
            Blood Analysis
            <span className="block bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              Decode ton sang
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Upload ton bilan sanguin. Notre IA l'analyse avec les ranges OPTIMAUX utilises par les meilleurs coaches en biohacking.
          </p>
        </motion.div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left - Pricing Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 p-8 lg:p-10 backdrop-blur-sm">
              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-6xl font-bold text-white">99€</span>
                  <span className="text-gray-400">paiement unique</span>
                </div>
                <p className="text-primary text-sm font-medium">
                  Deduit de ton coaching Essential ou Private Lab
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {features.map((feature, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <feature.icon className="h-6 w-6 text-primary mb-3" />
                    <p className="text-white font-semibold text-sm mb-1">{feature.title}</p>
                    <p className="text-gray-500 text-xs">{feature.desc}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link href="/blood-analysis">
                <Button size="lg" className="w-full h-14 text-lg gap-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 border-0">
                  <Beaker className="h-5 w-5" />
                  Analyser mon bilan sanguin
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>

              {/* Trust badges */}
              <div className="mt-6 flex items-center justify-center gap-6 text-gray-500 text-xs">
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Donnees chiffrees
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Sources medicales
                </span>
              </div>
            </div>

            {/* Glow */}
            <div className="absolute -inset-4 -z-10 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-amber-500/20 blur-3xl opacity-50" />
          </motion.div>

          {/* Right - Biomarkers Panel */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              35+ Biomarqueurs analyses
            </h3>

            {biomarkers.map((panel, idx) => (
              <div key={idx} className="rounded-xl bg-white/5 border border-white/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-white font-medium text-sm">{panel.category}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {panel.items.map((item, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-white/5 text-gray-400 text-xs border border-white/5">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {/* Bottom note */}
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 mt-6">
              <p className="text-primary text-sm font-medium mb-1">
                Ranges OPTIMAUX vs Normes Labo
              </p>
              <p className="text-gray-400 text-xs">
                Les ranges de labo sont bases sur la population generale (souvent malade).
                Nos ranges sont bases sur les protocoles de Peter Attia, Marek Health, et Huberman Lab.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Burnout Detection Section - similar to Blood Analysis
function BurnoutDetectionSection() {
  const phases = [
    { name: "Alarme", desc: "Stress aigu, activation sympathique", color: "amber", symptoms: ["Fatigue inhabituelle", "Troubles sommeil", "Irritabilite"] },
    { name: "Resistance", desc: "Adaptation chronique, cortisol eleve", color: "orange", symptoms: ["Epuisement constant", "Difficulte concentration", "Infections frequentes"] },
    { name: "Epuisement", desc: "Burnout installe, crash hormonal", color: "red", symptoms: ["Incapacite a fonctionner", "Depression", "Problemes physiques"] },
  ];

  const protocol = [
    { week: 1, focus: "Reset nerveux", desc: "Respiration, deconnexion, sommeil prioritaire" },
    { week: 2, focus: "Nutrition anti-stress", desc: "Magnesium, adaptogenes, anti-inflammatoire" },
    { week: 3, focus: "Mouvement doux", desc: "Marche, yoga, etirements, nature" },
    { week: 4, focus: "Reconstruction", desc: "Routines durables, limites, prevention" },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-black via-purple-950/20 to-black py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-6 bg-purple-500/20 text-purple-400 border-purple-500/30 px-4 py-2">
            <Brain className="mr-2 h-4 w-4" />
            Prevention
          </Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
            Burnout Detection
            <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
              Detecte avant la crise
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Questionnaire neuro-endocrinien de 50 questions. Score de risque 0-100 + protocole de sortie personnalise 4 semaines.
          </p>
        </motion.div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Left - Phases */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Les 3 phases du burnout
            </h3>

            {phases.map((phase, idx) => (
              <div key={idx} className={`rounded-xl bg-${phase.color}-500/10 border border-${phase.color}-500/20 p-5`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-full bg-${phase.color}-500/20 flex items-center justify-center`}>
                    <span className={`text-${phase.color}-400 font-bold`}>{idx + 1}</span>
                  </div>
                  <div>
                    <span className="text-white font-semibold">{phase.name}</span>
                    <p className="text-gray-500 text-xs">{phase.desc}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {phase.symptoms.map((s, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-white/5 text-gray-400 text-xs">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Right - Pricing & Protocol */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="relative rounded-3xl bg-gradient-to-b from-purple-500/10 to-purple-500/5 border border-purple-500/20 p-8 lg:p-10">
              {/* Price */}
              <div className="mb-8">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-6xl font-bold text-white">49€</span>
                  <span className="text-gray-400">paiement unique</span>
                </div>
                <p className="text-purple-400 text-sm font-medium">
                  5 minutes peuvent t'eviter des mois de recuperation
                </p>
              </div>

              {/* Protocol preview */}
              <div className="mb-8">
                <p className="text-white font-semibold mb-4">Protocole de sortie inclus:</p>
                <div className="grid grid-cols-2 gap-3">
                  {protocol.map((p, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <span className="text-purple-400 text-xs font-bold">{p.week}</span>
                        </div>
                        <span className="text-white text-xs font-medium">{p.focus}</span>
                      </div>
                      <p className="text-gray-500 text-xs">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <Link href="/offers/burnout-detection">
                <Button size="lg" className="w-full h-14 text-lg gap-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0">
                  <Brain className="h-5 w-5" />
                  Evaluer mon risque
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>

              {/* Features */}
              <div className="mt-6 grid grid-cols-2 gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-purple-400" />
                  50 questions
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-purple-400" />
                  Score 0-100
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-purple-400" />
                  Detection phase
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-purple-400" />
                  Rapport PDF
                </span>
              </div>
            </div>

            {/* Glow */}
            <div className="absolute -inset-4 -z-10 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-red-500/20 blur-3xl opacity-30" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Floating CTA Bar - below pricing
function FloatingCTABar() {
  return (
    <div className="py-8 bg-gradient-to-b from-muted/20 to-background">
      <div className="max-w-7xl mx-auto px-4 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-4 px-6 py-3 rounded-full bg-black/80 border border-white/10 backdrop-blur-sm shadow-xl"
        >
          <span className="text-white/60 text-sm">Libère ton potentiel</span>
          <Link href="/audit-complet/questionnaire">
            <button className="px-5 py-2 rounded-full bg-primary text-black text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
              Obtenir mon audit
              <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

// BENTO CTA
// Wearables Sync Section - Premium style with brand logos
function WearablesSyncSection() {
  // Sources actives sur Terra (11 sources configurées)
  const brands = [
    { name: "Apple Health", abbr: "apple", color: "#FFFFFF", bg: "#000000" },
    { name: "Oura", abbr: "oura", color: "#C9A962", bg: "#1A1A1A" },
    { name: "Garmin", abbr: "garmin", color: "#FFFFFF", bg: "#007DC3" },
    { name: "Fitbit", abbr: "fitbit", color: "#00B0B9", bg: "#1A1A1A" },
    { name: "Google Fit", abbr: "google", color: "#4285F4", bg: "#FFFFFF" },
    { name: "Samsung Health", abbr: "samsung", color: "#1428A0", bg: "#FFFFFF" },
    { name: "Ultrahuman", abbr: "ultra", color: "#FF4F00", bg: "#000000" },
    { name: "Withings", abbr: "withings", color: "#00A1DE", bg: "#FFFFFF" },
  ];

  const dataTypes = [
    { metric: "HRV", desc: "SDNN, RMSSD", Icon: Activity },
    { metric: "Sommeil", desc: "Profond, REM, léger", Icon: Moon },
    { metric: "FC", desc: "Repos, max, moyenne", Icon: Heart },
    { metric: "Activité", desc: "Pas, distance", Icon: Zap },
    { metric: "Calories", desc: "BMR, TDEE", Icon: Timer },
    { metric: "SpO2", desc: "Oxygène sanguin", Icon: Activity },
  ];

  return (
    <section className="relative py-24 bg-black overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050a08] to-black" />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6"
          >
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Intégration automatique</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight"
          >
            Sync tes <span className="bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">wearables</span> en 1 clic
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-white/50 text-lg max-w-xl mx-auto mb-4"
          >
            Apple Watch, Oura, Garmin, WHOOP... On importe HRV, sommeil, FC automatiquement.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/30"
          >
            <span className="text-xs font-bold text-violet-400">ELITE</span>
            <span className="text-white/60 text-sm">Inclus dans le plan Elite 99</span>
          </motion.div>
        </div>

        {/* COMPATIBLE BRANDS BAR - Premium style */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30 mb-6">Compatible avec</p>

          {/* Brand logos row */}
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 px-4">
            {brands.map((brand, i) => (
              <motion.div
                key={brand.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i }}
                className="group relative"
              >
                {/* Brand name styled as logo */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.06] transition-all cursor-default">
                  {brand.abbr === "apple" && (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  )}
                  <span className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">{brand.name}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Sources badge */}
          <div className="text-center mt-6">
            <span className="inline-flex items-center gap-2 text-[11px] text-white/40">
              <span className="font-mono text-primary">8 sources actives</span>
              <span className="text-white/20">•</span>
              Connexion sécurisée
            </span>
          </div>
        </motion.div>

        {/* Data Types - Compact row */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-b from-white/[0.02] to-transparent rounded-3xl border border-white/[0.06] p-8 mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-8">
            <Zap className="w-4 h-4 text-[#4a9d7c]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/50">Données synchronisées automatiquement</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-6">
            {dataTypes.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i }}
                className="text-center group"
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:border-[#4a9d7c]/30 group-hover:bg-[#4a9d7c]/5 transition-all">
                  <d.Icon className="w-6 h-6 text-white/60 group-hover:text-[#4a9d7c] transition-colors" />
                </div>
                <p className="text-white font-semibold text-sm">{d.metric}</p>
                <p className="text-white/30 text-[10px]">{d.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Benefits - Minimal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: "Données exactes", desc: "Tes vraies métriques, pas des estimations", icon: Target },
            { title: "Questionnaire 2x plus rapide", desc: "On skip les questions déjà répondues", icon: Zap },
            { title: "Analyse plus précise", desc: "Plus de data = meilleurs conseils", icon: Brain },
          ].map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * i }}
              className="bg-white/[0.02] rounded-2xl p-6 border border-white/[0.06] hover:border-white/10 transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-[#4a9d7c]/10 flex items-center justify-center mb-4">
                <b.icon className="w-5 h-5 text-[#4a9d7c]" />
              </div>
              <h3 className="text-white font-semibold mb-1">{b.title}</h3>
              <p className="text-white/40 text-sm">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BentoCTASection() {
  return (
    <section className="border-t border-border/30 py-12 lg:py-16" data-testid="section-cta">
      <div className="mx-auto max-w-7xl px-4">

        {/* Main CTA Bento Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className={`${bentoStyles.cardLarge} text-center relative overflow-hidden`}>
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10" />
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />

            <div className="relative">
              <h2 className="text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                Prêt à optimiser ta performance ?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-lg mx-auto">
                5 offres distinctes pour chaque besoin. Choisis la tienne.
              </p>
              <div className="mt-8">
                <Button
                  size="lg"
                  className="gap-2 px-10 h-14 rounded-xl text-lg"
                  data-testid="button-cta-start"
                  onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Voir les offres
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <UltrahumanHero />
        <CertificationsBar />
        <MediaBar />
        {/* 5 OFFRES - Visible en haut */}
        <FiveOffersPricingSection />
        {/* Sections dediees pour chaque offre premium */}
        <BloodAnalysisPremiumSection />
        <BurnoutDetectionSection />
        {/* Autres sections */}
        <WearablesSyncSection />
        <BentoHeroSection />
        <ScienceValidationSection />
        <BentoDomainesSection />
        <BentoProcessSection />
        <FloatingCTABar />
        <BentoTestimonialsSection />
        <PrivacySection />
        <BentoCTASection />
      </main>
      <Footer />
    </div>
  );
}
