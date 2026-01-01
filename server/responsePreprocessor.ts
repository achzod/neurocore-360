type Responses = Record<string, unknown>;

// === CLÉS BLOQUÉES : mensurations déclaratives à filtrer avant envoi IA ===
// Ces données sont auto-déclarées et peu fiables - seules les photos font foi pour l'anthropométrie
// CRITICAL: Extended list with all spelling variants to prevent any anthropometric data from reaching AI
const BLOCKED_DECLARATIVE_KEYS = [
  // Body fat / masse grasse
  "masse-grasse",
  "masse_grasse",
  "massegrasse",
  "masse-grasse-estime",
  "bf-estime",
  "body-fat",
  "bodyFat",
  "bf",
  "pourcentage-graisse",
  // Measurements
  "tour-taille",
  "tour_taille",
  "tourtaille",
  "tour-de-taille",
  "tour_de_taille",
  "tour-hanches",
  "tour_hanches",
  "tourhanches",
  "tour-de-hanches",
  "tour_de_hanche",
  "tour-de-hanche",
  // Ratios
  "imc",
  "bmi",
  "ratio_taille_hanches",
  "ratio-taille-hanches",
  "ratio-taille-hanche",
  "waist-hip-ratio",
  // Morphology
  "morphologie",
  "morphotype",
  "type-morphologique",
  "somatotype",
  // Body composition estimates
  "zones-stockage",
  "zones_stockage",
  "zonestockage",
  "zone-stockage",
  "retention-eau",
  "retention_eau",
  "retentioneau",
  "cellulite",
  "evolution-poids",
  "evolution_poids",
  "objectif-poids",
  "objectif_poids",
];

/**
 * Filtre les réponses pour retirer les mensurations déclaratives
 * Conserve taille/poids car utiles pour calculs métaboliques
 */
export function filterDeclarativeMetrics(responses: Responses): Responses {
  return Object.fromEntries(
    Object.entries(responses).filter(([key]) => !BLOCKED_DECLARATIVE_KEYS.includes(key))
  );
}

interface SectionData {
  sectionId: string;
  sectionTitle: string;
  responses: Array<{
    questionId: string;
    questionLabel: string;
    answer: string;
    answerLabel: string;
  }>;
  redFlags: string[];
  insights: string[];
}

