/**
 * NEUROCORE 360 - Module de génération d'audits avec Gemini
 * Génère des audits TXT complets avec 18 sections
 * SYSTÈME PRINCIPAL - NE PAS UTILISER narrativeEngineAI.ts
 * AVEC SYSTÈME DE CACHE PROGRESSIF pour reprendre après crash
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { ClientData, PhotoAnalysis, AuditResult, SectionName, AuditTier } from './types';
import { getCTADebut, getCTAFin, PRICING } from './cta';
import { formatPhotoAnalysisForReport } from './photoAnalysisAI';
import { calculateScoresFromResponses } from "./analysisEngine";
import { generateSupplementsSectionText } from "./supplementEngine";

// 
// SYSTÈME DE CACHE POUR SAUVEGARDE PROGRESSIVE
// 
const CACHE_DIR = path.join(process.cwd(), '.cache');

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
      return JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
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

import { GEMINI_CONFIG } from './geminiConfig';

// Initialisation standard
const genAI = new GoogleGenerativeAI(GEMINI_CONFIG.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: GEMINI_CONFIG.GEMINI_MODEL 
});

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
  "Synthese et Prochaines Etapes"
];

// Version GRATUITE : on donne un aperçu concret + CTA vers PREMIUM (pas de protocoles détaillés, pas de stack complète).
const SECTIONS_GRATUIT: SectionName[] = [
  "Executive Summary",
  "Analyse visuelle et posturale complete",
  "Analyse metabolisme et nutrition",
  "Synthese et Prochaines Etapes",
];

export function getSectionsForTier(tier: AuditTier): SectionName[] {
  if (tier === "GRATUIT") return SECTIONS_GRATUIT;
  return SECTIONS;
}

const PROMPT_SECTION = `Tu es Achzod, coach sportif d'elite avec 11 certifications internationales, expert en biomecanique, nutrition, hormones, preparation physique et biohacking.

Tu rediges un AUDIT 360 premium (ton direct, incarné, humain) : le client doit sentir que TU as passe des heures sur son dossier.

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

VISUELS (AUTORISES MAIS SOBRES)
- Autorise des mini-visuels lisibles (pas de separateurs) pour rendre le texte "vivant", uniquement si ca sert la comprehension :
  Metrique : [■■■■■■□□□□] (qualitatif) ou Metrique : 🟢🟢🟡🔴🔴
  ✓ point positif explicite
  ✗ point negatif explicite
  → action immediate
- Ne mets JAMAIS un visuel sur une seule ligne au milieu d'une phrase.
- Pas de "radar ASCII" enorme : si tu veux un radar, fais 6 lignes max, clair, compact.

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
- Si une reponse importante n'est PAS exploitable (trop vague / incoherente) : dis-le clairement en 1 phrase ("info a clarifier") au lieu de l'ignorer.

{section_specific_instructions}

Donnees du client :
{data}
`;

const SECTION_INSTRUCTIONS: Record<string, string> = {
  
  // 
  // EXECUTIVE SUMMARY - PAGE 1 (20 secondes pour scotcher)
  // 
  "Executive Summary": `
INSTRUCTIONS POUR "EXECUTIVE SUMMARY" :
C'est la pièce maîtresse. Elle doit être BRUTALE et CLINIQUE.

1. LE DIAGNOSTIC D'AUTORITÉ :
Explique en 3 paragraphes pourquoi le corps du client est en mode "Survie". Utilise uniquement des émojis pour les scores (ex: Vitalité : 🔴🔴🔴🟡🟢 3/5). INTERDICTION de faire des barres avec des carrés .

2. LE LEVIER D'ÉLITE :
Quelle est l'action unique qui va déverrouiller 80% des résultats ?

3. LA PROJECTION MÉTABOLIQUE :
Où sera sa physiologie dans 30 jours ?`,

  // 
  // ANALYSES PROFONDES (plus courtes mais ULTRA precises)
  // 
  "Analyse visuelle et posturale complete": `
INSTRUCTIONS POUR "ANALYSE VISUELLE ET POSTURALE COMPLETE" :

TU ES UN EXPERT EN MORPHO-PHYSIOLOGIE. Tu fais du SCREENING, pas un diagnostic médical.

1. MAPPING VISUEL OBLIGATOIRE :
Cite explicitement les photos fournies ("Sur ton cliché de face...", "L'angle de ton bassin sur la photo de profil..."). 
Même si tu déduis des choses, présente-les comme une analyse visuelle de tes photos STATIQUES.

2. RÉCIT CLINIQUE PROFOND :
Explique la répartition des graisses comme une signature endocrinienne. 
Parle de "Tensegrité Myofasciale" et de "Force de Cisaillement". 
Fais le lien entre la posture et la biochimie du stress.

3. INTERDICTION ABSOLUE CHIFFRES INVENTÉS :
JAMAIS de chiffres inventés pour le BF (body fat), WHR, tour de taille si non fournis.
Si non mesuré, utilise UNIQUEMENT descriptions qualitatives : "tendance de stockage abdominal", "distribution graisseuse de type androïde", "composition nécessitant optimisation".
Si tu suggères une mesure, précise : "Mesure tour de taille / hanches selon protocole standardisé (repères anatomiques, fin d'expiration normale) et je te calcule le ratio précis."

4. VOCABULAIRE SCREENING (PAS DIAGNOSTIC) :
INTERDICTION : "Tu as une scoliose", "instabilité", "hernie" (termes diagnostiques)
UTILISE : "signes compatibles avec", "hypothèse de", "indices de", "à confirmer par tests vidéo simples"
Pour la posture : "Sur photo statique, je vois des indices de... Pour confirmer, fais 2-3 tests vidéo : [tests précis]"

5. POSTURE : LIMITE LES AFFIRMATIONS SANS TESTS :
Sur photo, le trap, l'omoplate, le bassin peuvent être juste la pose, la lumière, un appui.
Annonce la limite ("analyse basée sur photos statiques") et propose 2-3 tests vidéo précis pour confirmer chaque hypothèse.

INTERDICTION : Pas de tirets, pas de schémas texte. Uniquement de la narration d'expert avec humilité scientifique.`,

  "Analyse biomecanique et sangle profonde": `
INSTRUCTIONS POUR "ANALYSE BIOMECANIQUE ET SANGLE PROFONDE" :

TU ES UN CLINICIEN DU MOUVEMENT. Rédige un RAPPORT D'EXPERTISE DE HAUT VOL.
1. DIAGNOSTIC DE TENSEGRITÉ :
Décris l'interaction entre le psoas, le diaphragme et la sangle profonde non pas comme des muscles, mais comme un système de haubans et de pressions.

2. MÉCANISMES DE DÉFAILLANCE :
Explique pourquoi le "bas du dos" est la victime collatérale d'une inhibition neurologique (amnésie des fessiers).

3. RÉÉDUCATION NEUROLOGIQUE :
Propose une intégration neurologique (Stomach Vacuum, activation ciblée) expliquée de manière scientifique.

INTERDICTION : Pas de listes, pas de tirets, pas de graphiques texte. Uniquement de la narration experte.`,

  "Analyse entrainement et periodisation": `
INSTRUCTIONS POUR "ANALYSE ENTRAINEMENT ET PERIODISATION" :

Tu fais un AUDIT de son programme actuel BASE UNIQUEMENT sur ses reponses (split, frequence, niveau, objectifs, contraintes).

OBJECTIF :
- Expliquer pourquoi son corps progresse OU pourquoi il stagne (mecanismes nerveux + metabolique + gestion de la fatigue).
- Identifier 2-3 erreurs probables (en les presentant comme hypotheses si l'info n'est pas explicite).
- Donner une direction de periodisation simple et actionnable (blocs), sans inventer de chiffres si non fournis.

REGLES :
- Si tu n'as pas la donnee exacte (volume, series, charges) : ne mets pas de "X". Parle en qualitatif ("volume probablement trop stable", "intensite percue").
- Pas de diagnostic definitif sur les blessures : "si douleur", "si gene", "a confirmer".
- Tu peux utiliser 3 lignes maximum en format ✓/✗/→ (pas de listes longues).

FIN OBLIGATOIRE :
- Termine par 1 paragraphe "ce que tu fais des demain" (1 seance type + 1 principe de progression).
`,

  "Analyse systeme cardiovasculaire": `
INSTRUCTIONS POUR "ANALYSE SYSTEME CARDIOVASCULAIRE" :

STRUCTURE :
- Titre principal unique : "ANALYSE SYSTEME CARDIOVASCULAIRE"
- Sous-section 1 : "1. Positionnement métabolique"
  Rédige un paragraphe narratif situant le client sur le spectre entre "Sédentaire Actif" et "Athlète Métabolique". 
  Utilise des phrases complètes, pas seulement des emojis. Explique pourquoi il est à cette position.

- Sous-section 2 : "2. Récit clinique cardiovasculaire"
  Interprète la fréquence cardiaque au repos avec des phrases complètes. 
  Explique la différence entre "faire du cardio" et "construire ses mitochondries" de manière narrative. 
  Explique pourquoi la Zone 2 est le socle de la combustion des graisses avec des exemples concrets.

Minimum 60 lignes de texte narratif.`,

  "Analyse metabolisme et nutrition": `
INSTRUCTIONS POUR "ANALYSE METABOLISME ET NUTRITION" :

TU ES UN EXPERT EN BIOCHIMIE NUTRITIONNELLE.

STRUCTURE :
- Titre principal unique : "ANALYSE METABOLISME ET NUTRITION"
- Sous-section 1 : "1. Timeline métabolique quotidienne"
  Rédige un récit narratif expliquant le cycle de l'insuline sur une journée type si on suit tes conseils.
  Utilise des phrases complètes : "Le matin, l'insuline reste basse car... En fin de journée, après l'entraînement, on crée un pic contrôlé car..."
  Pas de simples termes techniques isolés. Explique chaque phase avec des phrases complètes.

- Sous-section 2 : "2. Récit narratif métabolique"
  Analyse le TDEE et les apports avec des phrases complètes. 
  Explique le mécanisme de la Lipase Hormone-Sensible (HSL) de manière narrative et accessible.
  Parle du "Vol de la prégnénolone" de manière fluide et pédagogique.

INTERDICTION CHIFFRES NON FOURNIS :
- Si distribution graisseuse observée : utilise "tendance de stockage abdominal" ou "distribution de type androïde" (SANS chiffres WHR)
- Si tu veux parler risques cardio/diabète : utilise "la distribution abdominale est souvent corrélée à..." puis renvoie à mesures/analyses si besoin
- Si tu suggères mesures : "Mesure tour de taille / hanches selon protocole standardisé pour affiner l'analyse"

ÉVITE LES RÉPÉTITIONS : Ne répète pas les mêmes informations dans plusieurs sections. Chaque section apporte une valeur unique.

Minimum 80 lignes de texte narratif.`,

  "Analyse sommeil et recuperation": `
INSTRUCTIONS POUR "ANALYSE SOMMEIL ET RECUPERATION" :

Rédige un DIAGNOSTIC HORMONAL NOCTURNE.
INTERDICTION : Pas de listes à puces, pas de tirets.

1. LE RYTHME CIRCADIEN DÉRÉGLÉ :
Analyse l'inversion de la courbe de cortisol de manière narrative. Pourquoi le client est-il "fatigué le matin" et "branché le soir" ?

2. LA CHIMIE DU SOMMEIL PROFOND :
Explique le rôle de l'Hormone de Croissance (GH) et de la Mélatonine. Comment la lumière bleue pirate le cerveau ?

3. CONSÉQUENCES SUR LE PHYSIQUE :
Explique pourquoi le muscle ne se répare pas et pourquoi le gras abdominal s'installe.

Minimum 60 lignes de texte narratif.`,

  "Analyse digestion et microbiote": `
INSTRUCTIONS POUR "ANALYSE DIGESTION ET MICROBIOTE" :

Rédige un RAPPORT SUR L'ÉCOSYSTÈME INTESTINAL.
INTERDICTION : Pas de listes à puces, pas de tirets.

1. L'ÉTAT DU JARDIN INTÉRIEUR :
Analyse les symptômes (ballonnements, reflux) comme des signes de dysbiose ou de fermentation.

2. L'AXE INTESTIN-CERVEAU :
Explique la production de sérotonine et l'impact sur l'humeur et les fringales (leaky gut).

3. LA PERMÉABILITÉ ET L'INFLAMMATION :
Comment un intestin "poreux" crée une rétention d'eau et bloque la perte de gras.

Minimum 60 lignes de texte narratif.`,

  "Analyse axes hormonaux": `
INSTRUCTIONS POUR "ANALYSE AXES HORMONAUX" :

STRUCTURE :
- Titre principal unique : "ANALYSE AXES HORMONAUX"
- Sous-section 1 : "1. Équilibre hormonal global"
  Rédige un paragraphe narratif décrivant l'état des axes Cortisol, Insuline, Testostérone et Thyroïde.
  Utilise des phrases complètes, pas seulement des emojis. Explique l'état de chaque axe avec des phrases.

- Sous-section 2 : "2. Synthèse endocrinienne"
  Explique l'interaction entre ces hormones avec des phrases complètes. 
  Détaille la stratégie du bilan sanguin comme une enquête indispensable de manière narrative.

Minimum 70 lignes de texte narratif.`,

  // 
  // PROTOCOLES FERMES (mode d'emploi precis)
  // 
  "Protocole Matin Anti-Cortisol": `
INSTRUCTIONS POUR "PROTOCOLE MATIN ANTI-CORTISOL" :

C'est un MODE D'EMPLOI MINUTE PAR MINUTE. Pas de blabla, que de l'actionnable. INTERDICTION d'utiliser des barres de separation informatiques.

FORMAT OBLIGATOIRE :

PROTOCOLE MATIN ANTI-CORTISOL
Objectif : Resynchroniser ton pic de cortisol le MATIN (ou il doit etre)

REVEIL (T+0) :
- Pas de snooze (chaque snooze = confusion circadienne)
- Premiere action : [action precise]

T+0 a T+5 min :
- Hydratation : [quantite exacte, ex: "500ml eau + 1 pincee sel + 1/2 citron"]
- Mouvement : [action precise, ex: "10 squats air pour activer la circulation"]

T+5 a T+15 min :
- Lumiere : [instruction precise, ex: "10 min devant fenetre ou dehors, PAS de lunettes de soleil"]
- Si pas de soleil : "Lampe 10 000 lux a 30cm pendant 10 min"

T+15 a T+45 min :
- Douche : [protocole exact, ex: "30 sec eau froide sur nuque et dos a la fin"]
- Habillage

T+45 a T+60 min - PETIT-DEJEUNER :
- ZERO sucre, ZERO fruit, ZERO jus
- Proteines obligatoires : [X grammes, sources]
- Graisses saines : [sources]
- Exemples de petit-dej :
  Option 1 : [recette complete]
  Option 2 : [recette complete]
  Option 3 : [recette complete]

T+60 a T+90 min :
- Premier cafe SEULEMENT apres ce delai
- Pourquoi : [explication adenosine/cortisol en 1 phrase]

INTERDICTIONS ABSOLUES LE MATIN :
x Pas de telephone au lit
x Pas de reseaux sociaux avant 10h
x Pas de nouvelles/infos negatives
x Pas de reunion stressante avant 10h si possible

DUREE D'APPLICATION : 21 jours minimum pour reset circadien

Ce protocole doit etre COPIABLE tel quel par le client.
`,

  "Protocole Soir Verrouillage Sommeil": `
INSTRUCTIONS POUR "PROTOCOLE SOIR VERROUILLAGE SOMMEIL" :

MODE D'EMPLOI MINUTE PAR MINUTE pour un sommeil reparateur. INTERDICTION d'utiliser des barres informatiques.

FORMAT OBLIGATOIRE :

PROTOCOLE SOIR VERROUILLAGE SOMMEIL
Objectif : Preparer ton corps au sommeil PROFOND (N3 + REM)

H-3 AVANT COUCHER :
- Dernier repas : [composition, ex: "Proteines + legumes, glucides moderes"]
- Fin de l'entrainement si tu t'entraines le soir
- Fin de la cafeine a 14h (rappel)

H-2 AVANT COUCHER :
- Baisser les lumieres principales
- Activer le mode "Night Shift" sur tous les ecrans
- OU lunettes anti-lumiere bleue (filtrant 100% des bleus)

H-1.5 AVANT COUCHER :
- Supplements du soir :
  * Magnesium bisglycinate : [X mg]
  * Zinc : [X mg]
  * [Autre si pertinent]

H-1 AVANT COUCHER :
- FIN DES ECRANS (non negociable)
- Activite calme : lecture papier, etirements doux, musique calme
- Preparation chambre :
  * Temperature : 18-19C (ouvre la fenetre 30 min avant si besoin)
  * Obscurite totale (masque de sommeil si besoin)
  * Silence (bouchons d'oreilles ou bruit blanc si voisins bruyants)

H-0.5 AVANT COUCHER :
- Routine hygiene
- Douche tiede (PAS chaude) pour faire baisser la temperature centrale
- Respiration de decompression : 4-7-8 (inspire 4s, bloque 7s, expire 8s) x 4

AU LIT :
- Heure de coucher cible : [X h] (basee sur son reveil souhaite + 5 cycles de 90 min)
- Position : sur le dos ou sur le cote, jamais sur le ventre
- Si pensees intrusives : ecrire 3 lignes dans un carnet puis fermer

SI REVEIL NOCTURNE :
- Pas de telephone
- Pas de lumiere forte
- Respiration lente
- Si > 20 min eveille : se lever, activite calme, revenir quand fatigue

INTERDICTIONS ABSOLUES LE SOIR :
x Alcool (detruit le sommeil REM)
x Repas lourd apres 21h
x Discussion conflictuelle/stressante
x Travail/emails apres 21h
x Sport intense apres 20h

Ce protocole doit etre applicable DES CE SOIR.
`,

  "Protocole Digestion 14 Jours": `
INSTRUCTIONS POUR "PROTOCOLE DIGESTION 14 JOURS" :

Plan de RESET DIGESTIF en 14 jours avec liste d'aliments OK/NOK.

FORMAT OBLIGATOIRE :

 PROTOCOLE DIGESTION 14 JOURS 
Objectif : Calmer l'inflammation, reparer l'intestin, eliminer les intolerants

PHASE 1 : ELIMINATION (Jour 1 a 7)

ALIMENTS INTERDITS (liste stricte) :
x Gluten (ble, orge, seigle, epeautre)
x Produits laitiers de vache
x Sucres ajoutes et edulcorants
x Alcool (100% stop)
x Aliments transformes/industriels
x Huiles vegetales (tournesol, mais, soja)
x Cafe (limite a 1/jour, apres un repas)
x Legumineuses (temporairement)

ALIMENTS AUTORISES :
+ Proteines : viande, poisson, oeufs
+ Legumes : tous (sauf pomme de terre en exces)
+ Fruits : 1-2 portions max, hors repas
+ Feculents : riz basmati, patate douce, quinoa
+ Graisses : huile olive, avocat, noix
+ Boissons : eau, tisanes

STRUCTURE DES REPAS :
Petit-dej : [exemple type]
Dejeuner : [exemple type avec portions]
Collation : [si necessaire]
Diner : [exemple type, leger]

REGLES D'OR :
1. Macher 20-30 fois chaque bouchee
2. Pas de liquide pendant le repas (30 min avant/apres)
3. Manger assis, au calme, sans ecran
4. Repas en 20 min minimum

PHASE 2 : REPARATION (Jour 8 a 14)

On continue l'elimination + on ajoute :
+ Glutamine : 5g matin a jeun
+ Probiotiques : [souche recommandee]
+ Bouillon d'os : 1 tasse/jour (collagene pour la paroi)

REINTRODUCTION (Apres Jour 14) :
1. Reintroduire UN aliment a la fois
2. Attendre 48h et noter les symptomes
3. Si reaction : eliminer 3 mois supplementaires
4. Ordre de reintroduction : laitages ferments -> legumineuses -> gluten

RESTAURANT / REPAS EXTERIEURS (regles) :
- Choisir : grillades + legumes
- Eviter : sauces, panures, plats en sauce
- Demander : cuisson a l'huile d'olive
- Boire : eau plate

Ce protocole est STRICT mais TEMPORAIRE (14 jours). Apres, on assouplit.
`,

  "Protocole Bureau Anti-Sedentarite": `
INSTRUCTIONS POUR "PROTOCOLE BUREAU ANTI-SEDENTARITE" :

MODE D'EMPLOI pour contrer les 8-10h assis par jour.

FORMAT OBLIGATOIRE :

 PROTOCOLE BUREAU ANTI-SEDENTARITE 
Objectif : Reactiver ton corps malgre le travail de bureau

ROUTINE MICRO-PAUSES (toutes les 45-60 min) :

OPTION A - PAUSE DEBOUT (2 min) :
1. Se lever
2. 10 squats air
3. 10 cercles de bras
4. Marcher jusqu'a la fontaine et retour

OPTION B - PAUSE HANCHES (3 min) :
1. Debout, pied sur la chaise
2. Etirement flechisseur hanche : 30s/cote
3. Rotation thoracique : 5/cote

OPTION C - PAUSE NUQUE (2 min) :
1. Menton vers poitrine, 20s
2. Oreille vers epaule, 20s/cote
3. Regarder plafond, 20s
4. 10 rotations douces

EXERCICES CORRECTIFS QUOTIDIENS (10 min/jour) :
A faire AVANT l'entrainement ou en rentrant du bureau

EXERCICE 1 : Etirement psoas (90/90)
- Position : genou au sol, autre pied devant
- Serrer fessier du cote arriere
- Lever le bras du meme cote
- 60s par cote, respirer profondement

EXERCICE 2 : Pont fessier avec pause
- Allonge, pieds a plat
- Monter les hanches
- Tenir 5s en haut, serrer les fesses
- 3x12

EXERCICE 3 : Dead bug
- Allonge, bras tendus vers plafond
- Jambes a 90 degres
- Etendre un bras + jambe opposee
- Garder le dos colle au sol
- 3x8 par cote

EXERCICE 4 : Quadrupedie + rotation thoracique
- A quatre pattes
- Main derriere la tete
- Ouvrir le coude vers le plafond
- 10 par cote

INSTALLATION POSTE DE TRAVAIL :
- Ecran a hauteur des yeux
- Coudes a 90 degres
- Pieds a plat
- Dossier soutenant les lombaires
- Bureau debout si possible (alterner 30 min assis / 30 min debout)

OBJECTIF NEAT (pas/jour) :
- Minimum : 7 000 pas
- Optimal : 10 000 pas
- Strategies : escaliers, marche apres dejeuner, telephone debout

APPLICATION :
1. Met une alarme toutes les 60 min
2. Fais les 10 min d'exercices en rentrant
3. Track tes pas

Ce protocole est VITAL pour debloquer tes hanches et sauver ton dos.
`,

  "Protocole Entrainement Personnalise": `
INSTRUCTIONS POUR "PROTOCOLE ENTRAINEMENT PERSONNALISE" :

PROGRAMME DETAILLE base sur ses donnees.

FORMAT OBLIGATOIRE :

 PROTOCOLE ENTRAINEMENT PERSONNALISE 
Objectif : [son objectif principal]
Frequence : [X seances/semaine]
Split : [type de split]

STRUCTURE DE SEANCE :

ECHAUFFEMENT (10 min - NON NEGOCIABLE) :
1. Foam rolling zones tendues : 2 min
2. Activation fessiers : 2 min
   - Clam shells : 10/cote
   - Pont fessier : 10 reps
3. Mobilite specifique : 3 min
   - [Exercices selon la seance]
4. Rampe progressive : 3 min

SEANCE A - [NOM] :
Exercice 1 : [Nom]
- Tempo : [X-X-X-X]
- Series x Reps : [X x X]
- Repos : [X sec]
- Consigne : [point technique cle]

Exercice 2 : [Nom]
...
(6-8 exercices par seance)

FINISHER (optionnel) :
[Circuit metabolique ou core]

RETOUR AU CALME (5 min) :
- Etirements statiques zones travaillees
- Respiration diaphragmatique 2 min

SEANCE B - [NOM] :
[Meme format]

SEANCE C - [NOM] :
[Meme format]

SEMAINE TYPE :
Lundi : Seance A
Mardi : Cardio Zone 2 (30 min) + Mobilite
Mercredi : Seance B
Jeudi : Repos actif ou cardio leger
Vendredi : Seance C
Samedi : Cardio ou sport plaisir
Dimanche : Repos complet

PROGRESSION :
- Semaines 1-2 : Apprentissage des mouvements, tempo strict
- Semaines 3-4 : Augmentation charge 2.5-5%
- Semaines 5-6 : Introduction techniques d'intensification
- Semaine 7 : Deload (-40% volume)
- Reprise cycle

SI STAGNATION :
- Ajouter 1 serie
- Varier le tempo
- Changer l'angle
- Augmenter le temps sous tension
`,

  // 
  // PLAN CONCRET
  // 
  "Plan Semaine par Semaine 30-60-90": `
INSTRUCTIONS POUR "PLAN SEMAINE PAR SEMAINE 30-60-90" :

PAS une projection, un PLAN D'ACTION detaille.

FORMAT OBLIGATOIRE :

 PLAN D'ACTION 30-60-90 JOURS 

PHASE 1 : RESET (Semaines 1-4)

SEMAINE 1 - FONDATIONS :
Lundi :
- Matin : Implementer protocole matin anti-cortisol
- Soir : Implementer protocole soir sommeil
- Entrainement : Focus mobilite, pas d'intensite

Mardi :
- Debut protocole digestion 14 jours
- Cardio Zone 2 : 30 min

Mercredi :
- Premiere seance muscu adapte
- Pas plus de 45 min

Jeudi :
- Repos actif : marche 30 min
- Mesurer : tour de taille, poids, energie matin /10

Vendredi :
- Seance muscu
- Tracking : qualite sommeil /10

Samedi :
- Cardio au choix
- Prep meals semaine 2

Dimanche :
- Repos total
- Bilan semaine : [checklist]

SEMAINE 2 - AJUSTEMENTS :
[Si energie matin < 5/10 : prolonger phase sommeil]
[Si ballonnements encore presents : verifier aliments suspects]
- Augmenter intensite entrainement 10%
- Continuer protocoles
- Objectif : premiers signes de degonflage

SEMAINES 3-4 - CONSOLIDATION :
- Fin du reset digestif
- Reintroduction progressive
- Augmenter charge entrainement
- Objectif fin S4 : -2kg, -2cm tour taille, energie 7/10

PHASE 2 : ACCELERATION (Semaines 5-8)

SEMAINE 5-6 :
- Introduction carb cycling
- Intensification entrainement (drop sets, rest-pause)
- Ajout HIIT 1x/semaine
- Tracking precis des macros

SEMAINE 7-8 :
- Deload semaine 7
- Reprise semaine 8
- Objectif fin S8 : -4kg, -4cm tour taille, energie 8/10

SI PLATEAU (pas de perte depuis 2 semaines) :
-> Reduire glucides de 20%
-> Ajouter 1 seance cardio
-> Verifier adherence protocoles

PHASE 3 : TRANSFORMATION (Semaines 9-12)

SEMAINE 9-10 :
- Push final nutrition (deficit plus agressif si bien tolere)
- Volume entrainement maximal
- Focus : detail musculaire

SEMAINE 11-12 :
- Maintien
- Photos comparatives
- Objectif final : -6 a 8kg, -6cm tour taille, physique transforme

ARBRE DE DECISION SI BLOCAGE :
[Flowchart textuel avec decisions]
`,

  "KPI et Tableau de Bord": `
INSTRUCTIONS POUR "KPI ET TABLEAU DE BORD" :

STRUCTURE :
- Titre principal unique : "KPI ET TABLEAU DE BORD"
- Rédige un paragraphe d'introduction expliquant l'objectif : mesurer pour progresser.

SOUS-SECTIONS :

1. Métriques quotidiennes à suivre
Rédige en paragraphes narratifs les 5 métriques quotidiennes à mesurer chaque matin :
- Fréquence cardiaque au repos (explique pourquoi et comment l'interpréter avec des phrases complètes)
- Qualité du sommeil sur 10 (explique les critères avec des phrases)
- Niveau d'énergie au réveil sur 10 (explique pourquoi c'est important avec des phrases)
- Niveau de ballonnements sur 10 (explique la signification avec des phrases)
- Café après 14h : Oui/Non (explique l'impact avec des phrases)

Pour chaque métrique, explique les seuils (vert/jaune/rouge) avec des phrases complètes, pas seulement des indicateurs.

2. Métriques hebdomadaires
Rédige en paragraphes narratifs les métriques à mesurer chaque dimanche :
- Poids et tendance (explique comment interpréter avec des phrases)
- Tour de taille (explique la méthode et l'objectif avec des phrases)
- Pas moyens par jour (explique les seuils avec des phrases)
- Verres d'alcool (explique l'impact avec des phrases)
- Taux de réalisation des séances (explique pourquoi c'est important avec des phrases)

3. Règles d'interprétation
Rédige en paragraphes narratifs les règles :
- Si 3 KPI ou plus en rouge sur une semaine, explique ce qu'il faut faire et pourquoi avec des phrases complètes.
- Si 5 KPI ou plus en vert sur 2 semaines consécutives, explique comment accélérer avec des phrases complètes.

INTERDICTION : Pas de tableaux markdown, pas de formatage complexe. Uniquement du texte narratif avec des phrases complètes.

| Jour | FC | Sommeil | Energie | Ballonnements | Cafe14h |
||--|||||
| L    |     |         |         |               |         |
| M    |     |         |         |               |         |
| M    |     |         |         |               |         |
| J    |     |         |         |               |         |
| V    |     |         |         |               |         |
| S    |     |         |         |               |         |
| D    |     |         |         |               |         |

| Semaine | Poids | Tour taille | Pas/j | Alcool | Seances |
||-|-|-|--||
| S1      |       |             |       |        |         |
| S2      |       |             |       |        |         |
...

OBJECTIFS CHIFFRES A 30/60/90 JOURS :
30 jours : [metriques cibles personnalisees]
60 jours : [metriques cibles personnalisees]
90 jours : [metriques cibles personnalisees]
`,

  "Stack Supplements Optimise": `
INSTRUCTIONS POUR "STACK SUPPLEMENTS OPTIMISE" :

NOTE SYSTEME :
Cette section est generee a partir de la bibliotheque de complements (moteur supplements) pour garantir :
- Zero hallucination
- Coherence avec tes gates de securite
- Reutilisation de ta base canonique

FORMAT OBLIGATOIRE :

 STACK SUPPLEMENTS OPTIMISE 
Base sur : [ses carences/besoins identifies]

PRIORITE 1 - FONDAMENTAUX (commencer par ceux-la) :

1. MAGNESIUM BISGLYCINATE
- Pourquoi : [raison personnalisee]
- Dosage : 300-400mg de magnesium elementaire
- Timing : 30-60 min avant coucher
- Marques : Nutrimuscle, Now Foods, Pure Encapsulations
- Duree : permanent

2. OMEGA-3 (EPA/DHA)
- Pourquoi : [raison personnalisee]
- Dosage : 2-3g d'EPA+DHA total (lire l'etiquette!)
- Timing : pendant le repas le plus gras
- Marques : Nutrimuscle, Nordic Naturals, Epax
- Forme : triglycerides, pas ethyl ester
- Duree : permanent

3. VITAMINE D3 + K2
- Pourquoi : [raison personnalisee - travail bureau]
- Dosage : 3000-5000 UI D3 + 100-200mcg K2 MK-7
- Timing : matin avec repas gras
- Marques : Thorne, Now Foods
- Duree : permanent (doser 25-OH vitamine D apres 3 mois)

PRIORITE 2 - OPTIMISATION (ajouter apres 2-4 semaines) :

4. ZINC PICOLINATE
- Pourquoi : [raison personnalisee]
- Dosage : 15-30mg
- Timing : soir avec magnesium
- Attention : ne pas depasser 30mg/jour
- Duree : 3 mois, puis pause 1 mois

5. ASHWAGANDHA KSM-66 (si stress eleve)
- Pourquoi : [si applicable]
- Dosage : 300-600mg
- Timing : soir au diner
- Duree : 8 semaines max, puis pause 4 semaines

PRIORITE 3 - PERFORMANCE (optionnel) :

6. CREATINE MONOHYDRATE
- Dosage : 5g/jour (pas de phase de charge necessaire)
- Timing : post-entrainement ou matin
- Marques : Creapure (label de qualite)
- Hydratation : +500ml eau/jour

7. WHEY ISOLATE (si apport proteique insuffisant)
- Dosage : 20-40g selon besoins
- Timing : post-entrainement ou collation
- Attention : si ballonnements, passer a whey hydrolysee ou proteines vegetales

ROUTINE QUOTIDIENNE RESUME :

MATIN (avec petit-dej) :
- Vitamine D3 + K2
- Omega-3 (partie 1)

MIDI (avec dejeuner) :
- Omega-3 (partie 2) si dose splitee
- [Autres si applicable]

SOIR (30 min avant coucher) :
- Magnesium bisglycinate
- Zinc
- Ashwagandha (si applicable)

BUDGET ESTIME :
Donne une fourchette (low / medium / high) au lieu d'un chiffre exact.

CE QU'IL NE FAUT PAS PRENDRE :
x Pre-workout avec stimulants (si entrainement soir)
x Multivitamines generiques (doses trop faibles)
x Fat burners (inutiles et dangereux)
`,

  "Synthese et Prochaines Etapes": `
INSTRUCTIONS POUR "SYNTHESE ET PROCHAINES ETAPES" :

CONCLUSION qui pousse a l'action.

FORMAT OBLIGATOIRE :

 SYNTHESE FINALE 

RESUME EN 30 SECONDES :
[Prenom], voici ce que je retiens de ton audit :

FORCES (ce qui joue en ta faveur) :
+ [Force 1]
+ [Force 2]
+ [Force 3]

BLOCAGES IDENTIFIES (ce qu'on va corriger) :
x [Blocage 1]
x [Blocage 2]
x [Blocage 3]

TON POTENTIEL REEL :
Actuellement : [X/10]
Dans 90 jours : [Y/10]

CE QUE TU FAIS DES DEMAIN :
1. [Action 1 - immediate]
2. [Action 2 - immediate]
3. [Action 3 - immediate]

RISQUES SI TU NE FAIS RIEN :
- A 6 mois : [consequence 1]
- A 1 an : [consequence 2]

RESULTATS SI TU APPLIQUES :
- A 30 jours : [resultat 1]
- A 90 jours : [resultat 2]

MON ENGAGEMENT :
[Ta phrase finale d'engagement en tant que coach Achzod.]


`
};

function truncateMiddle(s: string, max: number): string {
  if (s.length <= max) return s;
  const head = Math.max(200, Math.floor(max * 0.7));
  const tail = Math.max(80, max - head - 20);
  return `${s.slice(0, head)} ...[tronque]... ${s.slice(-tail)}`;
}

function buildDataStrForPrompt(data: ClientData): string {
  const MAX_VALUE_CHARS = Number(process.env.AI_MAX_VALUE_CHARS ?? "2000");
  const MAX_TOTAL_CHARS = Number(process.env.AI_MAX_TOTAL_CHARS ?? "24000");

  const lines: string[] = [];
  let used = 0;

  for (const [k, v] of Object.entries(data || {})) {
    if (v == null) continue;
    const key = String(k);

    let valueStr = "";
    if (typeof v === "string") valueStr = v.trim();
    else if (Array.isArray(v)) valueStr = v.join(", ");
    else valueStr = String(v);

    if (!valueStr) continue;
    if (valueStr.length > MAX_VALUE_CHARS) valueStr = truncateMiddle(valueStr, MAX_VALUE_CHARS);

    const line = `- ${key}: ${valueStr}`;
    if (used + line.length + 1 > MAX_TOTAL_CHARS) {
      lines.push(`- NOTE: certaines reponses ont ete tronquees pour respecter la limite d'entree (demander precision si besoin).`);
      break;
    }
    lines.push(line);
    used += line.length + 1;
  }

  return lines.join("\n");
}

function getSectionInstructionsForTier(section: SectionName, tier: AuditTier): string {
  if (tier !== "GRATUIT") return SECTION_INSTRUCTIONS[section] || "";

  // Mode gratuit : version compacte, sans protocoles longs ni stack détaillée.
  if (section === "Executive Summary") {
    return `
MODE GRATUIT (CRITIQUE) :
- Version courte (max 25 lignes), ultra claire.
- Donne 3 priorites d'optimisation, 2 risques si rien ne change, 2 actions "des demain".
`;
  }
  if (section === "Analyse visuelle et posturale complete") {
    return `
MODE GRATUIT (CRITIQUE) :
- Version courte (max 25 lignes).
- Screening + 2 tests video simples.
`;
  }
  if (section === "Analyse metabolisme et nutrition") {
    return `
MODE GRATUIT (CRITIQUE) :
- Version courte (max 25 lignes).
- Donne 3 leviers nutrition/metabolisme prioritaires + 1 mini protocole 24h.
`;
  }
  if (section === "Synthese et Prochaines Etapes") {
    return `
MODE GRATUIT (CRITIQUE) :
- Conclus en mode "aperçu", sans entrer dans les protocoles 30/60/90 complets.
- Termine en ouvrant vers l'analyse PREMIUM (details + protocoles + stack complete).
`;
  }
  return SECTION_INSTRUCTIONS[section] || "";
}

async function callGemini(prompt: string): Promise<string> {
  for (let attempt = 0; attempt < GEMINI_MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: GEMINI_TEMPERATURE,
          maxOutputTokens: GEMINI_MAX_TOKENS,
        },
      });

      const text = result.response.text() || "";
      // IMPORTANT: une réponse vide produit un audit "tronqué" (header/CTA sans sections).
      // On force donc un retry si le modèle renvoie vide.
      if (!text.trim()) {
        throw new Error("Gemini returned an empty response");
      }
      return text;
    } catch (error: any) {
      console.log(`[Gemini] Erreur tentative ${attempt + 1}/${GEMINI_MAX_RETRIES}: ${error.message || error}`);
      if (attempt < GEMINI_MAX_RETRIES - 1) {
        const waitTime = GEMINI_SLEEP_BETWEEN * (attempt + 1) * 1000;
        console.log(`[Gemini] Attente ${waitTime / 1000}s avant nouvelle tentative...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  console.log("[Gemini] Echec apres toutes les tentatives");
  return "";
}

export async function generateAuditTxt(
  clientData: ClientData,
  photoAnalysis?: PhotoAnalysis | null,
  tier: AuditTier = 'PREMIUM',
  resumeAuditId?: string
): Promise<string | null> {
  const startTime = Date.now();
  
  const firstName = clientData['prenom'] || clientData['age'] || 'Client';
  const lastName = clientData['nom'] || '';
  const fullName = `${firstName} ${lastName}`.trim();

  const auditId = resumeAuditId || generateAuditId();
  let cachedSections: { [key: string]: string } = {};
  let sectionsFromCache = 0;
  
  if (resumeAuditId) {
    const cached = loadFromCache(resumeAuditId);
    if (cached) {
      cachedSections = cached.sections || {};
      sectionsFromCache = Object.keys(cachedSections).length;
      console.log(`[Cache] Reprise audit ${resumeAuditId} - ${sectionsFromCache} sections deja generees`);
    }
  }

  console.log(`[Cache] ID Audit: ${auditId} (utilise cet ID pour reprendre si crash)`);

  const dataStr = buildDataStrForPrompt(clientData);

  let photoDataStr = '';
  if (photoAnalysis) {
    const formattedAnalysis = formatPhotoAnalysisForReport(photoAnalysis, firstName);
    photoDataStr = `\n\nRAPPORT D'EXPERTISE VISUELLE (A INTEGRER DANS TON RECIT) :\n${formattedAnalysis}`;
  } else {
    photoDataStr = '\n\nAUCUNE PHOTO FOURNIE - Ne pas inventer de donnees visuelles.';
  }

  const fullDataStr = dataStr + photoDataStr;

  const auditParts: string[] = [];
  
  const ctaDebut = getCTADebut(tier, PRICING.PREMIUM);
  auditParts.push(ctaDebut);
  auditParts.push(`\n AUDIT COMPLET NEUROCORE 360 - ${fullName.toUpperCase()} \n`);
  auditParts.push(`Genere le ${new Date().toLocaleString('fr-FR')}\n`);

  const cacheData: CacheData = {
    auditId,
    clientData,
    photoAnalysis,
    tier,
    sections: cachedSections,
    startedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };

  const sectionsToGenerate = getSectionsForTier(tier);

  // Génération en PARALLÈLE pour la vitesse
  const sectionPromises = sectionsToGenerate.map(async (section, i) => {
    if (cachedSections[section]) {
      return { section, text: cachedSections[section], fromCache: true };
    }

    // ✅ Stack supplements : on la génère depuis la bibliothèque (pas via l'IA)
    if (section === "Stack Supplements Optimise" && tier !== "GRATUIT") {
      const scores = calculateScoresFromResponses(clientData as any);
      const generated = generateSupplementsSectionText({
        responses: clientData as any,
        globalScore: typeof scores?.global === "number" ? scores.global : undefined,
      });

      cacheData.sections[section] = generated;
      saveToCache(auditId, cacheData);
      return { section, text: generated, fromCache: false };
    }
    
    const specificInstructions = getSectionInstructionsForTier(section, tier);

    const prompt = PROMPT_SECTION
      .replace('{section}', section)
      .replace('{section_specific_instructions}', specificInstructions)
      .replace('{data}', fullDataStr);

    const sectionText = await callGemini(prompt);

    if (!sectionText) {
      return { section, text: "", fromCache: false };
    }

    const cleanedText = sectionText
      .replace(/\*\*/g, '')
      .replace(/##/g, '')
      .replace(/__/g, '')
      .replace(/\*/g, '');

    // Sauvegarde immédiate dans le cache
    cacheData.sections[section] = cleanedText;
    saveToCache(auditId, cacheData);

    return { section, text: cleanedText, fromCache: false };
  });

  const results = await Promise.all(sectionPromises);

  const nonEmptySections = results.filter(r => (r.text || "").trim().length > 0).length;
  if (nonEmptySections === 0) {
    console.error("[GeminiPremiumEngine] Aucune section n'a été générée (réponses vides). Audit annulé.");
    return null;
  }

  // Assemblage dans l'ordre original
  sectionsToGenerate.forEach((section) => {
    const res = results.find(r => r.section === section);
    if (res && res.text) {
      auditParts.push(`\n${section.toUpperCase()}\n`);
      auditParts.push(res.text);
    }
  });

  let fullAudit = auditParts.join('\n');
  
  const ctaFin = getCTAFin(tier, PRICING.PREMIUM);
  fullAudit += '\n\n' + ctaFin;
  
  deleteCache(auditId);
  
  const generationTime = Date.now() - startTime;
  const newSections = sectionsToGenerate.length - sectionsFromCache;
  console.log(`\n[GeminiPremiumEngine] Audit genere en ${(generationTime / 1000).toFixed(1)}s (${newSections} nouvelles sections, ${sectionsFromCache} du cache)`);
  
  return fullAudit;
}

