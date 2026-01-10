type Responses = Record<string, unknown>;

const RESPONSE_ALIASES: Record<string, string[]> = {
  "coups-fatigue": ["coup-fatigue"],
  "coup-fatigue": ["coups-fatigue"],
  "energie-matin": ["niveau-energie-matin", "energie-matin"],
  "energie-aprem": ["niveau-energie-aprem", "energie-apres-midi"],
  "energie-apres-midi": ["niveau-energie-aprem", "energie-aprem"],
  "energie-soir": ["niveau-energie-soir"],
  "stress-niveau": ["niveau-stress"],
  "stress-chronique": ["niveau-stress"],
  "digestion-generale": ["digestion-qualite"],
  "hydratation": ["eau-jour"],
  "repas-jour": ["nb-repas"],
  "tracking": ["tracking-calories"],
  "tolerance-froid": ["thermogenese"],
  "cortisol-signes": ["cortisol-symptomes"],
  "glycemie": ["glycemie-statut"],
  "antibiotiques": ["antibiotiques-recent"],
  "proteines-repas": ["proteines-jour"],
  "reveil-matin": ["reveil-repose", "reveil-fatigue"],
};

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function normalizeResponses(responses: Responses): Responses {
  const normalized: Responses = { ...responses };

  for (const [target, sources] of Object.entries(RESPONSE_ALIASES)) {
    if (hasValue(normalized[target])) continue;
    for (const source of sources) {
      if (hasValue(normalized[source])) {
        normalized[target] = normalized[source];
        break;
      }
    }
  }

  return normalized;
}
