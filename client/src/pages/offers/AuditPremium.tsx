/**
 * NEUROCORE 360 - Anabolic Bioscan Offer Page (ex Audit Premium)
 * Ultrahuman-style premium sales page - 79€
 */

import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowRight,
  Check,
  FileText,
  Target,
  Activity,
  Zap,
  Pill,
  Brain,
  Heart,
  Flame,
  ChevronDown,
  Lock,
  Shield,
  Moon,
  Dumbbell,
  Utensils,
  Sparkles,
  BarChart3,
  Clock,
  Scan,
  FlaskConical,
  Coffee,
  Bone,
  HeartHandshake,
  Users,
} from "lucide-react";

// 15 Real Analysis domains from Dashboard
const analysisDomains = [
  {
    id: "profilbase",
    name: "Profil de Base",
    description: "Age, objectifs, historique medical, mode de vie actuel",
    icon: Target,
    color: "emerald",
  },
  {
    id: "compositioncorporelle",
    name: "Composition Corporelle",
    description: "Poids, mensurations, estimation masse grasse, morphotype",
    icon: Activity,
    color: "blue",
  },
  {
    id: "metabolismeenergie",
    name: "Metabolisme & Energie",
    description: "Depense calorique, niveaux d'energie, fatigue, thyroide",
    icon: Flame,
    color: "orange",
  },
  {
    id: "nutritiontracking",
    name: "Nutrition & Tracking",
    description: "Habitudes alimentaires, macros, timing, intolerances",
    icon: Utensils,
    color: "green",
  },
  {
    id: "digestionmicrobiome",
    name: "Digestion & Microbiome",
    description: "Transit, ballonnements, intolerance, sante intestinale",
    icon: FlaskConical,
    color: "yellow",
  },
  {
    id: "activiteperformance",
    name: "Activite & Performance",
    description: "Entrainement, volume, intensite, progression, recuperation",
    icon: Dumbbell,
    color: "purple",
  },
  {
    id: "sommeilrecuperation",
    name: "Sommeil & Recuperation",
    description: "Qualite, duree, latence, reveils, chronotype",
    icon: Moon,
    color: "indigo",
  },
  {
    id: "hrvcardiaque",
    name: "HRV & Sante Cardiaque",
    description: "Variabilite cardiaque, resting HR, capacite cardiovasculaire",
    icon: Heart,
    color: "red",
  },
  {
    id: "analysesbiomarqueurs",
    name: "Analyses & Biomarqueurs",
    description: "Bilans sanguins recents, carences, marqueurs cles",
    icon: FlaskConical,
    color: "cyan",
  },
  {
    id: "hormonesstress",
    name: "Hormones & Stress",
    description: "Cortisol, thyroide, signes de dereglement hormonal",
    icon: Zap,
    color: "amber",
  },
  {
    id: "lifestylesubstances",
    name: "Lifestyle & Substances",
    description: "Alcool, cafeine, tabac, supplements actuels",
    icon: Coffee,
    color: "pink",
  },
  {
    id: "biomecaniquemobilite",
    name: "Biomecanique & Mobilite",
    description: "Posture, douleurs, restrictions, blessures",
    icon: Bone,
    color: "teal",
  },
  {
    id: "psychologiemental",
    name: "Psychologie & Mental",
    description: "Motivation, stress percu, anxiete, humeur generale",
    icon: Brain,
    color: "violet",
  },
  {
    id: "neurotransmetteurs",
    name: "Neurotransmetteurs",
    description: "Profil dopamine, serotonine, GABA, acetylcholine estime",
    icon: Sparkles,
    color: "rose",
  },
  {
    id: "hormonessexuelles",
    name: "Hormones Sexuelles & Libido",
    description: "Testosterone, estrogenes, libido, fertilite",
    icon: HeartHandshake,
    color: "lime",
  },
];

// How it works steps
const howItWorks = [
  {
    step: 1,
    title: "Questionnaire Detaille",
    description:
      "180+ questions sur 15 domaines : sommeil, stress, nutrition, hormones, energie, digestion... Compte 25-30 minutes pour des reponses precises.",
    icon: FileText,
    color: "emerald",
  },
  {
    step: 2,
    title: "Analyse Complete",
    description:
      "Tes reponses sont analysees et croisees avec les derniers protocoles de medecine fonctionnelle et biohacking.",
    icon: BarChart3,
    color: "blue",
  },
  {
    step: 3,
    title: "Scores & Insights",
    description:
      "Chaque domaine recoit un score de 0 a 100. Tes forces et faiblesses sont identifiees en priorite.",
    icon: Target,
    color: "purple",
  },
  {
    step: 4,
    title: "Protocoles Personnalises",
    description:
      "Rapport interactif + PDF 40+ pages avec recommandations nutrition, supplements, training et lifestyle.",
    icon: Sparkles,
    color: "amber",
  },
];

