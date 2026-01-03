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
    answer: "L'audit NEUROCORE 360° est une analyse métabolique complète couvrant 15 domaines : sommeil, hormones, digestion, stress, nutrition, training, biomécanique et plus. Selon ton plan (Gratuit, Essential ou Elite), tu reçois un rapport de 8 à 25+ sections avec des protocoles personnalisés basés sur tes données réelles, pas des conseils génériques."
  },
  {
    question: "Quelle est la différence entre Gratuit, Essential et Elite ?",
    answer: "GRATUIT (0€) : 50 questions essentielles + dashboard interactif + scores des 5 domaines + radar de performance. Tu obtiens une vue d'ensemble de ton profil. ESSENTIAL (49€) : 150 questions approfondies + rapport AI 17 sections + axes cliniques (thyroïde, SII...) + stack suppléments personnalisé + plan 90 jours. Le meilleur rapport qualité/prix. ELITE (99€) : 210+ questions ultra-détaillées + rapport 25+ sections + sync Apple Watch/Oura/Garmin + analyse photo AI (posture, composition) + nutrition timing avancé + support prioritaire. L'expérience complète."
  },
  {
    question: "Comment fonctionne la synchronisation wearables (Elite) ?",
    answer: "Avec le plan Elite, tu connectes tes wearables via Terra API. CONNEXION DIRECTE (1 clic) : Oura, Garmin, Fitbit, Ultrahuman, Withings. VIA TERRA AVENGERS APP (gratuite) : Apple Health, Samsung Health, Google Fit - tu télécharges l'app sur ton téléphone, tu autorises l'accès, et c'est synchro automatiquement. On récupère : HRV, sommeil (profond/REM/léger), fréquence cardiaque, SpO2, activité. Ces données enrichissent ton analyse pour des recommandations ultra-précises basées sur ta biologie réelle."
  },
  {
    question: "L'analyse photo AI, ça marche comment ?",
    answer: "Disponible avec le plan Elite. Tu uploades 2-3 photos (face, profil, dos) et notre AI analyse : posture (épaules, bassin, lordose), composition corporelle estimée, asymétries musculaires, points de tension. Le rapport intègre ensuite des recommandations correctives personnalisées."
  },
  {
    question: "Ai-je besoin d'une prise de sang ?",
    answer: "Non, l'audit se base sur le questionnaire (et tes wearables/photos pour Elite). Si tu as des bilans récents, partage-les : je les décoderai pour identifier déséquilibres hormonaux, inflammatoires et métaboliques. Sinon, selon ton profil, je recommanderai les analyses pertinentes."
  },
  {
    question: "Combien de temps pour recevoir mon rapport ?",
    answer: "Le questionnaire prend 10-35 min selon le plan choisi. Ton rapport AI est généré sous 24-48h. Le rapport inclut scores par domaine, analyses approfondies, cause racine des blocages, et protocoles sur 90 jours (Essential/Elite)."
  },
  {
    question: "Qui analyse mes résultats ?",
    answer: "Notre AI spécialisée, entraînée par Achzod (coach certifié ISSA, Precision Nutrition, PreScript Level 1). Chaque rapport est généré avec une expertise clinique de 8+ ans en coaching métabolique. L'AI produit des recommandations personnalisées à 100% basées sur TES données."
  },
  {
    question: "Est-ce adapté aux débutants ?",
    answer: "Absolument. Le questionnaire détecte automatiquement ton niveau. Si tu débutes → fondations solides (split 3-4x/sem, nutrition simple, sommeil). Si tu es avancé → optimisations fines (timing péri-workout, cycling glucidique, HRV). Le plan Gratuit est parfait pour commencer."
  },
  {
    question: "Les suppléments sont-ils obligatoires ?",
    answer: "Non. Mais avec Essential/Elite, tu reçois un stack personnalisé avec dosages précis selon TON profil. Ex: stress + sommeil → Magnésium Bisglycinate 400mg + Glycine 3g le soir. Budget estimé : 50-100€/mois si besoin."
  },
  {
    question: "C'est un paiement unique ou un abonnement ?",
    answer: "Paiement unique. Gratuit = 0€ pour toujours. Essential = 49€ une fois. Elite = 99€ une fois. Pas d'abonnement caché. Tu gardes l'accès à ton rapport à vie."
  },
  {
    question: "Que se passe-t-il si je ne suis pas satisfait ?",
    answer: "Garantie satisfait ou remboursé 14 jours sur Essential et Elite. Si le rapport n'apporte pas de valeur, remboursement intégral sans question. Notre taux de satisfaction est > 97%."
  },
  {
    question: "Puis-je upgrader mon plan après ?",
    answer: "Oui ! Tu peux commencer Gratuit pour découvrir, puis passer à Essential ou Elite quand tu veux. Ton questionnaire est sauvegardé, tu ne refais que les questions supplémentaires du nouveau plan."
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
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
                <span className="text-xs font-medium tracking-widest text-white/60 uppercase">
                  FAQ
                </span>
              </div>
              <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
                Questions fréquentes
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
                Tout ce que tu dois savoir sur les 3 formules NEUROCORE 360° : Gratuit, Essential et Elite.
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
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-black" />
              </div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Prêt à découvrir ton potentiel ?
              </h2>
              <p className="text-lg text-gray-400">
                Commence gratuitement ou passe directement à Essential/Elite.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
                <Link href="/audit-complet/questionnaire?plan=free">
                  <Button size="lg" variant="outline" className="gap-2">
                    Gratuit (0€)
                  </Button>
                </Link>
                <Link href="/audit-complet/questionnaire?plan=essential">
                  <Button size="lg" className="gap-2 bg-primary text-black hover:bg-primary/90">
                    Essential (49€)
                  </Button>
                </Link>
                <Link href="/audit-complet/questionnaire?plan=elite">
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:opacity-90">
                    Elite (99€)
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
