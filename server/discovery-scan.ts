/**
 * NEUROCORE 360 - Discovery Scan Engine
 * Algo dédié pour l'analyse gratuite (66 questions)
 *
 * OBJECTIF: Analyser et expliquer les blocages SANS recommandations
 * - Mécanismes physiologiques
 * - Conséquences métaboliques, hormonales, digestives, psycho
 * - CTA vers Anabolic Bioscan / Ultimate Scan
 *
 * Utilise Claude Opus 4.5 + Knowledge Base (Huberman, Attia, etc.)
 */

import Anthropic from '@anthropic-ai/sdk';
import { searchArticles, searchFullText } from './knowledge/storage';

// ============================================
// TYPES
// ============================================

export interface DiscoveryResponses {
  // Profil base
  sexe?: string;
  prenom?: string;
  email?: string;
  age?: string;
  taille?: string;
  poids?: string;
  objectif?: string;

  // Santé & Historique
  'diagnostic-medical'?: string[];
  'traitement-medical'?: string;
  'bilan-sanguin-recent'?: string;
  'plateau-metabolique'?: string;
  'tca-historique'?: string;
  'experience-sportive'?: string;

  // Sommeil
  'heures-sommeil'?: string;
  'qualite-sommeil'?: string;
  'endormissement'?: string;
  'reveils-nocturnes'?: string;
  'reveil-fatigue'?: string;
  'heure-coucher'?: string;

  // Stress & Nerveux
  'niveau-stress'?: string;
  'anxiete'?: string;
  'concentration'?: string;
  'irritabilite'?: string;
  'humeur-fluctuation'?: string;
  'gestion-stress'?: string[];

  // Énergie
  'energie-matin'?: string;
  'energie-aprem'?: string;
  'coup-fatigue'?: string;
  'envies-sucre'?: string;
  'motivation'?: string;
  'thermogenese'?: string;

  // Digestion
  'digestion-qualite'?: string;
  'ballonnements'?: string;
  'transit'?: string;
  'reflux'?: string;
  'intolerance'?: string[];
  'energie-post-repas'?: string;

  // Training
  'sport-frequence'?: string;
  'type-sport'?: string[];
  'intensite'?: string;
  'recuperation'?: string;
  'courbatures'?: string;
  'performance-evolution'?: string;

  // Nutrition Base
  'nb-repas'?: string;
  'petit-dejeuner'?: string;
  'proteines-jour'?: string;
  'eau-jour'?: string;
  'regime-alimentaire'?: string;
  'aliments-transformes'?: string;
  'sucres-ajoutes'?: string;
  'alcool'?: string;

  // Lifestyle
  'cafe-jour'?: string;
  'tabac'?: string;
  'temps-ecran'?: string;
  'exposition-soleil'?: string;
  'profession'?: string;
  'heures-assis'?: string;

  // Mindset
  'frustration-passee'?: string;
  'si-rien-change'?: string;
  'ideal-6mois'?: string;
  'plus-grosse-peur'?: string;
  'engagement-niveau'?: string;
  'motivation-principale'?: string;
  'consignes-strictes'?: string;
  'temps-training-semaine'?: string;

  [key: string]: any;
}

export interface DiscoveryAnalysisResult {
  globalScore: number;
  scoresByDomain: {
    sommeil: number;
    stress: number;
    energie: number;
    digestion: number;
    training: number;
    nutrition: number;
    lifestyle: number;
    mindset: number;
  };
  blocages: BlockageAnalysis[];
  synthese: string;
  ctaMessage: string;
}

export interface BlockageAnalysis {
  domain: string;
  severity: 'critique' | 'modere' | 'leger';
  title: string;
  mechanism: string; // Explication physiologique
  consequences: string[]; // Métabo, hormonal, psycho, etc.
  sources: string[]; // Huberman, Attia, etc.
}

// ============================================
// SCORING FUNCTIONS
// ============================================

function scoreSommeil(responses: DiscoveryResponses): number {
  let score = 100;

  // Heures de sommeil
  const heures = responses['heures-sommeil'];
  if (heures === 'moins-5') score -= 40;
  else if (heures === '5-6') score -= 25;
  else if (heures === '6-7') score -= 10;

  // Qualité
  const qualite = responses['qualite-sommeil'];
  if (qualite === 'mauvaise') score -= 30;
  else if (qualite === 'moyenne') score -= 15;

  // Endormissement
  const endormissement = responses['endormissement'];
  if (endormissement === 'toujours') score -= 20;
  else if (endormissement === 'souvent') score -= 10;

  // Réveils nocturnes
  const reveils = responses['reveils-nocturnes'];
  if (reveils === 'chaque-nuit') score -= 20;
  else if (reveils === 'souvent') score -= 10;

  // Réveil fatigué
  const reveilFatigue = responses['reveil-fatigue'];
  if (reveilFatigue === 'toujours') score -= 25;
  else if (reveilFatigue === 'souvent') score -= 15;

  // Heure de coucher tardive
  const heureCoucher = responses['heure-coucher'];
  if (heureCoucher === 'apres-00h') score -= 15;
  else if (heureCoucher === '23h-00h') score -= 5;

  return Math.max(0, score);
}

function scoreStress(responses: DiscoveryResponses): number {
  let score = 100;

  const niveauStress = responses['niveau-stress'];
  if (niveauStress === 'tres-eleve') score -= 35;
  else if (niveauStress === 'eleve') score -= 20;
  else if (niveauStress === 'modere') score -= 10;

  const anxiete = responses['anxiete'];
  if (anxiete === 'souvent') score -= 25;
  else if (anxiete === 'parfois') score -= 10;

  const concentration = responses['concentration'];
  if (concentration === 'difficile') score -= 20;
  else if (concentration === 'moyenne') score -= 10;

  const irritabilite = responses['irritabilite'];
  if (irritabilite === 'tres-souvent') score -= 20;
  else if (irritabilite === 'souvent') score -= 10;

  const humeur = responses['humeur-fluctuation'];
  if (humeur === 'constamment') score -= 20;
  else if (humeur === 'souvent') score -= 10;

  return Math.max(0, score);
}

function scoreEnergie(responses: DiscoveryResponses): number {
  let score = 100;

  const energieMatin = responses['energie-matin'];
  if (energieMatin === 'tres-faible') score -= 30;
  else if (energieMatin === 'faible') score -= 20;
  else if (energieMatin === 'moyenne') score -= 10;

  const energieAprem = responses['energie-aprem'];
  if (energieAprem === 'crash') score -= 25;
  else if (energieAprem === 'baisse-moderee') score -= 15;

  const coupFatigue = responses['coup-fatigue'];
  if (coupFatigue === 'quotidien') score -= 25;
  else if (coupFatigue === 'souvent') score -= 15;

  const enviesSucre = responses['envies-sucre'];
  if (enviesSucre === 'souvent') score -= 20;
  else if (enviesSucre === 'parfois') score -= 10;

  const motivation = responses['motivation'];
  if (motivation === 'tres-bas') score -= 20;
  else if (motivation === 'bas') score -= 10;

  const thermogenese = responses['thermogenese'];
  if (thermogenese === 'toujours') score -= 15;
  else if (thermogenese === 'souvent') score -= 10;

  return Math.max(0, score);
}