export async function generateAndConvertAudit(
  clientData: ClientData,
  photoAnalysis?: PhotoAnalysis | null,
  tier: AuditTier = 'PREMIUM',
  resumeAuditId?: string
): Promise<AuditResult> {
  const startTime = Date.now();
  
  const firstName = clientData['prenom'] || clientData['age'] || 'Client';
  const lastName = clientData['nom'] || '';
  const clientName = `${firstName} ${lastName}`.trim();

  console.log(`\n[GeminiPremiumEngine] Nouvelle demande d'audit pour ${firstName}`);
  console.log(`[GeminiPremiumEngine] Generation audit PREMIUM avec GEMINI pour ${clientName}...`);

  const txtContent = await generateAuditTxt(clientData, photoAnalysis, tier, resumeAuditId);
  if (!txtContent) {
    console.log(`[GeminiPremiumEngine] Echec generation TXT pour ${clientName}`);
    return {
      success: false,
      error: "Echec generation avec Gemini"
    };
  }

  console.log(`[GeminiPremiumEngine] Audit TXT genere (${txtContent.length} caracteres)`);

  const generationTime = Date.now() - startTime;

  return {
    success: true,
    txt: txtContent,
    clientName: clientName,
    metadata: {
      generationTimeMs: generationTime,
      sectionsGenerated: getSectionsForTier(tier).length,
      modelUsed: GEMINI_MODEL
    }
  };
}

export function listPendingAudits(): string[] {
  ensureCacheDir();
  try {
    const files = fs.readdirSync(CACHE_DIR);
    return files
      .filter(f => f.startsWith('audit-') && f.endsWith('.json'))
      .map(f => f.replace('audit-', '').replace('.json', ''));
  } catch {
    return [];
  }
}

export { SECTIONS, SECTION_INSTRUCTIONS, PROMPT_SECTION, callGemini, loadFromCache, deleteCache };
