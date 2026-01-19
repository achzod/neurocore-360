/**
 * APEXLABS - Peptides Engine
 * Offre premium 99€
 */

import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Check, FlaskConical, Zap, Shield, BookOpen, Activity, HeartPulse } from "lucide-react";

const FEATURE_LIST = [
  "Questionnaire precis 6 sections",
  "Protocoles peptides sur mesure",
  "Dosages + timing + durees",
  "Sources et controle qualite",
  "Stack supplements synergique",
  "Ebook peptides offert",
];

const DELIVERABLES = [
  {
    title: "Cartographie peptides",
    description: "Priorites, contraintes, risques et ordre d'execution.",
    icon: FlaskConical,
  },
  {
    title: "Protocoles actionnables",
    description: "Plan clair semaine par semaine, sans blabla.",
    icon: Zap,
  },
  {
    title: "Sources fiables",
    description: "Ou acheter + criteres de qualite pour eviter les erreurs.",
    icon: Shield,
  },
];

const PIPELINE = [
  {
    title: "1. Questionnaire",
    description: "Je capture objectifs, historique, contraintes et donnees.",
    icon: Activity,
  },
  {
    title: "2. Diagnostic",
    description: "Je priorise les axes a corriger et les peptides adaptes.",
    icon: HeartPulse,
  },
  {
    title: "3. Protocole",
    description: "Tu reçois un plan execute + ebook en bonus.",
    icon: BookOpen,
  },
];

export default function PeptidesEngine() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400 border border-amber-500/30 rounded-full px-3 py-1">
              Peptides Engine • 99€
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mt-4 leading-tight">
              Le protocole peptides qui te fait gagner du temps.
            </h1>
            <p className="text-lg text-white/70 mt-4">
              Tu donnes tes infos, je construis un protocole clair, avec les bons peptides,
              les dosages et les sources fiables. Pas de flou, pas de jargon inutile.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mt-6">
              {FEATURE_LIST.map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-white/80">
                  <Check className="h-4 w-4 text-amber-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/peptides-engine">
                <a className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-3 rounded-full transition">
                  Lancer Peptides Engine
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Link>
              <span className="text-sm text-white/60">Ebook peptides offert</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-amber-500/10 via-black to-black"
          >
            <div className="grid gap-4">
              {DELIVERABLES.map((card) => (
                <div key={card.title} className="p-4 rounded-xl border border-white/10 bg-black/60">
                  <card.icon className="h-6 w-6 text-amber-400 mb-2" />
                  <h3 className="font-semibold">{card.title}</h3>
                  <p className="text-sm text-white/60 mt-1">{card.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Pipeline */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Comment ca se passe</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {PIPELINE.map((step) => (
              <div key={step.title} className="p-6 rounded-xl border border-white/10 bg-white/5">
                <step.icon className="h-6 w-6 text-amber-400 mb-3" />
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-white/60 mt-1">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ebook */}
        <div className="mt-16 p-8 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-black">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold">Ebook offert avec chaque Peptides Engine</h3>
              <p className="text-white/70 mt-2">
                "Anabolic Code" – la science interdite de l'HGH, de l'IGF-1 et des peptides.
              </p>
            </div>
            <Link href="https://www.achzodcoaching.com/product/anabolic-code-la-science-interdite-de-lhgh-de-ligf-1-et-des-peptides-au-service-de-ta-mutation-corporelle">
              <a className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300">
                Voir l'ebook
                <ArrowRight className="h-4 w-4" />
              </a>
            </Link>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400 border border-amber-500/30 rounded-full px-3 py-1">
            Peptides Engine • 99€
          </div>
          <h2 className="text-3xl font-bold mt-4">Pret a passer a l'action ?</h2>
          <p className="text-white/60 mt-3">Je prends ton cas et je construis le protocole.</p>
          <div className="mt-6">
            <Link href="/peptides-engine">
              <a className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6 py-3 rounded-full transition">
                Commencer maintenant
                <ArrowRight className="h-4 w-4" />
              </a>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
