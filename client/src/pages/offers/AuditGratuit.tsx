/**
 * NEUROCORE 360 - Discovery Scan Offer Page (ex Audit Gratuit)
 * Ultrahuman-style premium sales page - FREE
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
  Compass,
  ArrowRight,
  Check,
  Lock,
  FileText,
  Target,
  Activity,
  Zap,
  Clock,
  ChevronDown,
  Shield,
  Star,
  Sparkles,
  Gift,
  TrendingUp,
  Brain,
  BarChart3,
} from "lucide-react";

// What's included in Discovery Scan (free) - DIAGNOSTIC ONLY, NO RECOMMENDATIONS
const discoveryFeatures = [
  { text: "Detection de tes blocages", desc: "On identifie ce qui te freine" },
  { text: "Patterns problematiques reveles", desc: "Habitudes qui sabotent tes resultats" },
  { text: "Desequilibres identifies", desc: "Energie, sommeil, metabolisme" },
  { text: "Score global sur 100", desc: "Ton niveau actuel mesure" },
  { text: "Rapport diagnostic 5-7 pages", desc: "Ce qui va pas, sans les solutions" },
];

// What's included in Anabolic Bioscan (59€) - DIAGNOSTIC + PROTOCOLS
const anabolicFeatures = [
  { text: "Tout le Discovery Scan", desc: "Diagnostic complet inclus" },
  { text: "5 protocoles personnalises", desc: "Matin, soir, digestion, bureau, training" },
  { text: "Stack Supplements avec dosages", desc: "Exactement quoi prendre et quand" },
  { text: "Plan 30-60-90 jours", desc: "Roadmap semaine par semaine" },
  { text: "Recommandations precises", desc: "Quoi faire pour corriger chaque probleme" },
  { text: "Rapport action 25-30 pages", desc: "Diagnostic + Solutions detaillees" },
];

// What's included in Ultimate Scan (79€) - DIAGNOSTIC + PROTOCOLS + PHOTO ANALYSIS
const ultimateFeatures = [
  { text: "Tout l'Anabolic Bioscan", desc: "Diagnostic + Protocoles inclus" },
  { text: "Analyse photo posturale", desc: "Composition corporelle, morphotype" },
  { text: "Analyse biomecanique complete", desc: "Psoas, diaphragme, sangle profonde" },
  { text: "18 sections ultra-detaillees", desc: "Rapport 40-50 pages complet" },
  { text: "Support prioritaire", desc: "Reponse sous 24h" },
];

// How it works steps
const howItWorks = [
  {
    step: 1,
    title: "Reponds au questionnaire",
    description: "50 questions sur ton mode de vie, alimentation, sommeil et energie. 10 minutes max.",
    icon: FileText,
    color: "slate",
  },
  {
    step: 2,
    title: "On detecte tes problemes",
    description: "Tes reponses revelent tes blocages, patterns problematiques et desequilibres caches.",
    icon: Brain,
    color: "purple",
  },
  {
    step: 3,
    title: "Tu recois ton diagnostic",
    description: "Rapport complet de ce qui va pas. Pour les solutions, upgrade vers Anabolic ou Ultimate.",
    icon: BarChart3,
    color: "emerald",
  },
];

// Stats
const stats = [
  { value: "50", label: "Questions", icon: FileText },
  { value: "5", label: "Domaines analyses", icon: Target },
  { value: "10min", label: "A completer", icon: Clock },
  { value: "0€", label: "100% gratuit", icon: Gift },
];

// FAQ items
const faqItems = [
  {
    question: "Pourquoi c'est gratuit ?",
    answer:
      "Le Discovery Scan est notre porte d'entree. Il te permet de decouvrir la qualite de nos analyses sans engagement. Si tu veux aller plus loin, tu peux upgrader vers l'Anabolic Bioscan (79€) qui couvre 15 domaines au lieu de 5.",
  },
  {
    question: "Quelle est la difference avec l'Anabolic Bioscan ?",
    answer:
      "Le Discovery Scan couvre 5 domaines essentiels avec 50 questions. L'Anabolic Bioscan (79€) couvre 15 domaines avec 180+ questions, analyse photos, profils hormonaux/neurotransmetteurs estimes, protocole supplements detaille et feuille de route 90 jours.",
  },
  {
    question: "Dois-je creer un compte ?",
    answer:
      "Tu peux commencer le questionnaire sans compte. Pour sauvegarder tes resultats et y acceder plus tard, tu devras creer un compte gratuit avec ton email a la fin du questionnaire.",
  },
  {
    question: "Mes donnees sont-elles securisees ?",
    answer:
      "Oui, tes reponses sont stockees de maniere securisee et conformes RGPD. Elles ne sont jamais partagees avec des tiers. Tu peux demander la suppression de tes donnees a tout moment.",
  },
  {
    question: "Puis-je upgrader plus tard ?",
    answer:
      "Oui ! Apres ton Discovery Scan, tu peux upgrader vers l'Anabolic Bioscan (79€) ou l'Ultimate Scan (149€) a tout moment depuis ton dashboard. Tes reponses precedentes seront conservees.",
  },
  {
    question: "Le rapport est-il vraiment personnalise ?",
    answer:
      "Oui, chaque rapport est genere en fonction de TES reponses specifiques. Ce n'est pas un template generique. Les recommandations sont adaptees a ton profil unique basees sur les dernieres recherches en sante metabolique.",
  },
  {
    question: "Combien de temps pour recevoir mon rapport ?",
    answer:
      "Le rapport est genere instantanement apres completion du questionnaire. Tu y accedes immediatement dans ton dashboard, avec possibilite de telecharger en PDF.",
  },
  {
    question: "Puis-je refaire le scan ?",
    answer:
      "Oui, tu peux refaire le Discovery Scan autant de fois que tu veux gratuitement. C'est utile pour suivre ton evolution tous les 2-3 mois.",
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

export default function AuditGratuit() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800/50 to-black py-20 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-700/20 via-transparent to-transparent" />

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
                <Badge className="mb-6 bg-primary/20 text-primary border-primary/30">
                  <Gift className="mr-2 h-3 w-3" />
                  100% Gratuit
                </Badge>

                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl mb-6">
                  Discovery Scan.
                  <span className="block text-primary mt-2">
                    On te dit ce qui va pas.
                  </span>
                </h1>

                <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                  Diagnostic complet de tes blocages, patterns problematiques et desequilibres.
                  Sans recommandations - juste la verite sur ton profil.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/audit-complet/questionnaire?plan=free">
                    <Button
                      size="lg"
                      className="gap-2 h-14 px-8 text-lg w-full sm:w-auto"
                    >
                      <Compass className="h-5 w-5" />
                      Commencer gratuitement
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>

                <p className="mt-6 text-sm text-gray-500">
                  Aucune carte bancaire requise
                </p>
              </motion.div>

              {/* Right - Report Preview */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <div className="relative mx-auto w-[300px] sm:w-[340px]">
                  {/* Report mockup */}
                  <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <p className="text-xs text-gray-500">NEUROCORE 360</p>
                        <p className="font-bold text-white">Discovery Scan</p>
                      </div>
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                        Gratuit
                      </Badge>
                    </div>

                    {/* Score */}
                    <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-6 mb-4 text-center">
                      <p className="text-xs text-gray-400 mb-1">Score Global</p>
                      <p className="text-5xl font-bold text-white">72</p>
                      <p className="text-xs text-primary mt-1">sur 100</p>
                    </div>

                    {/* Mini sections */}
                    <div className="space-y-2">
                      {[
                        { name: "Profil de Base", score: 78, color: "emerald" },
                        { name: "Composition Corporelle", score: 65, color: "amber" },
                        { name: "Metabolisme & Energie", score: 71, color: "blue" },
                      ].map((section, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                        >
                          <span className="text-sm text-gray-300">{section.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-700 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${section.score}%`,
                                  backgroundColor:
                                    section.color === "emerald"
                                      ? "#10b981"
                                      : section.color === "amber"
                                        ? "#f59e0b"
                                        : "#3b82f6",
                                }}
                              />
                            </div>
                            <span
                              className="text-sm font-semibold"
                              style={{
                                color:
                                  section.color === "emerald"
                                    ? "#10b981"
                                    : section.color === "amber"
                                      ? "#f59e0b"
                                      : "#3b82f6",
                              }}
                            >
                              {section.score}
                            </span>
                          </div>
                        </div>
                      ))}
                      {/* Locked sections */}
                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg opacity-50">
                        <span className="text-sm text-gray-500">Nutrition & Tracking</span>
                        <Lock className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg opacity-50">
                        <span className="text-sm text-gray-500">Digestion & Microbiome</span>
                        <Lock className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                  </div>
                  {/* Glow */}
                  <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full -z-10" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 border-b border-border/30">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <stat.icon className="h-5 w-5 text-primary" />
                    <span className="text-3xl font-bold text-primary">{stat.value}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Comment ca marche</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Du questionnaire au rapport en moins de 15 minutes
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {howItWorks.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="h-full bg-gradient-to-b from-muted/50 to-transparent">
                    <CardContent className="p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-sm">
                          {step.step}
                        </div>
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor:
                              step.color === "slate"
                                ? "rgba(100, 116, 139, 0.1)"
                                : step.color === "purple"
                                  ? "rgba(168, 85, 247, 0.1)"
                                  : "rgba(16, 185, 129, 0.1)",
                          }}
                        >
                          <step.icon
                            className="h-5 w-5"
                            style={{
                              color:
                                step.color === "slate"
                                  ? "#64748b"
                                  : step.color === "purple"
                                    ? "#a855f7"
                                    : "#10b981",
                            }}
                          />
                        </div>
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
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

        {/* What's Included - 3 Columns Comparison */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-muted/30 to-transparent">
          <div className="mx-auto max-w-7xl px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Compare les offres</h2>
              <p className="text-muted-foreground">Choisis le niveau d'analyse adapte a tes objectifs</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 items-start">
              {/* Column 1 - Discovery Scan (Free) */}
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Check className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-bold">Discovery Scan</h3>
                  <Badge className="ml-auto bg-primary/20 text-primary">Gratuit</Badge>
                </div>
                <div className="space-y-3">
                  {discoveryFeatures.map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-4 flex items-start gap-3">
                          <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">{feature.text}</p>
                            <p className="text-xs text-muted-foreground">{feature.desc}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6">
                  <Link href="/audit-complet/questionnaire?plan=free">
                    <Button size="lg" className="gap-2 w-full">
                      <Compass className="h-5 w-5" />
                      Commencer gratuit
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Column 2 - Anabolic Bioscan (59€) */}
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="h-6 w-6 text-emerald-500" />
                  <h3 className="text-xl font-bold">Anabolic Bioscan</h3>
                  <Badge className="ml-auto bg-emerald-500/20 text-emerald-500">59€</Badge>
                </div>
                <div className="space-y-3">
                  {anabolicFeatures.map((feature, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="border-emerald-500/20 bg-emerald-500/5">
                        <CardContent className="p-4 flex items-start gap-3">
                          <Lock className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm">{feature.text}</p>
                            <p className="text-xs text-muted-foreground">{feature.desc}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-6">
                  <Link href="/offers/anabolic-bioscan">
                    <Button size="lg" variant="outline" className="gap-2 w-full border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10">
                      Voir Anabolic Bioscan
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Column 3 - Ultimate Scan (79€) - POPULAR */}
              <div className="relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <Badge className="bg-cyan-500 text-white">Populaire</Badge>
                </div>
                <Card className="border-cyan-500/50 bg-cyan-500/5 pt-4">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-6">
                      <Zap className="h-6 w-6 text-cyan-500" />
                      <h3 className="text-xl font-bold">Ultimate Scan</h3>
                      <Badge className="ml-auto bg-cyan-500/20 text-cyan-500">79€</Badge>
                    </div>
                    <div className="space-y-3">
                      {ultimateFeatures.map((feature, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                            <div className="flex items-start gap-3">
                              <Zap className="h-5 w-5 text-cyan-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium text-sm">{feature.text}</p>
                                <p className="text-xs text-muted-foreground">{feature.desc}</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    <div className="mt-6">
                      <Link href="/offers/ultimate-scan">
                        <Button size="lg" className="gap-2 w-full bg-cyan-500 hover:bg-cyan-600">
                          <Zap className="h-5 w-5" />
                          Obtenir Ultimate Scan
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 lg:py-28 bg-muted/20">
          <div className="mx-auto max-w-3xl px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Questions frequentes</h2>
              <p className="text-muted-foreground">
                Tout ce que tu dois savoir sur le Discovery Scan
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
        <section className="py-20 lg:py-28 bg-gradient-to-b from-slate-900/50 to-black text-center">
          <div className="mx-auto max-w-3xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Compass className="h-16 w-16 text-primary mx-auto mb-8" />
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                Pret a decouvrir ton profil ?
              </h2>
              <p className="text-xl text-gray-400 mb-10">
                10 minutes. Gratuit. Sans engagement. Commence maintenant.
              </p>

              <Link href="/audit-complet/questionnaire?plan=free">
                <Button size="lg" className="gap-2 h-16 px-12 text-lg">
                  <Compass className="h-5 w-5" />
                  Lancer mon Discovery Scan
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  <span>100% gratuit</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>10 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Sans carte bancaire</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
