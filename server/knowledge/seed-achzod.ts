/**
 * APEXLABS - Knowledge Base Seed
 * Articles manuels ACHZOD - Biomécanique, protocoles, expérience terrain
 *
 * Run: npx tsx server/knowledge/seed-achzod.ts
 */

import { saveArticles, ScrapedArticle } from "./storage";

const ACHZOD_ARTICLES: Omit<ScrapedArticle, "scrapedAt">[] = [
  // =============================================================================
  // BIOMECANIQUE EPAULE
  // =============================================================================
  {
    source: "achzod",
    title: "Pronation et Espace Sous-Acromial : Clé de la Prévention des Blessures d'Épaule",
    category: "biomecanique",
    url: "achzod://biomecanique/pronation-epaule",
    keywords: ["pronation", "supination", "epaule", "impingement", "sous-acromial", "humerus", "acromion", "rotation", "bench press", "developpé couché"],
    content: `
PRONATION ET ESPACE SOUS-ACROMIAL

La prise de main (pronation vs supination vs neutre) affecte directement la position de l'humérus et donc l'espace sous-acromial disponible pour le passage du tendon du sus-épineux.

MECANISME ANATOMIQUE:
Quand tu passes en prise pronation (paumes vers le bas / overhand), l'humérus fait une rotation interne. Cette rotation interne FERME l'espace sous-acromial - le petit tunnel entre la tête de l'humérus et l'acromion où passe le tendon du sus-épineux (supraspinatus).

IMPACT PAR TYPE DE PRISE:
- PRONATION (barre classique) : Humérus en rotation interne = espace sous-acromial REDUIT = risque impingement ELEVE
- NEUTRE (swiss bar, haltères parallèles) : Humérus neutre = espace sous-acromial NORMAL = risque FAIBLE
- SUPINATION (reverse grip) : Humérus en rotation externe = espace sous-acromial OUVERT = risque TRES FAIBLE

APPLICATION PRATIQUE:
1. Développé couché : Virer la barre droite si douleur, passer aux haltères prise neutre ou swiss bar
2. Elévations latérales : Faire pouces vers le haut (légère rotation externe) au lieu de "verser la bouteille" (rotation interne)
3. Rowing/Tirage : Prise neutre ou supination plutôt que pronation large
4. Développé épaules : Haltères prise neutre, Arnold press en fin de mouvement pas au début

REGLE CLINIQUE:
Epaule qui fait mal = fuir la pronation, chercher le neutre ou la supination. L'humérus reste en rotation externe ou neutre, l'acromion arrête de comprimer le tendon.

RATIO PUSH/PULL:
Pour chaque set de push, faire 2 sets de pull. Non négociable pour la longévité articulaire.
`
  },

  {
    source: "achzod",
    title: "Conflit Sous-Acromial (Impingement) : Diagnostic et Protocole de Récupération",
    category: "biomecanique",
    url: "achzod://biomecanique/impingement-epaule",
    keywords: ["impingement", "conflit sous-acromial", "epaule", "rotator cuff", "coiffe des rotateurs", "sus-épineux", "supraspinatus", "bench press", "douleur epaule"],
    content: `
CONFLIT SOUS-ACROMIAL (IMPINGEMENT) - DIAGNOSTIC ET PROTOCOLE

DEFINITION:
Le conflit sous-acromial est une compression répétée du tendon du sus-épineux (et parfois de la bourse séreuse) entre la tête de l'humérus et l'acromion lors des mouvements d'élévation du bras.

CAUSES PRINCIPALES CHEZ LE MUSCU:
1. Forme incorrecte au bench press : coudes à 90° (flared), pas de rétraction scapulaire, pas d'arch thoracique
2. Déséquilibre musculaire : trop de push vs pull, rotateurs externes faibles (infraspinatus, petit rond), trapèzes inférieurs et serratus inexistants
3. Mobilité déficiente : thoracique bloqué en cyphose, capsule postérieure raide

SIGNES CLINIQUES:
- Douleur à l'élévation du bras entre 60° et 120° (arc douloureux)
- Douleur au développé couché, élévations latérales, dips
- Douleur en position couchée sur l'épaule affectée
- Faiblesse en rotation externe

PROTOCOLE PHASE 1 - CALMER (2 semaines):
Stop temporaire : dev couché barre (remplacer par floor press ou push-ups), élévations latérales classiques (remplacer par Y raises), dips (stop total)
Anti-inflammatoire naturel : Oméga-3 haute dose 3-4g EPA+DHA/jour, Curcumine + pipérine 500mg x2/jour, Glace 15min post-training

PROTOCOLE PHASE 2 - CORRIGER (en parallèle):
- Face pulls : 100 reps/jour (sets de 20-25, léger) - tire vers le visage, rotation externe en fin
- Band pull-aparts : 100 reps/jour - squeeze omoplates, tiens 1 sec
- Rotation externe en décubitus latéral : 3x15/bras, coude collé au corps, 2-3 kg max, lent et contrôlé
- Prone Y-T-W : 2x10 chaque position - active trapèze inférieur et serratus
- Mobilité thoracique : foam roller 2min/jour, cat-cow 10 reps, thread the needle 10/côté

PROTOCOLE PHASE 3 - REPRENDRE (après 2-3 sem sans douleur):
Form check bench : coudes 45-75° (pas 90°), scapula rétractées ET déprimées, arch thoracique, grip pas trop large
Variantes safe : swiss bar, haltères, floor press

RED FLAGS - MEDECIN DIRECT:
- Douleur nocturne qui réveille
- Faiblesse soudaine (impossibilité lever le bras)
- Douleur irradiante dans le bras/main
- Craquement + douleur intense soudaine
`
  },

  // =============================================================================
  // HORMONES - SIGNATURE ESTROGENIQUE
  // =============================================================================
  {
    source: "achzod",
    title: "Signature Estrogénique Masculine : Diagnostic Visuel et Protocole",
    category: "hormones",
    url: "achzod://hormones/signature-estrogenique",
    keywords: ["estrogenes", "testosterone", "gynecomastie", "aromatase", "hanches larges", "distribution graisseuse", "gynoide", "DIM", "zinc"],
    content: `
SIGNATURE ESTROGENIQUE MASCULINE - DIAGNOSTIC ET PROTOCOLE

SIGNES VISUELS:
- Hanches larges avec stockage type féminin
- Gynécomastie (pecs en forme de seins)
- Distribution graisseuse gynoïde (hanches, cuisses, fesses)
- Visage bouffi, rétention d'eau
- Peu de pilosité corporelle malgré l'âge

MECANISMES:
1. AROMATASE HYPERACTIVE : L'enzyme dans le tissu gras convertit la testostérone en estradiol. Plus de gras = plus d'aromatisation = cercle vicieux.
2. RESISTANCE A L'INSULINE : Pics glycémiques chroniques boostent l'aromatase et favorisent le stockage gynoïde.
3. FOIE SURCHARGE : Le foie métabolise les estrogènes. Alcool, aliments transformés, médicaments = foie lent = estrogènes accumulés.
4. CORTISOL CHRONIQUE : Vol de la prégnénolone - le corps fabrique du cortisol au lieu de la testostérone.
5. XENOESTROGENES : Plastiques (BPA, phtalates), parabènes, pesticides miment les estrogènes.

BILAN SANGUIN OBLIGATOIRE:
- Testostérone totale + libre
- Estradiol (E2) SENSIBLE (pas le standard)
- SHBG (si haut, séquestre la testo libre)
- LH / FSH (origine testiculaire vs hypophysaire)
- Prolactine (si haute = inhibe la testo)
- Insuline à jeun + HbA1c
- Bilan hépatique (ASAT, ALAT, GGT)

PROTOCOLE DIET ANTI-ESTROGENIQUE:
- Crucifères quotidiens (brocoli, chou, chou-fleur) : contiennent DIM et I3C
- Zéro alcool (aromatase + hépatotoxique)
- Zéro sucres ajoutés, zéro ultra-transformé
- Protéines à chaque repas (1.6-2g/kg)
- Fibres +++ (les estrogènes s'éliminent par les selles)

STACK SUPPLEMENTS:
- Zinc 30mg/jour : inhibe l'aromatase
- DIM 200-300mg/jour : métabolise les estrogènes voie 2-OH (bénéfique)
- Vitamine D 4000-5000 UI/jour : soutient la testostérone
- Magnésium bisglycinate 400mg/soir : sommeil + production testo
- Calcium D-Glucarate 500mg x2/jour : aide le foie phase 2

LIFESTYLE:
- Virer plastiques (contenants, bouteilles) : xénoestrogènes
- Sommeil 7-8h non négociable (chaque heure en moins = -10-15% testo)
- Training : compound heavy (squat, deadlift, press) pour boost hormonal
- Perte de gras prioritaire : moins de tissu adipeux = moins d'aromatase

SEUILS D'ALERTE:
- Testo < 400 ng/dL + E2 > 30 pg/mL : rattrapable naturellement avec protocole strict
- Testo < 300 ng/dL : consultation endocrinologue, TRT à discuter
- Prolactine haute : IRM hypophyse (adénome?)
`
  },

  // =============================================================================
  // SOMMEIL
  // =============================================================================
  {
    source: "achzod",
    title: "Architecture du Sommeil et Impact sur la Composition Corporelle",
    category: "sommeil",
    url: "achzod://sommeil/architecture-composition",
    keywords: ["sommeil", "GH", "hormone de croissance", "cortisol", "testosterone", "REM", "sommeil profond", "N3", "circadien"],
    content: `
ARCHITECTURE DU SOMMEIL ET COMPOSITION CORPORELLE

CYCLES DE SOMMEIL:
Un cycle dure environ 90 minutes et comprend :
- N1 : Endormissement (5%)
- N2 : Sommeil léger (45-55%)
- N3 : Sommeil profond / ondes lentes (15-20%)
- REM : Sommeil paradoxal (20-25%)

SOMMEIL PROFOND (N3) - LA PHASE ANABOLIQUE:
- 70% de la GH quotidienne est sécrétée pendant le N3
- Réparation tissulaire maximale (muscle, tendons, os)
- Consolidation mémoire procédurale
- Détoxification cérébrale (système glymphatique)
- Majoritairement dans la première moitié de la nuit

SOMMEIL REM - LA PHASE DE REGULATION:
- Régulation émotionnelle et traitement des souvenirs
- Consolidation apprentissage moteur
- Rêves
- Majoritairement dans la deuxième moitié de la nuit

IMPACT DEFICIT DE SOMMEIL:
- 1 nuit de 4h : Testostérone -10-15% le lendemain
- 4 nuits de restriction (6h) : Résistance insuline +30%
- Cortisol matinal augmenté de 37-45%
- Leptine -18% (hormone de satiété)
- Ghréline +28% (hormone de faim)
- Synthèse protéique musculaire réduite de 18-25%

CHRONOTYPE ET TIMING:
- Couchers et levers réguliers (+/- 30 min) même le week-end
- Température corporelle chute naturellement vers 22-23h
- Exposition lumière du matin : ancre le rythme circadien
- Mélatonine endogène monte 2h avant le coucher habituel

FACTEURS PERTURBATEURS:
- Lumière bleue après 20h : supprime mélatonine de 50%
- Alcool : supprime le REM, fragmente le sommeil
- Caféine : demi-vie 5-6h (café 14h = 50% encore à 20h)
- Repas lourd < 3h du coucher : perturbe N3
- Température chambre > 19°C : réduit sommeil profond

PROTOCOLE OPTIMISATION:
- 7-9h de sommeil pour la majorité des adultes
- Chambre : 18-19°C, obscurité totale, silence
- Routine soir : dim lights 2h avant, zéro écran 1h avant
- Suppléments si besoin : magnésium 400mg, glycine 3g, L-théanine 200mg
`
  },

  // =============================================================================
  // DIGESTION
  // =============================================================================
  {
    source: "achzod",
    title: "Perméabilité Intestinale (Leaky Gut) et Inflammation Systémique",
    category: "digestion",
    url: "achzod://digestion/leaky-gut",
    keywords: ["leaky gut", "permeabilite intestinale", "zonuline", "inflammation", "microbiome", "glutamine", "tight junctions"],
    content: `
PERMEABILITE INTESTINALE (LEAKY GUT) ET INFLAMMATION

ANATOMIE NORMALE:
Les cellules de la paroi intestinale (entérocytes) sont liées par des jonctions serrées (tight junctions). Ces jonctions contrôlent ce qui passe dans le sang : nutriments OUI, toxines/bactéries NON.

MECANISME DU LEAKY GUT:
1. Les jonctions serrées se relâchent (via zonuline, protéine régulatrice)
2. Des particules non digérées, toxines, LPS bactériens passent dans le sang
3. Le système immunitaire réagit = inflammation systémique chronique
4. Cette inflammation affecte TOUT : cerveau, muscles, articulations, métabolisme

CAUSES:
- Gluten (augmente la zonuline chez tous, pas seulement les coeliaques)
- Alcool
- AINS (ibuprofène, aspirine) utilisés chroniquement
- Stress chronique (cortisol altère la barrière)
- Dysbiose (déséquilibre du microbiome)
- Déficit en zinc, vitamine A, glutamine

SYMPTOMES:
- Ballonnements chroniques
- Fatigue post-repas inexpliquée
- Intolérances alimentaires multiples qui s'aggravent
- Brouillard mental
- Douleurs articulaires diffuses
- Problèmes de peau (eczéma, acné)
- Rétention d'eau inexpliquée
- Difficulté à perdre du gras malgré déficit calorique

LIEN AVEC COMPOSITION CORPORELLE:
- Inflammation chronique = résistance à l'insuline = stockage
- LPS bactériens dans le sang = endotoxémie métabolique
- Cortisol élevé = catabolisme musculaire + stockage abdominal
- Malabsorption des nutriments = carences malgré bonne alimentation

PROTOCOLE DE REPARATION (4-8 semaines):
PHASE 1 - RETIRER (2 semaines):
- Gluten 100%
- Produits laitiers (sauf beurre clarifié)
- Sucres ajoutés
- Alcool
- Aliments transformés
- AINS

PHASE 2 - REPARER (parallèle):
- L-Glutamine 5g matin à jeun + 5g soir
- Zinc carnosine 75mg x2/jour
- Bouillon d'os 1 tasse/jour (collagène, glycine)
- Aloe vera 50ml/jour

PHASE 3 - REINOCULER:
- Probiotiques multi-souches (Lactobacillus, Bifidobacterium)
- Aliments fermentés : choucroute, kimchi, kéfir
- Fibres prébiotiques : poireaux, oignons, ail, asperges

PHASE 4 - REINTRODUIRE:
- Un aliment à la fois
- Attendre 48-72h entre chaque réintroduction
- Noter les réactions
`
  },

  // =============================================================================
  // METABOLISME
  // =============================================================================
  {
    source: "achzod",
    title: "Flexibilité Métabolique : Pourquoi Tu Stockes Malgré le Déficit",
    category: "metabolisme",
    url: "achzod://metabolisme/flexibilite-metabolique",
    keywords: ["flexibilite metabolique", "insuline", "lipolyse", "mitochondries", "CPT1", "cetose", "glucides", "resistance insuline"],
    content: `
FLEXIBILITE METABOLIQUE - POURQUOI TU STOCKES MALGRE LE DEFICIT

DEFINITION:
La flexibilité métabolique est la capacité de ton corps à switcher efficacement entre l'utilisation du glucose et des acides gras comme carburant selon la disponibilité.

METABOLISME FLEXIBLE (SAIN):
- A jeun/low carb : brûle les graisses efficacement
- Post-repas glucidique : utilise le glucose, stocke le minimum
- Pendant l'effort : adapte le mix selon l'intensité
- Pas de fringales, énergie stable toute la journée

METABOLISME INFLEXIBLE (DYSFONCTIONNEL):
- Dépendant du glucose : incapable de brûler les graisses efficacement
- Hypoglycémies réactives : crash 2-3h après les repas
- Fringales de sucre constantes
- Fatigue si pas mangé toutes les 3h
- Stocke facilement, perd difficilement

MECANISME:
L'entrée des acides gras dans les mitochondries (pour être brûlés) nécessite l'enzyme CPT1. Cette enzyme est INHIBEE par le malonyl-CoA, qui est élevé quand l'insuline est haute.

Insuline chroniquement haute = CPT1 bloqué = acides gras ne peuvent pas entrer dans les mitochondries = ils sont re-stockés.

CAUSES D'INFLEXIBILITE:
1. Pics glycémiques répétés (sucres, féculents raffinés)
2. Grignotage constant (insuline jamais basse)
3. Sédentarité (mitochondries dysfonctionnelles)
4. Manque de sommeil (résistance insuline)
5. Stress chronique (cortisol augmente glycémie)

SIGNES:
- Envies de sucre irrépressibles
- Incapacité à sauter un repas sans trembler
- Coup de barre 14-15h
- Faim constante malgré calories suffisantes
- Difficulté à perdre du gras malgré déficit
- Frilosité (métabolisme au ralenti)

PROTOCOLE RESTAURATION (4-8 semaines):

NUTRITION:
- Petit-déjeuner protéines + graisses, ZERO sucre
- Fenêtre alimentaire 8-10h (pas de grignotage)
- Glucides concentrés autour du training uniquement
- Fibres à chaque repas (ralentissent absorption)

TRAINING:
- Zone 2 cardio 150-180 min/semaine (force les mitochondries à brûler du gras)
- Musculation pour sensibilité insuline musculaire

LIFESTYLE:
- Marche post-repas 10-15 min (réduit pic glycémique de 30%)
- Sommeil 7-8h (restaure sensibilité insuline)
- Gestion stress (cortisol = glycémie)

SUPPLEMENTS:
- Berbérine 500mg avant repas glucidiques (mime metformine)
- Chrome 200mcg/jour (sensibilité insuline)
- Magnésium 400mg (cofacteur insuline)
- ALA 600mg (antioxydant mitochondrial)

TRACKING:
- Glucose en continu (CGM) si possible
- Objectif : variabilité glycémique < 30 mg/dL
- Pas de pic > 140 mg/dL post-repas
`
  },

  // =============================================================================
  // TRAINING
  // =============================================================================
  {
    source: "achzod",
    title: "Volume, Fréquence et Récupération : Trouver Son Sweet Spot",
    category: "training",
    url: "achzod://training/volume-frequence",
    keywords: ["volume", "frequence", "recuperation", "MEV", "MRV", "MAV", "deload", "fatigue", "SRA", "periodisation"],
    content: `
VOLUME, FREQUENCE ET RECUPERATION - TROUVER SON SWEET SPOT

CONCEPTS CLES (Renaissance Periodization):

MEV (Minimum Effective Volume):
Le minimum de séries par semaine pour maintenir les gains. Généralement 6-8 séries/muscle/semaine pour la plupart des gens.

MAV (Maximum Adaptive Volume):
Le volume qui produit les meilleurs gains. Généralement 12-20 séries/muscle/semaine selon le muscle et l'individu.

MRV (Maximum Recoverable Volume):
Le maximum que tu peux récupérer. Au-delà = régression. Généralement 20-25 séries/muscle/semaine max.

COURBE SRA (Stimulus Recovery Adaptation):
Après un entraînement :
1. STIMULUS : Le muscle est endommagé/fatigué
2. RECOVERY : Le corps répare (24-72h selon intensité)
3. ADAPTATION : Le muscle est plus fort qu'avant (supercompensation)
4. Retour au baseline si pas de nouveau stimulus

ERREUR CLASSIQUE:
Réentraîner AVANT que la récupération soit complète = accumulation de fatigue = régression.

SIGNES DE VOLUME EXCESSIF:
- Force qui stagne ou régresse
- Courbatures qui durent > 72h
- Motivation en baisse
- Sommeil perturbé
- Articulations douloureuses
- Système immunitaire affaibli

FREQUENCE OPTIMALE PAR MUSCLE:
- 2x/semaine : sweet spot pour la plupart
- 3x/semaine : possible pour muscles récupérant vite (épaules, bras) ou si volume par séance faible
- 1x/semaine : sous-optimal sauf si volume très élevé par séance

PERIODISATION PRATIQUE:

MESOCYCLE TYPE (4-6 semaines):
- Semaine 1 : MEV (adaptation)
- Semaine 2-3 : Volume croissant vers MAV
- Semaine 4-5 : Proche MRV (overreaching fonctionnel)
- Semaine 6 : DELOAD (-40% volume, même intensité)

DELOAD - NON NEGOCIABLE:
- Toutes les 4-6 semaines
- Réduit volume de 40-50%
- Maintient intensité (charges)
- Permet dissipation fatigue accumulée
- Prépare le prochain bloc de progression

AJUSTEMENTS INDIVIDUELS:
Facteurs qui REDUISENT la capacité de récupération :
- Age > 35 ans
- Déficit calorique
- Stress élevé
- Sommeil < 7h
- Travail physique

Ces facteurs = rester plus proche du MEV que du MRV.

TRACKING:
- Notes de séance (charges, RPE, sensations)
- Mesure de la progression semaine/semaine
- Écoute des signaux de fatigue
- Ajustement en temps réel
`
  }
];

async function seedAchzodArticles() {
  console.log("\n📚 SEEDING ACHZOD KNOWLEDGE BASE...\n");

  const articlesToSave: ScrapedArticle[] = ACHZOD_ARTICLES.map(a => ({
    ...a,
    scrapedAt: new Date()
  }));

  try {
    const result = await saveArticles(articlesToSave);
    console.log(`✅ Saved: ${result.saved} articles`);
    console.log(`⏭️  Duplicates skipped: ${result.duplicates}`);
    console.log("\n📝 Articles added:");
    for (const article of ACHZOD_ARTICLES) {
      console.log(`   - [${article.category}] ${article.title}`);
    }
    console.log("\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding:", error);
    process.exit(1);
  }
}

// Export for use in other scripts
export { ACHZOD_ARTICLES };

// Run if called directly
seedAchzodArticles();
