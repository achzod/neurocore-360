/**
 * NEUROCORE 360 - Module de génération d'audits avec Gemini
 * Génère des audits TXT complets avec 18 sections
 * SYSTÈME PRINCIPAL - NE PAS UTILISER narrativeEngineAI.ts
 * AVEC SYSTÈME DE CACHE PROGRESSIF pour reprendre après crash
 */

import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { ClientData, PhotoAnalysis, AuditResult, SectionName, AuditTier } from './types';
import { getCTADebut, getCTAFin, PRICING } from './cta';

// ============================================================
// SYSTÈME DE CACHE POUR SAUVEGARDE PROGRESSIVE
// ============================================================
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

// Initialisation simplifiée - juste l'API key
const ai = new GoogleGenAI({
  apiKey: GEMINI_CONFIG.GEMINI_API_KEY,
});

const GEMINI_MODEL = GEMINI_CONFIG.GEMINI_MODEL;
const GEMINI_TEMPERATURE = GEMINI_CONFIG.GEMINI_TEMPERATURE;
const GEMINI_MAX_TOKENS = GEMINI_CONFIG.GEMINI_MAX_TOKENS;
const GEMINI_MAX_RETRIES = GEMINI_CONFIG.GEMINI_MAX_RETRIES;
const GEMINI_SLEEP_BETWEEN = GEMINI_CONFIG.GEMINI_SLEEP_BETWEEN;

const SECTIONS: SectionName[] = [
  // === PAGE 1 : EXECUTIVE SUMMARY ===
  "Executive Summary",
  
  // === ANALYSES PROFONDES ===
  "Analyse visuelle et posturale complete",
  "Analyse biomecanique et sangle profonde",
  "Analyse entrainement et periodisation",
  "Analyse systeme cardiovasculaire",
  "Analyse metabolisme et nutrition",
  "Analyse sommeil et recuperation",
  "Analyse digestion et microbiote",
  "Analyse axes hormonaux",
  
  // === PROTOCOLES FERMES ===
  "Protocole Matin Anti-Cortisol",
  "Protocole Soir Verrouillage Sommeil",
  "Protocole Digestion 14 Jours",
  "Protocole Bureau Anti-Sedentarite",
  "Protocole Entrainement Personnalise",
  
  // === PLAN CONCRET ===
  "Plan Semaine par Semaine 30-60-90",
  "KPI et Tableau de Bord",
  "Stack Supplements Optimise",
  
  // === CONCLUSION ===
  "Synthese et Prochaines Etapes"
];

const PROMPT_SECTION = `Tu es Achzod, coach sportif d'elite avec 11 certifications internationales, expert en biomecanique, nutrition, hormones, preparation physique et biohacking.

Tu rediges un AUDIT PREMIUM a 79 euros. Le client attend une expertise CHIRURGICALE mais surtout une CONNEXION HUMAINE.

=== PHILOSOPHIE : LE STORYTELLING CLINIQUE ===
- Ne fais PAS de simples listes de puces (bullet points). Limite-les au strict minimum pour la clarte.
- Redige des PARAGRAPHES NARRATIFS profonds. Raconte l'histoire du corps du client.
- Connecte les points avec du LIANT : "Quand je regarde ta photo de dos (donnee), je ne vois pas juste un manque de muscle, je vois une lutte constante de ton systeme nerveux qui essaie de compenser ton instabilite lombaire (storytelling)..."
- Humain & Expert : Parle comme un mentor exigeant qui a passe 3h sur son dossier. Utilise des metaphores puissantes mais scientifiquement justes.

=== REGLE D'OR : DIAGNOSTIC -> MECANISME -> CONSEQUENCE -> PRESCRIPTION ===
1. ANALYSE CLINIQUE NARRATIVE : Decortique les donnees en les citant. Fais-le sous forme de recit analytique.
2. MECANISMES PHYSIOLOGIQUES (LE POURQUOI) : Explique les cascades (hormones, enzymes, bio-meca).
3. CONSEQUENCES REELLES : L'impact sur sa vie, son futur, son physique.
4. SOLUTIONS : Actionnable immediat.

Section a rediger : {section}

=== STYLE ===
- Direct, expert, incarné - tu parles face a lui.
- Phrases percutantes, ton "grand frere expert".
- TUTOIE toujours.
- Zero blabla generique. Chaque phrase doit transpirer l'expertise clinique.

=== FORMAT ===
- Texte brut uniquement (PAS de markdown : pas de **, ##, _, *)
- Utiliser des graphiques ASCII visuels UNIQUEMENT pour illustrer des donnees cles.
- Le reste doit etre de la belle REDACTION EXPERTE.

{section_specific_instructions}

Donnees du client :
{data}
`;

