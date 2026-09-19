const REQUIRED_RESPONSE_KEYS = [
  "pep_name",
  "pep_email",
  "pep_age",
  "pep_weight",
  "pep_height",
  "pep_experience",
  "pep_primary_goal",
  "pep_conditions",
  "pep_country",
  "pep_budget",
  "pep_injection_comfort",
  "pep_blood_commit",
] as const;

const TESTOSTERONE_REQUIRED_RESPONSE_KEYS = [
  "pep_testo_bloodwork",
  "pep_testo_fertility",
] as const;

function validEmail(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  return trimmed.length >= 6
    && trimmed.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

export function validatePeptidesEngineResponses(
  raw: unknown,
  expectedEmail: string,
): { valid: true } | { valid: false; missing: string[] } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, missing: ["questionnaire"] };
  }

  const responses = raw as Record<string, unknown>;
  const required: string[] = [...REQUIRED_RESPONSE_KEYS];
  const secondaryGoals = Array.isArray(responses.pep_secondary_goals)
    ? responses.pep_secondary_goals
    : [];
  if (
    responses.pep_primary_goal === "testo-boost"
    || secondaryGoals.includes("testo-boost")
  ) {
    required.push(...TESTOSTERONE_REQUIRED_RESPONSE_KEYS);
  }

  const missing = required.filter((key) => {
    const value = responses[key];
    if (value === undefined || value === null || value === "") return true;
    return Array.isArray(value) && value.length === 0;
  });

  const questionnaireEmail = typeof responses.pep_email === "string"
    ? responses.pep_email.trim().toLowerCase()
    : "";
  if (!validEmail(questionnaireEmail) || questionnaireEmail !== expectedEmail.trim().toLowerCase()) {
    missing.push("pep_email");
  }

  return missing.length > 0
    ? { valid: false, missing: [...new Set(missing)] }
    : { valid: true };
}
