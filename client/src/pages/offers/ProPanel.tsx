/**
 * NEUROCORE 360 - Ultimate Scan Offer Page
 * Ultrahuman-style premium sales page - 149€
 */

import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  Zap,
  ArrowRight,
  Check,
  Watch,
  Activity,
  Heart,
  Bone,
  Brain,
  Crown,
  Target,
  Pill,
  ChevronDown,
  Lock,
  Shield,
  Clock,
  Sparkles,
  TrendingUp,
  BarChart3,
  Moon,
  Dumbbell,
  AlertCircle,
} from "lucide-react";

// Wearables supported
const wearables = [
  { name: "Apple Health", logo: "🍎", color: "#000000", bgColor: "rgba(0,0,0,0.1)" },
  { name: "Oura Ring", logo: "💍", color: "#C9A962", bgColor: "rgba(201,169,98,0.1)" },
  { name: "Whoop", logo: "⌚", color: "#00A86B", bgColor: "rgba(0,168,107,0.1)" },
  { name: "Garmin", logo: "⌚", color: "#007DC3", bgColor: "rgba(0,125,195,0.1)" },
  { name: "Fitbit", logo: "⌚", color: "#00B0B9", bgColor: "rgba(0,176,185,0.1)" },
  { name: "WHOOP", logo: "⌚", color: "#00A86B", bgColor: "rgba(0,168,107,0.1)" },
  { name: "Ultrahuman", logo: "💫", color: "#FF4F00", bgColor: "rgba(255,79,0,0.1)" },
  { name: "Polar", logo: "❄️", color: "#D40029", bgColor: "rgba(212,0,41,0.1)" },
];

// Ultimate Scan exclusive features
const proExclusives = [
  {
    icon: Watch,
    title: "Sync Wearables Automatique",
    description: "Connecte Oura, Whoop, Garmin, Apple Health via Terra. Tes donnees sont importees automatiquement.",
    color: "cyan",
  },
  {
    icon: Activity,
    title: "Analyse HRV Avancee",
    description: "SDNN, RMSSD, coherence cardiaque, variabilite nocturne. Comprends ta recuperation en profondeur.",
    color: "red",
  },
  {
    icon: Moon,
    title: "Sommeil Detaille",
    description: "Phases REM, profond, leger. Latence d'endormissement, reveils nocturnes, efficiency score.",
    color: "indigo",
  },
  {
    icon: Bone,
    title: "Blessures & Douleurs",
    description: "15 questions sur tes douleurs chroniques, mobilite articulaire, historique de blessures.",
    color: "orange",
  },
  {
    icon: Dumbbell,
    title: "Protocole Rehabilitation",
    description: "Exercices correctifs personnalises pour tes desequilibres musculaires et posturaux.",
    color: "cyan",
  },
  {
    icon: TrendingUp,
    title: "Suivi Evolution",
    description: "Compare tes scans dans le temps. Visualise tes progres mois apres mois.",
    color: "emerald",
  },
];

// What's included (Anabolic Bioscan + Ultimate extras)
const includedFeatures = [
  "Tout l'Anabolic Bioscan (15 domaines)",
  "Questionnaire 180+ questions",
  "Profil hormonal estime",
  "Profil neurotransmetteurs",
  "Protocole nutrition",
  "Stack supplements",
  "Feuille de route 90 jours",
  "--- Exclusifs Ultimate Scan ---",
  "Sync wearables (Oura, Whoop, Garmin...)",
  "Analyse VFC avancee (RMSSD, SDNN)",
  "Donnees sommeil automatiques",
  "Questions blessures & douleurs",
  "Protocole rehabilitation",
  "Analyse mobilite articulaire",
  "Suivi evolution dans le temps",
  "Acces coach prioritaire",
];