const SECTION_INSTRUCTIONS: Record<string, string> = {
  
  // ============================================================
  // EXECUTIVE SUMMARY - PAGE 1 (20 secondes pour scotcher)
  // ============================================================
  "Executive Summary": `
INSTRUCTIONS POUR "EXECUTIVE SUMMARY" - C'EST LA PAGE 1 QUI SCOTCHE LE CLIENT EN 20 SECONDES :

Tu dois creer un resume ULTRA DENSE et VISUEL. Le client doit comprendre INSTANTANEMENT :
1. Ce qui ne va pas
2. Ce qu'il doit faire DEMAIN
3. Ou il sera dans 30 jours

FORMAT OBLIGATOIRE (respecte cet ordre EXACTEMENT) :

=== DIAGNOSTIC EXPRESS ===
[Prenom], voici ce que ton corps me dit en 3 points :

TOP 3 CAUSES RACINES :
1. [CAUSE 1 - 1 phrase percutante, ex: "Ton cortisol inverse te fait stocker du gras meme en deficit"]
2. [CAUSE 2 - 1 phrase percutante, ex: "Tes 10h assis ont eteint tes fessiers et verrouille tes hanches"]
3. [CAUSE 3 - 1 phrase percutante, ex: "Ton petit-dej sucre lance une cascade insulinique qui bloque la lipolyse"]

TOP 3 NON-NEGOCIABLES (ce que tu fais DES DEMAIN) :
1. [ACTION 1 - specifique et immediate, ex: "Petit-dej sale : 3 oeufs + avocat, zero sucre avant 12h"]
2. [ACTION 2 - specifique et immediate, ex: "Lunettes anti-lumiere bleue a 21h, chambre a 18-19C"]
3. [ACTION 3 - specifique et immediate, ex: "5 min de decompression flechisseurs de hanche avant le sport"]

OBJECTIF 30 JOURS :
-> Metrique principale : [ex: "Tour de taille : -3 cm"]
-> Metrique secondaire : [ex: "Energie matin : passer de 3/10 a 7/10"]
-> Signal de reussite : [ex: "Tu te leves AVANT ton reveil, sans cafe pour demarrer"]

SCORES ACTUELS :
Metabolisme    [####......] 4/10
Recuperation   [###.......] 3/10
Hormonal       [#####.....] 5/10
Structure      [######....] 6/10

-> POTENTIEL REEL : 9/10 (une fois les blocages leves)

- MAXIMUM 25-30 lignes - DENSE, PAS DE BLABLA
- Chaque mot doit compter
- C'est la "carte de visite" de l'audit
`,

  // ============================================================
  // ANALYSES PROFONDES (plus courtes mais ULTRA precises)
  // ============================================================
  "Analyse visuelle et posturale complete": `
INSTRUCTIONS POUR "ANALYSE VISUELLE ET POSTURALE COMPLETE" :

TU ES UN EXPERT EN ANATOMIE ET ENDOCRINOLOGIE. Applique strictement : DIAGNOSTIC -> MECANISME -> CONSEQUENCE -> PRESCRIPTION.

1. ANALYSE CLINIQUE DES PHOTOS ET DONNEES :
- Cite les chiffres : "A 85kg pour 1m80, ton ratio taille/hanches indique..."
- Analyse chaque photo (face/dos/profil) avec une precision de laser.
- Cite les donnees du client : "Tu declares un stockage sur le ventre et les hanches, ce que je confirme visuellement..."

2. MECANISMES ENDOCRINIENS ET BIOMECANIQUES (LE COEUR DE L'EXPERTISE) :
- Explique le pattern de stockage : "Le gras sur les hanches (donnee) est le signe d'une mauvaise gestion des oestrogenes et d'une baisse de sensibilite a l'insuline (mecanisme)."
- Explique le "Stress Belly" : "Ton cortisol chroniquement eleve stimule la LPL (lipoproteine lipase) dans la zone viscerale, voila pourquoi ton ventre resiste malgre le HIIT."
- Explique la cascade posturale : "Tes 10h assis verrouillent ton psoas en position courte (mecanisme), ce qui desactive tes fessiers par inhibition reciproque."

3. CONSEQUENCES BRUTALES :
- "Si on ne corrige pas cette anteversion du bassin, ton squat ne fera que compresser tes disques L4-L5 sans jamais construire tes jambes."
- "Ton metabolisme restera bloque en mode 'survie' tant que ce signal d'inflammation persiste."

4. PRESCRIPTION CHIRURGICALE :
- Donne 2-3 corrections specifiques.

Minimum 70 lignes. Sois brillant scientifiquement.
`,

  "Analyse biomecanique et sangle profonde": `
INSTRUCTIONS POUR "ANALYSE BIOMECANIQUE ET SANGLE PROFONDE" :

TU ES UN CLINICIEN DU MOUVEMENT. Applique : DIAGNOSTIC -> MECANISME -> CONSEQUENCE -> PRESCRIPTION.

1. DIAGNOSTIC DE STRUCTURE :
- Analyse ses douleurs : "Tes douleurs a la nuque (donnee) ne sont pas musculaires, elles sont posturales."
- Analyse son blocage : "Ton squat difficile (donnee) est le symptome, pas le probleme."

2. MECANISMES DE DEFAILANCE :
- Explique le TRANSVERSE : "Ton muscle transverse est 'eteint' (mecanisme). Au lieu de stabiliser ta colonne par pression intra-abdominale, tu la stabilises par tension lombaire."
- Explique la RESPIRATION : "Ton stress eleve te fait respirer par le haut du thorax, ce qui fige ton diaphragme et verrouille ton dos."
- Parle du SYNDROME CROISE INFERIEUR en detail.

3. CONSEQUENCES :
- "Ton corps refuse de prendre de la force car il se sent instable."
- "Risque de hernie discale imminent si tu continues a charger en squat avec ce bassin bascule."

4. PRESCRIPTION :
- Exercices de 're-wiring' nerveux (Stomach Vacuum, activation fessiere ciblee).

Minimum 60 lignes.
`,

  "Analyse entrainement et periodisation": `
INSTRUCTIONS POUR "ANALYSE ENTRAINEMENT ET PERIODISATION" :

AUDIT DE SON PROGRAMME ACTUEL :
- Split utilise : [PPL/Full Body/Bro Split/Upper-Lower]
- Frequence : X seances/semaine
- Duree moyenne : X minutes
- Volume total estime : X series/muscle/semaine

ERREURS DETECTEES :
1. [Erreur 1 + explication physiologique]
2. [Erreur 2 + explication physiologique]
3. [Erreur 3 + explication physiologique]

RATIO PUSH/PULL/LEGS :
- Actuel : [ratio estime]
- Optimal pour son objectif : [ratio cible]
- Desequilibre identifie : [ex: trop de push, pas assez de pull]

ANALYSE DU TEMPO ET TENSION :
- Tempo probable : non controle (a corriger)
- Temps sous tension : insuffisant pour hypertrophie
- Mind-muscle connection : a developper sur [muscles specifiques]

SURCHARGE PROGRESSIVE :
- Appliquee ? [oui/non]
- Si non : stagnation neurale inevitable

TECHNIQUES D'INTENSIFICATION A INTEGRER :
+ Drop sets pour [muscle]
+ Rest-pause pour [muscle]
+ Tempo lent (4-0-2-0) pour [muscle]

PERIODISATION RECOMMANDEE :
- Bloc 1 (S1-4) : [focus]
- Bloc 2 (S5-8) : [focus]
- Bloc 3 (S9-12) : [focus]
- Deload : toutes les 4-6 semaines

Score programme actuel : X/10
`,

  "Analyse systeme cardiovasculaire": `
INSTRUCTIONS POUR "ANALYSE SYSTEME CARDIOVASCULAIRE" :

INDICATEURS ACTUELS :
- FC repos declaree : X bpm
- Interpretation : [excellente < 60 | bonne 60-70 | moyenne 70-80 | a ameliorer > 80]
- VO2max estimee : [selon son profil]

PROFIL D'ACTIVITE CARDIO ACTUEL :
- Type : [HIIT/LISS/aucun]
- Frequence : X/semaine
- Duree : X min
- Intensite : [zones]

ANALYSE METABOLIQUE :
- Flexibilite metabolique estimee : [bonne/moyenne/faible]
- Oxydation des graisses : [optimisee/bloquee]
- Biogenese mitochondriale : [stimulee/negligee]

PROBLEMES IDENTIFIES :
x [Si trop de HIIT : "Stress surrenalien, cortisol chronique"]
x [Si pas de cardio : "Sensibilite insuline degradee"]
x [Si seulement LISS : "Pas de stimulation VO2max"]

PRESCRIPTION CARDIO PERSONNALISEE :
- Zone 2 (aerobie) : [X min/semaine, frequence, moment]
- Zone 4-5 (HIIT) : [X min/semaine, frequence, type]
- NEAT : [objectif pas/jour]

TDEE ESTIME :
- BMR : ~X kcal
- Facteur activite : X
- TDEE : ~X kcal

Score systeme cardiovasculaire : X/10
`,

  "Analyse metabolisme et nutrition": `
INSTRUCTIONS POUR "ANALYSE METABOLISME ET NUTRITION" :

TU ES UN EXPERT EN BIOCHIMIE NUTRITIONNELLE. Applique : DIAGNOSTIC -> MECANISME -> CONSEQUENCE -> PRESCRIPTION.

1. DIAGNOSTIC METABOLIQUE :
- Analyse son alimentation : "Ton petit-dej sucre (donnee) est une bombe a retardement."
- Cite ses chiffres : "Calcul de ton TDEE : ~2600 kcal. Tu consommes environ X..."

2. MECANISMES BIOCHIMIQUES :
- Explique l'INSULINE : "Le sucre au reveil provoque un pic d'insuline massif (mecanisme) qui bloque l'enzyme HSL (Hormone Sensitive Lipase), rendant la perte de gras impossible pendant 6h."
- Explique l'ALCOOL : "Tes 4-7 verres par semaine saturent ton foie. L'acetate est traite en priorite, mettant la beta-oxydation des graisses sur pause (mecanisme)."
- Explique le CORTISOL : "Ton stress au travail provoque le 'vol de la pregnenolone' : ton corps sacrifie ta testosterone pour produire du cortisol de survie."

3. CONSEQUENCES :
- "Tu es en train de construire un profil pre-diabetique malgre tes 4 seances de sport."
- "Ton cerveau fonctionne au glucose plutot qu'aux corps cetoniques, d'ou le brain fog."

4. PRESCRIPTION :
- Carb Cycling precis, protocoles de jeûne intermittent ou sale le matin.

Minimum 70 lignes.
`,

  "Analyse sommeil et recuperation": `
INSTRUCTIONS POUR "ANALYSE SOMMEIL ET RECUPERATION" :

Applique strictement la regle : DIAGNOSTIC -> MECANISME -> CONSEQUENCE -> PRESCRIPTION.

1. DIAGNOSTIC :
- Analyse sa duree de sommeil (6-7h), son heure de coucher (1h), ses ecrans le soir.
- Cite ses symptomes (fatigue matin, energie soir).

2. MECANISMES :
- Explique l'inversion de la courbe de cortisol.
- Explique le blocage de la melatonine par la lumiere bleue.
- Parle du role de l'Hormone de Croissance (GH) et de la Testosterone pendant le sommeil profond.

3. CONSEQUENCES :
- Pourquoi son muscle ne se repare pas ?
- Pourquoi son cerveau reste en mode "alerte" ?

4. PRESCRIPTION :
- Protocole de déconnexion et optimisation de l'environnement (température, obscurité).

Minimum 50 lignes.
`,

  "Analyse digestion et microbiote": `
INSTRUCTIONS POUR "ANALYSE DIGESTION ET MICROBIOTE" :

PROFIL DIGESTIF :
- Transit : [rapide/normal/lent]
- Ballonnements : [jamais/parfois/souvent]
- Reflux : [jamais/parfois/souvent]
- Tolerance lactose : [bonne/sensible/intolerant]
- Tolerance gluten : [bonne/sensible]

ANALYSE DES SYMPTOMES :
[Pour chaque symptome, explique la cause probable et la solution]

MICROBIOTE :
- Etat estime : [equilibre/dysbiose probable]
- Facteurs de dysbiose : [alcool, stress, antibiotiques, sucre]
- Impact sur : [absorption, inflammation, neurotransmetteurs]

AXE INTESTIN-CERVEAU :
- 90% de la serotonine = produite dans l'intestin
- Si dysbiose : [fatigue, humeur, cravings]

PERMEABILITE INTESTINALE :
- Signes de "leaky gut" : [ballonnements + fatigue + inflammation]
- Consequences : [inflammation systemique, retention eau]

CAPACITE D'ABSORPTION :
- Proteines : [bonne/alteree]
- Micronutriments : [bonne/alteree]
- Impact sur les supplements : [efficaces/gaspilles]

ALIMENTS SUSPECTS A TESTER :
1. [Aliment] - Eliminer 14 jours puis reintroduire
2. [Aliment] - Eliminer 14 jours puis reintroduire

Score digestif : X/10
`,

  "Analyse axes hormonaux": `
INSTRUCTIONS POUR "ANALYSE AXES HORMONAUX" :

HYPOTHESES HORMONALES (basees sur les symptomes) :

AXE SURRENALIEN (Cortisol) :
- Pattern estime : [normal/eleve chronique/inverse/epuise]
- Signes : [liste des symptomes qui pointent vers ca]
- Impact : [stockage abdominal, catabolisme, sommeil]

AXE GONADIQUE (Testosterone) :
- Niveau estime : [optimal/sub-optimal/bas]
- Signes : [liste des symptomes]
- Facteurs de suppression : [stress, sommeil, alcool, gras visceral]

AXE THYROIDIEN :
- Fonction estimee : [normale/ralentie/a verifier]
- Signes de ralentissement : [fatigue, frilosite, prise de poids facile]

AXE INSULINE/GLUCAGON :
- Sensibilite insuline : [bonne/moyenne/resistante]
- Signes : [stockage abdominal, cravings, energie fluctuante]

BILAN SANGUIN A DEMANDER (OBLIGATOIRE) :
Liste exacte a presenter au medecin :

- Testosterone totale et libre
- SHBG
- Estradiol
- Cortisol (8h et 16h si possible)
- Insuline a jeun + glycemie (calcul HOMA-IR)
- TSH, T3 libre, T4 libre
- Vitamine D (25-OH)
- Ferritine
- CRP ultra-sensible
- Profil lipidique complet

VALEURS OPTIMALES (pas juste "normales") :
- Testosterone totale : 600-900 ng/dL (pas juste > 300)
- Vitamine D : 50-70 ng/mL (pas juste > 30)
- Insuline a jeun : < 5 uUI/mL (pas juste < 25)
- TSH : 1-2 mIU/L (pas juste < 4)

Score donnees hormonales : X/10 (bas si pas de bilan recent)
`,

  // ============================================================
  // PROTOCOLES FERMES (mode d'emploi precis)
  // ============================================================
  "Protocole Matin Anti-Cortisol": `
INSTRUCTIONS POUR "PROTOCOLE MATIN ANTI-CORTISOL" :

C'est un MODE D'EMPLOI MINUTE PAR MINUTE. Pas de blabla, que de l'actionnable.

FORMAT OBLIGATOIRE :

=== PROTOCOLE MATIN ANTI-CORTISOL ===
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

MODE D'EMPLOI MINUTE PAR MINUTE pour un sommeil reparateur.

FORMAT OBLIGATOIRE :

=== PROTOCOLE SOIR VERROUILLAGE SOMMEIL ===
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

=== PROTOCOLE DIGESTION 14 JOURS ===
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

=== PROTOCOLE BUREAU ANTI-SEDENTARITE ===
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

=== PROTOCOLE ENTRAINEMENT PERSONNALISE ===
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

  // ============================================================
  // PLAN CONCRET
  // ============================================================
  "Plan Semaine par Semaine 30-60-90": `
INSTRUCTIONS POUR "PLAN SEMAINE PAR SEMAINE 30-60-90" :

PAS une projection, un PLAN D'ACTION detaille.

FORMAT OBLIGATOIRE :

=== PLAN D'ACTION 30-60-90 JOURS ===

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

Dashboard MESURABLE pour tracker sa progression.

FORMAT OBLIGATOIRE :

=== KPI ET TABLEAU DE BORD ===
Objectif : Mesurer pour progresser

METRIQUES QUOTIDIENNES (chaque matin) :
1. FC repos (au reveil, avant de se lever) : _____ bpm
   [Vert < 60 | Jaune 60-70 | Orange 70-80 | Rouge > 80]

2. Qualite sommeil /10 : _____
   [Vert > 7 | Jaune 5-7 | Rouge < 5]

3. Energie matin /10 : _____
   [Vert > 7 | Jaune 5-7 | Rouge < 5]

4. Ballonnements /10 : _____
   [Vert < 3 | Jaune 3-5 | Rouge > 5]

5. Cafe apres 14h : Oui / Non
   [Vert = Non | Rouge = Oui]

METRIQUES HEBDOMADAIRES (chaque dimanche) :
6. Poids : _____ kg
   Tendance : [stable/baisse/hausse]

7. Tour de taille (au nombril, a jeun) : _____ cm
   Objectif : -1cm/semaine en phase de perte

8. Pas moyens/jour : _____
   [Vert > 8000 | Jaune 5000-8000 | Rouge < 5000]

9. Verres d'alcool cette semaine : _____
   [Vert = 0 | Jaune 1-2 | Rouge > 2]

10. Seances realisees vs prevues : _____/_____
    [Vert = 100% | Jaune > 80% | Rouge < 80%]

REGLE DES 3 ROUGES :
Si tu as 3 KPI ou plus en rouge sur une semaine :
-> STOP l'intensification
-> Revenir aux fondamentaux (sommeil, digestion)
-> Reduire volume entrainement de 30%
-> Se reposer 2 jours supplementaires

REGLE DES 5 VERTS :
Si tu as 5 KPI ou plus en vert sur 2 semaines consecutives :
-> Tu peux accelerer (augmenter deficit ou intensite)
-> Passer au niveau suivant du protocole

TABLEAU DE SUIVI A IMPRIMER :

| Jour | FC | Sommeil | Energie | Ballonnements | Cafe14h |
|------|-----|---------|---------|---------------|---------|
| L    |     |         |         |               |         |
| M    |     |         |         |               |         |
| M    |     |         |         |               |         |
| J    |     |         |         |               |         |
| V    |     |         |         |               |         |
| S    |     |         |         |               |         |
| D    |     |         |         |               |         |

| Semaine | Poids | Tour taille | Pas/j | Alcool | Seances |
|---------|-------|-------------|-------|--------|---------|
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

Stack PRECIS avec dosages, timing, et marques.

FORMAT OBLIGATOIRE :

=== STACK SUPPLEMENTS OPTIMISE ===
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
[Estimation cout mensuel]

CE QU'IL NE FAUT PAS PRENDRE :
x Pre-workout avec stimulants (si entrainement soir)
x Multivitamines generiques (doses trop faibles)
x Fat burners (inutiles et dangereux)
`,

  "Synthese et Prochaines Etapes": `
INSTRUCTIONS POUR "SYNTHESE ET PROCHAINES ETAPES" :

CONCLUSION qui pousse a l'action.

FORMAT OBLIGATOIRE :

=== SYNTHESE FINALE ===

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

---
`
};

async function callGemini(prompt: string): Promise<string> {
  for (let attempt = 0; attempt < GEMINI_MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: GEMINI_TEMPERATURE,
          maxOutputTokens: GEMINI_MAX_TOKENS,
        },
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
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

  const dataStr = Object.entries(clientData)
    .filter(([_, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  let photoDataStr = '';
  if (photoAnalysis) {
    photoDataStr = `\n\nANALYSE PHOTO DISPONIBLE :\n${JSON.stringify(photoAnalysis, null, 2)}`;
  } else {
    photoDataStr = '\n\nAUCUNE PHOTO FOURNIE - Ne pas inventer de donnees visuelles.';
  }

  const fullDataStr = dataStr + photoDataStr;

  const auditParts: string[] = [];
  
  const ctaDebut = getCTADebut(tier, PRICING.PREMIUM);
  auditParts.push(ctaDebut);
  auditParts.push(`\n=== AUDIT COMPLET NEUROCORE 360 - ${fullName.toUpperCase()} ===\n`);
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

  // Génération en PARALLÈLE pour la vitesse
  const sectionPromises = SECTIONS.map(async (section, i) => {
    if (cachedSections[section]) {
      return { section, text: cachedSections[section], fromCache: true };
    }
    
    const specificInstructions = SECTION_INSTRUCTIONS[section] || "";

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

  // Assemblage dans l'ordre original
  SECTIONS.forEach((section) => {
    const res = results.find(r => r.section === section);
    if (res && res.text) {
      auditParts.push(`\n${'='.repeat(60)}\n${section.toUpperCase()}\n${'='.repeat(60)}\n`);
      auditParts.push(res.text);
    }
  });

  let fullAudit = auditParts.join('\n');
  
  const ctaFin = getCTAFin(tier, PRICING.PREMIUM);
  fullAudit += '\n\n' + ctaFin;
  
  deleteCache(auditId);
  
  const generationTime = Date.now() - startTime;
  const newSections = SECTIONS.length - sectionsFromCache;
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
      sectionsGenerated: SECTIONS.length,
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

export { SECTIONS, SECTION_INSTRUCTIONS, callGemini, loadFromCache, deleteCache };
