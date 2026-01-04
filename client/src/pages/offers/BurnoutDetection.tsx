/**
 * NEUROCORE 360 - Burnout Detection Offer Page
 */

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
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
} from "lucide-react";

const features = [
  "Questionnaire neuro-endocrinien 50 questions",
  "Profil hormonal estime (cortisol, DHEA, thyroide)",
  "Score de risque burnout 0-100",
  "Detection phase: alarme, resistance, epuisement",
  "Protocole sortie 4 semaines",
  "Dashboard temps reel",
  "Rapport PDF 18 pages",
  "Suivi evolution recommande",
];

const phases = [
  {
    name: "Alarme",
    desc: "Stress aigu, activation du systeme sympathique",
    color: "amber",
    symptoms: ["Fatigue inhabituelle", "Troubles du sommeil", "Irritabilite"],
  },
  {
    name: "Resistance",
    desc: "Adaptation chronique, cortisol eleve",
    color: "orange",
    symptoms: ["Epuisement constant", "Difficulte concentration", "Infections frequentes"],
  },
  {
    name: "Epuisement",
    desc: "Burnout installe, crash hormonal",
    color: "red",
    symptoms: ["Incapacite a fonctionner", "Depression", "Problemes physiques"],
  },
];

const protocol = [
  { week: "Semaine 1", focus: "Reset nerveux", actions: "Respiration, deconnexion, sommeil prioritaire" },
  { week: "Semaine 2", focus: "Nutrition anti-stress", actions: "Magnesium, adaptogenes, anti-inflammatoire" },
  { week: "Semaine 3", focus: "Mouvement doux", actions: "Marche, yoga, etirements, nature" },
  { week: "Semaine 4", focus: "Reconstruction", actions: "Routines durables, limites, prevention" },
];

export default function BurnoutDetection() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-purple-900 to-black py-20 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-800/30 via-transparent to-transparent" />

          <div className="relative mx-auto max-w-5xl px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Badge className="mb-6 bg-purple-500/20 text-purple-300 border-purple-500/30">
                <Brain className="mr-2 h-3 w-3" />
                Prevention
              </Badge>

              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl mb-6">
                Burnout Detection
                <span className="block text-purple-400">49€ - Detecte avant la crise</span>
              </h1>

              <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
                Le burnout ne previent pas. Mais on peut le detecter avant qu'il ne soit trop tard.
                Questionnaire neuro-endocrinien + protocole de sortie personnalise.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/burnout-detection">
                  <Button size="lg" className="gap-2 h-14 px-8 text-lg bg-purple-500 hover:bg-purple-600">
                    Evaluer mon risque
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Warning Signs */}
        <section className="py-12 border-b border-border/30 bg-gradient-to-b from-black to-background">
          <div className="mx-auto max-w-5xl px-4">
            <div className="flex items-center justify-center gap-2 mb-8">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className="text-muted-foreground">Signes avant-coureurs a ne pas ignorer</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {phases.map((phase, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className={`border-${phase.color}-500/30 h-full`}>
                    <CardContent className="p-5">
                      <Badge className={`mb-3 bg-${phase.color}-500/20 text-${phase.color}-400 border-${phase.color}-500/30`}>
                        Phase {i + 1}
                      </Badge>
                      <h3 className="font-bold text-lg mb-1">{phase.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{phase.desc}</p>
                      <ul className="space-y-1">
                        {phase.symptoms.map((s, j) => (
                          <li key={j} className="text-xs text-muted-foreground flex items-center gap-2">
                            <TrendingDown className="h-3 w-3" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-5xl px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left - Pricing */}
              <Card className="border-purple-500/30 bg-gradient-to-b from-purple-500/10 to-transparent">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="text-6xl font-bold text-purple-400 mb-2">49€</div>
                    <p className="text-muted-foreground">Paiement unique</p>
                  </div>

                  <div className="space-y-3 mb-8">
                    {features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-purple-400 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link href="/burnout-detection">
                    <Button size="lg" className="w-full gap-2 bg-purple-500 hover:bg-purple-600">
                      Detecter mon risque
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Right - Protocol */}
              <div>
                <h2 className="text-2xl font-bold mb-6">Protocole de sortie 4 semaines</h2>
                <div className="space-y-4">
                  {protocol.map((p, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 font-bold text-sm">
                              {i + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{p.week}</span>
                                <Badge variant="outline" className="text-xs">{p.focus}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{p.actions}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <Card className="mt-6 bg-purple-500/5 border-purple-500/20">
                  <CardContent className="p-4 flex items-start gap-3">
                    <Shield className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                    <p className="text-sm">
                      Le protocole est adapte a ta phase de burnout. Plus tu detectes tot, plus la recuperation est rapide.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-purple-500/5 border-y border-purple-500/20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <Battery className="h-12 w-12 text-purple-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Ne laisse pas le burnout gagner</h2>
            <p className="text-muted-foreground mb-8">
              5 minutes de questionnaire peuvent t'eviter des mois de recuperation.
            </p>
            <Link href="/burnout-detection">
              <Button size="lg" className="gap-2 h-14 px-8 bg-purple-500 hover:bg-purple-600">
                <Brain className="h-5 w-5" />
                Evaluer mon risque maintenant
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
