import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function MentionsLegales() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-4xl px-4 py-16">
        <h1 className="mb-8 text-3xl font-bold">Mentions Legales</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <p className="text-muted-foreground">
            Conformement aux dispositions des Articles 6-III et 19 de la Loi n°2004-575 du 21 juin 2004 
            pour la Confiance dans l'economie numerique, dite L.C.E.N., il est porte a la connaissance 
            des utilisateurs et visiteurs du site NEUROCORE 360 les presentes mentions legales.
          </p>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Editeur du site</h3>
            <p className="text-muted-foreground">
              <strong>AchzodCoaching FZO</strong><br />
              Numero de licence : 55435<br />
              Statut legal : Freezone company<br />
              Adresse : Building A1, Dubai Digital Park, Dubai Silicon Oasis, United Arab Emirates<br />
              Contact : <a href="mailto:achzodyt@gmail.com" className="text-primary hover:underline">achzodyt@gmail.com</a>
            </p>
          </div>

          <p className="text-muted-foreground">
            L'acces et l'utilisation du site NEUROCORE 360 (ci-apres "le Site") sont soumis aux presentes 
            "Mentions legales" detaillees ci-apres ainsi qu'aux lois et/ou reglements applicables.
          </p>

          <p className="text-muted-foreground">
            La connexion, l'utilisation et l'acces a ce Site impliquent l'acceptation integrale et sans 
            reserve de l'internaute de toutes les dispositions des presentes Mentions Legales.
          </p>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 1 - Informations Legales</h2>
            <p className="text-muted-foreground">
              En vertu de l'Article 6 de la Loi n° 2004-575 du 21 juin 2004 pour la confiance dans 
              l'economie numerique, il est precise dans cet article l'identite des differents intervenants 
              dans le cadre de sa realisation et de son suivi.
            </p>
            <div className="mt-4 rounded-lg border bg-card p-6">
              <p className="text-muted-foreground">
                <strong>Directeur de publication :</strong><br />
                Achkan Hosseini-Maneche<br />
                AchzodCoaching FZO<br />
                Numero de licence : 55435<br />
                Statut legal : Freezone company<br />
                Adresse : Building A1, Dubai Digital Park, Dubai Silicon Oasis, United Arab Emirates<br />
                Contact : <a href="mailto:achzodyt@gmail.com" className="text-primary hover:underline">achzodyt@gmail.com</a>
              </p>
            </div>
            <div className="mt-4 rounded-lg border bg-card p-6">
              <p className="text-muted-foreground">
                <strong>Hebergeur :</strong><br />
                Replit, Inc.<br />
                Les donnees sont stockees sur des serveurs securises proteges par un pare-feu.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 2 - Accessibilite</h2>
            <p className="text-muted-foreground">
              Le Site est par principe accessible aux utilisateurs 24/24h et 7/7j, sauf interruption, 
              programmee ou non, pour des besoins de maintenance ou en cas de force majeure.
            </p>
            <p className="mt-2 text-muted-foreground">
              En cas d'impossibilite d'acces au Site, celui-ci s'engage a faire son maximum afin d'en 
              retablir l'acces. Le Site ne saurait etre tenu pour responsable de tout dommage, quelle 
              qu'en soit la nature, resultant de son indisponibilite.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 3 - Collecte de Donnees et Loi Informatique et Libertes</h2>
            <p className="text-muted-foreground">
              Ce site est conforme aux dispositions de la Loi 78-17 du 6 janvier 1978 relative a 
              l'informatique, aux fichiers et aux libertes. En vertu de celle-ci, l'Utilisateur beneficie 
              notamment d'un droit d'opposition (art. 32 et 38), d'acces (art. 38 et 39) et de rectification 
              (art. 40) des donnees le concernant.
            </p>
            <p className="mt-2 text-muted-foreground">
              Pour faire usage de celui-ci, l'Utilisateur doit s'adresser a l'Editeur en le contactant 
              par courrier electronique a l'adresse achzodyt@gmail.com en precisant ses nom, prenom(s), 
              adresse et adresse(s) e-mail.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 4 - Politique de Cookies</h2>
            <p className="text-muted-foreground">
              Le site a eventuellement recours aux techniques de "cookies" lui permettant de traiter des 
              statistiques et des informations sur le trafic, de faciliter la navigation et d'ameliorer 
              le service pour le confort de l'Utilisateur.
            </p>
            <p className="mt-2 text-muted-foreground">
              Conformement a la legislation europeenne, le site a mis a jour sa politique de confidentialite 
              en matiere de cookies. L'Utilisateur est libre d'accepter ou de refuser les cookies de tous 
              les sites internet en modifiant les parametres de son navigateur internet.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 5 - Clause de Non-Responsabilite</h2>
            <p className="text-muted-foreground">
              L'audit NEUROCORE 360 est un outil d'evaluation et d'orientation. Les informations et 
              recommandations fournies sont a titre informatif et educatif uniquement. Elles ne constituent 
              en aucun cas un avis medical, une prescription ou un diagnostic.
            </p>
            <p className="mt-2 text-muted-foreground">
              L'utilisateur reconnait que les resultats de l'audit dependent de la precision et de 
              l'honnetete de ses reponses. AchzodCoaching ne pourra etre tenu responsable de tout 
              dommage direct ou indirect resultant de l'utilisation ou de l'interpretation des resultats 
              de l'audit.
            </p>
            <p className="mt-2 text-muted-foreground">
              L'utilisateur est invite a consulter un professionnel de sante qualifie avant toute 
              demarche engageant sa sante ou son equilibre.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 6 - Loi Applicable et Juridiction</h2>
            <ul className="list-disc pl-6 text-muted-foreground">
              <li>Code de la consommation : articles L111-1 a L111-7</li>
              <li>Code de la consommation : articles R111-1 et R111-2</li>
              <li>Article 19 de la loi n°2004-575 du 21 juin 2004 pour la confiance dans l'economie numerique</li>
              <li>Loi n°2004-575 du 21 juin 2004 pour la confiance dans l'economie numerique : article 6</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 7 - Contact</h2>
            <p className="text-muted-foreground">
              Pour tout signalement de contenus ou d'activites illicites, l'Utilisateur peut contacter 
              l'Editeur a l'adresse suivante : <a href="mailto:achzodyt@gmail.com" className="text-primary hover:underline">achzodyt@gmail.com</a>, 
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
