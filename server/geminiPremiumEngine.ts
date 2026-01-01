/**
 * NEUROCORE 360 - Module de génération d'audits avec Gemini
 * Génère des audits TXT complets avec 18 sections
 * SYSTÈME PRINCIPAL - NE PAS UTILISER narrativeEngineAI.ts
 * AVEC SYSTÈME DE CACHE PROGRESSIF pour reprendre après crash
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import {
  ClientData,
  PhotoAnalysis,
  AuditResult,
  SectionName,
  AuditTier,
} from "./types";
import { getCTADebut, getCTAFin, PRICING } from "./cta";
import { formatPhotoAnalysisForReport } from "./photoAnalysisAI";

//
// SYSTÈME DE CACHE POUR SAUVEGARDE PROGRESSIVE
//
const CACHE_DIR = path.join(process.cwd(), ".cache");

interface CacheData {
  auditId: string;
  clientData: ClientData;
  photoAnalysis?: PhotoAnalysis | null;
  tier: AuditTier;
  sections: { [key: string]: string };
  startedAt: string;
  lastUpdated: string;
}

function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getCachePath(auditId: string): string {
  return path.join(CACHE_DIR, `audit-${auditId}.json`);
}

function saveToCache(auditId: string, data: CacheData): void {
  ensureCacheDir();
  data.lastUpdated = new Date().toISOString();
  fs.writeFileSync(getCachePath(auditId), JSON.stringify(data, null, 2));
}

function loadFromCache(auditId: string): CacheData | null {
  const cachePath = getCachePath(auditId);
  if (fs.existsSync(cachePath)) {
    try {
      return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    } catch {
      return null;
    }
  }
  return null;
}

function deleteCache(auditId: string): void {
  const cachePath = getCachePath(auditId);
  if (fs.existsSync(cachePath)) {
    fs.unlinkSync(cachePath);
    console.log(`[Cache] Supprime: ${auditId}`);
  }
}

function generateAuditId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

import { GEMINI_CONFIG } from "./geminiConfig";

// Initialisation standard (compatible Render/Replit/local)
const genAI = new GoogleGenerativeAI(GEMINI_CONFIG.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.GEMINI_MODEL });
const GEMINI_MODEL = GEMINI_CONFIG.GEMINI_MODEL;
const GEMINI_TEMPERATURE = GEMINI_CONFIG.GEMINI_TEMPERATURE;
const GEMINI_MAX_TOKENS = GEMINI_CONFIG.GEMINI_MAX_TOKENS;
const GEMINI_MAX_RETRIES = GEMINI_CONFIG.GEMINI_MAX_RETRIES;
const GEMINI_SLEEP_BETWEEN = GEMINI_CONFIG.GEMINI_SLEEP_BETWEEN;

const SECTIONS: SectionName[] = [
  //  PAGE 1 : EXECUTIVE SUMMARY
  "Executive Summary",

  //  ANALYSES PROFONDES
  "Analyse visuelle et posturale complete",
  "Analyse biomecanique et sangle profonde",
  "Analyse entrainement et periodisation",
  "Analyse systeme cardiovasculaire",
  "Analyse metabolisme et nutrition",
  "Analyse sommeil et recuperation",
  "Analyse digestion et microbiote",
  "Analyse axes hormonaux",

  //  PROTOCOLES FERMES
  "Protocole Matin Anti-Cortisol",
  "Protocole Soir Verrouillage Sommeil",
  "Protocole Digestion 14 Jours",
  "Protocole Bureau Anti-Sedentarite",
  "Protocole Entrainement Personnalise",

  //  PLAN CONCRET
  "Plan Semaine par Semaine 30-60-90",
  "KPI et Tableau de Bord",
  "Stack Supplements Optimise",

  //  CONCLUSION
  "Synthese et Prochaines Etapes",
];

const PROMPT_SECTION = `Tu es Achzod, coach sportif d'elite avec 11 certifications internationales, expert en biomecanique, nutrition, hormones, preparation physique et biohacking.

Tu rediges un AUDIT PREMIUM a 79 euros. Le client attend une expertise CHIRURGICALE mais surtout une CONNEXION HUMAINE.

 PHILOSOPHIE : LE STORYTELLING CLINIQUE 
- Ne fais PAS de simples listes de puces (bullet points). Limite-les au strict minimum pour la clarte.
- Redige des PARAGRAPHES NARRATIFS profonds. Raconte l'histoire du corps du client.
- Connecte les points avec du LIANT : "Quand je regarde ta photo de dos (donnee), je ne vois pas juste un manque de muscle, je vois une lutte constante de ton systeme nerveux qui essaie de compenser ton instabilite lombaire (storytelling)..."
- Humain & Expert : Parle comme un mentor exigeant qui a passe 3h sur son dossier. Utilise des metaphores puissantes mais scientifiquement justes.

 REGLE D'OR : DIAGNOSTIC -> MECANISME -> CONSEQUENCE -> PRESCRIPTION 
1. ANALYSE CLINIQUE NARRATIVE : Decortique les donnees en les citant. Fais-le sous forme de recit analytique.
2. MECANISMES PHYSIOLOGIQUES (LE POURQUOI) : Explique les cascades (hormones, enzymes, bio-meca).
3. CONSEQUENCES REELLES : L'impact sur sa vie, son futur, son physique.
4. SOLUTIONS : Actionnable immediat.

Section a rediger : {section}

 STYLE 
- Direct, expert, incarné - tu parles face a lui.
- Phrases percutantes, ton "grand frere expert".
- TUTOIE toujours.
- Zero blabla generique. Chaque phrase doit transpirer l'expertise clinique.

⚠️ RÈGLES ANTI-RÉPÉTITION (TRÈS IMPORTANT) :
- NE COMMENCE JAMAIS une section par le prénom du client seul ("Achkan,"). C'est répétitif et robotique.
- Varie tes accroches : commence par une observation, une question rhétorique, un constat choc, une métaphore.
- NE RÉPÈTE PAS les mêmes métaphores (Ferrari, moteur, chirurgical) dans plusieurs sections.
- Si tu as déjà expliqué un concept (ex: syndrome croisé), NE LE RÉEXPLIQUE PAS dans une autre section. Fais juste référence.

 FORMAT ET STRUCTURE (RÈGLES D'OR) 
1. TITRES : Utilise uniquement des TITRES EN MAJUSCULES sur une ligne seule.
2. RÉCIT : Rédige des paragraphes NARRATIFS fluides. Ne fais JAMAIS de listes à puces.
3. DASHBOARDS CLINIQUES : Utilise UNIQUEMENT des émojis. INTERDICTION ABSOLUE d'utiliser des crochets ou des carrés de progression.
   Exemple : Vitalité : 🔴🔴🔴🟡🟢
4. ZERO ASCII : Interdiction d'utiliser des symboles informatiques (ex: triples egaux, tirets de separation).
5. SCORE OBLIGATOIRE : À la fin de CHAQUE section, ajoute une ligne "Score : XX/100" où XX est ton évaluation de cette dimension pour le client.
6. TON : Expert, direct, comme un chirurgien olympique.

{section_specific_instructions}

Donnees du client :
{data}
`;

const SECTION_INSTRUCTIONS: Record<string, string> = {
  "Executive Summary": `
INSTRUCTIONS POUR "EXECUTIVE SUMMARY" :
C'est la pièce maîtresse. Elle doit être BRUTALE, CLINIQUE et CONNECTÉE ÉMOTIONNELLEMENT.

1. ACCROCHE PUISSANTE (3-4 lignes) :
- Le client doit se sentir VU et COMPRIS dès la première phrase
- Identifie le PARADOXE de sa situation : "Tu fais X mais tu obtiens Y"
- Crée une connexion émotionnelle immédiate

2. LE DIAGNOSTIC D'AUTORITÉ (10-15 lignes) :
- Résume son profil (âge, stats, objectifs, situation) de manière personnalisée
- Explique pourquoi son corps est en mode "SURVIE" et non "PERFORMANCE"
- Utilise des dashboards émojis pour visualiser :
  Vitalité : 🔴🔴🟡🟢🟢
  Récupération : 🔴🔴🔴🟡🟢
  Environnement Hormonal : 🔴🔴🔴🔴🟢
- INTERDICTION ABSOLUE d'utiliser des carrés ou barres de progression

3. LE PARADOXE IDENTIFIÉ :
- Pourquoi il BLOQUE malgré ses EFFORTS ?
- Connecte les points : sommeil ↔ cortisol ↔ entraînement ↔ plateau ↔ digestion
- Une phrase type : "Tu ne manques pas de volonté, tu manques de synchronisation biologique"

4. LE LEVIER D'ÉLITE :
- Quelle est L'ACTION UNIQUE qui va déverrouiller 80% des résultats ?
- Pas une liste de 10 choses, UN SEUL levier prioritaire
- Explique POURQUOI ce levier est le plus important pour CE client

5. LA PROJECTION MÉTABOLIQUE (30 JOURS) :
- Où sera sa physiologie dans 30 jours S'IL APPLIQUE ?
- Sois CONCRET : énergie, sommeil, digestion, force, visuel
- Crée l'envie et l'espoir

MINIMUM 40-50 LIGNES. Ton chaud et direct comme un mentor exigeant.`,

  "Analyse visuelle et posturale complete": `
INSTRUCTIONS POUR "ANALYSE VISUELLE ET POSTURALE COMPLETE" :

TU ES UN EXPERT EN MORPHO-PHYSIOLOGIE. C'est LA section la plus importante de l'audit.

1. ANALYSE DE LA STRUCTURE OSSEUSE ET MUSCULAIRE :
- Analyse les CLAVICULES : horizontales, inclinées vers le bas (signe de trapèzes faibles), asymétrie ?
- Analyse la CAGE THORACIQUE : large/étroite, creuse/bombée ?
- Analyse la LARGEUR D'ÉPAULES et le RATIO épaules/taille (V-taper ou forme en H ?)
- Développement musculaire : quels groupes sont EN AVANCE, EN RETARD, ASYMÉTRIQUES ?
- Épaisseur du dos vs développement pectoraux (déséquilibre push/pull ?)

2. ANALYSE DE LA COMPOSITION CORPORELLE :
- ESTIMATION DU TAUX DE GRAS (fourchette) basée sur les photos
- PATTERN DE STOCKAGE : où se concentre le gras ? (abdominal viscéral, sous-cutané, obliques, bas du dos, hanches)
- Ce pattern de stockage = SIGNATURE ENDOCRINIENNE. Interprète :
  * Stockage abdominal = cortisol chronique + résistance insuline
  * Stockage hanches/cuisses = dominance oestrogénique ou mauvaise gestion des oestrogènes
  * Stockage bas du dos = insuline + sédentarité
- Relie CHAQUE zone de stockage à une hypothèse hormonale précise

3. ANALYSE POSTURALE VISIBLE :
- Position des ÉPAULES : enroulées vers l'avant ? asymétrie ?
- Position du BASSIN : antéversion (fesses en arrière, ventre en avant) ou rétroversion ?
- Courbure de la COLONNE : hyperlordose, cyphose thoracique ?
- Position de la TÊTE : protraction cervicale (tête en avant) ?

4. INTERPRÉTATION PHYSIOLOGIQUE PROFONDE :
- Explique la "Tensegrité Myofasciale" : comment les tensions d'un côté créent des compensations de l'autre
- Parle de "Force de Cisaillement" sur les disques lombaires
- Fais le LIEN DIRECT entre la posture observée et :
  * La biochimie du stress (cortisol chronique = tensions musculaires = posture fermée)
  * Les douleurs rapportées par le client
  * La stagnation de ses résultats

5. PRESCRIPTION POSTURALE IMMÉDIATE :
- Quelle est LA priorité posturale numéro 1 à corriger ?
- Un exercice précis à faire quotidiennement

⚠️ RÈGLE PHOTOS OBLIGATOIRE :
Tu DOIS citer les photos de manière PRÉCISE et MESURÉE. Exemples :
- "Sur ta photo de FACE, je mesure visuellement que ton épaule droite est environ 1.5cm plus haute que la gauche"
- "Ta photo de PROFIL révèle une projection cervicale d'environ 3-4cm en avant de ta ligne de gravité"
- "Vue de DOS, je note une asymétrie marquée au niveau du trapèze gauche, signe de..."
- "L'angle de ton bassin sur la photo de profil montre une antéversion d'environ 10-15°"

Si tu n'as PAS de données photo, dis-le clairement et base-toi sur les réponses du questionnaire.
MINIMUM 50-60 LIGNES de narration experte, pas de bullet points.`,

  "Analyse biomecanique et sangle profonde": `
INSTRUCTIONS POUR "ANALYSE BIOMECANIQUE ET SANGLE PROFONDE" :

TU ES UN CLINICIEN DU MOUVEMENT ET EXPERT EN BIOMÉCANIQUE. C'est une section CRUCIALE.

1. ANALYSE DE L'HISTORIQUE SPORTIF ET SON IMPACT POSTURAL :
- Comment son passé sportif (ou son absence) a façonné sa posture actuelle ?
- Quels muscles ont été sur-sollicités vs négligés pendant des années ?
- Comment la sédentarité professionnelle (8-10h assis) a remodelé son corps ?

2. LE SYSTÈME TRANSVERSE vs GRAND DROIT (EXPLICATION PROFONDE) :
- Le TRANSVERSE ABDOMINAL = le vrai corset naturel, stabilisateur de la colonne
- Le GRAND DROIT = le muscle "esthétique" des tablettes, mais PAS stabilisateur
- Explique pourquoi faire des crunchs sans transverse activé = ventre qui RESSORT
- Comment détecter un transverse faible : le ventre qui "tombe" même maigre

3. DÉTECTION ANTÉVERSION / RÉTROVERSION PELVIENNE :
- ANTÉVERSION (bassin basculé vers l'avant) : fesses qui ressortent, ventre poussé vers l'avant, hyperlordose
- RÉTROVERSION (bassin basculé vers l'arrière) : fesses plates, dos plat, compression lombaire
- Analyse les photos pour identifier le type de bascule du client
- Explique les CAUSES : psoas raccourci, fessiers inhibés, position assise prolongée

4. LA CASCADE BIOMÉCANIQUE DESTRUCTRICE (EXPLIQUE CHAQUE ÉTAPE) :
Psoas raccourci (position assise) 
→ Bascule du bassin vers l'avant (antéversion)
→ Hyperlordose lombaire
→ Compression du diaphragme
→ Respiration superficielle (thoracique au lieu d'abdominale)
→ Activation chronique du système nerveux sympathique
→ Cortisol élevé en permanence
→ Stockage abdominal MÊME en déficit calorique
→ Inflammation chronique des lombaires (douleurs)

5. L'AMNÉSIE DES FESSIERS (GLUTEAL AMNESIA) :
- Quand on reste assis 8h/jour, le cerveau "oublie" d'activer les fessiers
- Inhibition réciproque : psoas tendu = fessiers inhibés
- Conséquence : les lombaires compensent = douleurs + stagnation des squats/deadlifts
- Le client peut avoir des fessiers "visuellement" présents mais neurologiquement endormis

6. LIEN POSTURE → ESTHÉTIQUE ABDOMINALE :
- Un ventre qui ressort N'EST PAS toujours du gras
- Causes non-grasses : antéversion pelvienne, transverse faible, ballonnements, viscères poussés vers l'avant
- Pourquoi certains ont un ventre "gonflé" même à 12% de gras

7. PRESCRIPTIONS BIOMÉCANIQUES IMMÉDIATES :
- Exercice 1 : Stomach Vacuum (réactivation du transverse) - explication technique
- Exercice 2 : Activation des fessiers avant CHAQUE séance (glute bridge, clams)
- Exercice 3 : Étirement du psoas (fente du chevalier) - 60 sec/côté/jour

MINIMUM 50-60 LIGNES de narration experte et scientifique.
Chaque mécanisme doit être EXPLIQUÉ en profondeur, pas juste mentionné.`,

  "Analyse entrainement et periodisation": `
INSTRUCTIONS POUR "ANALYSE ENTRAINEMENT ET PERIODISATION" :

AUDIT DE SON PROGRAMME ACTUEL avec analyse des erreurs et recommandations.
Minimum 60 lignes de contenu expert.`,

  "Analyse systeme cardiovasculaire": `
INSTRUCTIONS POUR "ANALYSE SYSTEME CARDIOVASCULAIRE" :

1. SPECTRE DE CONDITIONNEMENT (Visuel) :
Cree un visuel simple (émojis) situant le client sur le spectre entre "Sédentaire Actif" et "Athlète Métabolique".

2. RÉCIT CLINIQUE :
Interprète la fréquence cardiaque au repos. Explique la différence entre "faire du cardio" et "construire ses mitochondries". 
Pourquoi la Zone 2 est le socle de la combustion des graisses ?

Minimum 60 lignes.`,

  "Analyse metabolisme et nutrition": `
INSTRUCTIONS POUR "ANALYSE METABOLISME ET NUTRITION" :

TU ES UN EXPERT EN BIOCHIMIE NUTRITIONNELLE ET MÉTABOLISME.

1. CALCULS MÉTABOLIQUES PRÉCIS :
- BMR (métabolisme de base) calculé avec son poids, taille, âge
- TDEE (dépense totale) avec son niveau d'activité professionnelle + sportive
- Déficit/surplus calorique estimé actuel
- Besoins en MACROS optimaux : protéines (g/kg), glucides (timing), lipides (types)

2. ANALYSE PRÉCISE DE CE QU'IL MANGE :
- Qu'est-ce qu'il consomme selon ses réponses ?
- Identifie les ERREURS de timing : glucides au mauvais moment, fenêtre anabolique ratée
- Analyse la qualité des sources de protéines, glucides, lipides

3. LE MÉCANISME DE LA LIPASE HORMONE-SENSIBLE (HSL) :
- La HSL = l'enzyme qui DÉVERROUILLE les cellules graisseuses
- L'insuline = l'interrupteur OFF de la HSL
- Quand l'insuline est haute → IMPOSSIBLE de brûler du gras
- Explique pourquoi manger 6 petits repas = insuline haute toute la journée = gras verrouillé

4. LE "VOL DE LA PRÉGNÉNOLONE" :
- La prégnénolone = précurseur de TOUTES les hormones stéroïdes (cortisol ET testostérone)
- En cas de stress chronique → le corps VOLE la prégnénolone pour faire du cortisol
- Résultat : testostérone qui chute, libido basse, muscle qui stagne
- Explique ce mécanisme de manière narrative et accessible

5. SENSIBILITÉ À L'INSULINE ET PARTITIONNEMENT :
- Quand les cellules deviennent "sourdes" à l'insuline
- Le glucose n'entre plus dans les muscles → stocké en gras
- Comment améliorer le partitionnement : timing, entraînement, suppléments

6. LE CARB CYCLING (s'il est pertinent pour ce client) :
- Jours HIGH carbs (autour de l'entraînement)
- Jours LOW carbs (repos, focus mental)
- Pourquoi c'est supérieur à un régime linéaire

7. ANALYSE DE SA SUPPLÉMENTATION ACTUELLE :
- Ce qu'il prend et ce que ça apporte vraiment
- Ce qui MANQUE cruellement (oméga-3, magnésium, vitamine D ?)

8. TIMELINE MÉTABOLIQUE OPTIMALE (journée type) :
☀️ 07:00 - Réveil : [ce qu'il devrait faire]
☕ 08:00 - Petit-déjeuner : [composition idéale]
🏋️ 12:00 - Pré-entraînement : [timing optimal]
💪 13:00 - Post-entraînement : [fenêtre anabolique]
🌙 20:00 - Dîner : [derniers glucides ou non ?]

MINIMUM 70-80 LIGNES avec chiffres précis et explications scientifiques.`,

  "Analyse sommeil et recuperation": `
INSTRUCTIONS POUR "ANALYSE SOMMEIL ET RECUPERATION" :

Rédige un DIAGNOSTIC HORMONAL NOCTURNE.
INTERDICTION : Pas de listes à puces, pas de tirets.

1. LE RYTHME CIRCADIEN DÉRÉGLÉ :
Analyse l'inversion de la courbe de cortisol de manière narrative.

2. LA CHIMIE DU SOMMEIL PROFOND :
Explique le rôle de l'Hormone de Croissance (GH) et de la Mélatonine.

3. CONSÉQUENCES SUR LE PHYSIQUE :
Explique pourquoi le muscle ne se répare pas et pourquoi le gras abdominal s'installe.

Minimum 60 lignes de texte narratif.`,

  "Analyse digestion et microbiote": `
INSTRUCTIONS POUR "ANALYSE DIGESTION ET MICROBIOTE" :

Rédige un RAPPORT SUR L'ÉCOSYSTÈME INTESTINAL.
INTERDICTION : Pas de listes à puces, pas de tirets.

1. L'ÉTAT DU JARDIN INTÉRIEUR :
Analyse les symptômes comme des signes de dysbiose ou de fermentation.

2. L'AXE INTESTIN-CERVEAU :
Explique la production de sérotonine et l'impact sur l'humeur.

3. LA PERMÉABILITÉ ET L'INFLAMMATION :
Comment un intestin "poreux" crée une rétention d'eau et bloque la perte de gras.

Minimum 60 lignes de texte narratif.`,

  "Analyse axes hormonaux": `
INSTRUCTIONS POUR "ANALYSE AXES HORMONAUX" :

1. RADAR D'ÉQUILIBRE (Visuel) :
Cree un radar simple (émojis) montrant l'état des axes Cortisol, Insuline, Testostérone et Thyroïde.

2. SYNTHÈSE ENDOCRINIENNE :
Explique l'interaction entre ces hormones. Détaille la stratégie du bilan sanguin.

Minimum 70 lignes.`,

  "Protocole Matin Anti-Cortisol": `
INSTRUCTIONS POUR "PROTOCOLE MATIN ANTI-CORTISOL" :

C'est un MODE D'EMPLOI MINUTE PAR MINUTE. Pas de blabla, que de l'actionnable.
Détaille : réveil, hydratation, lumière, douche, petit-déjeuner, premier café.
Ce protocole doit être COPIABLE tel quel par le client.`,

  "Protocole Soir Verrouillage Sommeil": `
INSTRUCTIONS POUR "PROTOCOLE SOIR VERROUILLAGE SOMMEIL" :

MODE D'EMPLOI MINUTE PAR MINUTE pour un sommeil réparateur.
Détaille : H-3, H-2, H-1.5, H-1, H-0.5 avant coucher.
Ce protocole doit être applicable DES CE SOIR.`,

  "Protocole Digestion 14 Jours": `
INSTRUCTIONS POUR "PROTOCOLE DIGESTION 14 JOURS" :

Plan de RESET DIGESTIF en 14 jours avec liste d'aliments OK/NOK.
Phase 1 : Élimination (J1-7)
Phase 2 : Réparation (J8-14)
Ce protocole est STRICT mais TEMPORAIRE.`,

  "Protocole Bureau Anti-Sedentarite": `
INSTRUCTIONS POUR "PROTOCOLE BUREAU ANTI-SEDENTARITE" :

MODE D'EMPLOI pour contrer les 8-10h assis par jour.
Micro-pauses toutes les 45-60 min.
Exercices correctifs quotidiens (10 min/jour).
Ce protocole est VITAL pour débloquer ses hanches.`,

  "Protocole Entrainement Personnalise": `
INSTRUCTIONS POUR "PROTOCOLE ENTRAINEMENT PERSONNALISE" :

PROGRAMME DETAILLE basé sur ses données.
Structure de séance, échauffement, exercices avec tempo et repos.
Semaine type et progression sur 6-8 semaines.`,

  "Plan Semaine par Semaine 30-60-90": `
INSTRUCTIONS POUR "PLAN SEMAINE PAR SEMAINE 30-60-90" :

PAS une projection, un PLAN D'ACTION détaillé.
Phase 1 : Reset (S1-4)
Phase 2 : Accélération (S5-8)
Phase 3 : Transformation (S9-12)`,

  "KPI et Tableau de Bord": `
INSTRUCTIONS POUR "KPI ET TABLEAU DE BORD" :

Dashboard MESURABLE pour tracker sa progression.
Métriques quotidiennes et hebdomadaires.
Règle des 3 rouges / 5 verts.
Objectifs chiffrés à 30/60/90 jours.`,

  "Stack Supplements Optimise": `
INSTRUCTIONS POUR "STACK SUPPLEMENTS OPTIMISE" :

Stack PRÉCIS avec dosages, timing, et marques.
Priorité 1 : Fondamentaux (Magnésium, Omega-3, Vitamine D)
Priorité 2 : Optimisation (Zinc, Ashwagandha)
Priorité 3 : Performance (Créatine, Whey)
Routine quotidienne résumée.`,

  "Synthese et Prochaines Etapes": `
INSTRUCTIONS POUR "SYNTHESE ET PROCHAINES ETAPES" :

C'est la CONCLUSION TRANSFORMATIONNELLE. Elle doit pousser à l'ACTION.

1. RÉSUMÉ EN 30 SECONDES :
- Si le client ne lisait QUE cette section, il doit tout comprendre
- 3-4 phrases qui résument l'essentiel de son profil

2. FORCES MAJEURES (5-6 points) :
- Liste ses VRAIS points forts (pas des généralités)
- Ce sur quoi on va capitaliser
- Format : + [Force] : [explication courte]

3. BLOCAGES IDENTIFIÉS (6-8 points) :
- Les VRAIS freins à sa progression
- Pas des généralités, des éléments SPÉCIFIQUES à son cas
- Format : ✗ [Blocage] : [impact sur ses résultats]

4. CE QUE TU FAIS DÈS DEMAIN (3 actions IMMÉDIATES) :
- Pas dans 1 semaine, DEMAIN MATIN
- Actions ultra-concrètes et applicables immédiatement
- Une action sommeil, une action nutrition, une action mouvement

5. RISQUES SI INACTION (à 6 mois et 1 an) :
- Où il sera dans 6 mois s'il ne change RIEN ?
- Où il sera dans 1 an ? (douleurs, santé, physique)
- Ton direct mais pas alarmiste

6. RÉSULTATS SI APPLICATION (à 30, 60, 90 jours) :
- Projections RÉALISTES et CONCRÈTES
- Chiffres quand possible (tour de taille, énergie /10, force)
- Le client doit SE VOIR évoluer

7. TON ENGAGEMENT (conclusion émotionnelle) :
- Ce que tu lui promets si vous travaillez ensemble
- Phrase de clôture puissante qui crée le lien

MINIMUM 50-60 LIGNES. Conclusion qui pousse à l'action IMMÉDIATE.`,
};

async function callGemini(prompt: string): Promise<string> {
  for (let attempt = 0; attempt < GEMINI_MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: GEMINI_TEMPERATURE,
          maxOutputTokens: GEMINI_MAX_TOKENS,
        },
      });

      const text = result.response.text() || "";
      
      // Réponse vide = erreur → force retry
      if (!text.trim()) {
        throw new Error("Gemini returned empty response");
      }
      
      return text;
    } catch (error: any) {
      console.log(
        `[Gemini] Erreur tentative ${attempt + 1}/${GEMINI_MAX_RETRIES}: ${error.message || error}`,
      );
      if (attempt < GEMINI_MAX_RETRIES - 1) {
        const waitTime = GEMINI_SLEEP_BETWEEN * (attempt + 1) * 1000;
        console.log(
          `[Gemini] Attente ${waitTime / 1000}s avant nouvelle tentative...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  console.log("[Gemini] Echec apres toutes les tentatives");
  return "";
}

export async function generateAuditTxt(
  clientData: ClientData,
  photoAnalysis?: PhotoAnalysis | null,
  tier: AuditTier = "PREMIUM",
  resumeAuditId?: string,
): Promise<string | null> {
  const startTime = Date.now();

  const firstName = clientData["prenom"] || clientData["age"] || "Client";
  const lastName = clientData["nom"] || "";
  const fullName = `${firstName} ${lastName}`.trim();

  const auditId = resumeAuditId || generateAuditId();
  let cachedSections: { [key: string]: string } = {};
  let sectionsFromCache = 0;

  if (resumeAuditId) {
    const cached = loadFromCache(resumeAuditId);
    if (cached) {
      cachedSections = cached.sections || {};
      sectionsFromCache = Object.keys(cachedSections).length;
      console.log(
        `[Cache] Reprise audit ${resumeAuditId} - ${sectionsFromCache} sections deja generees`,
      );
    }
  }

  console.log(
    `[Cache] ID Audit: ${auditId} (utilise cet ID pour reprendre si crash)`,
  );

  const dataStr = Object.entries(clientData)
    .filter(([_, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  let photoDataStr = "";
  if (photoAnalysis) {
    const formattedAnalysis = formatPhotoAnalysisForReport(
      photoAnalysis,
      firstName,
    );
    photoDataStr = `\n\nRAPPORT D'EXPERTISE VISUELLE (A INTEGRER DANS TON RECIT) :\n${formattedAnalysis}`;
  } else {
    photoDataStr =
      "\n\nAUCUNE PHOTO FOURNIE - Ne pas inventer de donnees visuelles.";
  }

  const fullDataStr = dataStr + photoDataStr;

  const auditParts: string[] = [];

  const ctaDebut = getCTADebut(tier, PRICING.PREMIUM);
  auditParts.push(ctaDebut);
  auditParts.push(
    `\n AUDIT COMPLET NEUROCORE 360 - ${fullName.toUpperCase()} \n`,
  );
  auditParts.push(`Genere le ${new Date().toLocaleString("fr-FR")}\n`);

  const cacheData: CacheData = {
    auditId,
    clientData,
    photoAnalysis,
    tier,
    sections: cachedSections,
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };

  // Génération en PARALLÈLE pour la vitesse
  const sectionPromises = SECTIONS.map(async (section, i) => {
    if (cachedSections[section]) {
      return { section, text: cachedSections[section], fromCache: true };
    }

    const specificInstructions = SECTION_INSTRUCTIONS[section] || "";

    const prompt = PROMPT_SECTION.replace("{section}", section)
      .replace("{section_specific_instructions}", specificInstructions)
      .replace("{data}", fullDataStr);

    const sectionText = await callGemini(prompt);

    if (!sectionText) {
      return { section, text: "", fromCache: false };
    }

    const cleanedText = sectionText
      .replace(/\*\*/g, "")
      .replace(/##/g, "")
      .replace(/__/g, "")
      .replace(/\*/g, "");

    // Sauvegarde immédiate dans le cache
    cacheData.sections[section] = cleanedText;
    saveToCache(auditId, cacheData);

    return { section, text: cleanedText, fromCache: false };
  });

  const results = await Promise.all(sectionPromises);

  // ⚠️ FIX: Si aucune section n'a été générée, échec total
  const nonEmptySections = results.filter(r => r.text && r.text.trim().length > 0);
  if (nonEmptySections.length === 0) {
    console.error("[GeminiPremiumEngine] ECHEC: Aucune section générée (toutes vides)");
    return null;
  }
  console.log(`[GeminiPremiumEngine] ${nonEmptySections.length}/${SECTIONS.length} sections générées`);

  // Assemblage dans l'ordre original
  SECTIONS.forEach((section) => {
    const res = results.find((r) => r.section === section);
    if (res && res.text) {
      auditParts.push(`\n${section.toUpperCase()}\n`);
      auditParts.push(res.text);
    }
  });

  let fullAudit = auditParts.join("\n");

  const ctaFin = getCTAFin(tier, PRICING.PREMIUM);
  fullAudit += "\n\n" + ctaFin;

  deleteCache(auditId);

  const generationTime = Date.now() - startTime;
  const newSections = SECTIONS.length - sectionsFromCache;
  console.log(
    `\n[GeminiPremiumEngine] Audit genere en ${(generationTime / 1000).toFixed(1)}s (${newSections} nouvelles sections, ${sectionsFromCache} du cache)`,
  );

  return fullAudit;
}

