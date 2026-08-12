// Function words are strong evidence because they are not valid French words.
// Domain nouns are only supporting evidence: `performance` is deliberately not
// included because it is a common French word and caused long French reports to
// be rejected after four perfectly valid occurrences.
const STRONG_ENGLISH_MARKERS: RegExp[] = [
  /\bthe\b/gi,
  /\band\b/gi,
  /\bwith\b/gi,
  /\bwithout\b/gi,
  /\bwhen\b/gi,
  /\bwhile\b/gi,
  /\bfrom\b/gi,
  /\binto\b/gi,
  /\bthis\b/gi,
  /\bthat\b/gi,
  /\bthese\b/gi,
  /\bthose\b/gi,
  /\bare\b/gi,
  /\bis\b/gi,
  /\bwas\b/gi,
  /\bwere\b/gi,
  /\bresearch\b/gi,
  /\boverall\b/gi,
  /\bhonestly\b/gi,
];

const ENGLISH_DOMAIN_MARKERS: RegExp[] = [
  /\bhealth\b/gi,
  /\bexercise\b/gi,
  /\bbody\b/gi,
  /\bsleep\b/gi,
  /\bmindset\b/gi,
  /\bworkout\b/gi,
  /\brecovery\b/gi,
];

const OBVIOUS_ENGLISH_PHRASES: RegExp[] = [
  /\bkey\s+takeaways?\b/gi,
  /\baction\s+plans?\b/gi,
  /\bnext\s+steps?\b/gi,
  /\bwhat\s+this\s+means\b/gi,
  /\bsleep\s+quality\b/gi,
  /\bbody\s+composition\b/gi,
  /\boverall\s+health\b/gi,
  /\bexercise\s+performance\b/gi,
  /\bresearch\s+(?:shows|suggests|indicates|demonstrates)\b/gi,
  /\bevidence[- ]based\b/gi,
  /\bstress\s+management\b/gi,
  /\bhealthy\s+habits?\b/gi,
];

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((sum, re) => sum + (text.match(re)?.length || 0), 0);
}

function wordCount(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length || 0;
}

function looksLikeEnglishSegment(segment: string, minHits: number): boolean {
  if (!segment.trim()) return false;
  if (countMatches(segment, OBVIOUS_ENGLISH_PHRASES) > 0) return true;
  const strong = countMatches(segment, STRONG_ENGLISH_MARKERS);
  const supporting = countMatches(segment, ENGLISH_DOMAIN_MARKERS);
  const words = Math.max(1, wordCount(segment));
  if (strong >= 2 && (words <= 40 || strong / words >= 0.04)) return true;
  if (strong >= 1 && supporting >= 1 && words <= 30) return true;
  return strong >= minHits && strong / words >= 0.005;
}

export function countEnglishMarkers(text: string): number {
  if (!text) return 0;
  return countMatches(text, STRONG_ENGLISH_MARKERS) + countMatches(text, ENGLISH_DOMAIN_MARKERS);
}

export function hasEnglishMarkers(text: string, minHits: number = 4): boolean {
  if (!text) return false;
  if (countMatches(text, OBVIOUS_ENGLISH_PHRASES) > 0) return true;
  const segments = text.split(/(?:\n+|(?<=[.!?])\s+)/u);
  if (segments.some((segment) => looksLikeEnglishSegment(segment, minHits))) return true;
  const strong = countMatches(text, STRONG_ENGLISH_MARKERS);
  const words = Math.max(1, wordCount(text));
  return strong >= minHits && strong / words >= 0.005;
}

export function stripEnglishLines(text: string, minHitsPerLine: number = 2): string {
  if (!text) return text;
  const lines = text.split(/\n/);
  const filtered = lines
    .map((line) => {
      const originalStrong = countMatches(line, STRONG_ENGLISH_MARKERS);
      if (originalStrong >= minHitsPerLine) return null;
      const normalized = replaceEnglishArtifacts(line);
      return looksLikeEnglishSegment(normalized, minHitsPerLine) ? null : normalized;
    })
    .filter((line): line is string => line !== null);
  return filtered.join("\n").trim();
}