function scoreDigestion(responses: DiscoveryResponses): number {
  let score = 100;

  const digestion = responses['digestion-qualite'];
  if (digestion === 'mauvaise') score -= 30;
  else if (digestion === 'moyenne') score -= 15;

  const ballonnements = responses['ballonnements'];
  if (ballonnements === 'apres-repas') score -= 25;
  else if (ballonnements === 'souvent') score -= 15;

  const transit = responses['transit'];
  if (transit === 'constipe' || transit === 'diarrhee') score -= 25;
  else if (transit === 'variable') score -= 15;

  const reflux = responses['reflux'];
  if (reflux === 'souvent') score -= 20;
  else if (reflux === 'parfois') score -= 10;

  const intolerances = responses['intolerance'] || [];
  if (intolerances.includes('lactose') || intolerances.includes('gluten')) score -= 10;

  const energiePostRepas = responses['energie-post-repas'];
  if (energiePostRepas === 'crash') score -= 25;
  else if (energiePostRepas === 'somnolence') score -= 15;

  return Math.max(0, score);
}

function scoreTraining(responses: DiscoveryResponses): number {
  let score = 100;

  const frequence = responses['sport-frequence'];
  if (frequence === '0') score -= 30;
  else if (frequence === '1-2') score -= 15;

  const intensite = responses['intensite'];
  if (intensite === 'leger') score -= 15;

  const recuperation = responses['recuperation'];
  if (recuperation === 'mauvaise') score -= 25;
  else if (recuperation === 'moyenne') score -= 15;

  const courbatures = responses['courbatures'];
  if (courbatures === 'toujours') score -= 20;
  else if (courbatures === 'souvent') score -= 10;

  const evolution = responses['performance-evolution'];
  if (evolution === 'regression') score -= 25;
  else if (evolution === 'stagnation') score -= 15;

  return Math.max(0, score);
}

function scoreNutrition(responses: DiscoveryResponses): number {
  let score = 100;

  const nbRepas = responses['nb-repas'];
  if (nbRepas === '1-2') score -= 20;

  const proteines = responses['proteines-jour'];
  if (proteines === 'faible') score -= 25;
  else if (proteines === 'moyen') score -= 10;

  const eau = responses['eau-jour'];
  if (eau === 'moins-1L') score -= 25;
  else if (eau === '1-1.5L') score -= 15;

  const alimentsTransformes = responses['aliments-transformes'];
  if (alimentsTransformes === 'souvent') score -= 25;
  else if (alimentsTransformes === 'parfois') score -= 10;

  const sucresAjoutes = responses['sucres-ajoutes'];
  if (sucresAjoutes === 'eleve') score -= 25;
  else if (sucresAjoutes === 'modere') score -= 10;

  const alcool = responses['alcool'];
  if (alcool === '8+') score -= 25;
  else if (alcool === '4-7') score -= 15;

  return Math.max(0, score);
}

function scoreLifestyle(responses: DiscoveryResponses): number {
  let score = 100;

  const cafe = responses['cafe-jour'];
  if (cafe === '5+') score -= 20;
  else if (cafe === '3-4') score -= 10;

  const tabac = responses['tabac'];
  if (tabac === 'quotidien') score -= 30;
  else if (tabac === 'occasionnel') score -= 15;

  const tempsEcran = responses['temps-ecran'];
  if (tempsEcran === '6h+') score -= 20;
  else if (tempsEcran === '4-6h') score -= 10;

  const soleil = responses['exposition-soleil'];
  if (soleil === 'rare') score -= 20;

  const heuresAssis = responses['heures-assis'];
  if (heuresAssis === '8h+') score -= 25;
  else if (heuresAssis === '6-8h') score -= 15;

  return Math.max(0, score);
}

function scoreMindset(responses: DiscoveryResponses): number {
  let score = 100;

  const engagement = responses['engagement-niveau'];
  if (engagement === '1-3') score -= 30;
  else if (engagement === '4-5') score -= 15;

  const consignes = responses['consignes-strictes'];
  if (consignes === 'non') score -= 15;

  const tempsTraining = responses['temps-training-semaine'];
  if (tempsTraining === 'moins-2h') score -= 20;

  // Analyse qualitative des réponses textuelles
  const frustration = responses['frustration-passee'] || '';
  if (frustration.toLowerCase().includes('abandon') || frustration.toLowerCase().includes('echec')) {
    score -= 10;
  }

  return Math.max(0, score);
}

// ============================================
// BLOCAGE DETECTION
// ============================================

