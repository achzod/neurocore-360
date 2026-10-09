# Rapport local — correctifs fonctionnels et conformité APEXLABS

Date : 9 octobre 2026

Branche : `fix/apex-functional-audit-20261009`

Base : commit `02064e2f` du PR #195

Périmètre exclu : routes API exposant des données privées, traitées dans un autre clone.

## Correctifs livrés

### 1. Vraie 404 et `noindex`

- Le fallback Express ne renvoie plus le shell d’accueil en HTTP 200 pour une URL publique inconnue.
- Les routes inconnues renvoient désormais HTTP 404, `X-Robots-Tag: noindex, follow`, une meta robots `noindex, follow`, un titre 404 et un contenu de secours explicite.
- Les articles, piliers et catégories de blog inconnus suivent le même contrat.
- Les fichiers inconnus avec extension (`.png`, `.js`, `.css`, etc.) renvoient une réponse 404 `text/plain` et ne passent plus par le fallback SPA.
- Les routes fonctionnelles privées ou utilitaires explicitement reconnues conservent leur HTTP 200 avec `noindex`.
- Le composant React 404 force aussi `noindex, follow` lors des navigations côté client.

### 2. Open Graph

- Ajout de `client/public/og-default.png`, vrai PNG RGB 1200×630.
- `og:image` et `twitter:image` par défaut pointent vers ce fichier.
- Ajout des dimensions et du MIME Open Graph.
- SHA-256 : `f52cbf87201bfa7d320d89535cf8732d43178d669bc5fece1fd05c22efcf99bf`.

### 3. Consentement analytics/publicitaire

- Consent Mode v2 est initialisé dans le `<head>` avant tout tag réseau avec les quatre signaux à `denied` : `ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`.
- Aucun script GA4, Google Ads, GTM, Meta Pixel ni balise `noscript` de tracking n’est chargé dans le HTML initial.
- Les tags Google et Meta ne sont injectés qu’après « Tout accepter ».
- « Tout refuser » maintient les quatre signaux à `denied` et ne charge aucun tracker.
- Les fonctions analytics applicatives vérifient aussi le consentement avant d’émettre un événement.
- Le choix antérieur est réappliqué au chargement ; le bouton du footer permet de le réinitialiser.

### 4. Blood Analysis — consentement santé explicite

- Ajout d’une case non précochée avant paiement avec mention explicite des données de santé et lien vers la politique de confidentialité.
- Le CTA Carte/Klarna reste désactivé tant que l’email et le consentement ne sont pas valides.
- Le backend refuse également la création de checkout sans `blood-health-consent-v1` (`HEALTH_DATA_CONSENT_REQUIRED`) : le contrôle ne dépend donc pas uniquement du front.
- Le consentement est enregistré avec version, horodatage client/serveur, IP, user-agent et moyen de paiement dans les métadonnées de commande ; la version est aussi transmise dans les métadonnées Stripe.
- Le chemin promo 100 % est couvert par la même gate et conserve aussi la preuve de consentement.

### 5. Disclaimer médical

- Nouveau composant commun visible dans tous les footers : accueil et toutes les pages offre incluses.
- Ajout autonome sur les parcours sans footer : questionnaires Discovery/Anabolic/Ultimate, Pré-Peptides, Peptides Engine et checkout interactif.
- Texte court : contenu éducatif/préventif, pas de diagnostic, prescription ou substitution à un professionnel de santé.

### 6. FAQ et copy

- La FAQ distingue désormais clairement :
  - Discovery gratuit ;
  - Anabolic, Ultimate, Blood et Peptides Engine en paiements uniques ;
  - FormCheck en abonnement mensuel résiliable, avec tarifs du premier mois puis renouvellement.
- Peptides Engine Solo/Coached/Tracked est explicitement couvert.
- La version SSR/JSON-LD de la FAQ contient aussi cette réponse.
- Correction des accents critiques sur consentement santé, confidentialité, mentions légales, gestion des cookies, paiement sécurisé, FAQ, titres/meta et plusieurs blocs Peptides/Blood.
- « Saisis ton adresse email » remplace le libellé ambigu de la gate questionnaire ; « Être orienté » et les mentions de paiement sont corrigés.

## C4 — fournisseurs / SARMs : mesure conservatrice

### Appliqué, réversible et sans suppression

- Tous les articles dont la catégorie canonique est `sarms` restent accessibles, mais reçoivent meta robots et header `X-Robots-Tag: noindex, follow`.
- La catégorie `/blog/categorie/sarms` reçoit la même protection.
- Ces 16 URL (catégorie + articles canoniques concernés) sont retirées du sitemap au build.
- Aucun article, texte, fournisseur, lien ou rapport client n’a été supprimé ou réécrit dans ce lot.

### Décision business proposée — non appliquée

Mesure conservatrice exacte à valider avec le juriste et les équipes Stripe/Google/Meta avant toute activation :

1. créer un flag serveur `PUBLIC_PURCHASE_FACILITATION=false`, désactivé par défaut ;
2. lorsque le flag est désactivé, masquer uniquement sur les surfaces publiques et les nouveaux livrables commerciaux les noms/liens directs de fournisseurs, comparaisons « 60–90 % moins cher », CTA d’achat et instructions de reconstitution orientées achat ;
3. remplacer ces blocs par : « APEXLABS fournit une analyse éducative et un cadre de suivi. Aucune mise en relation fournisseur ni aide à l’achat n’est fournie pendant la revue de conformité. » ;
4. conserver le contenu actuel dans un espace d’archive interne non public pour audit et réversibilité ;
5. ne réactiver le flag qu’après validation écrite du processeur de paiement et avis juridique sur le périmètre exact.

Cette mesure n’a pas été codée ici, car elle modifie la promesse commerciale du Peptides Engine et nécessite une décision explicite. La landing Peptides n’a pas été passée en `noindex` pour la même raison.

## Vérifications

- `npx tsx --test server/functionalCompliance.test.ts` : **6/6 PASS**.
- Compilation ciblée esbuild des composants modifiés, de `server/static.ts` et de `server/routes.ts` : **PASS**.
- Test runtime du serveur statique construit :
  - URL inconnue → 404 + noindex ;
  - offre connue → 200 ;
  - `og-default.png` → 200 `image/png` ;
  - article SARMs → 200 + `X-Robots-Tag: noindex, follow`.
- `npm run build` : **PASS** ; 3579 modules Vite, bundle serveur généré.
- `git diff --check` : **PASS**.
- `npm run check` : **échec sur erreurs TypeScript déjà présentes hors de ce lot** (notamment `CoachingPromoBanner`/`DiscoveryScanReport`, doublon `eq` dans `emailTracking.ts`, méthodes storage/monitoring et anciens blocs `routes.ts`). Aucun diagnostic ne pointe vers les nouveaux composants de consentement, disclaimer, Blood checkout, FAQ ou serveur statique. Le build production complet passe malgré cette dette de typecheck préexistante.

## Non-actions

- Aucun déploiement.
- Aucun push.
- Aucune route API de données privées modifiée.
- Aucun contenu fournisseur supprimé.
- Aucun choix business irréversible effectué.
