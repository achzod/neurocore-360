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
  const universal = `SECURITE MEDICALE NON NEGOCIABLE : le questionnaire ne permet aucun diagnostic. Ne presente jamais comme certain un dereglement hormonal, neurologique, thyroidien, insulinique ou de l'axe HPA. Toute hypothese doit rester prudente, conditionnelle et explicitement non diagnostique. Chaque phrase individuelle contenant cortisol, insuline, thyroide, testosterone ou axe HPA doit employer peut, pourrait ou hypothese non diagnostique. Les formulations affirmatives comme "ton cortisol est eleve", "ta sensibilite a l'insuline est basse" ou "ta thyroide est ralentie" sont interdites. Pour la digestion, decris uniquement les symptomes et le transit declares : n'emploie jamais dysbiose, SIBO, hypochlorhydrie, permeabilite intestinale ou malabsorption, meme comme possibilite, hypothese, exemple ou diagnostic ecarte. Ne prescris pas de bilan biologique.`;
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
const DIGESTIVE_DIAGNOSIS_PATTERN = /\b(?:dysbiose|hypochlorhydrie|sibo|permeabilite\s+intestinale|intestin\s+permeable|malabsorption|mauvaise\s+absorption|surcroissance\s+bacterienne|(?:desequilibre|flore)\s+(?:de\s+la\s+)?flore\s+intestinale|flore\s+intestinale\s+desequilibree)\b/;

function isUnqualifiedMedicalAssertion(sentence: string): boolean {
  const normalizedSentence = normalized(sentence);
  return MEDICAL_SUBJECT_PATTERN.test(normalizedSentence)
    && MEDICAL_AFFIRMATIVE_PATTERN.test(normalizedSentence)
    && !MEDICAL_QUALIFIER_PATTERN.test(normalizedSentence);
}

// Keep the accented spelling distinguishable from the ordinary adjective
// "jeune". Accentless fasting is accepted only with an explicit dietary
// context (article or fasting qualifier), so "tu es jeune" is not treated as
// a fasting prescription.
const TCA_FASTING_TERM_SOURCE = String.raw`(?:jeûn(?:er|ez|ons|ent|ant|es?)|jeun(?:er|ez|ons|ent|ant)|(?:(?:le|du|un|ce|au|d'un)\s+jeunes?)|jeunes?\s+(?:intermittents?|prolong(?:e|es|é|és|ée|ées)|hydriques?|secs?|de\s+\d+\s*(?:h|heures?)))`;
const TCA_DIETING_TERM_SOURCE = String.raw`(?:${TCA_FASTING_TERM_SOURCE}|s(?:e|è)ch(?:er|ez|ons|ent|ant|es?)|cheat\s*meals?)`;
const TCA_COMPENSATORY_VERB_SOURCE = String.raw`(?:compens(?:e|es|er|ez|ons|ent|ant)|brul(?:e|es|er|ez|ons|ent|ant)|rattrap(?:e|es|er|ez|ons|ent|ant)|pa(?:y(?:e|es|er|ez|ons|ent|ant)|i(?:e|es|ent)))`;
const TCA_COMPENSATORY_TARGET_SOURCE = String.raw`(?:repas|calories?|mang(?:e|es|er|ez|ons|ent)|ecarts?|exces)`;
const TCA_COMPENSATORY_BEHAVIOR_SOURCE = String.raw`(?:\b${TCA_COMPENSATORY_VERB_SOURCE}\b[^.!?]{0,55}\b${TCA_COMPENSATORY_TARGET_SOURCE}\b|\b${TCA_COMPENSATORY_TARGET_SOURCE}\b[^.!?]{0,55}\b${TCA_COMPENSATORY_VERB_SOURCE}\b)`;
// Protective wording must govern one local clause only. In particular, it
// must never consume `, puis fais un jeûne` and hide the unsafe second clause.
const TCA_DIRECT_GAP_SOURCE = String.raw`(?:(?!\b(?:puis|mais|ensuite|cependant|toutefois)\b)[^.!?,;:]){0,55}`;
const TCA_DIRECT_COMPENSATORY_BEHAVIOR_SOURCE = String.raw`(?:\b${TCA_COMPENSATORY_VERB_SOURCE}\b${TCA_DIRECT_GAP_SOURCE}\b${TCA_COMPENSATORY_TARGET_SOURCE}\b|\b${TCA_COMPENSATORY_TARGET_SOURCE}\b${TCA_DIRECT_GAP_SOURCE}\b${TCA_COMPENSATORY_VERB_SOURCE}\b)`;
const TCA_DIETING_LIST_SOURCE = String.raw`(?:(?:le|la|les|du|de\s+la|des|un|une|l'|d')\s*)?${TCA_DIETING_TERM_SOURCE}(?:(?:\s*,\s*|\s+(?:et|ou)\s+)(?:(?:le|la|les|du|de\s+la|des|un|une|l'|d')\s*)?${TCA_DIETING_TERM_SOURCE})*`;

