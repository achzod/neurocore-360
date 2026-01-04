/**
 * NEUROCORE 360 - Audit Premium Offer Page
 */

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
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
} from "lucide-react";

const features = [
  "15 sections d'analyse completes",
  "Analyse photos (posture, composition corporelle)",
  "Profil Hormonal complet",
  "Analyse HRV & Recuperation",
  "Digestion & Microbiome",
  "Profil Neurotransmetteurs",
  "Protocole Nutrition detaille",
  "Protocole Supplements personnalise",
  "Feuille de Route 90 Jours",
  "Rapport PDF exportable",
];

const sections = [
  { icon: Target, name: "Profil de Base", color: "emerald" },
  { icon: Activity, name: "Composition Corporelle", color: "blue" },
  { icon: Flame, name: "Metabolisme & Energie", color: "orange" },
  { icon: Heart, name: "HRV & Cardiaque", color: "red" },
  { icon: Brain, name: "Neurotransmetteurs", color: "purple" },
  { icon: Pill, name: "Supplements", color: "cyan" },
];

export default function AuditPremium() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-emerald-900 to-black py-20 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-800/30 via-transparent to-transparent" />

          <div className="relative mx-auto max-w-5xl px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Badge className="mb-6 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                <Crown className="mr-2 h-3 w-3" />
                Le + Populaire
              </Badge>

              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl mb-6">
                Audit Premium
                <span className="block text-emerald-400">79€ - Analyse complete</span>
              </h1>

              <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
                L'analyse metabolique la plus complete. 15 domaines d'expertise,
                analyse photos, protocoles personnalises. Deduit de ton coaching.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/audit-complet/questionnaire">
                  <Button size="lg" className="gap-2 h-14 px-8 text-lg bg-emerald-500 hover:bg-emerald-600">
                    Commencer l'audit Premium
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>

              <p className="mt-6 text-sm text-emerald-400">
                Deduit de ton coaching Essential ou Private Lab
              </p>
            </motion.div>
          </div>
        </section>

        {/* Price Card */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-5xl px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left - Pricing */}
              <Card className="border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <div className="text-6xl font-bold text-emerald-400 mb-2">79€</div>
                    <p className="text-muted-foreground">Paiement unique</p>
                  </div>

                  <div className="space-y-3 mb-8">
                    {features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Check className="h-5 w-5 text-emerald-400 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Link href="/audit-complet/questionnaire">
                    <Button size="lg" className="w-full gap-2 bg-emerald-500 hover:bg-emerald-600">
                      Choisir Premium
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Right - Sections */}
              <div>
                <h2 className="text-2xl font-bold mb-6">15 Domaines d'analyse</h2>
                <div className="grid grid-cols-2 gap-4">
                  {sections.map((section, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border"
                    >
                      <section.icon className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{section.name}</span>
                    </motion.div>
                  ))}
                  <div className="col-span-2 text-center p-4 text-muted-foreground text-sm">
                    + 9 autres domaines d'analyse
                  </div>
                </div>

                {/* Photo Analysis */}
                <Card className="mt-6 border-primary/20">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Camera className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Analyse Photos incluse</h3>
                      <p className="text-sm text-muted-foreground">
                        Posture, composition corporelle, asymetries detectees par IA
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-emerald-500/5 border-y border-emerald-500/20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <Crown className="h-12 w-12 text-emerald-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">L'analyse complete pour 79€</h2>
            <p className="text-muted-foreground mb-8">
              Montant deduit si tu prends un coaching par la suite. C'est un investissement, pas une depense.
            </p>
            <Link href="/audit-complet/questionnaire">
              <Button size="lg" className="gap-2 h-14 px-8 bg-emerald-500 hover:bg-emerald-600">
                Lancer mon audit Premium
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