// What makes it different
const differentiators = [
  {
    title: "180+ Questions",
    description: "Le questionnaire le plus complet du marche",
    icon: FileText,
  },
  {
    title: "15 Domaines",
    description: "Analyse holistique corps-esprit",
    icon: BarChart3,
  },
  {
    title: "Scores Precis",
    description: "Chaque domaine note de 0 a 100",
    icon: Target,
  },
  {
    title: "Protocoles Sciences",
    description: "Base sur Huberman, Attia, Marek",
    icon: Sparkles,
  },
];

// FAQ items - updated to reflect actual product
const faqItems = [
  {
    question: "Combien de temps prend le questionnaire ?",
    answer:
      "Le questionnaire complet prend environ 25-30 minutes. Il est divise en 15 sections thematiques et tu peux sauvegarder ta progression a tout moment. Nous recommandons de le faire au calme, sans distractions, pour des reponses precises. La qualite de ton rapport depend directement de la qualite de tes reponses.",
  },
  {
    question: "Quels sont les 15 domaines analyses ?",
    answer:
      "Les 15 domaines sont : Profil de Base, Composition Corporelle, Metabolisme & Energie, Nutrition & Tracking, Digestion & Microbiome, Activite & Performance, Sommeil & Recuperation, HRV & Cardiaque, Analyses & Biomarqueurs, Hormones & Stress, Lifestyle & Substances, Biomecanique & Mobilite, Psychologie & Mental, Neurotransmetteurs, et Hormones Sexuelles.",
  },
  {
    question: "Comment sont calcules les scores ?",
    answer:
      "Chaque domaine recoit un score de 0 a 100 base sur tes reponses. Les scores sont ponderes selon l'impact sur ta sante globale. Un score global est calcule, et tes points forts/faiblesses sont identifies automatiquement pour prioriser les actions.",
  },
  {
    question: "Sur quelles sources scientifiques vous basez-vous ?",
    answer:
      "Les protocoles sont bases sur les travaux de Andrew Huberman (Stanford), Peter Attia (medecine de longevite), Marek Health (hormones), Bryan Johnson (Blueprint), et la litterature scientifique peer-reviewed. Chaque recommandation est sourcee.",
  },
  {
    question: "Quelle est la difference avec le Discovery Scan gratuit ?",
    answer:
      "Le Discovery Scan gratuit couvre 5 domaines de base avec un rapport resume. L'Anabolic Bioscan couvre les 15 domaines en profondeur avec profils hormonaux/neurotransmetteurs estimes, protocoles supplements detailles avec dosages, et feuille de route 90 jours. C'est 10x plus complet.",
  },
  {
    question: "Les 79€ sont-ils deduits du coaching ?",
    answer:
      "Oui ! Si tu decides de prendre un coaching Essential (797€) ou Private Lab dans les 30 jours suivant ton Anabolic Bioscan, les 79€ sont integralement deduits. Ton scan devient donc gratuit retroactivement.",
  },
  {
    question: "Combien de temps pour recevoir mon rapport ?",
    answer:
      "Le rapport est genere instantanement apres validation du questionnaire. Tu recois immediatement acces a ton dashboard interactif avec radar chart, scores par domaine, points forts/faiblesses, et le PDF telechargeabe de 40+ pages.",
  },
  {
    question: "Puis-je refaire le scan pour suivre mes progres ?",
    answer:
      "Oui, nous recommandons de refaire le scan tous les 3-6 mois pour mesurer tes progres objectivement. Chaque scan est facture 79€, mais les clients coaching beneficient de scans illimites inclus dans leur forfait.",
  },
  {
    question: "Le rapport remplace-t-il un avis medical ?",
    answer:
      "Non. L'Anabolic Bioscan est un outil d'optimisation et de prevention, pas un diagnostic medical. Pour toute condition de sante, consulte un professionnel. Notre rapport peut servir de base de discussion avec ton medecin en documentant tes symptomes et habitudes.",
  },
  {
    question: "Que contient exactement le rapport PDF ?",
    answer:
      "Le rapport PDF fait 40+ pages et inclut : synthese executive, radar chart global, scores par domaine avec explications, analyse de tes points forts et priorites d'amelioration, profils hormonaux/neurotransmetteurs estimes, protocole nutrition personnalise, stack supplements avec dosages precis, et feuille de route 90 jours.",
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

// Domain card
function DomainCard({
  domain,
  index,
}: {
  domain: (typeof analysisDomains)[0];
  index: number;
}) {
  const colorMap: Record<string, string> = {
    emerald: "#10b981",
    blue: "#3b82f6",
    orange: "#f97316",
    red: "#ef4444",
    indigo: "#6366f1",
    amber: "#f59e0b",
    purple: "#a855f7",
    green: "#22c55e",
    rose: "#f43f5e",
    yellow: "#eab308",
    lime: "#84cc16",
    cyan: "#06b6d4",
    pink: "#ec4899",
    violet: "#8b5cf6",
    teal: "#14b8a6",
  };

  const bgColorMap: Record<string, string> = {
    emerald: "rgba(16, 185, 129, 0.1)",
    blue: "rgba(59, 130, 246, 0.1)",
    orange: "rgba(249, 115, 22, 0.1)",
    red: "rgba(239, 68, 68, 0.1)",
    indigo: "rgba(99, 102, 241, 0.1)",
    amber: "rgba(245, 158, 11, 0.1)",
    purple: "rgba(168, 85, 247, 0.1)",
    green: "rgba(34, 197, 94, 0.1)",
    rose: "rgba(244, 63, 94, 0.1)",
    yellow: "rgba(234, 179, 8, 0.1)",
    lime: "rgba(132, 204, 22, 0.1)",
    cyan: "rgba(6, 182, 212, 0.1)",
    pink: "rgba(236, 72, 153, 0.1)",
    violet: "rgba(139, 92, 246, 0.1)",
    teal: "rgba(20, 184, 166, 0.1)",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.03 }}
    >
      <Card className="h-full hover:border-emerald-500/30 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: bgColorMap[domain.color] }}
            >
              <domain.icon
                className="h-5 w-5"
                style={{ color: colorMap[domain.color] }}
              />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">{domain.name}</h3>
              <p className="text-xs text-muted-foreground">{domain.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Animated Radar Chart Component
function AnimatedRadarChart({ isHovered }: { isHovered: boolean }) {
  // Base points for the radar
  const basePoints = [
    { x: 100, y: 25, label: "Energie", score: 85 },
    { x: 165, y: 62, label: "Hormones", score: 72 },
    { x: 158, y: 140, label: "Sommeil", score: 68 },
    { x: 100, y: 170, label: "Digestion", score: 78 },
    { x: 42, y: 125, label: "Mental", score: 82 },
    { x: 35, y: 60, label: "Stress", score: 65 },
  ];

  // Calculate animated points based on hover state
  const getAnimatedPoint = (base: typeof basePoints[0], index: number) => {
    const centerX = 100;
    const centerY = 100;
    const maxRadius = 80;
    const angle = (index * 60 - 90) * (Math.PI / 180);

    const scoreRadius = isHovered
      ? (base.score / 100) * maxRadius
      : (base.score / 100) * maxRadius * 0.85;

    return {
      x: centerX + Math.cos(angle) * scoreRadius,
      y: centerY + Math.sin(angle) * scoreRadius,
    };
  };

  const animatedPoints = basePoints.map((p, i) => getAnimatedPoint(p, i));
  const polygonPoints = animatedPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="relative w-full aspect-square">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Background hexagons */}
        <motion.polygon
          points="100,10 178,55 178,145 100,190 22,145 22,55"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        <motion.polygon
          points="100,40 154,70 154,130 100,160 46,130 46,70"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        <motion.polygon
          points="100,70 130,85 130,115 100,130 70,115 70,85"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />

        {/* Animated data polygon */}
        <motion.polygon
          initial={{ opacity: 0.6 }}
          animate={{
            points: polygonPoints,
            opacity: isHovered ? 1 : 0.8,
          }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
          }}
          fill={isHovered ? "rgba(16, 185, 129, 0.35)" : "rgba(16, 185, 129, 0.2)"}
          stroke="#10b981"
          strokeWidth={isHovered ? 3 : 2}
        />

        {/* Animated data points */}
        {animatedPoints.map((point, i) => (
          <motion.circle
            key={i}
            animate={{
              cx: point.x,
              cy: point.y,
              r: isHovered ? 6 : 4,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            fill="#10b981"
          />
        ))}
      </svg>

      {/* Labels */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 text-xs text-gray-400">Energie</div>
      <div className="absolute top-1/4 right-0 text-xs text-gray-400">Hormones</div>
      <div className="absolute bottom-1/4 right-0 text-xs text-gray-400">Sommeil</div>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-gray-400">Digestion</div>
      <div className="absolute bottom-1/4 left-0 text-xs text-gray-400">Mental</div>
      <div className="absolute top-1/4 left-0 text-xs text-gray-400">Stress</div>
    </div>
  );
}

export default function AuditPremium() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isRadarHovered, setIsRadarHovered] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero Section - Green Grid/Heart Style */}
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900/30 to-black py-20 lg:py-32">
          {/* Main gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-800/30 via-emerald-950/40 to-transparent" />

          {/* Animated grid pattern - rounded squares like in image */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Grid of glowing rounded squares */}
            <div className="absolute inset-0 grid grid-cols-6 gap-4 p-8 opacity-30">
              {[...Array(24)].map((_, i) => (
                <motion.div
                  key={`grid-${i}`}
                  className="aspect-square rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(6,95,70,0.05) 100%)',
                    boxShadow: 'inset 0 0 30px rgba(16,185,129,0.1)',
                  }}
                  animate={{
                    opacity: [0.2, 0.4, 0.2],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>

            {/* Center heart glow */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(16,185,129,0.1) 50%, transparent 70%)',
                boxShadow: '0 0 60px rgba(16,185,129,0.3)',
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Heart className="w-12 h-12 text-emerald-400/50" />
            </motion.div>

            {/* Glowing lines connecting grid */}
            <svg className="absolute inset-0 w-full h-full opacity-20">
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(16,185,129,0.5)" />
                  <stop offset="50%" stopColor="rgba(16,185,129,0.2)" />
                  <stop offset="100%" stopColor="rgba(16,185,129,0.5)" />
                </linearGradient>
              </defs>
              <line x1="20%" y1="30%" x2="50%" y2="50%" stroke="url(#lineGradient)" strokeWidth="1" />
              <line x1="80%" y1="30%" x2="50%" y2="50%" stroke="url(#lineGradient)" strokeWidth="1" />
              <line x1="20%" y1="70%" x2="50%" y2="50%" stroke="url(#lineGradient)" strokeWidth="1" />
              <line x1="80%" y1="70%" x2="50%" y2="50%" stroke="url(#lineGradient)" strokeWidth="1" />
            </svg>
          </div>

          <div className="relative mx-auto max-w-6xl px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left - Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl mb-6">
                  Anabolic Bioscan.
                  <span className="block text-emerald-400 mt-2">
                    15 domaines. 1 rapport.
                  </span>
                </h1>

                <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                  L'analyse metabolique la plus complete. Questionnaire 180+ questions,
                  profils hormonaux estimes, protocoles personnalises.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/audit-complet/questionnaire">
                    <Button
                      size="lg"
                      className="gap-2 h-14 px-8 text-lg bg-emerald-500 hover:bg-emerald-600 w-full sm:w-auto"
                    >
                      <Scan className="h-5 w-5" />
                      Lancer mon Anabolic Bioscan
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>

                <p className="mt-6 text-sm text-emerald-400">
                  Deduit de ton coaching Essential ou Private Lab
                </p>
              </motion.div>

              {/* Right - Video + Report Preview */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <div className="relative mx-auto w-full max-w-[450px]">
                  {/* Video container */}
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl mb-6">
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-auto"
                    >
                      <source
                        src="https://public-web-assets.uh-static.com/web_v2/blood-vision/buy/desktop/Web2K_1.mp4"
                        type="video/mp4"
                      />
                    </video>
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    {/* Video overlay text */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white text-sm font-medium">Analyse metabolique avancee</p>
                      <p className="text-gray-300 text-xs">Scores en temps reel sur 15 domaines</p>
                    </div>
                  </div>

                  {/* Mini Report card below video */}
                  <div
                    className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-4 shadow-xl cursor-pointer transition-transform hover:scale-[1.02]"
                    onMouseEnter={() => setIsRadarHovered(true)}
                    onMouseLeave={() => setIsRadarHovered(false)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Mini radar */}
                      <div className="w-24 h-24 shrink-0">
                        <AnimatedRadarChart isHovered={isRadarHovered} />
                      </div>
                      {/* Scores */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-gray-500">Score Global</p>
                          <motion.p
                            className="text-xl font-bold text-emerald-400"
                            animate={{ scale: isRadarHovered ? 1.1 : 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            78
                          </motion.p>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <div className="text-center">
                            <p className="text-[9px] text-gray-500">Meta</p>
                            <p className="text-xs font-semibold text-emerald-400">82</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-gray-500">HRV</p>
                            <p className="text-xs font-semibold text-amber-400">71</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-gray-500">Neuro</p>
                            <p className="text-xs font-semibold text-purple-400">76</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Glow */}
                  <motion.div
                    className="absolute -inset-4 bg-emerald-500/20 blur-3xl rounded-full -z-10"
                    animate={{ opacity: isRadarHovered ? 0.4 : 0.2 }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-8 border-b border-border/30 bg-muted/20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-500" />
                <span>+500 scans realises</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-500" />
                <span>15 domaines analyses</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-500" />
                <span>Resultats instantanes</span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 lg:py-28 border-b border-border/30">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Comment ca marche</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Du questionnaire au rapport complet en 4 etapes simples
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {howItWorks.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="h-full bg-gradient-to-b from-muted/50 to-transparent">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm">
                          {step.step}
                        </div>
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor:
                              step.color === "emerald"
                                ? "rgba(16, 185, 129, 0.1)"
                                : step.color === "blue"
                                  ? "rgba(59, 130, 246, 0.1)"
                                  : step.color === "purple"
                                    ? "rgba(168, 85, 247, 0.1)"
                                    : "rgba(245, 158, 11, 0.1)",
                          }}
                        >
                          <step.icon
                            className="h-5 w-5"
                            style={{
                              color:
                                step.color === "emerald"
                                  ? "#10b981"
                                  : step.color === "blue"
                                    ? "#3b82f6"
                                    : step.color === "purple"
                                      ? "#a855f7"
                                      : "#f59e0b",
                            }}
                          />
                        </div>
                      </div>
                      <h3 className="font-semibold mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 15 Domains */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                15 domaines d'analyse
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                L'analyse la plus complete du marche. Chaque domaine est evalue,
                score de 0 a 100 et accompagne de recommandations personnalisees.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysisDomains.map((domain, i) => (
                <DomainCard key={domain.id} domain={domain} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Price + Features */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-muted/30 to-transparent">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              {/* Left - Price card */}
              <div className="lg:sticky lg:top-8">
                <Card className="bg-gradient-to-b from-emerald-500/10 to-transparent border-emerald-500/30">
                  <CardContent className="p-8">
                    <div className="text-center mb-8">
                      <div className="flex items-baseline justify-center gap-2 mb-2">
                        <span className="text-6xl font-bold text-emerald-400">79€</span>
                      </div>
                      <p className="text-muted-foreground">Paiement unique</p>
                      <p className="text-sm text-emerald-400 mt-2">
                        Deduit de ton coaching
                      </p>
                    </div>

                    <div className="space-y-3 mb-8">
                      {[
                        "Questionnaire 180+ questions",
                        "15 domaines d'analyse",
                        "Scores de 0 a 100 par domaine",
                        "Profil hormonal estime",
                        "Profil neurotransmetteurs",
                        "Points forts & priorites identifies",
                        "Protocole nutrition personnalise",
                        "Stack supplements avec dosages",
                        "Feuille de route 90 jours",
                        "Rapport PDF 40+ pages",
                        "Dashboard interactif avec radar",
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Check className="h-5 w-5 text-emerald-400 shrink-0" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>

                    <Link href="/audit-complet/questionnaire">
                      <Button
                        size="lg"
                        className="w-full gap-2 h-14 bg-emerald-500 hover:bg-emerald-600"
                      >
                        <Scan className="h-5 w-5" />
                        Lancer mon Anabolic Bioscan
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </Link>

                    <p className="text-center text-sm text-muted-foreground mt-4">
                      25-30 minutes - Resultats instantanes
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Right - Differentiators */}
              <div>
                <h2 className="text-3xl font-bold mb-6">
                  Ce qui rend l'Anabolic Bioscan unique
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Pas un simple questionnaire. Une analyse complete basee sur les
                  protocoles des meilleurs praticiens en medecine fonctionnelle.
                </p>

                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                  {differentiators.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Card>
                        <CardContent className="p-4 flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                            <item.icon className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{item.title}</h3>
                            <p className="text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Sources */}
                <Card className="bg-muted/30">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Base sur les protocoles de :</h3>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Andrew Huberman",
                        "Peter Attia",
                        "Bryan Johnson",
                        "Marek Health",
                        "Examine.com",
                      ].map((source, i) => (
                        <span key={i} className="text-xs bg-muted px-3 py-1 rounded-full">
                          {source}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison with Free */}
        <section className="py-16 border-y border-border/30">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="text-2xl font-bold text-center mb-8">
              Anabolic Bioscan vs Discovery Scan
            </h2>
            <Card>
              <CardContent className="p-0 overflow-hidden">
                <div className="grid grid-cols-3">
                  {/* Header */}
                  <div className="p-4 bg-muted/30 font-medium">Feature</div>
                  <div className="p-4 bg-muted/30 text-center font-medium">Discovery (Gratuit)</div>
                  <div className="p-4 bg-emerald-500/10 text-center font-medium text-emerald-400">
                    Anabolic Bioscan
                  </div>

                  {/* Rows */}
                  {[
                    { feature: "Questions", free: "~50", premium: "180+" },
                    { feature: "Domaines", free: "5", premium: "15" },
                    { feature: "Scores detailles", free: "Basique", premium: "0-100 par domaine" },
                    { feature: "Profil Hormonal", free: "Non", premium: "Complet" },
                    { feature: "Neurotransmetteurs", free: "Non", premium: "Oui" },
                    { feature: "Protocole Supplements", free: "Resume", premium: "Detaille + dosages" },
                    { feature: "Feuille Route 90j", free: "Non", premium: "Oui" },
                    { feature: "Pages Rapport", free: "~10", premium: "40+" },
                  ].map((row, i) => (
                    <div key={i} className="contents">
                      <div className="p-4 border-t border-border/30 text-sm">
                        {row.feature}
                      </div>
                      <div className="p-4 border-t border-border/30 text-center text-sm text-muted-foreground">
                        {row.free}
                      </div>
                      <div className="p-4 border-t border-border/30 bg-emerald-500/5 text-center text-sm font-medium">
                        {row.premium}
                      </div>
                    </div>
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
                Tout ce que tu dois savoir sur l'Anabolic Bioscan
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

        {/* Disclaimer */}
        <section className="py-12 border-t border-border/30">
          <div className="mx-auto max-w-4xl px-4">
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-6 flex items-start gap-4">
                <Shield className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-600 mb-2">
                    Information importante
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    L'Anabolic Bioscan est un outil d'optimisation et de prevention, pas
                    un diagnostic medical. Les profils hormonaux et neurotransmetteurs
                    sont des estimations basees sur vos symptomes et reponses, pas des dosages
                    sanguins. Pour toute condition medicale, consultez un professionnel
                    de sante qualifie.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-emerald-950/50 to-black text-center">
          <div className="mx-auto max-w-3xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Scan className="h-16 w-16 text-emerald-400 mx-auto mb-8" />
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                Pret pour ton Anabolic Bioscan ?
              </h2>
              <p className="text-xl text-gray-400 mb-10">
                L'analyse metabolique la plus complete. 79€ deduits si tu prends un
                coaching.
              </p>

              <Link href="/audit-complet/questionnaire">
                <Button
                  size="lg"
                  className="gap-2 h-16 px-12 text-lg bg-emerald-500 hover:bg-emerald-600"
                >
                  <Scan className="h-5 w-5" />
                  Lancer mon Anabolic Bioscan
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>Paiement securise</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>25-30 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Donnees RGPD</span>
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
            <p className="text-2xl font-bold text-emerald-400">79€</p>
            <p className="text-xs text-muted-foreground">Deduit du coaching</p>
          </div>
          <Link href="/audit-complet/questionnaire">
            <Button className="gap-2 bg-emerald-500 hover:bg-emerald-600">
              Anabolic Bioscan
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
