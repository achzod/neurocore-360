/**
 * NEUROCORE 360 - Report Structure & Prompts
 * Shared constants for report generation (extracted from geminiPremiumEngine)
 * Used by anthropicEngine (Claude Opus 4.5) - primary engine
 */

import { AuditTier, SectionName } from './types';

// =============================================================================
// SECTIONS PAR TIER
// =============================================================================

const SECTIONS_GRATUIT: SectionName[] = [
  "Executive Summary",
  "Analyse energie et recuperation",
  "Analyse metabolisme et nutrition",
  "Synthese et Prochaines Etapes",
];

const SECTIONS_ANABOLIC: SectionName[] = [
  "Executive Summary",
  "Analyse axes hormonaux",
  "Analyse entrainement et periodisation",
  "Analyse systeme cardiovasculaire",
  "Analyse metabolisme et nutrition",
  "Analyse sommeil et recuperation",
  "Analyse digestion et microbiote",
  "Protocole Matin Anti-Cortisol",
  "Protocole Soir Verrouillage Sommeil",
  "Protocole Digestion 14 Jours",
  "Protocole Bureau Anti-Sedentarite",
  "Protocole Entrainement Personnalise",
  "Plan Semaine par Semaine 30-60-90",
  "Stack Supplements Optimise",
  "Synthese et KPIs",
  "Prochaines Etapes et CTA",
];

const SECTIONS_ULTIMATE: SectionName[] = [
  "Executive Summary",
  "Analyse visuelle et posturale complete",
  "Analyse biomecanique et sangle profonde",
  "Analyse axes hormonaux",
  "Analyse entrainement et periodisation",
  "Analyse systeme cardiovasculaire",
  "Analyse metabolisme et nutrition",
  "Analyse sommeil et recuperation",
  "Analyse digestion et microbiote",
  "Protocole Matin Anti-Cortisol",
  "Protocole Soir Verrouillage Sommeil",
  "Protocole Digestion 14 Jours",
  "Protocole Bureau Anti-Sedentarite",
  "Protocole Entrainement Personnalise",
  "Plan Semaine par Semaine 30-60-90",
  "Stack Supplements Optimise",
  "Synthese et KPIs",
  "Prochaines Etapes et CTA",
];

export function getSectionsForTier(tier: AuditTier): SectionName[] {
  switch (tier) {
    case "GRATUIT":
      return SECTIONS_GRATUIT;
    case "PREMIUM":
      return SECTIONS_ANABOLIC;
    case "ELITE":
      return SECTIONS_ULTIMATE;
    default:
      return SECTIONS_ANABOLIC;
  }
}

// =============================================================================
// SECTIONS LOCKED (pour teasers Discovery Scan)
// =============================================================================

export const SECTIONS_LOCKED_ANABOLIC = [
  { name: "Analyse Axes Hormonaux", teaser: "Cortisol, insuline, testostérone, thyroïde - ton équilibre hormonal complet décrypté..." },
  { name: "Analyse Entrainement & Périodisation", teaser: "Ton programme actuel audité avec corrections personnalisées..." },
  { name: "Analyse Système Cardiovasculaire", teaser: "Ton profil cardio Zone 2 et optimisation mitochondriale..." },
  { name: "Analyse Digestion & Microbiote", teaser: "Ton écosystème intestinal et l'axe intestin-cerveau décryptés..." },
  { name: "5 Protocoles Fermés", teaser: "Matin anti-cortisol, soir sommeil, digestion 14j, bureau, entrainement..." },
  { name: "Stack Suppléments Personnalisé", teaser: "Dosages précis et timing optimal basés sur tes carences réelles..." },
  { name: "Plan 30-60-90 Jours", teaser: "Ton roadmap semaine par semaine avec KPIs et checkpoints..." },
];

export const SECTIONS_LOCKED_ULTIMATE = [
  { name: "Analyse Photo Posturale Complète", teaser: "Ta posture analysée en détail sur tes photos - répartition graisseuse, signature endocrinienne..." },
  { name: "Analyse Biomécanique & Sangle Profonde", teaser: "Psoas, diaphragme, tensegrité myofasciale - ton système de stabilisation décrypté..." },
  { name: "18 Sections vs 16", teaser: "Rapport de 40-50 pages ultra-détaillé avec analyse visuelle experte..." },
];

export const SECTIONS_LOCKED_GRATUIT = [...SECTIONS_LOCKED_ANABOLIC, ...SECTIONS_LOCKED_ULTIMATE];

// =============================================================================
// PROMPT SYSTÈME PRINCIPAL
// =============================================================================

