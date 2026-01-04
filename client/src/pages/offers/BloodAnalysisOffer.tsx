/**
 * NEUROCORE 360 - Blood Analysis Offer Page
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
  Beaker,
  ArrowRight,
  Check,
  Upload,
  Brain,
  Target,
  TrendingUp,
  AlertTriangle,
  Shield,
  FileText,
  Activity,
  ChevronDown,
  Zap,
  Clock,
  Lock,
  Heart,
  Flame,
  Droplets,
  Pill,
  Eye,
  Microscope,
  BarChart3,
  Sparkles,
} from "lucide-react";

// Biomarker categories with details
const biomarkerCategories = [
  {
    id: "cardiovascular",
    name: "Sante Cardiovasculaire",
    count: 12,
    color: "red",
    markers: [
      "Apolipoproteine B (ApoB)",
      "LDL Cholesterol",
      "HDL Cholesterol",
      "Triglycerides",
      "Total Cholesterol",
      "Non-HDL Cholesterol",
      "LDL Pattern",
      "LDL Particle Number",
      "Lipoproteine (a)",
      "Cholesterol/HDL Ratio",
      "hs-CRP",
      "Homocysteine",
    ],
  },
  {
    id: "thyroid",
    name: "Profil Thyroidien",
    count: 5,
    color: "purple",
    markers: [
      "TSH (Thyroid Stimulating Hormone)",
      "T4 Libre",
      "T3 Libre",
      "T3 Reverse",
      "Anticorps Anti-TPO",
    ],
  },
  {
    id: "hormonal",
    name: "Panel Hormonal",
    count: 8,
    color: "amber",
    markers: [
      "Testosterone Totale",
      "Testosterone Libre",
      "SHBG",
      "Estradiol (E2)",
      "DHEA-S",
      "Cortisol",
      "IGF-1",
      "Prolactine",
    ],
  },
  {
    id: "metabolic",
    name: "Sante Metabolique",
    count: 6,
    color: "emerald",
    markers: [
      "Glycemie a jeun",
      "HbA1c",
      "Insuline a jeun",
      "HOMA-IR (calcule)",
      "Peptide-C",
      "Fructosamine",
    ],
  },
  {
    id: "liver",
    name: "Fonction Hepatique",
    count: 6,
    color: "orange",
    markers: [
      "ALT (SGPT)",
      "AST (SGOT)",
      "GGT",
      "Bilirubine Totale",
      "Albumine",
      "Phosphatase Alcaline",
    ],
  },
  {
    id: "kidney",
    name: "Fonction Renale",
    count: 5,
    color: "blue",
    markers: [
      "Creatinine",
      "eGFR",
      "Uree (BUN)",
      "Acide Urique",
      "Ratio Albumine/Creatinine",
    ],
  },
  {
    id: "nutrients",
    name: "Vitamines & Mineraux",
    count: 8,
    color: "cyan",
    markers: [
      "Vitamine D (25-OH)",
      "Vitamine B12",
      "Folate (B9)",
      "Ferritine",
      "Fer Serique",
      "Magnesium RBC",
      "Zinc",
      "Selenium",
    ],
  },
  {
    id: "inflammation",
    name: "Marqueurs Inflammatoires",
    count: 4,
    color: "rose",
    markers: [
      "CRP ultra-sensible",
      "Homocysteine",
      "Ferritine",
      "Fibrinogene",
    ],
  },
];

// Clinical patterns we detect
const clinicalPatterns = [
  {
    name: "Low Testosterone Syndrome",
    description: "Testosterone basse + SHBG elevee + FSH/LH anormaux",
    icon: TrendingUp,
    color: "amber",
  },
  {
    name: "Hypothyroidie Subclinique",
    description: "TSH haute-normale + T3/T4 basses + T3 reverse elevee",
    icon: Activity,
    color: "purple",
  },
  {
    name: "Resistance a l'Insuline",
    description: "HOMA-IR > 2.5 + Triglycerides hauts + HDL bas",
    icon: Flame,
    color: "orange",
  },
  {
    name: "Inflammation Chronique",
    description: "hs-CRP elevee + Homocysteine haute + Ferritine anormale",
    icon: Heart,
    color: "red",
  },
  {
    name: "Deficience Nutritionnelle",
    description: "Vitamine D < 40 + B12 basse + Ferritine suboptimale",
    icon: Droplets,
    color: "cyan",
  },
  {
    name: "Stress Surrenalien",
    description: "Cortisol eleve/bas + DHEA-S bas + Ratio cortisol/DHEA",
    icon: Brain,
    color: "emerald",
  },
];

// FAQ items
const faqItems = [
  {
    question: "Quels types de bilans sanguins acceptez-vous ?",
    answer:
      "Nous acceptons tous les bilans sanguins au format PDF provenant de laboratoires francais et internationaux. Que ce soit un bilan standard de medecine generale ou un panel hormonal complet, notre IA s'adapte. Les formats images (JPG, PNG) sont aussi acceptes mais le PDF offre une meilleure precision d'extraction.",
  },
  {
    question: "Quelle est la difference entre vos ranges et ceux du laboratoire ?",
    answer:
      "Les ranges de laboratoire sont bases sur la population generale - souvent en mauvaise sante. Nos ranges 'optimaux' sont derives des protocoles de medecine fonctionnelle (Peter Attia, Marek Health, Bryan Johnson) et representent les valeurs associees a une sante et longevite optimales. Exemple : TSH labo 0.4-4.0, optimal 0.5-2.0 mIU/L.",
  },
  {
    question: "Comment fonctionne la detection de patterns ?",
    answer:
      "Notre IA analyse les correlations entre vos biomarqueurs pour identifier des syndromes cliniques. Par exemple, une testosterone basse isolee n'a pas la meme signification qu'une testosterone basse + SHBG elevee + LH basse (qui suggere un probleme hypophysaire). Nous detectons 15+ patterns cliniques documentes.",
  },
  {
    question: "Les resultats sont-ils fiables ?",
    answer:
      "Notre analyse est basee sur la litterature medicale peer-reviewed et les protocoles des meilleurs praticiens en medecine fonctionnelle. Cependant, elle ne remplace PAS un avis medical. Utilisez nos resultats comme point de depart pour une discussion avec votre medecin ou endocrinologue.",
  },
  {
    question: "Combien de temps pour recevoir mon analyse ?",
    answer:
      "L'analyse est quasi-instantanee. Des que vous uploadez votre PDF, notre IA extrait les valeurs et genere votre rapport en moins de 2 minutes. Vous recevez immediatement votre rapport interactif + version PDF telechargeable.",
  },
  {
    question: "Que contient le protocole supplements ?",
    answer:
      "Base sur vos deficiences detectees, nous recommandons des supplements specifiques avec dosages, timing optimal, et interactions a eviter. Sources : Examine.com, publications scientifiques, protocoles Huberman Lab. Chaque recommandation est justifiee par une source.",
  },
  {
    question: "Puis-je analyser plusieurs bilans pour voir mon evolution ?",
    answer:
      "Oui ! Chaque analyse est independante (99€), mais nous recommandons de faire un suivi tous les 3-6 mois pour tracker vos progres. Une feature de comparaison temporelle sera bientot disponible dans votre dashboard.",
  },
  {
    question: "Mes donnees sont-elles securisees ?",
    answer:
      "Absolument. Vos PDFs sont traites de maniere securisee et ne sont jamais stockes apres analyse. Seuls les resultats extraits sont conserves dans votre compte. Nous sommes conformes RGPD et vos donnees de sante ne sont jamais partagees.",
  },
  {
    question: "Le paiement est-il securise ?",
    answer:
      "Oui, nous utilisons Stripe pour tous les paiements. Vos informations bancaires ne transitent jamais par nos serveurs. Stripe est certifie PCI-DSS niveau 1, le plus haut niveau de securite.",
  },
  {
    question: "Les 99€ sont-ils deduits si je prends un coaching ?",
    answer:
      "Oui ! Si vous decidez de prendre un coaching Essential (797€) ou Private Lab dans les 30 jours suivant votre Blood Analysis, les 99€ sont deduits du prix. C'est un investissement, pas une depense.",
  },
];

// Accordion component for biomarkers
function BiomarkerAccordion({
  category,
  isOpen,
  onToggle,
}: {
  category: (typeof biomarkerCategories)[0];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full bg-${category.color}-500`}
            style={{
              backgroundColor:
                category.color === "red"
                  ? "#ef4444"
                  : category.color === "purple"
                    ? "#a855f7"
                    : category.color === "amber"
                      ? "#f59e0b"
                      : category.color === "emerald"
                        ? "#10b981"
                        : category.color === "orange"
                          ? "#f97316"
                          : category.color === "blue"
                            ? "#3b82f6"
                            : category.color === "cyan"
                              ? "#06b6d4"
                              : "#f43f5e",
            }}
          />
          <span className="font-semibold">{category.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {category.count} marqueurs
          </Badge>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                {category.markers.map((marker, i) => (
                  <span
                    key={i}
                    className="text-xs px-3 py-1.5 rounded-full bg-muted/50 text-muted-foreground"
                  >
                    {marker}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// FAQ Accordion
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

export default function BloodAnalysisOffer() {
  const [openCategory, setOpenCategory] = useState<string | null>("cardiovascular");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-red-950 via-red-900/50 to-black py-20 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-800/20 via-transparent to-transparent" />

          {/* Subtle grid pattern */}
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
                <Badge className="mb-6 bg-red-500/20 text-red-300 border-red-500/30">
                  <Beaker className="mr-2 h-3 w-3" />
                  Blood Analysis
                </Badge>

                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl mb-6">
                  Decode ton sang.
                  <span className="block text-red-400 mt-2">
                    Ranges OPTIMAUX.
                  </span>
                </h1>

                <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                  Upload ton bilan sanguin. Notre IA l'analyse avec les ranges
                  utilises par Peter Attia, Marek Health et les meilleurs
                  praticiens en medecine fonctionnelle.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/blood-analysis">
                    <Button
                      size="lg"
                      className="gap-2 h-14 px-8 text-lg bg-red-500 hover:bg-red-600 w-full sm:w-auto"
                    >
                      <Upload className="h-5 w-5" />
                      Analyser mon bilan
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>

                <p className="mt-6 text-sm text-gray-500">
                  Resultats en moins de 2 minutes
                </p>
              </motion.div>

              {/* Right - Product Mockup */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                {/* Phone mockup with blood results */}
                <div className="relative mx-auto w-[280px] sm:w-[320px]">
                  {/* Phone frame */}
                  <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-[3rem] p-3 shadow-2xl">
                    {/* Screen */}
                    <div className="bg-black rounded-[2.5rem] overflow-hidden">
                      {/* Status bar */}
                      <div className="h-8 bg-black flex items-center justify-center">
                        <div className="w-20 h-5 bg-gray-800 rounded-full" />
                      </div>
                      {/* Content */}
                      <div className="p-4 space-y-3">
                        {/* Blood Age Card */}
                        <div className="bg-gradient-to-br from-red-900/50 to-red-950 rounded-2xl p-4 text-center">
                          <p className="text-xs text-gray-400 mb-1">Blood Age</p>
                          <p className="text-5xl font-bold text-white">32</p>
                          <p className="text-xs text-emerald-400 mt-1">
                            4.2 ans plus jeune
                          </p>
                        </div>
                        {/* Biomarkers */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-900 rounded-xl p-3">
                            <p className="text-[10px] text-gray-500">Testosterone</p>
                            <p className="text-sm font-semibold text-emerald-400">
                              687 ng/dL
                            </p>
                          </div>
                          <div className="bg-gray-900 rounded-xl p-3">
                            <p className="text-[10px] text-gray-500">Vitamine D</p>
                            <p className="text-sm font-semibold text-amber-400">
                              38 ng/mL
                            </p>
                          </div>
                          <div className="bg-gray-900 rounded-xl p-3">
                            <p className="text-[10px] text-gray-500">hs-CRP</p>
                            <p className="text-sm font-semibold text-emerald-400">
                              0.4 mg/L
                            </p>
                          </div>
                          <div className="bg-gray-900 rounded-xl p-3">
                            <p className="text-[10px] text-gray-500">HbA1c</p>
                            <p className="text-sm font-semibold text-emerald-400">
                              5.1%
                            </p>
                          </div>
                        </div>
                        {/* Pattern Alert */}
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-medium text-amber-400">
                              Pattern detecte
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Vitamine D suboptimale
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Glow effect */}
                  <div className="absolute -inset-4 bg-red-500/20 blur-3xl rounded-full -z-10" />
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
                De l'upload a l'analyse complete en moins de 2 minutes
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: 1,
                  title: "Upload ton bilan",
                  description:
                    "Televerse ton PDF de bilan sanguin. Compatible avec tous les laboratoires francais et internationaux.",
                  icon: Upload,
                  color: "red",
                },
                {
                  step: 2,
                  title: "Analyse IA",
                  description:
                    "Notre IA extrait les valeurs, les compare aux ranges optimaux et detecte les patterns cliniques.",
                  icon: Brain,
                  color: "purple",
                },
                {
                  step: 3,
                  title: "Recois ton rapport",
                  description:
                    "Rapport interactif + PDF avec protocole supplements personnalise et sources scientifiques.",
                  icon: FileText,
                  color: "emerald",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="h-full bg-gradient-to-b from-muted/50 to-transparent border-border/50 hover:border-border transition-colors">
                    <CardContent className="p-8">
                      <div className="flex items-start gap-4 mb-6">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl`}
                          style={{
                            backgroundColor:
                              item.color === "red"
                                ? "rgba(239, 68, 68, 0.1)"
                                : item.color === "purple"
                                  ? "rgba(168, 85, 247, 0.1)"
                                  : "rgba(16, 185, 129, 0.1)",
                          }}
                        >
                          <item.icon
                            className="h-6 w-6"
                            style={{
                              color:
                                item.color === "red"
                                  ? "#ef4444"
                                  : item.color === "purple"
                                    ? "#a855f7"
                                    : "#10b981",
                            }}
                          />
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">
                          ETAPE {item.step}
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* What's Included - Biomarkers */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-start">
              {/* Left - Title and description */}
              <div className="lg:sticky lg:top-8">
                <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                  Un dashboard.
                  <span className="block text-red-400">50+ biomarqueurs.</span>
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Nous analysons tous les marqueurs de ton bilan avec des ranges
                  optimaux bases sur la medecine fonctionnelle. Clique sur chaque
                  categorie pour voir les marqueurs inclus.
                </p>

                {/* Price card */}
                <Card className="bg-gradient-to-b from-red-500/10 to-transparent border-red-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-5xl font-bold text-red-400">99€</span>
                      <span className="text-muted-foreground">paiement unique</span>
                    </div>
                    <p className="text-sm text-red-400 mb-6">
                      Deduit de ton coaching Essential ou Private Lab
                    </p>
                    <Link href="/blood-analysis">
                      <Button
                        size="lg"
                        className="w-full gap-2 bg-red-500 hover:bg-red-600"
                      >
                        Analyser mon bilan
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>

              {/* Right - Biomarker accordions */}
              <div className="space-y-3">
                {biomarkerCategories.map((category) => (
                  <BiomarkerAccordion
                    key={category.id}
                    category={category}
                    isOpen={openCategory === category.id}
                    onToggle={() =>
                      setOpenCategory(
                        openCategory === category.id ? null : category.id
                      )
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Beyond Standard Testing */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-muted/30 to-transparent">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Au-dela des normes de laboratoire
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Les normes labo sont basees sur la population malade. Nous
                utilisons les ranges des praticiens de pointe.
              </p>
            </div>

            {/* Comparison example */}
            <Card className="max-w-3xl mx-auto mb-16 overflow-hidden">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-2">
                  {/* Lab norms */}
                  <div className="p-8 bg-muted/30">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-3 h-3 rounded-full bg-gray-500" />
                      <span className="font-semibold text-muted-foreground">
                        Normes Laboratoire
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">TSH</p>
                        <p className="font-mono">0.40 - 4.00 mIU/L</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Testosterone (H)
                        </p>
                        <p className="font-mono">250 - 1100 ng/dL</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Vitamine D</p>
                        <p className="font-mono">30 - 100 ng/mL</p>
                      </div>
                    </div>
                  </div>
                  {/* Optimal ranges */}
                  <div className="p-8 bg-gradient-to-br from-red-500/10 to-red-900/10">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="font-semibold text-red-400">
                        Ranges Optimaux
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">TSH</p>
                        <p className="font-mono text-red-400">0.50 - 2.00 mIU/L</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Testosterone (H)
                        </p>
                        <p className="font-mono text-red-400">500 - 900 ng/dL</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Vitamine D</p>
                        <p className="font-mono text-red-400">40 - 60 ng/mL</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key differentiators */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  icon: Target,
                  title: "Ranges Optimaux",
                  desc: "Pas les normes labo",
                },
                {
                  icon: Microscope,
                  title: "50+ Biomarqueurs",
                  desc: "Analyse complete",
                },
                {
                  icon: BarChart3,
                  title: "Pattern Detection",
                  desc: "15+ syndromes",
                },
                {
                  icon: Pill,
                  title: "Protocole Supplements",
                  desc: "Personnalise",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="text-center h-full">
                    <CardContent className="p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 mx-auto mb-4">
                        <item.icon className="h-6 w-6 text-red-400" />
                      </div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Clinical Patterns */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">
                Detection de patterns cliniques
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Notre IA ne regarde pas les marqueurs isolement. Elle detecte les
                correlations qui revelent des syndromes sous-jacents.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clinicalPatterns.map((pattern, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="h-full hover:border-border transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                          style={{
                            backgroundColor:
                              pattern.color === "amber"
                                ? "rgba(245, 158, 11, 0.1)"
                                : pattern.color === "purple"
                                  ? "rgba(168, 85, 247, 0.1)"
                                  : pattern.color === "orange"
                                    ? "rgba(249, 115, 22, 0.1)"
                                    : pattern.color === "red"
                                      ? "rgba(239, 68, 68, 0.1)"
                                      : pattern.color === "cyan"
                                        ? "rgba(6, 182, 212, 0.1)"
                                        : "rgba(16, 185, 129, 0.1)",
                          }}
                        >
                          <pattern.icon
                            className="h-5 w-5"
                            style={{
                              color:
                                pattern.color === "amber"
                                  ? "#f59e0b"
                                  : pattern.color === "purple"
                                    ? "#a855f7"
                                    : pattern.color === "orange"
                                      ? "#f97316"
                                      : pattern.color === "red"
                                        ? "#ef4444"
                                        : pattern.color === "cyan"
                                          ? "#06b6d4"
                                          : "#10b981",
                            }}
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">{pattern.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {pattern.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
                Tout ce que tu dois savoir sur Blood Analysis
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
                    Disclaimer Medical
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Cette analyse ne remplace pas une consultation medicale. Les
                    recommandations sont a titre informatif et educatif. Consultez
                    votre medecin ou un professionnel de sante qualifie pour toute
                    decision therapeutique. Ne modifiez jamais un traitement en cours
                    sans avis medical.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 lg:py-28 bg-gradient-to-b from-red-950/50 to-black text-center">
          <div className="mx-auto max-w-3xl px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Beaker className="h-16 w-16 text-red-400 mx-auto mb-8" />
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
                Pret a decoder ton sang ?
              </h2>
              <p className="text-xl text-gray-400 mb-10">
                Upload ton PDF, recois ton analyse complete en moins de 2 minutes.
              </p>

              <Link href="/blood-analysis">
                <Button
                  size="lg"
                  className="gap-2 h-16 px-12 text-lg bg-red-500 hover:bg-red-600"
                >
                  <Upload className="h-5 w-5" />
                  Analyser mon bilan sanguin
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
                  <Zap className="h-4 w-4" />
                  <span>Resultats instantanes</span>
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
            <p className="text-2xl font-bold text-red-400">99€</p>
            <p className="text-xs text-muted-foreground">Paiement unique</p>
          </div>
          <Link href="/blood-analysis">
            <Button className="gap-2 bg-red-500 hover:bg-red-600">
              Analyser mon bilan
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
