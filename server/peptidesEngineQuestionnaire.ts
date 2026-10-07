import { isLikelyDeliverableEmail } from "@shared/emailAddressPolicy";

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
  return isLikelyDeliverableEmail(raw);
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

const PROFILE_FIELDS = ["pep_name", "pep_age", "pep_weight", "pep_height"] as const;

export function validatePeptidesProfileConfirmation(
  raw: unknown,
  responsesRaw: unknown,
): { valid: true } | { valid: false; mismatched: string[] } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, mismatched: [...PROFILE_FIELDS] };
  }
  if (!responsesRaw || typeof responsesRaw !== "object" || Array.isArray(responsesRaw)) {
    return { valid: false, mismatched: [...PROFILE_FIELDS] };
  }

  const confirmation = raw as Record<string, unknown>;
  const responses = responsesRaw as Record<string, unknown>;
  if (confirmation.accepted !== true) {
    return { valid: false, mismatched: [...PROFILE_FIELDS] };
  }

  const normalizedName = (value: unknown) => String(value || "").trim();
  const normalizedNumber = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const mismatched = PROFILE_FIELDS.filter((field) => {
    if (field === "pep_name") {
      return normalizedName(confirmation[field]) !== normalizedName(responses[field]);
    }
    return normalizedNumber(confirmation[field]) !== normalizedNumber(responses[field]);
  });

  const age = normalizedNumber(responses.pep_age);
  const weight = normalizedNumber(responses.pep_weight);
  const height = normalizedNumber(responses.pep_height);
  if (age === null || age < 18 || age > 80) mismatched.push("pep_age");
  if (weight === null || weight < 40 || weight > 250) mismatched.push("pep_weight");
  if (height === null || height < 140 || height > 220) mismatched.push("pep_height");

  return mismatched.length > 0
    ? { valid: false, mismatched: [...new Set(mismatched)] }
    : { valid: true };
}
