import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";

export default function CGV() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <Header />

      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
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

        <div className="relative z-10 container mx-auto max-w-4xl px-4 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-6"
          >
            [ CGV ]
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.04em]"
          >
            Conditions Générales de Vente
          </motion.h1>
        </div>
      </section>

      <main className="container mx-auto max-w-4xl px-4 pb-24">
        <div className="space-y-10">

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 1 - Champ d'application</h2>
            <p className="text-white/60 leading-relaxed">
              Les presentes Conditions Generales de Vente s'appliquent a toutes commandes passees sur
              le site APEXLABS, service propose par AchzodCoaching.
            </p>
            <p className="mt-3 text-white/60 leading-relaxed">
              Est considere comme "client" toute personne physique ou morale realisant aupres de ce
              site une commande validee par ma plateforme de paiement securisee.
            </p>
            <p className="mt-3 text-white/60 leading-relaxed">
              AchzodCoaching se reserve la possibilite d'adapter ou de modifier les presentes Conditions
              Generales de Vente. En cas de modification, il sera applique a chaque commande les Conditions
              Generales de Vente en vigueur au jour de la commande.
            </p>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 2 - Description des Services</h2>
            <p className="text-white/60 leading-relaxed">
              APEXLABS propose un audit complet couvrant Hormones, Metabolisme, Biohacking,
              Biomecanique et Neurotransmetteurs. 180 questions reparties en 15 domaines. Les services proposes sont :
            </p>
            <div className="mt-6 space-y-4">
              <div className="rounded-sm border border-white/10 bg-[#0F0F0F] p-4">
                <h4 className="font-semibold text-white">Discovery Scan (Gratuit)</h4>
                <p className="mt-1 text-sm text-white/50">
                  Rapport de base avec score global et resume des domaines analyses.
                </p>
              </div>
              <div className="rounded-sm border border-white/10 bg-[#0F0F0F] p-4">
                <h4 className="font-semibold text-white">Audit Anabolic Bioscan (59€ - Paiement unique)</h4>
                <p className="mt-1 text-sm text-white/50">
                  Rapport complet de 20+ pages avec recommandations personnalisees, plan d'action 30 jours,
                  et analyse detaillee de chaque domaine.
                </p>
              </div>
              <div className="rounded-sm border border-white/10 bg-[#0F0F0F] p-4">
                <h4 className="font-semibold text-white">Audit Ultimate Scan (79€ - Paiement unique)</h4>
                <p className="mt-1 text-sm text-white/50">
                  Tous les avantages Anabolic Bioscan + analyse photo posturale complete + integration wearables +
                  protocoles avances 30-60-90 jours.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 3 - Deduction sur les Coachings</h2>
            <p className="text-white/60 leading-relaxed">
              Le montant paye pour les audits Anabolic Bioscan (59€) et Ultimate Scan (79€) est deductible de l'achat
              d'un coaching AchzodCoaching, sous les conditions suivantes :
            </p>
            <ul className="mt-4 space-y-2 text-white/60">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FCDD00] mt-2 flex-shrink-0" />
                <span><strong className="text-white">Coaching Essential (249€+)</strong> : Deduction applicable</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FCDD00] mt-2 flex-shrink-0" />
                <span><strong className="text-white">Coaching Elite (399€+)</strong> : Deduction applicable</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FCDD00] mt-2 flex-shrink-0" />
                <span><strong className="text-white">Achzod Private Lab (499€+)</strong> : Deduction applicable</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                <span><strong className="text-white">Coaching Starter (149€)</strong> : Deduction NON applicable</span>
              </li>
            </ul>
            <p className="mt-4 text-white/60 leading-relaxed">
              La deduction est valable pendant 12 mois a compter de la date d'achat de l'audit.
            </p>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 4 - Commandes</h2>
            <p className="text-white/60 leading-relaxed">
              L'acceptation d'une commande se fait via ma plateforme de paiement securisee Stripe.
              Une fois votre commande saisie, un mail de confirmation vous sera adresse et votre
              commande enregistree.
            </p>
            <p className="mt-3 text-white/60 leading-relaxed">
              Le client s'engage a fournir une adresse email valide afin de pouvoir recevoir l'acces
              a son audit. Toute commande vaut acceptation des presentes Conditions Generales de Vente.
            </p>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 5 - Prix et Paiement</h2>
            <p className="text-white/60 leading-relaxed">
              Les prix indiques en euros sont TTC. Le paiement est exigible immediatement a la commande
              via Stripe (carte bancaire). Le paiement securise en ligne est realise par l'intermediaire
              de Stripe. Les informations transmises sont chiffrees selon les standards de securite les
              plus eleves.
            </p>
            <p className="mt-3 text-white/60 leading-relaxed">
              AchzodCoaching se reserve le droit de modifier les tarifs a tout moment.
            </p>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 6 - Livraison</h2>
            <p className="text-white/60 leading-relaxed">
              Les audits sont delivres sous forme numerique. L'acces au rapport complet est immediat
              apres validation du paiement. Le client accede a son rapport via son espace personnel
              (Dashboard) sur le site.
            </p>
          </section>

          <section className="rounded-sm border border-red-500/30 bg-red-500/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-red-400">Article 7 - Politique de Non-Remboursement</h2>
            <div className="rounded-sm border border-red-500/20 bg-red-500/5 p-4 mb-4">
              <h4 className="font-semibold text-red-400">Absence de droit de retractation</h4>
              <p className="mt-2 text-sm text-white/60">
                AchzodCoaching est une societe etablie a Dubai, Emirats arabes unis. Les lois locales
                applicables ne prevoient aucun droit de retractation de 14 jours comme en France ou
                dans l'Union europeenne.
              </p>
            </div>
            <p className="text-white/60 leading-relaxed">
              En validant sa commande et en procedant au paiement, le client :
            </p>
            <ul className="mt-4 space-y-2 text-white/60">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                <span>Demande expressement que l'execution du service commence immediatement apres paiement.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                <span>Reconnait que les prestations fournies sont des contenus numeriques delivres integralement des validation.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                <span>Accepte et confirme renoncer irrevocablement a toute possibilite d'annulation ou de remboursement.</span>
              </li>
            </ul>
            <p className="mt-4 text-white/60 leading-relaxed">
              <strong className="text-red-400">Aucune exception :</strong> Aucun remboursement ne sera accorde en cas de changement
              d'avis, insatisfaction subjective, difficultes personnelles ou absence d'utilisation.
            </p>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 8 - Acceptation du Client</h2>
            <p className="text-white/60 leading-relaxed">
              Le client declare avoir pris connaissance de l'ensemble des presentes Conditions Generales
              de Vente et les accepter sans restriction ni reserve.
            </p>
            <p className="mt-3 text-white/60 leading-relaxed">
              Le client reconnait et accepte expressement que :
            </p>
            <ul className="mt-4 space-y-2 text-white/60">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FCDD00] mt-2 flex-shrink-0" />
                <span>Les prestations sont fournies par une societe etablie a Dubai, ou aucun droit legal de retractation n'existe.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FCDD00] mt-2 flex-shrink-0" />
                <span>Toute commande est ferme et definitive des validation et paiement.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FCDD00] mt-2 flex-shrink-0" />
                <span>Les tarifs sont expressement agrees et acceptes.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FCDD00] mt-2 flex-shrink-0" />
                <span>Il a recu toutes les informations necessaires pour s'assurer de l'adequation de l'offre a ses besoins.</span>
              </li>
            </ul>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 9 - Propriete Intellectuelle</h2>
            <p className="text-white/60 leading-relaxed">
              L'ensemble des textes, illustrations, algorithmes, rapports et contenus fournis par
              APEXLABS sont proteges par le droit d'auteur. Toute reproduction, diffusion ou
              utilisation commerciale est interdite sans autorisation prealable ecrite.
            </p>
            <p className="mt-3 text-white/60 leading-relaxed">
              Le client s'interdit tout usage des rapports et services a des fins autres que personnelles.
            </p>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 10 - Responsabilite</h2>
            <p className="text-white/60 leading-relaxed">
              L'audit APEXLABS fournit des recommandations basees sur les reponses du client.
              Ces recommandations sont a titre informatif et ne remplacent pas un avis medical professionnel.
            </p>
            <p className="mt-3 text-white/60 leading-relaxed">
              Le client est seul responsable de l'utilisation et de l'interpretation des resultats.
              AchzodCoaching ne pourra etre tenu responsable de tout dommage direct ou indirect
              resultant de l'utilisation des informations fournies.
            </p>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 11 - Protection des Donnees</h2>
            <p className="text-white/60 leading-relaxed">
              Conformement a la Loi Informatique et Libertes du 6 janvier 1978 et au RGPD, vous disposez
              des droits d'interrogation, d'acces, de modification, d'opposition et de rectification
              sur les donnees personnelles vous concernant.
            </p>
            <p className="mt-3 text-white/60 leading-relaxed">
              Vos donnees sont stockees de maniere securisee et ne sont jamais partagees avec des tiers
              sans votre consentement explicite.
            </p>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 12 - Droit Applicable</h2>
            <p className="text-white/60 leading-relaxed">
              Les presentes conditions sont regies par les lois en vigueur a Dubai, Emirats arabes unis.
              Tout litige sera soumis a la competence exclusive des tribunaux de Dubai.
            </p>
            <p className="mt-3 text-white/60 leading-relaxed">
              En cas de litige, le client s'adressera en priorite a AchzodCoaching pour obtenir une
              solution amiable par email a : <a href="mailto:achzodyt@gmail.com" className="text-[#FCDD00] hover:underline">achzodyt@gmail.com</a>
            </p>
          </section>

          <div className="rounded-sm border border-[#FCDD00]/30 bg-[#FCDD00]/5 p-6 md:p-8">
            <p className="text-xs font-mono tracking-wider text-[#FCDD00] uppercase mb-4">[ CONTACT ]</p>
            <p className="text-white/60">
              <strong className="text-white">AchzodCoaching FZO</strong><br />
              Building A1, Dubai Digital Park, Dubai Silicon Oasis, UAE<br />
              Email : <a href="mailto:achzodyt@gmail.com" className="text-[#FCDD00] hover:underline">achzodyt@gmail.com</a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
