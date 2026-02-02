import { useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChevronDown, MessageCircle, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "Qu'est-ce que APEXLABS exactement ?",
    answer: "APEXLABS est mon système d'analyse métabolique complet que j'ai développé après des années de coaching individuel. Il couvre 15+ domaines : sommeil, hormones, digestion, stress, nutrition, entraînement, biomécanique, neurotransmetteurs... Selon l'offre choisie (Discovery Scan gratuit, Anabolic Bioscan 59€, Ultimate Scan 79€, Blood Analysis 99€), tu reçois un rapport de 5 à 50+ pages avec des protocoles que j'ai créés et testés sur des centaines de clients."
  },
  {
    question: "Quelle est la différence entre les différentes offres ?",
    answer: "DISCOVERY SCAN (Gratuit) : ~66 questions, diagnostic global, dashboard interactif. Tu identifies tes blocages sans engagement. ANABOLIC BIOSCAN (59€) : 16 sections d'analyse, protocoles 30-60-90 jours, stack suppléments optimisé. Mon best-seller. ULTIMATE SCAN (79€) : Tout l'Anabolic + analyse photo (posture, composition corporelle) + wearables, 18 sections, rapport 40-50 pages. L'analyse la plus complète. BLOOD ANALYSIS (99€) : Upload ton bilan sanguin, je l'analyse avec des ranges optimaux de performance."
  },
  {
    question: "Comment fonctionne la synchronisation des wearables ?",
    answer: "Tu peux connecter Oura, Garmin, Fitbit, Apple Health, Google Fit, Samsung Health, Withings et Ultrahuman. WHOOP arrive bientôt. La connexion se fait en 1 clic pour la plupart des appareils. Je récupère tes données de HRV, sommeil (profond/REM/léger), fréquence cardiaque, SpO2 et activité. Ces données enrichissent ton analyse pour des recommandations ultra-précises basées sur ta biologie réelle, pas sur des moyennes génériques."
  },
  {
    question: "L'analyse photo, ça marche comment ?",
    answer: "Disponible avec l'Ultimate Scan. Tu uploades 2-3 photos (face, profil, dos) et j'analyse ta posture (épaules, bassin, lordose), j'estime ta composition corporelle, j'identifie les asymétries musculaires et les points de tension. Le rapport intègre ensuite des recommandations correctives personnalisées pour corriger tes déséquilibres posturaux et améliorer ta biomécanique."
  },
  {
    question: "Ai-je besoin d'une prise de sang ?",
    answer: "Non, le questionnaire suffit pour la plupart des offres. Si tu as des bilans récents, tu peux utiliser le Blood Analysis (99€) et je les décoderai avec des ranges optimaux de performance - pas les ranges 'normaux' des labos qui sont souvent trop larges. Sinon, selon ton profil, je te recommanderai les analyses pertinentes à demander à ton médecin."
  },
  {
    question: "Combien de temps pour recevoir mon rapport ?",
    answer: "Le questionnaire prend 15-45 minutes selon l'offre choisie. Tu peux sauvegarder ta progression et reprendre plus tard. Le rapport est généré automatiquement dès que tu termines - tu le reçois en quelques minutes par email. Pour les offres payantes (Ultimate Scan, Blood Analysis), je révise personnellement chaque rapport avant envoi, donc compte 24-48h maximum."
  },
  {
    question: "Qui es-tu exactement, Achzod ?",
    answer: "Je suis coach certifié avec 11 certifications internationales : NASM (CPT, CES, PES, FNS, WFS), ISSA (CPT, Nutritionist, Bodybuilding Specialist), Precision Nutrition (Level 1, Sleep & Recovery) et Pre-Script (Movement Assessment, Corrective Exercise). J'ai accompagné des centaines de clients en coaching individuel pendant des années. APEXLABS est l'aboutissement de toute cette expérience : chaque protocole, chaque recommandation vient de mon expérience terrain, pas d'un template générique."
  },
  {
    question: "Est-ce adapté aux débutants ?",
    answer: "Absolument. Le questionnaire détecte automatiquement ton niveau et ton contexte. Si tu débutes → je te donne des fondations solides (routine simple, nutrition de base, hygiène de sommeil). Si tu es avancé → optimisations fines (timing péri-workout, cycling glucidique, protocoles HRV). Le Discovery Scan gratuit est parfait pour commencer et voir si ça te correspond."
  },
  {
    question: "Les suppléments sont-ils obligatoires ?",
    answer: "Absolument pas. Je te recommande uniquement ce qui est pertinent pour TON profil. Si tu n'as pas besoin de suppléments, je te le dis clairement. Quand je recommande des suppléments, je te donne les dosages précis, les meilleures marques et le timing optimal. Exemple : stress chronique + sommeil perturbé → Magnésium Bisglycinate 400mg + Glycine 3g avant le coucher. Budget estimé : 30-80€/mois selon les besoins."
  },
  {
    question: "C'est un paiement unique ou un abonnement ?",
    answer: "Paiement unique. Pas d'abonnement caché, pas de frais récurrents. Tu paies une fois et tu gardes accès à ton rapport à vie. Discovery Scan = Gratuit pour toujours. Anabolic Bioscan = 59€ une fois. Ultimate Scan = 79€ une fois. Blood Analysis = 99€ une fois."
  },
  {
    question: "Le rapport remplace-t-il un médecin ?",
    answer: "Non, et ce n'est pas le but. Mon rapport est un outil d'optimisation et de prévention basé sur mes 11 certifications et mon expérience terrain. Je t'aide à identifier ce qui pourrait être amélioré AVANT que ça devienne un problème médical. Pour toute pathologie, symptôme inquiétant ou question de santé, consulte toujours un professionnel de santé. Mon travail vient en complément, pas en remplacement."
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Absolument. Tes données sont chiffrées (SSL/TLS) et stockées sur des serveurs européens conformes au RGPD. Je ne vends JAMAIS tes données à des tiers - c'est une ligne rouge pour moi. Tu peux demander la suppression complète de tes données à tout moment par simple email. Ta vie privée n'est pas négociable."
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
        className="flex w-full items-start justify-between gap-8 py-8 text-left transition-colors hover:text-[#FCDD00]"
      >
        <h3 className="text-xl font-semibold text-white lg:text-2xl">
          {faq.question}
        </h3>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="shrink-0 pt-1"
        >
          <ChevronDown className="h-6 w-6 text-[#FCDD00]" />
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
            <p className="pb-8 text-base leading-relaxed text-white/60 lg:text-lg lg:leading-relaxed">
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
    <div className="min-h-screen bg-[#050505]">
      <Header />

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 lg:py-32">
          {/* Background with Grid */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505] to-[#050505]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FCDD00]/5 rounded-full blur-[150px]" />
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(252,221,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(252,221,0,0.3) 1px, transparent 1px)`,
                backgroundSize: '60px 60px'
              }}
            />
          </div>

          <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-8">
                [ FAQ ]
              </p>
              <h1 className="text-white text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-[-0.04em]">
                Questions fréquentes
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-white/50">
                Tout ce que tu dois savoir sur les formules APEXLABS.
              </p>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="relative pb-24 lg:pb-32">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="space-y-0">
              {faqs.map((faq, index) => (
                <FAQAccordion key={index} faq={faq} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative border-t border-white/5 py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="mx-auto w-16 h-16 rounded-sm bg-[#FCDD00]/10 border border-[#FCDD00]/20 flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-[#FCDD00]" />
              </div>
              <p className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase">
                [ COMMENCER ]
              </p>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">
                Prêt à découvrir ton potentiel ?
              </h2>
              <p className="text-lg text-white/50">
                Commence gratuitement ou passe directement à une offre payante.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
                <Link href="/offers/discovery-scan">
                  <button className="px-6 py-3 rounded-sm border border-white/10 text-white font-medium hover:border-[#FCDD00]/30 hover:text-[#FCDD00] transition-colors">
                    Discovery Scan (Gratuit)
                  </button>
                </Link>
                <Link href="/offers/anabolic-bioscan">
                  <button className="inline-flex items-center gap-2 px-6 py-3 rounded-sm bg-[#FCDD00] text-black font-semibold hover:bg-[#FCDD00]/90 transition-colors">
                    Anabolic Bioscan (59€)
                    <ArrowRight className="h-4 w-4" />
                  </button>
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
