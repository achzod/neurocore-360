/**
 * NEUROCORE 360 - Pro Panel Offer Page
 */

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
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
} from "lucide-react";

const features = [
  "Tout le Premium inclus (15 sections)",
  "Sync wearables (Oura, Whoop, Garmin, Apple...)",
  "Analyse HRV avancee",
  "Donnees sommeil automatiques",
  "Questions blessures & douleurs",
  "Protocole rehabilitation",
  "Analyse mobilite articulaire",
  "Acces coach prioritaire",
  "Suivi evolution dans le temps",
];

const wearables = [
  { name: "Apple Health", color: "#000000" },
  { name: "Oura Ring", color: "#C9A962" },
  { name: "Whoop", color: "#00A86B" },
  { name: "Garmin", color: "#007DC3" },
  { name: "Fitbit", color: "#00B0B9" },
  { name: "Ultrahuman", color: "#FF4F00" },
];

const extras = [
  { icon: Bone, title: "Blessures & Douleurs", desc: "15 questions sur tes douleurs, mobilite, historique" },
  { icon: Activity, title: "HRV Avancee", desc: "SDNN, RMSSD, coherence cardiaque, variabilite nocturne" },
  { icon: Heart, title: "Sommeil Detaille", desc: "Phases REM, profond, leger, latence, reveils" },
  { icon: Brain, title: "Rehabilitation", desc: "Protocole personnalise pour corriger tes desequilibres" },
];

export default function ProPanel() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-amber-900 to-black py-20 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-800/30 via-transparent to-transparent" />

          <div className="relative mx-auto max-w-5xl px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Badge className="mb-6 bg-amber-500/20 text-amber-300 border-amber-500/30">
                <Zap className="mr-2 h-3 w-3" />
                Elite
              </Badge>

              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl mb-6">
                Pro Panel
                <span className="block text-amber-400">149€ - L'analyse ultime</span>
              </h1>

              <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
                Tout le Premium + sync wearables + analyse blessures.
                Pour ceux qui veulent le maximum de precision.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/audit-complet/questionnaire?tier=elite">
                  <Button size="lg" className="gap-2 h-14 px-8 text-lg bg-amber-500 hover:bg-amber-600 text-black">
                    Choisir Pro Panel
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>

              <p className="mt-6 text-sm text-amber-400">
                Deduit de ton coaching Private Lab
              </p>
            </motion.div>
          </div>
        </section>

        {/* Wearables */}
        <section className="py-12 border-b border-border/30 bg-black">
          <div className="mx-auto max-w-5xl px-4">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Watch className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Compatible avec</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {wearables.map((w, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="px-4 py-2 rounded-full border bg-white/5"
                  style={{ borderColor: w.color + "50" }}
                >
                  <span className="text-sm font-medium" style={{ color: w.color }}>
                    {w.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-5xl px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left - Pricing */}
              <Card className="border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent sticky top-8">
                <CardContent className="p-8">
                  <div className="flex items-center gap-2 mb-4">
                    <Crown className="h-5 w-5 text-emerald-400" />
                    <span className="text-sm text-emerald-400">Inclut tout le Premium</span>
                  </div>

                  <div className="text-center mb-8">
                    <div className="text-6xl font-bold text-amber-400 mb-2">149€</div>
                    <p className="text-muted-foreground">Paiement unique</p>
                  </div>

                  <div className="space-y-3 mb-8">
                    {features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-amber-400 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link href="/audit-complet/questionnaire?tier=elite">
                    <Button size="lg" className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-black">
                      Choisir Pro Panel
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Right - Extras */}
              <div>
                <h2 className="text-2xl font-bold mb-6">Ce qui fait la difference</h2>
                <div className="space-y-4">
                  {extras.map((extra, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Card>
                        <CardContent className="flex items-start gap-4 p-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
                            <extra.icon className="h-6 w-6 text-amber-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{extra.title}</h3>
                            <p className="text-sm text-muted-foreground">{extra.desc}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <Card className="mt-6 bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <p className="text-sm">
                      <strong className="text-primary">Pour qui ?</strong> Athletes, biohackers avances,
                      ceux qui trackent deja leurs donnees et veulent une analyse expert de tout.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-amber-500/5 border-y border-amber-500/20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <Zap className="h-12 w-12 text-amber-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">L'analyse la plus complete du marche</h2>
            <p className="text-muted-foreground mb-8">
              149€ deduits de ton coaching Private Lab. L'investissement le plus rentable pour ta sante.
            </p>
            <Link href="/audit-complet/questionnaire?tier=elite">
              <Button size="lg" className="gap-2 h-14 px-8 bg-amber-500 hover:bg-amber-600 text-black">
                Lancer mon Pro Panel
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