function detectBlocages(responses: DiscoveryResponses, scores: DiscoveryAnalysisResult['scoresByDomain']): BlockageAnalysis[] {
  const blocages: BlockageAnalysis[] = [];

  // Sommeil
  if (scores.sommeil < 60) {
    const severity = scores.sommeil < 40 ? 'critique' : scores.sommeil < 50 ? 'modere' : 'leger';
    blocages.push({
      domain: 'Sommeil',
      severity,
      title: 'Déficit de sommeil chronique',
      mechanism: `Ton sommeil insuffisant (<7h) et/ou de mauvaise qualité perturbe tes rythmes circadiens.
        Pendant le sommeil profond, ton corps sécrète 70% de sa GH (hormone de croissance) quotidienne.
        Le manque de sommeil augmente le cortisol matinal de 37-45%, dérègle la leptine/ghréline,
        et diminue la sensibilité à l'insuline de 30% en seulement 4 nuits de restriction.`,
      consequences: [
        'MÉTABOLIQUE: Résistance à l\'insuline accrue, stockage abdominal favorisé',
        'HORMONAL: Cortisol élevé, testostérone/progestérone diminuées, GH effondrée',
        'COGNITIF: Mémoire, concentration et prise de décision altérées',
        'RÉCUPÉRATION: Synthèse protéique musculaire réduite de 18-25%',
        'COMPORTEMENTAL: Envies de sucre +45%, snacking compulsif'
      ],
      sources: ['Andrew Huberman - Sleep Toolkit', 'Matthew Walker - Why We Sleep', 'Peter Attia - Sleep Optimization']
    });
  }

  // Stress
  if (scores.stress < 60) {
    const severity = scores.stress < 40 ? 'critique' : scores.stress < 50 ? 'modere' : 'leger';
    blocages.push({
      domain: 'Axe HPA (Stress)',
      severity,
      title: 'Dysrégulation de l\'axe hypothalamo-hypophyso-surrénalien',
      mechanism: `Ton niveau de stress chronique maintient ton axe HPA en état d'hyperactivation.
        Tes surrénales produisent du cortisol en excès, ce qui bloque la conversion T4→T3 (thyroïde),
        inhibe la production de testostérone/progestérone, et augmente la perméabilité intestinale.
        L'anxiété chronique consomme 20% de ton glucose sanguin via le cerveau en mode "survie".`,
      consequences: [
        'MÉTABOLIQUE: Catabolisme musculaire, stockage graisse viscérale',
        'HORMONAL: Cortisol chronique → DHEA épuisée, thyroïde ralentie',
        'DIGESTIF: Perméabilité intestinale (leaky gut), malabsorption',
        'NERVEUX: Burn-out du système nerveux sympathique',
        'INFLAMMATOIRE: CRP et cytokines pro-inflammatoires élevées'
      ],
      sources: ['Andrew Huberman - Stress Management', 'Robert Sapolsky - Why Zebras Don\'t Get Ulcers', 'Chris Kresser - Adrenal Health']
    });
  }

  // Énergie
  if (scores.energie < 60) {
    const severity = scores.energie < 40 ? 'critique' : scores.energie < 50 ? 'modere' : 'leger';
    const enviesSucre = responses['envies-sucre'];
    const thermogenese = responses['thermogenese'];

    let mechanism = `Tes patterns énergétiques révèlent un dysfonctionnement mitochondrial probable. `;

    if (enviesSucre === 'souvent') {
      mechanism += `Tes envies de sucre fréquentes indiquent une dépendance au glucose avec incapacité
        à utiliser les graisses comme carburant (inflexibilité métabolique). `;
    }
    if (thermogenese === 'toujours' || thermogenese === 'souvent') {
      mechanism += `Ta frilosité chronique suggère une thermogenèse réduite, potentiellement liée
        à une hypothyroïdie subclinique ou un métabolisme de base abaissé. `;
    }

    blocages.push({
      domain: 'Énergie / Mitochondries',
      severity,
      title: 'Dysfonction énergétique et inflexibilité métabolique',
      mechanism,
      consequences: [
        'MÉTABOLIQUE: Dépendance au glucose, incapacité à brûler les graisses',
        'THYROÏDIEN: T3 libre possiblement basse, métabolisme ralenti',
        'MITOCHONDRIAL: Production ATP inefficace, fatigue chronique',
        'GLYCÉMIQUE: Pics et crashs glycémiques, envies compulsives',
        'PERFORMANCE: Endurance limitée, récupération prolongée'
      ],
      sources: ['Peter Attia - Metabolic Health', 'Ben Bikman - Insulin Resistance', 'Rhonda Patrick - Mitochondrial Function']
    });
  }

  // Digestion
  if (scores.digestion < 60) {
    const severity = scores.digestion < 40 ? 'critique' : scores.digestion < 50 ? 'modere' : 'leger';
    const transit = responses['transit'];
    const ballonnements = responses['ballonnements'];

    let mechanism = `Ton système digestif montre des signes de dysbiose et/ou d'hypochlorhydrie. `;

    if (ballonnements === 'apres-repas' || ballonnements === 'souvent') {
      mechanism += `Les ballonnements fréquents suggèrent une fermentation excessive (SIBO possible),
        un manque d'enzymes digestives, ou une intolérance alimentaire non identifiée. `;
    }
    if (transit === 'constipe' || transit === 'variable') {
      mechanism += `Ton transit perturbé indique un déséquilibre de la motilité intestinale,
        souvent lié au stress (axe intestin-cerveau) ou à un manque de fibres/eau. `;
    }

    blocages.push({
      domain: 'Digestion / Microbiote',
      severity,
      title: 'Dysbiose intestinale et malabsorption',
      mechanism,
      consequences: [
        'ABSORPTION: Carences en vitamines B, fer, zinc, magnésium',
        'IMMUNITAIRE: 70% du système immunitaire dans l\'intestin compromis',
        'INFLAMMATOIRE: Perméabilité intestinale → inflammation systémique',
        'HORMONAL: Production de sérotonine (90% intestinale) altérée',
        'MÉTABOLIQUE: Extraction calorique perturbée, prise de poids ou maigreur'
      ],
      sources: ['Chris Kresser - Gut Health', 'Examine.com - Digestive Health', 'Justin Sonnenburg - The Good Gut']
    });
  }

  // Training
  if (scores.training < 60) {
    const severity = scores.training < 40 ? 'critique' : scores.training < 50 ? 'modere' : 'leger';
    const evolution = responses['performance-evolution'];
    const recuperation = responses['recuperation'];

    let mechanism = `Ton entraînement actuel ne produit pas les adaptations attendues. `;

    if (evolution === 'stagnation' || evolution === 'regression') {
      mechanism += `La stagnation ou régression indique soit un surentraînement (volume/intensité excessifs
        sans récupération), soit un sous-entraînement (stimulus insuffisant), soit un déficit nutritionnel. `;
    }
    if (recuperation === 'mauvaise') {
      mechanism += `Ta mauvaise récupération révèle un déséquilibre entre le stress d'entraînement
        et ta capacité à régénérer. Tes réserves de glycogène ne se reconstituent pas,
        ta synthèse protéique est compromise. `;
    }

    blocages.push({
      domain: 'Entraînement / Récupération',
      severity,
      title: 'Déséquilibre stress-récupération',
      mechanism,
      consequences: [
        'MUSCULAIRE: MPS (synthèse protéique) insuffisante, pas d\'hypertrophie',
        'NERVEUX: Système nerveux central fatigué, force réduite',
        'HORMONAL: Testostérone/cortisol ratio défavorable',
        'MÉTABOLIQUE: Adaptations aérobies/anaérobies bloquées',
        'BLESSURE: Risque accru de tendinopathies et blessures'
      ],
      sources: ['Andy Galpin - Training Science', 'Brad Schoenfeld - Hypertrophy', 'Mike Israetel - Recovery']
    });
  }

  // Nutrition
  if (scores.nutrition < 60) {
    const severity = scores.nutrition < 40 ? 'critique' : scores.nutrition < 50 ? 'modere' : 'leger';
    const proteines = responses['proteines-jour'];
    const eau = responses['eau-jour'];

    let mechanism = `Ton alimentation actuelle ne soutient pas tes objectifs. `;

    if (proteines === 'faible' || proteines === 'moyen') {
      mechanism += `Ton apport protéique insuffisant (<1.6g/kg) limite ta synthèse musculaire,
        ta satiété, et ta thermogenèse alimentaire (TEF réduit de 20-30%). `;
    }
    if (eau === 'moins-1L' || eau === '1-1.5L') {
      mechanism += `Ta déshydratation chronique réduit tes performances de 10-20%,
        ralentit ton métabolisme, et compromet toutes tes fonctions enzymatiques. `;
    }

    blocages.push({
      domain: 'Nutrition',
      severity,
      title: 'Déficits nutritionnels et déséquilibres alimentaires',
      mechanism,
      consequences: [
        'PROTÉIQUE: MPS limitée, faim constante, métabolisme ralenti',
        'HYDRATATION: Performance -15%, détox hépatique compromise',
        'MICRONUTRIMENTS: Carences en magnésium, zinc, vitamine D probables',
        'GLYCÉMIQUE: Pics d\'insuline, stockage favorisé',
        'ÉNERGÉTIQUE: Calories vides, densité nutritionnelle insuffisante'
      ],
      sources: ['Layne Norton - Nutrition Science', 'Examine.com - Protein', 'Peter Attia - Nutritional Framework']
    });
  }

  // Lifestyle
  if (scores.lifestyle < 60) {
    const severity = scores.lifestyle < 40 ? 'critique' : scores.lifestyle < 50 ? 'modere' : 'leger';
    const heuresAssis = responses['heures-assis'];
    const soleil = responses['exposition-soleil'];

    let mechanism = `Ton mode de vie moderne crée un environnement anti-physiologique. `;

    if (heuresAssis === '8h+' || heuresAssis === '6-8h') {
      mechanism += `La sédentarité prolongée (>6h assis) inactive ta NEAT (thermogenèse non-exercice),
        réduit ta sensibilité à l'insuline, et comprime tes disques vertébraux.
        Même l'exercice quotidien ne compense pas entièrement les heures assises. `;
    }
    if (soleil === 'rare') {
      mechanism += `Le manque d'exposition solaire matinale dérègle ton rythme circadien,
        maintient ta vitamine D sous-optimale, et prive ton corps du signal lumineux
        nécessaire à la régulation du cortisol et de la mélatonine. `;
    }

    blocages.push({
      domain: 'Lifestyle / Environnement',
      severity,
      title: 'Mode de vie désynchronisé et sédentaire',
      mechanism,
      consequences: [
        'CIRCADIEN: Rythmes hormonaux désynchronisés',
        'MÉTABOLIQUE: NEAT effondré, métabolisme ralenti',
        'POSTURAL: Compression discale, douleurs lombaires',
        'VITAMINE D: Immunité, os, humeur, hormones affectés',
        'CARDIOVASCULAIRE: Risque accru indépendant de l\'exercice'
      ],
      sources: ['Andrew Huberman - Light Exposure', 'Katy Bowman - Movement', 'Peter Attia - NEAT']
    });
  }

  return blocages;
}

// ============================================
// KNOWLEDGE BASE INTEGRATION
// ============================================