// FAQ items
const faqItems = [
  {
    question: "Quels wearables sont compatibles ?",
    answer:
      "Nous supportons via Terra : Apple Health, Oura Ring, Whoop, Garmin, Fitbit, Ultrahuman Ring, Polar, Samsung Health, et plus. La connexion prend 30 secondes et tes donnees sont synchronisees automatiquement.",
  },
  {
    question: "Quelle est la difference avec l'Anabolic Bioscan ?",
    answer:
      "L'Anabolic Bioscan (79€) couvre les 15 domaines via questionnaire. L'Ultimate Scan (149€) ajoute : sync wearables avec donnees reelles (HRV, sommeil), analyse blessures/douleurs, protocole rehabilitation, et suivi evolution. C'est pour ceux qui veulent le maximum de precision.",
  },
  {
    question: "Je n'ai pas de wearable, ca vaut le coup ?",
    answer:
      "Si tu n'as pas de wearable, l'Anabolic Bioscan (79€) est probablement suffisant. L'Ultimate Scan tire sa valeur de l'integration des donnees objectives de tes appareils. Sans wearable, tu beneficies quand meme de l'analyse blessures et du protocole rehab.",
  },
  {
    question: "Mes donnees wearables sont-elles securisees ?",
    answer:
      "Oui, nous utilisons Terra (terraapi.com) pour la connexion securisee. Tes donnees sont cryptees, jamais revendues, et tu peux deconnecter ton appareil a tout moment. Nous sommes conformes RGPD.",
  },
  {
    question: "Quelles metriques HRV analysez-vous ?",
    answer:
      "Nous analysons : SDNN (variabilite globale), RMSSD (activite parasympathique), HRV nocturne moyenne, coherence cardiaque, tendance sur 7/30 jours. Ces metriques revelent ta capacite de recuperation et ton niveau de stress chronique.",
  },
  {
    question: "Le protocole rehabilitation est-il adapte a mes blessures ?",
    answer:
      "Oui, le questionnaire blessures couvre 15+ zones (epaule, genou, dos, hanche...) avec historique et niveau de douleur actuel. Le protocole genere des exercices correctifs specifiques a tes desequilibres identifies.",
  },
  {
    question: "Les 149€ sont-ils deduits du coaching ?",
    answer:
      "Oui ! Si tu prends un coaching Private Lab dans les 30 jours, les 149€ sont integralement deduits. Le Ultimate Scan devient gratuit retroactivement.",
  },
  {
    question: "Puis-je upgrader depuis l'Anabolic Bioscan ?",
    answer:
      "Oui, si tu as deja fait l'Anabolic Bioscan, tu peux upgrader vers Ultimate Scan pour 70€ (difference de prix). Contacte-nous avec ton email pour activer l'upgrade.",
  },
  {
    question: "Pour qui est l'Ultimate Scan ?",
    answer:
      "Athletes serieux, biohackers avances, personnes avec blessures chroniques, ceux qui utilisent deja des wearables et veulent une analyse expert de leurs donnees. Si tu veux juste un apercu, commence par l'Anabolic Bioscan.",
  },
  {
    question: "Combien de temps pour recevoir mon rapport ?",
    answer:
      "Le rapport est genere en moins de 5 minutes apres completion du questionnaire. Si tu connectes un wearable, nous importons tes 30 derniers jours de donnees instantanement via Terra.",
  },
];