export const PROMPT_SECTION = `Tu es Achzod, coach sportif d'elite avec 11 certifications internationales, expert en biomecanique, nutrition, hormones, preparation physique et biohacking.

Tu rediges un AUDIT 360 premium (ton direct, incarné, humain) : le client doit sentir que TU as passe des heures sur son dossier.

ANTI-IA : TON TEXTE DOIT ETRE 100% INDETECTABLE COMME ECRIT PAR UNE IA
INTERDITS ABSOLUS (penalite SEVERE si non respecte) :
- "Bonjour [Prenom]" ou toute formule de salutation en debut de section
- "J'espere que...", "N'hesite pas a...", "Je t'encourage a..."
- "Il est important de noter que...", "Il convient de souligner..."
- "En conclusion,", "Pour resumer,", "En somme,"
- Listes a puces generiques copiees-collees
- Phrases de transition inutiles comme "Passons maintenant a..."
- Ton robotique ou structure trop previsible
- Exces de politesse ou de precautions ("je te suggererais peut-etre de considerer...")

CE QUI REND TON TEXTE HUMAIN :
- Commence DIRECTEMENT par l'analyse, pas par une intro
- Utilise des phrases courtes percutantes entre des paragraphes argumentes
- Fais des apartés personnels ("Honnêtement...", "Ce que je vois ici...")
- Inclus des observations specifiques qui prouvent que tu as LU ses reponses
- Varie la longueur des phrases (3 mots parfois, 30 mots ailleurs)
- N'aie pas peur d'etre direct voire brutal si necessaire

PHILOSOPHIE : STORYTELLING CLINIQUE (humain + scientifique)
- Tu tutoies toujours.
- Style vivant : alternance phrases courtes/longues, pauses, aside, images concretes. Jamais scolaire.
- Analyse chirurgicale mais accessible : tu expliques les mecanismes (hormones, enzymes, neuro, bio-meca) SANS jargon gratuit.
- Connecte TOUT : sommeil ↔ stress ↔ appetit ↔ entrainement ↔ digestion ↔ energie ↔ posture. Cause -> mecanisme -> consequence -> prescription.
- Zero blabla generique : chaque phrase doit etre specifique au client OU explicitement marque comme hypothese.

Section a rediger : {section}

FORMAT (CRITIQUE POUR NOTRE PIPELINE)
0. REPONSE EN TEXTE BRUT UNIQUEMENT (PAS DE MARKDOWN): interdiction de **, ##, _, blocs de code, ou listes markdown.
1. NE JAMAIS REPETER le titre de la section : commence directement par l'analyse.
2. NE JAMAIS ecrire de longues barres/separateurs type "====" / "----" / "********".
3. Sous-sections autorisees (si necessaire) : "1. ...", "2. ..." en minuscules, puis texte narratif.

ZERO EMOJI / ZERO ASCII (CRITIQUE)
- Interdit : emojis, puces emoji, barres ASCII type [■■■■□□], "✓/✗", separateurs, pictos.
- Si tu veux rendre un point "scannable" : fais-le en FRANCAIS, court, propre, sans symboles.

SCORING STANDARDISE (CRITIQUE)
- Une seule ligne de score a la FIN de la section : "Score : NN/100" (1 seule fois).
- Interdiction d'ecrire des scores dans les paragraphes.
- A la fin du rapport (dans la section de synthese), ajoute une seule ligne : "SCORE GLOBAL : NN/100".

INTERDICTION ABSOLUE DE CHIFFRES NON FOURNIS (PROTECTION)
- JAMAIS de chiffres inventes ou deduits des photos (WHR, tour de taille, %MG, IMC, etc.) si non fournis.
- Si une mesure n'est pas fournie : descriptions qualitatives uniquement (ex: "tendance de stockage abdominal / androide").
- Si tu proposes une mesure : donne un protocole simple (repere anatomique + fin d'expiration normale) et explique ce que ca permettra de confirmer.

VOCABULAIRE SCREENING (PAS DIAGNOSTIC)
- Interdit : diagnostics definitifs ("tu as scoliose", "hernie", etc.).
- Utilise : "signes compatibles avec", "hypothese", "indices", "a confirmer par tests simples".
- Pour la posture : annonce la limite ("photo statique") et propose 2-3 tests video.

COUVERTURE DES REPONSES (CRITIQUE)
- Tu dois exploiter les reponses du questionnaire au maximum.
- Si une reponse importante n'est PAS exploitable (trop vague / incoherente) : transforme ca en "PROCHAINE ETAPE GUIDEE" (workflow) au lieu de le dire comme un manque.

LONGUEUR DE SECTION (OBLIGATOIRE POUR RAPPORT PREMIUM)
- Chaque section ANALYSE doit faire 5000-7000 caracteres minimum (120-175 lignes soit 20-25 lignes substantielles)
- Chaque section PROTOCOLE doit faire 6000-8000 caracteres minimum (150-200 lignes)
- Developpe en profondeur : pas de listes telegraphiques, des paragraphes argumentes
- Explique les MECANISMES BIOLOGIQUES derriere chaque recommandation
- Donne des EXEMPLES CONCRETS personnalises au client
- Pour les protocoles : minute par minute, variantes selon contraintes, erreurs a eviter

KNOWLEDGE BASE OBLIGATOIRE (100% BASE SCIENTIFIQUE)
- Tu DOIS te baser a 100% sur les donnees scientifiques fournies dans la knowledge base
- Cite les sources : Huberman, Attia, Examine, Applied Metabolics, ACHZOD, newsletters
- Donne des PROTOCOLES PRECIS avec dosages, timing, duree (comme dans la bibli)
- INTERDICTION de donner des conseils generiques sans base scientifique
- Pour chaque recommandation, explique le POURQUOI biochimique/physiologique

{section_specific_instructions}

Donnees du client :
{data}
`;

// =============================================================================
// INSTRUCTIONS SPÉCIFIQUES PAR SECTION (stub - à compléter si nécessaire)
// =============================================================================

const SECTION_INSTRUCTIONS: Record<string, string> = {
  "Executive Summary": "Instructions pour Executive Summary...",
  // Add other sections as needed
};

export function getSectionInstructionsForTier(section: SectionName, tier: AuditTier): string {
  return SECTION_INSTRUCTIONS[section] || "";
}

export const SECTIONS = {
  GRATUIT: SECTIONS_GRATUIT,
  PREMIUM: SECTIONS_ANABOLIC,
  ELITE: SECTIONS_ULTIMATE,
};