async function getKnowledgeContextForBlocages(blocages: BlockageAnalysis[]): Promise<string> {
  const keywords: string[] = [];

  for (const blocage of blocages) {
    // Extract keywords from each blocage
    if (blocage.domain.includes('Sommeil')) {
      keywords.push('sleep', 'circadian', 'melatonin', 'cortisol', 'growth hormone');
    }
    if (blocage.domain.includes('Stress') || blocage.domain.includes('HPA')) {
      keywords.push('stress', 'cortisol', 'adrenal', 'HPA axis', 'burnout');
    }
    if (blocage.domain.includes('Énergie') || blocage.domain.includes('Mitochondr')) {
      keywords.push('mitochondria', 'ATP', 'metabolism', 'thyroid', 'energy');
    }
    if (blocage.domain.includes('Digestion') || blocage.domain.includes('Microbiote')) {
      keywords.push('gut', 'microbiome', 'digestion', 'SIBO', 'leaky gut');
    }
    if (blocage.domain.includes('Training') || blocage.domain.includes('Récupération')) {
      keywords.push('recovery', 'overtraining', 'muscle protein synthesis', 'HRV');
    }
    if (blocage.domain.includes('Nutrition')) {
      keywords.push('protein', 'hydration', 'insulin', 'macros', 'micronutrients');
    }
    if (blocage.domain.includes('Lifestyle')) {
      keywords.push('circadian', 'vitamin D', 'sedentary', 'NEAT', 'light exposure');
    }
  }

  // Remove duplicates
  const uniqueKeywords = [...new Set(keywords)];

  try {
    // Search in knowledge base
    const articles = await searchArticles(uniqueKeywords.slice(0, 5), 5, [
      'huberman', 'peter_attia', 'examine', 'marek_health', 'chris_masterjohn', 'rp'
    ]);

    if (articles.length === 0) {
      return '';
    }

    // Build context from relevant articles
    const context = articles.map(a =>
      `[${a.source}] ${a.title}\nKey points: ${a.content.substring(0, 500)}...`
    ).join('\n\n---\n\n');

    return context;
  } catch (error) {
    console.error('[Discovery] Knowledge search error:', error);
    return '';
  }
}

// ============================================
// AI SYNTHESIS GENERATION
// ============================================

const DISCOVERY_SYSTEM_PROMPT = `Tu es un expert en physiologie, endocrinologie et performance humaine de niveau doctoral. Tu rediges des rapports medicaux detailles pour des clients qui veulent comprendre POURQUOI leur corps dysfonctionne.

MISSION: Rediger une analyse clinique TRES LONGUE et TRES DETAILLEE (minimum 800 mots) des dysfonctionnements detectes. EXPLIQUER les mecanismes, PAS donner de solutions.

REGLES ABSOLUES (VIOLATION = ECHEC):
1. JAMAIS de tiret long (—) ou tiret cadratin. Utilise : ou . a la place
2. JAMAIS de markdown (pas de ##, **, -, *, listes a puces)
3. JAMAIS d'emojis
4. JAMAIS de recommandations, solutions, ou conseils
5. MINIMUM 800 mots, idealement 1000-1200 mots
6. Chaque paragraphe doit faire au moins 150 mots
7. Prose fluide uniquement, paragraphes separes par lignes vides

CONTENU OBLIGATOIRE A COUVRIR:
- Mecanismes biochimiques precis (enzymes, hormones, recepteurs)
- Cascades physiologiques entre systemes
- Impact neurologique (neurotransmetteurs, HPA, systeme nerveux autonome)
- Impact metabolique (insuline, glycemie, mitochondries, oxidation des graisses)
- Impact hormonal (cortisol, testosterone, T3/T4, GH, leptine, ghreline)
- Impact digestif (microbiome, permeabilite intestinale, absorption)
- Impact sur le sommeil (cycles, melatonine, adenosine)
- Impact cardiovasculaire et inflammation (CRP, cytokines)
- Donnees chiffrees (pourcentages, durees, seuils)

SOURCES A INTEGRER NATURELLEMENT:
- Andrew Huberman (neurosciences, protocoles)
- Peter Attia (longevite, metabolisme)
- Matthew Walker (sommeil)
- Robert Sapolsky (stress, cortisol)
- Ben Bikman (insuline, metabolisme)
- Robert Lustig (sucre, metabolisme)
- Stronger by Science (entrainement)

STYLE:
- Medecin specialiste expliquant a un patient intelligent
- Chaque phrase apporte une donnee concrete et chiffree
- Tutoiement direct, sans condescendance
- Ton grave mais pas alarmiste
- References scientifiques integrees dans le texte`;

async function generateAISynthesis(
  responses: DiscoveryResponses,
  scores: DiscoveryAnalysisResult['scoresByDomain'],
  blocages: BlockageAnalysis[],
  knowledgeContext: string
): Promise<string> {
  const anthropic = new Anthropic();

  const blocagesSummary = blocages.map(b =>
    `[${b.severity.toUpperCase()}] ${b.domain}: ${b.title}\n${b.mechanism}`
  ).join('\n\n');

  const userPrompt = `PROFIL CLIENT:
Prenom: ${responses.prenom}
Sexe: ${responses.sexe}
Age: ${responses.age} ans
Objectif principal: ${responses.objectif}

SCORES DOMAINES (sur 100):
Sommeil: ${scores.sommeil}/100
Stress: ${scores.stress}/100
Energie: ${scores.energie}/100
Digestion: ${scores.digestion}/100
Training: ${scores.training}/100
Nutrition: ${scores.nutrition}/100
Lifestyle: ${scores.lifestyle}/100
Mindset: ${scores.mindset}/100

BLOCAGES DETECTES:
${blocagesSummary}

${knowledgeContext ? `DONNEES SCIENTIFIQUES PERTINENTES:\n${knowledgeContext}` : ''}

MISSION: Redige une analyse TRES LONGUE et TRES DETAILLEE en 4 paragraphes de prose fluide. MINIMUM 1000 mots au total.

STRUCTURE OBLIGATOIRE:

PARAGRAPHE 1 (minimum 250 mots): Le dysfonctionnement central. Explique le mecanisme biochimique precis du blocage principal. Cite les enzymes, recepteurs, hormones impliques. Donne des chiffres (pourcentages, durees, seuils). Explique la physiopathologie sans donner de solution.

PARAGRAPHE 2 (minimum 250 mots): La cascade systemique. Decris comment ce dysfonctionnement affecte les autres systemes de ${responses.prenom}. Explique les interactions sommeil/cortisol/insuline/testosterone. Cite les boucles de retroaction. Integre des donnees de Huberman, Attia, Walker.

PARAGRAPHE 3 (minimum 250 mots): L'impact metabolique complet. Detail les consequences sur le metabolisme energetique, la thyroide, les mitochondries, la sensibilite a l'insuline. Explique pourquoi la perte de gras est bloquee ou pourquoi la prise de muscle est compromise. Chiffres et mecanismes.

PARAGRAPHE 4 (minimum 250 mots): Pourquoi ${responses.prenom} stagne malgre ses efforts. Fais le lien direct avec son objectif "${responses.objectif}". Explique pourquoi les approches classiques ne fonctionnent pas dans son cas specifique. Conclus sur l'importance de comprendre ces mecanismes pour debloquer la situation.

RAPPELS CRITIQUES:
- JAMAIS de tiret long (—) ni de tiret cadratin
- Prose fluide uniquement, PAS de listes
- PAS de markdown (##, **, -, *)
- PAS d'emojis
- PAS de recommandations ni solutions
- MINIMUM 1000 mots au total`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: DISCOVERY_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const textContent = response.content.find(c => c.type === 'text');
    const rawText = textContent?.text || '';

    // Post-process: convert markdown to clean HTML and remove artifacts
    return cleanMarkdownToHTML(rawText);
  } catch (error) {
    console.error('[Discovery] AI synthesis error:', error);
    return `Analyse détectée: ${blocages.length} blocages identifiés affectant ton objectif "${responses.objectif}".`;
  }
}

