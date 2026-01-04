/**
 * NEUROCORE 360 - Burnout Detection Offer Page
 * Ultrahuman-style premium sales page
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
  Brain,
  ArrowRight,
  Check,
  AlertTriangle,
  Activity,
  Battery,
  Zap,
  FileText,
  Target,
  Shield,
  Clock,
  TrendingDown,
  ChevronDown,
  Lock,
  Heart,
  Moon,
  Flame,
  Users,
  Calendar,
  BarChart3,
  Sparkles,
  Coffee,
  BatteryWarning,
  BatteryLow,
} from "lucide-react";

// Burnout phases
const burnoutPhases = [
  {
    phase: 1,
    name: "Alarme",
    description: "Stress aigu, activation du systeme sympathique. Le corps reagit mais n'est pas encore epuise.",
    color: "amber",
    icon: AlertTriangle,
    symptoms: [
      "Fatigue inhabituelle",
      "Troubles du sommeil legers",
      "Irritabilite croissante",
      "Difficulte a deconnecter",
    ],
    recovery: "2-4 semaines",
  },
  {
    phase: 2,
    name: "Resistance",
    description: "Adaptation chronique au stress. Le cortisol reste eleve, le corps compense mais s'epuise.",
    color: "orange",
    icon: BatteryWarning,
    symptoms: [
      "Epuisement constant",
      "Difficulte de concentration",
      "Infections frequentes",
      "Prise/perte de poids",
    ],
    recovery: "1-3 mois",
  },
  {
    phase: 3,
    name: "Epuisement",
    description: "Burnout installe. Crash hormonal (cortisol, thyroide, hormones sexuelles). Intervention necessaire.",
    color: "red",
    icon: BatteryLow,
    symptoms: [
      "Incapacite a fonctionner",
      "Symptomes depressifs",
      "Problemes physiques",
      "Detachement emotionnel",
    ],
    recovery: "3-12 mois",
  },
];

// 4-week protocol
const recoveryProtocol = [
  {
    week: 1,
    title: "Reset Nerveux",
    focus: "Calmer le systeme nerveux sympathique",
    actions: [
      "Respiration 4-7-8 avant chaque repas",
      "Deconnexion digitale apres 20h",
      "Sommeil prioritaire (8h minimum)",
      "Marche en nature 20min/jour",
    ],
    icon: Moon,
  },
  {
    week: 2,
    title: "Nutrition Anti-Stress",
    focus: "Nourrir les surrenales et neurotransmetteurs",
    actions: [
      "Magnesium glycinate 400mg/jour",
      "Adaptogenes (Ashwagandha, Rhodiola)",
      "Omega-3 haute dose (3g EPA/DHA)",
      "Elimination cafeine progressive",
    ],
    icon: Flame,
  },
  {
    week: 3,
    title: "Mouvement Doux",
    focus: "Reactivation sans stress supplementaire",
    actions: [
      "Yoga restauratif 3x/semaine",
      "Marche 30-45min quotidienne",
      "Etirements et mobilite",
      "Zero sport intense",
    ],
    icon: Activity,
  },
  {
    week: 4,
    title: "Reconstruction",
    focus: "Mise en place de routines durables",
    actions: [
      "Limites professionnelles claires",
      "Routine matinale protegee",
      "Temps de recuperation planifie",
      "Prevention long terme",
    ],
    icon: Target,
  },
];

// What's included features
const features = [
  {
    icon: FileText,
    title: "Questionnaire 50 questions",
    description: "Evaluation neuro-endocrinienne complete basee sur la science",
  },
  {
    icon: BarChart3,
    title: "Score Burnout 0-100",
    description: "Quantification precise de ton niveau d'epuisement",
  },
  {
    icon: AlertTriangle,
    title: "Detection de Phase",
    description: "Alarme, Resistance ou Epuisement - sache ou tu en es",
  },
  {
    icon: Brain,
    title: "Profil Hormonal Estime",
    description: "Cortisol, DHEA, thyroide - estimation basee sur symptomes",
  },
  {
    icon: Calendar,
    title: "Protocole 4 Semaines",
    description: "Plan de sortie personnalise adapte a ta phase",
  },
  {
    icon: Activity,
    title: "Dashboard Temps Reel",
    description: "Suivi de ton evolution et recommandations",
  },
];

// FAQ items
const faqItems = [
  {
    question: "Comment le questionnaire detecte-t-il le burnout ?",
    answer:
      "Notre questionnaire de 50 questions est base sur les echelles validees (MBI, CBI) et enrichi par les symptomes neuro-endocriniens decrits dans la litterature medicale. Nous evaluons 5 dimensions : epuisement physique, epuisement emotionnel, cynisme/detachement, efficacite personnelle, et symptomes somatiques.",
  },
  {
    question: "Quelle est la difference avec un simple test de stress ?",
    answer:
      "Les tests de stress classiques mesurent le stress percu. Notre approche va plus loin : nous estimons l'impact sur l'axe HPA (hypothalamo-hypophyso-surrenalien), les neurotransmetteurs et la thyroide. Cela permet de distinguer un stress aigu d'un burnout installe avec consequences hormonales.",
  },
  {
    question: "Le score 0-100 est-il fiable ?",
    answer:
      "Le score est un indicateur base sur vos reponses, pas un diagnostic medical. Il permet de quantifier votre etat et de suivre votre evolution. Les seuils (< 30 : bas risque, 30-60 : risque modere, > 60 : risque eleve) sont calibres sur les donnees de la recherche en burnout.",
  },
  {
    question: "Que faire si je suis en phase d'epuisement ?",
    answer:
      "La phase d'epuisement necessite une intervention serieuse. Notre protocole vous guide mais nous recommandons fortement de consulter un medecin pour un bilan hormonal complet (cortisol, thyroide, testosterone). Un arret de travail peut etre necessaire. Notre rapport vous aide a communiquer avec votre medecin.",
  },
  {
    question: "Le protocole 4 semaines suffit-il pour guerir ?",
    answer:
      "Pour les phases 1 (Alarme) et 2 (Resistance legere), 4 semaines peuvent suffire a inverser la tendance. Pour la phase 3 (Epuisement), c'est un debut - la recuperation complete peut prendre 3-12 mois. Le protocole pose les fondations, mais un suivi long terme est recommande.",
  },
  {
    question: "Puis-je refaire le test pour suivre mon evolution ?",
    answer:
      "Oui, nous recommandons de refaire le test toutes les 2-4 semaines pendant votre recuperation. Chaque test est facture 49€, mais les clients coaching ont un acces illimite. Voir votre score diminuer est un excellent motivateur.",
  },
  {
    question: "Les supplements recommandes sont-ils obligatoires ?",
    answer:
      "Non, les supplements sont optionnels mais accelerent la recuperation. Les bases (magnesium, omega-3, vitamine D) sont quasi-universels. Les adaptogenes (ashwagandha, rhodiola) sont plus specifiques. Tout est explique avec dosages et timing dans votre rapport.",
  },
  {
    question: "Ce test remplace-t-il un diagnostic medical ?",
    answer:
      "Non. Notre test est un outil d'auto-evaluation, pas un diagnostic medical. Si vous suspectez un burnout severe, consultez un medecin ou psychologue du travail. Notre rapport peut servir de support pour cette consultation en documentant vos symptomes de maniere structuree.",
  },
  {
    question: "Combien de temps dure le questionnaire ?",
    answer:
      "Environ 8-10 minutes. Les 50 questions sont reparties en sections thematiques. Repondez honnetement, sans trop reflechir - votre premiere intuition est souvent la plus juste. Vous pouvez faire une pause et reprendre si necessaire.",
  },
  {
    question: "Mes donnees sont-elles confidentielles ?",
    answer:
      "Absolument. Vos reponses et resultats sont strictement confidentiels, stockes de maniere securisee et conformes RGPD. Ils ne sont jamais partages avec des tiers (employeur, assurance, etc.). Vous pouvez demander la suppression de vos donnees a tout moment.",
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

export default function BurnoutDetection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-purple-950 via-purple-900/50 to-black py-20 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-800/20 via-transparent to-transparent" />

          {/* Subtle pattern */}
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
                <Badge className="mb-6 bg-purple-500/20 text-purple-300 border-purple-500/30">
                  <Brain className="mr-2 h-3 w-3" />
                  Prevention
                </Badge>

                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl mb-6">
                  Burnout Detection.
                  <span className="block text-purple-400 mt-2">
                    Detecte avant la crise.
                  </span>
                </h1>

                <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                  Le burnout ne previent pas. Mais on peut le detecter avant qu'il
                  ne soit trop tard. Questionnaire neuro-endocrinien + protocole
                  de sortie personnalise.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/burnout-detection">
                    <Button
                      size="lg"
                      className="gap-2 h-14 px-8 text-lg bg-purple-500 hover:bg-purple-600 w-full sm:w-auto"
                    >
                      Evaluer mon risque
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>

                <p className="mt-6 text-sm text-gray-500">
                  8-10 minutes - Resultats immediats
                </p>
              </motion.div>

              {/* Right - Score Visualization */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                {/* Score mockup */}
                <div className="relative mx-auto w-[300px] sm:w-[340px]">
                  <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2rem] p-6 shadow-2xl">
                    {/* Score circle */}
                    <div className="relative w-48 h-48 mx-auto mb-6">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          className="text-gray-700"
                        />
                        <circle
                          cx="96"
                          cy="96"
                          r="88"
                          stroke="url(#gradient)"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={`${0.45 * 553} ${553}`}
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#f97316" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-5xl font-bold text-white">45</span>
                        <span className="text-sm text-gray-400">sur 100</span>
                      </div>
                    </div>

                    {/* Phase indicator */}
                    <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-3">
                        <BatteryWarning className="h-5 w-5 text-orange-400" />
                        <div>
                          <p className="font-semibold text-orange-400">Phase 2 : Resistance</p>
                          <p className="text-xs text-gray-400">Intervention recommandee</p>
                        </div>
                      </div>
                    </div>

                    {/* Mini stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-800 rounded-lg p-2">
                        <p className="text-xs text-gray-500">Physique</p>
                        <p className="text-sm font-semibold text-amber-400">52</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-2">
                        <p className="text-xs text-gray-500">Mental</p>
                        <p className="text-sm font-semibold text-orange-400">48</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-2">
                        <p className="text-xs text-gray-500">Emotionnel</p>
                        <p className="text-sm font-semibold text-purple-400">38</p>
                      </div>
                    </div>
                  </div>
                  {/* Glow */}
                  <div className="absolute -inset-4 bg-purple-500/20 blur-3xl rounded-full -z-10" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Burnout Phases */}
        <section className="py-20 lg:py-28 border-b border-border/30">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-16">
              <div className="flex items-center justify-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-muted-foreground">Les 3 phases du burnout</span>
              </div>
              <h2 className="text-3xl font-bold mb-4">
                Ou en es-tu vraiment ?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Le burnout evolue en 3 phases distinctes. Plus tu detectes tot,
                plus la recuperation est rapide.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {burnoutPhases.map((phase, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card
                    className="h-full"
                    style={{
                      borderColor:
                        phase.color === "amber"
                          ? "rgba(245, 158, 11, 0.3)"
                          : phase.color === "orange"
                            ? "rgba(249, 115, 22, 0.3)"
                            : "rgba(239, 68, 68, 0.3)",
                    }}
                  >
                    <CardContent className="p-6">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <Badge
                          style={{
                            backgroundColor:
                              phase.color === "amber"
                                ? "rgba(245, 158, 11, 0.1)"
                                : phase.color === "orange"
                                  ? "rgba(249, 115, 22, 0.1)"
                                  : "rgba(239, 68, 68, 0.1)",
                            color:
                              phase.color === "amber"
                                ? "#f59e0b"
                                : phase.color === "orange"
                                  ? "#f97316"
                                  : "#ef4444",
                            borderColor:
                              phase.color === "amber"
                                ? "rgba(245, 158, 11, 0.3)"
                                : phase.color === "orange"
                                  ? "rgba(249, 115, 22, 0.3)"
                                  : "rgba(239, 68, 68, 0.3)",
                          }}
                        >
                          Phase {phase.phase}
                        </Badge>
                        <phase.icon
                          className="h-5 w-5"
                          style={{
                            color:
                              phase.color === "amber"
                                ? "#f59e0b"
                                : phase.color === "orange"
                                  ? "#f97316"
                                  : "#ef4444",
                          }}
                        />
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold mb-2">{phase.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {phase.description}
                      </p>

                      {/* Symptoms */}
                      <div className="space-y-2 mb-4">
                        {phase.symptoms.map((symptom, j) => (
                          <div key={j} className="flex items-center gap-2 text-sm">
                            <TrendingDown className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{symptom}</span>
                          </div>
                        ))}
                      </div>

                      {/* Recovery time */}
                      <div
                        className="flex items-center gap-2 text-sm p-3 rounded-lg"
                        style={{
                          backgroundColor:
                            phase.color === "amber"
                              ? "rgba(245, 158, 11, 0.05)"
                              : phase.color === "orange"
                                ? "rgba(249, 115, 22, 0.05)"
                                : "rgba(239, 68, 68, 0.05)",
                        }}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Recuperation : <strong>{phase.recovery}</strong>
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* What's Included */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              {/* Left - Features */}
              <div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                  Ce qui est inclus
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Un bilan complet de ton etat neuro-endocrinien avec un protocole
                  de sortie actionnable immediatement.
                </p>

                <div className="grid gap-4">
                  {features.map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Card className="hover:border-border transition-colors">
                        <CardContent className="p-4 flex items-start gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10">
                            <feature.icon className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1">{feature.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {feature.description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right - Price card */}
              <div className="lg:sticky lg:top-8">
                <Card className="bg-gradient-to-b from-purple-500/10 to-transparent border-purple-500/30">
                  <CardContent className="p-8">
                    <div className="text-center mb-8">
                      <div className="flex items-baseline justify-center gap-2 mb-2">
                        <span className="text-6xl font-bold text-purple-400">49€</span>
                      </div>
                      <p className="text-muted-foreground">Paiement unique</p>
                    </div>

                    <div className="space-y-3 mb-8">
                      {[
                        "Questionnaire 50 questions",
                        "Score burnout 0-100",
                        "Detection phase (1, 2 ou 3)",
                        "Profil hormonal estime",
                        "Protocole 4 semaines",
                        "Dashboard temps reel",
                        "Rapport PDF 18 pages",
                        "Recommandations supplements",
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Check className="h-5 w-5 text-purple-400 shrink-0" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>

                    <Link href="/burnout-detection">
                      <Button
                        size="lg"
                        className="w-full gap-2 h-14 bg-purple-500 hover:bg-purple-600"
                      >
                        Evaluer mon risque
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </Link>

                    <p className="text-center text-sm text-muted-foreground mt-4">
                      8-10 minutes - Resultats immediats
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* 4-Week Protocol */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-muted/30 to-transparent">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Protocole de sortie 4 semaines
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Adapte a ta phase de burnout. Chaque semaine cible un aspect cle de
                la recuperation.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {recoveryProtocol.map((week, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="h-full hover:border-purple-500/30 transition-colors">
                    <CardContent className="p-6">
                      {/* Week number */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 font-bold">
                          {week.week}
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                          <week.icon className="h-5 w-5 text-purple-400" />
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-lg mb-1">{week.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {week.focus}
                      </p>

                      {/* Actions */}
                      <div className="space-y-2">
                        {week.actions.map((action, j) => (
                          <div key={j} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">{action}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Note */}
            <Card className="mt-8 bg-purple-500/5 border-purple-500/20 max-w-3xl mx-auto">
              <CardContent className="p-6 flex items-start gap-4">
                <Shield className="h-6 w-6 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm leading-relaxed">
                    <strong>Note :</strong> Le protocole est adapte a ta phase de
                    burnout. En phase 1-2, les 4 semaines peuvent suffire. En phase 3,
                    c'est le debut d'un processus plus long. Consulte un professionnel
                    de sante si necessaire.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Stats / Social Proof */}
        <section className="py-16 border-y border-border/30">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              {[
                { value: "2.8M", label: "Francais en burnout", color: "red" },
                { value: "72%", label: "Ne le detectent pas a temps", color: "orange" },
                { value: "3-12", label: "Mois de recuperation (phase 3)", color: "amber" },
                { value: "4 sem", label: "Notre protocole de sortie", color: "purple" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <p
                    className="text-4xl font-bold mb-2"
                    style={{
                      color:
                        stat.color === "red"
                          ? "#ef4444"
                          : stat.color === "orange"
                            ? "#f97316"
                            : stat.color === "amber"
                              ? "#f59e0b"
                              : "#a855f7",
                    }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 lg:py-28 bg-muted/20">
          <div className="mx-auto max-w-3xl px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Questions frequentes</h2>
              <p className="text-muted-foreground">
                Tout ce que tu dois savoir sur Burnout Detection
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
                    Avertissement important
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Ce test est un outil d'auto-evaluation, pas un diagnostic medical.
                    Si vous presentez des symptomes severes de burnout (pensees negatives
                    persistantes, incapacite a fonctionner, symptomes physiques importants),
                    consultez un medecin ou un professionnel de sante mentale sans attendre.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-purple-950/50 to-black text-center">
          <div className="mx-auto max-w-3xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Battery className="h-16 w-16 text-purple-400 mx-auto mb-8" />
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                Ne laisse pas le burnout gagner
              </h2>
              <p className="text-xl text-gray-400 mb-10">
                8-10 minutes de questionnaire peuvent t'eviter des mois de recuperation.
              </p>

              <Link href="/burnout-detection">
                <Button
                  size="lg"
                  className="gap-2 h-16 px-12 text-lg bg-purple-500 hover:bg-purple-600"
                >
                  <Brain className="h-5 w-5" />
                  Evaluer mon risque maintenant
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>100% confidentiel</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span>Resultats immediats</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Base sur la science</span>
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
            <p className="text-2xl font-bold text-purple-400">49€</p>
            <p className="text-xs text-muted-foreground">Paiement unique</p>
          </div>
          <Link href="/burnout-detection">
            <Button className="gap-2 bg-purple-500 hover:bg-purple-600">
              Evaluer mon risque
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
