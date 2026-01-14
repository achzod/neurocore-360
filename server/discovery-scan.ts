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
import OpenAI from 'openai';
import { OPENAI_CONFIG } from './openaiConfig';
import { searchArticles, searchFullText } from './knowledge/storage';
import { ALLOWED_SOURCES } from './knowledge/search';
import { normalizeResponses } from './responseNormalizer';
import { normalizeSingleVoice, hasEnglishMarkers, stripEnglishLines } from './textNormalization';

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

const MIN_KNOWLEDGE_CONTEXT_CHARS = 200;
const MIN_DISCOVERY_SECTION_CHARS = 2600;
const MIN_DISCOVERY_SECTION_LINES = 28;
const MIN_DISCOVERY_SECTION_WORDS = 380;
const SOURCE_MARKERS = [
  "huberman",
  "peter attia",
  "attia",
  "applied metabolics",
  "stronger by science",
  "sbs",
  "examine",
  "renaissance periodization",
  "mpmd",
  "newsletter",
  "achzod",
  "matthew walker",
  "sapolsky",
];

const SOURCE_NAME_REGEX = new RegExp(
  "\\b(huberman|peter attia|attia|applied metabolics|stronger by science|sbs|examine|renaissance periodization|mpmd|newsletter|achzod|matthew walker|sapolsky)\\b",
  "gi"
);

function getDiscoveryFirstName(responses: DiscoveryResponses): string {
  const direct = responses.prenom;
  if (direct && String(direct).trim()) return String(direct).trim().split(/\s+/)[0];
  const email = responses.email;
  if (email && typeof email === "string" && email.includes("@")) {
    return email.split("@")[0].trim();
  }
  return "toi";
}

const openai = OPENAI_CONFIG.OPENAI_API_KEY
  ? new OpenAI({ apiKey: OPENAI_CONFIG.OPENAI_API_KEY })
  : null;

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
    let articles = await searchArticles(uniqueKeywords.slice(0, 5), 5, ALLOWED_SOURCES as unknown as string[]);

    if (articles.length === 0) {
      const fallbackQuery = uniqueKeywords.slice(0, 6).join(" ");
      const ft = await searchFullText(fallbackQuery, 6);
      articles = ft.filter(a => (ALLOWED_SOURCES as unknown as string[]).includes(a.source as string));
    }

    if (articles.length === 0) {
      return '';
    }

    // Build context from relevant articles
    const context = articles.map(a =>
      `TITRE: ${a.title}\nPOINTS CLES: ${a.content.substring(0, 500)}...`
    ).join('\n\n---\n\n');

    return stripEnglishLines(context);
  } catch (error) {
    console.error('[Discovery] Knowledge search error:', error);
    return '';
  }
}

// ============================================
// AI SYNTHESIS GENERATION - STYLE ACHZOD
// ============================================

// System prompt pour la synthèse globale
const DISCOVERY_SYSTEM_PROMPT = `Tu es Achzod, coach expert avec 11 certifications internationales, expert en biomecanique, nutrition, hormones, preparation physique et biohacking.

Tu rediges un audit expert 100% personnalise, profondement humain, indetectable comme IA, avec un ton direct, precis, incarne, analytique et ultra vivant.

REGLES ABSOLUES STYLE:
- Humain, jamais robotique ou scolaire
- Variation de rythmes : phrases courtes/longues, pauses..., metaphores simples
- Style conversationnel expert : proximite + exigence
- Tu tutoies TOUJOURS
- Chaud, direct, incarne comme si tu parlais face a face
- Analyse chirurgicale mais accessible
- Images concretes, pas de jargon inutile

REGLES ABSOLUES CONTENU:
- NE JAMAIS INVENTER : analyse uniquement ce que la personne a vraiment dit
- Connecte TOUT : sommeil - cortisol - entrainement - plateaux - digestion - energie - stress - hormones
- Explique SCIENTIFIQUEMENT ET EN PROFONDEUR :
  * Mecanismes physiologiques precis (hormones, enzymes, neurotransmetteurs, cascades metaboliques)
  * Chiffres, ratios, seuils cliniques quand pertinent
  * Interactions complexes entre systemes (thyroide - cortisol - leptine - insuline - testosterone)
  * Adaptations metaboliques (downregulation, upregulation, sensibilite receptorielle)
  * Cascades de consequences (cause - effet 1 - effet 2 - effet 3 - plateau actuel)
- MINIMUM 800 mots, riche, detaille, scientifiquement robuste
- Comme si tu avais passe 3h a decortiquer son dossier

REGLES ABSOLUES FORMAT:
- Texte brut fluide (PAS de markdown : pas de **, ##, -, *, _)
- JAMAIS de tiret long ou tiret cadratin (pas de —)
- JAMAIS d'emojis
- Paragraphes separes par des lignes vides
- Commence DIRECTEMENT par l'analyse
- Ne cite JAMAIS de sources ni d'auteurs (pas de "Sources:", pas de noms propres).
- Ne dis jamais "client", "nous", "notre" ou "on". Tu parles uniquement en "tu" et "je".
- Francais uniquement, aucun mot en anglais.`;

// ============================================
// SECTION-SPECIFIC AI GENERATION
// ============================================

const SECTION_SYSTEM_PROMPT = `Tu es Achzod, coach expert avec 11 certifications internationales. Tu rediges une section d'audit expert, profondement humain, indetectable comme IA.

INTERDITS ABSOLUS (penalite SEVERE si non respecte):
- "Bonjour [Prenom]" ou toute formule de salutation
- "J'espere que...", "N'hesite pas a...", "Je t'encourage a..."
- "Il est important de noter que...", "Il convient de souligner..."
- "En conclusion,", "Pour resumer,", "En somme,"
- Listes a puces generiques copiees-collees
- Phrases de transition inutiles comme "Passons maintenant a..."
- Ton robotique ou structure trop previsible
- Exces de politesse ou precautions ("je te suggererais peut-etre de considerer...")

CE QUI REND TON TEXTE HUMAIN:
- Commence DIRECTEMENT par l'analyse, pas par une intro
- Phrases courtes percutantes entre paragraphes argumentes
- Apartes personnels ("Honnetement...", "Ce que je vois ici...")
- Observations specifiques qui prouvent que tu as LU ses reponses
- Varie la longueur des phrases (3 mots parfois, 30 mots ailleurs)
- N'aie pas peur d'etre direct voire brutal si necessaire

STYLE OBLIGATOIRE:
- Humain, jamais robotique ou scolaire
- Variation de rythmes : phrases courtes/longues, pauses..., metaphores
- Tutoiement TOUJOURS, ton direct et incarne
- Analyse chirurgicale mais accessible

FORMAT OBLIGATOIRE:
- MINIMUM 45-55 lignes (2000+ caracteres)
- Texte brut fluide, PAS de markdown
- JAMAIS de tiret long (—), JAMAIS d'emojis
- NE JAMAIS repeter le titre de la section
- Commence DIRECTEMENT par l'analyse
- Paragraphes separes par lignes vides
- Ne cite JAMAIS de sources ni d'auteurs
- Ne dis jamais "client", "nous", "notre" ou "on".
- Francais uniquement, aucun mot en anglais.`;

