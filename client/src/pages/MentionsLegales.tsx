import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { motion } from "framer-motion";

export default function MentionsLegales() {
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
            [ LEGAL ]
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white text-4xl sm:text-5xl md:text-6xl font-bold tracking-[-0.04em]"
          >
            Mentions Légales
          </motion.h1>
        </div>
      </section>

      <main className="container mx-auto max-w-4xl px-4 pb-24">
        <div className="space-y-10">

          <p className="text-white/60 leading-relaxed">
            Conformement aux dispositions des Articles 6-III et 19 de la Loi n°2004-575 du 21 juin 2004
            pour la Confiance dans l'economie numerique, dite L.C.E.N., il est porte a la connaissance
            des utilisateurs et visiteurs du site NEUROCORE 360 les presentes mentions legales.
          </p>

          <div className="rounded-sm border border-[#FCDD00]/30 bg-[#FCDD00]/5 p-6 md:p-8">
            <p className="text-xs font-mono tracking-wider text-[#FCDD00] uppercase mb-4">[ EDITEUR DU SITE ]</p>
            <p className="text-white/60">
              <strong className="text-white">AchzodCoaching FZO</strong><br />
              Numero de licence : 55435<br />
              Statut legal : Freezone company<br />
              Adresse : Building A1, Dubai Digital Park, Dubai Silicon Oasis, United Arab Emirates<br />
              Contact : <a href="mailto:achzodyt@gmail.com" className="text-[#FCDD00] hover:underline">achzodyt@gmail.com</a>
            </p>
          </div>

          <p className="text-white/60 leading-relaxed">
            L'acces et l'utilisation du site NEUROCORE 360 (ci-apres "le Site") sont soumis aux presentes
            "Mentions legales" detaillees ci-apres ainsi qu'aux lois et/ou reglements applicables.
          </p>

          <p className="text-white/60 leading-relaxed">
            La connexion, l'utilisation et l'acces a ce Site impliquent l'acceptation integrale et sans
            reserve de l'internaute de toutes les dispositions des presentes Mentions Legales.
          </p>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 1 - Informations Legales</h2>
            <p className="text-white/60 leading-relaxed">
              En vertu de l'Article 6 de la Loi n° 2004-575 du 21 juin 2004 pour la confiance dans
              l'economie numerique, il est precise dans cet article l'identite des differents intervenants
              dans le cadre de sa realisation et de son suivi.
            </p>
            <div className="mt-6 rounded-sm border border-white/10 bg-[#0F0F0F] p-4">
              <p className="text-white/60">
                <strong className="text-white">Directeur de publication :</strong><br />
                Achkan Hosseini-Maneche<br />
                AchzodCoaching FZO<br />
                Numero de licence : 55435<br />
                Statut legal : Freezone company<br />
                Adresse : Building A1, Dubai Digital Park, Dubai Silicon Oasis, United Arab Emirates<br />
                Contact : <a href="mailto:achzodyt@gmail.com" className="text-[#FCDD00] hover:underline">achzodyt@gmail.com</a>
              </p>
            </div>
            <div className="mt-4 rounded-sm border border-white/10 bg-[#0F0F0F] p-4">
              <p className="text-white/60">
                <strong className="text-white">Hebergeur :</strong><br />
                Replit, Inc.<br />
                Les donnees sont stockees sur des serveurs securises proteges par un pare-feu.
              </p>
            </div>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 2 - Accessibilite</h2>
            <p className="text-white/60 leading-relaxed">
              Le Site est par principe accessible aux utilisateurs 24/24h et 7/7j, sauf interruption,
              programmee ou non, pour des besoins de maintenance ou en cas de force majeure.
            </p>
            <p className="mt-3 text-white/60 leading-relaxed">
              En cas d'impossibilite d'acces au Site, celui-ci s'engage a faire son maximum afin d'en
              retablir l'acces. Le Site ne saurait etre tenu pour responsable de tout dommage, quelle
              qu'en soit la nature, resultant de son indisponibilite.
            </p>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 3 - Collecte de Donnees et Loi Informatique et Libertes</h2>
            <p className="text-white/60 leading-relaxed">
              Ce site est conforme aux dispositions de la Loi 78-17 du 6 janvier 1978 relative a
              l'informatique, aux fichiers et aux libertes. En vertu de celle-ci, l'Utilisateur beneficie
              notamment d'un droit d'opposition (art. 32 et 38), d'acces (art. 38 et 39) et de rectification
              (art. 40) des donnees le concernant.
            </p>
            <p className="mt-3 text-white/60 leading-relaxed">
              Pour faire usage de celui-ci, l'Utilisateur doit s'adresser a l'Editeur en le contactant
              par courrier electronique a l'adresse <a href="mailto:achzodyt@gmail.com" className="text-[#FCDD00] hover:underline">achzodyt@gmail.com</a> en precisant ses nom, prenom(s),
              adresse et adresse(s) e-mail.
            </p>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 4 - Politique de Cookies</h2>
            <p className="text-white/60 leading-relaxed">
              Le site a eventuellement recours aux techniques de "cookies" lui permettant de traiter des
              statistiques et des informations sur le trafic, de faciliter la navigation et d'ameliorer
              le service pour le confort de l'Utilisateur.
            </p>
            <p className="mt-3 text-white/60 leading-relaxed">
              Conformement a la legislation europeenne, le site a mis a jour sa politique de confidentialite
              en matiere de cookies. L'Utilisateur est libre d'accepter ou de refuser les cookies de tous
              les sites internet en modifiant les parametres de son navigateur internet.
            </p>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 5 - Clause de Non-Responsabilite</h2>
            <p className="text-white/60 leading-relaxed">
              L'audit NEUROCORE 360 est un outil d'evaluation et d'orientation. Les informations et
              recommandations fournies sont a titre informatif et educatif uniquement. Elles ne constituent
              en aucun cas un avis medical, une prescription ou un diagnostic.
            </p>
            <p className="mt-3 text-white/60 leading-relaxed">
              L'utilisateur reconnait que les resultats de l'audit dependent de la precision et de
              l'honnetete de ses reponses. AchzodCoaching ne pourra etre tenu responsable de tout
              dommage direct ou indirect resultant de l'utilisation ou de l'interpretation des resultats
              de l'audit.
            </p>
            <p className="mt-3 text-white/60 leading-relaxed">
              L'utilisateur est invite a consulter un professionnel de sante qualifie avant toute
              demarche engageant sa sante ou son equilibre.
            </p>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 6 - Loi Applicable et Juridiction</h2>
            <ul className="space-y-2 text-white/60">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FCDD00] mt-2 flex-shrink-0" />
                <span>Code de la consommation : articles L111-1 a L111-7</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FCDD00] mt-2 flex-shrink-0" />
                <span>Code de la consommation : articles R111-1 et R111-2</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FCDD00] mt-2 flex-shrink-0" />
                <span>Article 19 de la loi n°2004-575 du 21 juin 2004 pour la confiance dans l'economie numerique</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FCDD00] mt-2 flex-shrink-0" />
                <span>Loi n°2004-575 du 21 juin 2004 pour la confiance dans l'economie numerique : article 6</span>
              </li>
            </ul>
          </section>

          <section className="rounded-sm bg-white/[0.03] border border-white/10 p-6 md:p-8">
            <h2 className="mb-4 text-xl font-bold text-white">Article 7 - Contact</h2>
            <p className="text-white/60 leading-relaxed">
              Pour tout signalement de contenus ou d'activites illicites, l'Utilisateur peut contacter
              l'Editeur a l'adresse suivante : <a href="mailto:achzodyt@gmail.com" className="text-[#FCDD00] hover:underline">achzodyt@gmail.com</a>,
              ou par courrier recommande avec accuse de reception adresse a l'Editeur aux coordonnees
              precisees dans les presentes mentions legales.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
