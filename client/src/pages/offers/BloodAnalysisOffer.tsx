/**
 * NEUROCORE 360 - Blood Analysis Offer Page
 * Upload PDF, AI analysis with optimal ranges
 */

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
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
} from "lucide-react";

const features = [
  "Upload ton PDF de bilan sanguin",
  "Extraction automatique des valeurs",
  "Ranges OPTIMAUX vs normes labo",
  "Detection patterns (Low T, Thyroid, Insuline...)",
  "Radar de risques par categorie",
  "Protocole supplements personnalise",
  "Sources scientifiques citees",
  "Rapport PDF exportable",
];

const biomarkerCategories = [
  { name: "Hormonal", count: 10, examples: "Testosterone, Cortisol, DHEA-S, IGF-1" },
  { name: "Thyroide", count: 5, examples: "TSH, T3 libre, T4 libre, Anti-TPO" },
  { name: "Metabolique", count: 9, examples: "Glycemie, HbA1c, Insuline, ApoB" },
  { name: "Inflammatoire", count: 5, examples: "CRP-us, Homocysteine, Ferritine" },
  { name: "Vitamines", count: 5, examples: "Vitamine D, B12, Magnesium, Zinc" },
  { name: "Hepatique/Renal", count: 5, examples: "ALT, AST, Creatinine, eGFR" },
];

const patterns = [
  { name: "Low Testosterone", desc: "Testo basse + SHBG elevee + FSH/LH anormaux" },
  { name: "Thyroid Slowdown", desc: "TSH haute + T3/T4 basses + T3 reverse elevee" },
  { name: "Insulin Resistance", desc: "HOMA-IR eleve + Triglycerides hauts + HDL bas" },
  { name: "Chronic Inflammation", desc: "CRP elevee + Homocysteine haute + Ferritine anormale" },
];

export default function BloodAnalysisOffer() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-red-900 to-black py-20 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-800/30 via-transparent to-transparent" />

          <div className="relative mx-auto max-w-5xl px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Badge className="mb-6 bg-red-500/20 text-red-300 border-red-500/30">
                <Beaker className="mr-2 h-3 w-3" />
                Blood Analysis
              </Badge>

              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl mb-6">
                Decode ton sang
                <span className="block text-red-400">99€ - Ranges OPTIMAUX</span>
              </h1>

              <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
                Upload ton PDF de bilan sanguin. Notre IA l'analyse avec les ranges utilises
                par Peter Attia, Marek Health, et les meilleurs coaches en biohacking.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/blood-analysis">
                  <Button size="lg" className="gap-2 h-14 px-8 text-lg bg-red-500 hover:bg-red-600">
                    <Upload className="h-5 w-5" />
                    Uploader mon bilan
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Why Optimal Ranges */}
        <section className="py-16 border-b border-border/30">
          <div className="mx-auto max-w-5xl px-4">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-2xl font-bold mb-4">Ranges OPTIMAUX vs Normes Labo</h2>
                <p className="text-muted-foreground mb-6">
                  Les normes de laboratoire sont basees sur la population generale - souvent malade ou suboptimale.
                  Nos ranges sont bases sur les protocoles des meilleurs praticiens en medecine fonctionnelle.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span><strong>Norme labo TSH:</strong> 0.4 - 4.0 mIU/L</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-primary">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span><strong>Range optimal:</strong> 0.5 - 2.0 mIU/L</span>
                  </div>
                </div>
              </div>
              <Card className="bg-gradient-to-b from-red-500/10 to-transparent border-red-500/30">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-red-400 mb-2">99€</div>
                    <p className="text-muted-foreground">Paiement unique</p>
                    <p className="text-sm text-red-400 mt-2">Deduit de ton coaching</p>
                  </div>
                  <Link href="/blood-analysis">
                    <Button size="lg" className="w-full gap-2 bg-red-500 hover:bg-red-600">
                      Analyser mon sang
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-5xl px-4">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Left - Features list */}
              <div>
                <h2 className="text-2xl font-bold mb-6">Ce qui est inclus</h2>
                <div className="space-y-3">
                  {features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Check className="h-5 w-5 text-red-400 shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right - Biomarkers */}
              <div>
                <h2 className="text-2xl font-bold mb-6">35+ Biomarqueurs analyses</h2>
                <div className="space-y-3">
                  {biomarkerCategories.map((cat, i) => (
                    <div key={i} className="p-4 rounded-xl bg-muted/30 border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{cat.name}</span>
                        <Badge variant="outline">{cat.count} marqueurs</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{cat.examples}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Patterns Detection */}
        <section className="py-16 bg-muted/20">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-2xl font-bold mb-8 text-center">Detection de patterns cliniques</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {patterns.map((pattern, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <h3 className="font-semibold text-sm">{pattern.name}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{pattern.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Disclaimer + CTA */}
        <section className="py-16 bg-red-500/5 border-y border-red-500/20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <Card className="bg-amber-500/10 border-amber-500/20 mb-8">
              <CardContent className="p-4 flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-left">
                  <strong className="text-amber-600">Disclaimer medical:</strong> Cette analyse ne remplace pas
                  une consultation medicale. Les recommandations sont a titre informatif. Consulte ton medecin
                  pour toute decision therapeutique.
                </p>
              </CardContent>
            </Card>

            <Beaker className="h-12 w-12 text-red-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Pret a decoder ton sang ?</h2>
            <p className="text-muted-foreground mb-8">
              Upload ton PDF, l'IA fait le reste. Resultats en moins de 5 minutes.
            </p>
            <Link href="/blood-analysis">
              <Button size="lg" className="gap-2 h-14 px-8 bg-red-500 hover:bg-red-600">
                <Upload className="h-5 w-5" />
                Uploader mon bilan sanguin
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
