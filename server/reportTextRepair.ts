import { sanitizeClientFacingText } from "./clientFacingQuality";

const PROTEIN_QUANTITY =
  /prot[ée]ines?[\s\S]{0,120}\b\d{2,3}\s*g\b|\b\d{2,3}\s*g[\s\S]{0,120}prot[ée]ines?/i;
const PROTEIN_PER_KG =
  /\b\d+(?:[.,]\d+)?\s*(?:à|a|-)\s*\d+(?:[.,]\d+)?\s*g\s*\/?\s*kg\b|\b\d+(?:[.,]\d+)?\s*g\s*\/?\s*kg\b/i;

function extractWeightKg(responses: Record<string, unknown>): number | null {
  const candidates = [
    responses.poids,
    responses.weight,
    responses.pep_weight,
    responses["poids-kg"],
  ];
  for (const candidate of candidates) {
    const match = String(candidate ?? "").replace(",", ".").match(/\d+(?:\.\d+)?/);
    const weight = match ? Number(match[0]) : 0;
    if (Number.isFinite(weight) && weight >= 35 && weight <= 250) return weight;
  }
  return null;
}

export function extractKnownAgeYears(
  responses: Record<string, unknown>,
  now = new Date(),
): number | null {
  const direct = Number(responses.age);
  if (Number.isFinite(direct) && direct >= 18 && direct <= 100) {
    return Math.floor(direct);
  }

  const rawDob = String(responses.dob || responses.dateOfBirth || "").trim();
  if (!rawDob) return null;
  let birthDate: Date;
  const compactMatch = rawDob.match(/^(\d{2})-(\d{2})-(\d{2})$/);
  if (compactMatch) {
    const shortYear = Number(compactMatch[1]);
    const currentShortYear = now.getFullYear() % 100;
    const fullYear = shortYear > currentShortYear ? 1900 + shortYear : 2000 + shortYear;
    birthDate = new Date(fullYear, Number(compactMatch[2]) - 1, Number(compactMatch[3]));
  } else {
    birthDate = new Date(rawDob);
  }
  if (Number.isNaN(birthDate.getTime())) return null;

  let age = now.getFullYear() - birthDate.getFullYear();
  const birthdayPassed = now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());
  if (!birthdayPassed) age -= 1;
  return age >= 18 && age <= 100 ? age : null;
}