const TCA_DIRECT_PROTECTION_PATTERNS = [
  // The negation must govern the risky practice itself. An unrelated "sans"
  // or "pas" elsewhere in the sentence never exempts another clause.
  new RegExp(String.raw`\b(?:n'utilise|ne\s+fais|ne\s+pratique|n'adopte|ne\s+planifie)\s+pas\s+${TCA_DIETING_LIST_SOURCE}(?:\s+pour\s+${TCA_DIRECT_COMPENSATORY_BEHAVIOR_SOURCE})?`, "g"),
  new RegExp(String.raw`\b(?:evite|eviter|renonce|renoncer)\s+(?:(?:de|a|au|aux)\s+)?(?:${TCA_DIRECT_COMPENSATORY_BEHAVIOR_SOURCE}|${TCA_DIETING_LIST_SOURCE}(?:\s+pour\s+${TCA_DIRECT_COMPENSATORY_BEHAVIOR_SOURCE})?)`, "g"),
  new RegExp(String.raw`\b(?:bannis|bannissez|bannir|proscris|proscrivez|proscrire)\s+(?:${TCA_DIRECT_COMPENSATORY_BEHAVIOR_SOURCE}|${TCA_DIETING_LIST_SOURCE}(?:\s+pour\s+${TCA_DIRECT_COMPENSATORY_BEHAVIOR_SOURCE})?)`, "g"),
  new RegExp(String.raw`\b(?:${TCA_DIRECT_COMPENSATORY_BEHAVIOR_SOURCE}|${TCA_DIETING_LIST_SOURCE})\s+(?:est|sont)\s+(?:strictement\s+)?(?:interdit(?:e|es|s)?|a\s+proscrire|contre-indique(?:e|es|s)?|a\s+bannir)\b`, "g"),
];

function containsTcaCompensatoryInstruction(text: string): boolean {
  return splitSentences(text).some((sentence) => {
    // Fold ordinary French accents for stable matching while deliberately
    // preserving û so the dietary noun "jeûne" remains distinct from the age
    // adjective "jeune".
    let unprotected = String(sentence || "")
      .toLowerCase()
      .replace(/[’]/g, "'")
      .replace(/[àáâä]/g, "a")
      .replace(/[éèêë]/g, "e")
      .replace(/[íìîï]/g, "i")
      .replace(/[óòôö]/g, "o")
      .replace(/[ùúü]/g, "u")
      .replace(/brû/g, "bru")
      .replace(/ç/g, "c");

    // Redact only an allowlisted protective construction that directly governs
    // the risky behaviour. Every other occurrence remains visible to the
    // fail-closed checks below, including a second clause in the same sentence.
    for (const protectivePattern of TCA_DIRECT_PROTECTION_PATTERNS) {
      unprotected = unprotected.replace(protectivePattern, " ");
    }

    return new RegExp(String.raw`\b${TCA_DIETING_TERM_SOURCE}\b`).test(unprotected)
      || new RegExp(TCA_COMPENSATORY_BEHAVIOR_SOURCE).test(unprotected);
  });
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
  // Preserve symptom observations but never infer a named digestive disorder.
  // The ban is context-independent on purpose: a protective first clause must
  // not hide a diagnosis later in the same sentence.
  if (DIGESTIVE_DIAGNOSIS_PATTERN.test(normalizedText)) {
    errors.add("digestive_diagnosis");
  }

  if (policy.strictEatingSafety) {
    if (/\b\d{3,4}\s*kcal\b/.test(normalizedText)) errors.add("tca_calorie_target");
    if (/\b(?:proteines?|glucides?|lipides?|macros?)\b.{0,55}\b\d+(?:[.,]\d+)?\s*g(?:\/kg)?\b/.test(normalizedText)
      || /\b\d+(?:[.,]\d+)?\s*g(?:\/kg)?\b.{0,55}\b(?:proteines?|glucides?|lipides?|macros?)\b/.test(normalizedText)) errors.add("tca_macro_target");
    if (/\b(?:pese|peses|peser|balance\s+de\s+cuisine|pesee\s+alimentaire)\b.{0,50}\b(?:aliment|repas|portion|gramme)\b/.test(normalizedText)) errors.add("tca_food_weighing");
    if (/\b(?:pese[- ]?toi|te\s+peser|pesee\s+(?:corporelle|du\s+poids)|monte\s+sur\s+la\s+balance)\b/.test(normalizedText)) errors.add("tca_body_weighing");
    if (/\b(?:mensurations?|tour\s+de\s+taille|mesure\s+(?:ton|le)\s+tour)\b/.test(normalizedText)) errors.add("tca_measurement_tracking");
    if (/\bphotos?\s+(?:de\s+)?(?:progression|du\s+physique|du\s+corps)\b|\bprends?\s+des\s+photos?\b/.test(normalizedText)) errors.add("tca_progress_photos");
    if (containsTcaCompensatoryInstruction(text)) errors.add("tca_compensatory_behavior");
    if (/\b(?:auto[- ]?sabotage|besoin\s+de\s+controle|peur\s+de\s+perdre\s+le\s+controle|obsession)\b/.test(normalizedText)) errors.add("tca_psychologizing");
    if (/\b(?:creatine|supplement|complement\s+alimentaire)\b.{0,40}\b(?:prends?|prise|dose|grammes?)\b|\b(?:prends?|dose)\b.{0,40}\b(?:creatine|supplement|complement\s+alimentaire)\b/.test(normalizedText)) errors.add("tca_supplement_prescription");
  }

  return { ok: errors.size === 0, errors: [...errors] };
}
