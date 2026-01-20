/**
 * NEUROCORE 360 - Test complet de toutes les offres
 *
 * Tests:
 * 1. Discovery Scan (GRATUIT)
 * 2. Anabolic Bioscan (PREMIUM)
 * 3. Peptides Engine
 *
 * Note: Ultimate Scan déjà testé séparément avec photos
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = "https://neurocore-360.onrender.com";
const TEST_EMAIL = process.env.TEST_EMAIL?.trim() || "";
const TEST_NAME = process.env.TEST_NAME?.trim() || "";
const SKIP_PEPTIDES = /^(1|true|yes)$/i.test(process.env.SKIP_PEPTIDES || "");
const TEST_PROFILE = (process.env.TEST_PROFILE || "cadre").toLowerCase();

const buildTestEmail = (prefix: string): string => {
  if (TEST_EMAIL) return TEST_EMAIL;
  return `test.${prefix}.${Date.now()}@achzodcoaching.com`;
};

const resolveTestName = (): string => {
  return TEST_NAME || "Julien";
};

// ============================================================================
// DONNÉES TEST RÉALISTES
// - "cadre": profil stressé (scores bas)
// - "clean": profil sain (scores hauts)
// ============================================================================

const PROFIL_CADRE_STRESSE = {
  // PROFIL BASE
  sexe: "homme",
  prenom: resolveTestName(),
  email: "", // Sera rempli dynamiquement
  instagram: "@julien_fitness",
  age: "36-45",
  taille: "171-180",
  poids: "81-90",
  objectif: "perte-graisse",

  // SANTÉ & HISTORIQUE
  "diagnostic-medical": ["aucun"],
  "traitement-medical": "non",
  "bilan-sanguin-recent": "plus-1an",
  "plateau-metabolique": "actuellement",
  "tca-historique": "jamais",
  "experience-sportive": "intermediaire",

  // SOMMEIL - Mauvais (typique cadre stressé)
  "heures-sommeil": "5-6",
  "qualite-sommeil": "mauvaise",
  endormissement: "souvent",
  "reveils-nocturnes": "souvent",
  "reveil-fatigue": "toujours",
  "heure-coucher": "apres-00h",

  // STRESS & NERVEUX - Élevé
  "niveau-stress": "tres-eleve",
  anxiete: "souvent",
  concentration: "difficile",
  irritabilite: "souvent",
  "humeur-fluctuation": "souvent",
  "gestion-stress": ["rien"],

  // ÉNERGIE - Crashs fréquents
  "energie-matin": "tres-faible",
  "energie-aprem": "crash",
  "coup-fatigue": "quotidien",
  "envies-sucre": "souvent",
  motivation: "bas",
  thermogenese: "souvent",

  // DIGESTION - Problèmes
  "digestion-qualite": "mauvaise",
  ballonnements: "apres-repas",
  transit: "variable",
  reflux: "souvent",
  intolerance: ["gluten"],
  "energie-post-repas": "crash",

  // TRAINING - Peu régulier
  "sport-frequence": "1-2",
  "type-sport": ["musculation"],
  intensite: "modere",
  recuperation: "mauvaise",
  courbatures: "toujours",
  "performance-evolution": "regression",

  // NUTRITION BASE - Mauvaise
  "nb-repas": "1-2",
  "petit-dejeuner": "jamais",
  "proteines-jour": "faible",
  "eau-jour": "moins-1L",
  "regime-alimentaire": "aucun",
  "aliments-transformes": "souvent",
  "sucres-ajoutes": "eleve",
  alcool: "4-7",

  // LIFESTYLE
  "cafe-jour": "5+",
  tabac: "non",
  "temps-ecran": "6h+",
  "exposition-soleil": "rare",
  profession: "bureau",
  "heures-assis": "8h+",

  // MINDSET
  "frustration-passee": "J'ai essayé plusieurs régimes mais je reprends toujours. Le travail me bouffe tout mon temps et mon énergie. Je mange n'importe quoi par facilité.",
  "si-rien-change": "Je vais continuer à prendre du ventre, être fatigué en permanence, et probablement avoir des problèmes de santé. Ma femme me dit que je suis irritable.",
  "ideal-6mois": "Perdre mon ventre, retrouver de l'énergie pour jouer avec mes enfants, mieux dormir, et être moins stressé au travail.",
  "plus-grosse-peur": "Faire un burnout ou avoir un problème cardiaque à cause du stress et de mon mode de vie.",
  "engagement-niveau": "8-9",
  "motivation-principale": "sante",
  "consignes-strictes": "oui",
  "temps-training-semaine": "2-4h",
};

const PROFIL_CLEAN = {
  // PROFIL BASE
  sexe: "homme",
  prenom: resolveTestName(),
  email: "",
  instagram: "@achkan",
  age: "26-35",
  taille: "171-180",
  poids: "71-80",
  objectif: "recomposition",

  // SANTÉ & HISTORIQUE
  "diagnostic-medical": ["aucun"],
  "traitement-medical": "non",
  "bilan-sanguin-recent": "moins-6mois",
  "plateau-metabolique": "jamais",
  "tca-historique": "jamais",
  "experience-sportive": "avance",

  // SOMMEIL - Bon mais perfectible
  "heures-sommeil": "7-8",
  "qualite-sommeil": "moyenne",
  endormissement: "parfois",
  "reveils-nocturnes": "parfois",
  "reveil-fatigue": "parfois",
  "heure-coucher": "23h-00h",

  // STRESS & NERVEUX - Modere
  "niveau-stress": "modere",
  anxiete: "parfois",
  concentration: "moyenne",
  irritabilite: "parfois",
  "humeur-fluctuation": "parfois",
  "gestion-stress": ["sport"],

  // ÉNERGIE - Stable avec variations
  "energie-matin": "bonne",
  "energie-aprem": "legere-baisse",
  "coup-fatigue": "parfois",
  "envies-sucre": "parfois",
  motivation: "moyen",
  thermogenese: "parfois",

  // DIGESTION - OK mais pas parfaite
  "digestion-qualite": "bonne",
  ballonnements: "parfois",
  transit: "regulier",
  reflux: "rarement",
  intolerance: ["aucune"],
  "energie-post-repas": "legere-baisse",

  // TRAINING - Regulier
  "sport-frequence": "3-4",
  "type-sport": ["musculation", "cardio"],
  intensite: "modere",
  recuperation: "moyenne",
  courbatures: "parfois",
  "performance-evolution": "progression",

  // NUTRITION BASE - Propre mais pas parfaite
  "nb-repas": "3",
  "petit-dejeuner": "souvent",
  "proteines-jour": "moyen",
  "eau-jour": "1.5-2L",
  "regime-alimentaire": "equilibre",
  "aliments-transformes": "parfois",
  "sucres-ajoutes": "modere",
  alcool: "1-3",

  // LIFESTYLE
  "cafe-jour": "3-4",
  tabac: "non",
  "temps-ecran": "4-6h",
  "exposition-soleil": "parfois",
  profession: "mixte",
  "heures-assis": "6-8h",

  // MINDSET
  "frustration-passee": "J'ai deja eu des phases moins bonnes, mais je veux optimiser.",
  "si-rien-change": "Je veux eviter la stagnation et rester performant.",
  "ideal-6mois": "Continuer a progresser sans blessure, garder un energie stable.",
  "plus-grosse-peur": "Perdre mon rythme et ma constance.",
  "engagement-niveau": "6-7",
  "motivation-principale": "performance",
  "consignes-strictes": "partiellement",
  "temps-training-semaine": "2-4h",
};

const resolveBaseProfile = () => {
  if (["clean", "propre", "sain", "healthy"].includes(TEST_PROFILE)) {
    return PROFIL_CLEAN;
  }
  return PROFIL_CADRE_STRESSE;
};

// ============================================================================
// DONNÉES SUPPLÉMENTAIRES POUR ANABOLIC BIOSCAN (PREMIUM)
// ============================================================================

const NUTRITION_DETAILLEE = {
  // Petit-déjeuner - Skip ou sucré
  "petit-dej-heure": "pas-pdj",
  "petit-dej-contenu": "Je ne prends pas de petit-déjeuner, juste 2-3 cafés",
  "petit-dej-type": "rien",

  // Déjeuner - Fast-food / sandwich
  "dejeuner-heure": "13h-14h",
  "dejeuner-contenu": "Sandwich triangle du supermarché, parfois kebab ou McDo quand je suis pressé. Coca ou jus d'orange.",
  "dejeuner-lieu": "resto-rapide",

  // Dîner - Tard et lourd
  "diner-heure": "21h-22h",
  "diner-contenu": "Pizza surgelée, pâtes au pesto, ou plat préparé micro-ondes. Souvent du fromage et du pain en plus. Parfois une bière.",
  "diner-glucides": "beaucoup",
  "diner-coucher-delai": "moins-1h",

  // Grignotage - Constant
  "grignotage-frequence": "tres-souvent",
  "grignotage-contenu": "Barres chocolatées du distributeur, biscuits, chips, parfois des bonbons. Beaucoup de café sucré.",
  "grignotage-moment": ["matin", "aprem", "soir"],

  // Cheat meals - Fréquents
  "cheatmeal-frequence": "2-3-semaine",
  "cheatmeal-contenu": "Soirées pizza-bières entre potes, burger-frites le weekend, apéro chips-saucisson régulier.",

  // Huiles et inflammatoires
  "huiles-cuisson": "tournesol",
  "aliments-inflammatoires": ["pain-blanc", "pates-blanches", "cereales-sucrees", "charcuterie", "friture", "sodas", "plats-prepares"],
};

const HORMONES_HOMME = {
  "libido-niveau": "faible",
  "erections-matinales": "rarement",
  "fatigue-chronique": "souvent",
  "masse-musculaire": "tres-difficile",
  "graisse-abdominale": "oui",
  "motivation-generale": "tres-basse",
  "pilosite-evolution": "diminution",
  "testosterone-bilan": "non",
  "age-physiologique": "plus-vieux",
  "recuperation-sexuelle": "lente",
  "humeur-hormones": "souvent",
};

const AXES_CLINIQUES = {
  "thyroide-symptomes": ["frilosite", "fatigue", "prise-poids", "constipation"],
  "sii-symptomes": ["ballonnements", "douleurs", "alternance"],
  "glycemie-symptomes": ["fringales", "fatigue-post-repas", "soif"],
  "cortisol-symptomes": ["ventre-gras", "fatigue-matin", "energie-soir", "difficulte-endormissement"],
  "inflammation-symptomes": ["raideurs", "douleurs-articulaires", "recuperation-lente"],
};

const SUPPLEMENTS = {
  "supplements-actuels": "Rien de régulier, parfois du magnésium quand j'y pense",
  "supplements-passes": "J'ai essayé des brûleurs de graisse du commerce, ça n'a rien fait",
  "budget-supplements": "30-50",
};

const BIOMARQUEURS = {
  "bilan-resultats": "Dernier bilan il y a plus d'un an, le médecin a dit que c'était 'limite' pour le cholestérol",
  "bilan-anormal": "Cholestérol un peu élevé, glycémie à jeun à 1.05",
};

const COMPOSITION = {
  "tour-taille": "98",
  "tour-hanches": "102",
  "bodyfat-estime": "25-28%",
  "objectif-bodyfat": "15-18%",
};

// ============================================================================
// FONCTIONS TEST
// ============================================================================

async function testDiscoveryScan(): Promise<{ id: string; url: string } | null> {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 TEST 1: DISCOVERY SCAN (GRATUIT)");
  console.log("=".repeat(70));

  const email = buildTestEmail("discovery");

  const responses = {
    ...resolveBaseProfile(),
    email,
  };

  try {
    console.log(`📤 Soumission Discovery Scan...`);
    console.log(`   Email: ${email}`);

    const res = await fetch(`${API_BASE}/api/audit/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        type: "GRATUIT",
        responses,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error(`❌ Erreur:`, err);
      return null;
    }

    const audit = await res.json();
    console.log(`✅ Audit créé: ${audit.id}`);
    console.log(`   URL: ${API_BASE}/audit/${audit.id}`);

    return { id: audit.id, url: `${API_BASE}/audit/${audit.id}` };
  } catch (e) {
    console.error(`❌ Erreur réseau:`, e);
    return null;
  }
}

async function testAnabolicBioscan(): Promise<{ id: string; url: string } | null> {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 TEST 2: ANABOLIC BIOSCAN (PREMIUM)");
  console.log("=".repeat(70));

  const email = buildTestEmail("anabolic");

  // Load test photos
  const PHOTOS_DIR = path.join(__dirname, "test-data/photos");
  let photoFront = "", photoSide = "", photoBack = "";

  try {
    const frontBuffer = fs.readFileSync(path.join(PHOTOS_DIR, "front.jpeg"));
    const sideBuffer = fs.readFileSync(path.join(PHOTOS_DIR, "side.jpeg"));
    const backBuffer = fs.readFileSync(path.join(PHOTOS_DIR, "back.jpeg"));

    photoFront = `data:image/jpeg;base64,${frontBuffer.toString("base64")}`;
    photoSide = `data:image/jpeg;base64,${sideBuffer.toString("base64")}`;
    photoBack = `data:image/jpeg;base64,${backBuffer.toString("base64")}`;

    console.log(`📷 Photos chargées`);
  } catch (e) {
    console.error(`⚠️ Photos non trouvées, test sans photos`);
  }

  const responses = {
    ...resolveBaseProfile(),
    ...NUTRITION_DETAILLEE,
    ...HORMONES_HOMME,
    ...AXES_CLINIQUES,
    ...SUPPLEMENTS,
    ...BIOMARQUEURS,
    ...COMPOSITION,
    email,
    photoFront,
    photoSide,
    photoBack,
  };

  try {
    console.log(`📤 Soumission Anabolic Bioscan...`);
    console.log(`   Email: ${email}`);
    console.log(`   Questions nutrition détaillée: ✅`);
    console.log(`   Hormones homme: ✅`);
    console.log(`   Axes cliniques: ✅`);

    const res = await fetch(`${API_BASE}/api/audit/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        type: "PREMIUM",
        responses,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error(`❌ Erreur:`, err);
      return null;
    }

    const audit = await res.json();
    console.log(`✅ Audit créé: ${audit.id}`);
    console.log(`   URL: ${API_BASE}/audit/${audit.id}`);

    return { id: audit.id, url: `${API_BASE}/audit/${audit.id}` };
  } catch (e) {
    console.error(`❌ Erreur réseau:`, e);
    return null;
  }
}

async function testPeptidesEngine(): Promise<{ id: string; url: string } | null> {
  console.log("\n" + "=".repeat(70));
  console.log("🧪 TEST 3: PEPTIDES ENGINE");
  console.log("=".repeat(70));

  const email = `test.peptides.${Date.now()}@achzodcoaching.com`;

  const peptidesResponses = {
    prenom: "Julien",
    age: "32",
    sexe: "homme",
    taille: "178",
    poids: "82",
    niveau_entrainement: "avance",
    objectif_principal: "recomposition",
    objectifs_secondaires: ["sommeil", "libido"],
    antecedents: ["anxiete"],
    medicaments: "aucun",
    supplements: "creatine, omega-3, magnesium",
    sommeil_qualite: "6-7",
    stress_niveau: "eleve",
    digestion: "ballonnements",
    blessures: "tendon coude droit",
    allergies: "aucune",
    frequence_entrainement: "5-6",
    type_entrainement: ["musculation", "endurance"],
    recuperation: "moyenne",
    plateau: "oui",
    masse_grasse: "15-20",
    douleurs_articulaires: "parfois",
    energie_journee: "chute",
    cardio: "1-2",
    objectifs_peptides: ["gh", "tendons", "sommeil"],
    experience_peptides: "jamais",
    tolerance_injection: "ok",
    delai: "8",
    budget: "100-200",
    suivi: "oui",
    peptides_precis: "",
    effets_secondaires: "",
    bilans_dispo: "non",
    biomarqueurs_notes: "",
    traitement_hormonal: "non",
    objectif_igf1: "optimiser",
    suivi_medical: "oui",
    timeline: "Shooting photo dans 10 semaines",
    top_resultats: "Recuperation rapide, sommeil profond, repartition graisse",
    contraintes: "Voyages frequents",
    tolerance_risque: "modere",
    niveau_engagement: "optimise",
    notes_finales: "Je veux un plan simple et execute.",
  };

  try {
    console.log(`📤 Soumission Peptides Engine...`);
    console.log(`   Email: ${email}`);

    const res = await fetch(`${API_BASE}/api/peptides-engine/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses: peptidesResponses, email }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`❌ Erreur:`, err);
      return null;
    }

    const result = await res.json();
    console.log(`✅ Analyse Peptides générée`);

    if (result.id) {
      console.log(`   Audit ID: ${result.id}`);
      console.log(`   URL: ${API_BASE}/peptides/${result.id}`);
      return { id: result.id, url: `${API_BASE}/peptides/${result.id}` };
    }

    fs.writeFileSync(
      path.join(__dirname, `test-peptides-result-${Date.now()}.json`),
      JSON.stringify(result, null, 2)
    );
    return { id: "peptides-direct", url: "voir fichier JSON" };
  } catch (e) {
    console.error(`❌ Erreur réseau:`, e);
    return null;
  }
}

async function waitForDiscoveryCompletion(auditId: string, maxWaitMinutes: number = 15): Promise<boolean> {
  console.log(`\n⏳ Attente génération rapport Discovery ${auditId}...`);
  const maxWait = maxWaitMinutes * 60 * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    try {
      const res = await fetch(`${API_BASE}/api/discovery-scan/${auditId}`);
      if (res.status === 202) {
        const status = await res.json();
        process.stdout.write(`\r   ${status.message || "Generation en cours"}...`);
      } else if (res.ok) {
        const data = await res.json();
        if (data?.sections?.length) {
          console.log(`\n✅ Rapport Discovery terminé!`);
          return true;
        }
      }
    } catch (e) {
      // Ignore
    }

    await new Promise(r => setTimeout(r, 8000));
  }

  console.log(`\n⚠️ Timeout après ${maxWaitMinutes} minutes`);
  return false;
}

async function analyzePeptidesReport(id: string): Promise<{ ok: boolean; issues: string[] }> {
  const issues: string[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/peptides-engine/${id}`);
    if (!res.ok) {
      issues.push(`❌ Fetch peptides ${res.status}`);
      return { ok: false, issues };
    }
    const report = await res.json();
    if (typeof report?.globalScore !== "number") issues.push("⚠️ Score global manquant");
    if (!report?.sections?.length) {
      issues.push("⚠️ Sections absentes");
    }
  } catch (e) {
    issues.push(`❌ Erreur analyse peptides: ${e}`);
  }
  return { ok: issues.length === 0, issues };
}

async function waitForCompletion(auditId: string, maxWaitMinutes: number = 15): Promise<boolean> {
  console.log(`\n⏳ Attente génération rapport ${auditId}...`);

  const maxWait = maxWaitMinutes * 60 * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    try {
      const res = await fetch(`${API_BASE}/api/audits/${auditId}/narrative-status`);
      const status = await res.json();

      if (status.status === "completed") {
        console.log(`\n✅ Rapport terminé!`);
        return true;
      } else if (status.status === "failed") {
        console.log(`\n❌ Génération échouée: ${status.error}`);
        return false;
      } else {
        process.stdout.write(`\r   ${status.progress || 0}% - ${status.currentSection || "..."}`);
      }
    } catch (e) {
      // Ignore
    }

    await new Promise(r => setTimeout(r, 10000));
  }

  console.log(`\n⚠️ Timeout après ${maxWaitMinutes} minutes`);
  return false;
}

async function analyzeReport(auditId: string): Promise<{
  hasAIPatterns: boolean;
  aiPatterns: string[];
  hasNutritionAnalysis: boolean;
  hasExpertSupplements: boolean;
  hasCTA: boolean;
  issues: string[];
}> {
  console.log(`\n🔍 Analyse qualité du rapport ${auditId}...`);

  const result = {
    hasAIPatterns: false,
    aiPatterns: [] as string[],
    hasNutritionAnalysis: false,
    hasExpertSupplements: false,
    hasCTA: false,
    issues: [] as string[],
  };

  try {
    const res = await fetch(`${API_BASE}/api/audits/${auditId}`);
    const audit = await res.json();

    if (!audit.narrativeReport) {
      result.issues.push("❌ Pas de narrativeReport");
      return result;
    }

    const report = audit.narrativeReport;
    const allText = JSON.stringify(report).toLowerCase();

    // Patterns IA interdits
    const aiPatterns = [
      "bonjour julien",
      "bonjour,",
      "j'espère que",
      "n'hésite pas",
      "je t'encourage",
      "il est important de noter",
      "il convient de souligner",
      "en conclusion,",
      "pour conclure,",
      "en résumé,",
      "permettez-moi",
      "je me permets",
    ];

    for (const pattern of aiPatterns) {
      if (allText.includes(pattern)) {
        result.hasAIPatterns = true;
        result.aiPatterns.push(pattern);
      }
    }

    if (result.hasAIPatterns) {
      result.issues.push(`⚠️ Patterns IA détectés: ${result.aiPatterns.join(", ")}`);
    } else {
      console.log(`   ✅ Aucun pattern IA détecté`);
    }

    // Vérifier analyse nutrition
    const nutritionKeywords = ["lipolyse", "insuline", "grignotage", "inflammatoire", "glucides"];
    const hasNutritionKeywords = nutritionKeywords.some(k => allText.includes(k));
    result.hasNutritionAnalysis = hasNutritionKeywords;

    if (!hasNutritionKeywords) {
      result.issues.push(`⚠️ Section nutrition peu détaillée (mots-clés manquants)`);
    } else {
      console.log(`   ✅ Analyse nutrition détaillée présente`);
    }

    // Vérifier compléments expert
    const supplementKeywords = ["mécanisme", "protocole", "étiquette", "dosage", "timing"];
    const hasSupplementKeywords = supplementKeywords.some(k => allText.includes(k));
    result.hasExpertSupplements = hasSupplementKeywords;

    if (!hasSupplementKeywords) {
      result.issues.push(`⚠️ Section compléments pas assez experte`);
    } else {
      console.log(`   ✅ Compléments niveau expert présents`);
    }

    // Vérifier CTA
    const ctaKeywords = ["coaching", "accompagnement", "rdv", "rendez-vous", "réserver", "prochaine étape"];
    const hasCTA = ctaKeywords.some(k => allText.includes(k));
    result.hasCTA = hasCTA;

    if (!hasCTA) {
      result.issues.push(`⚠️ CTA manquant ou peu visible`);
    } else {
      console.log(`   ✅ CTA présent`);
    }

  } catch (e) {
    result.issues.push(`❌ Erreur lors de l'analyse: ${e}`);
  }

  return result;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("\n" + "█".repeat(70));
  console.log("  NEUROCORE 360 - BATTERIE DE TESTS QUALITÉ");
  console.log("█".repeat(70));
  console.log(`\n📅 Date: ${new Date().toLocaleString("fr-FR")}`);
  console.log(`🌐 API: ${API_BASE}\n`);

  const results: {
    offer: string;
    id: string;
    url: string;
    status: "success" | "failed" | "pending";
    analysis?: Awaited<ReturnType<typeof analyzeReport>>;
  }[] = [];

  // Test 1: Discovery Scan
  const discovery = await testDiscoveryScan();
  if (discovery) {
    results.push({ offer: "Discovery Scan", ...discovery, status: "pending" });
  }

  // Test 2: Anabolic Bioscan
  const anabolic = await testAnabolicBioscan();
  if (anabolic) {
    results.push({ offer: "Anabolic Bioscan", ...anabolic, status: "pending" });
  }

  // Test 3: Peptides Engine (optionnel)
  if (!SKIP_PEPTIDES) {
    const peptides = await testPeptidesEngine();
    if (peptides) {
      results.push({ offer: "Peptides Engine", ...peptides, status: "pending" });
    }
  } else {
    console.log("⏭️  Peptides Engine saute (SKIP_PEPTIDES=1)");
  }

  // Attendre génération et analyser
  console.log("\n" + "=".repeat(70));
  console.log("📊 ATTENTE GÉNÉRATION ET ANALYSE");
  console.log("=".repeat(70));

  for (const r of results) {
    if (r.offer === "Peptides Engine") {
      if (r.id !== "peptides-direct") {
        const peptidesAnalysis = await analyzePeptidesReport(r.id);
        r.status = peptidesAnalysis.ok ? "success" : "failed";
        if (peptidesAnalysis.issues.length > 0) {
          r.analysis = {
            hasAIPatterns: false,
            aiPatterns: [],
            hasNutritionAnalysis: false,
            hasExpertSupplements: false,
            hasCTA: false,
            issues: peptidesAnalysis.issues,
          };
        }
      }
      continue;
    }

    const completed =
      r.offer === "Discovery Scan"
        ? await waitForDiscoveryCompletion(r.id)
        : await waitForCompletion(r.id);
    r.status = completed ? "success" : "failed";

    if (completed) {
      r.analysis = await analyzeReport(r.id);
    }
  }

  // Rapport final
  console.log("\n" + "█".repeat(70));
  console.log("  RAPPORT FINAL");
  console.log("█".repeat(70));

  for (const r of results) {
    console.log(`\n📋 ${r.offer}`);
    console.log(`   ID: ${r.id}`);
    console.log(`   URL: ${r.url}`);
    console.log(`   Status: ${r.status}`);

    if (r.analysis) {
      console.log(`   Patterns IA: ${r.analysis.hasAIPatterns ? "⚠️ OUI" : "✅ NON"}`);
      console.log(`   Nutrition détaillée: ${r.analysis.hasNutritionAnalysis ? "✅" : "⚠️"}`);
      console.log(`   Compléments expert: ${r.analysis.hasExpertSupplements ? "✅" : "⚠️"}`);
      console.log(`   CTA: ${r.analysis.hasCTA ? "✅" : "⚠️"}`);

      if (r.analysis.issues.length > 0) {
        console.log(`   Issues:`);
        r.analysis.issues.forEach(i => console.log(`     ${i}`));
      }
    }
  }

  // Ajouter Ultimate Scan déjà généré
  console.log(`\n📋 Ultimate Scan (généré précédemment)`);
  console.log(`   ID: ebc7b23d-da3e-4b8d-9d20-bbb5078cef7f`);
  console.log(`   URL: ${API_BASE}/audit/ebc7b23d-da3e-4b8d-9d20-bbb5078cef7f`);

  const ultimateAnalysis = await analyzeReport("ebc7b23d-da3e-4b8d-9d20-bbb5078cef7f");
  console.log(`   Patterns IA: ${ultimateAnalysis.hasAIPatterns ? "⚠️ OUI" : "✅ NON"}`);
  console.log(`   Nutrition détaillée: ${ultimateAnalysis.hasNutritionAnalysis ? "✅" : "⚠️"}`);
  console.log(`   Compléments expert: ${ultimateAnalysis.hasExpertSupplements ? "✅" : "⚠️"}`);
  console.log(`   CTA: ${ultimateAnalysis.hasCTA ? "✅" : "⚠️"}`);

  console.log("\n" + "=".repeat(70));
  console.log("✅ TESTS TERMINÉS");
  console.log("=".repeat(70));
}

main().catch(console.error);