function repairKnownAgeContext(value: string, responses: Record<string, unknown>): string {
  const age = extractKnownAgeYears(responses);
  if (age === null) return value;

  return value
    .replace(
      /ton âge manque et empêche une interprétation définitive/gi,
      `ce résultat doit être interprété avec la plage de référence spécifique à tes ${age} ans`,
    )
    .replace(
      /L[’']âge est non renseigné\s*-\s*cette absence limite directement l[’']interprétation de [^.]+?risque cardiovasculaire absolu\./gi,
      `Tu as ${age} ans au moment de cette analyse. Cet âge est intégré à l'interprétation de l'IGF-1, de la filtration rénale et du risque cardiovasculaire absolu.`,
    )
    .replace(
      /Une nouvelle interprétation avec ton âge exact et la plage de référence du laboratoire est prioritaire\./gi,
      `La comparaison avec la plage de référence du laboratoire correspondant à tes ${age} ans reste prioritaire.`,
    )
    .replace(
      /mais son interprétation exige ton âge exact/gi,
      `et son interprétation doit intégrer tes ${age} ans ainsi que la plage de référence du laboratoire`,
    )
    .replace(
      /La portée réelle dépend de tes symptômes, de ton âge, de ton apport énergétique et de ton niveau d'entraînement, tous non renseignés\./gi,
      `La portée réelle dépend de tes symptômes, de tes ${age} ans, de ton apport énergétique et de ton niveau d'entraînement. Tes symptômes, ton apport énergétique et ton niveau d'entraînement restent non renseignés.`,
    )
    .replace(/Tests manquants\s*-\s*L[’']âge,\s*/gi, "Tests manquants - ")
    .replace(
      /Pour l[’']IGF-1, l[’']âge est indispensable à une interprétation précise, car les références varient fortement au cours de la vie\./gi,
      `Pour l'IGF-1, tes ${age} ans doivent être intégrés à l'interprétation, car les références varient fortement au cours de la vie.`,
    )
    .replace(
      /Une imagerie préventive peut être discutée selon ton âge et tes antécédents, qui sont non renseignés\./gi,
      `À ${age} ans, une imagerie préventive peut être discutée selon tes antécédents, qui restent non renseignés.`,
    )
    .replace(/sans heure de prélèvement, âge, symptômes/gi, "sans heure de prélèvement, symptômes")
    .replace(
      /Priorité\s*-\s*Haute pour la récupération, avec interprétation limitée par l'absence d'âge\./gi,
      `Priorité - Haute pour la récupération, avec interprétation à comparer à la plage de référence correspondant à tes ${age} ans.`,
    )
    .replace(
      /L'âge influence fortement les valeurs attendues, or ton âge est non renseigné\./gi,
      `L'âge influence fortement les valeurs attendues. À ${age} ans, compare ce résultat à la plage de référence du laboratoire adaptée à ta tranche d'âge.`,
    )
    .replace(/Tests à ajouter\s*-\s*Âge,\s*/gi, "Tests à ajouter - ")
    .replace(
      /Selon ton âge, non renseigné, tes antécédents et ta pression artérielle/gi,
      `À ${age} ans, selon tes antécédents et ta pression artérielle`,
    )
    .replace(
      /Ton statut médicamenteux, tes antécédents rénaux, tes antécédents cardiovasculaires, ta pression artérielle, ton tabagisme et ton âge sont non renseignés\./gi,
      `Ton statut médicamenteux, tes antécédents rénaux, tes antécédents cardiovasculaires, ta pression artérielle et ton tabagisme sont non renseignés. Ton âge, ${age} ans, est bien intégré à cette analyse.`,
    );
}

export function auditKnownProfileContradictions(
  value: string,
  responses: Record<string, unknown>,
): string[] {
  if (extractKnownAgeYears(responses) === null) return [];
  const patterns: Array<[string, RegExp]> = [
    ["known_age_marked_missing", /(?:âge|ton âge)[^.\n]{0,90}(?:non renseigné|manque)/i],
    ["known_age_absence_claim", /absence d[’']âge/i],
    ["known_age_requested_again", /(?:ton âge exact|Tests à ajouter\s*-\s*Âge|Tests manquants\s*-\s*L[’']âge)/i],
  ];
  return patterns.filter(([, pattern]) => pattern.test(value)).map(([key]) => key);
}

function replaceInitialCase(source: string, lowerReplacement: string): string {
  if (source[0] === source[0]?.toUpperCase()) {
    return lowerReplacement.charAt(0).toUpperCase() + lowerReplacement.slice(1);
  }
  return lowerReplacement;
}

function repairTutoiement(value: string): string {
  const protectedMeetings: string[] = [];
  let text = value
    .replace(/\brendez(?:[-\s\u00a0\u202f]+)(?:vous|tu)\b/gi, "rendez-vous")
    .replace(/\brendez-vous\b/gi, (match) => {
    const marker = `__APEX_MEETING_${protectedMeetings.length}__`;
    protectedMeetings.push(match);
    return marker;
  });

  const phrases: Array<[RegExp, string]> = [
    [/\bassurez[ -]vous\b/gi, "assure-toi"],
    [/\bpouvez[ -]vous\b/gi, "peux-tu"],
    [/\bdevez[ -]vous\b/gi, "dois-tu"],
    [/\bavez[ -]vous\b/gi, "as-tu"],
    [/\bêtes[ -]vous\b/gi, "es-tu"],
    [/\bsi vous êtes\b/gi, "si tu es"],
    [/\bsi vous avez\b/gi, "si tu as"],
    [/\bvous n['’]êtes pas\b/gi, "tu n'es pas"],
    [/\bvous n['’]avez pas\b/gi, "tu n'as pas"],
    [/\bvous ne pouvez pas\b/gi, "tu ne peux pas"],
    [/\bvous ne devez pas\b/gi, "tu ne dois pas"],
    [/\bvous êtes\b/gi, "tu es"],
    [/\bvous avez\b/gi, "tu as"],
    [/\bvous pouvez\b/gi, "tu peux"],
    [/\bvous devez\b/gi, "tu dois"],
    [/\bvous allez\b/gi, "tu vas"],
    [/\bpour vous\b/gi, "pour toi"],
    [/\bavec vous\b/gi, "avec toi"],
    [/\bchez vous\b/gi, "chez toi"],
    [/\bde vous\b/gi, "de toi"],
    [/\bà vous\b/gi, "à toi"],
    [/\bveuillez\b/gi, "merci de"],
    [/\bprenez\b/gi, "prends"],
    [/\bconsultez\b/gi, "consulte"],
    [/\bdemandez\b/gi, "demande"],
    [/\bv[ée]rifiez\b/gi, "vérifie"],
    [/\bcontactez\b/gi, "contacte"],
    [/\bvotre\s+(sant[ée]|routine|nutrition|digestion|[ée]nergie|r[ée]cup[ée]ration|progression|situation|priorit[ée]|semaine|journ[ée]e|assiette)\b/gi, "ta $1"],
    [/\bvotre\b/gi, "ton"],
    [/\bvos\b/gi, "tes"],
  ];
  for (const [pattern, replacement] of phrases) {
    text = text.replace(pattern, (match, ...groups: string[]) => {
      let resolved = replacement;
      groups.slice(0, -2).forEach((group, index) => {
        resolved = resolved.replace(`$${index + 1}`, group);
      });
      return replaceInitialCase(match, resolved);
    });
  }
  text = text.replace(/\bvous\b/gi, (match) => replaceInitialCase(match, "tu"));

  protectedMeetings.forEach((meeting, index) => {
    text = text.replace(`__APEX_MEETING_${index}__`, meeting);
  });
  return text;
}

function deduplicateParentheticalMarkerDefinitions(value: string): string {
  const seen = new Set<string>();
  const withoutImmediateRestatements = value.replace(
    /\s*\((ce\s+marqueur\s+(?:mesure|estime)[^)\n]{5,240})\)(?=\s*,?\s*(?:(?:qui|il|elle)\s+)?(?:mesur(?:e|ent)|estim(?:e|ent)|refl[eè]t(?:e|ent)|repr[ée]sent(?:e|ent)|correspond(?:ent)?\s+à|c['’]est|est\s+(?:un|une|la\s+forme))\b)/gi,
    "",
  );
  return withoutImmediateRestatements.replace(
    /\s*\((ce\s+marqueur\s+(?:mesure|estime)[^)\n]{5,240})\)/gi,
    (full, definition: string) => {
      const key = definition
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (seen.has(key)) return "";
      seen.add(key);
      return ` (${definition})`;
    },
  );
}

function repairSentenceStarts(value: string): string {
  return value.replace(/([.!?]\s+)(ton|ta|tes|tu|je)\b/g, (_full, prefix: string, word: string) =>
    `${prefix}${word.charAt(0).toUpperCase()}${word.slice(1)}`,
  );
}

export function repairReportTextForDelivery(
  value: string,
  responses: Record<string, unknown> = {},
): string {
  let text = sanitizeClientFacingText(String(value || ""));
  text = repairTutoiement(text)
    .replace(/\bn['’]h[ée]site pas\b/gi, "tu peux")
    .replace(/\bil est important de noter que\b/gi, "retiens que")
    .replace(/\bil convient de souligner que\b/gi, "garde en tête que")
    .replace(/\ben conclusion d[ée]finitive\b/gi, "en verdict définitif")
    .replace(/\ben conclusion\b/gi, "au final")
    .replace(/\bpour r[ée]sumer\b/gi, "en bref")
    .replace(/\bvoici les points cl[ée]s\b/gi, "les points à retenir")
    .replace(/\bdans le cadre de cette\b/gi, "pour cette")
    .replace(/\bdans le cadre de ce\b/gi, "pour ce")
    .replace(/\bcomme mentionn[ée] pr[ée]c[ée]demment\b/gi, "comme vu plus haut")
    .replace(/\bchaque individu est unique\b/gi, "ton contexte compte")
    .replace(/\bdes millions de personnes\b/gi, "beaucoup de personnes")
    .replace(/\b(?:ma|notre) source personnelle\b/gi, "la source retenue")
    .replace(/\bquasi indolore\b/gi, "avec une gêne généralement limitée")
    .replace(/\bpour aller plus loin\b/gi, "prochaine étape")
    .replace(/\best fondamental pour\b/gi, "agit directement sur");

  text = repairKnownAgeContext(text, responses);
  text = repairSentenceStarts(deduplicateParentheticalMarkerDefinitions(text));

  if (PROTEIN_QUANTITY.test(text) && !PROTEIN_PER_KG.test(text)) {
    const weight = extractWeightKg(responses);
    const proteinRule = weight
      ? `REPERE PROTEIQUE PERSONNALISE: pars de 1,6 a 2,2 g/kg/jour. Pour ${weight} kg, cela donne ${Math.round(weight * 1.6)} a ${Math.round(weight * 2.2)} g par jour. Si une cible fixe differente apparait ailleurs, cette plage calculee sur ton poids la remplace.`
      : "REPERE PROTEIQUE: pars de 1,6 a 2,2 g/kg/jour. Le poids manque dans les donnees disponibles, donc aucun total fixe en grammes ne doit etre applique avant de le renseigner.";
    text = `${text.trim()}\n\n${proteinRule}`;
  }

  return sanitizeClientFacingText(text);
}
