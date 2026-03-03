type Responses = Record<string, unknown>;
export type NormalizeMode = "analysis" | "discovery";

const RESPONSE_ALIASES: Record<string, string[]> = {
  // Bidirectional aliases: scoring engine keys ↔ questionnaire keys
  "coups-fatigue": ["coup-fatigue"],
  "coup-fatigue": ["coups-fatigue"],
  "energie-matin": ["niveau-energie-matin"],
  "niveau-energie-matin": ["energie-matin"],
  "energie-aprem": ["niveau-energie-aprem", "energie-apres-midi"],
  "niveau-energie-aprem": ["energie-aprem", "energie-apres-midi"],
  "energie-apres-midi": ["niveau-energie-aprem", "energie-aprem"],
  "energie-soir": ["niveau-energie-soir"],
  "niveau-energie-soir": ["energie-soir"],
  "digestion-generale": ["digestion-qualite"],
  "digestion-qualite": ["digestion-generale"],
  "historique-medical": ["diagnostic-medical"],
  "diagnostic-medical": ["historique-medical"],
  "hydratation": ["eau-jour"],
  "eau-jour": ["hydratation"],
  "libido": ["libido-homme", "libido-femme"],
  "masse-grasse": ["masse-grasse-estimee"],
  "masse-grasse-estimee": ["masse-grasse"],
  "blessures": ["blessures-passees"],
  "blessures-passees": ["blessures"],
  "blocages-perso": ["blocages"],
  "blocages": ["blocages-perso"],
  "repas-jour": ["nb-repas"],
  "nb-repas": ["repas-jour"],
  "proteines-repas": ["proteines-jour"],
  "proteines-jour": ["proteines-repas"],
  "tracking": ["tracking-calories"],
  "tracking-calories": ["tracking"],
  "stress-niveau": ["niveau-stress"],
  "niveau-stress": ["stress-niveau"],
  "stress-chronique": ["niveau-stress"],
  "tolerance-froid": ["thermogenese"],
  "thermogenese": ["tolerance-froid"],
  "cortisol-signes": ["cortisol-symptomes"],
  "cortisol-symptomes": ["cortisol-signes"],
  "glycemie": ["glycemie-statut"],
  "glycemie-statut": ["glycemie"],
  "antibiotiques": ["antibiotiques-recent"],
  "antibiotiques-recent": ["antibiotiques"],
  "bcaa-eaa-intra": ["bcaa-intra"],
  "bcaa-intra": ["bcaa-eaa-intra"],
  // Scoring engine keys that differ from questionnaire
  "alcool": ["alcool-semaine"],
  "alcool-semaine": ["alcool"],
  "intensite": ["intensite-entrainement"],
  "intensite-entrainement": ["intensite"],
  "reveil-fatigue": ["reveil-repose"],
  "reveil-repose": ["reveil-fatigue"],
};

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function deriveResponses(responses: Responses, mode: NormalizeMode): Responses {
  const derived: Responses = {};
  const getString = (key: string): string | undefined => {
    const value = responses[key];
    return typeof value === "string" ? value : undefined;
  };
  const getArray = (key: string): string[] | undefined => {
    const value = responses[key];
    if (!Array.isArray(value)) return undefined;
    return value.filter((item) => typeof item === "string") as string[];
  };

  if (!hasValue(responses["niveau-activite"])) {
    const profession = getString("profession");
    const sportFreq = getString("sport-frequence");
    let activite: string | undefined;

    if (sportFreq === "5+" && profession === "actif") {
      activite = "intense";
    } else if (sportFreq === "5+") {
      activite = "actif";
    } else if (sportFreq === "3-4") {
      activite = "modere";
    } else if (sportFreq === "1-2") {
      activite = "leger";
    } else if (profession === "actif") {
      activite = "actif";
    } else if (profession === "mixte") {
      activite = "modere";
    } else if (profession === "bureau" || profession === "teletravail") {
      activite = "sedentaire";
    }

    if (activite) derived["niveau-activite"] = activite;
  }

  if (!hasValue(responses["cardio-jeun"])) {
    const cardioFreq = getString("cardio-frequence");
    const glucidesPreCardio = getString("glucides-pre-cardio");
    let cardioJeun: string | undefined;

    if (cardioFreq === "0" || glucidesPreCardio === "pas-cardio") {
      cardioJeun = "jamais";
    } else if (glucidesPreCardio === "non") {
      cardioJeun = "souvent";
    } else if (glucidesPreCardio === "parfois") {
      cardioJeun = "parfois";
    } else if (glucidesPreCardio === "oui") {
      cardioJeun = "jamais";
    }

    if (cardioJeun) derived["cardio-jeun"] = cardioJeun;
  }

  if (!hasValue(responses["reveil-matin"])) {
    const reveilFatigue = getString("reveil-fatigue");
    const reveilRepose = getString("reveil-repose");
    if (reveilFatigue) {
      if (["souvent", "toujours"].includes(reveilFatigue)) {
        derived["reveil-matin"] = "fatigue";
      } else if (["parfois", "rarement"].includes(reveilFatigue)) {
        derived["reveil-matin"] = "difficile";
      } else if (reveilFatigue === "jamais") {
        derived["reveil-matin"] = "repose";
      }
    } else if (reveilRepose) {
      if (["souvent", "toujours"].includes(reveilRepose)) {
        derived["reveil-matin"] = "repose";
      } else if (["parfois", "rarement"].includes(reveilRepose)) {
        derived["reveil-matin"] = "difficile";
      } else if (reveilRepose === "jamais") {
        derived["reveil-matin"] = "fatigue";
      }
    }
  }

  if (!hasValue(responses["omega6-omega3"])) {
    const huileCuisson = getString("huiles-cuisson");
    if (huileCuisson) {
      if (["tournesol", "colza", "margarine"].includes(huileCuisson)) {
        derived["omega6-omega3"] = "desequilibre";
      } else if (["olive", "coco", "beurre"].includes(huileCuisson)) {
        derived["omega6-omega3"] = "optimal";
      } else {
        derived["omega6-omega3"] = "inconnu";
      }
    }
  }

  if (!hasValue(responses["ble-gluten-freq"])) {
    const inflammatoires = getArray("aliments-inflammatoires");
    if (inflammatoires) {
      const glutenMarkers = new Set(["pain-blanc", "pates-blanches", "cereales-sucrees", "viennoiseries"]);
      if (inflammatoires.some((item) => glutenMarkers.has(item))) {
        derived["ble-gluten-freq"] = "modere";
      }
    }
  }

  if (mode === "analysis") {
    const heuresSommeil = getString("heures-sommeil");
    if (heuresSommeil === "moins-5" || heuresSommeil === "5-6") {
      derived["heures-sommeil"] = "<6";
    }

    const endormissement = getString("endormissement");
    const endormissementMap: Record<string, string> = {
      jamais: "<15min",
      parfois: "15-30min",
      souvent: "30-60min",
      toujours: "30-60min",
    };
    if (endormissement && endormissementMap[endormissement]) {
      derived["endormissement"] = endormissementMap[endormissement];
    }

    const reveilsNocturnes = getString("reveils-nocturnes");
    if (reveilsNocturnes === "jamais") {
      derived["reveils-nocturnes"] = "0";
    } else if (reveilsNocturnes === "parfois") {
      derived["reveils-nocturnes"] = "1-2";
    } else if (reveilsNocturnes === "souvent" || reveilsNocturnes === "chaque-nuit") {
      derived["reveils-nocturnes"] = "3+";
    }

    const energieMatin = getString("energie-matin");
    const energieMatinMap: Record<string, string> = {
      excellente: "haute",
      bonne: "haute",
      moyenne: "moyenne",
      faible: "basse",
      "tres-faible": "basse",
    };
    if (energieMatin && energieMatinMap[energieMatin]) {
      derived["energie-matin"] = energieMatinMap[energieMatin];
    }

    const energieApresMidi = getString("energie-apres-midi");
    const energieApremMap: Record<string, string> = {
      stable: "haute",
      "legere-baisse": "moyenne",
      "baisse-moderee": "basse",
      crash: "basse",
    };
    if (energieApresMidi && energieApremMap[energieApresMidi]) {
      derived["energie-apres-midi"] = energieApremMap[energieApresMidi];
    }

    const coupsFatigue = getString("coups-fatigue");
    if (coupsFatigue === "quotidien") {
      derived["coups-fatigue"] = "oui-quotidien";
    }

    const toleranceFroid = getString("tolerance-froid");
    if (toleranceFroid === "souvent" || toleranceFroid === "toujours") {
      derived["tolerance-froid"] = "tres-sensible";
    }

    const stressNiveau = getString("stress-niveau");
    if (stressNiveau === "tres-bas" || stressNiveau === "bas") {
      derived["stress-niveau"] = "faible";
    }

    const stressChronique = getString("stress-chronique");
    if (stressChronique && ["tres-bas", "bas", "modere", "eleve", "tres-eleve"].includes(stressChronique)) {
      derived["stress-chronique"] = ["eleve", "tres-eleve"].includes(stressChronique) ? "oui" : "non";
    }

    const glycemie = getString("glycemie");
    if (glycemie === "elevee" || glycemie === "basse") {
      derived["glycemie"] = "instable";
    }

    const proteinesRepas = getString("proteines-repas");
    const proteinesRepasMap: Record<string, string> = {
      faible: "1-2",
      moyen: "1-2",
      bon: "3",
      eleve: "4+",
    };
    if (proteinesRepas && proteinesRepasMap[proteinesRepas]) {
      derived["proteines-repas"] = proteinesRepasMap[proteinesRepas];
    }

    const hydratation = getString("hydratation");
    const hydratationMap: Record<string, string> = {
      "moins-1L": "<1L",
      "1-1.5L": "1-1.5L",
      "1.5-2L": "1.5-2L",
      "2-3L": "2-2.5L",
      "3L+": "2.5L+",
    };
    if (hydratation && hydratationMap[hydratation]) {
      derived["hydratation"] = hydratationMap[hydratation];
    }

    const masseGrasse = getString("masse-grasse");
    const masseGrasseMap: Record<string, string> = {
      "15-20": "16-20",
      "20-25": "21-25",
      "25-30": "26-30",
    };
    if (masseGrasse && masseGrasseMap[masseGrasse]) {
      derived["masse-grasse"] = masseGrasseMap[masseGrasse];
    }

    const evolutionPoids = getString("evolution-poids");
    if (evolutionPoids === "gain") {
      derived["evolution-poids"] = "prise-progressive";
    }

    const libido = getString("libido");
    const libidoMap: Record<string, string> = {
      "tres-elevee": "elevee",
      "tres-basse": "basse",
      absente: "basse",
    };
    if (libido && libidoMap[libido]) {
      derived["libido"] = libidoMap[libido];
    }

    const retentionEau = getString("retention-eau");
    if (retentionEau === "toujours") {
      derived["retention-eau"] = "chronique";
    }

    const glucidesReveil = getString("glucides-reveil");
    if (glucidesReveil === "oui-rapides") {
      derived["glucides-reveil"] = "oui-sucres";
    }

    const huilesCuisson = getString("huiles-cuisson");
    if (huilesCuisson === "colza" || huilesCuisson === "margarine") {
      derived["huiles-cuisson"] = "tournesol";
    }
  }

  return derived;
}

export function normalizeResponses(
  responses: Responses,
  options?: { mode?: NormalizeMode }
): Responses {
  const normalized: Responses = {};
  const mode = options?.mode ?? "analysis";

  // Safety net: convert underscore_case keys to kebab-case
  // (handles any API test calls or edge cases with wrong key format)
  for (const [key, value] of Object.entries(responses)) {
    const kebabKey = key.includes('_') && !key.includes('-') ? key.replace(/_/g, '-') : key;
    normalized[kebabKey] = value;
    // Also keep original if different (for backward compatibility)
    if (kebabKey !== key && !normalized[key]) {
      normalized[key] = value;
    }
  }

  for (const [target, sources] of Object.entries(RESPONSE_ALIASES)) {
    if (hasValue(normalized[target])) continue;
    for (const source of sources) {
      if (hasValue(normalized[source])) {
        normalized[target] = normalized[source];
        break;
      }
    }
  }

  Object.assign(normalized, deriveResponses(normalized, mode));

  return normalized;
}