// FAQ Accordion component
function FAQAccordion({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: (typeof faqItems)[0];
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="border-b border-border/30"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left hover:text-primary transition-colors"
      >
        <span className="font-medium pr-4">{item.question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="shrink-0"
        >
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="pb-5 text-muted-foreground leading-relaxed">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ProPanel() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero Section - Blue Neural Network Style */}
        <section className="relative overflow-hidden bg-gradient-to-b from-blue-950 via-purple-950/50 to-black py-20 lg:py-32">
          {/* Main gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-800/20 via-purple-900/20 to-transparent" />

          {/* Neural network lines */}
          <div className="absolute inset-0 overflow-hidden">
            <svg className="absolute inset-0 w-full h-full">
              <defs>
                <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(59,130,246,0.3)" />
                  <stop offset="100%" stopColor="rgba(147,51,234,0.3)" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {/* Neural connections */}
              <g filter="url(#glow)" opacity="0.4">
                <line x1="10%" y1="20%" x2="30%" y2="40%" stroke="url(#neuralGradient)" strokeWidth="1" />
                <line x1="30%" y1="40%" x2="50%" y2="30%" stroke="url(#neuralGradient)" strokeWidth="1" />
                <line x1="50%" y1="30%" x2="70%" y2="50%" stroke="url(#neuralGradient)" strokeWidth="1" />
                <line x1="70%" y1="50%" x2="90%" y2="35%" stroke="url(#neuralGradient)" strokeWidth="1" />
                <line x1="20%" y1="60%" x2="40%" y2="70%" stroke="url(#neuralGradient)" strokeWidth="1" />
                <line x1="40%" y1="70%" x2="60%" y2="60%" stroke="url(#neuralGradient)" strokeWidth="1" />
                <line x1="60%" y1="60%" x2="80%" y2="75%" stroke="url(#neuralGradient)" strokeWidth="1" />
                <line x1="30%" y1="40%" x2="40%" y2="70%" stroke="url(#neuralGradient)" strokeWidth="0.5" />
                <line x1="50%" y1="30%" x2="60%" y2="60%" stroke="url(#neuralGradient)" strokeWidth="0.5" />
              </g>
            </svg>

            {/* Neural nodes with glow */}
            {[
              { x: '30%', y: '40%', size: 8 },
              { x: '50%', y: '30%', size: 12 },
              { x: '70%', y: '50%', size: 8 },
              { x: '40%', y: '70%', size: 6 },
              { x: '60%', y: '60%', size: 10 },
            ].map((node, i) => (
              <motion.div
                key={`node-${i}`}
                className="absolute rounded-full bg-cyan-400"
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.size,
                  height: node.size,
                  boxShadow: `0 0 ${node.size * 3}px rgba(34,211,238,0.6)`,
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 2 + Math.random(),
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "easeInOut",
                }}
              />
            ))}

            {/* Center icon glow - sleep/bed icon like in image */}
            <motion.div
              className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)',
                boxShadow: '0 0 40px rgba(59,130,246,0.3)',
              }}
              animate={{
                opacity: [0.4, 0.7, 0.4],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Moon className="w-8 h-8 text-cyan-400/60" />
            </motion.div>
          </div>

          <div className="relative mx-auto max-w-6xl px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left - Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Badge className="mb-6 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                  <Zap className="mr-2 h-3 w-3" />
                  Elite
                </Badge>

                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl mb-6">
                  Ultimate Scan.
                  <span className="block text-cyan-400 mt-2">
                    Donnees reelles. Precision maximale.
                  </span>
                </h1>

                <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                  Tout l'Anabolic Bioscan + sync wearables + analyse blessures.
                  Pour ceux qui veulent exploiter leurs donnees au maximum.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/audit-complet/questionnaire?tier=elite">
                    <Button
                      size="lg"
                      className="gap-2 h-14 px-8 text-lg bg-cyan-500 hover:bg-cyan-600 text-black w-full sm:w-auto"
                    >
                      <Zap className="h-5 w-5" />
                      Lancer mon Ultimate Scan
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>

                <p className="mt-6 text-sm text-cyan-400">
                  Deduit de ton coaching Private Lab
                </p>
              </motion.div>

              {/* Right - Wearables Mockup style Ultrahuman */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <div className="relative mx-auto w-[320px] sm:w-[380px]">
                  {/* Phone mockup container */}
                  <div className="relative bg-gradient-to-b from-emerald-950 to-black rounded-[2.5rem] p-4 shadow-2xl border border-gray-800">
                    {/* Screen content */}
                    <div className="bg-gradient-to-b from-emerald-900/40 to-black rounded-2xl overflow-hidden">
                      {/* Header */}
                      <div className="px-4 pt-4 pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-4xl font-bold text-white">85</p>
                            <p className="text-lg text-emerald-400">Recuperation</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Lun, 4 Jan</p>
                            <div className="flex items-center gap-1 mt-1">
                              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-xs text-gray-400">Oura sync</span>
                            </div>
                          </div>
                        </div>

                        {/* Weekly bars */}
                        <div className="flex items-end justify-center gap-1 mt-4 h-16">
                          {[72, 68, 65, 78, 82, 85].map((score, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                              <div
                                className={`w-6 rounded-t ${i === 5 ? 'bg-white' : 'bg-gray-600'}`}
                                style={{ height: `${score * 0.6}px` }}
                              />
                              <span className="text-[9px] text-gray-500">
                                {['M', 'M', 'J', 'V', 'S', 'D'][i]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Contributors section */}
                      <div className="px-4 py-3">
                        <p className="text-xs text-gray-500 mb-3">Contributeurs</p>

                        {/* Metrics grid */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* FC au repos */}
                          <div className="bg-gray-900/60 rounded-xl p-3">
                            <p className="text-[10px] text-gray-500">FC au Repos</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-bold text-white">48</span>
                              <span className="text-xs text-gray-500">BPM</span>
                            </div>
                            <span className="text-[10px] text-emerald-400">Optimal</span>
                          </div>

                          {/* Sommeil */}
                          <div className="bg-gray-900/60 rounded-xl p-3">
                            <p className="text-[10px] text-gray-500">Indice Sommeil</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-bold text-white">82</span>
                              <span className="text-xs text-gray-500">/100</span>
                            </div>
                            <span className="text-[10px] text-emerald-400">Excellent</span>
                          </div>

                          {/* VFC 7j */}
                          <div className="bg-gray-900/60 rounded-xl p-3">
                            <p className="text-[10px] text-gray-500">VFC 7 jours</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-bold text-white">52</span>
                              <span className="text-xs text-gray-500">ms</span>
                            </div>
                            <span className="text-[10px] text-amber-400">A surveiller</span>
                          </div>

                          {/* VFC nuit */}
                          <div className="bg-gray-900/60 rounded-xl p-3">
                            <p className="text-[10px] text-gray-500">VFC Nuit</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-bold text-white">56</span>
                              <span className="text-xs text-gray-500">ms</span>
                            </div>
                            <span className="text-[10px] text-emerald-400">Optimal</span>
                          </div>
                        </div>

                        {/* Additional metrics */}
                        <div className="mt-2 space-y-2">
                          <div className="bg-gray-900/60 rounded-xl p-3 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-gray-500">Sommeil Total</p>
                              <span className="text-lg font-bold text-white">7h 31m</span>
                            </div>
                            <span className="text-[10px] text-emerald-400 px-2 py-0.5 bg-emerald-500/10 rounded-full">Excellent</span>
                          </div>
                          <div className="bg-gray-900/60 rounded-xl p-3 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] text-gray-500">Sommeil Reparateur</p>
                              <span className="text-lg font-bold text-white">31%</span>
                            </div>
                            <span className="text-[10px] text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded-full">A surveiller</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Glow */}
                  <div className="absolute -inset-4 bg-cyan-500/20 blur-3xl rounded-full -z-10" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Wearables Banner */}
        <section className="py-8 border-b border-border/30 bg-black/50">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Watch className="h-5 w-5 text-cyan-400" />
              <span className="text-sm text-muted-foreground">Compatible avec</span>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {wearables.slice(0, 6).map((w, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="px-4 py-2 rounded-full border bg-white/5 flex items-center gap-2"
                  style={{ borderColor: w.color + "30" }}
                >
                  <span>{w.logo}</span>
                  <span className="text-sm font-medium" style={{ color: w.color }}>
                    {w.name}
                  </span>
                </motion.div>
              ))}
              <div className="px-4 py-2 rounded-full border border-border/30 bg-white/5">
                <span className="text-sm text-muted-foreground">+ 10 autres</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pro Exclusives */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-16">
              <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                Exclusif Ultimate Scan
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Ce qui fait la difference
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Le Ultimate Scan exploite tes donnees wearables pour une precision inegalee.
                Plus de suppositions, des donnees reelles.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {proExclusives.map((feature, i) => {
                const colorMap: Record<string, { bg: string; text: string }> = {
                  amber: { bg: "rgba(245, 158, 11, 0.1)", text: "#f59e0b" },
                  red: { bg: "rgba(239, 68, 68, 0.1)", text: "#ef4444" },
                  indigo: { bg: "rgba(99, 102, 241, 0.1)", text: "#6366f1" },
                  orange: { bg: "rgba(249, 115, 22, 0.1)", text: "#f97316" },
                  cyan: { bg: "rgba(6, 182, 212, 0.1)", text: "#06b6d4" },
                  emerald: { bg: "rgba(16, 185, 129, 0.1)", text: "#10b981" },
                };

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card className="h-full hover:border-cyan-500/30 transition-colors">
                      <CardContent className="p-6">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-xl mb-4"
                          style={{ backgroundColor: colorMap[feature.color].bg }}
                        >
                          <feature.icon
                            className="h-6 w-6"
                            style={{ color: colorMap[feature.color].text }}
                          />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-muted/30 to-transparent">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              {/* Left - Price Card */}
              <div className="lg:sticky lg:top-8">
                <Card className="bg-gradient-to-b from-cyan-500/10 to-transparent border-cyan-500/30">
                  <CardContent className="p-8">
                    {/* Badge */}
                    <div className="flex items-center gap-2 mb-4">
                      <Crown className="h-5 w-5 text-emerald-400" />
                      <span className="text-sm text-emerald-400">
                        Inclut tout l'Ultimate Scan
                      </span>
                    </div>

                    {/* Price */}
                    <div className="text-center mb-8">
                      <div className="flex items-baseline justify-center gap-2 mb-2">
                        <span className="text-6xl font-bold text-cyan-400">149€</span>
                      </div>
                      <p className="text-muted-foreground">Paiement unique</p>
                      <p className="text-sm text-cyan-400 mt-2">
                        Deduit de ton coaching Private Lab
                      </p>
                    </div>

                    {/* Features */}
                    <div className="space-y-2 mb-8 max-h-80 overflow-y-auto pr-2">
                      {includedFeatures.map((feature, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-3 ${
                            feature.startsWith("---")
                              ? "py-2 mt-2"
                              : ""
                          }`}
                        >
                          {feature.startsWith("---") ? (
                            <div className="w-full border-t border-cyan-500/30 pt-2">
                              <span className="text-xs text-cyan-400 font-semibold">
                                {feature.replace(/---/g, "").trim()}
                              </span>
                            </div>
                          ) : (
                            <>
                              <Check className="h-4 w-4 text-cyan-400 shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>

                    <Link href="/audit-complet/questionnaire?tier=elite">
                      <Button
                        size="lg"
                        className="w-full gap-2 h-14 bg-cyan-500 hover:bg-cyan-600 text-black"
                      >
                        <Zap className="h-5 w-5" />
                        Lancer mon Ultimate Scan
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {/* Right - Who is it for */}
              <div>
                <h2 className="text-3xl font-bold mb-6">Pour qui ?</h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Le Ultimate Scan est concu pour ceux qui veulent exploiter leurs donnees
                  de sante au maximum. Pas un gadget, un outil de precision.
                </p>

                <div className="space-y-4 mb-8">
                  {[
                    {
                      title: "Athletes serieux",
                      desc: "Tu t'entraines regulierement et veux optimiser ta recuperation avec des donnees objectives.",
                    },
                    {
                      title: "Biohackers avances",
                      desc: "Tu trackes deja tes donnees et veux une analyse expert de tes metriques.",
                    },
                    {
                      title: "Personnes avec douleurs chroniques",
                      desc: "Tu as des blessures ou douleurs et veux un protocole rehabilitation personnalise.",
                    },
                    {
                      title: "Utilisateurs de wearables",
                      desc: "Tu as Oura, Whoop, Garmin ou Apple Watch et veux donner du sens a tes donnees.",
                    },
                  ].map((item, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-1">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Note */}
                <Card className="bg-cyan-500/5 border-cyan-500/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                    <p className="text-sm">
                      <strong>Pas de wearable ?</strong> Si tu n'utilises pas de montre
                      connectee, l'Ultimate Scan (79€) est probablement suffisant pour
                      commencer.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section className="py-16 border-y border-border/30">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="text-2xl font-bold text-center mb-8">
              Ultimate Scan vs Anabolic Bioscan
            </h2>
            <Card>
              <CardContent className="p-0 overflow-hidden">
                <div className="grid grid-cols-3">
                  {/* Header */}
                  <div className="p-4 bg-muted/30 font-medium">Feature</div>
                  <div className="p-4 bg-emerald-500/10 text-center font-medium text-emerald-400">
                    Anabolic Bioscan (79€)
                  </div>
                  <div className="p-4 bg-cyan-500/10 text-center font-medium text-cyan-400">
                    Ultimate Scan (149€)
                  </div>

                  {/* Rows */}
                  {[
                    { feature: "15 domaines analyse", ultimate: "✓", pro: "✓" },
                    { feature: "Analyse visuelle", ultimate: "✓", pro: "✓" },
                    { feature: "Protocole supplements", ultimate: "✓", pro: "✓" },
                    { feature: "Feuille route 90j", ultimate: "✓", pro: "✓" },
                    { feature: "Sync wearables", ultimate: "—", pro: "✓" },
                    { feature: "Donnees HRV reelles", ultimate: "—", pro: "✓" },
                    { feature: "Sommeil automatique", ultimate: "—", pro: "✓" },
                    { feature: "Analyse blessures", ultimate: "—", pro: "✓" },
                    { feature: "Protocole rehab", ultimate: "—", pro: "✓" },
                    { feature: "Suivi evolution", ultimate: "—", pro: "✓" },
                  ].map((row, i) => (
                    <>
                      <div
                        key={`f-${i}`}
                        className="p-4 border-t border-border/30 text-sm"
                      >
                        {row.feature}
                      </div>
                      <div
                        key={`ult-${i}`}
                        className="p-4 border-t border-border/30 bg-emerald-500/5 text-center text-sm"
                      >
                        {row.ultimate}
                      </div>
                      <div
                        key={`pro-${i}`}
                        className="p-4 border-t border-border/30 bg-cyan-500/5 text-center text-sm font-medium"
                      >
                        {row.pro}
                      </div>
                    </>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 lg:py-28 bg-muted/20">
          <div className="mx-auto max-w-3xl px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Questions frequentes</h2>
              <p className="text-muted-foreground">
                Tout ce que tu dois savoir sur le Ultimate Scan
              </p>
            </div>

            <div className="space-y-0">
              {faqItems.map((item, i) => (
                <FAQAccordion
                  key={i}
                  item={item}
                  index={i}
                  isOpen={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-cyan-950/50 to-black text-center">
          <div className="mx-auto max-w-3xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Zap className="h-16 w-16 text-cyan-400 mx-auto mb-8" />
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                Pret pour l'analyse ultime ?
              </h2>
              <p className="text-xl text-gray-400 mb-10">
                Tes donnees wearables + analyse experte = precision maximale.
              </p>

              <Link href="/audit-complet/questionnaire?tier=elite">
                <Button
                  size="lg"
                  className="gap-2 h-16 px-12 text-lg bg-cyan-500 hover:bg-cyan-600 text-black"
                >
                  <Zap className="h-5 w-5" />
                  Lancer mon Ultimate Scan
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>Donnees securisees</span>
                </div>
                <div className="flex items-center gap-2">
                  <Watch className="h-4 w-4" />
                  <span>Sync instantanee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>RGPD compliant</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Sticky Footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border/50 py-4 z-50 lg:hidden">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-cyan-400">149€</p>
            <p className="text-xs text-muted-foreground">Deduit du coaching</p>
          </div>
          <Link href="/audit-complet/questionnaire?tier=elite">
            <Button className="gap-2 bg-cyan-500 hover:bg-cyan-600 text-black">
              Ultimate Scan
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
