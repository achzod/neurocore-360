import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ChevronDown, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "Qu'est-ce que l'audit NEUROCORE 360° ?",
    answer: "L'audit NEUROCORE 360° est une analyse métabolique complète basée sur 180+ questions couvrant 15 domaines : nutrition, entraînement, sommeil, hormones, digestion, stress, biomécanique posturale, et plus. Tu reçois un rapport de 40+ pages avec des protocoles cliniques personnalisés (pas de 'mange mieux' générique). Chaque recommandation est basée sur tes biomarqueurs, ton profil hormonal, et ta flexibilité métabolique."
  },
  {
    question: "Ai-je besoin d'une prise de sang pour commencer ?",
    answer: "Non, la prise de sang n'est pas obligatoire pour démarrer. L'audit initial se base sur un questionnaire approfondi et l'analyse de tes photos (composition corporelle, posture). Cependant, si tu as des bilans récents (< 6 mois), partage-les : je les décoderai pour identifier déséquilibres hormonaux (Testostérone, SHBG, Cortisol/DHEA, Thyroïde), inflammatoires (CRP, Ferritine) et métaboliques (Glycémie, HbA1c, Profil lipidique). Si tu n'as pas de bilans, je te recommanderai les analyses pertinentes selon ton profil."
  },
  {
    question: "Combien de temps dure l'analyse complète ?",
    answer: "Le questionnaire prend 25-35 minutes à remplir (prends ton temps, la précision est clé). Une fois soumis, tu reçois ton rapport complet sous 5-7 jours ouvrés. Le rapport inclut : scores par domaine, analyses approfondies, cause racine de tes blocages, protocoles cliniques sur 90 jours, et plan de supplémentation biodisponible."
  },
  {
    question: "Qui analyse mes résultats ?",
    answer: "Moi, Achzod. Coach sportif d'élite avec 11 certifications internationales (ISSA CPT, Nutrition, Bodybuilding, Transformation, PreScript Level 1, Precision Nutrition, NASM, ACE, FMS, TRX, Kettlebell). Je ne délègue rien : chaque audit est rédigé manuellement, personnalisé à 100%, en me basant sur 8+ ans d'expérience en coaching métabolique et réathlétisation."
  },
  {
    question: "Quelle est la différence avec un nutritionniste classique ?",
    answer: "Les nutritionnistes donnent souvent des plans macro génériques. NEUROCORE 360°, c'est une approche neuro-endocrinienne : je ne te dis pas 'mange équilibré', je t'explique pourquoi ton ratio Cortisol/DHEA élevé bloque ta lipolyse, comment ton CYP1A2 (génétique caféine) impacte ton système nerveux, ou pourquoi tes envies de sucre à 15h signalent une hypoglycémie réactionnelle. Chaque recommandation a un mécanisme biologique précis. Pas de platitudes, que de la clinique."
  },
  {
    question: "Est-ce adapté aux débutants ?",
    answer: "Absolument. NEUROCORE 360° s'adapte à tous les niveaux : débutant complet, intermédiaire bloqué en stagnation, ou athlète avancé voulant optimiser les derniers %. Le questionnaire détecte automatiquement ton niveau et mes protocoles sont progressifs. Si tu débutes, je construis des fondations solides (split training 3-4x/sem, chrono-nutrition simple, sommeil architecture). Si tu es avancé, j'optimise via timing péri-workout, cycling glucidique, gestion HRV."
  },
  {
    question: "Les suppléments sont-ils obligatoires ?",
    answer: "Non, jamais obligatoires. Mais je recommande ceux qui ont un ROI prouvé selon TON profil : si tu dors mal + stress élevé → Magnésium Bisglycinate 400mg + Glycine 3g le soir (pas du Magnésium Marin mal absorbé). Si HRV < 30ms + fatigue centrale → Rhodiola + Ashwagandha KSM-66. Je privilégie toujours l'alimentation d'abord, suppléments ensuite pour combler carences documentées. Budget 50-150€/mois selon besoins."
  },
  {
    question: "Comment se passe le suivi après l'audit ?",
    answer: "Le rapport inclut un plan 90 jours avec 3 phases progressives. Tu peux implémenter seul (le rapport est ultra-détaillé), ou opter pour un coaching suivi 1-to-1 : check-ins hebdomadaires, ajustements en temps réel selon ta progression, analyse de tes nouveaux bilans sanguins. Le coaching n'est pas inclus dans l'audit de base mais disponible en option."
  },
  {
    question: "Puis-je faire l'audit si j'ai des problèmes de santé ?",
    answer: "Oui, mais avec nuances. Si tu as des pathologies diagnostiquées (diabète, hypertension, hypothyroïdie sous traitement), l'audit peut t'aider à optimiser ton mode de vie EN COMPLÉMENT de ton suivi médical (je ne remplace jamais ton médecin). Je travaille souvent avec des clients sous traitement hormonal, métabolique, ou thyroïdien. Si problème aigu non diagnostiqué, je te redirige vers spécialiste avant de commencer."
  },
  {
    question: "Quel est le prix de l'audit complet ?",
    answer: "L'Audit NEUROCORE 360° Standard (questionnaire + rapport 40 pages + protocoles 90j) est à 97€. L'Audit Premium (idem + analyse photos détaillée + décodage bilans sanguins si fournis + vidéo personnalisée 15min) est à 197€. Le coaching suivi mensuel (4 sessions/mois + support WhatsApp) est à 397€/mois. Rapport qualité/prix imbattable pour ce niveau d'expertise clinique."
  },
  {
    question: "Que se passe-t-il si je ne suis pas satisfait ?",
    answer: "Garantie satisfait ou remboursé 14 jours. Si le rapport ne répond pas à tes attentes ou n'apporte pas de valeur concrète, je te rembourse intégralement, sans question. Mon taux de satisfaction est > 97% (vérifie les témoignages), donc je prends ce risque sans problème."
  },
  {
    question: "L'audit remplace-t-il un bilan sanguin médical ?",
    answer: "Non, l'audit ne remplace pas un diagnostic médical. Je ne diagnostique pas de pathologies. Mon expertise : interpréter tes biomarqueurs dans une optique performance/optimisation (pas pathologie). Si je détecte des signaux inquiétants (ex: TSH > 4.5, Ferritine < 30, HbA1c pré-diabétique), je te recommande une consultation médicale. Mon rôle = optimiser ce qui est 'normal mais sous-optimal' selon les standards cliniques de performance."
  }
];