const SECTION_QUESTIONS: Record<string, Array<{ id: string; label: string; options?: Array<{ value: string; label: string }> }>> = {
  "profil-base": [
    { id: "age", label: "Tranche d'age", options: [{ value: "18-25", label: "18-25 ans" }, { value: "26-35", label: "26-35 ans" }, { value: "36-45", label: "36-45 ans" }, { value: "46-55", label: "46-55 ans" }, { value: "56+", label: "56 ans et plus" }] },
    { id: "sexe", label: "Sexe biologique", options: [{ value: "homme", label: "Homme" }, { value: "femme", label: "Femme" }] },
    { id: "taille", label: "Taille", options: [{ value: "150-160", label: "150-160 cm" }, { value: "161-170", label: "161-170 cm" }, { value: "171-180", label: "171-180 cm" }, { value: "181-190", label: "181-190 cm" }, { value: "191+", label: "Plus de 190 cm" }] },
    { id: "poids", label: "Poids actuel", options: [{ value: "50-60", label: "50-60 kg" }, { value: "61-70", label: "61-70 kg" }, { value: "71-80", label: "71-80 kg" }, { value: "81-90", label: "81-90 kg" }, { value: "91-100", label: "91-100 kg" }, { value: "100+", label: "Plus de 100 kg" }] },
    { id: "objectif", label: "Objectif principal", options: [{ value: "perte-graisse", label: "Perte de graisse" }, { value: "prise-muscle", label: "Prise de muscle" }, { value: "performance", label: "Performance sportive" }, { value: "sante", label: "Sante generale" }, { value: "energie", label: "Plus d'energie" }, { value: "recomposition", label: "Recomposition corporelle" }] },
    { id: "profession", label: "Type de travail" },
    { id: "niveau-activite", label: "Niveau d'activite quotidienne" },
    { id: "historique-medical", label: "Antecedents medicaux" },
    { id: "medicaments", label: "Medicaments actuels" },
    { id: "allergies", label: "Allergies alimentaires" },
  ],
  "composition-corporelle": [
    // NOTE: All self-reported body measurements (tours, BF%, ratio, morphotype) are BLOCKED
    // Only photoAnalysis provides valid anthropometric data
    { id: "regimes-passes", label: "Nombre de regimes essayes" },
    // Blocked keys removed: tour-taille, tour-hanches, masse-grasse, objectif-poids, 
    // evolution-poids, morphologie, zones-stockage, retention-eau, cellulite
  ],
  "metabolisme-energie": [
    { id: "niveau-energie-matin", label: "Energie le matin" },
    { id: "niveau-energie-aprem", label: "Energie l'apres-midi" },
    { id: "niveau-energie-soir", label: "Energie le soir" },
    { id: "coup-fatigue", label: "Coups de fatigue" },
    { id: "heure-coup-fatigue", label: "Heure du coup de fatigue" },
    { id: "thermogenese", label: "Sensibilite au froid" },
    { id: "sudation", label: "Transpiration" },
    { id: "metabolisme-percu", label: "Metabolisme percu" },
    { id: "envies-sucre", label: "Envies de sucre" },
    { id: "faim-frequence", label: "Frequence de la faim" },
  ],
  "nutrition-tracking": [
    { id: "nb-repas", label: "Nombre de repas/jour" },
    { id: "petit-dejeuner", label: "Petit-dejeuner" },
    { id: "type-petit-dej", label: "Type de petit-dejeuner" },
    { id: "tracking-calories", label: "Tracking calories" },
    { id: "calories-jour", label: "Calories quotidiennes estimees" },
    { id: "proteines-jour", label: "Proteines par jour" },
    { id: "proteines-repas", label: "Proteines par repas" },
    { id: "eau-jour", label: "Eau par jour" },
    { id: "legumes-jour", label: "Portions legumes/jour" },
    { id: "regime-alimentaire", label: "Regime alimentaire" },
    { id: "supplements", label: "Supplements actuels" },
    { id: "repas-exterieur", label: "Repas exterieur/semaine" },
  ],
  "digestion-microbiome": [
    { id: "digestion-qualite", label: "Qualite digestion" },
    { id: "ballonnements", label: "Ballonnements" },
    { id: "transit", label: "Transit intestinal" },
    { id: "reflux", label: "Reflux gastriques" },
    { id: "intolerance", label: "Intolerances alimentaires" },
    { id: "probiotiques", label: "Prise probiotiques" },
    { id: "aliments-fermentes", label: "Aliments fermentes" },
    { id: "antibiotiques-recent", label: "Antibiotiques recents" },
    { id: "selles-aspect", label: "Aspect selles" },
    { id: "douleurs-abdominales", label: "Douleurs abdominales" },
  ],
  "activite-performance": [
    { id: "sport-frequence", label: "Frequence sport/semaine" },
    { id: "type-sport", label: "Types d'activites" },
    { id: "duree-seance", label: "Duree seance moyenne" },
    { id: "intensite-entrainement", label: "Intensite entrainements" },
    { id: "recuperation", label: "Qualite recuperation" },
    { id: "courbatures", label: "Frequence courbatures" },
    { id: "performance-evolution", label: "Evolution performances" },
    { id: "blessures", label: "Blessures/douleurs" },
    { id: "echauffement", label: "Echauffement" },
    { id: "etirements", label: "Etirements" },
  ],
  "sommeil-recuperation": [
    { id: "heures-sommeil", label: "Heures de sommeil" },
    { id: "qualite-sommeil", label: "Qualite sommeil" },
    { id: "heure-coucher", label: "Heure coucher" },
    { id: "heure-lever", label: "Heure lever" },
    { id: "endormissement", label: "Temps endormissement" },
    { id: "reveils-nocturnes", label: "Reveils nocturnes" },
    { id: "reveil-repose", label: "Reveil repose" },
    { id: "sieste", label: "Sieste" },
    { id: "ecrans-soir", label: "Ecrans avant dormir" },
    { id: "chambre-temperature", label: "Temperature chambre" },
  ],
  "hrv-cardiaque": [
    { id: "hrv-mesure", label: "Mesure HRV" },
    { id: "hrv-valeur", label: "Valeur HRV moyenne" },
    { id: "fc-repos", label: "Frequence cardiaque repos" },
    { id: "tension-arterielle", label: "Tension arterielle" },
    { id: "montre-connectee", label: "Montre connectee" },
    { id: "type-montre", label: "Type de montre" },
    { id: "palpitations", label: "Palpitations" },
    { id: "essoufflement", label: "Essoufflement" },
  ],
  "analyses-biomarqueurs": [
    { id: "bilan-sanguin-recent", label: "Bilan sanguin recent" },
    { id: "glycemie-statut", label: "Glycemie a jeun" },
    { id: "cholesterol-statut", label: "Cholesterol" },
    { id: "vitamine-d-statut", label: "Vitamine D" },
    { id: "fer-statut", label: "Fer/Ferritine" },
    { id: "thyroide-statut", label: "Thyroide" },
    { id: "crp-statut", label: "CRP (inflammation)" },
    { id: "testosterone-statut", label: "Testosterone" },
    { id: "omega3-index", label: "Index Omega-3" },
    { id: "homocysteine-statut", label: "Homocysteine" },
  ],
  "hormones-stress": [
    { id: "niveau-stress", label: "Niveau stress quotidien" },
    { id: "stress-sources", label: "Sources de stress" },
    { id: "anxiete", label: "Anxiete" },
    { id: "irritabilite", label: "Irritabilite" },
    { id: "humeur-variations", label: "Variations d'humeur" },
    { id: "libido", label: "Libido" },
    { id: "energie-mentale", label: "Energie mentale" },
    { id: "concentration", label: "Capacite concentration" },
    { id: "motivation", label: "Motivation" },
    { id: "gestion-stress", label: "Techniques gestion stress" },
  ],
  "lifestyle-substances": [
    { id: "alcool-frequence", label: "Frequence alcool" },
    { id: "alcool-quantite", label: "Quantite alcool" },
    { id: "tabac", label: "Tabac" },
    { id: "cannabis", label: "Cannabis" },
    { id: "cafeine", label: "Consommation cafeine" },
    { id: "cafeine-heure", label: "Derniere cafeine" },
    { id: "drogues-recreatives", label: "Substances recreatives" },
    { id: "temps-ecran", label: "Temps ecran/jour" },
    { id: "nature-exposition", label: "Exposition nature" },
    { id: "lumiere-naturelle", label: "Lumiere naturelle" },
  ],
  "biomecanique-mobilite": [
    { id: "douleurs-articulaires", label: "Douleurs articulaires" },
    { id: "zones-douleur", label: "Zones de douleur" },
    { id: "mobilite-generale", label: "Mobilite generale" },
    { id: "posture-travail", label: "Posture au travail" },
    { id: "temps-assis", label: "Temps assis/jour" },
    { id: "souplesse", label: "Souplesse" },
    { id: "equilibre", label: "Equilibre" },
    { id: "force-grip", label: "Force de prehension" },
    { id: "respiration", label: "Qualite respiration" },
    { id: "tensions-musculaires", label: "Tensions musculaires" },
  ],
  "psychologie-mental": [
    { id: "bien-etre-general", label: "Bien-etre general" },
    { id: "estime-soi", label: "Estime de soi" },
    { id: "satisfaction-vie", label: "Satisfaction vie" },
    { id: "objectifs-clairs", label: "Objectifs clairs" },
    { id: "resilience", label: "Resilience" },
    { id: "sommeil-mental", label: "Impact sommeil sur mental" },
    { id: "relations-sociales", label: "Relations sociales" },
    { id: "solitude", label: "Sentiment solitude" },
    { id: "gratitude", label: "Pratique gratitude" },
    { id: "meditation", label: "Meditation/mindfulness" },
  ],
  "neurotransmetteurs": [
    { id: "energie-mentale-matin", label: "Energie mentale matin" },
    { id: "focus-travail", label: "Focus au travail" },
    { id: "procrastination", label: "Procrastination" },
    { id: "creativite", label: "Creativite" },
    { id: "memoire", label: "Memoire" },
    { id: "brouillard-mental", label: "Brouillard mental" },
    { id: "humeur-matin", label: "Humeur au reveil" },
    { id: "addiction-dopamine", label: "Comportements addictifs" },
    { id: "recompense-sensibilite", label: "Sensibilite recompense" },
    { id: "impulsivite", label: "Impulsivite" },
  ],
};