const SECTION_INSTRUCTIONS: Record<string, string> = {
  sommeil: `
INSTRUCTIONS SPECIFIQUES POUR "SOMMEIL":
- Analyse sa DUREE reelle vs optimale (7-9h pour la plupart)
- Analyse sa QUALITE : reveils nocturnes, difficulte endormissement, reveil fatigue
- Explique l'ARCHITECTURE DU SOMMEIL : cycles de 90 min, phases N1/N2/N3/REM
- N3 (sommeil profond) : 70% de la GH quotidienne, reparation tissulaire
- REM : regulation emotionnelle, creativite, apprentissage moteur
- Si reveils nocturnes : hypotheses (cortisol 3-4h du matin, hypoglycemie reactive, apnee)
- CASCADE : manque sommeil - cortisol +37-45% - resistance insuline +30% en 4 nuits - leptine -18% - ghreline +28% - fringales - stockage
- ADENOSINE et pression de sommeil, CHRONOTYPE
- Sommeil et TESTOSTERONE : chaque heure en moins = -10-15% de T
- Sommeil et RECUPERATION : synthese proteique reduite de 18-25%
- MINIMUM 45-50 lignes tres detaillees
`,

  stress: `
INSTRUCTIONS SPECIFIQUES POUR "STRESS":
- Analyse son NIVEAU de stress chronique vs aigu
- Explique l'AXE HPA en detail :
  * Hypothalamus - CRH - Hypophyse - ACTH - Surrenales - Cortisol
  * Boucle de retroaction negative et dysfonctionnement
- EUSTRESS (adaptatif) vs DISTRESS (maladaptatif)
- ALLOSTASIE et charge allostatique (Sapolsky)
- CONSEQUENCES cortisol chronique :
  * Catabolisme musculaire (activation ubiquitine-proteasome)
  * Stockage visceral (recepteurs glucocorticoides abdominaux)
  * Resistance insuline (GLUT4 downregulation)
  * Inhibition thyroide (T4-T3 bloquee par 5'-deiodinase)
  * Baisse testosterone (inhibition 17b-HSD, suppression LH)
  * Permeabilite intestinale (leaky gut)
- METHODES de gestion actuelles ou leur absence
- NERF VAGUE et balance sympathique/parasympathique
- Stress et INFLAMMATION : CRP, IL-6, TNF-alpha
- MINIMUM 45-50 lignes
`,

  energie: `
INSTRUCTIONS SPECIFIQUES POUR "ENERGIE":
- Analyse son PATTERN energetique : matin, apres-midi, soir
- Explique la FLEXIBILITE METABOLIQUE :
  * Capacite a switcher glucose - acides gras
  * Role de CPT1 pour entree des AG dans mitochondries
  * Inhibition par malonyl-CoA quand insuline haute
- Si crash apres-midi : hypotheses
  * Pic glycemique post-prandial - hypoglycemie reactive
  * Ratio insuline/glucagon defavorable
  * Adenosine accumulee + dette de sommeil
- ENVIES DE SUCRE : signe d'inflexibilite metabolique
- BIOGENESE MITOCHONDRIALE :
  * PGC-1a comme regulateur maitre
  * Impact sommeil, exercice, froid sur mitochondries
  * Dysfonction = moins ATP + plus de ROS
- THERMOGENESE : frilosite = metabolisme ralenti, possible hypothyroidie subclinique
- Energie et THYROIDE : T3 libre, conversion T4-T3, rT3
- MINIMUM 45-50 lignes
`,

  digestion: `
INSTRUCTIONS SPECIFIQUES POUR "DIGESTION":
- Analyse son TRANSIT : frequence, consistance, regularite
- Constipation : hypotheses (cortisol inhibe motilite, fibres, deshydratation, dysbiose)
- Diarrhee : hypotheses (inflammation, malabsorption, SIBO, intolerances)
- BALLONNEMENTS :
  * Timing (apres repas = enzymes, permanent = dysbiose)
  * Aliments declencheurs (FODMAPs, lactose, gluten)
  * SIBO (Small Intestinal Bacterial Overgrowth)
- AXE INTESTIN-CERVEAU :
  * 70% systeme immunitaire dans intestin
  * 90% serotonine produite dans intestin
  * Nerf vague comme autoroute bidirectionnelle
- MICROBIOME : diversite, Firmicutes/Bacteroidetes, butyrate, AGCC
- PERMEABILITE INTESTINALE : zonuline, tight junctions, inflammation systemique
- Digestion et ABSORPTION : manger parfait mais mal absorber
- Fatigue post-repas : reponse insulinique excessive, leaky gut
- MINIMUM 40-45 lignes
`,

  training: `
INSTRUCTIONS SPECIFIQUES POUR "TRAINING":
- Analyse son VOLUME : seances/semaine, duree, groupes musculaires
- Analyse son INTENSITE : RPE, proximite echec, techniques intensification
- MECANISMES HYPERTROPHIE :
  * Tension mecanique (charge)
  * Stress metabolique (pump, lactate)
  * Dommages musculaires (pas le facteur principal)
- SYNTHESE PROTEIQUE MUSCULAIRE (MPS) :
  * Fenetre anabolique elargie (24-48h post-training)
  * mTOR comme regulateur maitre
  * Leucine threshold (2.5-3g par repas)
- Si STAGNATION : hypotheses
  * Adaptation neurale complete, besoin nouveaux stimuli
  * Volume insuffisant ou excessif (sous MEV ou au-dessus MRV)
  * Recuperation insuffisante (sommeil, nutrition, stress)
  * Environnement hormonal defavorable (cortisol > testosterone)
- RATIO PUSH/PULL et desequilibres
- PERIODISATION : lineaire, ondulee, en blocs
- DELOAD et supercompensation
- Recuperation mauvaise : HRV basse, cortisol chronique, deficit calorique trop agressif
- MINIMUM 45-50 lignes techniques
`,

  nutrition: `
INSTRUCTIONS SPECIFIQUES POUR "NUTRITION":
- Analyse ses APPORTS : repas/jour, timing, composition
- BESOINS estimes :
  * BMR (Mifflin-St Jeor ou Katch-McArdle)
  * TDEE avec multiplicateur activite
  * Deficit/surplus selon objectif
- PROTEINES :
  * Apport actuel vs optimal (1.6-2.2g/kg pour recomp)
  * Repartition journee (leucine threshold)
  * Sources (completes vs incompletes, biodisponibilite)
- GLUCIDES :
  * Timing (peri-training, matin vs soir)
  * Index glycemique et charge glycemique
  * Impact insuline et partitionnement
- LIPIDES :
  * Ratio omega-3/omega-6 (viser 1:3, plupart a 1:20)
  * AG satures, trans, mono-insatures
  * Impact hormones steroidiens
- HYDRATATION : impact performance (-10-20% si deshydrate)
- ALCOOL :
  * Metabolisme prioritaire foie (pause lipolyse)
  * Impact sommeil (supprime REM)
  * Impact testosterone (-20-30%)
- ALIMENTS TRANSFORMES : huiles vegetales, additifs, sucres caches
- MINIMUM 50-55 lignes avec chiffres
`,

  lifestyle: `
INSTRUCTIONS SPECIFIQUES POUR "LIFESTYLE":
- SEDENTARITE : heures assis/jour
  * Impact NEAT (15-30% du TDEE)
  * Desactivation fessiers, raccourcissement psoas
  * Compression disques vertebraux
- EXPOSITION LUMINEUSE :
  * Lumiere matinale (10-30 min dans 2h post-reveil)
  * Impact cortisol matinal, melatonine le soir
  * Lumiere bleue soir : suppression melatonine
- EXPOSITION SOLAIRE :
  * Synthese vitamine D cutanee
  * Impact immunite, humeur, hormones
- CAFEINE :
  * Demi-vie 5-6h (cafe 14h = 50% encore a 20h)
  * Blocage recepteurs adenosine
  * Tolerance et cycling
- TABAC : impact catastrophique (inflammation, vasoconstriction)
- MOUVEMENT QUOTIDIEN : marche, escaliers, micro-mouvements
- ENVIRONNEMENT TRAVAIL : stress, horaires, charge mentale
- Lifestyle et RYTHME CIRCADIEN : alignement ou desalignement
- MINIMUM 40-45 lignes
`,

  mindset: `
INSTRUCTIONS SPECIFIQUES POUR "MINDSET":
- NIVEAU ENGAGEMENT declare
- FRUSTRATIONS PASSEES : qu'est-ce qui n'a pas marche et pourquoi
- NEUROCHIMIE motivation :
  * Dopamine : anticipation, motivation, poursuite objectifs
  * Serotonine : satisfaction, contentement, patience
  * Noradrenaline : focus, energie, urgence
- Engagement bas : hypotheses
  * Epuisement dopaminergique (surexposition stimuli rapides)
  * Deficit precurseurs (tyrosine, tryptophane)
  * Fatigue surrenalienne (cortisol effondre)
- RELATION A L'ECHEC :
  * Patterns evitement ou self-sabotage
  * Fixed mindset vs growth mindset
- ADHERENCE : "Un protocole mediocre suivi a 100% bat un parfait suivi a 50%"
- Capacite SUIVRE CONSIGNES : flexibilite vs rigidite
- Mindset et PHYSIOLOGIE : le mental suit souvent l'etat du corps
  * Sommeil pourri - irritabilite - abandon
  * Cortisol haut - anxiete - decisions impulsives
- Valorise ses EFFORTS passes meme si resultats absents
- Probleme souvent pas le mindset mais blocages physiologiques
- MINIMUM 40-45 lignes
`
};

