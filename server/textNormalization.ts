const ENGLISH_MARKERS: RegExp[] = [
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
  /\bhealth\b/gi,
  /\bperformance\b/gi,
  /\bexercise\b/gi,
  /\bbody\b/gi,
  /\bsleep\b/gi,
];

export function countEnglishMarkers(text: string): number {
  if (!text) return 0;
  return ENGLISH_MARKERS.reduce((sum, re) => sum + (text.match(re)?.length || 0), 0);
}

export function hasEnglishMarkers(text: string, minHits: number = 4): boolean {
  return countEnglishMarkers(text) >= minHits;
}

export function stripEnglishLines(text: string, minHitsPerLine: number = 2): string {
  if (!text) return text;
  const lines = text.split(/\n/);
  const filtered = lines.filter((line) => countEnglishMarkers(line) < minHitsPerLine);
  return filtered.join("\n").trim();
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
    .replace(/\bJe\s+([aeiouh])/g, "J'$1")
    .replace(/\bje\s+([aeiouh])/g, "j'$1");
  normalized = replaceEnglishArtifacts(normalized);
  return normalized;
}

function replaceEnglishArtifacts(text: string): string {
  if (!text) return text;
  const replacements: Array<[RegExp, string]> = [
    [/\bwhile\s+simultaneously\b/gi, "tout en"],
    [/\bsimultaneously\b/gi, "en meme temps"],
    [/\bwhile\b/gi, "alors que"],
    [/\bwithout\b/gi, "sans"],
    [/\bwith\b/gi, "avec"],
    [/\bfrom\b/gi, "depuis"],
    [/\binto\b/gi, "dans"],
    [/\band\b/gi, "et"],
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
  ];
  let normalized = text;
  for (const [re, replacement] of replacements) {
    normalized = normalized.replace(re, replacement);
  }
  return normalized;
}