const SECTION_TITLES: Record<string, string> = {
  "profil-base": "Profil de Base",
  "composition-corporelle": "Composition Corporelle",
  "metabolisme-energie": "Metabolisme et Energie",
  "nutrition-tracking": "Nutrition et Suivi Alimentaire",
  "digestion-microbiome": "Digestion et Microbiome",
  "activite-performance": "Activite Physique et Performance",
  "sommeil-recuperation": "Sommeil et Recuperation",
  "hrv-cardiaque": "Variabilite Cardiaque et Sante Cardiovasculaire",
  "analyses-biomarqueurs": "Analyses Sanguines et Biomarqueurs",
  "hormones-stress": "Equilibre Hormonal et Gestion du Stress",
  "lifestyle-substances": "Mode de Vie et Substances",
  "biomecanique-mobilite": "Biomecanique et Mobilite",
  "psychologie-mental": "Psychologie et Sante Mentale",
  "neurotransmetteurs": "Neurotransmetteurs et Cognition",
};

const RED_FLAG_RULES: Record<string, (answer: string) => boolean> = {
  "heures-sommeil": (a) => ["moins-5", "5-6", "6-7"].includes(a),
  "qualite-sommeil": (a) => ["mauvaise", "moyenne"].includes(a),
  "niveau-stress": (a) => ["eleve", "extreme"].includes(a),
  "niveau-energie-matin": (a) => ["tres-bas", "bas"].includes(a),
  "niveau-energie-aprem": (a) => ["tres-bas", "bas"].includes(a),
  "coup-fatigue": (a) => ["souvent", "toujours"].includes(a),
  "envies-sucre": (a) => ["souvent", "constamment"].includes(a),
  "ballonnements": (a) => ["souvent", "toujours"].includes(a),
  "transit": (a) => ["constipation", "irregulier"].includes(a),
  "digestion-qualite": (a) => a === "mauvaise",
  "proteines-jour": (a) => a === "faible",
  "eau-jour": (a) => ["moins-1L", "1-1.5L"].includes(a),
  "sport-frequence": (a) => ["0", "1"].includes(a),
  "reveils-nocturnes": (a) => a === "souvent",
  "reveil-repose": (a) => ["jamais", "rarement"].includes(a),
  "ecrans-soir": (a) => a === "toujours",
  "alcool-frequence": (a) => ["quotidien", "plusieurs-jour"].includes(a),
  "tabac": (a) => a !== "non" && a !== "jamais",
  "brouillard-mental": (a) => ["souvent", "toujours"].includes(a),
  "anxiete": (a) => ["elevee", "severe"].includes(a),
  "palpitations": (a) => a === "souvent",
  "douleurs-articulaires": (a) => ["souvent", "toujours"].includes(a),
  "temps-assis": (a) => ["6-8h", "8h+"].includes(a),
  "cafeine": (a) => ["3-4", "5+"].includes(a),
};

