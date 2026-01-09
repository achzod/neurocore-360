/**
 * APEXLABS - Deduction Coaching Page
 * Explains that 100% of the analysis cost is deducted from coaching
 */

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowRight,
  Check,
  Gift,
  Sparkles,
  Calculator,
  Crown,
  Zap,
  Target,
  ExternalLink,
} from "lucide-react";

export default function DeductionCoaching() {
  const examples = [
    {
      analysis: "Anabolic Bioscan",
      analysisPrice: 59,
      coaching: "Transform (3 mois)",
      coachingPrice: 247,
      finalPrice: 188,
      savings: 59,
    },
    {
      analysis: "Ultimate Scan",
      analysisPrice: 149,
      coaching: "Elite (6 mois)",
      coachingPrice: 497,
      finalPrice: 348,
      savings: 149,
    },
    {
      analysis: "Blood Analysis",
      analysisPrice: 99,
      coaching: "Transform (3 mois)",
      coachingPrice: 247,
      finalPrice: 148,
      savings: 99,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {/* Hero Section */}
        <section className="relative py-24 bg-gradient-to-b from-primary/5 via-background to-background overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(var(--primary-rgb),0.1),transparent_50%)]" />
          <div className="mx-auto max-w-4xl px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <Badge className="mb-4 bg-primary/10 text-primary gap-2">
                <Gift className="h-3 w-3" />
                Offre exclusive
              </Badge>
              <h1 className="mb-6 text-4xl font-black tracking-tight sm:text-5xl md:text-6xl">
                Montant <span className="text-primary">100% déduit</span>
                <br />
                de ton coaching
              </h1>
              <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
                Peu importe l'analyse que tu choisis, le montant sera intégralement déduit si tu décides de prendre un coaching avec moi.
              </p>

              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-sm text-amber-600 dark:text-amber-400">
                <Sparkles className="h-4 w-4" />
                <span>*Sauf formule Starter (1 mois)</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 bg-muted/30">
          <div className="mx-auto max-w-5xl px-4">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Comment ça marche ?</h2>
              <p className="text-muted-foreground">Un processus simple en 3 étapes</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Fais ton analyse",
                  description: "Choisis l'analyse qui te convient et obtiens ton rapport personnalisé.",
                  icon: Target,
                },
                {
                  step: "2",
                  title: "Découvre ton profil",
                  description: "Analyse tes résultats et identifie tes axes d'amélioration prioritaires.",
                  icon: Zap,
                },
                {
                  step: "3",
                  title: "Passe au coaching",
                  description: "Si tu veux aller plus loin, le montant de ton analyse est déduit de ta formule.",
                  icon: Crown,
                },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="h-full text-center">
                      <CardContent className="p-6">
                        <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="mb-2 text-sm font-bold text-primary">Étape {item.step}</div>
                        <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Examples */}
        <section className="py-16">
          <div className="mx-auto max-w-5xl px-4">
            <div className="mb-12 text-center">
              <Calculator className="h-10 w-10 text-primary mx-auto mb-4" />
              <h2 className="mb-4 text-3xl font-bold">Exemples concrets</h2>
              <p className="text-muted-foreground">Voici ce que ça donne en pratique</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {examples.map((example, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full overflow-hidden">
                    <div className="bg-primary/10 px-4 py-3">
                      <p className="text-sm font-bold text-center">{example.analysis}</p>
                    </div>
                    <CardContent className="p-6">
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Analyse</span>
                          <span>{example.analysisPrice}€</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{example.coaching}</span>
                          <span>{example.coachingPrice}€</span>
                        </div>
                        <div className="border-t border-border pt-3">
                          <div className="flex justify-between text-primary font-bold">
                            <span>Tu économises</span>
                            <span>-{example.savings}€</span>
                          </div>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2">
                          <span>Total coaching</span>
                          <span>{example.finalPrice}€</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Eligible plans */}
        <section className="py-16 bg-muted/30">
          <div className="mx-auto max-w-4xl px-4">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Formules éligibles</h2>
              <p className="text-muted-foreground">La déduction s'applique sur ces formules</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { name: "Transform", duration: "3 mois", price: "247€", eligible: true },
                { name: "Elite", duration: "6 mois", price: "497€", eligible: true },
                { name: "Private Lab", duration: "Sur mesure", price: "Sur devis", eligible: true },
                { name: "Starter", duration: "1 mois", price: "97€", eligible: false },
              ].map((plan, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                >
                  <Card className={`${!plan.eligible ? 'opacity-50' : ''}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${plan.eligible ? 'bg-primary/10' : 'bg-muted'}`}>
                          {plan.eligible ? (
                            <Check className="h-5 w-5 text-primary" />
                          ) : (
                            <span className="text-muted-foreground text-xs">✕</span>
                          )}
                        </div>
                        <div>
                          <p className="font-bold">{plan.name}</p>
                          <p className="text-sm text-muted-foreground">{plan.duration}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{plan.price}</p>
                        {!plan.eligible && (
                          <p className="text-xs text-muted-foreground">Non éligible</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-t from-primary/10 via-primary/5 to-background">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="mb-4 text-3xl font-bold">
              Prêt à commencer ?
            </h2>
            <p className="mb-8 text-lg text-muted-foreground">
              Fais ton analyse maintenant et récupère 100% de ton investissement sur ton futur coaching.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/#offers">
                <Button size="lg" className="gap-2">
                  Voir les analyses
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a
                href="https://www.achzodcoaching.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg" className="gap-2">
                  Découvrir le coaching
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
