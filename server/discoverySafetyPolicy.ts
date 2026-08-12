export type DiscoveryTcaMode = "none" | "history" | "current_or_uncertain";

export interface DiscoverySafetyPolicy {
  version: 1;
  tcaMode: DiscoveryTcaMode;
  bodyCheckingSignal: boolean;
  restrictiveEatingSignal: boolean;
  strictEatingSafety: boolean;
  triggerKeys: string[];
}

export interface DiscoverySafetyValidation {
  ok: boolean;
  errors: string[];
}

const BODY_CHECK_FIELDS = [
  "frustration-passee",
  "si-rien-change",
  "ideal-6mois",
  "plus-grosse-peur",
];

function normalized(value: unknown): string {
  const raw = Array.isArray(value) ? value.join(" ") : String(value ?? "");
  return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’]/g, "'");
}

function hasBodyCheckingSignal(value: unknown): boolean {
  const text = normalized(value);
  return [
    /\bbody[- ]?check(?:ing)?\b/,
    /\bmiroir\b/,
    /\bme\s+(?:regarde|observe|scrute)\b/,
    /\bphotos?\s+(?:de\s+)?(?:mon\s+)?(?:corps|physique)\b/,
    /\bverifie\s+(?:souvent\s+)?mon\s+corps\b/,
    /\bme\s+pese\b.{0,40}\b(?:tous\s+les\s+jours|souvent|plusieurs\s+fois)\b/,
    /\bpeur\s+de\s+(?:grossir|(?:re)?prendre\s+du\s+poids|perdre\s+le\s+controle)\b/,
  ].some((pattern) => pattern.test(text));
}

export function deriveDiscoverySafetyPolicy(responses: Record<string, unknown>): DiscoverySafetyPolicy {
  const tca = normalized(responses["tca-historique"] ?? responses["tca_historique"]);
  const tcaType = normalized(responses["tca-type"] ?? responses["tca_type"]);
  const foodRelation = normalized(responses["relation-nourriture"] ?? responses["relation_nourriture"]);
  const triggerKeys: string[] = [];

  let tcaMode: DiscoveryTcaMode = "none";
  if (/\b(?:actuel|incertain)\b/.test(tca)) {
    tcaMode = "current_or_uncertain";
    triggerKeys.push("tca-historique");
  } else if (/\b(?:passe|historique|ancien)\b/.test(tca)) {
    tcaMode = "history";
    triggerKeys.push("tca-historique");
  }

  const restrictiveEatingSignal = /\b(?:restriction|binge|purge|orthorexie|comptage)\b/.test(tcaType)
    || /\b(?:complexe|difficile|toxique|problematique)\b/.test(foodRelation);
  if (/\b(?:restriction|binge|purge|orthorexie|comptage)\b/.test(tcaType)) triggerKeys.push("tca-type");
  if (/\b(?:complexe|difficile|toxique|problematique)\b/.test(foodRelation)) triggerKeys.push("relation-nourriture");

  let bodyCheckingSignal = false;
  for (const key of BODY_CHECK_FIELDS) {
    if (hasBodyCheckingSignal(responses[key])) {
      bodyCheckingSignal = true;
      triggerKeys.push(key);
    }
  }

  return {
    version: 1,
    tcaMode,
    bodyCheckingSignal,
    restrictiveEatingSignal,
    strictEatingSafety: tcaMode !== "none" || restrictiveEatingSignal || bodyCheckingSignal,
    triggerKeys: [...new Set(triggerKeys)],
  };
}

export function buildDiscoverySafetyPrompt(policy: DiscoverySafetyPolicy): string {
  const universal = `SECURITE MEDICALE NON NEGOCIABLE : le questionnaire ne permet aucun diagnostic. Ne presente jamais comme certain un dereglement hormonal, neurologique, thyroidien, insulinique ou de l'axe HPA. Toute hypothese doit rester prudente, conditionnelle et explicitement non diagnostique. Chaque phrase individuelle contenant cortisol, insuline, thyroide, testosterone ou axe HPA doit employer peut, pourrait ou hypothese non diagnostique. Les formulations affirmatives comme "ton cortisol est eleve", "ta sensibilite a l'insuline est basse" ou "ta thyroide est ralentie" sont interdites. Ne prescris pas de bilan biologique.`;
  if (!policy.strictEatingSafety) return universal;
  return `${universal}\nSECURITE TCA STRICTE : un signal actuel ou historique lie au comportement alimentaire ou au body-checking est present. Interdiction absolue de donner calories, deficit, surplus, macros, grammes/kg, pesee alimentaire ou corporelle, mensurations, tour de taille, photos de progression, journal de calories, jeune, seche, cheat meal, compensation par exercice, supplements ou panels biologiques. N'interprete pas les causes psychologiques et n'emploie pas auto-sabotage, obsession, besoin de controle ou peur de perdre le controle. Tu peux uniquement rappeler sobrement que ce signal impose d'eviter l'auto-suivi chiffre et recommander un professionnel de sante forme aux TCA, sans poser de diagnostic.`;
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+|\n+/).map((part) => part.trim()).filter(Boolean);
}

