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
    answer: "APEXLABS est mon système d'analyse métabolique et de performance que j'ai construit après des années de coaching individuel et 12 certifications internationales (NASM, ISSA, Precision Nutrition, Pre-Script). Selon l'offre choisie, je couvre sommeil, hormones, digestion, stress, nutrition, entraînement, biomécanique, cardiovasculaire... et tu reçois un rapport de 5 à 50 pages avec des protocoles concrets, pas des conseils génériques."
  },
  {
    question: "Quelle est la différence entre les 4 offres ?",
    answer: "DISCOVERY SCAN (Gratuit) : ~66 questions sur 10 domaines, rapport 5-7 pages avec 4 sections (executive summary, énergie, métabolisme, synthèse) + sections verrouillées qui te montrent ce que tu débloques en passant à l'Anabolic. ANABOLIC BIOSCAN (59€) : ~137 questions, rapport 20+ pages avec 16 sections complètes — 6 analyses approfondies + 5 protocoles d'action (matin anti-cortisol, soir sommeil, digestion 14j, bureau anti-sédentarité, entraînement personnalisé) + stack suppléments + plan 30-60-90 jours + KPI. Mon best-seller. ULTIMATE SCAN (79€) : tout l'Anabolic + analyse photo posturale et biomécanique (3 photos : face, dos, profil) pour 18 sections et un rapport de 40-50 pages. L'analyse la plus complète. BLOOD ANALYSIS (99€) : le paiement inclut 2 crédits, soit 2 analyses complètes de bilan sanguin avec 39 biomarqueurs et des ranges optimaux de performance — pas seulement les ranges \"normaux\" des labos."
  },
  {
    question: "Que comprend le Blood Analysis à 99€ ?",
    answer: "Le paiement unique de 99€ ajoute 2 crédits Blood Analysis à ton compte. Un crédit permet d'uploader et d'analyser un bilan sanguin PDF valide : tu disposes donc de 2 analyses complètes. Les crédits n'expirent pas et tu peux les utiliser quand tu veux. Le parcours recommandé est une première analyse avant la mise en place des recommandations, puis une deuxième analyse de contrôle 2 à 3 mois après. Les prises de sang et les frais du laboratoire ne sont pas inclus."
  },
  {
    question: "Combien de temps prend le questionnaire ?",
    answer: "Discovery Scan : ~5 minutes (66 questions). Anabolic Bioscan : ~15-20 minutes (137 questions). Ultimate Scan : ~20-25 minutes (183 questions). Ta progression est sauvegardée automatiquement — tu peux fermer et reprendre plus tard sans rien perdre."
  },
  {
    question: "Combien de temps pour recevoir mon rapport ?",
    answer: "Discovery Scan : rapport delivre sous 24h par email. Anabolic Bioscan : rapport complet de 20+ pages delivre sous 24h par email. Ultimate Scan : rapport de 40-50 pages delivre sous 48h par email (analyse photo + questionnaire). Blood Analysis : rapport delivre sous 24h par email apres upload de ton PDF. Pour chaque offre, tu recois un email des que ton rapport est pret avec un lien direct vers ton dashboard."
  },
  {
    question: "L'analyse photo, ça marche comment ?",
    answer: "Disponible uniquement avec l'Ultimate Scan (79€). Tu uploades 3 photos (face, dos, profil) pendant le questionnaire. Mon IA analyse ta posture (épaules, bassin, lordose, cyphose), ta composition corporelle visible, les asymétries musculaires et les compensations biomécaniques. Tu reçois 2 sections dédiées dans ton rapport : \"Analyse visuelle et posturale complète\" et \"Analyse biomécanique et sangle profonde\" avec des protocoles correctifs personnalisés."
  },
  {
    question: "Qui es-tu exactement, Achzod ?",
    answer: "Coach certifié avec 12 certifications internationales : NASM (CPT, CES, PES, FNS, WFS), ISSA (CPT, Nutritionist, Bodybuilding Specialist), Precision Nutrition (Level 1, Sleep & Recovery) et Pre-Script (Movement Assessment, Corrective Exercise, Nutrition). J'ai accompagné des centaines de clients en coaching individuel. APEXLABS est l'aboutissement de toute cette expérience : chaque protocole, chaque recommandation vient de mon expertise terrain."
  },
  {
    question: "Est-ce adapté aux débutants ?",
    answer: "Oui. Le questionnaire détecte automatiquement ton niveau et ton contexte. Si tu débutes → fondations solides (routine simple, nutrition de base, hygiène de sommeil). Si tu es avancé → optimisations fines (timing péri-workout, cycling glucidique, protocoles HRV). Le Discovery Scan gratuit est parfait pour commencer."
  },
  {
    question: "Les suppléments sont-ils obligatoires ?",
    answer: "Non. Le stack suppléments est personnalisé selon TON profil. Si tu n'as pas besoin de suppléments, je te le dis clairement. Quand j'en recommande, je te donne les dosages précis, les formes optimales et le timing. Exemple : stress chronique + sommeil perturbé → Magnésium Bisglycinate 400mg + Glycine 3g avant le coucher."
  },
  {
    question: "Ai-je besoin d'une prise de sang ?",
    answer: "Non, pas pour le Discovery, l'Anabolic ou l'Ultimate — le questionnaire suffit. Avec le Blood Analysis, tu utilises idéalement ton premier crédit sur un bilan réalisé avant les recommandations, puis ton second crédit sur un nouveau bilan 2 à 3 mois après. La liste des marqueurs à demander à ton médecin ou à ton laboratoire est fournie après l'achat."
  },
  {
    question: "C'est un paiement unique ou un abonnement ?",
    answer: "Paiement unique. Pas d'abonnement, pas de frais cachés. Discovery Scan = Gratuit pour toujours. Anabolic Bioscan = 59€ une fois. Ultimate Scan = 79€ une fois. Blood Analysis = 99€ une fois pour 2 crédits, soit 2 analyses complètes utilisables sans expiration. Tu gardes accès à tes rapports et à ton dashboard."
  },
  {
    question: "Le rapport remplace-t-il un médecin ?",
    answer: "Non. Mon rapport est un outil d'optimisation et de prévention basé sur mes certifications et mon expérience. Je t'aide à identifier ce qui peut être amélioré AVANT que ça devienne un problème médical. Pour toute pathologie ou symptôme inquiétant, consulte un professionnel de santé. Mon travail vient en complément, pas en remplacement."
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "Oui. Tes données sont chiffrées (SSL/TLS) et stockées sur des serveurs sécurisés. Je ne vends jamais tes données à des tiers. Les photos (Ultimate Scan) sont traitées de manière sécurisée. Tu peux demander la suppression complète de tes données à tout moment."
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
