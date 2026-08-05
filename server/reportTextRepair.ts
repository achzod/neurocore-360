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

function replaceInitialCase(source: string, lowerReplacement: string): string {
  if (source[0] === source[0]?.toUpperCase()) {
    return lowerReplacement.charAt(0).toUpperCase() + lowerReplacement.slice(1);
  }
  return lowerReplacement;
}

function repairTutoiement(value: string): string {
  const protectedMeetings: string[] = [];
  let text = value.replace(/\brendez[ -]vous\b/gi, (match) => {
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

export function repairReportTextForDelivery(
  value: string,
  responses: Record<string, unknown> = {},
): string {
  let text = sanitizeClientFacingText(String(value || ""));
  text = repairTutoiement(text)
    .replace(/\bn['’]h[ée]site pas\b/gi, "tu peux")
    .replace(/\bil est important de noter que\b/gi, "retiens que")
    .replace(/\bil convient de souligner que\b/gi, "garde en tête que")
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

  if (PROTEIN_QUANTITY.test(text) && !PROTEIN_PER_KG.test(text)) {
    const weight = extractWeightKg(responses);
    const proteinRule = weight
      ? `REPERE PROTEIQUE PERSONNALISE: pars de 1,6 a 2,2 g/kg/jour. Pour ${weight} kg, cela donne ${Math.round(weight * 1.6)} a ${Math.round(weight * 2.2)} g par jour. Si une cible fixe differente apparait ailleurs, cette plage calculee sur ton poids la remplace.`
      : "REPERE PROTEIQUE: pars de 1,6 a 2,2 g/kg/jour. Le poids manque dans les donnees disponibles, donc aucun total fixe en grammes ne doit etre applique avant de le renseigner.";
    text = `${text.trim()}\n\n${proteinRule}`;
  }

  return sanitizeClientFacingText(text);
}