// Convert markdown artifacts to clean HTML - CRITICAL: Remove all em dashes
function cleanMarkdownToHTML(text: string): string {
  return text
    // CRITICAL: Remove ALL em dashes (—) and en dashes (–) FIRST
    .replace(/—/g, ':')
    .replace(/–/g, '-')
    .replace(/\u2014/g, ':')  // Unicode em dash
    .replace(/\u2013/g, '-')  // Unicode en dash
    // Remove markdown headers (## Title -> Title)
    .replace(/^#{1,4}\s+(.+)$/gm, '$1')
    // Convert **bold** to <strong>
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Convert *italic* to <em>
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Remove bullet points at start of lines
    .replace(/^[-•]\s+/gm, '')
    // Remove numbered lists
    .replace(/^\d+\.\s+/gm, '')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove any remaining markdown artifacts
    .replace(/`([^`]+)`/g, '$1')
    // Final pass: remove any remaining em dashes that slipped through
    .replace(/—/g, ':')
    .replace(/–/g, '-')
    .trim();
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

export async function analyzeDiscoveryScan(responses: DiscoveryResponses): Promise<DiscoveryAnalysisResult> {
  console.log(`[Discovery] Analyzing scan for ${responses.prenom || 'Client'}...`);

  // Calculate scores for each domain
  const scoresByDomain = {
    sommeil: scoreSommeil(responses),
    stress: scoreStress(responses),
    energie: scoreEnergie(responses),
    digestion: scoreDigestion(responses),
    training: scoreTraining(responses),
    nutrition: scoreNutrition(responses),
    lifestyle: scoreLifestyle(responses),
    mindset: scoreMindset(responses)
  };

  // Calculate global score (weighted average)
  const weights = {
    sommeil: 0.15,
    stress: 0.15,
    energie: 0.15,
    digestion: 0.12,
    training: 0.12,
    nutrition: 0.12,
    lifestyle: 0.10,
    mindset: 0.09
  };

  const globalScore = Math.round(
    Object.entries(scoresByDomain).reduce((acc, [key, value]) => {
      return acc + value * (weights[key as keyof typeof weights] || 0.1);
    }, 0)
  );

  // Detect blocages
  const blocages = detectBlocages(responses, scoresByDomain);

  // Get knowledge context
  const knowledgeContext = await getKnowledgeContextForBlocages(blocages);

  // Generate AI synthesis
  const synthese = await generateAISynthesis(responses, scoresByDomain, blocages, knowledgeContext);

  // Generate CTA message based on blocages
  let ctaMessage: string;
  const criticalCount = blocages.filter(b => b.severity === 'critique').length;
  const objectif = responses.objectif || 'tes objectifs';

  if (criticalCount >= 2) {
    ctaMessage = `${criticalCount} blocages critiques identifiés. Ces dysfonctionnements sabotent directement ton objectif de ${objectif}.

Sans intervention ciblée sur ces mécanismes, la stagnation va se prolonger. L'Anabolic Bioscan (59€) fournit les protocoles correctifs pour chaque système défaillant. L'Ultimate Scan (79€) ajoute l'analyse posturale et biomécanique.`;
  } else if (blocages.length >= 3) {
    ctaMessage = `${blocages.length} déséquilibres physiologiques détectés.

Tu as maintenant la cartographie précise de ce qui bloque ta progression. L'étape suivante : les protocoles adaptés à ton profil. L'Anabolic Bioscan (59€) inclut 16 analyses approfondies, protocoles matin/soir, et stack suppléments personnalisé.`;
  } else {
    ctaMessage = `Ton profil révèle des axes d'optimisation.

Pour maximiser tes résultats sur ${objectif}, l'Anabolic Bioscan (59€) te donne les protocoles exacts : timing, dosages, séquençage. Chaque recommandation est calibrée sur tes données.`;
  }

  console.log(`[Discovery] Analysis complete. Score: ${globalScore}/100, Blocages: ${blocages.length}`);

  return {
    globalScore,
    scoresByDomain,
    blocages,
    synthese,
    ctaMessage
  };
}

// ============================================
// ULTRAHUMAN-STYLE REPORT FORMAT (for dashboard)
// ============================================

interface Metric {
  label: string;
  value: number;
  max: number;
  description: string;
  key: string;
}

interface SectionContent {
  id: string;
  title: string;
  subtitle?: string;
  content: string; // HTML string
  chips?: string[];
}

interface ReportData {
  globalScore: number;
  metrics: Metric[];
  sections: SectionContent[];
  clientName: string;
  generatedAt: string;
  auditType: string;
}

const DOMAIN_CONFIG: Record<string, { label: string; description: string }> = {
  sommeil: { label: "Sommeil", description: "Récupération" },
  stress: { label: "Stress", description: "Système Nerveux" },
  energie: { label: "Énergie", description: "Vitalité" },
  digestion: { label: "Digestion", description: "Absorption" },
  training: { label: "Training", description: "Performance" },
  nutrition: { label: "Nutrition", description: "Métabolisme" },
  lifestyle: { label: "Lifestyle", description: "Habitudes" },
  mindset: { label: "Mindset", description: "Mental" }
};

