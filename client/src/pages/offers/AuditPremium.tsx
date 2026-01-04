/**
 * NEUROCORE 360 - Anabolic Bioscan Offer Page (ex Audit Premium)
 * Ultrahuman-style premium sales page - 79€
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
  Crown,
  ArrowRight,
  Check,
  Camera,
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
  Eye,
  Sparkles,
  BarChart3,
  Clock,
  TrendingUp,
  Scan,
  Layers,
} from "lucide-react";

// 15 Analysis domains
const analysisDomains = [
  {
    id: "base",
    name: "Profil de Base",
    description: "Age metabolique, composition corporelle estimee, objectifs",
    icon: Target,
    color: "emerald",
  },
  {
    id: "body",
    name: "Composition Corporelle",
    description: "Analyse photos IA, posture, asymetries, masse grasse estimee",
    icon: Camera,
    color: "blue",
  },
  {
    id: "metabolism",
    name: "Metabolisme & Energie",
    description: "Depense calorique, flexibilite metabolique, mitochondries",
    icon: Flame,
    color: "orange",
  },
  {
    id: "hrv",
    name: "HRV & Recuperation",
    description: "Variabilite cardiaque, equilibre sympathique/parasympathique",
    icon: Heart,
    color: "red",
  },
  {
    id: "sleep",
    name: "Sommeil & Circadien",
    description: "Qualite du sommeil, architecture, chronotype, optimisation",
    icon: Moon,
    color: "indigo",
  },
  {
    id: "hormones",
    name: "Profil Hormonal",
    description: "Testosterone, cortisol, thyroide, estrogenes - estimation",
    icon: TrendingUp,
    color: "amber",
  },
  {
    id: "neuro",
    name: "Neurotransmetteurs",
    description: "Dopamine, serotonine, GABA, acetylcholine - profil estime",
    icon: Brain,
    color: "purple",
  },
  {
    id: "digestion",
    name: "Digestion & Microbiome",
    description: "Sante intestinale, permeabilite, dysbiose potentielle",
    icon: Activity,
    color: "green",
  },
  {
    id: "inflammation",
    name: "Inflammation & Immunite",
    description: "Marqueurs inflammatoires, resilience immunitaire",
    icon: Shield,
    color: "rose",
  },
  {
    id: "stress",
    name: "Stress & Resilience",
    description: "Charge allostatique, capacite d'adaptation, burnout risk",
    icon: Zap,
    color: "yellow",
  },
  {
    id: "nutrition",
    name: "Protocole Nutrition",
    description: "Plan alimentaire personnalise, timing, macros optimaux",
    icon: Utensils,
    color: "lime",
  },
  {
    id: "training",
    name: "Entrainement Optimal",
    description: "Type d'exercice adapte, frequence, intensite, recuperation",
    icon: Dumbbell,
    color: "cyan",
  },
  {
    id: "supplements",
    name: "Protocole Supplements",
    description: "Stack personnalise avec dosages, timing et interactions",
    icon: Pill,
    color: "pink",
  },
  {
    id: "longevity",
    name: "Longevite & Prevention",
    description: "Risques identifies, strategies anti-aging, biomarqueurs cles",
    icon: Sparkles,
    color: "violet",
  },
  {
    id: "roadmap",
    name: "Feuille de Route 90 Jours",
    description: "Plan d'action structure semaine par semaine",
    icon: BarChart3,
    color: "teal",
  },
];

// How it works steps
const howItWorks = [
  {
    step: 1,
    title: "Questionnaire Complet",
    description:
      "180+ questions sur 15 domaines : sommeil, stress, nutrition, hormones, energie, digestion... Compte 25-30 minutes.",
    icon: FileText,
    color: "emerald",
  },
  {
    step: 2,
    title: "Upload Photos (optionnel)",
    description:
      "Photos face/profil/dos pour analyse posture et composition corporelle par IA. 100% confidentiel.",
    icon: Camera,
    color: "blue",
  },
  {
    step: 3,
    title: "Analyse IA Avancee",
    description:
      "Notre IA croise tes reponses avec les dernieres recherches en medecine fonctionnelle et biohacking.",
    icon: Brain,
    color: "purple",
  },
  {
    step: 4,
    title: "Rapport Personnalise",
    description:
      "Rapport interactif + PDF 40+ pages avec scores, analyses detaillees et protocoles actionnables.",
    icon: Layers,
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
    icon: Layers,
  },
  {
    title: "Analyse Photos IA",
    description: "Posture et composition corporelle",
    icon: Camera,
  },
  {
    title: "Protocoles Sciences",
    description: "Base sur Huberman, Attia, Marek",
    icon: Sparkles,
  },
];

// FAQ items
const faqItems = [
  {
    question: "Combien de temps prend le questionnaire ?",
    answer:
      "Le questionnaire complet prend environ 25-30 minutes. Il est divise en sections thematiques et tu peux faire des pauses. Nous recommandons de le faire au calme, sans distractions, pour des reponses precises. La qualite de ton rapport depend de la qualite de tes reponses.",
  },
  {
    question: "L'analyse photos est-elle obligatoire ?",
    answer:
      "Non, l'upload photos est optionnel. Sans photos, tu recevras quand meme un rapport complet base sur le questionnaire. Avec photos, tu obtiens en plus une analyse posture (asymetries, desequilibres) et une estimation de composition corporelle plus precise.",
  },
  {
    question: "Comment sont utilisees mes photos ?",
    answer:
      "Tes photos sont traitees par notre IA de maniere securisee. Elles ne sont jamais vues par un humain, stockees temporairement pour l'analyse, puis supprimees. Elles ne sont jamais partagees. Tu peux demander leur suppression immediate a tout moment.",
  },
  {
    question: "Sur quelles sources scientifiques vous basez-vous ?",
    answer:
      "Notre IA est entrainee sur les protocoles de Andrew Huberman (Stanford), Peter Attia (medecine de longevite), Marek Health (hormones), Bryan Johnson (Blueprint), et la litterature peer-reviewed. Chaque recommandation cite ses sources dans le rapport.",
  },
  {
    question: "Quelle est la difference avec l'Audit Gratuit ?",
    answer:
      "L'Audit Gratuit couvre 5 domaines de base avec un rapport resume. L'Anabolic Bioscan couvre 15 domaines en profondeur avec analyse photos, profils hormonaux/neurotransmetteurs estimes, protocoles supplements detailles et feuille de route 90 jours. C'est 10x plus complet.",
  },
  {
    question: "Les 79€ sont-ils deduits du coaching ?",
    answer:
      "Oui ! Si tu decides de prendre un coaching Essential (797€) ou Private Lab dans les 30 jours suivant ton Anabolic Bioscan, les 79€ sont integralement deduits. Ton scan devient donc gratuit retroactivement.",
  },
  {
    question: "Combien de temps pour recevoir mon rapport ?",
    answer:
      "Le rapport est genere instantanement apres validation du questionnaire. Tu recois immediatement acces a ton dashboard interactif + le PDF telechargeabe. L'analyse complete prend moins de 2 minutes cote serveur.",
  },
  {
    question: "Puis-je refaire le scan pour suivre mes progres ?",
    answer:
      "Oui, nous recommandons de refaire le scan tous les 3-6 mois pour mesurer tes progres. Chaque scan est facture 79€, mais les clients coaching beneficient de scans illimites inclus dans leur forfait.",
  },
  {
    question: "Le rapport remplace-t-il un avis medical ?",
    answer:
      "Non. L'Anabolic Bioscan est un outil d'optimisation et de prevention, pas un diagnostic medical. Pour toute condition de sante, consulte un professionnel. Notre rapport peut servir de base de discussion avec ton medecin en documentant tes symptomes.",
  },
  {
    question: "Que contient exactement le rapport PDF ?",
    answer:
      "Le rapport PDF fait 40+ pages et inclut : synthese executive, scores par domaine, graphiques radar, analyse detaillee de chaque section, profils hormonaux/neurotransmetteurs estimes, protocole nutrition personnalise, stack supplements avec dosages, et feuille de route 90 jours semaine par semaine.",
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

// Domain card with expand
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

export default function AuditPremium() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-emerald-900/50 to-black py-20 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-800/20 via-transparent to-transparent" />

          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-5">
            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
                backgroundSize: "50px 50px",
              }}
            />
          </div>

          <div className="relative mx-auto max-w-6xl px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left - Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Badge className="mb-6 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  <Crown className="mr-2 h-3 w-3" />
                  Le + Populaire
                </Badge>

                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl mb-6">
                  Anabolic Bioscan.
                  <span className="block text-emerald-400 mt-2">
                    15 domaines. 1 rapport.
                  </span>
                </h1>

                <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                  L'analyse metabolique la plus complete. Questionnaire 180+ questions,
                  analyse photos IA, profils hormonaux estimes, protocoles personnalises.
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

              {/* Right - Report Preview Mockup */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <div className="relative mx-auto w-[320px] sm:w-[380px]">
                  {/* Report card mockup */}
                  <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-xs text-gray-500">NEUROCORE 360</p>
                        <p className="font-bold text-white">Anabolic Bioscan</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Score Global</p>
                        <p className="text-2xl font-bold text-emerald-400">78</p>
                      </div>
                    </div>

                    {/* Radar chart placeholder */}
                    <div className="relative w-full aspect-square mb-6 flex items-center justify-center">
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        {/* Background hexagon */}
                        <polygon
                          points="100,10 178,55 178,145 100,190 22,145 22,55"
                          fill="none"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="1"
                        />
                        <polygon
                          points="100,40 154,70 154,130 100,160 46,130 46,70"
                          fill="none"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="1"
                        />
                        <polygon
                          points="100,70 130,85 130,115 100,130 70,115 70,85"
                          fill="none"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="1"
                        />
                        {/* Data polygon */}
                        <polygon
                          points="100,25 165,62 158,140 100,170 42,125 35,60"
                          fill="rgba(16, 185, 129, 0.2)"
                          stroke="#10b981"
                          strokeWidth="2"
                        />
                        {/* Data points */}
                        <circle cx="100" cy="25" r="4" fill="#10b981" />
                        <circle cx="165" cy="62" r="4" fill="#10b981" />
                        <circle cx="158" cy="140" r="4" fill="#10b981" />
                        <circle cx="100" cy="170" r="4" fill="#10b981" />
                        <circle cx="42" cy="125" r="4" fill="#10b981" />
                        <circle cx="35" cy="60" r="4" fill="#10b981" />
                      </svg>
                      {/* Labels */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 text-xs text-gray-400">Energie</div>
                      <div className="absolute top-1/4 right-0 text-xs text-gray-400">Hormones</div>
                      <div className="absolute bottom-1/4 right-0 text-xs text-gray-400">Sommeil</div>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-gray-400">Digestion</div>
                      <div className="absolute bottom-1/4 left-0 text-xs text-gray-400">Mental</div>
                      <div className="absolute top-1/4 left-0 text-xs text-gray-400">Stress</div>
                    </div>

                    {/* Mini domain scores */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-800 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-500">Metabolisme</p>
                        <p className="text-sm font-semibold text-emerald-400">82</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-500">HRV</p>
                        <p className="text-sm font-semibold text-amber-400">71</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-500">Neuros</p>
                        <p className="text-sm font-semibold text-purple-400">76</p>
                      </div>
                    </div>
                  </div>
                  {/* Glow */}
                  <div className="absolute -inset-4 bg-emerald-500/20 blur-3xl rounded-full -z-10" />
                </div>
              </motion.div>
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
                score et accompagne de recommandations personnalisees.
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
                      <Badge className="mb-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        Le + Populaire
                      </Badge>
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
                        "Analyse photos IA (optionnel)",
                        "Profil hormonal estime",
                        "Profil neurotransmetteurs",
                        "Protocole nutrition personnalise",
                        "Stack supplements avec dosages",
                        "Feuille de route 90 jours",
                        "Rapport PDF 40+ pages",
                        "Dashboard interactif",
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
                        <Badge key={i} variant="outline" className="text-xs">
                          {source}
                        </Badge>
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
              Anabolic Bioscan vs Audit Gratuit
            </h2>
            <Card>
              <CardContent className="p-0 overflow-hidden">
                <div className="grid grid-cols-3">
                  {/* Header */}
                  <div className="p-4 bg-muted/30 font-medium">Feature</div>
                  <div className="p-4 bg-muted/30 text-center font-medium">Gratuit</div>
                  <div className="p-4 bg-emerald-500/10 text-center font-medium text-emerald-400">
                    Anabolic Bioscan
                  </div>

                  {/* Rows */}
                  {[
                    { feature: "Questions", free: "50", premium: "180+" },
                    { feature: "Domaines", free: "5", premium: "15" },
                    { feature: "Analyse Photos", free: "Non", premium: "Oui" },
                    { feature: "Profil Hormonal", free: "Basique", premium: "Complet" },
                    { feature: "Neurotransmetteurs", free: "Non", premium: "Oui" },
                    { feature: "Protocole Supplements", free: "Resume", premium: "Detaille" },
                    { feature: "Feuille Route 90j", free: "Non", premium: "Oui" },
                    { feature: "Pages Rapport", free: "~10", premium: "40+" },
                  ].map((row, i) => (
                    <>
                      <div
                        key={`f-${i}`}
                        className="p-4 border-t border-border/30 text-sm"
                      >
                        {row.feature}
                      </div>
                      <div
                        key={`free-${i}`}
                        className="p-4 border-t border-border/30 text-center text-sm text-muted-foreground"
                      >
                        {row.free}
                      </div>
                      <div
                        key={`prem-${i}`}
                        className="p-4 border-t border-border/30 bg-emerald-500/5 text-center text-sm font-medium"
                      >
                        {row.premium}
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
                    sont des estimations basees sur vos symptomes, pas des dosages
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