function formatAnswer(answer: unknown): string {
  if (Array.isArray(answer)) {
    return answer.join(", ");
  }
  return String(answer || "Non renseigne");
}

export function preprocessResponses(responses: Responses): {
  allSections: SectionData[];
  globalProfile: string;
  criticalRedFlags: string[];
  strengthIndicators: string[];
} {
  // Appliquer le filtre des mensurations déclaratives
  const filteredResponses = filterDeclarativeMetrics(responses);
  
  const allSections: SectionData[] = [];
  const criticalRedFlags: string[] = [];
  const strengthIndicators: string[] = [];

  for (const [sectionId, questions] of Object.entries(SECTION_QUESTIONS)) {
    const sectionResponses: SectionData["responses"] = [];
    const sectionRedFlags: string[] = [];
    const sectionInsights: string[] = [];

    for (const q of questions) {
      // Skip les clés bloquées
      if (BLOCKED_DECLARATIVE_KEYS.includes(q.id)) continue;
      
      const answer = filteredResponses[q.id];
      const answerStr = formatAnswer(answer);
      
      sectionResponses.push({
        questionId: q.id,
        questionLabel: q.label,
        answer: String(answer || ""),
        answerLabel: answerStr,
      });

      if (RED_FLAG_RULES[q.id] && answer && RED_FLAG_RULES[q.id](String(answer))) {
        const flag = `${q.label}: ${answerStr}`;
        sectionRedFlags.push(flag);
        criticalRedFlags.push(`[${SECTION_TITLES[sectionId]}] ${flag}`);
      }
    }

    allSections.push({
      sectionId,
      sectionTitle: SECTION_TITLES[sectionId],
      responses: sectionResponses,
      redFlags: sectionRedFlags,
      insights: sectionInsights,
    });
  }

  const globalProfile = buildGlobalProfile(responses);

  return {
    allSections,
    globalProfile,
    criticalRedFlags,
    strengthIndicators,
  };
}