export function convertToNarrativeReport(
  result: DiscoveryAnalysisResult,
  responses: DiscoveryResponses
): ReportData {
  const prenom = responses.prenom || 'Client';
  const objectif = responses.objectif || 'tes objectifs';

  // Convert scores to metrics (scale 0-10)
  const metrics: Metric[] = Object.entries(result.scoresByDomain).map(([key, value]) => ({
    label: DOMAIN_CONFIG[key]?.label || key,
    value: Math.round(value / 10 * 10) / 10, // Convert 0-100 to 0-10 with 1 decimal
    max: 10,
    description: DOMAIN_CONFIG[key]?.description || '',
    key
  }));

  // Generate sections with HTML content
  const sections: SectionContent[] = [];

  // Section 1: Message d'ouverture
  sections.push({
    id: "intro",
    title: "Message d'ouverture",
    subtitle: "Discovery Scan",
    content: `<p>${prenom}, ton dossier est ouvert. Voici une analyse sans filtre de ce qui bloque réellement ta progression vers "${objectif}".</p>
<p>Ce rapport decortique chaque systeme de ton corps : sommeil, stress, energie, digestion, entrainement, nutrition, lifestyle, mindset. Et surtout comment ils s'influencent mutuellement.</p>
<p>Ton score global de <strong>${result.globalScore}/100</strong> cache une réalité plus nuancée. ${result.blocages.length} blocages identifiés qui expliquent pourquoi tes efforts ne paient pas comme ils le devraient.</p>`,
    chips: ["Analyse Complète", `${result.blocages.length} Blocages`]
  });

  // Section 2: Lecture globale (synthèse IA)
  sections.push({
    id: "global",
    title: "Lecture globale",
    subtitle: "Le Diagnostic",
    content: result.synthese.split('\n\n').map(p => `<p>${p}</p>`).join('\n'),
    chips: result.blocages.slice(0, 3).map(b => b.title.split(' ').slice(0, 2).join(' '))
  });

  // Sections par domaine avec blocages
  Object.entries(result.scoresByDomain)
    .sort((a, b) => a[1] - b[1]) // Worst first
    .forEach(([domain, score]) => {
      const config = DOMAIN_CONFIG[domain];
      const domainBlocages = result.blocages.filter(b =>
        b.domain.toLowerCase().includes(domain) ||
        domain.includes(b.domain.toLowerCase().split(' ')[0])
      );

      let content = '';
      let chips: string[] = [];

      if (domainBlocages.length > 0) {
        // Domain with blocages - detailed analysis
        domainBlocages.forEach(b => {
          content += `<p><strong>${b.title}</strong> <span style="color: ${b.severity === 'critique' ? '#ef4444' : b.severity === 'modere' ? '#FCDD00' : '#60a5fa'};">[${b.severity.toUpperCase()}]</span></p>`;
          content += `<p>${b.mechanism}</p>`;
          content += `<p><strong>Conséquences sur ton corps :</strong></p>`;
          content += `<ul class="list-disc pl-5 space-y-1 text-[var(--color-text-muted)]">`;
          b.consequences.forEach(c => {
            content += `<li>${c}</li>`;
          });
          content += `</ul>`;
          content += `<p class="text-sm italic text-[var(--color-text-muted)] mt-4">Sources: ${b.sources.join(' | ')}</p>`;
          chips = b.consequences.slice(0, 3).map(c => c.split(':')[0]);
        });

        // Add personalized context
        content += generateDomainHTML(domain, score, responses);
      } else if (score < 70) {
        // Sub-optimal without major blocage
        content = `<p>Score: <strong>${score}/100</strong></p>`;
        content += `<p>Ce domaine présente des axes d'amélioration sans blocage critique identifié. Les réponses au questionnaire indiquent des habitudes qui peuvent être optimisées.</p>`;
        content += generateDomainHTML(domain, score, responses);
        chips = ["À Optimiser"];
      } else {
        // Good score
        content = `<p>Score: <strong>${score}/100</strong></p>`;
        content += `<p>Ce domaine est bien maîtrisé. Tes habitudes actuelles sont alignées avec tes objectifs. C'est une fondation solide pour ta transformation.</p>`;
        chips = ["Point Fort"];
      }

      sections.push({
        id: domain,
        title: config?.label || domain,
        subtitle: config?.description || '',
        content,
        chips
      });
    });

  // Section CTA 1: Scans with coaching deduction table
  sections.push({
    id: "scans",
    title: "Approfondir l'analyse",
    subtitle: "ApexLabs Scans",
    content: `<p>${result.ctaMessage.replace(/\n/g, '</p><p>')}</p>

<div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
  <div class="p-6 rounded-xl" style="background: #1a1a1a; border: 2px solid #FCDD00;">
    <div class="text-xs uppercase tracking-widest mb-2" style="color: #FCDD00;">Recommande</div>
    <h4 class="text-xl font-bold mb-2" style="color: #fff;">Anabolic Bioscan</h4>
    <div class="text-3xl font-bold mb-4" style="color: #FCDD00;">59<span class="text-lg">€</span></div>
    <ul class="space-y-2 text-sm mb-6" style="color: #a1a1aa;">
      <li>✓ 15 analyses approfondies</li>
      <li>✓ Analyse photos (posture, composition)</li>
      <li>✓ Protocole nutrition detaille</li>
      <li>✓ Stack supplements personnalise</li>
      <li>✓ Feuille de route 90 jours</li>
    </ul>
    <a href="/offers/anabolic-bioscan" class="block w-full py-3 rounded-lg text-center font-bold transition-all hover:opacity-90" style="background: #FCDD00; color: #000;">
      Choisir Anabolic Bioscan
    </a>
  </div>

  <div class="p-6 rounded-xl" style="background: #1a1a1a; border: 1px solid #333;">
    <div class="text-xs uppercase tracking-widest mb-2" style="color: #a1a1aa;">Complet</div>
    <h4 class="text-xl font-bold mb-2" style="color: #fff;">Ultimate Scan</h4>
    <div class="text-3xl font-bold mb-4" style="color: #fff;">79<span class="text-lg">€</span></div>
    <ul class="space-y-2 text-sm mb-6" style="color: #a1a1aa;">
      <li>✓ Tout l'Anabolic Bioscan inclus</li>
      <li>✓ Sync wearables (Oura, Whoop, Garmin)</li>
      <li>✓ Analyse HRV avancee</li>
      <li>✓ Questions blessures & douleurs</li>
      <li>✓ Protocole rehabilitation</li>
    </ul>
    <a href="/offers/ultimate-scan" class="block w-full py-3 rounded-lg text-center font-bold transition-all hover:bg-white/10" style="border: 1px solid #FCDD00; color: #FCDD00;">
      Choisir Ultimate Scan
    </a>
  </div>
</div>

<div class="mt-8 p-4 rounded-lg" style="background: rgba(252, 221, 0, 0.1); border: 1px solid rgba(252, 221, 0, 0.3);">
  <p class="text-sm font-medium" style="color: #FCDD00;">Deduit de ton coaching</p>
  <p class="text-xs mt-1" style="color: #a1a1aa;">Si tu passes en coaching apres ton scan, le montant est deduit de ta formule.</p>
  <table class="w-full mt-3 text-xs">
    <thead>
      <tr style="color: #a1a1aa;">
        <th class="text-left py-1">Formule</th>
        <th class="text-center py-1">4 sem.</th>
        <th class="text-center py-1">8 sem.</th>
        <th class="text-center py-1">12 sem.</th>
      </tr>
    </thead>
    <tbody style="color: #fff;">
      <tr>
        <td class="py-1">Essential</td>
        <td class="text-center"><span style="color:#666;">249€</span> → <span style="color:#FCDD00;">190€</span></td>
        <td class="text-center"><span style="color:#666;">399€</span> → <span style="color:#FCDD00;">340€</span></td>
        <td class="text-center"><span style="color:#666;">549€</span> → <span style="color:#FCDD00;">490€</span></td>
      </tr>
      <tr>
        <td class="py-1">Elite</td>
        <td class="text-center"><span style="color:#666;">399€</span> → <span style="color:#FCDD00;">340€</span></td>
        <td class="text-center"><span style="color:#666;">649€</span> → <span style="color:#FCDD00;">590€</span></td>
        <td class="text-center"><span style="color:#666;">899€</span> → <span style="color:#FCDD00;">840€</span></td>
      </tr>
      <tr>
        <td class="py-1">Private Lab</td>
        <td class="text-center"><span style="color:#666;">499€</span> → <span style="color:#FCDD00;">420€</span></td>
        <td class="text-center"><span style="color:#666;">799€</span> → <span style="color:#FCDD00;">720€</span></td>
        <td class="text-center"><span style="color:#666;">1199€</span> → <span style="color:#FCDD00;">1120€</span></td>
      </tr>
    </tbody>
  </table>
</div>`,
    chips: ["Protocoles", "Stack Supplements", "Plan 90 Jours"]
  });

  // Section CTA 2: Direct coaching with -20%
  sections.push({
    id: "coaching",
    title: "Passer directement au coaching",
    subtitle: "Sans scan supplementaire",
    content: `<p>Tu n'as pas envie ou besoin de faire un autre scan ? Je te propose une alternative directe.</p>

<p>Avec ton Discovery Scan tu as deja une vue d'ensemble de tes blocages. Si tu veux passer a l'action maintenant, je t'offre <strong style="color: #FCDD00;">-20% sur le coaching Achzod</strong> avec le code que tu recevras apres avoir laisse ton avis.</p>

<div class="mt-8 p-6 rounded-xl" style="background: #1a1a1a; border: 1px solid #333;">
  <h4 class="text-lg font-bold mb-4" style="color: #fff;">Coaching Achzod - Formules</h4>

  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr style="color: #a1a1aa;">
          <th class="text-left py-2 pr-4">Formule</th>
          <th class="text-center py-2 px-2">4 semaines</th>
          <th class="text-center py-2 px-2">8 semaines</th>
          <th class="text-center py-2 px-2">12 semaines</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-top: 1px solid #333;">
          <td class="py-3 pr-4">
            <div class="font-medium" style="color: #fff;">Essential</div>
            <div class="text-xs" style="color: #666;">Fondations</div>
          </td>
          <td class="text-center py-3 px-2">
            <div class="line-through text-xs" style="color: #666;">249€</div>
            <div class="font-bold" style="color: #FCDD00;">199€</div>
          </td>
          <td class="text-center py-3 px-2">
            <div class="line-through text-xs" style="color: #666;">399€</div>
            <div class="font-bold" style="color: #FCDD00;">319€</div>
          </td>
          <td class="text-center py-3 px-2">
            <div class="line-through text-xs" style="color: #666;">549€</div>
            <div class="font-bold" style="color: #FCDD00;">439€</div>
          </td>
        </tr>
        <tr style="border-top: 1px solid #333;">
          <td class="py-3 pr-4">
            <div class="font-medium" style="color: #fff;">Elite</div>
            <div class="text-xs" style="color: #666;">Performance</div>
          </td>
          <td class="text-center py-3 px-2">
            <div class="line-through text-xs" style="color: #666;">399€</div>
            <div class="font-bold" style="color: #FCDD00;">319€</div>
          </td>
          <td class="text-center py-3 px-2">
            <div class="line-through text-xs" style="color: #666;">649€</div>
            <div class="font-bold" style="color: #FCDD00;">519€</div>
          </td>
          <td class="text-center py-3 px-2">
            <div class="line-through text-xs" style="color: #666;">899€</div>
            <div class="font-bold" style="color: #FCDD00;">719€</div>
          </td>
        </tr>
        <tr style="border-top: 1px solid #333;">
          <td class="py-3 pr-4">
            <div class="font-medium" style="color: #fff;">Private Lab</div>
            <div class="text-xs" style="color: #666;">VIP</div>
          </td>
          <td class="text-center py-3 px-2">
            <div class="line-through text-xs" style="color: #666;">499€</div>
            <div class="font-bold" style="color: #FCDD00;">399€</div>
          </td>
          <td class="text-center py-3 px-2">
            <div class="line-through text-xs" style="color: #666;">799€</div>
            <div class="font-bold" style="color: #FCDD00;">639€</div>
          </td>
          <td class="text-center py-3 px-2">
            <div class="line-through text-xs" style="color: #666;">1199€</div>
            <div class="font-bold" style="color: #FCDD00;">959€</div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="mt-6 p-4 rounded-lg" style="background: rgba(252, 221, 0, 0.1); border: 1px solid rgba(252, 221, 0, 0.2);">
    <p class="text-sm" style="color: #fff;"><strong style="color: #FCDD00;">Comment obtenir le code -20% ?</strong></p>
    <p class="text-xs mt-1" style="color: #a1a1aa;">Laisse un avis sur ton Discovery Scan ci-dessous. Apres validation, tu recevras ton code promo <code class="px-1 py-0.5 rounded" style="background: #333; color: #FCDD00;">DISCOVERY20</code> par email.</p>
  </div>

  <a href="https://achzodcoaching.com" target="_blank" class="mt-4 block w-full py-3 rounded-lg text-center font-bold transition-all hover:opacity-90" style="background: #FCDD00; color: #000;">
    Voir les formules sur achzodcoaching.com
  </a>
</div>`,
    chips: ["-20% Coaching", "Code Promo", "Avis"]
  });

  return {
    globalScore: Math.round(result.globalScore / 10 * 10) / 10, // Convert to 0-10 scale
    metrics,
    sections,
    clientName: prenom,
    generatedAt: new Date().toISOString(),
    auditType: "DISCOVERY_SCAN"
  };
}

