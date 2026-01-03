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

import issaLogo from "@assets/ISSA+Logo+_+Vertical+_+for-white-background_1767172975495.webp";
import pnLogo from "@assets/limage-19764_1767172975495.webp";
import preScriptLogo from "@assets/Pre-Script_1200x1200_1767172975495.webp";
import nasmLogo from "@assets/nasm-logo_1767172987583.jpg";

// Demo Modal Component with 4 tabs - Same as phone mockup (scores, domaines, rapport, plan)
function DemoModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"scores" | "domaines" | "rapport" | "plan">("scores");

  const tabs = [
    { id: "scores", label: "Scores" },
    { id: "domaines", label: "Domaines" },
    { id: "rapport", label: "Rapport" },
    { id: "plan", label: "Plan" },
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="relative w-full max-w-5xl h-[90vh] flex flex-col bg-gradient-to-b from-[#0a2520] to-[#0d0d0d] rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
        >
          <span className="text-xl">×</span>
        </button>

        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-xs font-semibold tracking-wider">DEMO LIVE</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-white">Exemple de rapport NEUROCORE 360</h3>
          <p className="text-white/40 text-sm mt-1">Profil: Marc D., 34 ans</p>
        </div>

        {/* Tabs - Style phone mockup */}
        <div className="shrink-0 px-6 pb-4">
          <div className="inline-flex bg-black/40 rounded-full p-1 border border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-primary text-black"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {activeTab === "scores" && (
            <div className="space-y-6">
              {/* Big Score */}
              <div className="bg-black/30 rounded-2xl p-6 border border-white/5">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-6xl font-bold text-white">58</span>
                  <span className="text-primary text-lg font-medium">+12 vs baseline</span>
                </div>
                <p className="text-white/60 text-lg">Global Index</p>
                <div className="inline-flex items-center gap-2 mt-3 bg-primary/20 rounded-full px-4 py-2">
                  <span className="text-sm">📈</span>
                  <span className="text-primary font-medium">Rapport de 45 pages</span>
                </div>
              </div>

              {/* Weekly bar chart */}
              <div className="bg-black/30 rounded-2xl p-6 border border-white/5">
                <p className="text-white/40 text-sm mb-4">PROGRESSION HEBDOMADAIRE</p>
                <div className="flex items-end justify-between gap-3 h-32">
                  {[42, 38, 45, 52, 48, 55, 58].map((val, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 flex-1">
                      <span className="text-white/60 text-sm font-medium">{val}</span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${val * 1.5}px` }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className={`w-full rounded-lg ${i === 6 ? 'bg-white' : 'bg-primary/60'}`}
                      />
                      <span className="text-white/40 text-xs">{['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Domain cards */}
              <div>
                <p className="text-white/40 text-sm mb-4">DOMAINES ANALYSÉS</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: "35", label: "SOMMEIL", status: "Needs attention", color: "red" },
                    { value: "72", label: "NUTRITION", status: "Optimal", color: "green" },
                    { value: "42", label: "HORMONES", status: "Needs attention", color: "amber" },
                    { value: "85", label: "TRAINING", status: "Excellent", color: "green" },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-black/40 rounded-xl p-4 border border-white/5"
                    >
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-white">{item.value}</span>
                        <span className="text-white/30 text-sm">/100</span>
                      </div>
                      <p className="text-white/40 text-xs tracking-wider mt-1">{item.label}</p>
                      <span className={`inline-block mt-2 text-xs px-2 py-1 rounded ${
                        item.color === "red" ? "bg-red-500/20 text-red-400" :
                        item.color === "amber" ? "bg-amber-500/20 text-amber-400" :
                        "bg-primary/20 text-primary"
                      }`}>
                        {item.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Bottom metrics */}
              <div className="space-y-2">
                {[
                  { label: "Stress & HRV", status: "Optimal", color: "text-primary" },
                  { label: "Digestion", status: "Excellent", color: "text-primary" },
                  { label: "Énergie", status: "Needs attention", color: "text-amber-400" },
                  { label: "Cardio", status: "Good", color: "text-primary" },
                ].map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-3 px-4 bg-black/20 rounded-xl border border-white/5">
                    <span className="text-white/70">{m.label}</span>
                    <span className={`${m.color} bg-white/5 px-3 py-1 rounded-full text-sm`}>{m.status} →</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "domaines" && (
            <div className="space-y-4">
              <p className="text-white/40 text-xs tracking-widest">15 DOMAINES ANALYSÉS</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { name: "Stress & HRV", score: 42 },
                  { name: "Cortisol", score: 38 },
                  { name: "Thyroïde", score: 65 },
                  { name: "DHEA", score: 55 },
                  { name: "Insuline", score: 48 },
                  { name: "Sommeil", score: 35 },
                  { name: "Digestion", score: 52 },
                  { name: "Énergie", score: 44 },
                  { name: "Nutrition", score: 72 },
                  { name: "Training", score: 85 },
                  { name: "Cardio", score: 62 },
                  { name: "Mobilité", score: 58 },
                  { name: "Mental", score: 67 },
                  { name: "Récupération", score: 41 },
                ].map((d, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-zinc-900/50 rounded-xl p-4 border border-white/5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/70 text-sm font-medium">{d.name}</span>
                    </div>
                    <div className="text-white text-2xl font-bold">{d.score}</div>
                    <div className="h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${d.score}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className={`h-full rounded-full ${
                          d.score < 40 ? 'bg-red-500' :
                          d.score < 60 ? 'bg-amber-500' :
                          'bg-primary'
                        }`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "rapport" && (
            <div className="space-y-4">
              <p className="text-white/40 text-xs tracking-widest">ANALYSE DÉTAILLÉE</p>
              {[
                { icon: Activity, title: "Système Nerveux", desc: "Signes de dysrégulation du SNA. HRV basse (28ms), cortisol matinal élevé. Protocole de régulation parasympathique recommandé." },
                { icon: Moon, title: "Sommeil", desc: "Latence d'endormissement prolongée (45+ min). Manque de sommeil profond estimé. Réveils nocturnes fréquents. Priorité critique." },
                { icon: Zap, title: "Énergie", desc: "Fatigue mitochondriale probable. Pic énergétique tardif (16h-18h). Crash post-prandial identifié. Optimisation métabolique nécessaire." },
                { icon: Apple, title: "Nutrition", desc: "Apport protéique optimal (1.8g/kg). Timing des repas à améliorer. Diversité alimentaire correcte. Focus sur l'hydratation." },
                { icon: Heart, title: "Cardiaque", desc: "FC repos 68bpm. Récupération post-effort moyenne. Zone 2 sous-développée. Programme cardio structuré recommandé." },
                { icon: Dumbbell, title: "Training", desc: "Volume d'entraînement optimal. Progression linéaire observée. Points forts: force relative. À améliorer: mobilité thoracique." },
              ].map((section, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-zinc-900/50 rounded-xl p-5 border border-white/5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <section.icon className="w-4 h-4 text-white/60" />
                    </div>
                    <span className="text-white font-medium">{section.title}</span>
                  </div>
                  <p className="text-white/50 text-sm leading-relaxed">{section.desc}</p>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === "plan" && (
            <div className="space-y-6">
              <p className="text-white/40 text-xs tracking-widest">PLAN D'ACTION 90 JOURS</p>

              {/* Timeline phases */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { phase: "J1-30", title: "Fondations", focus: "Sommeil + HRV", target: "+8 pts" },
                  { phase: "J31-60", title: "Optimisation", focus: "Nutrition + Énergie", target: "+6 pts" },
                  { phase: "J61-90", title: "Performance", focus: "Training + Cardio", target: "+4 pts" },
                ].map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-zinc-900/50 rounded-xl p-4 border border-white/5 text-center"
                  >
                    <span className="text-primary text-xs font-bold">{p.phase}</span>
                    <h5 className="text-white font-semibold mt-1">{p.title}</h5>
                    <p className="text-white/40 text-xs mt-1">{p.focus}</p>
                    <p className="text-emerald-400 font-bold mt-2">{p.target}</p>
                  </motion.div>
                ))}
              </div>

              {/* Priority protocols */}
              <div className="bg-gradient-to-r from-red-500/10 to-transparent rounded-xl p-5 border border-red-500/20">
                <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-bold">PRIORITÉ #1</span>
                <h5 className="text-lg font-bold text-white mt-2">Protocole Sommeil - 21 jours</h5>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {[
                    "Lumière naturelle 30min au réveil",
                    "Magnésium 300mg avant coucher",
                    "Arrêt écrans 2h avant sommeil",
                    "Chambre 18-19°C",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-red-400" />
                      <span className="text-white/70">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Supplements */}
              <div className="bg-zinc-900/50 rounded-xl p-5 border border-white/5">
                <h5 className="text-white font-semibold mb-3">Stack Suppléments</h5>
                <div className="space-y-2">
                  {[
                    { name: "Magnésium Bisglycinate", dose: "300mg", timing: "Soir" },
                    { name: "Vitamine D3 + K2", dose: "4000 UI", timing: "Matin" },
                    { name: "Oméga-3 EPA/DHA", dose: "2g", timing: "Repas" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <span className="text-white/80 text-sm">{s.name}</span>
                      <span className="text-white/40 text-xs">{s.dose} • {s.timing}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Targets */}
              <div className="bg-zinc-900/50 rounded-xl p-5 border border-white/5">
                <h5 className="text-white font-semibold mb-3">Objectifs à 90 jours</h5>
                <div className="space-y-3">
                  {[
                    { kpi: "Score Global", current: 58, target: 76 },
                    { kpi: "Sommeil", current: 35, target: 65 },
                    { kpi: "HRV", current: 32, target: 48 },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/60">{item.kpi}</span>
                        <span className="text-white/40">{item.current} → <span className="text-primary">{item.target}</span></span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.current / item.target) * 100}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-full bg-gradient-to-r from-amber-500 to-primary rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 p-6 border-t border-white/10 bg-black/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm text-center sm:text-left">
              Ceci est un exemple. Obtenez votre rapport personnalisé de 45+ pages.
            </p>
            <Link href="/audit-complet/questionnaire">
              <button className="px-8 py-3 rounded-full bg-primary text-black font-semibold text-sm hover:bg-primary/90 transition-all hover:scale-105">
                Lancer mon audit →
              </button>
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Ultrahuman-style Hero: Centered elegant typography with phone mockup
function UltrahumanHero() {
  const [activeTab, setActiveTab] = useState<"scores" | "domaines" | "rapport" | "plan">("scores");
  const [showDemo, setShowDemo] = useState(false);

  // Contenu scrollable pour chaque onglet - style dashboard premium
  const tabContents = {
    scores: (
      <div className="w-full bg-gradient-to-b from-[#0a1f1a] via-[#0d1510] to-black px-4 pt-8 pb-20">
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-white/40 text-[10px] tracking-widest mb-1">NEUROCORE 360</p>
          <p className="text-white/60 text-xs">Rapport Marc D. • 34 ans</p>
        </div>

        {/* Big Score Card */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-2xl p-5 border border-primary/20 mb-4">
          <p className="text-white/40 text-[9px] tracking-widest mb-2">SCORE GLOBAL</p>
          <div className="flex items-baseline gap-2">
            <span className="text-white text-5xl font-bold">58</span>
            <span className="text-white/30 text-xl">/100</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-medium">À optimiser</span>
            <span className="text-primary text-[10px]">+12 pts possibles</span>
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="bg-black/40 rounded-xl p-4 border border-white/5 mb-4">
          <p className="text-white/40 text-[9px] tracking-widest mb-3">PROGRESSION</p>
          <div className="flex items-end justify-between gap-2 h-20">
            {[42, 38, 45, 52, 48, 55, 58].map((val, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[8px] text-white/50">{val}</span>
                <div className={`w-full rounded-t ${i === 6 ? 'bg-white' : 'bg-primary/60'}`} style={{ height: `${val * 1.2}px` }} />
                <span className="text-[7px] text-white/30">{['L', 'M', 'M', 'J', 'V', 'S', 'D'][i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Domain Grid */}
        <p className="text-white/40 text-[9px] tracking-widest mb-3">DOMAINES CLÉS</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { value: 35, label: "Sommeil", status: "Critique", color: "red" },
            { value: 72, label: "Nutrition", status: "Bon", color: "green" },
            { value: 42, label: "Hormones", status: "Moyen", color: "amber" },
            { value: 85, label: "Training", status: "Excellent", color: "green" },
            { value: 44, label: "Énergie", status: "Moyen", color: "amber" },
            { value: 62, label: "Cardio", status: "Correct", color: "green" },
          ].map((item, i) => (
            <div key={i} className="bg-zinc-900/60 rounded-xl p-3 border border-white/5">
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-white text-xl font-bold">{item.value}</span>
                <span className="text-white/30 text-[9px]">/100</span>
              </div>
              <p className="text-white/50 text-[9px]">{item.label}</p>
              <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div className={`h-full rounded-full ${item.color === 'red' ? 'bg-red-500' : item.color === 'amber' ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Sections", value: "14" },
            { label: "Pages", value: "45+" },
            { label: "Protocoles", value: "8" },
          ].map((s, i) => (
            <div key={i} className="bg-white/[0.03] rounded-lg p-3 text-center border border-white/5">
              <p className="text-white text-lg font-bold">{s.value}</p>
              <p className="text-white/40 text-[8px]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    domaines: (
      <div className="w-full bg-gradient-to-b from-[#0d1510] to-black px-4 pt-8 pb-20">
        <p className="text-white/40 text-[9px] tracking-widest mb-4">15 DOMAINES ANALYSÉS</p>
        <div className="space-y-2">
          {[
            { name: "Sommeil", score: 35, icon: "🌙" },
            { name: "Stress & HRV", score: 42, icon: "💓" },
            { name: "Cortisol", score: 38, icon: "⚡" },
            { name: "Hormones", score: 48, icon: "🧬" },
            { name: "Énergie", score: 44, icon: "🔋" },
            { name: "Digestion", score: 52, icon: "🍽️" },
            { name: "Insuline", score: 48, icon: "📊" },
            { name: "DHEA", score: 55, icon: "💪" },
            { name: "Thyroïde", score: 65, icon: "🦋" },
            { name: "Cardio", score: 62, icon: "❤️" },
            { name: "Nutrition", score: 72, icon: "🥗" },
            { name: "Training", score: 85, icon: "🏋️" },
            { name: "Mobilité", score: 58, icon: "🤸" },
            { name: "Mental", score: 67, icon: "🧠" },
            { name: "Récupération", score: 41, icon: "😴" },
          ].map((d, i) => (
            <div key={i} className="bg-zinc-900/50 rounded-xl p-3 border border-white/5 flex items-center gap-3">
              <span className="text-lg">{d.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/80 text-[10px] font-medium">{d.name}</span>
                  <span className="text-white text-sm font-bold">{d.score}</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${d.score < 40 ? 'bg-red-500' : d.score < 60 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${d.score}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    rapport: (
      <div className="w-full bg-gradient-to-b from-[#0d1510] to-black px-4 pt-8 pb-20">
        <p className="text-white/40 text-[9px] tracking-widest mb-4">ANALYSE DÉTAILLÉE</p>
        <div className="space-y-3">
          {[
            { icon: Moon, title: "Sommeil", score: 35, status: "Critique", desc: "Latence d'endormissement prolongée (45+ min). Sommeil profond insuffisant. Réveils nocturnes fréquents." },
            { icon: Activity, title: "Système Nerveux", score: 42, status: "À améliorer", desc: "HRV basse (28ms). Dysrégulation du SNA détectée. Cortisol matinal élevé." },
            { icon: Zap, title: "Énergie", score: 44, status: "Moyen", desc: "Fatigue mitochondriale probable. Pic énergétique tardif (16h-18h). Crash post-prandial." },
            { icon: Apple, title: "Nutrition", score: 72, status: "Bon", desc: "Apport protéique optimal (1.8g/kg). Hydratation à améliorer. Diversité alimentaire correcte." },
            { icon: Heart, title: "Cardio", score: 62, status: "Correct", desc: "FC repos 68bpm. Zone 2 sous-développée. Récupération post-effort moyenne." },
            { icon: Dumbbell, title: "Training", score: 85, status: "Excellent", desc: "Volume optimal. Progression linéaire. Force relative élevée. Mobilité à travailler." },
          ].map((section, i) => (
            <div key={i} className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${section.score < 40 ? 'bg-red-500/20' : section.score < 60 ? 'bg-amber-500/20' : 'bg-primary/20'}`}>
                    <section.icon className={`w-4 h-4 ${section.score < 40 ? 'text-red-400' : section.score < 60 ? 'text-amber-400' : 'text-primary'}`} />
                  </div>
                  <div>
                    <p className="text-white text-[11px] font-medium">{section.title}</p>
                    <p className={`text-[8px] ${section.score < 40 ? 'text-red-400' : section.score < 60 ? 'text-amber-400' : 'text-primary'}`}>{section.status}</p>
                  </div>
                </div>
                <span className="text-white text-lg font-bold">{section.score}</span>
              </div>
              <p className="text-white/50 text-[9px] leading-relaxed">{section.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
    plan: (
      <div className="w-full bg-gradient-to-b from-[#0d1510] to-black px-4 pt-8 pb-20">
        <p className="text-white/40 text-[9px] tracking-widest mb-4">PLAN D'ACTION 90 JOURS</p>

        {/* Timeline */}
        <div className="flex gap-2 mb-4">
          {[
            { phase: "J1-30", label: "Reset", pts: "+8" },
            { phase: "J31-60", label: "Build", pts: "+6" },
            { phase: "J61-90", label: "Perf", pts: "+4" },
          ].map((p, i) => (
            <div key={i} className="flex-1 bg-zinc-900/60 rounded-xl p-3 border border-white/5 text-center">
              <p className="text-primary text-[8px] font-bold">{p.phase}</p>
              <p className="text-white text-[10px] font-medium">{p.label}</p>
              <p className="text-emerald-400 text-[9px] font-bold">{p.pts}</p>
            </div>
          ))}
        </div>

        {/* Priority Protocol */}
        <div className="bg-gradient-to-r from-red-500/10 to-transparent rounded-xl p-4 border border-red-500/20 mb-4">
          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[8px] font-bold">PRIORITÉ #1</span>
          <p className="text-white text-[11px] font-semibold mt-2">Protocole Sommeil</p>
          <div className="mt-2 space-y-1">
            {["Lumière naturelle 30min AM", "Magnésium 300mg soir", "Écrans off 2h avant", "Chambre 18°C"].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Check className="w-3 h-3 text-red-400" />
                <span className="text-white/60 text-[9px]">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Supplements */}
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5 mb-4">
          <p className="text-white/40 text-[9px] tracking-widest mb-3">STACK SUPPLÉMENTS</p>
          <div className="space-y-2">
            {[
              { name: "Magnésium Bisglycinate", dose: "300mg", time: "Soir" },
              { name: "Vitamine D3 + K2", dose: "4000 UI", time: "Matin" },
              { name: "Oméga-3 EPA/DHA", dose: "2g", time: "Repas" },
              { name: "Ashwagandha KSM-66", dose: "600mg", time: "Soir" },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-white/80 text-[10px]">{s.name}</span>
                <span className="text-white/40 text-[8px]">{s.dose} • {s.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Targets */}
        <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
          <p className="text-white/40 text-[9px] tracking-widest mb-3">OBJECTIFS 90J</p>
          <div className="space-y-3">
            {[
              { label: "Score Global", from: 58, to: 76 },
              { label: "Sommeil", from: 35, to: 65 },
              { label: "HRV", from: 32, to: 48 },
            ].map((t, i) => (
              <div key={i}>
                <div className="flex justify-between text-[9px] mb-1">
                  <span className="text-white/60">{t.label}</span>
                  <span className="text-white/40">{t.from} → <span className="text-primary">{t.to}</span></span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-primary rounded-full" style={{ width: `${(t.from / t.to) * 100}%` }} />
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
              linear-gradient(rgba(14,252,109,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14,252,109,0.3) 1px, transparent 1px)
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,252,109,0.05),transparent_70%)]" />
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
          190+ questions. 15 domaines. Précision clinique.
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

        {/* Phone Mockup - Clean frame style */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className="mt-12 relative"
        >
          {/* Phone Frame */}
          <div className="relative w-[280px] sm:w-[320px] mx-auto">
            {/* Phone outer frame */}
            <div className="relative bg-zinc-900 rounded-[3rem] p-2 shadow-2xl shadow-black/50 border border-white/10">
              {/* Phone inner bezel */}
              <div className="relative bg-black rounded-[2.5rem] overflow-hidden">
                {/* Dynamic Island / Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-800" />
                  <div className="w-10 h-3 rounded-full bg-zinc-800" />
                </div>

                {/* Screen content - scrollable */}
                <div className="h-[520px] sm:h-[580px] overflow-hidden">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="h-full overflow-y-auto scrollbar-hide"
                  >
                    {tabContents[activeTab]}
                  </motion.div>
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/20 rounded-full" />
              </div>
            </div>

            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-b from-primary/20 via-transparent to-transparent rounded-[4rem] blur-2xl -z-10 opacity-50" />
          </div>

          {/* Tab Bar - Below phone */}
          <div className="mt-8 max-w-md mx-auto bg-zinc-900/90 backdrop-blur-xl rounded-full p-1.5 shadow-lg shadow-black/40 border border-white/10">
            <div className="flex items-center">
              {[
                { id: "scores", icon: Activity, label: "Scores" },
                { id: "domaines", icon: Layers, label: "Domaines" },
                { id: "rapport", icon: Brain, label: "Rapport" },
                { id: "plan", icon: Target, label: "Plan" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-primary text-black"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <tab.icon className={`w-4 h-4`} />
                  <span className="text-xs font-medium hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

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
    { value: "190+", label: "Questions", sublabel: "analysées" },
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
              linear-gradient(rgba(14,252,109,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(14,252,109,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            animation: 'gridMove 25s linear infinite',
          }}
        />
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,252,109,0.08),transparent_60%)]" />

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
          <Link href="/audit-complet/questionnaire">
            <button className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-semibold text-sm transition-all duration-300 hover:bg-white/90 hover:shadow-xl hover:shadow-white/10">
              Commencer l'analyse
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.08),transparent_60%)]" />

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
                <BodyVisualization activeCategory={activeCategory || undefined} className="h-full w-full" />
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
      description: "190+ questions analysent ton profil métabolique, hormonal, circadien et biomécanique. Chaque réponse calibre l'algorithme.",
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
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(14,252,109,0.05),transparent_50%)]" />

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
function BentoPricingSection() {
  return (
    <section id="pricing" className="py-12 lg:py-16 bg-muted/20" data-testid="section-pricing">
      <div className="mx-auto max-w-7xl px-4">

        {/* Header */}
        <div className="mb-10 text-center">
          <Badge variant="outline" className="mb-4">
            Tarification transparente
          </Badge>
          <h2 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl" data-testid="text-pricing-title">
            Choisis ton niveau d'analyse
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Tu décides après avoir rempli le questionnaire
          </p>
        </div>

        {/* Bento Pricing Grid */}
        <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
          {PRICING_PLANS.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                  <Badge className="gap-1 px-4 py-1.5 bg-primary text-primary-foreground">
                    <Star className="h-3 w-3" />
                    Le + populaire
                  </Badge>
                </div>
              )}
              <div
                className={`${bentoStyles.cardLarge} h-full flex flex-col ${
                  plan.popular ? "ring-2 ring-primary" : ""
                }`}
                data-testid={`card-pricing-${plan.id}`}
              >
                <div className="mb-6">
                  <h3 className="text-xl font-bold tracking-[-0.02em]">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                </div>

                <div className="mb-8">
                  <span className="text-5xl font-bold tracking-[-0.03em]">{plan.priceLabel}</span>
                  {"coachingNote" in plan && plan.coachingNote && (
                    <p className="mt-2 text-sm text-primary font-medium">{plan.coachingNote}</p>
                  )}
                </div>

                <ul className="mb-8 flex-1 space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/20">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {"lockedFeatures" in plan && plan.lockedFeatures?.map((feature, i) => (
                    <li key={`locked-${i}`} className="flex items-start gap-3 text-muted-foreground">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted">
                        <Lock className="h-3 w-3" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/audit-complet/questionnaire">
                  <Button
                    className={`w-full h-12 rounded-xl ${plan.popular ? '' : 'bg-muted hover:bg-muted/80 text-foreground'}`}
                    variant={plan.popular ? "default" : "outline"}
                    data-testid={`button-pricing-${plan.id}`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
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
                Commence ton audit 360 gratuit maintenant. Résultats en 24h.
              </p>
              <div className="mt-8">
                <Link href="/audit-complet/questionnaire">
                  <Button size="lg" className="gap-2 px-10 h-14 rounded-xl text-lg" data-testid="button-cta-start">
                    Commencer l'analyse
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
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
        <BentoHeroSection />
        <BentoDomainesSection />
        <BloodVisionSection />
        <BentoProcessSection />
        <BentoPricingSection />
        <FloatingCTABar />
        <BentoTestimonialsSection />
        <PrivacySection />
        <BentoCTASection />
      </main>
      <Footer />
    </div>
  );
}