function buildGlobalProfile(responses: Responses): string {
  const age = responses["age"] || "non renseigne";
  const sexe = responses["sexe"] || "non renseigne";
  const taille = responses["taille"] || "non renseigne";
  const poids = responses["poids"] || "non renseigne";
  const objectif = responses["objectif"] || "non renseigne";
  const profession = responses["profession"] || "non renseigne";
  const activite = responses["niveau-activite"] || "non renseigne";
  const sommeil = responses["heures-sommeil"] || responses["qualite-sommeil"] || "non renseigne";
  const stress = responses["niveau-stress"] || "non renseigne";
  const sportFreq = responses["sport-frequence"] || "non renseigne";
  const typeSport = responses["type-sport"] || "non renseigne";
  const eau = responses["eau-jour"] || "non renseigne";

  return `PROFIL CLIENT EXACT :
- Identite: ${sexe}, ${age}, ${taille} cm, ${poids} kg
- Objectif principal: ${objectif}
- Profession: ${profession}, niveau activite quotidienne: ${activite}
- Sport: ${sportFreq} fois/semaine, type: ${typeSport}
- Sommeil: ${sommeil}
- Stress: ${stress}
- Hydratation: ${eau}/jour`;
}

export function getSectionPromptData(sectionId: string, responses: Responses): string {
  // CRITICAL: Apply declarative metrics filter BEFORE processing
  const filteredResponses = filterDeclarativeMetrics(responses);
  const data = preprocessResponses(filteredResponses);
  const normalizedId = sectionId.replace(/-/g, "");
  const section = data.allSections.find(s => 
    s.sectionId === sectionId || 
    s.sectionId.replace(/-/g, "") === normalizedId
  );
  
  if (!section) {
    return "Aucune donnee disponible pour cette section.";
  }

  let output = `\n=== FAITS : REPONSES EXACTES DU CLIENT ===\n`;
  
  // Filter out any remaining blocked keys from the formatted output
  const answeredQuestions = section.responses.filter(r => 
    r.answer && 
    r.answer !== "Non renseigne" && 
    r.answer !== "" &&
    !BLOCKED_DECLARATIVE_KEYS.includes(r.questionId)
  );
  
  // Special warning for photo-dependent sections
  if (sectionId === "composition-corporelle" || sectionId === "biomecanique-mobilite") {
    output += `AVERTISSEMENT: Les donnees anthropometriques declaratives (tours, BF%, ratio, morphotype) sont BLOQUEES.\n`;
    output += `Cette section doit se baser UNIQUEMENT sur photoAnalysis si disponible.\n\n`;
  }
  
  for (const r of answeredQuestions) {
    output += `FAIT: ${r.questionLabel} = "${r.answerLabel}"\n`;
  }

  if (section.redFlags.length > 0) {
    output += `\n=== ALERTES A ADRESSER ===\n`;
    for (const flag of section.redFlags) {
      output += `ALERTE: ${flag}\n`;
    }
  }

  return output;
}