// Generate domain-specific HTML based on responses
function generateDomainHTML(domain: string, score: number, responses: DiscoveryResponses): string {
  const prenom = responses.prenom || 'Tu';

  switch (domain) {
    case 'sommeil':
      const heures = responses['heures-sommeil'];
      const qualite = responses['qualite-sommeil'];
      const reveilFatigue = responses['reveil-fatigue'];
      return `<p class="mt-4"><strong>Ton profil :</strong> ${prenom}, avec ${heures === '6-7' ? '6-7h' : heures === '5-6' ? '5-6h' : 'moins de 5h'} de sommeil et une qualité ${qualite}, ton corps ne récupère pas correctement. ${reveilFatigue === 'souvent' || reveilFatigue === 'toujours' ? 'Le fait que tu te réveilles fatigué confirme que tes cycles de sommeil profond sont insuffisants.' : ''} Cela impacte directement ta production d'hormones anaboliques et ta capacité à perdre du gras.</p>`;

    case 'stress':
      const niveauStress = responses['niveau-stress'];
      const gestionStress = responses['gestion-stress'];
      const hasNoStressManagement = Array.isArray(gestionStress) && (gestionStress.includes('rien') || gestionStress.length === 0);
      return `<p class="mt-4"><strong>Ton profil :</strong> ${prenom}, ton niveau de stress ${niveauStress} combiné à ${hasNoStressManagement ? 'l\'absence de techniques de gestion' : 'tes méthodes actuelles'} maintient ton corps en mode survie. Ton cortisol chroniquement élevé bloque la lipolyse et favorise le stockage abdominal.</p>`;

    case 'energie':
      const energieMatin = responses['energie-matin'];
      const coupFatigue = responses['coup-fatigue'];
      const enviesSucre = responses['envies-sucre'];
      return `<p class="mt-4"><strong>Ton profil :</strong> ${prenom}, ton énergie ${energieMatin} le matin et tes coups de fatigue ${coupFatigue === 'souvent' ? 'fréquents' : 'occasionnels'} révèlent un dysfonctionnement mitochondrial. ${enviesSucre === 'souvent' ? 'Tes envies de sucre fréquentes confirment que ton métabolisme est bloqué sur le glucose.' : ''}</p>`;

    case 'digestion':
      const digestQualite = responses['digestion-qualite'];
      const ballonnements = responses['ballonnements'];
      const transit = responses['transit'];
      return `<p class="mt-4"><strong>Ton profil :</strong> ${prenom}, ta digestion ${digestQualite} avec ${ballonnements === 'souvent' ? 'des ballonnements fréquents' : ballonnements === 'parfois' ? 'des ballonnements occasionnels' : 'peu de ballonnements'} et un transit ${transit} impacte ton absorption des nutriments.</p>`;

    case 'training':
      const frequence = responses['sport-frequence'];
      const recuperation = responses['recuperation'];
      const evolution = responses['performance-evolution'];
      return `<p class="mt-4"><strong>Ton profil :</strong> ${prenom}, tu t'entraînes ${frequence} fois par semaine mais ta récupération est ${recuperation}. ${evolution === 'stagnation' ? 'Ta stagnation n\'est pas due à un manque d\'effort mais à un environnement hormonal défavorable.' : ''}</p>`;

    case 'nutrition':
      const proteines = responses['proteines-jour'];
      const transformes = responses['aliments-transformes'];
      const sucres = responses['sucres-ajoutes'];
      return `<p class="mt-4"><strong>Ton profil :</strong> ${prenom}, ton apport en protéines ${proteines === 'insuffisant' ? 'insuffisant' : proteines} combiné à une consommation ${transformes === 'souvent' ? 'élevée' : 'modérée'} d'aliments transformés crée un environnement inflammatoire.</p>`;

    case 'lifestyle':
      const ecrans = responses['temps-ecran'];
      const soleil = responses['exposition-soleil'];
      const assis = responses['heures-assis'];
      return `<p class="mt-4"><strong>Ton profil :</strong> ${prenom}, ${assis === '8h-plus' ? 'tes 8h+ assis par jour' : 'ta sédentarité'} combinées à ${ecrans === 'plus-6h' ? '+6h d\'écrans' : 'ton temps d\'écran'} et ${soleil === 'rarement' ? 'un manque d\'exposition solaire' : 'une exposition solaire limitée'} perturbent tes rythmes circadiens.</p>`;

    case 'mindset':
      const engagement = responses['engagement-niveau'];
      return `<p class="mt-4"><strong>Ton profil :</strong> ${prenom}, ton niveau d'engagement "${engagement}" est un atout. Le problème n'est pas ton mindset mais tes systèmes physiologiques.</p>`;

    default:
      return '';
  }
}