const MEDICAL_SUBJECT_PATTERN = /\b(?:cortisol|thyroide|testosterone|axe\s+hpa|charge\s+allostatique|insuline|dysfonction|dereglement)\b/;
const MEDICAL_AFFIRMATIVE_PATTERN = /\b(?:tu\s+as|ton|ta|tes)\b.{0,55}\b(?:est|sont|indique|revele|prouve|confirme|eleve|basse?|dereglement|dysfonction)\b|\b(?:indique|revele|prouve|confirme)\b/;
const MEDICAL_QUALIFIER_PATTERN = /\b(?:peut|pourrait|hypothese|possible|a\s+confirmer|ne\s+permet\s+pas\s+de\s+conclure|sans\s+permettre\s+de\s+conclure)\b/;
const MEDICAL_TESTING_PATTERN = /\b(?:fais|faire|demande|demander|dose|doser|controle|controler|mesure|mesurer)\b.{0,65}\b(?:tsh|t3|t4|testosterone|cortisol|insuline|bilan\s+(?:sanguin|biologique|hormonal)|panel\s+(?:sanguin|biologique|hormonal))\b/;

function isUnqualifiedMedicalAssertion(sentence: string): boolean {
  const normalizedSentence = normalized(sentence);
  return MEDICAL_SUBJECT_PATTERN.test(normalizedSentence)
    && MEDICAL_AFFIRMATIVE_PATTERN.test(normalizedSentence)
    && !MEDICAL_QUALIFIER_PATTERN.test(normalizedSentence);
}

/**
 * Adds an explicit non-diagnostic qualification to provider prose that would
 * otherwise make an individual medical assertion. This deliberately does not
 * remove or rewrite testing prescriptions, TCA instructions or numeric advice:
 * those remain byte-for-byte visible to the final fail-closed safety gate.
 */
export function qualifyDiscoveryMedicalAssertions(text: string): string {
  return String(text || "")
    .split(/(\n+)/)
    .map((block) => {
      if (/^\n+$/.test(block)) return block;
      return block.replace(/[^.!?]+[.!?]+|[^.!?]+$/g, (sentence) => {
        const trimmed = sentence.trim();
        if (!trimmed || !isUnqualifiedMedicalAssertion(trimmed)) return sentence;
        if (MEDICAL_TESTING_PATTERN.test(normalized(trimmed))) return sentence;
        const punctuation = trimmed.match(/[.!?]+$/)?.[0] || ".";
        const core = trimmed.replace(/[.!?]+$/, "").trim();
        const leading = sentence.match(/^\s*/)?.[0] || "";
        const trailing = sentence.match(/\s*$/)?.[0] || "";
        return `${leading}${core}, mais cela reste une hypothèse prudente et non diagnostique que le questionnaire ne permet pas de confirmer${punctuation}${trailing}`;
      });
    })
    .join("");
}

export function validateDiscoverySafetyContent(
  text: string,
  policy: DiscoverySafetyPolicy,
): DiscoverySafetyValidation {
  const normalizedText = normalized(text);
  const errors = new Set<string>();

  for (const sentence of splitSentences(normalizedText)) {
    if (isUnqualifiedMedicalAssertion(sentence)) errors.add("medical_assertion");
  }
  if (MEDICAL_TESTING_PATTERN.test(normalizedText)) {
    errors.add("medical_testing_prescription");
  }

  if (policy.strictEatingSafety) {
    if (/\b\d{3,4}\s*kcal\b/.test(normalizedText)) errors.add("tca_calorie_target");
    if (/\b(?:proteines?|glucides?|lipides?|macros?)\b.{0,55}\b\d+(?:[.,]\d+)?\s*g(?:\/kg)?\b/.test(normalizedText)
      || /\b\d+(?:[.,]\d+)?\s*g(?:\/kg)?\b.{0,55}\b(?:proteines?|glucides?|lipides?|macros?)\b/.test(normalizedText)) errors.add("tca_macro_target");
    if (/\b(?:pese|peses|peser|balance\s+de\s+cuisine|pesee\s+alimentaire)\b.{0,50}\b(?:aliment|repas|portion|gramme)\b/.test(normalizedText)) errors.add("tca_food_weighing");
    if (/\b(?:pese[- ]?toi|te\s+peser|pesee\s+(?:corporelle|du\s+poids)|monte\s+sur\s+la\s+balance)\b/.test(normalizedText)) errors.add("tca_body_weighing");
    if (/\b(?:mensurations?|tour\s+de\s+taille|mesure\s+(?:ton|le)\s+tour)\b/.test(normalizedText)) errors.add("tca_measurement_tracking");
    if (/\bphotos?\s+(?:de\s+)?(?:progression|du\s+physique|du\s+corps)\b|\bprends?\s+des\s+photos?\b/.test(normalizedText)) errors.add("tca_progress_photos");
    if (/\b(?:compense|brule|rattrape|paye)\b.{0,55}\b(?:repas|calories?|mange)\b|\b(?:jeune|seche|cheat\s*meal)\b/.test(normalizedText)) errors.add("tca_compensatory_behavior");
    if (/\b(?:auto[- ]?sabotage|besoin\s+de\s+controle|peur\s+de\s+perdre\s+le\s+controle|obsession)\b/.test(normalizedText)) errors.add("tca_psychologizing");
    if (/\b(?:creatine|supplement|complement\s+alimentaire)\b.{0,40}\b(?:prends?|prise|dose|grammes?)\b|\b(?:prends?|dose)\b.{0,40}\b(?:creatine|supplement|complement\s+alimentaire)\b/.test(normalizedText)) errors.add("tca_supplement_prescription");
  }

  return { ok: errors.size === 0, errors: [...errors] };
}