export function getAllResponsesFormatted(responses: Responses): string {
  // Appliquer le filtrage des mensurations déclaratives AVANT tout traitement
  const filteredResponses = filterDeclarativeMetrics(responses);
  const data = preprocessResponses(filteredResponses);
  
  let output = `${data.globalProfile}\n\n`;
  
  if (data.criticalRedFlags.length > 0) {
    output += `=== ALERTES CRITIQUES (scores bas) ===\n`;
    for (const flag of data.criticalRedFlags) {
      output += `ALERTE: ${flag}\n`;
    }
    output += `\n`;
  }

  output += `=== TOUTES LES REPONSES EXACTES ===\n\n`;
  
  for (const section of data.allSections) {
    const answeredQuestions = section.responses.filter(r => 
      r.answer && r.answer !== "Non renseigne" && r.answer !== ""
    );
    
    if (answeredQuestions.length > 0) {
      output += `--- ${section.sectionTitle} ---\n`;
      for (const r of answeredQuestions) {
        output += `${r.questionLabel}: "${r.answerLabel}"\n`;
      }
      output += `\n`;
    }
  }

  return output;
}

export function buildCausalChains(responses: Responses, scores: Record<string, number>): string {
  // Appliquer le filtrage des mensurations déclaratives
  const filtered = filterDeclarativeMetrics(responses);
  const chains: string[] = [];
  
  const stress = filtered["niveau-stress"] as string;
  const sommeil = filtered["heures-sommeil"] as string;
  const qualiteSommeil = filtered["qualite-sommeil"] as string;
  const sport = filtered["type-sport"] as string;
  const sportFreq = filtered["sport-frequence"] as string;
  const objectif = filtered["objectif"] as string;
  const energieMatin = filtered["niveau-energie-matin"] as string;
  const energieAprem = filtered["niveau-energie-aprem"] as string;
  const cafeine = filtered["cafeine"] as string;
  const tempsAssis = filtered["temps-assis"] as string;
  const eau = filtered["eau-jour"] as string;
  const proteines = filtered["proteines-repas"] as string;

  if (stress === "eleve" && (sommeil === "6-7" || sommeil === "5-6")) {
    chains.push(`CAUSE: Stress eleve + Sommeil ${sommeil}h = Cortisol chroniquement eleve. EFFET: Catabolisme musculaire, stockage graisse abdominale, insulinoresistance. Le training ne compense pas - tu dois dormir plus.`);
  }

  if ((sommeil === "6-7" || sommeil === "5-6") && (sport?.includes("HIIT") || sport?.includes("muscu"))) {
    chains.push(`CAUSE: Sommeil ${sommeil}h + entrainement intensif. EFFET: Recuperation incomplete, risque de surentrainement, cortisol eleve le lendemain. Tes seances deviennent contre-productives sans 7.5h+ de sommeil.`);
  }

  if (objectif === "recomposition" && stress === "eleve") {
    chains.push(`CAUSE: Objectif recomposition + stress eleve. EFFET: Le cortisol bloque la lipolyse et favorise le catabolisme. Tu ne peux pas recomposer en mode stress chronique - priorite 1 = reduire cortisol.`);
  }

  if ((energieAprem === "bas" || energieAprem === "tres-bas") && cafeine) {
    chains.push(`CAUSE: Crash energie apres-midi + consommation cafeine. EFFET: Le cafe masque la fatigue mais aggrave le probleme (dette de sommeil, adenosine). Ton crash a ${responses["heure-coup-fatigue"] || "15h"} est un symptome de glycemie instable ou manque de sommeil.`);
  }

  if (tempsAssis === "8h+" && (scores["biomecaniquemobilite"] || 0) < 70) {
    chains.push(`CAUSE: ${tempsAssis} assis/jour. EFFET: Psoas raccourci, glutes inhibes, cyphose thoracique. Ton training est limite par ta posture - 10min mobilite/jour avant de pousser plus lourd.`);
  }

  if ((eau === "1-1.5L" || eau === "1.5-2L") && objectif === "recomposition") {
    chains.push(`CAUSE: Hydratation ${eau} pour objectif recomposition. EFFET: -3 a 5% metabolisme basal, retention eau paradoxale, performance reduite. Minimum 2.5-3L/jour pour ton objectif.`);
  }

  if (proteines === "rarement" || proteines === "jamais") {
    chains.push(`CAUSE: Proteines insuffisantes a chaque repas. EFFET: Seuil leucine non atteint (3g minimum), synthese proteique sub-optimale. Tu perds du muscle meme en training si proteines < 1.6g/kg.`);
  }

  if (qualiteSommeil === "moyenne" && stress === "eleve") {
    chains.push(`CAUSE: Qualite sommeil moyenne + stress eleve. EFFET: Architecture sommeil perturbee (moins de SWS et REM), GH reduite de 60%, testosterone impactee. Le stress sabote ton sommeil meme si tu dors assez d'heures.`);
  }

  return chains.length > 0 
    ? `\n=== CASCADES CAUSALES IDENTIFIEES (cite ces connexions) ===\n${chains.join("\n\n")}\n`
    : "";
}