// ============================================
// LEGACY: EXPORT HTML REPORT (kept for standalone export)
// ============================================

export function generateDiscoveryHTML(result: DiscoveryAnalysisResult, responses: DiscoveryResponses): string {
  const prenom = responses.prenom || 'Client';
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const scoreColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const severityBadge = (severity: string) => {
    const colors = {
      critique: 'bg-red-500/20 text-red-400 border-red-500/30',
      modere: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      leger: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    return colors[severity as keyof typeof colors] || colors.leger;
  };

  const blocagesHTML = result.blocages.map(blocage => `
    <div class="blocage-card">
      <div class="blocage-header">
        <span class="severity-badge ${severityBadge(blocage.severity)}">${blocage.severity.toUpperCase()}</span>
        <h3>${blocage.domain}</h3>
      </div>
      <h4>${blocage.title}</h4>
      <div class="mechanism">
        <strong>Mécanisme:</strong>
        <p>${blocage.mechanism}</p>
      </div>
      <div class="consequences">
        <strong>Conséquences:</strong>
        <ul>
          ${blocage.consequences.map(c => `<li>${c}</li>`).join('')}
        </ul>
      </div>
      <div class="sources">
        Sources: ${blocage.sources.join(' | ')}
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discovery Scan - ${prenom} | NEUROCORE 360</title>
  <style>
    :root {
      --bg: #0A0A0A;
      --surface: #121212;
      --surface-2: #1A1A1A;
      --text: #ffffff;
      --text-muted: #9ca3af;
      --primary: #22c55e;
      --primary-glow: rgba(34, 197, 94, 0.2);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
    }

    .container { max-width: 900px; margin: 0 auto; padding: 40px 20px; }

    .header {
      text-align: center;
      margin-bottom: 60px;
    }

    .header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .header .subtitle {
      color: var(--text-muted);
      font-size: 1.1rem;
    }

    .global-score {
      background: var(--surface);
      border-radius: 24px;
      padding: 40px;
      text-align: center;
      margin-bottom: 40px;
      border: 1px solid rgba(255,255,255,0.06);
    }

    .score-ring {
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: conic-gradient(${scoreColor(result.globalScore)} ${result.globalScore}%, var(--surface-2) 0);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      position: relative;
    }

    .score-ring::before {
      content: '';
      width: 150px;
      height: 150px;
      background: var(--surface);
      border-radius: 50%;
      position: absolute;
    }

    .score-value {
      position: relative;
      font-size: 3rem;
      font-weight: 700;
      color: ${scoreColor(result.globalScore)};
    }

    .scores-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 40px;
    }

    .score-card {
      background: var(--surface);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.06);
    }

    .score-card h4 {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .score-card .value {
      font-size: 1.8rem;
      font-weight: 700;
    }

    .blocages-section h2 {
      font-size: 1.5rem;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .blocage-card {
      background: var(--surface);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
      border: 1px solid rgba(255,255,255,0.06);
    }

    .blocage-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .severity-badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid;
    }

    .bg-red-500\\/20 { background: rgba(239, 68, 68, 0.2); }
    .text-red-400 { color: #f87171; }
    .border-red-500\\/30 { border-color: rgba(239, 68, 68, 0.3); }

    .bg-amber-500\\/20 { background: rgba(245, 158, 11, 0.2); }
    .text-amber-400 { color: #fbbf24; }
    .border-amber-500\\/30 { border-color: rgba(245, 158, 11, 0.3); }

    .bg-blue-500\\/20 { background: rgba(59, 130, 246, 0.2); }
    .text-blue-400 { color: #60a5fa; }
    .border-blue-500\\/30 { border-color: rgba(59, 130, 246, 0.3); }

    .blocage-card h3 {
      font-size: 1.1rem;
      color: var(--text-muted);
    }

    .blocage-card h4 {
      font-size: 1.25rem;
      margin-bottom: 16px;
      color: var(--text);
    }

    .mechanism, .consequences {
      margin-bottom: 16px;
    }

    .mechanism p, .consequences li {
      color: var(--text-muted);
      font-size: 0.95rem;
    }

    .consequences ul {
      list-style: none;
      padding-left: 0;
    }

    .consequences li {
      padding: 4px 0;
      padding-left: 20px;
      position: relative;
    }

    .consequences li::before {
      content: '→';
      position: absolute;
      left: 0;
      color: var(--primary);
    }

    .sources {
      font-size: 0.8rem;
      color: var(--text-muted);
      opacity: 0.7;
      font-style: italic;
    }

    .synthese {
      background: var(--surface);
      border-radius: 16px;
      padding: 32px;
      margin: 40px 0;
      border: 1px solid rgba(255,255,255,0.06);
    }

    .synthese h2 {
      margin-bottom: 20px;
    }

    .synthese p {
      color: var(--text-muted);
      margin-bottom: 16px;
    }

    .cta-section {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05));
      border: 1px solid rgba(34, 197, 94, 0.3);
      border-radius: 20px;
      padding: 40px;
      text-align: center;
      margin-top: 40px;
    }

    .cta-section h2 {
      font-size: 1.5rem;
      margin-bottom: 20px;
      color: var(--primary);
    }

    .cta-section p {
      color: var(--text-muted);
      margin-bottom: 24px;
      white-space: pre-line;
    }

    .cta-buttons {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .cta-btn {
      display: inline-block;
      padding: 16px 32px;
      border-radius: 12px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.3s;
    }

    .cta-btn.primary {
      background: var(--primary);
      color: black;
    }

    .cta-btn.secondary {
      background: var(--surface);
      color: var(--text);
      border: 1px solid rgba(255,255,255,0.1);
    }

    .cta-btn:hover {
      transform: translateY(-2px);
    }

    @media (max-width: 768px) {
      .scores-grid { grid-template-columns: repeat(2, 1fr); }
      .header h1 { font-size: 1.8rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Discovery Scan</h1>
      <p class="subtitle">${prenom} • ${date}</p>
    </div>

    <div class="global-score">
      <div class="score-ring">
        <span class="score-value">${result.globalScore}</span>
      </div>
      <h2>Score Global</h2>
      <p style="color: var(--text-muted)">Basé sur l'analyse de 8 domaines clés</p>
    </div>

    <div class="scores-grid">
      ${Object.entries(result.scoresByDomain).map(([key, value]) => `
        <div class="score-card">
          <h4>${key}</h4>
          <div class="value" style="color: ${scoreColor(value)}">${value}</div>
        </div>
      `).join('')}
    </div>

    <div class="blocages-section">
      <h2>Blocages Identifiés (${result.blocages.length})</h2>
      ${blocagesHTML}
    </div>

    <div class="synthese">
      <h2>Synthèse</h2>
      ${result.synthese.split('\n\n').map(p => `<p>${p}</p>`).join('')}
    </div>

    <div class="cta-section">
      <h2>Prochaine Étape</h2>
      <p>${result.ctaMessage}</p>
      <div class="cta-buttons">
        <a href="/offers/anabolic-bioscan" class="cta-btn primary">Anabolic Bioscan - 59€</a>
        <a href="/offers/ultimate-scan" class="cta-btn secondary">Ultimate Scan - 79€</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}
