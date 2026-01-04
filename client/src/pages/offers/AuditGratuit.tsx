/**
 * NEUROCORE 360 - Audit Gratuit Offer Page
 */

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Star,
  ArrowRight,
  Check,
  Lock,
  FileText,
  Target,
  Activity,
  Zap,
  Clock,
} from "lucide-react";

const features = [
  { text: "Resume Executif personnalise", included: true },
  { text: "Analyse Anthropometrique", included: true },
  { text: "Profil Metabolique de Base", included: true },
  { text: "Plan d'Action 30 Jours", included: true },
  { text: "Profil Hormonal complet", included: false },
  { text: "Analyse HRV & Recuperation", included: false },
  { text: "Digestion & Microbiome", included: false },
  { text: "Protocole Supplements", included: false },
  { text: "10 autres sections", included: false },
];

const stats = [
  { value: "180", label: "Questions" },
  { value: "15", label: "Domaines" },
  { value: "4", label: "Sections debloques" },
  { value: "5min", label: "A remplir" },
];

export default function AuditGratuit() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-black py-20 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/30 via-transparent to-transparent" />

          <div className="relative mx-auto max-w-5xl px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Badge className="mb-6 bg-slate-500/20 text-slate-300 border-slate-500/30">
                <Star className="mr-2 h-3 w-3" />
                Offre Decouverte
              </Badge>

              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl mb-6">
                Audit Gratuit
                <span className="block text-slate-400">180 questions, 15 domaines</span>
              </h1>

              <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
                Decouvre NEUROCORE 360 sans engagement. Reponds au questionnaire complet
                et accede a 4 sections d'analyse gratuitement.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/audit-complet/questionnaire">
                  <Button size="lg" className="gap-2 h-14 px-8 text-lg">
                    Commencer maintenant
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>

              <p className="mt-6 text-sm text-gray-500">
                Aucune carte bancaire requise
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 border-b border-border/30">
          <div className="mx-auto max-w-5xl px-4">
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
                  <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-5xl px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left - What's included */}
              <div>
                <h2 className="text-2xl font-bold mb-6">Ce qui est inclus</h2>
                <div className="space-y-3">
                  {features.map((feature, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        feature.included
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {feature.included ? (
                        <Check className="h-5 w-5 text-primary shrink-0" />
                      ) : (
                        <Lock className="h-5 w-5 shrink-0" />
                      )}
                      <span className={feature.included ? "" : "line-through"}>
                        {feature.text}
                      </span>
                      {!feature.included && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          Premium
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right - How it works */}
              <div>
                <h2 className="text-2xl font-bold mb-6">Comment ca marche</h2>
                <div className="space-y-6">
                  {[
                    {
                      icon: FileText,
                      title: "1. Remplis le questionnaire",
                      desc: "180 questions sur 15 domaines: sommeil, nutrition, hormones, stress...",
                    },
                    {
                      icon: Activity,
                      title: "2. L'IA analyse ton profil",
                      desc: "Notre moteur Claude analyse tes reponses et genere un rapport personnalise.",
                    },
                    {
                      icon: Target,
                      title: "3. Recois tes resultats",
                      desc: "Acces immediat a 4 sections. Upgrade pour tout debloquer.",
                    },
                  ].map((step, i) => (
                    <Card key={i}>
                      <CardContent className="flex gap-4 p-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <step.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{step.title}</h3>
                          <p className="text-sm text-muted-foreground">{step.desc}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary/5 border-y border-primary/20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <Zap className="h-12 w-12 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Pret a decouvrir ton profil ?</h2>
            <p className="text-muted-foreground mb-8">
              C'est 100% gratuit. Tu pourras upgrader plus tard si tu veux tout debloquer.
            </p>
            <Link href="/audit-complet/questionnaire">
              <Button size="lg" className="gap-2 h-14 px-8">
                Lancer mon audit gratuit
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