export function buildKeyFactsForSection(sectionId: string, responses: Responses): string {
  // Appliquer le filtrage des mensurations déclaratives
  const filteredResponses = filterDeclarativeMetrics(responses);
  
  // NETTOYÉ: plus de mensurations déclaratives dans keyFactsMap
  const keyFactsMap: Record<string, string[]> = {
    "profil-base": ["age", "sexe", "taille", "poids", "objectif", "profession", "niveau-activite"],
    "composition-corporelle": ["poids", "objectif", "regimes-passes"], // NETTOYÉ: retiré tour-taille, zones-stockage, evolution-poids, masse-grasse
    "metabolisme-energie": ["niveau-energie-matin", "niveau-energie-aprem", "coup-fatigue", "heure-coup-fatigue", "envies-sucre", "faim-frequence"],
    "nutrition-tracking": ["nb-repas", "proteines-jour", "proteines-repas", "eau-jour", "legumes-jour", "tracking-calories", "petit-dejeuner"],
    "digestion-microbiome": ["digestion-qualite", "ballonnements", "transit", "intolerance", "probiotiques"],
    "activite-performance": ["sport-frequence", "type-sport", "duree-seance", "intensite-entrainement", "recuperation", "courbatures"],
    "sommeil-recuperation": ["heures-sommeil", "qualite-sommeil", "heure-coucher", "heure-lever", "reveils-nocturnes", "ecrans-soir"],
    "hrv-cardiaque": ["hrv-mesure", "fc-repos", "tension-arterielle", "palpitations", "essoufflement"],
    "analyses-biomarqueurs": ["bilan-sanguin-recent", "glycemie-statut", "vitamine-d-statut", "fer-statut", "testosterone-statut"],
    "hormones-stress": ["niveau-stress", "stress-sources", "anxiete", "libido", "energie-mentale", "concentration", "motivation"],
    "lifestyle-substances": ["alcool-frequence", "tabac", "cafeine", "cafeine-heure", "temps-ecran", "lumiere-naturelle"],
    "biomecanique-mobilite": ["douleurs-articulaires", "zones-douleur", "posture-travail", "temps-assis", "souplesse", "tensions-musculaires"],
    "psychologie-mental": ["bien-etre-general", "estime-soi", "resilience", "relations-sociales", "meditation", "gratitude"],
    "neurotransmetteurs": ["focus-travail", "procrastination", "brouillard-mental", "memoire", "humeur-matin", "addiction-dopamine", "impulsivite"],
  };

  const crossSectionFacts = ["niveau-stress", "heures-sommeil", "qualite-sommeil", "objectif", "type-sport", "sport-frequence", "profession"];

  const normalizedId = sectionId.replace(/-/g, "");
  const sectionKey = Object.keys(keyFactsMap).find(k => k.replace(/-/g, "") === normalizedId) || sectionId;
  const relevantKeys = keyFactsMap[sectionKey] || [];
  const allKeys = Array.from(new Set([...relevantKeys, ...crossSectionFacts]));

  const facts: string[] = [];
  for (const key of allKeys) {
    // Utiliser les réponses filtrées
    const value = filteredResponses[key];
    if (value && value !== "Non renseigne" && value !== "") {
      facts.push(`${key}: "${value}"`);
    }
  }

  if (facts.length === 0) return "";

  return `\n=== FAITS CLES A CITER (utilise ces valeurs exactes) ===\n${facts.join("\n")}\n`;
}