function FAQAccordion({ faq, index }: { faq: FAQItem; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="border-b border-white/10"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-start justify-between gap-8 py-8 text-left transition-colors hover:text-primary"
      >
        <h3 className="text-xl font-semibold text-white lg:text-2xl">
          {faq.question}
        </h3>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="shrink-0 pt-1"
        >
          <ChevronDown className="h-6 w-6 text-primary" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="pb-8 text-base leading-relaxed text-gray-400 lg:text-lg lg:leading-relaxed">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQ() {
  return (
    <div className="min-h-screen bg-black">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32">
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
                Still got questions?
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
                Tout ce que tu dois savoir sur l'audit NEUROCORE 360°, les protocoles cliniques,
                et comment optimiser ta biologie.
              </p>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="relative pb-20 lg:pb-32">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="space-y-0">
              {faqs.map((faq, index) => (
                <FAQAccordion key={index} faq={faq} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative border-t border-white/10 py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <MessageCircle className="mx-auto h-12 w-12 text-primary" />
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Tu as d'autres questions ?
              </h2>
              <p className="text-lg text-gray-400">
                Contacte-moi directement pour discuter de ton cas spécifique.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
                <Link href="/audit-complet/questionnaire">
                  <Button size="lg" className="gap-2">
                    Lancer mon audit 360°
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Parler à un expert
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