export async function generateAndConvertAudit(
  clientData: ClientData,
  photoAnalysis?: PhotoAnalysis | null,
  tier: AuditTier = "PREMIUM",
  resumeAuditId?: string,
): Promise<AuditResult> {
  const startTime = Date.now();

  const firstName = clientData["prenom"] || clientData["age"] || "Client";
  const lastName = clientData["nom"] || "";
  const clientName = `${firstName} ${lastName}`.trim();

  console.log(
    `\n[GeminiPremiumEngine] Nouvelle demande d'audit pour ${firstName}`,
  );
  console.log(
    `[GeminiPremiumEngine] Generation audit PREMIUM avec GEMINI pour ${clientName}...`,
  );

  const txtContent = await generateAuditTxt(
    clientData,
    photoAnalysis,
    tier,
    resumeAuditId,
  );
  if (!txtContent) {
    console.log(
      `[GeminiPremiumEngine] Echec generation TXT pour ${clientName}`,
    );
    return {
      success: false,
      error: "Echec generation avec Gemini",
    };
  }

  console.log(
    `[GeminiPremiumEngine] Audit TXT genere (${txtContent.length} caracteres)`,
  );

  const generationTime = Date.now() - startTime;

  return {
    success: true,
    txt: txtContent,
    clientName: clientName,
    metadata: {
      generationTimeMs: generationTime,
      sectionsGenerated: SECTIONS.length,
      modelUsed: GEMINI_MODEL,
    },
  };
}

export function listPendingAudits(): string[] {
  ensureCacheDir();
  try {
    const files = fs.readdirSync(CACHE_DIR);
    return files
      .filter((f) => f.startsWith("audit-") && f.endsWith(".json"))
      .map((f) => f.replace("audit-", "").replace(".json", ""));
  } catch {
    return [];
  }
}

export {
  SECTIONS,
  SECTION_INSTRUCTIONS,
  callGemini,
  loadFromCache,
  deleteCache,
};