export function getNeurotransmitterProfile(responses: Responses): string {
  const focus = responses["focus-travail"] as string;
  const procrastination = responses["procrastination"] as string;
  const humeurMatin = responses["humeur-matin"] as string;
  const brouillard = responses["brouillard-mental"] as string;
  const memoire = responses["memoire"] as string;
  const anxiete = responses["anxiete"] as string;
  const irritabilite = responses["irritabilite"] as string;
  const addictionDopamine = responses["addiction-dopamine"] as string;
  const energieMentale = responses["energie-mentale-matin"] as string;

  const profile: string[] = [];

  if (procrastination === "souvent" || procrastination === "toujours" || addictionDopamine === "souvent") {
    profile.push("DOPAMINE BASSE: Procrastination, besoin stimulation constante, difficulte a demarrer les taches. Stack: L-Tyrosine 500mg matin, Mucuna (15% L-DOPA) 100mg max.");
  }

  if (humeurMatin === "mauvaise" || humeurMatin === "tres-mauvaise") {
    profile.push("SEROTONINE BASSE: Humeur matin negative, irritabilite, envies sucre. Stack: 5-HTP 50-100mg soir (jamais avec ISRS), Saffron 30mg.");
  }

  if (anxiete === "elevee" || anxiete === "severe" || irritabilite === "souvent") {
    profile.push("GABA BAS / GLUTAMATE ELEVE: Anxiete, tension, difficulte a se relaxer. Stack: L-Theanine 200-400mg, Magnesium Glycinate 400mg, Taurine 2g.");
  }

  if (brouillard === "souvent" || brouillard === "toujours" || memoire === "mauvaise") {
    profile.push("ACETYLCHOLINE BASSE: Brouillard mental, memoire faible, difficulte concentration. Stack: Alpha-GPC 300mg matin, CDP-Choline 250mg, Huperzine A 100mcg.");
  }

  if (focus === "mauvais" || energieMentale === "bas" || energieMentale === "tres-bas") {
    profile.push("NORADRENALINE BASSE: Focus faible, energie mentale basse, motivation fluctuante. Stack: L-Tyrosine 500-1000mg matin a jeun, Rhodiola 300mg.");
  }

  return profile.length > 0 
    ? `\n=== PROFIL NEUROTRANSMETTEURS (base sur reponses) ===\n${profile.join("\n")}\n`
    : "\nPROFIL NEUROTRANSMETTEURS: Pas de desequilibre majeur detecte dans les reponses.\n";
}