// Function to generate AI content for a specific section
// WITH VALIDATION: Minimum 24 lines, retry if too short
async function generateSectionContentAI(
  domain: string,
  score: number,
  responses: DiscoveryResponses,
  knowledgeContext: string
): Promise<string> {
  const anthropic = new Anthropic();
  const prenom = getDiscoveryFirstName(responses);
  const objectif = responses.objectif || 'tes objectifs';
  const sexe = responses.sexe || 'homme';
  const age = responses.age || 30;
  const knowledgeOk = !!knowledgeContext && knowledgeContext.length >= MIN_KNOWLEDGE_CONTEXT_CHARS;
  const contextForPrompt = knowledgeOk ? knowledgeContext : '';

  if (!knowledgeOk) {
    console.warn(`[Discovery] Knowledge context manquant pour ${domain}. Generation en mode degrade.`);
  }

  // Extract relevant responses for this domain
  const domainResponses = extractDomainResponses(domain, responses);
  const instructions = SECTION_INSTRUCTIONS[domain] || '';

  // GARDE-FOUS: Minimum 20 lines = ~1200 characters
  const MIN_CONTENT_LENGTH = MIN_DISCOVERY_SECTION_CHARS;
  const MIN_LINE_COUNT = MIN_DISCOVERY_SECTION_LINES;
  const MAX_RETRIES = 4;

  const buildPrompt = (attempt: number) => `SECTION A REDIGER: ${domain.toUpperCase()}

PROFIL:
Prenom: ${prenom}
Sexe: ${sexe}
Age: ${age} ans
Objectif: ${objectif}
Score ${domain}: ${score}/100

REPONSES QUESTIONNAIRE POUR CE DOMAINE:
${domainResponses}

${contextForPrompt ? `DONNEES SCIENTIFIQUES DE REFERENCE (OBLIGATOIRE A INTEGRER):
${contextForPrompt}

INSTRUCTION: Tu DOIS integrer ces donnees scientifiques dans ton analyse. Decris les mecanismes, les protocoles, les chiffres mentionnes. Ne fais pas une analyse generique.
` : ''}

${instructions}

MISSION CRITIQUE: Redige une analyse TRES COMPLETE de MINIMUM 45-55 lignes pour la section ${domain.toUpperCase()}.
${attempt > 1 ? `
ATTENTION: Ta reponse precedente etait TROP COURTE. Tu DOIS ecrire BEAUCOUP PLUS LONG. Developpe chaque mecanisme en detail. Minimum 45-55 lignes de texte dense et technique.
` : ''}

REGLES ABSOLUES:
1. Commence DIRECTEMENT par l'analyse du profil, jamais par un titre ou une intro generique
2. Tutoie ${prenom} tout au long du texte (tu, ton, tes)
3. Explique les MECANISMES biochimiques en detail (hormones, enzymes, recepteurs, cascades)
4. Cite des CHIFFRES precis (pourcentages, durees, seuils, dosages)
5. Connecte avec les autres systemes corporels (ex: cortisol affecte testosterone, sommeil affecte GH)
6. Integre les donnees scientifiques de la knowledge base ci-dessus
7. Ton direct, expert, sans complaisance, comme un coach qui dit la verite
8. Ne cite jamais de sources ni d'auteurs (pas de "Sources:", pas de noms propres)
9. Ne dis jamais "client", "nous", "notre" ou "on"
10. Francais uniquement. Aucun mot ou phrase en anglais.

FORMAT OBLIGATOIRE:
- JAMAIS de tiret long ou tiret cadratin (utilise : ou . a la place)
- JAMAIS de markdown (pas de **, ##, -, *, puces, listes numerotees)
- JAMAIS d'emojis
- JAMAIS de phrases meta comme "En tant qu'expert", "Je vais analyser", "Cette analyse montre", "Voici"
- Prose fluide uniquement, paragraphes separes par lignes vides
- Ecris a la deuxieme personne du singulier, comme si TU parlais directement a ${prenom}`;

  const isValidContent = (text: string) => {
    const lines = text.split(/\n+/).filter(l => l.trim().length > 30);
    const lineCount = lines.length;
    const charCount = text.length;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const lower = text.toLowerCase();
    const hasSources = SOURCE_MARKERS.some((marker) => lower.includes(marker));
    const hasClient = /\bclient\b/.test(lower);
    const hasNous = /\bnous\b/.test(lower) || /\bnotre\b/.test(lower);
    const hasEnglish = hasEnglishMarkers(text, 4);
    return {
      lineCount,
      charCount,
      wordCount,
      isValid:
        charCount >= MIN_CONTENT_LENGTH &&
        (lineCount >= MIN_LINE_COUNT || wordCount >= MIN_DISCOVERY_SECTION_WORDS) &&
        !hasSources &&
        !hasClient &&
        !hasNous &&
        !hasEnglish,
    };
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4200, // Longer content
        system: SECTION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildPrompt(attempt) }]
      });

      const textContent = response.content.find(c => c.type === 'text');
      let rawText = textContent?.text || '';

      // Clean AI indicators and formatting issues
      rawText = rawText
        .replace(/^(En tant qu['']expert[^.]*\.?\s*)/gi, '')
        .replace(/^(Cette analyse (montre|revele|demontre)[^.]*\.?\s*)/gi, '')
        .replace(/^(Je vais (analyser|examiner|etudier)[^.]*\.?\s*)/gi, '')
        .replace(/^(Voici (mon analyse|l['']analyse|une analyse)[^.]*\.?\s*)/gi, '')
        .replace(/^(Analyse de la section[^.]*\.?\s*)/gi, '')
        .replace(/—/g, ':')
        .replace(/–/g, '-')
        .replace(/\*\*/g, '')
        .replace(/##\s*/g, '')
        .replace(/^\s*[-*]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        .trim();

      if (hasEnglishMarkers(rawText, 6)) {
        rawText = stripEnglishLines(rawText);
      }
      rawText = normalizeSingleVoice(rawText);

      const validation = isValidContent(rawText);
      console.log(
        `[Discovery] Section ${domain} attempt ${attempt}: ${validation.charCount} chars, ${validation.wordCount} words, ${validation.lineCount} lines`
      );

      // VALIDATION: Check minimum length
      if (validation.isValid) {
        console.log(
          `[Discovery] ✓ Section ${domain} VALIDATED (${validation.charCount} chars, ${validation.wordCount} words, ${validation.lineCount} lines)`
        );
        return cleanMarkdownToHTML(rawText);
      }

      // If last attempt, use what we have but log warning
      if (attempt === MAX_RETRIES) {
        throw new Error(
          `[Discovery] Section ${domain} invalide apres ${MAX_RETRIES} tentatives (${validation.charCount} chars, ${validation.wordCount} words, ${validation.lineCount} lines)`
        );
      }

      console.log(
        `[Discovery] ✗ Section ${domain} TOO SHORT (${validation.charCount} chars, ${validation.wordCount} words, ${validation.lineCount} lines). Retrying...`
      );
    } catch (error) {
      console.error(`[Discovery] AI section ${domain} error (attempt ${attempt}):`, error);
      if (attempt === MAX_RETRIES) {
        break;
      }
    }
  }

  if (!openai) {
    return '';
  }

  console.warn(`[Discovery] Fallback OpenAI pour section ${domain}`);
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: OPENAI_CONFIG.OPENAI_MODEL,
        messages: [
          { role: 'system', content: SECTION_SYSTEM_PROMPT },
          { role: 'user', content: buildPrompt(attempt) }
        ],
        temperature: OPENAI_CONFIG.OPENAI_TEMPERATURE,
        max_tokens: OPENAI_CONFIG.OPENAI_MAX_TOKENS,
      });
      const rawText = response.choices[0]?.message?.content || '';
      if (!rawText.trim()) {
        continue;
      }
      let cleanedText = rawText;
      if (hasEnglishMarkers(cleanedText, 6)) {
        cleanedText = stripEnglishLines(cleanedText);
      }
      cleanedText = normalizeSingleVoice(cleanedText);
      const validation = isValidContent(cleanedText);
      if (validation.isValid) {
        console.log(
          `[Discovery] ✓ OpenAI section ${domain} OK (${validation.charCount} chars, ${validation.wordCount} words, ${validation.lineCount} lines)`
        );
        return cleanMarkdownToHTML(cleanedText);
      }
      console.warn(
        `[Discovery] OpenAI section ${domain} too short (${validation.charCount} chars, ${validation.wordCount} words, ${validation.lineCount} lines)`
      );
    } catch (error) {
      console.error(`[Discovery] OpenAI section ${domain} error:`, error);
    }
  }

  return '';
}

// Get knowledge context for a specific domain
async function getKnowledgeContextForDomain(domain: string): Promise<string> {
  // Complete mapping for all 15 NEUROCORE domains + extras
  const domainKeywords: Record<string, string[]> = {
    // Profil de Base
    'profil-base': ['metabolism', 'body composition', 'BMR', 'TDEE', 'anthropometry'],
    'composition-corporelle': ['body fat', 'lean mass', 'visceral fat', 'BMI', 'dexa', 'body composition'],

    // Energie & Metabolisme
    'metabolisme-energie': ['mitochondria', 'ATP', 'metabolism', 'thyroid', 'energy', 'fatigue', 'insulin', 'glucose'],
    energie: ['mitochondria', 'ATP', 'metabolism', 'thyroid', 'energy', 'fatigue', 'insulin sensitivity'],

    // Nutrition
    'nutrition-tracking': ['protein', 'macros', 'nutrition', 'calorie', 'meal timing', 'carb', 'leucine', 'mTOR'],
    nutrition: ['protein', 'insulin', 'macros', 'nutrition', 'calorie', 'meal frequency', 'fiber', 'micronutrients'],

    // Digestion
    'digestion-microbiome': ['gut', 'microbiome', 'digestion', 'SIBO', 'leaky gut', 'probiotics', 'zonulin', 'IBS'],
    digestion: ['gut', 'microbiome', 'digestion', 'SIBO', 'leaky gut', 'probiotics', 'intestinal permeability'],

    // Training & Performance
    'activite-performance': ['hypertrophy', 'recovery', 'muscle', 'protein synthesis', 'periodization', 'progressive overload'],
    training: ['hypertrophy', 'strength', 'muscle', 'protein synthesis', 'periodization', 'training frequency', 'volume'],

    // Sommeil & Recuperation
    'sommeil-recuperation': ['sleep', 'circadian', 'melatonin', 'GH', 'adenosine', 'deep sleep', 'REM', 'sleep architecture'],
    sommeil: ['sleep', 'circadian', 'melatonin', 'GH', 'adenosine', 'sommeil', 'insomnia', 'sleep quality'],

    // HRV & Cardiaque
    'hrv-cardiaque': ['HRV', 'heart rate variability', 'parasympathetic', 'vagal tone', 'autonomic', 'resting HR'],

    // Cardio & Endurance
    'cardio-endurance': ['vo2max', 'zone 2', 'aerobic', 'lactate threshold', 'cardio', 'endurance', 'LISS'],

    // Analyses & Biomarqueurs
    'analyses-biomarqueurs': ['bloodwork', 'biomarkers', 'testosterone', 'estradiol', 'thyroid', 'ferritin', 'vitamin D', 'B12', 'ApoB', 'LDL', 'HDL', 'triglycerides', 'HbA1c', 'insulin', 'CRP', 'homocysteine'],

    // Hormones & Stress
    'hormones-stress': ['testosterone', 'cortisol', 'HPA axis', 'DHEA', 'estrogen', 'progesterone', 'thyroid', 'T3', 'T4', 'TSH', 'prolactin', 'SHBG'],
    stress: ['cortisol', 'HPA', 'stress', 'anxiety', 'adrenal fatigue', 'burnout', 'catecholamines'],
    hormones: ['testosterone', 'estradiol', 'cortisol', 'thyroid', 'insulin', 'growth hormone', 'IGF-1', 'TRT'],

    // Lifestyle
    'lifestyle-substances': ['caffeine', 'alcohol', 'smoking', 'circadian', 'vitamin D', 'light exposure', 'NEAT', 'sedentary'],
    lifestyle: ['circadian', 'vitamin D', 'NEAT', 'light exposure', 'caffeine', 'alcohol', 'screen time'],

    // Biomecanique & Mobilite
    'biomecanique-mobilite': ['mobility', 'flexibility', 'posture', 'joint', 'fascia', 'movement pattern', 'ROM'],

    // Psychologie & Mental
    'psychologie-mental': ['dopamine', 'serotonin', 'motivation', 'adherence', 'habits', 'psychology', 'behavior change'],
    mindset: ['dopamine', 'motivation', 'serotonin', 'neurotransmitter', 'adherence', 'discipline', 'habits'],

    // Neurotransmetteurs
    neurotransmetteurs: ['dopamine', 'serotonin', 'GABA', 'acetylcholine', 'norepinephrine', 'neurotransmitter', 'brain chemistry'],

    // Supplements (bonus)
    supplements: ['creatine', 'vitamin D', 'magnesium', 'omega-3', 'zinc', 'ashwagandha', 'protein powder', 'supplements']
  };

  // Get keywords for this domain (try exact match, then partial match)
  let keywords = domainKeywords[domain];
  if (!keywords) {
    // Try to find partial match
    const domainLower = domain.toLowerCase();
    for (const [key, kws] of Object.entries(domainKeywords)) {
      if (domainLower.includes(key) || key.includes(domainLower)) {
        keywords = kws;
        break;
      }
    }
  }
  keywords = keywords || [domain];

  try {
    // Search with more keywords and get more articles
    const articles = await searchArticles(keywords.slice(0, 5), 6, ALLOWED_SOURCES as unknown as string[]);

    if (articles.length === 0) {
      // Try full-text search as fallback
      const ftArticles = await searchFullText(domain, 6);
      const filteredFt = ftArticles.filter(a => ALLOWED_SOURCES.includes(a.source as any));
      if (filteredFt.length > 0) {
        const context = filteredFt.map(a =>
          `[${a.source.toUpperCase()}] ${a.title}:\n${a.content.substring(0, 800)}`
        ).join('\n\n---\n\n');
        return stripEnglishLines(context);
      }
      return '';
    }

    // Return more content per article (800 chars instead of 400)
    const context = articles.map(a =>
      `[${a.source.toUpperCase()}] ${a.title}:\n${a.content.substring(0, 800)}`
    ).join('\n\n---\n\n');
    return stripEnglishLines(context);
  } catch (error) {
    console.error(`[Discovery] Knowledge search error for ${domain}:`, error);
    return '';
  }
}

