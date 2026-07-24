import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";

export default function PolitiqueConfidentialite() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <Header />

      {/* Hero */}
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
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-[#FCDD00] text-xs font-mono tracking-[0.3em] uppercase mb-6">
            [ RGPD ]
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-white text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.04em]">
            Politique de Confidentialite
          </motion.h1>
        </div>
      </section>

      <main className="container mx-auto max-w-4xl px-4 pb-24">
        <div className="space-y-10">

          <p className="text-white/60 leading-relaxed">
            Derniere mise a jour : Mars 2026. La presente politique de confidentialite decrit comment AchzodCoaching FZO ("nous", "notre", "APEXLABS") collecte, utilise et protege vos donnees personnelles conformement au Reglement General sur la Protection des Donnees (RGPD) et a la loi francaise Informatique et Libertes.
          </p>

          <Section title="1. Responsable du traitement">
            <p>AchzodCoaching FZO</p>
            <p>Building A1, Dubai Digital Park, Dubai Silicon Oasis, United Arab Emirates</p>
            <p>Numero de licence : 55435</p>
            <p>Contact : <a href="mailto:coaching@achzodcoaching.com" className="text-[#FCDD00] hover:underline">coaching@achzodcoaching.com</a></p>
          </Section>

          <Section title="2. Donnees collectees">
            <p className="mb-3">Nous collectons les donnees suivantes dans le cadre de nos services :</p>
            <ul className="list-disc list-inside space-y-1 text-white/60">
              <li><strong className="text-white">Donnees d'identification :</strong> adresse email, nom/prenom (si fourni)</li>
              <li><strong className="text-white">Donnees de sante :</strong> reponses aux questionnaires (sommeil, stress, nutrition, entrainement, hormones), resultats d'analyses sanguines (PDF uploade), photos corporelles (Ultimate Scan)</li>
              <li><strong className="text-white">Donnees de paiement :</strong> traitees directement par Stripe et PayPal ,  nous ne stockons jamais vos coordonnees bancaires</li>
              <li><strong className="text-white">Donnees techniques :</strong> adresse IP, user-agent, cookies essentiels</li>
              <li><strong className="text-white">Donnees analytiques :</strong> pages visitees, interactions (uniquement avec votre consentement via Google Analytics)</li>
            </ul>
          </Section>

          <Section title="3. Finalites du traitement">
            <ul className="list-disc list-inside space-y-1 text-white/60">
              <li>Generation de rapports d'audit personnalises (Discovery, Anabolic, Ultimate, Blood Analysis)</li>
              <li>Envoi de votre rapport par email</li>
              <li>Gestion de votre compte et de vos commandes</li>
              <li>Amelioration de nos services (analytics, avec consentement)</li>
              <li>Communication de service (confirmation de commande, rapport pret)</li>
            </ul>
          </Section>

          <Section title="4. Base legale du traitement">
            <ul className="list-disc list-inside space-y-1 text-white/60">
              <li><strong className="text-white">Execution du contrat :</strong> pour la fourniture de nos services (audits, rapports)</li>
              <li><strong className="text-white">Consentement explicite :</strong> pour les donnees de sante et les cookies analytiques</li>
              <li><strong className="text-white">Interet legitime :</strong> pour la securite du site et la prevention de la fraude</li>
            </ul>
          </Section>

          <Section title="5. Duree de conservation">
            <ul className="list-disc list-inside space-y-1 text-white/60">
              <li>Donnees de compte et rapports : 3 ans apres la derniere activite</li>
              <li>Donnees de paiement : conformement aux obligations legales comptables (10 ans)</li>
              <li>Cookies analytiques : 13 mois maximum</li>
              <li>Logs serveur : 12 mois</li>
            </ul>
          </Section>

          <Section title="6. Destinataires des donnees">
            <p className="mb-3">Vos donnees peuvent etre partagees avec :</p>
            <ul className="list-disc list-inside space-y-1 text-white/60">
              <li><strong className="text-white">Stripe / PayPal :</strong> traitement des paiements</li>
              <li><strong className="text-white">Google AI (Gemini) :</strong> generation des rapports d'analyse (donnees anonymisees)</li>
              <li><strong className="text-white">SendPulse :</strong> envoi des emails transactionnels</li>
              <li><strong className="text-white">Render :</strong> hebergement des serveurs</li>
              <li><strong className="text-white">Sentry :</strong> monitoring des erreurs (donnees techniques uniquement)</li>
              <li><strong className="text-white">Google Analytics :</strong> analytics (uniquement avec votre consentement)</li>
            </ul>
            <p className="mt-3">Nous ne vendons jamais vos donnees personnelles a des tiers.</p>
          </Section>

          <Section title="7. Transferts internationaux">
            <p>Certains de nos sous-traitants sont situes en dehors de l'UE (USA). Ces transferts sont encadres par les clauses contractuelles types de la Commission europeenne ou par le cadre EU-US Data Privacy Framework.</p>
          </Section>

          <Section title="8. Cookies">
            <p className="mb-3">Nous utilisons deux types de cookies :</p>
            <ul className="list-disc list-inside space-y-1 text-white/60">
              <li><strong className="text-white">Cookies essentiels :</strong> session, preferences d'interface ,  pas de consentement requis</li>
              <li><strong className="text-white">Cookies analytiques (Google Analytics) :</strong> mesure d'audience ,  actives uniquement apres votre consentement via la banniere</li>
            </ul>
            <p className="mt-3">Vous pouvez modifier votre choix a tout moment en supprimant le cookie "apexlabs_cookie_consent" dans les parametres de votre navigateur.</p>
          </Section>

          <Section title="9. Vos droits (RGPD Articles 15-22)">
            <p className="mb-3">Vous disposez des droits suivants :</p>
            <ul className="list-disc list-inside space-y-1 text-white/60">
              <li><strong className="text-white">Droit d'acces :</strong> obtenir une copie de vos donnees</li>
              <li><strong className="text-white">Droit de rectification :</strong> corriger des donnees inexactes</li>
              <li><strong className="text-white">Droit a l'effacement :</strong> demander la suppression de vos donnees</li>
              <li><strong className="text-white">Droit a la portabilite :</strong> recevoir vos donnees dans un format structure</li>
              <li><strong className="text-white">Droit d'opposition :</strong> vous opposer au traitement de vos donnees</li>
              <li><strong className="text-white">Droit de retrait du consentement :</strong> a tout moment, sans affecter la licéité du traitement antérieur</li>
            </ul>
            <p className="mt-3">
              Pour exercer vos droits, contactez-nous a :{" "}
              <a href="mailto:coaching@achzodcoaching.com" className="text-[#FCDD00] hover:underline">coaching@achzodcoaching.com</a>
            </p>
            <p className="mt-2">Nous repondons dans un delai de 30 jours. En cas de litige, vous pouvez saisir la CNIL (cnil.fr).</p>
          </Section>

          <Section title="10. Securite des donnees">
            <ul className="list-disc list-inside space-y-1 text-white/60">
              <li>Chiffrement HTTPS (TLS 1.3) sur toutes les communications</li>
              <li>Mots de passe hashes (bcrypt)</li>
              <li>Base de donnees protegee par firewall et SSL</li>
              <li>Acces restreint aux donnees (principe du moindre privilege)</li>
              <li>Monitoring des erreurs et des intrusions via Sentry</li>
            </ul>
          </Section>

          <Section title="11. Modifications">
            <p>Nous pouvons modifier cette politique a tout moment. En cas de modification substantielle, nous vous informerons par email ou par une notification sur le site. La date de derniere mise a jour est indiquee en haut de cette page.</p>
          </Section>

        </div>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
      <h2 className="mb-4 text-xl font-bold text-white">{title}</h2>
      <div className="text-white/60 leading-relaxed">{children}</div>
    </section>
  );
}
