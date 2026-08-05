const FORBIDDEN_UNICODE_DASHES = /[\u2013\u2014]/g;
const FORBIDDEN_DASH_ENTITIES = /&(?:mdash|ndash);/gi;

const VOUVOIEMENT_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "vous", pattern: /(?<!rendez[-\s])\bvous\b/i },
  { label: "votre", pattern: /\bvotre\b/i },
  { label: "vos", pattern: /\bvos\b/i },
  { label: "veuillez", pattern: /\bveuillez\b/i },
  { label: "prenez", pattern: /\bprenez\b/i },
  { label: "consultez", pattern: /\bconsultez\b/i },
  { label: "demandez", pattern: /\bdemandez\b/i },
  { label: "verifiez", pattern: /\bv[ée]rifiez\b/i },
  { label: "contactez", pattern: /\bcontactez\b/i },
  { label: "assurez-vous", pattern: /\bassurez[\s-]+vous\b/i },
];

const ROBOTIC_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "il est important de noter", pattern: /\bil est important de noter\b/i },
  { label: "il convient de souligner", pattern: /\bil convient de souligner\b/i },
  { label: "n'hesite pas", pattern: /\bn['’]h[ée]site pas\b/i },
  { label: "en conclusion", pattern: /\ben conclusion\b/i },
  { label: "pour resumer", pattern: /\bpour r[ée]sumer\b/i },
  { label: "voici les points cles", pattern: /\bvoici les points cl[ée]s\b/i },
  { label: "dans le cadre de", pattern: /\bdans le cadre de (?:cette|ce)\b/i },
  { label: "comme mentionne precedemment", pattern: /\bcomme mentionn[ée] pr[ée]c[ée]demment\b/i },
  { label: "chaque individu est unique", pattern: /\bchaque individu est unique\b/i },
  { label: "des millions de personnes", pattern: /\bdes millions de personnes\b/i },
  { label: "plus simple que ca en a l'air", pattern: /\bplus simple que [çc]a en a l'air\b/i },
  { label: "source personnelle", pattern: /\b(?:ma|notre) source personnelle\b/i },
  { label: "quasi indolore", pattern: /\bquasi indolore\b/i },
  { label: "rendez-tu", pattern: /\brendez[-\s]+tu\b/i },
  { label: "assistant ou modele IA", pattern: /\b(?:assistant|mod[èe]le de langage|intelligence artificielle|chatgpt|claude|openai|anthropic)\b/i },
];

export interface ClientFacingQualityAudit {
  ok: boolean;
  forbiddenDashes: number;
  vouvoiement: string[];
  roboticPhrases: string[];
}

export function sanitizeClientFacingText(value: string): string {
  if (!value) return value;
  return value
    .replace(/(\d)\s*(?:[\u2013\u2014]|&(?:mdash|ndash);)\s*(\d)/gi, "$1-$2")
    .replace(FORBIDDEN_DASH_ENTITIES, ",")
    .replace(FORBIDDEN_UNICODE_DASHES, ",")
    .replace(/\breatatrutide\b/gi, "Retatrutide")
    .replace(/\b(?:c['’]est\s+)?plus simple que [çc]a en a l['’]air\b/gi, "la logique devient claire une fois le calcul pose")
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function auditClientFacingText(value: string): ClientFacingQualityAudit {
  const text = String(value || "");
  const forbiddenDashes = (text.match(FORBIDDEN_UNICODE_DASHES) || []).length
    + (text.match(FORBIDDEN_DASH_ENTITIES) || []).length;
  const vouvoiement = VOUVOIEMENT_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);
  const roboticPhrases = ROBOTIC_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);

  return {
    ok: forbiddenDashes === 0 && vouvoiement.length === 0 && roboticPhrases.length === 0,
    forbiddenDashes,
    vouvoiement,
    roboticPhrases,
  };
}

export function collectClientFacingStrings(value: unknown): string[] {
  const collected: string[] = [];
  const visit = (entry: unknown): void => {
    if (typeof entry === "string") {
      collected.push(entry);
      return;
    }
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    if (entry && typeof entry === "object") {
      for (const [key, child] of Object.entries(entry as Record<string, unknown>)) {
        if (key.startsWith("_")) continue;
        visit(child);
      }
    }
  };
  visit(value);
  return collected;
}
