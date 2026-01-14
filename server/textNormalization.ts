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
    .replace(/\blorsqu[’']on\b/gi, "lorsque je")
    .replace(/\bpuisqu[’']on\b/gi, "puisque je")
    .replace(/\bqu[’']on\b/gi, "que je")
    .replace(/\bnous\b/gi, (match) => (match[0] === "N" ? "Je" : "je"))
    .replace(/\bnotre\b/gi, (match) => (match[0] === "N" ? "Mon" : "mon"))
    .replace(/\bnos\b/gi, (match) => (match[0] === "N" ? "Mes" : "mes"))
    .replace(/\bon\b/gi, (match) => (match[0] === "O" ? "Je" : "je"))
    .replace(/\bJe\s+([aeiouh])/g, "J'$1")
    .replace(/\bje\s+([aeiouh])/g, "j'$1");
  return normalized;
}