// Extract relevant responses for a specific domain
function extractDomainResponses(domain: string, responses: DiscoveryResponses): string {
  // Complete mapping for all NEUROCORE domains
  const domainKeys: Record<string, string[]> = {
    // Profil de Base
    'profil-base': ['prenom', 'sexe', 'age', 'taille', 'poids', 'objectif-principal', 'objectifs-specifiques'],

    // Composition Corporelle
    'composition-corporelle': ['tour-taille', 'tour-hanches', 'body-fat-estime', 'evolution-poids', 'silhouette-actuelle'],

    // Metabolisme & Energie
    'metabolisme-energie': ['energie-matin', 'energie-aprem', 'coup-fatigue', 'envies-sucre', 'thermogenese', 'tolerance-froid', 'transpiration'],
    energie: ['energie-matin', 'energie-aprem', 'coup-fatigue', 'envies-sucre', 'motivation', 'thermogenese'],

    // Nutrition & Tracking
    'nutrition-tracking': ['nb-repas', 'petit-dejeuner', 'proteines-jour', 'eau-jour', 'regime-alimentaire', 'aliments-transformes', 'sucres-ajoutes', 'tracking-calories'],
    nutrition: ['nb-repas', 'petit-dejeuner', 'proteines-jour', 'eau-jour', 'regime-alimentaire', 'aliments-transformes', 'sucres-ajoutes', 'alcool'],

    // Digestion & Microbiome
    'digestion-microbiome': ['digestion-qualite', 'ballonnements', 'transit', 'reflux', 'intolerance', 'energie-post-repas', 'selles-consistance', 'probiotiques'],
    digestion: ['digestion-qualite', 'ballonnements', 'transit', 'reflux', 'intolerance', 'energie-post-repas'],

    // Activite & Performance
    'activite-performance': ['sport-frequence', 'type-sport', 'intensite', 'recuperation', 'courbatures', 'performance-evolution', 'anciennete-training', 'objectif-training'],
    training: ['sport-frequence', 'type-sport', 'intensite', 'recuperation', 'courbatures', 'performance-evolution', 'anciennete-training'],

    // Sommeil & Recuperation
    'sommeil-recuperation': ['heures-sommeil', 'qualite-sommeil', 'reveil-fatigue', 'endormissement', 'reveils-nocturnes', 'heure-coucher', 'heure-reveil', 'sieste', 'reves', 'apnee'],
    sommeil: ['heures-sommeil', 'qualite-sommeil', 'reveil-fatigue', 'endormissement', 'reveils-nocturnes', 'heure-coucher', 'heure-reveil', 'sieste'],

    // HRV & Cardiaque
    'hrv-cardiaque': ['hrv-mesure', 'hrv-moyenne', 'fc-repos', 'variabilite-fc', 'wearable-utilise'],

    // Cardio & Endurance
    'cardio-endurance': ['cardio-frequence', 'type-cardio', 'zone-2-temps', 'essoufflement', 'vo2max-estime', 'fcmax-connue'],

    // Analyses & Biomarqueurs
    'analyses-biomarqueurs': ['bilan-sanguin-recent', 'resultats-anormaux', 'testosterone-niveau', 'thyroide-tsh', 'ferritine', 'vitamine-d', 'hemoglobine'],

    // Hormones & Stress
    'hormones-stress': ['niveau-stress', 'anxiete', 'cortisol-signes', 'libido', 'testosterone-symptomes', 'thyroide-symptomes', 'cycle-menstruel'],
    stress: ['niveau-stress', 'anxiete', 'concentration', 'irritabilite', 'gestion-stress', 'sources-stress'],
    hormones: ['libido', 'testosterone-symptomes', 'thyroide-symptomes', 'cortisol-signes', 'cycle-menstruel'],

    // Lifestyle & Substances
    'lifestyle-substances': ['cafe-jour', 'tabac', 'alcool', 'cannabis', 'supplements-actuels', 'medicaments', 'temps-ecran', 'exposition-soleil', 'profession', 'heures-assis'],
    lifestyle: ['cafe-jour', 'tabac', 'temps-ecran', 'exposition-soleil', 'profession', 'heures-assis'],

    // Biomecanique & Mobilite
    'biomecanique-mobilite': ['douleurs-articulaires', 'posture-problemes', 'mobilite-limitation', 'blessures-passees', 'mal-dos', 'stretching-frequence'],

    // Psychologie & Mental
    'psychologie-mental': ['engagement-niveau', 'frustration-passee', 'si-rien-change', 'ideal-6mois', 'plus-grosse-peur', 'motivation-principale', 'consignes-strictes', 'discipline-niveau'],
    mindset: ['engagement-niveau', 'frustration-passee', 'si-rien-change', 'ideal-6mois', 'plus-grosse-peur', 'motivation-principale', 'consignes-strictes'],

    // Neurotransmetteurs
    neurotransmetteurs: ['humeur-generale', 'anxiete', 'concentration', 'motivation', 'plaisir-activites', 'impulsivite', 'addiction-tendances']
  };

  // Get keys for this domain (try exact match, then partial match)
  let keys = domainKeys[domain];
  if (!keys) {
    const domainLower = domain.toLowerCase();
    for (const [key, vals] of Object.entries(domainKeys)) {
      if (domainLower.includes(key) || key.includes(domainLower)) {
        keys = vals;
        break;
      }
    }
  }
  keys = keys || [];

  const relevantResponses: string[] = [];

  for (const key of keys) {
    const value = responses[key as keyof DiscoveryResponses];
    if (value !== undefined && value !== null && value !== '') {
      relevantResponses.push(`- ${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
    }
  }

  return relevantResponses.join('\n') || 'Pas de reponses specifiques pour ce domaine';
}

// Original system prompt for global synthesis (kept for backward compatibility)
const DISCOVERY_GLOBAL_PROMPT = `Tu es un expert en physiologie, endocrinologie et performance humaine de niveau doctoral. Tu rediges des rapports medicaux detailles pour des personnes qui veulent comprendre POURQUOI leur corps dysfonctionne.

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
  const knowledgeOk = !!knowledgeContext && knowledgeContext.length >= MIN_KNOWLEDGE_CONTEXT_CHARS;
  const contextForPrompt = knowledgeOk ? knowledgeContext : '';
  if (!knowledgeOk) {
    console.warn("[Discovery] Knowledge context manquant pour la synthese. Generation en mode degrade.");
  }

  const anthropic = new Anthropic();

  const blocagesSummary = blocages.map(b =>
    `[${b.severity.toUpperCase()}] ${b.domain}: ${b.title}\n${b.mechanism}`
  ).join('\n\n');

  const userPrompt = `PROFIL:
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

${contextForPrompt ? `DONNEES SCIENTIFIQUES PERTINENTES:\n${contextForPrompt}` : ''}

MISSION: Redige une analyse TRES LONGUE et TRES DETAILLEE en 4 paragraphes de prose fluide. MINIMUM 1000 mots au total.

STRUCTURE OBLIGATOIRE:

PARAGRAPHE 1 (minimum 250 mots): Le dysfonctionnement central. Explique le mecanisme biochimique precis du blocage principal. Decris les enzymes, recepteurs, hormones impliques. Donne des chiffres (pourcentages, durees, seuils). Explique la physiopathologie sans donner de solution.

PARAGRAPHE 2 (minimum 250 mots): La cascade systemique. Decris comment ce dysfonctionnement affecte les autres systemes de ${responses.prenom}. Explique les interactions sommeil/cortisol/insuline/testosterone. Decris les boucles de retroaction.

PARAGRAPHE 3 (minimum 250 mots): L'impact metabolique complet. Detail les consequences sur le metabolisme energetique, la thyroide, les mitochondries, la sensibilite a l'insuline. Explique pourquoi la perte de gras est bloquee ou pourquoi la prise de muscle est compromise. Chiffres et mecanismes.

PARAGRAPHE 4 (minimum 250 mots): Pourquoi ${responses.prenom} stagne malgre ses efforts. Fais le lien direct avec son objectif "${responses.objectif}". Explique pourquoi les approches classiques ne fonctionnent pas dans son cas specifique. Conclus sur l'importance de comprendre ces mecanismes pour debloquer la situation.

RAPPELS CRITIQUES:
- JAMAIS de tiret long (—) ni de tiret cadratin
- Prose fluide uniquement, PAS de listes
- PAS de markdown (##, **, -, *)
- PAS d'emojis
- PAS de recommandations ni solutions
- Ne cite JAMAIS de sources ni d'auteurs
- MINIMUM 1000 mots au total
- Francais uniquement, aucun mot en anglais`;

  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: DISCOVERY_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }]
      });

      const textContent = response.content.find(c => c.type === 'text');
      let rawText = textContent?.text || '';
      if (!rawText.trim()) {
        throw new Error("[Discovery] Synthese vide");
      }

      if (hasEnglishMarkers(rawText, 6)) {
        if (attempt < 2) {
          console.warn("[Discovery] Synthese contient de l'anglais, retry...");
          continue;
        }
        rawText = stripEnglishLines(rawText);
      }

      rawText = normalizeSingleVoice(rawText);
      return cleanMarkdownToHTML(rawText);
    }
    throw new Error("[Discovery] Synthese invalide apres retries");
  } catch (error) {
    console.error('[Discovery] AI synthesis error:', error);

    if (openai) {
      try {
        console.warn('[Discovery] Fallback OpenAI pour synthese globale');
        const response = await openai.chat.completions.create({
          model: OPENAI_CONFIG.OPENAI_MODEL,
          messages: [
            { role: 'system', content: DISCOVERY_SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          temperature: OPENAI_CONFIG.OPENAI_TEMPERATURE,
          max_tokens: OPENAI_CONFIG.OPENAI_MAX_TOKENS,
        });
        const text = response.choices[0]?.message?.content || '';
        if (text.trim()) {
          let cleaned = text;
          if (hasEnglishMarkers(cleaned, 6)) {
            cleaned = stripEnglishLines(cleaned);
          }
          cleaned = normalizeSingleVoice(cleaned);
          return cleanMarkdownToHTML(cleaned);
        }
      } catch (fallbackError) {
        console.error('[Discovery] OpenAI synthesis fallback error:', fallbackError);
      }
    }

    return `Analyse détectée: ${blocages.length} blocages identifiés affectant ton objectif "${responses.objectif}".`;
  }
}

// Convert markdown artifacts to clean HTML - CRITICAL: Remove all em dashes
function cleanMarkdownToHTML(text: string): string {
  let cleaned = text
    // Remove any explicit sources/references lines even if inline
    .replace(/^\s*(Sources?|References?|Références?)\s*:.*$/gmi, '')
    .replace(/Sources?\s*:.*$/gmi, '')
    // Remove any explicit source names
    .replace(SOURCE_NAME_REGEX, "")
    // Remove "client" language (single-author voice)
    .replace(/\bclients\b/gi, "profils")
    .replace(/\bclient\b/gi, "profil")
    // CRITICAL: Remove ALL em dashes (—) and en dashes (–) FIRST
    .replace(/—/g, ':')
    .replace(/–/g, '-')
    .replace(/\u2014/g, ':')  // Unicode em dash
    .replace(/\u2013/g, '-')  // Unicode en dash
    // Remove markdown headers (## Title -> Title)
    .replace(/^#{1,4}\s+(.+)$/gm, '$1')
    // Remove any source lines (client should never see sources in Discovery)
    .replace(/^\s*Sources?:.*$/gmi, '')
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
    // Drop any lines that still contain "Sources:"
    .split(/\n/)
    .filter((line) => !/sources?\s*:/i.test(line))
    .join('\n')
    // Strip inline styles/colors that can cause black-on-black
    .replace(/\s*style=(\"|')[^\"']*(\"|')/gi, '')
    .replace(/\s*color=(\"|')[^\"']*(\"|')/gi, '')
    .replace(/<\/?font[^>]*>/gi, '')
    // Final pass: remove any remaining em dashes that slipped through
    .replace(/—/g, ':')
    .replace(/–/g, '-')
    .trim();

  if (hasEnglishMarkers(cleaned, 6)) {
    cleaned = stripEnglishLines(cleaned);
  }
  cleaned = normalizeSingleVoice(cleaned);
  return cleaned.trim();
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

export async function analyzeDiscoveryScan(responses: DiscoveryResponses): Promise<DiscoveryAnalysisResult> {
  const normalized = normalizeResponses(responses as Record<string, unknown>, { mode: "discovery" }) as DiscoveryResponses;
  console.log(`[Discovery] Analyzing scan for ${getDiscoveryFirstName(normalized)}...`);

  // Calculate scores for each domain
  const scoresByDomain = {
    sommeil: scoreSommeil(normalized),
    stress: scoreStress(normalized),
    energie: scoreEnergie(normalized),
    digestion: scoreDigestion(normalized),
    training: scoreTraining(normalized),
    nutrition: scoreNutrition(normalized),
    lifestyle: scoreLifestyle(normalized),
    mindset: scoreMindset(normalized)
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
  const blocages = detectBlocages(normalized, scoresByDomain);

  // Get knowledge context
  const knowledgeContext = await getKnowledgeContextForBlocages(blocages);

  // Generate AI synthesis
  const synthese = await generateAISynthesis(normalized, scoresByDomain, blocages, knowledgeContext);

  // Generate CTA message based on blocages
  let ctaMessage: string;
  const criticalCount = blocages.filter(b => b.severity === 'critique').length;
  const objectif = normalized.objectif || 'tes objectifs';

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

export async function convertToNarrativeReport(
  result: DiscoveryAnalysisResult,
  responses: DiscoveryResponses
): Promise<ReportData> {
  const normalized = normalizeResponses(responses as Record<string, unknown>, { mode: "discovery" }) as DiscoveryResponses;
  const prenom = getDiscoveryFirstName(normalized);
  const objectif = normalized.objectif || 'tes objectifs';

  console.log(`[Discovery] Generating AI content for 8 sections...`);

  // Generate AI content for ALL 8 sections in parallel
  const domains = Object.keys(result.scoresByDomain);
  const aiContentPromises = domains.map(async (domain) => {
    const score = result.scoresByDomain[domain as keyof typeof result.scoresByDomain];
    const knowledgeContext = await getKnowledgeContextForDomain(domain);
    const content = await generateSectionContentAI(domain, score, normalized, knowledgeContext);
    return { domain, content };
  });

  const aiContents = await Promise.all(aiContentPromises);
  const invalidSections = aiContents.filter(({ content }) => !content || content.length < MIN_DISCOVERY_SECTION_CHARS);
  if (invalidSections.length > 0) {
    const names = invalidSections.map(s => s.domain).join(", ");
    console.warn(`[Discovery] Sections invalides ou vides (fallback template): ${names}`);
  }
  const aiContentMap = new Map(aiContents.map(({ domain, content }) => [domain, content]));

  console.log(`[Discovery] AI content generated for all sections`);

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
    content: `<p>${prenom}, j'ai ouvert ton dossier et chaque reponse compte. Ce Discovery Scan est une radiographie rapide mais precise de tes mecanismes : ce qui tourne bien, ce qui cale, et pourquoi.</p>
<p>Je relie sommeil, stress, energie, digestion, entrainement, nutrition, lifestyle, mindset. Rien n'est isole. Un axe faible tire les autres vers le bas, un axe solide compense mais fatigue sur la duree.</p>
<p>Ton score global de <strong>${result.globalScore}/100</strong> donne la facade, mais la realite est dans les details : ${result.blocages.length} blocages structurants, souvent invisibles a l'oeil nu, qui expliquent tes plateaux et tes efforts mal recompenses.</p>
<p>Ici, je ne donne pas de solutions. Je montre la logique biologique, les cascades et les signaux. Tu vas comprendre ou se perd ton potentiel et pourquoi le corps resiste. Ensuite, tu choisiras si tu veux le plan complet.</p>`,
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

  // Sections par domaine - ALL WITH AI-GENERATED CONTENT (40-50 lines each)
  Object.entries(result.scoresByDomain)
    .sort((a, b) => a[1] - b[1]) // Worst first
    .forEach(([domain, score]) => {
      const config = DOMAIN_CONFIG[domain];
      const domainBlocages = result.blocages.filter(b =>
        b.domain.toLowerCase().includes(domain) ||
        domain.includes(b.domain.toLowerCase().split(' ')[0])
      );

      // Get AI-generated content for this domain
      const aiContent = aiContentMap.get(domain) || '';

      // Determine severity and color
      let severityLabel: string;
      let severityColor: string;
      let chips: string[] = [];

      // Theme M1: All severity indicators use yellow (#FCDD00) for consistency
      const primaryColor = '#FCDD00';

      if (domainBlocages.length > 0) {
        const maxSeverity = domainBlocages.some(b => b.severity === 'critique') ? 'critique' :
                          domainBlocages.some(b => b.severity === 'modere') ? 'modere' : 'leger';
        severityLabel = maxSeverity === 'critique' ? 'BLOCAGE CRITIQUE' : maxSeverity === 'modere' ? 'BLOCAGE MODERE' : 'BLOCAGE LEGER';
        severityColor = primaryColor; // Unified yellow for all blocages
        chips = domainBlocages[0]?.consequences.slice(0, 3).map(c => c.split(':')[0]) || [];
      } else if (score < 40) {
        severityLabel = 'CRITIQUE';
        severityColor = primaryColor;
        chips = ["Priorite Absolue", "Impact Direct"];
      } else if (score < 50) {
        severityLabel = 'INSUFFISANT';
        severityColor = primaryColor;
        chips = ["A Corriger", "Impact"];
      } else if (score < 70) {
        severityLabel = 'A OPTIMISER';
        severityColor = primaryColor;
        chips = ["Potentiel", "Optimisable"];
      } else if (score < 80) {
        severityLabel = 'CORRECT';
        severityColor = primaryColor;
        chips = ["Base Solide", "Affinable"];
      } else {
        severityLabel = 'POINT FORT';
        severityColor = primaryColor;
        chips = ["Excellence", "Maintenir"];
      }

      // Build content with header + AI content
      let content = `<p><strong>Score: ${score}/100</strong> <span style="color: ${severityColor}; font-weight: bold;">[${severityLabel}]</span></p>\n\n`;

      // Add blocage info if exists
      if (domainBlocages.length > 0) {
        domainBlocages.forEach(b => {
          content += `<p><strong>${b.title}</strong></p>`;
        });
      }

      // Add AI-generated detailed analysis (40-50 lines)
      if (aiContent && aiContent.length >= MIN_DISCOVERY_SECTION_CHARS) {
        content += aiContent.split('\n\n').map(p => `<p>${p}</p>`).join('\n');
      } else {
        // Fallback to template if AI failed or too short
        content += generateDomainHTML(domain, score, responses);
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
    auditType: "GRATUIT"
  };
}

// Generate DETAILED domain-specific HTML based on responses - RICH CONTENT for each section
function generateDomainHTML(domain: string, score: number, responses: DiscoveryResponses): string {
  const prenom = responses.prenom || 'Tu';
  const objectif = responses.objectif || 'tes objectifs';
  const scoreLabel = score >= 80 ? 'excellent' : score >= 60 ? 'correct mais sous-optimal' : score >= 40 ? 'insuffisant' : 'critique';

  switch (domain) {
    case 'sommeil': {
      const heures = responses['heures-sommeil'];
      const qualite = responses['qualite-sommeil'];
      const reveilFatigue = responses['reveil-fatigue'];
      const endormissement = responses['endormissement'];
      const reveils = responses['reveils-nocturnes'];
      const heureCoucher = responses['heure-coucher'];

      return `
<p class="mt-6"><strong>Analyse de ton sommeil</strong></p>

<p>${prenom}, ton score sommeil de ${score}/100 est ${scoreLabel}. Avec ${heures === '7-8' ? '7-8h' : heures === '6-7' ? '6-7h' : heures === '5-6' ? '5-6h' : 'moins de 5h'} de sommeil par nuit et une qualite ${qualite}, ton architecture de sommeil merite une attention particuliere.</p>

<p>Le sommeil n'est pas qu'une question de duree. C'est pendant les phases de sommeil profond (stades 3-4 NREM) que ton corps secretee 70% de son hormone de croissance quotidienne. Cette GH est essentielle pour la reparation musculaire, la lipolyse nocturne, et la consolidation de la memoire. ${reveilFatigue === 'souvent' || reveilFatigue === 'toujours' ? 'Le fait que tu te reveilles fatigue suggere que tu n\'atteins pas suffisamment ces phases profondes, malgre le temps passe au lit.' : 'Tes reveils semblent corrects, ce qui est un bon signe pour la qualite de tes cycles.'}</p>

<p>${endormissement === 'souvent' || endormissement === 'toujours' ? 'Tes difficultes d\'endormissement peuvent indiquer un exces de cortisol le soir, une exposition tardive a la lumiere bleue, ou un systeme nerveux sympathique hyperactif. L\'adenosine, qui cree la pression de sommeil, pourrait etre bloquee par une consommation de cafeine trop tardive.' : 'Ton endormissement semble fluide, ce qui indique une bonne pression de sommeil et un rythme circadien relativement cale.'}</p>

<p>${reveils === 'chaque-nuit' || reveils === 'souvent' ? 'Tes reveils nocturnes frequents fragmentent tes cycles de 90 minutes. Chaque reveil te ramene en sommeil leger, t\'empechant d\'accumuler le temps necessaire en sommeil profond et paradoxal (REM). Cela peut etre lie a des variations glycemiques nocturnes, de l\'apnee du sommeil, ou un desequilibre cortisol/melatonine.' : 'L\'absence de reveils nocturnes frequents est un atout majeur pour ta recuperation.'}</p>

<p><strong>Impact sur ${objectif} :</strong> ${score < 60 ? 'Ton deficit de sommeil compromet directement ta capacite a perdre du gras et construire du muscle. La resistance a l\'insuline induite par le manque de sommeil favorise le stockage abdominal, tandis que la GH effondree limite ta synthese proteique de 18-25%.' : 'Ton sommeil est une base solide, mais des optimisations circadiennes pourraient encore ameliorer ta production de GH et ta sensibilite a l\'insuline.'}</p>`;
    }

    case 'stress': {
      const niveauStress = responses['niveau-stress'];
      const anxiete = responses['anxiete'];
      const concentration = responses['concentration'];
      const irritabilite = responses['irritabilite'];
      const gestionStress = responses['gestion-stress'];
      const hasNoStressManagement = Array.isArray(gestionStress) && (gestionStress.includes('rien') || gestionStress.length === 0);

      return `
<p class="mt-6"><strong>Analyse de ton stress</strong></p>

<p>${prenom}, ton score stress de ${score}/100 revele un axe HPA (hypothalamo-hypophyso-surrenalien) ${score < 50 ? 'en hyperactivation chronique' : score < 70 ? 'sous tension moderee' : 'relativement equilibre'}. Ton niveau de stress ${niveauStress} a des implications directes sur ta physiologie.</p>

<p>Quand ton cerveau percoit un stress, l'hypothalamus libere du CRH qui stimule l'hypophyse a produire de l'ACTH, qui elle-meme pousse tes surrenales a secreter du cortisol. Ce mecanisme, concu pour des stress aigus et courts, devient deletere quand il est active en permanence. ${anxiete === 'souvent' ? 'Ton anxiete frequente maintient cette cascade en boucle, consommant 20% de ton glucose sanguin pour alimenter un cerveau en mode alerte constant.' : ''}</p>

<p>${concentration === 'difficile' ? 'Tes difficultes de concentration sont un symptome classique de l\'exces de cortisol : il interfere avec l\'hippocampe et le cortex prefrontal, reduisant ta memoire de travail et ta capacite de decision.' : 'Ta concentration preservee suggere que ton cortex prefrontal n\'est pas encore sature par le cortisol.'} ${irritabilite === 'tres-souvent' || irritabilite === 'souvent' ? 'Ton irritabilite elevee indique une depletion en GABA et serotonine, les neurotransmetteurs inhibiteurs qui tempereraient normalement ta reactivite emotionnelle.' : ''}</p>

<p>${hasNoStressManagement ? 'L\'absence de techniques de gestion du stress (meditation, respiration, marche en nature) laisse ton systeme nerveux sans outil de regulation. Ton nerf vague, qui activerait le mode parasympathique "repos et digestion", reste sous-stimule.' : 'Tes techniques de gestion du stress actuelles aident a activer ton systeme parasympathique, ce qui est un point positif pour contrebalancer le cortisol.'}</p>

<p><strong>Impact sur ${objectif} :</strong> ${score < 60 ? 'Le cortisol chronique bloque la lipolyse en inhibant la lipase hormono-sensible. Il favorise le stockage visceral via les recepteurs cortisol des adipocytes abdominaux. Simultanement, il inhibe la production de testosterone au niveau des cellules de Leydig, sabotant ta capacite anabolique.' : 'Ton stress est gerable, mais surveille les periodes d\'intensification qui pourraient faire basculer ton metabolisme en mode catabolique.'}</p>`;
    }

    case 'energie': {
      const energieMatin = responses['energie-matin'];
      const energieAprem = responses['energie-aprem'];
      const coupFatigue = responses['coup-fatigue'];
      const enviesSucre = responses['envies-sucre'];
      const motivation = responses['motivation'];
      const thermogenese = responses['thermogenese'];

      return `
<p class="mt-6"><strong>Analyse de ton energie</strong></p>

<p>${prenom}, ton score energie de ${score}/100 est ${scoreLabel}. Avec une energie matinale ${energieMatin} et ${coupFatigue === 'quotidien' || coupFatigue === 'souvent' ? 'des coups de fatigue frequents' : 'des variations energetiques moderees'}, ton profil revele des informations cruciales sur ton metabolisme cellulaire.</p>

<p>L'energie que tu ressens est directement liee a la production d'ATP par tes mitochondries. Ces organites utilisent soit le glucose, soit les acides gras pour generer l'energie cellulaire. ${enviesSucre === 'souvent' ? 'Tes envies de sucre frequentes signalent une inflexibilite metabolique : ton corps a perdu la capacite de basculer efficacement vers l\'oxidation des graisses, te rendant dependant du glucose comme carburant primaire.' : 'Tes envies de sucre controlees suggerent une flexibilite metabolique preservee.'}</p>

<p>${energieAprem === 'crash' || energieAprem === 'baisse-moderee' ? 'Ta baisse d\'energie l\'apres-midi est typique d\'un pic glycemique post-prandial suivi d\'une hypoglycemie reactive. L\'insuline liberee en exces fait chuter ta glycemie sous le niveau basal, declenchant fatigue, irritabilite et nouvelles envies de sucre. C\'est un cercle vicieux qui maintient ton metabolisme en mode "stockage".' : 'Ta stabilite energetique l\'apres-midi indique une bonne gestion glycemique et une sensibilite a l\'insuline preservee.'}</p>

<p>${thermogenese === 'toujours' || thermogenese === 'souvent' ? 'Ta frilosite chronique est un marqueur important. Elle peut indiquer une hypothyroidie subclinique (T3 libre basse), un metabolisme de base abaisse par restriction calorique chronique, ou une thermogenese adaptative reduite. Ton corps economise l\'energie au lieu de la dissiper en chaleur.' : 'Ta thermogenese normale suggere une fonction thyroidienne et un metabolisme de base corrects.'}</p>

<p><strong>Impact sur ${objectif} :</strong> ${score < 60 ? 'Ton inflexibilite metabolique t\'empeche de bruler efficacement les graisses, meme en deficit calorique. Les mitochondries dysfonctionnelles produisent moins d\'ATP et plus de radicaux libres, creant un environnement inflammatoire qui freine encore plus ta progression.' : 'Ton energie est un atout, mais des ajustements sur le timing nutritionnel et l\'exposition au froid pourraient encore optimiser ta flexibilite metabolique.'}</p>`;
    }

    case 'digestion': {
      const digestQualite = responses['digestion-qualite'];
      const ballonnements = responses['ballonnements'];
      const transit = responses['transit'];
      const reflux = responses['reflux'];
      const intolerance = responses['intolerance'] || [];
      const energiePostRepas = responses['energie-post-repas'];

      return `
<p class="mt-6"><strong>Analyse de ta digestion</strong></p>

<p>${prenom}, ton score digestion de ${score}/100 est ${scoreLabel}. Ta qualite digestive ${digestQualite} revele l'etat de ton axe intestin-cerveau et de ton microbiome, deux elements determinants pour ta sante globale et tes performances.</p>

<p>Ton intestin heberge 70% de ton systeme immunitaire et produit 90% de ta serotonine. ${ballonnements === 'apres-repas' || ballonnements === 'souvent' ? 'Tes ballonnements frequents peuvent indiquer une dysbiose (desequilibre du microbiome), un SIBO (Small Intestinal Bacterial Overgrowth), une hypochlorhydrie (manque d\'acide gastrique), ou des intolerance alimentaires non identifiees. La fermentation excessive produit des gaz et des metabolites inflammatoires.' : 'L\'absence de ballonnements significatifs suggere une digestion enzymatique efficace et un microbiome equilibre.'}</p>

<p>${transit === 'constipe' ? 'Ta constipation indique un transit ralenti, souvent lie au stress (le cortisol inhibe la motilite intestinale), a un manque de fibres, ou a une deshydratation. Les selles qui stagnent permettent une reabsorption excessive des toxines et des estrogenes, perturbant ton equilibre hormonal.' : transit === 'diarrhee' ? 'Tes selles frequentes peuvent indiquer une inflammation intestinale, une malabsorption, ou une intolerante alimentaire active. Les nutriments traversent trop vite pour etre correctement absorbes.' : transit === 'variable' ? 'Ton transit irregulier reflere probablement un axe intestin-cerveau perturbe par le stress, ou une sensibilite a certains aliments non encore identifies.' : 'Ton transit regulier est un excellent indicateur de sante intestinale.'}</p>

<p>${energiePostRepas === 'crash' || energiePostRepas === 'somnolence' ? 'Ta fatigue post-prandiale n\'est pas normale. Elle peut indiquer une reponse insulinique excessive, une permeabilite intestinale (leaky gut) qui laisse passer des molecules pro-inflammatoires, ou une sensibilite alimentaire declenchant une reponse immunitaire energivore.' : 'Ton energie stable apres les repas indique une bonne tolerance alimentaire et une glycemie controlee.'}</p>

<p><strong>Impact sur ${objectif} :</strong> ${score < 60 ? 'Une digestion compromise limite l\'absorption des proteines necessaires a la synthese musculaire et des micronutriments (zinc, magnesium, B12) essentiels a ton metabolisme energetique. L\'inflammation intestinale chronique cree une resistance a l\'insuline et favorise le stockage graisseux.' : 'Ta digestion solide est un atout majeur pour l\'absorption des nutriments et le maintien d\'un environnement hormonal favorable.'}</p>`;
    }

    case 'training': {
      const frequence = responses['sport-frequence'];
      const typeSport = responses['type-sport'] || [];
      const intensite = responses['intensite'];
      const recuperation = responses['recuperation'];
      const courbatures = responses['courbatures'];
      const evolution = responses['performance-evolution'];

      return `
<p class="mt-6"><strong>Analyse de ton entrainement</strong></p>

<p>${prenom}, ton score training de ${score}/100 est ${scoreLabel}. Tu t'entraines ${frequence === '5+' ? 'plus de 5 fois' : frequence === '3-4' ? '3-4 fois' : frequence === '1-2' ? '1-2 fois' : '0 fois'} par semaine avec une intensite ${intensite}. Ces parametres determinent le stimulus d'adaptation que tu donnes a ton corps.</p>

<p>L'entrainement cree un stress mecanique et metabolique qui, lorsqu'il est correctement dose et suivi d'une recuperation adequate, declenche des adaptations : hypertrophie musculaire, amelioration de la capacite aerobique, renforcement des tissus conjonctifs. ${recuperation === 'mauvaise' ? 'Ta mauvaise recuperation indique un desequilibre entre le stimulus d\'entrainement et ta capacite regenerative. Soit le volume/intensite est excessif, soit tes facteurs de recuperation (sommeil, nutrition, stress) sont insuffisants.' : recuperation === 'moyenne' ? 'Ta recuperation moyenne suggere une marge d\'amelioration, probablement en optimisant tes facteurs de recuperation plutot qu\'en reduisant l\'entrainement.' : 'Ta bonne recuperation indique un equilibre stimulus-adaptation correct.'}</p>

<p>${courbatures === 'toujours' ? 'Tes courbatures systematiques (DOMS) peuvent indiquer un exces de dommages musculaires, une inflammation chronique, ou une carence en mineraux (magnesium, potassium) necessaires a la relaxation musculaire. Un certain niveau de DOMS est normal, mais leur persistance suggere une recuperation incomplete.' : courbatures === 'souvent' ? 'Tes courbatures frequentes meritent attention. Elles peuvent refleter un volume d\'entrainement eleve, un manque de sommeil profond, ou une nutrition post-entrainement inadequate.' : 'Tes courbatures moderees indiquent un stimulus adapte a ta capacite de recuperation.'}</p>

<p>${evolution === 'regression' ? 'Ta regression de performance est un signal d\'alarme. Elle indique soit un surentrainement (HRV basse, cortisol eleve, testosterone en chute), soit un deficit energetique trop important, soit une accumulation de stress non-entrainement qui depasse ta capacite adaptative totale.' : evolution === 'stagnation' ? 'Ta stagnation n\'est pas due a un manque d\'effort. Elle revele souvent un plafond impose par tes facteurs limitants : sommeil, stress, nutrition, ou environnement hormonal. Pousser plus fort sans corriger ces facteurs est contre-productif.' : 'Ta progression continue est excellente et indique un bon equilibre stimulus-adaptation.'}</p>

<p><strong>Impact sur ${objectif} :</strong> ${score < 60 ? 'Ton desequilibre entrainement-recuperation cree un ratio testosterone/cortisol defavorable. En mode catabolique, tu perds du muscle et stockes du gras, l\'inverse de ton objectif. La MPS (synthese proteique musculaire) est bloquee quand le cortisol domine.' : 'Ton entrainement est bien structure. L\'optimisation des facteurs de recuperation pourrait debloquer de nouveaux gains.'}</p>`;
    }

    case 'nutrition': {
      const nbRepas = responses['nb-repas'];
      const petitDej = responses['petit-dejeuner'];
      const proteines = responses['proteines-jour'];
      const eau = responses['eau-jour'];
      const regime = responses['regime-alimentaire'];
      const transformes = responses['aliments-transformes'];
      const sucres = responses['sucres-ajoutes'];
      const alcool = responses['alcool'];

      return `
<p class="mt-6"><strong>Analyse de ta nutrition</strong></p>

<p>${prenom}, ton score nutrition de ${score}/100 est ${scoreLabel}. Avec ${nbRepas === '1-2' ? '1-2 repas' : nbRepas === '3' ? '3 repas' : '4+ repas'} par jour et un apport proteique ${proteines === 'insuffisant' ? 'insuffisant' : proteines === 'correct' ? 'correct' : 'eleve'}, ton alimentation joue un role central dans ta composition corporelle.</p>

<p>Les proteines sont le macronutriment le plus important pour la recomposition corporelle. ${proteines === 'insuffisant' || proteines === 'faible' ? 'Ton apport proteique insuffisant (probablement <1.6g/kg) limite ta synthese proteique musculaire (MPS), reduit ta satiete (les proteines ont l\'effet thermic le plus eleve), et diminue ta thermogenese alimentaire de 20-30%. C\'est le frein numero un a la construction musculaire et a la perte de gras.' : proteines === 'correct' ? 'Ton apport proteique correct est une base, mais pour optimiser la MPS, viser 2-2.2g/kg en periode de recomposition serait ideal.' : 'Ton apport proteique eleve est optimal pour maximiser la MPS et la satiete.'}</p>

<p>${eau === 'moins-1L' || eau === '1-1.5L' ? 'Ta consommation d\'eau insuffisante (<2L/jour) impacte directement tes performances (-10-20%), ton metabolisme, et toutes tes reactions enzymatiques. L\'eau est le solvant universel de ton corps : deshydrate, chaque fonction cellulaire est compromise.' : 'Ton hydratation correcte soutient tes fonctions metaboliques et ta performance.'} ${transformes === 'souvent' ? 'Ta consommation elevee d\'aliments transformes apporte des huiles vegetales pro-inflammatoires (omega-6), des sucres caches, des additifs qui perturbent ton microbiome, et des calories vides sans micronutriments.' : ''}</p>

<p>${sucres === 'eleve' ? 'Ta consommation elevee de sucres ajoutes maintient ton insuline chroniquement elevee, bloquant la lipolyse et favorisant le stockage. Les pics glycemiques repetitifs creent une inflammation systemique et accelerent la resistance a l\'insuline.' : ''} ${alcool === '8+' || alcool === '4-7' ? 'Ta consommation d\'alcool est problematique. L\'ethanol est metabolise en priorite par le foie, mettant en pause l\'oxidation des graisses. Il perturbe le sommeil profond, reduit la testosterone de 20-30%, et apporte des calories vides. Chaque verre est un frein direct a ta progression.' : 'Ta consommation d\'alcool limitee preserve ton metabolisme hepatique et ta qualite de sommeil.'}</p>

<p><strong>Impact sur ${objectif} :</strong> ${score < 60 ? 'Ton alimentation actuelle cree un environnement inflammatoire et insulino-resistant qui bloque la perte de gras malgre un eventuel deficit calorique. Les carences en micronutriments (magnesium, zinc, D3) amplifient ces dysfonctionnements.' : 'Ta nutrition est une base solide. Des ajustements sur le timing proteique et la densite nutritionnelle pourraient optimiser ta recomposition.'}</p>`;
    }

    case 'lifestyle': {
      const cafe = responses['cafe-jour'];
      const tabac = responses['tabac'];
      const ecrans = responses['temps-ecran'];
      const soleil = responses['exposition-soleil'];
      const profession = responses['profession'];
      const assis = responses['heures-assis'];

      return `
<p class="mt-6"><strong>Analyse de ton lifestyle</strong></p>

<p>${prenom}, ton score lifestyle de ${score}/100 est ${scoreLabel}. Ton mode de vie quotidien : ${assis === '8h+' ? '+8h assis' : assis === '6-8h' ? '6-8h assis' : '< 6h assis'}, ${ecrans === '6h+' ? '+6h d\'ecrans' : ecrans === '4-6h' ? '4-6h d\'ecrans' : '< 4h d\'ecrans'}, ${soleil === 'rare' ? 'peu de soleil' : 'exposition solaire correcte'}, cree l'environnement dans lequel ton corps evolue 24h/24.</p>

<p>${assis === '8h+' || assis === '6-8h' ? 'Ta sedentarite prolongee (>6h/jour assis) est un facteur de risque independant, meme si tu fais du sport. La position assise comprime tes disques vertebraux, desactive tes fessiers et ischio-jambiers, et reduit drastiquement ta NEAT (thermogenese d\'activite non-exercice). La NEAT peut representer 15-30% de ta depense energetique totale : la perdre ralentit significativement ta perte de gras.' : 'Ton temps assis limite preserve ta NEAT et ta sante posturale.'}</p>

<p>${soleil === 'rare' ? 'Ton manque d\'exposition solaire a des consequences multiples. La lumiere du matin (10-30 min dans les 2h apres le reveil) est essentielle pour caler ton rythme circadien, supprimer le cortisol matinal excessif, et initier le timer de melatonine pour le soir. Sans ce signal lumineux, tes rythmes hormonaux derivent. De plus, la synthese de vitamine D cutanee est compromise, impactant ton immunite, tes hormones, et ta sante osseuse.' : 'Ton exposition solaire reguliere optimise ton rythme circadien et ta synthese de vitamine D.'}</p>

<p>${cafe === '5+' ? 'Ta consommation excessive de cafe (5+/jour) cree une tolerance a l\'adenosine qui t\'oblige a augmenter les doses pour le meme effet. Le cafe apres 14h bloque ta melatonine le soir, fragmentant ton sommeil. L\'exces de cafeine peut aussi epuiser tes surrenales et amplifier ton anxiete.' : cafe === '3-4' ? 'Ta consommation de cafe moderee est acceptable si tu stoppes avant 14h pour preserver ton sommeil.' : 'Ta consommation de cafe limitee preserve ta sensibilite a la cafeine et ton sommeil.'} ${tabac === 'quotidien' ? 'Le tabac quotidien est le facteur lifestyle le plus deletere : inflammation systemique, vasoconstriction reduisant l\'apport d\'oxygene aux muscles, acceleration du vieillissement cellulaire, et interference avec pratiquement tous tes systemes hormonaux.' : ''}</p>

<p><strong>Impact sur ${objectif} :</strong> ${score < 60 ? 'Ton mode de vie actuel cree un environnement anti-physiologique : rythmes circadiens perturbes, NEAT effondree, inflammation chronique. Ces facteurs invisibles sabotent tes efforts conscients en entrainement et nutrition.' : 'Ton lifestyle est globalement sain. Des ajustements sur l\'exposition lumineuse et le mouvement quotidien pourraient encore optimiser ton metabolisme.'}</p>`;
    }

    case 'mindset': {
      const engagement = responses['engagement-niveau'];
      const frustration = responses['frustration-passee'];
      const siRienChange = responses['si-rien-change'];
      const ideal6mois = responses['ideal-6mois'];
      const peur = responses['plus-grosse-peur'];
      const motivationPrincipale = responses['motivation-principale'];
      const consignes = responses['consignes-strictes'];

      return `
<p class="mt-6"><strong>Analyse de ton mindset</strong></p>

<p>${prenom}, ton score mindset de ${score}/100 est ${scoreLabel}. Ton niveau d'engagement "${engagement}" et ta motivation basee sur "${motivationPrincipale || 'tes objectifs personnels'}" revelent ta psychologie face a la transformation physique.</p>

<p>Le mindset n'est pas qu'une question de volonte. Les neurotransmetteurs (dopamine, serotonine, noradrenaline) qui gouvernent ta motivation, ta perseverance et ta gestion du stress sont directement influences par ton sommeil, ta nutrition, et ton activite physique. ${engagement === '8-10' ? 'Ton engagement eleve indique un systeme dopaminergique fonctionnel et une capacite a maintenir des objectifs long terme. C\'est un atout majeur.' : engagement === '4-7' ? 'Ton engagement modere peut refleter une fatigue des systemes de motivation, souvent liee a un exces de stress chronique ou un deficit en precurseurs de neurotransmetteurs (tyrosine, tryptophane).' : 'Ton engagement bas peut indiquer un epuisement dopaminergique, souvent lie a une surexposition aux stimuli rapides (reseaux sociaux, sucre, divertissement constant) qui desensibilisent tes circuits de recompense.'}</p>

<p>${frustration ? `Ta frustration passee ("${frustration.substring(0, 100)}...") est un signal important. Les echecs repetes peuvent creer des patterns d\'evitement ou de self-sabotage inconscients. Mais ils revelent aussi que les approches precedentes n\'adressaient probablement pas les vrais facteurs limitants.` : 'L\'analyse de tes experiences passees permet d\'eviter de repeter les memes erreurs et d\'identifier les patterns qui ont fonctionne ou non.'}</p>

<p>${consignes === 'oui' ? 'Ta capacite a suivre des consignes strictes est un atout majeur pour la transformation. L\'adherence est le facteur numero un de succes : un protocole mediocre suivi a 100% bat un protocole parfait suivi a 50%.' : 'Ta difficulte avec les consignes strictes n\'est pas un defaut : elle indique qu\'une approche flexible et adaptee a ton style de vie sera plus efficace qu\'un plan rigide que tu ne tiendras pas.'}</p>

<p><strong>Impact sur ${objectif} :</strong> ${score >= 80 ? 'Ton mindset est ton plus grand atout. Le probleme n\'est pas ton engagement mais les blocages physiologiques (sommeil, stress, hormones) qui empechent ton corps de repondre a tes efforts. Une fois ces facteurs corriges, ta determination fera la difference.' : 'Optimiser tes neurotransmetteurs via le sommeil, la nutrition, et l\'activite physique améliorera naturellement ta motivation et ta perseverance. Le mindset suit souvent l\'etat physiologique.'}</p>`;
    }

    default:
      return '';
  }
}

// ============================================
// LEGACY: EXPORT HTML REPORT (kept for standalone export)
// ============================================

export function generateDiscoveryHTML(result: DiscoveryAnalysisResult, responses: DiscoveryResponses): string {
  const prenom = getDiscoveryFirstName(responses);
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
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fr" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discovery Scan - ${prenom} | APEXLABS</title>
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
