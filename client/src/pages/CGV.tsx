import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function CGV() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-4xl px-4 py-16">
        <h1 className="mb-8 text-3xl font-bold">Conditions Generales de Vente</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          
          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 1 - Champ d'application</h2>
            <p className="text-muted-foreground">
              Les presentes Conditions Generales de Vente s'appliquent a toutes commandes passees sur 
              le site NEUROCORE 360, service propose par AchzodCoaching.
            </p>
            <p className="mt-2 text-muted-foreground">
              Est considere comme "client" toute personne physique ou morale realisant aupres de ce 
              site une commande validee par notre plateforme de paiement securisee.
            </p>
            <p className="mt-2 text-muted-foreground">
              AchzodCoaching se reserve la possibilite d'adapter ou de modifier les presentes Conditions 
              Generales de Vente. En cas de modification, il sera applique a chaque commande les Conditions 
              Generales de Vente en vigueur au jour de la commande.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 2 - Description des Services</h2>
            <p className="text-muted-foreground">
              NEUROCORE 360 propose un audit complet couvrant Hormones, Metabolisme, Biohacking, 
              Biomecanique et Neurotransmetteurs. 180 questions reparties en 15 domaines. Les services proposes sont :
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <h4 className="font-semibold">Audit Decouverte (Gratuit)</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rapport de base avec score global et resume des domaines analyses.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <h4 className="font-semibold">Audit Premium (79€ - Paiement unique)</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rapport complet de 20+ pages avec recommandations personnalisees, plan d'action 30 jours, 
                  et analyse detaillee de chaque domaine.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <h4 className="font-semibold">Audit Elite (129€/an)</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tous les avantages Premium + 4 audits par an pour suivre ta progression + 
                  suivi de l'evolution dans le temps.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 3 - Deduction sur les Coachings</h2>
            <p className="text-muted-foreground">
              Le montant paye pour les audits Premium (79€) et Elite (129€) est deductible de l'achat 
              d'un coaching AchzodCoaching, sous les conditions suivantes :
            </p>
            <ul className="mt-2 list-disc pl-6 text-muted-foreground">
              <li><strong>Coaching Essential (249€+)</strong> : Deduction applicable</li>
              <li><strong>Coaching Elite (399€+)</strong> : Deduction applicable</li>
              <li><strong>Achzod Private Lab (499€+)</strong> : Deduction applicable</li>
              <li><strong>Coaching Starter (149€)</strong> : Deduction NON applicable</li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              La deduction est valable pendant 12 mois a compter de la date d'achat de l'audit.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 4 - Commandes</h2>
            <p className="text-muted-foreground">
              L'acceptation d'une commande se fait via notre plateforme de paiement securisee Stripe. 
              Une fois votre commande saisie, un mail de confirmation vous sera adresse et votre 
              commande enregistree.
            </p>
            <p className="mt-2 text-muted-foreground">
              Le client s'engage a fournir une adresse email valide afin de pouvoir recevoir l'acces 
              a son audit. Toute commande vaut acceptation des presentes Conditions Generales de Vente.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 5 - Prix et Paiement</h2>
            <p className="text-muted-foreground">
              Les prix indiques en euros sont TTC. Le paiement est exigible immediatement a la commande 
              via Stripe (carte bancaire). Le paiement securise en ligne est realise par l'intermediaire 
              de Stripe. Les informations transmises sont chiffrees selon les standards de securite les 
              plus eleves.
            </p>
            <p className="mt-2 text-muted-foreground">
              AchzodCoaching se reserve le droit de modifier les tarifs a tout moment.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 6 - Livraison</h2>
            <p className="text-muted-foreground">
              Les audits sont delivres sous forme numerique. L'acces au rapport complet est immediat 
              apres validation du paiement. Le client accede a son rapport via son espace personnel 
              (Dashboard) sur le site.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 7 - Politique de Non-Remboursement</h2>
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <h4 className="font-semibold text-destructive">Absence de droit de retractation</h4>
              <p className="mt-2 text-sm text-muted-foreground">
                AchzodCoaching est une societe etablie a Dubai, Emirats arabes unis. Les lois locales 
                applicables ne prevoient aucun droit de retractation de 14 jours comme en France ou 
                dans l'Union europeenne.
              </p>
            </div>
            <p className="mt-4 text-muted-foreground">
              En validant sa commande et en procedant au paiement, le client :
            </p>
            <ul className="mt-2 list-disc pl-6 text-muted-foreground">
              <li>Demande expressement que l'execution du service commence immediatement apres paiement.</li>
              <li>Reconnait que les prestations fournies sont des contenus numeriques delivres integralement des validation.</li>
              <li>Accepte et confirme renoncer irrevocablement a toute possibilite d'annulation ou de remboursement.</li>
            </ul>
            <p className="mt-4 text-muted-foreground">
              <strong>Aucune exception :</strong> Aucun remboursement ne sera accorde en cas de changement 
              d'avis, insatisfaction subjective, difficultes personnelles ou absence d'utilisation.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 8 - Acceptation du Client</h2>
            <p className="text-muted-foreground">
              Le client declare avoir pris connaissance de l'ensemble des presentes Conditions Generales 
              de Vente et les accepter sans restriction ni reserve.
            </p>
            <p className="mt-2 text-muted-foreground">
              Le client reconnait et accepte expressement que :
            </p>
            <ul className="mt-2 list-disc pl-6 text-muted-foreground">
              <li>Les prestations sont fournies par une societe etablie a Dubai, ou aucun droit legal de retractation n'existe.</li>
              <li>Toute commande est ferme et definitive des validation et paiement.</li>
              <li>Les tarifs sont expressement agrees et acceptes.</li>
              <li>Il a recu toutes les informations necessaires pour s'assurer de l'adequation de l'offre a ses besoins.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 9 - Propriete Intellectuelle</h2>
            <p className="text-muted-foreground">
              L'ensemble des textes, illustrations, algorithmes, rapports et contenus fournis par 
              NEUROCORE 360 sont proteges par le droit d'auteur. Toute reproduction, diffusion ou 
              utilisation commerciale est interdite sans autorisation prealable ecrite.
            </p>
            <p className="mt-2 text-muted-foreground">
              Le client s'interdit tout usage des rapports et services a des fins autres que personnelles.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 10 - Responsabilite</h2>
            <p className="text-muted-foreground">
              L'audit NEUROCORE 360 fournit des recommandations basees sur les reponses du client. 
              Ces recommandations sont a titre informatif et ne remplacent pas un avis medical professionnel.
            </p>
            <p className="mt-2 text-muted-foreground">
              Le client est seul responsable de l'utilisation et de l'interpretation des resultats. 
              AchzodCoaching ne pourra etre tenu responsable de tout dommage direct ou indirect 
              resultant de l'utilisation des informations fournies.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 11 - Protection des Donnees</h2>
            <p className="text-muted-foreground">
              Conformement a la Loi Informatique et Libertes du 6 janvier 1978 et au RGPD, vous disposez 
              des droits d'interrogation, d'acces, de modification, d'opposition et de rectification 
              sur les donnees personnelles vous concernant.
            </p>
            <p className="mt-2 text-muted-foreground">
              Vos donnees sont stockees de maniere securisee et ne sont jamais partagees avec des tiers 
              sans votre consentement explicite.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-xl font-semibold">Article 12 - Droit Applicable</h2>
            <p className="text-muted-foreground">
              Les presentes conditions sont regies par les lois en vigueur a Dubai, Emirats arabes unis. 
              Tout litige sera soumis a la competence exclusive des tribunaux de Dubai.
            </p>
            <p className="mt-2 text-muted-foreground">
              En cas de litige, le client s'adressera en priorite a AchzodCoaching pour obtenir une 
              solution amiable par email a : <a href="mailto:achzodyt@gmail.com" className="text-primary hover:underline">achzodyt@gmail.com</a>
            </p>
          </section>

          <div className="mt-8 rounded-lg border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              <strong>Contact :</strong><br />
              AchzodCoaching FZO<br />
              Building A1, Dubai Digital Park, Dubai Silicon Oasis, UAE<br />
              Email : <a href="mailto:achzodyt@gmail.com" className="text-primary hover:underline">achzodyt@gmail.com</a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