export function stripInlineHtml(text: string): string {
  if (!text) return text;
  let cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n")
    .replace(/<\s*p[^>]*>/gi, "")
    .replace(/<\/\s*li\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "- ")
    .replace(/<\/\s*h[1-6]\s*>/gi, "\n")
    .replace(/<\s*h[1-6][^>]*>/gi, "")
    .replace(/<\/\s*div\s*>/gi, "\n")
    .replace(/<\s*div[^>]*>/gi, "")
    .replace(/<\/?\s*span[^>]*>/gi, "")
    .replace(/<\/?\s*font[^>]*>/gi, "")
    .replace(/<\/?\s*strong[^>]*>/gi, "")
    .replace(/<\/?\s*em[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned;
}

export function normalizeSingleVoice(text: string): string {
  if (!text) return text;
  let normalized = text
    .replace(/(['"“”])on(['"“”])/gi, "$1active$2")
    .replace(/\bon va\b/gi, (match) => (match[0] === "O" ? "Je vais" : "je vais"))
    .replace(/\bon doit\b/gi, (match) => (match[0] === "O" ? "Je dois" : "je dois"))
    .replace(/\bon peut\b/gi, (match) => (match[0] === "O" ? "Je peux" : "je peux"))
    .replace(/\bon veut\b/gi, (match) => (match[0] === "O" ? "Je veux" : "je veux"))
    .replace(/\bon sait\b/gi, (match) => (match[0] === "O" ? "Je sais" : "je sais"))
    .replace(/\bon voit\b/gi, (match) => (match[0] === "O" ? "Je vois" : "je vois"))
    .replace(/\bon a\b/gi, (match) => (match[0] === "O" ? "J'ai" : "j'ai"))
    .replace(/\bon est\b/gi, (match) => (match[0] === "O" ? "Je suis" : "je suis"))
    .replace(/\blorsqu[’']on\b/gi, "lorsque je")
    .replace(/\bpuisqu[’']on\b/gi, "puisque je")
    .replace(/\bqu[’']on\b/gi, "que je")
    .replace(/\bnous\b/gi, (match) => (match[0] === "N" ? "Je" : "je"))
    .replace(/\bnotre\b/gi, (match) => (match[0] === "N" ? "Mon" : "mon"))
    .replace(/\bnos\b/gi, (match) => (match[0] === "N" ? "Mes" : "mes"))
    .replace(/\bon\b/gi, (match) => (match[0] === "O" ? "Je" : "je"))
    .replace(/\bje ne peux pas\b/gi, "je n'ai pas les elements pour")
    .replace(/\bJe\s+([aeiouh])/g, "J'$1")
    .replace(/\bje\s+([aeiouh])/g, "j'$1");
  normalized = replaceEnglishArtifacts(normalized);
  return normalized;
}

function replaceEnglishArtifacts(text: string): string {
  if (!text) return text;
  const replacements: Array<[RegExp, string]> = [
    [/\bkey\s+takeaways?\b/gi, "points clés"],
    [/\baction\s+plans?\b/gi, "plan d'action"],
    [/\bnext\s+steps?\b/gi, "prochaines étapes"],
    [/\bwhat\s+this\s+means\b/gi, "ce que cela signifie"],
    [/\bsleep\s+quality\b/gi, "qualité du sommeil"],
    [/\bbody\s+composition\b/gi, "composition corporelle"],
    [/\boverall\s+health\b/gi, "santé globale"],
    [/\bexercise\s+performance\b/gi, "performance à l'effort"],
    [/\bstress\s+management\b/gi, "gestion du stress"],
    [/\bhealthy\s+habits?\b/gi, "habitudes saines"],
    [/\bwhile\s+simultaneously\b/gi, "tout en"],
    [/\bsimultaneously\b/gi, "en meme temps"],
    [/\bwhile\b/gi, "alors que"],
    [/\bwithout\b/gi, "sans"],
    [/\bwith\b/gi, "avec"],
    [/\bfrom\b/gi, "depuis"],
    [/\binto\b/gi, "dans"],
    [/\band\b/gi, "et"],
    [/\bthe\b/gi, "le"],
    [/\bthis\b/gi, "ce"],
    [/\bthat\b/gi, "cela"],
    [/\bare\b/gi, "sont"],
    [/\bis\b/gi, "est"],
    [/\bwas\b/gi, "etait"],
    [/\bwere\b/gi, "etaient"],
    [/\boverall\b/gi, "globalement"],
    [/\byour\b/gi, "ton"],
    [/\byou\b/gi, "tu"],
    [/\bbody\b/gi, "corps"],
    [/\bsleep\b/gi, "sommeil"],
    [/\bhealth\b/gi, "sante"],
    [/\bhonestly\b/gi, "honnêtement"],
  ];
  let normalized = text;
  for (const [re, replacement] of replacements) {
    normalized = normalized.replace(re, replacement);
  }
  return normalized;
}
