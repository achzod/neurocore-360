/**
 * APEXLABS - Parallel HTML Blood Report Generator (V3)
 *
 * Architecture:
 *   1. Build shared context (markers, patterns, lifestyle, deep dive)
 *   2. Generate content via 3 PARALLEL API calls (Promise.allSettled)
 *      - Batch 1: synthese, qualite, tableau, recomposition
 *      - Batch 2: axes, interconnexions, deep_dive
 *      - Batch 3: plan, nutrition, supplements, annexes, sources
 *   3. Parse sections from each response by ## headings
 *   4. Render all sections into styled HTML template
 *   Total time: ~60-90s (parallel) instead of ~180s+ (sequential)
 */

import { searchArticles } from "../knowledge/storage";
import type { ScrapedArticle } from "../knowledge/storage";
import { OPENAI_REPORT_MODEL, runOpenAIText } from "../openaiResponses";
import {
  BIOMARKER_RANGES,
  buildFallbackAnalysis,
  generateAIBloodAnalysis,
  type BloodAnalysisResult,
  type MarkerAnalysis,
} from "./index";

// ============================================
// TYPES
// ============================================

interface UserProfile {
  gender: "homme" | "femme";
  age?: string;
  objectives?: string;
  medications?: string;
  prenom?: string;
  nom?: string;
  poids?: number;
  taille?: number;
  sleepHours?: number;
  trainingHours?: number;
  calorieDeficit?: number;
  alcoholWeekly?: number;
  stressLevel?: number;
  fastingHours?: number;
  drawTime?: string;
  lastTraining?: string;
  alcoholLast72h?: string;
  nutritionPhase?: string;
  supplementsUsed?: string[];
  infectionRecent?: string;
}

// ============================================
// PANEL / HELPERS
// ============================================

const PANEL_KEYWORDS: Array<{ panel: string; markerIds: string[] }> = [
  {
    panel: "Axe hormonal",
    markerIds: ["testosterone_total", "testosterone_libre", "shbg", "estradiol", "lh", "fsh", "prolactine", "dhea_s", "igf1", "cortisol"],
  },
  {
    panel: "Axe metabolique",
    markerIds: ["glycemie_jeun", "hba1c", "insuline_jeun", "homa_ir", "fructosamine", "triglycerides", "hdl", "ldl", "apob", "lpa", "cholesterol_total", "apo_a1"],
  },
  {
    panel: "Axe thyroidien",
    markerIds: ["tsh", "t4_libre", "t3_libre", "t3_reverse", "anti_tpo"],
  },
  {
    panel: "Axe inflammation/immunite",
    markerIds: ["crp_us", "homocysteine", "ferritine", "fer_serique", "transferrine_sat"],
  },
  {
    panel: "Axe micronutriments",
    markerIds: ["vitamine_d", "b12", "folate", "magnesium_rbc", "zinc"],
  },
  {
    panel: "Axe foie/rein",
    markerIds: ["alt", "ast", "ggt", "creatinine", "egfr"],
  },
];

const getMarkerPanelName = (markerId: string, fallback?: string) => {
  if (fallback && fallback.trim()) return fallback.trim();
  for (const panel of PANEL_KEYWORDS) {
    if (panel.markerIds.includes(markerId)) return panel.panel;
  }
  return "Autre";
};

const formatPercentDelta = (value: number, min: number, max: number) => {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return "N/A";
  const mid = (min + max) / 2;
  const delta = ((value - mid) / mid) * 100;
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`;
};

const selectDeepDiveMarkers = (markers: MarkerAnalysis[]) => {
  const critical = markers.filter((m) => m.status === "critical");
  const suboptimal = markers.filter((m) => m.status === "suboptimal");
  const normal = markers.filter((m) => m.status === "normal");
  return [...critical, ...suboptimal, ...normal.slice(0, 2)].slice(0, 12);
};

const slugifySourceRef = (value: string): string =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const getSourceRefId = (article: ScrapedArticle): string => {
  const source = slugifySourceRef(article.source || "source");
  const title = slugifySourceRef(article.title || article.id || "article");
  return `${source}-${title}`.slice(0, 72);
};

const sanitizeSourceCitationText = (value: string): string =>
  String(value || "")
    .replace(/ouvrir\s+ce\s+mail\s+dans\s+votre\s+navigateur/gi, "")
    .replace(/ouvrir\s+ce\s+mail\s+dans\s+ton\s+navigateur/gi, "")
    .replace(/\bvous\b/gi, "tu")
    .replace(/\bvotre\b/gi, "ton")
    .replace(/\bvos\b/gi, "tes")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();

const buildSourceExcerpt = (article: ScrapedArticle) => {
  const excerpt = sanitizeSourceCitationText((article.content || "").slice(0, 300).replace(/\n/g, " "));
  const title = sanitizeSourceCitationText(article.title || "Sans titre");
  const source = sanitizeSourceCitationText(article.source || "N/A");
  const url = sanitizeSourceCitationText(article.url || "N/A");
  const category = sanitizeSourceCitationText(article.category || "N/A");
  const sourceId = getSourceRefId(article);
  return `- [SRC:${sourceId}] ${title} (${source}). URL: ${url} | Categorie: ${category}. Extrait: ${excerpt}...`;
};

// ============================================
// SECTION DEFINITIONS & CONSTANTS
// ============================================

const SECTION_ORDER = [
  "synthese", "qualite", "tableau", "recomposition",
  "axes", "interconnexions", "deep_dive", "plan",
  "nutrition", "supplements", "annexes", "sources",
] as const;

const SECTION_TITLES: Record<string, string> = {
  synthese: "Synthèse exécutive",
  qualite: "Qualité des données & limites",
  tableau: "Tableau de bord (scores & priorités)",
  recomposition: "Potentiel recomposition (perte de gras + gain de muscle)",
  axes: "Lecture compartimentée par axes",
  interconnexions: "Interconnexions majeures (le pattern)",
  deep_dive: "Deep dive , marqueurs prioritaires",
  plan: "Plan d'action 90 jours",
  nutrition: "Nutrition & entraînement",
  supplements: "Suppléments & stack",
  annexes: "Annexes (références et vigilance)",
  sources: "Sources (bibliothèque)",
};

const DEFINITION_HINT_REGEX = /\bce\s+marqueur\s+mesure\b/i;

const MARKER_DEFINITION_BY_KEY: Record<string, string> = {
  hdl: "ce marqueur mesure ton cholestérol protecteur qui ramène l'excès de lipides vers le foie",
  ldl: "ce marqueur mesure le cholestérol transporté vers les tissus, utile pour estimer la charge athérogène",
  triglycerides: "ce marqueur mesure les graisses circulantes issues du métabolisme énergétique et hépatique",
  cholesteroltotal: "ce marqueur mesure la charge totale de cholestérol circulant dans ton sang",
  apoa1: "ce marqueur mesure la principale protéine du HDL, centrale pour le transport inverse du cholestérol",
  apob: "ce marqueur mesure le nombre de particules athérogènes impliquant le risque cardiovasculaire",
  lpa: "ce marqueur mesure une lipoprotéine à risque génétique qui augmente le risque cardiovasculaire",
  alt: "ce marqueur mesure une enzyme hépatique qui monte quand les cellules du foie sont irritées",
  ast: "ce marqueur mesure une enzyme présente dans le foie et le muscle, utile pour différencier la charge tissulaire",
  ggt: "ce marqueur mesure une enzyme hépatobiliaire sensible au stress oxydatif et à la surcharge hépatique",
  creatinine: "ce marqueur mesure un déchet musculaire utilisé pour estimer la fonction rénale",
  egfr: "ce marqueur estime le débit de filtration de tes reins",
  tsh: "ce marqueur mesure le signal hypophysaire qui pilote l'activité de ta thyroïde",
  t4libre: "ce marqueur mesure la réserve hormonale thyroïdienne disponible pour conversion en T3",
  t3libre: "ce marqueur mesure l'hormone thyroïdienne active qui règle ton niveau énergétique",
  t3reverse: "ce marqueur mesure la forme inactive de T3 qui freine le signal thyroïdien",
  testosteronelibre: "ce marqueur mesure la fraction de testostérone biologiquement active",
  testosteronetotale: "ce marqueur mesure la quantité totale de testostérone circulante",
  estradiol: "ce marqueur mesure l'œstrogène principal qui module l'équilibre hormonal et cardiovasculaire",
  prolactine: "ce marqueur mesure une hormone hypophysaire qui influence l'axe gonadique",
  dhes: "ce marqueur mesure un précurseur androgénique produit par les glandes surrénales",
  igf1: "ce marqueur mesure le signal anabolique relayé par l'hormone de croissance",
  crpus: "ce marqueur mesure l'inflammation de bas grade associée au risque cardiométabolique",
  ferritine: "ce marqueur mesure tes réserves de fer",
  ferserique: "ce marqueur mesure le fer circulant disponible à court terme",
  transferrinesat: "ce marqueur mesure le pourcentage de saturation du transporteur de fer",
  b12: "ce marqueur mesure une vitamine clé pour les globules rouges, le système nerveux et la méthylation",
  vitamined: "ce marqueur mesure une hormone-vitamine clé pour l'immunité, les hormones et la performance",
  homocysteine: "ce marqueur mesure un métabolite de méthylation associé au risque cardiovasculaire",
};

const stripForbiddenStyleTokens = (value: string): string =>
  String(value || "")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\uFE0E\uFE0F]/g, "");

const FRENCH_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bpremiere\b/gi, "première"],
  [/\bpremieres\b/gi, "premières"],
  [/\bdeuxieme\b/gi, "deuxième"],
  [/\btroisieme\b/gi, "troisième"],
  [/\bmetabolique\b/gi, "métabolique"],
  [/\bmetaboliques\b/gi, "métaboliques"],
  [/\bhepatique\b/gi, "hépatique"],
  [/\bhepatiques\b/gi, "hépatiques"],
  [/\brecuperation\b/gi, "récupération"],
  [/\brecuperer\b/gi, "récupérer"],
  [/\bentrainement\b/gi, "entraînement"],
  [/\bentrainements\b/gi, "entraînements"],
  [/\bdetaille\b/gi, "détaillé"],
  [/\bdetaillee\b/gi, "détaillée"],
  [/\bdetaillees\b/gi, "détaillées"],
  [/\bprecisement\b/gi, "précisément"],
  [/\bqualite\b/gi, "qualité"],
  [/\bdonnees\b/gi, "données"],
  [/\bsynthese\b/gi, "synthèse"],
  [/\bsupplements\b/gi, "suppléments"],
  [/\breferences\b/gi, "références"],
  [/\bbibliotheque\b/gi, "bibliothèque"],
  [/\bprelevement\b/gi, "prélèvement"],
  [/\banemie\b/gi, "anémie"],
  [/\bprediabete\b/gi, "pré-diabète"],
  [/\bthyroide\b/gi, "thyroïde"],
  [/\bstrategie\b/gi, "stratégie"],
  [/\bnecessaire\b/gi, "nécessaire"],
  [/\beleve\b/gi, "élevé"],
  [/\belevee\b/gi, "élevée"],
  [/\beleves\b/gi, "élevés"],
  [/\belevees\b/gi, "élevées"],
  [/\bdeficit\b/gi, "déficit"],
  [/\bproteique\b/gi, "protéique"],
];

const applyFrenchAccentCorrections = (value: string): string => {
  let next = String(value || "");
  for (const [pattern, replacement] of FRENCH_TEXT_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  return next;
};

function normalizeGuard(value: string): string {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function guardKey(value: string): string {
  return normalizeGuard(value).replace(/[^a-z0-9]/g, "");
}

function escapeRegExp(value: string): string {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function accentInsensitivePattern(term: string): string {
  const accentGroups: Record<string, string> = {
    a: "aàáâäãå",
    c: "cç",
    e: "eéèêë",
    i: "iíìîï",
    n: "nñ",
    o: "oóòôöõ",
    u: "uúùûü",
    y: "yýÿ",
  };

  let out = "";
  for (const char of String(term || "")) {
    if (/\s/.test(char)) {
      out += "\\s+";
      continue;
    }
    const base = normalizeGuard(char);
    if (accentGroups[base]) {
      out += `[${accentGroups[base]}]`;
      continue;
    }
    out += escapeRegExp(char);
  }
  return out;
}

function isWordLikeChar(char: string | undefined): boolean {
  if (!char) return false;
  return /[A-Za-z0-9À-ÖØ-öø-ÿ]/.test(char);
}

function findWholeTermMatch(text: string, pattern: RegExp): RegExpExecArray | null {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const before = match.index > 0 ? text[match.index - 1] : "";
    const after = text[match.index + match[0].length] || "";
    if (isWordLikeChar(before) || isWordLikeChar(after)) continue;
    return match;
  }
  return null;
}

function sanitizeNarrativeTone(sectionsMap: Record<string, string>): Record<string, string> {
  const replacements: Array<[RegExp, string]> = [
    [/\bil\s+presente\b/gi, "tu presentes"],
    [/\ble client\b/gi, "tu"],
    [/\bson profil\b/gi, "ton profil"],
    [/d['’]alex/gi, "de ton bilan"],
    [/\bvous\b/gi, "tu"],
    [/\bvotre\b/gi, "ton"],
    [/\bvos\b/gi, "tes"],
    [/\bta\s+niacine\b/gi, "la niacine"],
    [/\bton\s+alt,\s*ce\s+marqueur\s+mesure[^,]+,\s*reste\b/gi, "ton ALT reste"],
    [/st[eé]ro[iï]dogen[eè]se/gi, "synthese hormonale"],
    [/\bst[eé]ro[iï]des?\b/gi, ""],
    [/hormones?\s+st[eé]ro[iï]diennes?/gi, "hormones"],
    [/st[eé]ro[iï]dien(?:ne|nes|s)?/gi, ""],
    [/\banabolis(?:ant|ante|ants|antes)\b/gi, "de construction musculaire"],
    [/\banabolisants?\b/gi, "de construction musculaire"],
    [/\bdopage\b/gi, ""],
    [/\bdopants?\b/gi, ""],
    [/\bsubstances?\s+anabolisantes?\b/gi, ""],
    [/\bsubstances?\s+dopantes?\b/gi, ""],
  ];

  const out: Record<string, string> = { ...sectionsMap };
  for (const key of SECTION_ORDER) {
    if (!out[key]) continue;
    let text = out[key];
    for (const [pattern, replacement] of replacements) {
      text = text.replace(pattern, replacement);
    }
    text = text
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\(\s*\)/g, "")
      .replace(/,\s*,/g, ",")
      .replace(/\n{3,}/g, "\n\n");
    out[key] = text;
  }
  return out;
}

function getDefinitionForMarker(marker: MarkerAnalysis): string | null {
  const idKey = guardKey(marker.markerId || "");
  if (idKey && MARKER_DEFINITION_BY_KEY[idKey]) return MARKER_DEFINITION_BY_KEY[idKey];

  const nameKey = guardKey(marker.name || "");
  if (nameKey && MARKER_DEFINITION_BY_KEY[nameKey]) return MARKER_DEFINITION_BY_KEY[nameKey];

  if (nameKey.includes("testosterone") && nameKey.includes("libre")) {
    return MARKER_DEFINITION_BY_KEY.testosteronelibre;
  }
  if (nameKey.includes("testosterone") && nameKey.includes("total")) {
    return MARKER_DEFINITION_BY_KEY.testosteronetotale;
  }
  if (nameKey.includes("vitamine") && nameKey.includes("d")) {
    return MARKER_DEFINITION_BY_KEY.vitamined;
  }
  if (nameKey.includes("triglycer")) {
    return MARKER_DEFINITION_BY_KEY.triglycerides;
  }

  return null;
}

function injectFirstMentionDefinitions(
  sectionsMap: Record<string, string>,
  markers: MarkerAnalysis[],
): Record<string, string> {
  const out: Record<string, string> = { ...sectionsMap };
  const sortedMarkers = [...markers].sort((a, b) => b.name.length - a.name.length);

  for (const key of SECTION_ORDER) {
    if (key === "sources") continue;
    if (!out[key]) continue;
    let text = out[key];
    for (const marker of sortedMarkers) {
      const markerName = String(marker.name || "").trim();
      if (!markerName) continue;
      const markerKey = guardKey(markerName);
      let pattern = accentInsensitivePattern(markerName);
      const isVitamineD =
        markerKey === "vitamined" ||
        (markerKey.includes("vitamine") && markerKey.includes("d")) ||
        (markerKey.includes("vitamin") && markerKey.includes("d"));
      if (isVitamineD) {
        // Accept naming variants like "vitamine D3", "vitamin D", "25-OH Vitamine D".
        pattern = "(?:25\\s*(?:-| )?hydroxy\\s*)?(?:vitamine|vitamin)\\s*d(?:\\s*3)?|25\\s*[- ]?oh\\s*(?:vitamine|vitamin)\\s*d(?:\\s*3)?";
      }
      const matchRegex = new RegExp(pattern, "ig");
      const match = findWholeTermMatch(text, matchRegex);
      if (!match) continue;

      const afterStart = match.index + match[0].length;
      const afterWindow = normalizeGuard(text.slice(afterStart, Math.min(text.length, afterStart + 180)));
      if (DEFINITION_HINT_REGEX.test(afterWindow)) continue;

      const definition = getDefinitionForMarker(marker);
      if (!definition) continue;

      let insertion = `${match[0]} (${definition})`;
      if (isVitamineD && /\b[dD]\s*3\b/.test(match[0])) {
        insertion = `Vitamine D (${definition})`;
      }
      text = `${text.slice(0, match.index)}${insertion}${text.slice(match.index + match[0].length)}`;
    }
    out[key] = text;
  }

  return out;
}

function limitRepeatedStatMentions(
  sectionsMap: Record<string, string>,
  markers: MarkerAnalysis[],
  maxSectionsPerStat = 3,
): Record<string, string> {
  const out: Record<string, string> = { ...sectionsMap };
  const keyTargets = [
    {
      markerId: "hdl",
      names: ["hdl"],
      replacement: "HDL, ce marqueur mesure ton cholestérol protecteur, reste hors cible",
    },
    {
      markerId: "triglycerides",
      names: ["triglycerides", "triglycérides"],
      replacement: "Les triglycérides, ce marqueur mesure les graisses circulantes, restent hors cible",
    },
    {
      markerId: "alt",
      names: ["alt"],
      replacement: "ALT, ce marqueur mesure une enzyme hépatique, reste hors cible",
    },
  ];

  const guards = keyTargets
    .map((target) => {
      const marker = markers.find((m) => guardKey(m.markerId || "") === guardKey(target.markerId));
      if (!marker || !Number.isFinite(Number(marker.value))) return null;
      const rawValue = Number(marker.value);
      const valuePattern = escapeRegExp(String(rawValue)).replace("\\.", "[.,]");
      const labelPattern = target.names.map((name) => accentInsensitivePattern(name)).join("|");
      return {
        key: target.markerId,
        detect: new RegExp(`\\b(?:${labelPattern})\\b[\\s\\S]{0,120}?\\b${valuePattern}\\b`, "i"),
        replace: new RegExp(`\\b(?:${labelPattern})\\b[\\s\\S]{0,120}?\\b${valuePattern}\\b\\s*(?:[a-zA-Z%/]+)?`, "gi"),
        replacement: target.replacement,
      };
    })
    .filter(Boolean) as Array<{
    key: string;
    detect: RegExp;
    replace: RegExp;
    replacement: string;
  }>;

  for (const guard of guards) {
    const matchedSections = SECTION_ORDER.filter((sectionKey) =>
      guard.detect.test(normalizeGuard(out[sectionKey] || "")),
    );
    if (matchedSections.length <= maxSectionsPerStat) continue;

    for (const sectionKey of matchedSections.slice(maxSectionsPerStat)) {
      out[sectionKey] = String(out[sectionKey] || "").replace(guard.replace, guard.replacement);
    }
  }

  return out;
}

function extractSourceIdsFromText(text: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const regex = /\[SRC:([^\]]+)\]/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(String(text || ""))) !== null) {
    const id = String(match[1] || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function extractKnowledgeSourceIds(knowledgeContext: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const line of String(knowledgeContext || "").split(/\r?\n/)) {
    const match = line.match(/\[SRC:([^\]]+)\]/i);
    if (!match) continue;
    const id = String(match[1] || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function narrativeLineFromTableRow(
  rowCells: string[],
  headerCells: string[] | null,
): string {
  if (!rowCells.length) return "";
  if (headerCells && headerCells.length === rowCells.length) {
    const parts = rowCells.map((cell, index) => `${headerCells[index]}: ${cell}`);
    return `Je retiens ${parts.join(", ")}.`;
  }
  return `Je retiens ${rowCells.join(", ")}.`;
}

function cleanSentenceEnding(line: string): string {
  const trimmed = String(line || "").trim();
  if (!trimmed) return "";
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function normalizeSectionToNarrative(sectionText: string): string {
  const lines = String(sectionText || "").split(/\r?\n/);
  const out: string[] = [];
  let tableHeader: string[] | null = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      if (out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }
    if (/^###\s+/.test(trimmed)) {
      out.push(trimmed);
      tableHeader = null;
      continue;
    }
    if (/^\|/.test(trimmed)) {
      const cells = trimmed
        .split("|")
        .map((cell) => cell.trim())
        .filter(Boolean);
      if (!cells.length) continue;
      if (cells.every((cell) => /^-+$/.test(cell) || /^-+:$/.test(cell) || /^:-+$/.test(cell) || /^:-+:$/.test(cell))) {
        continue;
      }
      if (!tableHeader) {
        tableHeader = cells;
        continue;
      }
      out.push(cleanSentenceEnding(narrativeLineFromTableRow(cells, tableHeader)));
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (bulletMatch) {
      const item = bulletMatch[1].trim();
      out.push(cleanSentenceEnding(`Je te recommande de ${item.charAt(0).toLowerCase()}${item.slice(1)}`));
      continue;
    }

    const numberedMatch = trimmed.match(/^\d+[\.)]\s+(.+)$/);
    if (numberedMatch) {
      out.push(cleanSentenceEnding(`Ensuite, ${numberedMatch[1].trim()}`));
      continue;
    }

    out.push(cleanSentenceEnding(trimmed));
    tableHeader = null;
  }

  const merged = out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "")
    .trim();
  return merged;
}

function enforceNarrativeProse(sectionsMap: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...sectionsMap };
  for (const key of SECTION_ORDER) {
    if (!out[key]) continue;
    out[key] = normalizeSectionToNarrative(out[key]);
  }
  return out;
}

function ensureBodySourceCitations(
  sectionsMap: Record<string, string>,
  knowledgeContext: string,
  minUniqueCitations = 8,
): Record<string, string> {
  const out: Record<string, string> = { ...sectionsMap };
  const availableIds = extractKnowledgeSourceIds(knowledgeContext);
  if (!availableIds.length) return out;

  const bodyKeys = SECTION_ORDER.filter((key) => key !== "sources");
  const currentBodyText = bodyKeys.map((key) => out[key] || "").join("\n");
  const currentIds = new Set(extractSourceIdsFromText(currentBodyText));
  const targetUnique = Math.min(minUniqueCitations, availableIds.length);

  let sourceCursor = 0;
  for (const key of bodyKeys) {
    if (currentIds.size >= targetUnique) break;
    const section = String(out[key] || "").trim();
    if (!section) continue;

    while (sourceCursor < availableIds.length && currentIds.has(availableIds[sourceCursor])) {
      sourceCursor += 1;
    }
    if (sourceCursor >= availableIds.length) break;
    const id = availableIds[sourceCursor];
    sourceCursor += 1;
    out[key] = `${section}\n\nCette orientation est soutenue par la littérature retenue pour ton dossier [SRC:${id}].`;
    currentIds.add(id);
  }

  return out;
}

function normalizeSourceIdsAgainstKnowledge(
  sectionsMap: Record<string, string>,
  knowledgeContext: string,
): Record<string, string> {
  const out: Record<string, string> = { ...sectionsMap };
  const availableIds = extractKnowledgeSourceIds(knowledgeContext);
  if (!availableIds.length) return out;

  const availableSet = new Set(availableIds);
  const bodyKeys = SECTION_ORDER.filter((key) => key !== "sources");
  const bodyText = bodyKeys.map((key) => String(out[key] || "")).join("\n");
  const usedIds = extractSourceIdsFromText(bodyText);
  const knownIds = usedIds.filter((id) => availableSet.has(id));
  const unknownIds = usedIds.filter((id) => !availableSet.has(id));
  if (!unknownIds.length) return out;

  const usedKnown = new Set(knownIds);
  let cursor = 0;
  const nextAvailable = (): string => {
    for (let i = 0; i < availableIds.length; i += 1) {
      const id = availableIds[(cursor + i) % availableIds.length];
      if (!usedKnown.has(id)) {
        cursor = (cursor + i + 1) % availableIds.length;
        usedKnown.add(id);
        return id;
      }
    }
    const fallback = availableIds[cursor % availableIds.length];
    cursor = (cursor + 1) % availableIds.length;
    return fallback;
  };

  const remap = new Map<string, string>();
  for (const id of unknownIds) {
    remap.set(id, nextAvailable());
  }

  const replaceInText = (text: string): string =>
    String(text || "").replace(/\[SRC:([^\]]+)\]/gi, (full, rawId) => {
      const id = String(rawId || "").trim();
      if (!id) return full;
      if (availableSet.has(id)) return `[SRC:${id}]`;
      const mapped = remap.get(id);
      return mapped ? `[SRC:${mapped}]` : full;
    });

  for (const key of SECTION_ORDER) {
    out[key] = replaceInText(out[key] || "");
  }

  return out;
}

function buildSyntheseFallback(
  analysisResult: BloodAnalysisResult,
  userProfile: UserProfile,
): string {
  const critical = analysisResult.markers.filter((marker) => marker.status === "critical");
  const suboptimal = analysisResult.markers.filter((marker) => marker.status === "suboptimal");
  const normal = analysisResult.markers.filter((marker) => marker.status === "normal");
  const topAlerts = [...critical, ...suboptimal].slice(0, 4);
  const topLabels = topAlerts.length
    ? topAlerts.map((marker) => `${marker.name} (${marker.value} ${marker.unit || ""})`).join(", ")
    : "aucun marqueur d'alerte majeur";
  const profileText = `${userProfile.gender}${userProfile.age ? ` de ${userProfile.age} ans` : ""}`;

  return [
    `J'ai analysé ton bilan sanguin de manière systémique sur ${analysisResult.markers.length} biomarqueurs. Tu as un profil ${profileText} avec ${critical.length} signal${critical.length > 1 ? "s" : ""} critique${critical.length > 1 ? "s" : ""}, ${suboptimal.length} signal${suboptimal.length > 1 ? "s" : ""} suboptimal${suboptimal.length > 1 ? "s" : ""} et ${normal.length} marqueur${normal.length > 1 ? "s" : ""} en zone de surveillance active. L'enjeu n'est pas seulement de corriger une valeur isolée mais de restaurer un terrain stable pour soutenir ta performance, ta recomposition corporelle et ta récupération.`,
    `Les priorités immédiates que je retiens sont ${topLabels}. Ces marqueurs forment le noyau qui freine le plus vite ta progression: tant qu'ils restent hors cible, tu paies un coût biologique élevé, avec plus de fatigue, une moins bonne tolérance au volume d'entraînement et une progression moins prévisible. Je te fais donc travailler en séquence: d'abord stabiliser le contexte de base (sommeil, timing des repas, charge d'entraînement), puis corriger les marqueurs critiques, puis consolider la zone suboptimale.`,
    `Sur les 90 prochains jours, je pilote ton plan comme un cycle structuré: phase de stabilisation, phase d'attaque, phase de consolidation puis phase d'optimisation. À chaque étape, je relie les actions nutrition/training/supplémentation aux biomarqueurs réellement dégradés, je suis les tendances hebdomadaires et je valide les décisions par retest standardisé. Cette méthode évite les protocoles génériques, réduit les erreurs d'interprétation et donne une trajectoire claire, mesurable et durable.`,
  ].join("\n\n");
}

function ensureMandatorySections(
  sectionsMap: Record<string, string>,
  analysisResult: BloodAnalysisResult,
  userProfile: UserProfile,
): Record<string, string> {
  const out: Record<string, string> = { ...sectionsMap };
  if (!String(out.synthese || "").trim() || String(out.synthese || "").trim().length < 300) {
    out.synthese = buildSyntheseFallback(analysisResult, userProfile);
  }
  if (!String(out.sources || "").trim()) {
    out.sources = "Aucune source externe citée dans ce rapport.";
  }
  return out;
}

function rebuildSourcesSectionFromCitations(
  sectionsMap: Record<string, string>,
  knowledgeContext: string,
): Record<string, string> {
  const out: Record<string, string> = { ...sectionsMap };
  const sourceLookup = new Map<string, { header: string; details: string[] }>();
  let currentId: string | null = null;

  for (const line of String(knowledgeContext || "").split(/\r?\n/)) {
    const match = line.match(/\[SRC:([^\]]+)\]\s*(.+)$/i);
    if (match) {
      const id = String(match[1] || "").trim();
      const raw = String(match[2] || "").trim().replace(/^-+\s*/, "");
      if (!id) continue;
      sourceLookup.set(id, { header: raw, details: [] });
      currentId = id;
      continue;
    }
    if (!currentId) continue;
    const trimmed = String(line || "").trim();
    if (!trimmed) {
      currentId = null;
      continue;
    }
    if (!/^(URL:|Categorie:)/i.test(trimmed)) continue;
    const entry = sourceLookup.get(currentId);
    if (!entry) continue;
    if (entry.details.length < 4) entry.details.push(trimmed);
  }

  // Preserve any explicit bibliographic lines that may already exist in the generated sources block.
  for (const line of String(out.sources || "").split(/\r?\n/)) {
    const match = line.match(/\[SRC:([^\]]+)\]\s*(.+)$/i);
    if (!match) continue;
    const id = String(match[1] || "").trim();
    const raw = String(match[2] || "").trim().replace(/^-+\s*/, "");
    if (!id || !raw || sourceLookup.has(id)) continue;
    sourceLookup.set(id, { header: raw, details: [] });
  }

  const orderedIds: string[] = [];
  const seen = new Set<string>();
  const citationRegex = /\[SRC:([^\]]+)\]/gi;

  for (const key of SECTION_ORDER) {
    if (key === "sources") continue;
    const content = String(out[key] || "");
    let match: RegExpExecArray | null;
    while ((match = citationRegex.exec(content)) !== null) {
      const id = String(match[1] || "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      orderedIds.push(id);
    }
  }

  if (!orderedIds.length) {
    out.sources = "Aucune source externe citée dans ce rapport.";
    return out;
  }

  out.sources = orderedIds
    .map((id) => {
      const entry = sourceLookup.get(id);
      if (!entry) {
        return `[SRC:${id}] Référence citée dans le rapport.`;
      }
      const withoutPrefix = sanitizeSourceCitationText(
        entry.header.replace(new RegExp(`^\\[SRC:${escapeRegExp(id)}\\]\\s*`, "i"), "").trim(),
      );
      const details = sanitizeSourceCitationText(entry.details.join(" | ").trim());
      if (withoutPrefix && details) return `[SRC:${id}] ${withoutPrefix}. ${details}`;
      return `[SRC:${id}] ${withoutPrefix || "Référence citée dans le rapport."}`;
    })
    .join("\n\n");

  return out;
}

/** Map section heading text to section key (fuzzy) */
const HEADING_TO_KEY: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /synth[eéè]se\s+ex[eé]cutive/i, key: "synthese" },
  { pattern: /qualit[eé]\s+des\s+donn[eé]es/i, key: "qualite" },
  { pattern: /tableau\s+de\s+bord/i, key: "tableau" },
  { pattern: /potentiel\s+recomposition/i, key: "recomposition" },
  { pattern: /lecture\s+compartiment[eé]e/i, key: "axes" },
  { pattern: /interconnexions?\s+majeures?/i, key: "interconnexions" },
  { pattern: /deep\s*dive/i, key: "deep_dive" },
  { pattern: /plan\s+d['’]action\s+90/i, key: "plan" },
  { pattern: /nutrition\s*[&et]+\s*entra[iî]nement/i, key: "nutrition" },
  { pattern: /suppl[eé]ments?\s*[&et]+\s*stack/i, key: "supplements" },
  { pattern: /annexes?\s*\(r[eé]f[eé]rences/i, key: "annexes" },
  { pattern: /sources?\s*\(biblioth[eéè]que/i, key: "sources" },
];

const SYSTEM_PROMPT = `Tu es Achzod, coach expert bloodwork performance (sante + recomposition + longevite). Tu parles DIRECTEMENT au client en le TUTOYANT. C'est TOI le coach qui a analyse son bilan.

REGLES ABSOLUES:
- Tu ES le coach. Premiere personne ("j'ai analyse ton bilan", "je te recommande").
- TUTOIEMENT OBLIGATOIRE partout. JAMAIS de "vous", "il", "elle", "le client", "Alex". Toujours "tu", "ton", "ta", "tes", "toi".
  Exemples corrects: "Ton HDL a 19 mg/dL est critique", "Je te recommande", "Ton foie montre des signes de surcharge".
  Exemples INTERDITS: "Le bilan d'Alex revele", "Le HDL du client", "Il presente", "Son profil".
- JAMAIS de mention d'IA, de generation automatique, d'algorithme.
- N'invente jamais une valeur, un marqueur, un symptome ou une source.
- Si une donnee manque: "Non renseigne" + impact + test utile.
- Emoji interdits.
- N'utilise jamais le caractere de tiret long ",". Utilise uniquement "-" dans toutes les phrases et titres.
- Style narratif dense: paragraphes complets, phrases detaillees.
- Interdiction absolue de listes a puces, listes numerotees, tableaux markdown.
- Cite [SRC:ID] uniquement si l'ID existe dans le contexte fourni. Cite le maximum de sources disponibles.
- Ton expert, clair, concret, sans jargon inutile.
- IMPORTANT: Tu ecris en francais avec TOUS les accents (é, è, ê, à, ù, ç, ô, î, û). Ne jamais omettre les accents.
  Exemples obligatoires: métabolique, hépatique, première, détaillé, précisément, récupération, entraînement.
- DEFINITION DE CHAQUE MARQUEUR: Quand tu mentionnes un marqueur pour la premiere fois dans une section, explique brievement ce qu'il mesure et pourquoi c'est important. Exemple: "Le HDL, c'est ton cholesterol protecteur - celui qui evacue les graisses des arteres vers le foie. A 19 mg/dL, le tien est effondre."
- INTERDICTION ABSOLUE de speculations sur l'utilisation de steroides, substances anabolisantes, ou produits dopants. Ne jamais insinuer, suggerer ou mentionner cette possibilite, meme comme "cause plausible". Focus uniquement sur les causes metaboliques, nutritionnelles, genetiques et liees au mode de vie.
- REGLE NIACINE: Ne JAMAIS recommander la niacine (vitamine B3) si l'ALT est > 40 U/L. La niacine est hepatotoxique et contre-indiquee en cas de souffrance hepatique.
- EVITER LA REPETITION: Ne repete pas les memes statistiques (valeur, pourcentage d'ecart) dans plusieurs sections. Tu peux rappeler la definition courte d'un marqueur a sa premiere mention dans chaque section, mais sans recopier tous les chiffres deja poses ailleurs. N'ecris jamais "deja detaille plus haut".
- ORIENTATION DU RAPPORT:
  - Oriente chaque analyse vers la performance, l'anabolisme, la lipolyse et la recomposition corporelle.
  - Utilise un vocabulaire d'expert terrain: volume tolerable, recuperation, synthese proteique, flexibilite metabolique, adherence.
  - Appuie tes recommandations sur la bibliotheque de connaissances APEXLABS et les sources [SRC:ID] disponibles.
  - Relie toujours les decisions nutrition/training/supplements aux marqueurs qui les justifient biologiquement.`;

// ============================================
// DEEP DIVE CONTEXT BUILDER
// ============================================

async function buildDeepDiveContext(
  markers: MarkerAnalysis[],
  userProfile: { prenom?: string; nom?: string; age?: string }
): Promise<{ context: string; markerNames: string[] }> {
  const deepDiveMarkers = selectDeepDiveMarkers(markers);
  if (!deepDiveMarkers.length) return { context: "", markerNames: [] };

  const patientName = [userProfile.prenom, userProfile.nom].filter(Boolean).join(" ").trim() || "le client";

  const sections: string[] = [];
  for (const marker of deepDiveMarkers) {
    const range = BIOMARKER_RANGES[marker.markerId];
    const normalMin = range?.normalMin ?? null;
    const normalMax = range?.normalMax ?? null;
    const optimalMin = range?.optimalMin ?? null;
    const optimalMax = range?.optimalMax ?? null;

    const keywords = [marker.name.toLowerCase(), marker.markerId];
    let articles: ScrapedArticle[] = [];
    try {
      articles = await searchArticles(keywords, 4, [
        "huberman", "applied_metabolics", "peter_attia", "mpmd",
        "chris_masterjohn", "examine", "marek_health", "sbs", "newsletter",
      ]);
    } catch (err) {
      console.warn(`[BatchHTML] searchArticles failed for ${marker.name}, skipping sources:`, (err as any)?.message);
    }
    const sourceLines = articles.slice(0, 3).map(buildSourceExcerpt);

    sections.push(
      [
        `### ${marker.name}`,
        `Patient: ${patientName}, ${userProfile.age || "N/A"} ans`,
        `Valeur mesuree: ${marker.value} ${marker.unit}`,
        `Range labo normal: ${normalMin ?? "N/A"} - ${normalMax ?? "N/A"} ${marker.unit || ""}`,
        `Range optimal performance: ${optimalMin ?? "N/A"} - ${optimalMax ?? "N/A"} ${marker.unit || ""}`,
        `Ecart vs normal: ${normalMin !== null && normalMax !== null ? formatPercentDelta(marker.value, normalMin, normalMax) : "N/A"}`,
        `Ecart vs optimal: ${optimalMin !== null && optimalMax !== null ? formatPercentDelta(marker.value, optimalMin, optimalMax) : "N/A"}`,
        `Statut: ${marker.status}`,
        "SOURCES DISPONIBLES:",
        sourceLines.length ? sourceLines.join("\n") : "- Aucune source fournie pour ce marqueur.",
      ].join("\n")
    );
  }

  return {
    context: sections.join("\n\n"),
    markerNames: deepDiveMarkers.map((m) => m.name),
  };
}

// ============================================
// SECTION PARSER (from markdown with ## headings)
// ============================================

function parseMarkdownSections(markdown: string): Record<string, string> {
  const result: Record<string, string> = {};

  // Split by ## headings
  const parts = markdown.split(/(?=^##\s+)/m);

  for (const part of parts) {
    const headingMatch = part.match(/^##\s+(.+?)[\n\r]/);
    if (!headingMatch) continue;

    const headingText = headingMatch[1].trim();
    const body = part.slice(headingMatch[0].length).trim();

    // Match heading text to section key
    let key: string | null = null;
    for (const { pattern, key: k } of HEADING_TO_KEY) {
      if (pattern.test(headingText)) {
        key = k;
        break;
      }
    }

    if (key && body.length > 20) {
      result[key] = body;
    }
  }

  return result;
}

// ============================================
// STREAMING API CALL HELPER (matches existing working pattern)
// ============================================

async function streamApiCall(
  system: string,
  userPrompt: string,
  maxTokens: number,
  label: string,
): Promise<string> {
  console.log(`[BatchHTML] ${label}: starting response (model=${OPENAI_REPORT_MODEL}, max_output_tokens=${maxTokens})`);

  const response = await runOpenAIText({
    profile: "blood",
    instructions: system,
    input: userPrompt,
    safetyId: label,
    maxOutputTokens: Math.max(16_000, maxTokens),
    label: `blood-parallel-${label}`,
  });

  const trimmed = response.text.trim();
  console.log(`[BatchHTML] ${label}: completed, ${trimmed.length} chars`);
  return trimmed;
}

// ============================================
// BATCH GENERATION ENGINE
// ============================================

interface BatchContext {
  profile: UserProfile;
  markersTable: string;
  patternsText: string;
  lifestyleLine: string;
  deepDiveContext: string;
  knowledgeContext: string;
  focusMarkers: string;
  markerCount: number;
  minDeepDiveMarkers: number;
  summaryText: string;
  supplementsExpertDirectives: string;
}

function buildBatch1Prompt(ctx: BatchContext): string {
  const mc = ctx.markerCount;
  const minSynthese = mc >= 16 ? 1200 : 900;
  const minQualite = mc >= 16 ? 900 : 700;
  const minTableau = mc >= 16 ? 900 : 700;
  const minRecomp = mc >= 16 ? 1300 : 1000;

  return `Genere les 4 sections suivantes pour ce bilan sanguin. Chaque section doit commencer par son titre exact en ## (heading de niveau 2).

## Synthese executive
- Longueur minimale: ${minSynthese} caracteres.
- Inclure: triage des priorites, impact performance/recomposition, sequence logique des actions, risques a surveiller.
- Inclure au moins 2 citations [SRC:ID] si des sources sont disponibles.

## Qualite des donnees & limites
- Longueur minimale: ${minQualite} caracteres.
- Inclure: fiabilite du panel, limites de couverture, facteurs confondants, ce qui manque pour conclure, tests prioritaires a ajouter.

## Tableau de bord (scores & priorites)
- Longueur minimale: ${minTableau} caracteres.
- Inclure: priorites critiques/importantes, quick wins, KPI de suivi hebdo et mensuel, criteres d'escalade.

## Potentiel recomposition (perte de gras + gain de muscle)
- Longueur minimale: ${minRecomp} caracteres.
- Inclure: freins biologiques dominants, opportunites court terme, conditions de progression training/nutrition, indicateurs de validation.

CONTEXTE:
Client: ${ctx.profile.prenom || "le client"} (${ctx.profile.gender} ${ctx.profile.age || ""})
Objectifs: ${ctx.profile.objectives || "Performance et sante"}
Lifestyle: ${ctx.lifestyleLine}

MARQUEURS:
${ctx.markersTable}

PATTERNS:
${ctx.patternsText}

RESUME: ${ctx.summaryText}
${ctx.knowledgeContext ? `\nSOURCES DISPONIBLES:\n${ctx.knowledgeContext}` : ""}

STYLE: Prose narrative dense. Interdiction absolue de listes a puces, listes numerotees, tableaux. Uniquement paragraphes complets.
TUTOIEMENT: OBLIGATOIRE. Utilise UNIQUEMENT "tu", "ton", "ta", "tes", "toi". JAMAIS "il", "elle", "le client", "Alex", "vous".
DEFINITIONS: Quand tu mentionnes un marqueur pour la premiere fois dans CHAQUE section generee, explique ce qu'il mesure en 1 phrase simple.`;
}

function buildBatch2Prompt(ctx: BatchContext): string {
  const mc = ctx.markerCount;
  const minAxes = mc >= 16 ? 6200 : 4700;
  const minInterco = mc >= 16 ? 1600 : 1300;
  const minDeepDive = mc >= 16 ? 5000 : 3800;

  return `Genere les 3 sections suivantes pour ce bilan sanguin. Chaque section doit commencer par son titre exact en ## (heading de niveau 2).

## Lecture compartimentee par axes
- Longueur minimale: ${minAxes} caracteres.
- Couvre chaque axe disponible dans les marqueurs du bilan.
- Pour chaque axe: sous-titre "### Nom de l'axe" puis score, lecture clinique, lecture performance/bodybuilding, actions prioritaires, tests manquants.
- Si un axe est incomplet: "Non renseigne" + tests requis.

## Interconnexions majeures (le pattern)
- Longueur minimale: ${minInterco} caracteres.
- 5 a 12 interconnexions concretes.
- Chaque interconnexion: pattern observe, hypothese mecanistique, ce qui confirmerait, action concrete.
- Cite [SRC:ID] si disponible.

## Deep dive , marqueurs prioritaires
- Longueur minimale: ${minDeepDive} caracteres.
- Couvrir au moins ${ctx.minDeepDiveMarkers} marqueurs prioritaires (critiques/suboptimaux d'abord).
- Pour chaque marqueur: sous-titre "### Nom du marqueur" puis priorite, valeur et ranges, lecture clinique, lecture performance, causes plausibles, plan d'action, tests a ajouter.
- Cite au moins 2 [SRC:ID] si disponible.

CONTEXTE:
Client: ${ctx.profile.prenom || "le client"} (${ctx.profile.gender} ${ctx.profile.age || ""})
Lifestyle: ${ctx.lifestyleLine}

MARQUEURS:
${ctx.markersTable}

PATTERNS:
${ctx.patternsText}

Top marqueurs focus: ${ctx.focusMarkers}
${ctx.deepDiveContext ? `\nDEEP DIVE - DONNEES & SOURCES:\n${ctx.deepDiveContext}` : ""}
${ctx.knowledgeContext ? `\nSOURCES DISPONIBLES:\n${ctx.knowledgeContext}` : ""}

STYLE: Prose narrative dense. Interdiction absolue de listes a puces, listes numerotees, tableaux. Uniquement paragraphes complets.
TUTOIEMENT: OBLIGATOIRE. Utilise UNIQUEMENT "tu", "ton", "ta", "tes", "toi". JAMAIS "il", "elle", "le client", "Alex", "vous".
DEFINITIONS: Pour chaque marqueur dans le deep dive, commence par expliquer en 1-2 phrases ce que ce marqueur mesure et pourquoi c'est important.
STEROIDES: INTERDIT de mentionner, insinuer ou speculer sur l'utilisation de steroides, substances anabolisantes ou produits dopants.`;
}

function buildBatch3Prompt(ctx: BatchContext): string {
  const mc = ctx.markerCount;
  const minPlan = mc >= 16 ? 3500 : 2800;
  const minNutrition = mc >= 16 ? 2700 : 2200;
  const minSupplements = mc >= 16 ? 3200 : 2500;
  const minAnnexes = mc >= 16 ? 900 : 700;

  return `Genere les 5 sections suivantes pour ce bilan sanguin. Chaque section doit commencer par son titre exact en ## (heading de niveau 2).

## Plan d'action 90 jours
- Longueur minimale: ${minPlan} caracteres.
- Sous-titres exacts obligatoires:
  ### Jours 1-14 (Stabilisation)
  ### Jours 15-30 (Phase d'Attaque)
  ### Jours 31-60 (Consolidation)
  ### Jours 61-90 (Optimisation)
  ### Retest & conditions de prelevement
- Dans chaque phase: objectifs, actions, indicateurs, erreurs a eviter.

## Nutrition & entrainement
- Longueur minimale: ${minNutrition} caracteres.
- Sous-sections: Nutrition / Entrainement.
- Pour chaque recommandation: biomarqueur cible, rationale, implementation pratique.

## Supplements & stack
- Longueur minimale: ${minSupplements} caracteres.
- 8 a 16 options classees par priorite (Niveau 1/2/3).
- Pour chaque supplement: pourquoi, dose, timing, duree, precautions, critere d'efficacite au retest.
- Niveau d'expertise attendu: clinique avancee, mecanismes concrets, formes galeniques precises, fenetres d'introduction, interactions et contre-indications.
- Priorite bibliotheque: Huberman Lab + Applied Metabolics + Examine + PubMed quand disponibles dans les [SRC:ID].
- Interdiction de recommandations basiques ou generiques non reliees aux biomarqueurs.
- REGLE NIACINE: Si ALT > 40 U/L, la niacine est INTERDITE (hepatotoxique). Recommande des alternatives (exercice aerobie, omega-3, fibres solubles).

## Annexes (references et vigilance)
- Longueur minimale: ${minAnnexes} caracteres.
- Annexe A: marqueurs secondaires. Annexe B: hypotheses ouvertes. Annexe C: glossaire. Vigilance.

## Sources (bibliotheque)
- Lister uniquement les sources reellement citees [SRC:ID].
- Si aucune source citee: "Aucune source externe citee dans ce rapport."

CONTEXTE:
Client: ${ctx.profile.prenom || "le client"} (${ctx.profile.gender} ${ctx.profile.age || ""})
Lifestyle: ${ctx.lifestyleLine}
Supplements deja utilises: ${ctx.profile.supplementsUsed?.join(", ") || "Non renseigne"}

MARQUEURS:
${ctx.markersTable}

PATTERNS:
${ctx.patternsText}

RESUME: ${ctx.summaryText}
${ctx.knowledgeContext ? `\nSOURCES DISPONIBLES:\n${ctx.knowledgeContext}` : ""}

CONTRAINTES EXPERT SUPPLEMENTS (OBLIGATOIRES):
${ctx.supplementsExpertDirectives}

STYLE: Prose narrative dense. Interdiction absolue de listes a puces, listes numerotees, tableaux. Uniquement paragraphes complets.
TUTOIEMENT: OBLIGATOIRE. Utilise UNIQUEMENT "tu", "ton", "ta", "tes", "toi". JAMAIS "il", "elle", "le client", "Alex", "vous".
DEFINITIONS: Dans chaque section de ce batch, a la premiere mention d'un marqueur, ajoute une phrase courte "ce marqueur mesure...". N'ecris jamais "deja detaille plus haut".
STEROIDES: INTERDIT de mentionner, insinuer ou speculer sur l'utilisation de steroides ou produits dopants.`;
}

function getMarkerNumericValue(markers: MarkerAnalysis[], idHints: string[], nameHints: string[] = []): number | null {
  const normalizedIdHints = idHints.map((value) => guardKey(value));
  const normalizedNameHints = nameHints.map((value) => normalizeGuard(value));
  for (const marker of markers) {
    const value = Number(marker?.value);
    if (!Number.isFinite(value)) continue;
    const markerId = guardKey(String(marker?.markerId || ""));
    const markerName = normalizeGuard(String(marker?.name || ""));
    if (
      normalizedIdHints.some((hint) => hint && (markerId === hint || markerId.includes(hint))) ||
      normalizedNameHints.some((hint) => hint && markerName.includes(hint))
    ) {
      return value;
    }
  }
  return null;
}

function buildSupplementsExpertDirectives(markers: MarkerAnalysis[]): string {
  const directives: string[] = [];
  const freeTestosterone = getMarkerNumericValue(
    markers,
    ["testosterone_libre", "free_testosterone", "testosterone_free"],
    ["testosterone libre", "free testosterone"],
  );
  const hdl = getMarkerNumericValue(markers, ["hdl"], ["hdl"]);
  const triglycerides = getMarkerNumericValue(markers, ["triglycerides", "tg"], ["triglycerides"]);
  const apoA1 = getMarkerNumericValue(markers, ["apo_a1", "apoa1"], ["apo a1", "apolipoproteines a1"]);
  const alt = getMarkerNumericValue(markers, ["alt"], ["alanine aminotransferase", "alt"]);
  const ggt = getMarkerNumericValue(markers, ["ggt"], ["ggt"]);

  directives.push(
    "1) Le niveau de detail doit rester expert et mecanistique: relie chaque dose a la biologie, aux ranges cibles et au retest.",
  );
  directives.push(
    "2) Appuie en priorite sur les sources Huberman Lab, Applied Metabolics, Examine et PubMed presentes dans les IDs fournis.",
  );

  if (freeTestosterone !== null && freeTestosterone < 15) {
    directives.push(
      `3) Testostérone libre basse detectee (${freeTestosterone}): inclure un bloc avance sur Tongkat Ali, Fadogia agrestis et bore (boron), avec dose, forme, cycle ON/OFF, risques et monitoring hormonal.`,
    );
  }
  if ((hdl !== null && hdl < 40) || (triglycerides !== null && triglycerides > 120) || (apoA1 !== null && apoA1 < 125)) {
    directives.push(
      `4) Dyslipidemie detectee (HDL=${hdl ?? "NR"}, TG=${triglycerides ?? "NR"}, ApoA1=${apoA1 ?? "NR"}): inclure berberine, citrus bergamot et myo-inositol avec rationnel sur TG/HDL, sensibilite insulinique et timing.`,
    );
  }
  if ((alt !== null && alt > 40) || (ggt !== null && ggt > 25)) {
    directives.push(
      `5) Stress hepatique detecte (ALT=${alt ?? "NR"}, GGT=${ggt ?? "NR"}): inclure TUDCA, NAC, taurine et silymarine avec fenetre d'introduction et garde-fous hepatiques; niacine strictement interdite.`,
    );
  }

  if (directives.length <= 2) {
    directives.push(
      "3) Meme sans drapeau majeur, detailler un niveau avance sur interactions, biomarqueurs sentinelles, et logique de sevrage/cycle.",
    );
  }

  return directives.join("\n");
}

type KnowledgeSourceEntry = {
  id: string;
  header: string;
  sourceLabel: string;
  normalizedHeader: string;
  normalizedSourceLabel: string;
};

function parseKnowledgeSourceEntries(knowledgeContext: string): KnowledgeSourceEntry[] {
  const entries: KnowledgeSourceEntry[] = [];
  for (const line of String(knowledgeContext || "").split(/\r?\n/)) {
    const match = line.match(/\[SRC:([^\]]+)\]\s*(.+)$/i);
    if (!match) continue;
    const id = String(match[1] || "").trim();
    const header = String(match[2] || "").trim().replace(/^-+\s*/, "");
    if (!id || !header) continue;
    const sourceLabel = header.split(",")[0].trim();
    entries.push({
      id,
      header,
      sourceLabel,
      normalizedHeader: normalizeGuard(header),
      normalizedSourceLabel: normalizeGuard(sourceLabel),
    });
  }
  return entries;
}

function pickSourceCitationId(
  entries: KnowledgeSourceEntry[],
  contentHints: string[],
  preferredSources: string[] = [],
): string | null {
  if (!entries.length) return null;
  const hintTokens = contentHints.map((value) => normalizeGuard(value)).filter(Boolean);
  const preferredTokens = preferredSources.map((value) => normalizeGuard(value)).filter(Boolean);

  const byPreferredAndHint = entries.find((entry) => {
    const preferredOk =
      preferredTokens.length === 0 || preferredTokens.some((token) => entry.normalizedSourceLabel.includes(token));
    const hintOk = hintTokens.length === 0 || hintTokens.some((token) => entry.normalizedHeader.includes(token));
    return preferredOk && hintOk;
  });
  if (byPreferredAndHint) return byPreferredAndHint.id;

  const byHint = entries.find((entry) =>
    hintTokens.length === 0 ? false : hintTokens.some((token) => entry.normalizedHeader.includes(token)),
  );
  if (byHint) return byHint.id;

  const byPreferred = entries.find((entry) =>
    preferredTokens.length === 0 ? false : preferredTokens.some((token) => entry.normalizedSourceLabel.includes(token)),
  );
  if (byPreferred) return byPreferred.id;

  return entries[0].id;
}

function pickSourceCitationIdBySource(
  entries: KnowledgeSourceEntry[],
  preferredSource: string,
): string | null {
  const token = normalizeGuard(preferredSource);
  const match = entries.find((entry) => entry.normalizedSourceLabel.includes(token));
  return match ? match.id : null;
}

function enforceExpertSupplementsSection(
  sectionsMap: Record<string, string>,
  markers: MarkerAnalysis[],
  knowledgeContext: string,
): Record<string, string> {
  const out: Record<string, string> = { ...sectionsMap };
  let supplements = String(out.supplements || "");
  if (!supplements.trim()) return out;

  const catalog = parseKnowledgeSourceEntries(knowledgeContext);
  const citation = (hints: string[], preferredSources: string[] = []) => {
    const id = pickSourceCitationId(catalog, hints, preferredSources);
    return id ? ` [SRC:${id}]` : "";
  };

  const freeTestosterone = getMarkerNumericValue(
    markers,
    ["testosterone_libre", "free_testosterone", "testosterone_free"],
    ["testosterone libre", "free testosterone"],
  );
  const hdl = getMarkerNumericValue(markers, ["hdl"], ["hdl"]);
  const triglycerides = getMarkerNumericValue(markers, ["triglycerides", "tg"], ["triglycerides"]);
  const apoA1 = getMarkerNumericValue(markers, ["apo_a1", "apoa1"], ["apo a1", "apolipoproteines a1"]);
  const alt = getMarkerNumericValue(markers, ["alt"], ["alt", "alanine aminotransferase"]);
  const ggt = getMarkerNumericValue(markers, ["ggt"], ["ggt"]);

  const lowFreeTestosterone = freeTestosterone !== null && freeTestosterone < 15;
  const dyslipidemiaPattern =
    (hdl !== null && hdl < 40) ||
    (triglycerides !== null && triglycerides > 120) ||
    (apoA1 !== null && apoA1 < 125);
  const liverStressPattern = (alt !== null && alt > 40) || (ggt !== null && ggt > 25);
  const hasTudca = /\btudca\b/i.test(supplements);
  const hasTaurine = /\btaurine\b/i.test(supplements);

  if (lowFreeTestosterone && !/(tongkat|fadogia|boron|bore)/i.test(supplements)) {
    supplements += `\n\nSur ton axe androgénique, je monte clairement au niveau expert: ta testostérone libre est trop basse pour optimiser la recomposition, donc j'ajoute un bloc ciblé Tongkat Ali + Fadogia agrestis + bore. Le Tongkat Ali se dose sur extrait standardisé (généralement 200 a 400 mg/j selon la concentration), avec suivi du sommeil, de l'irritabilité et du ressenti nerveux${citation(["tongkat ali", "testosterone"], ["huberman", "examine"])}. La Fadogia se raisonne en cycle court avec fenêtre OFF stricte et surveillance hépatique/rénale, parce que l'objectif est de tester une réponse de l'axe LH-FSH sans dérive de tolérance${citation(["fadogia", "testosterone"], ["huberman", "examine"])}. Le bore se place en appoint (souvent 6 a 10 mg/j en cycle) pour travailler la fraction libre de testostérone via la SHBG, avec arrêt immédiat en cas d'effet indésirable et contrôle biologique au retest${citation(["boron", "free testosterone", "shbg"], ["examine", "huberman"])}.`;
  }

  if (dyslipidemiaPattern && !/(berb[eé]rine|citrus\s+bergamot|myo[\s-]?inositol|inositol)/i.test(supplements)) {
    supplements += `\n\nSur le bloc lipides-insuline, je ne reste pas sur un stack basique: j'intègre la berbérine de manière structurée (souvent 500 mg avant deux ou trois repas riches en glucides) pour agir sur la sensibilité insulinique et la production hépatique de glucose${citation(["berberine", "insulin", "triglycerides"], ["examine", "huberman"])}. J'ajoute la citrus bergamot pour travailler la qualité du profil lipidique, en particulier quand HDL bas et triglycérides hauts s'installent ensemble${citation(["citrus bergamot", "lipid"], ["applied metabolics", "examine"])}. Le myo-inositol complète la stratégie sur la signalisation insulinique et la flexibilité métabolique, avec progression de dose et suivi digestif pour maintenir l'adhérence${citation(["inositol", "insulin sensitivity"], ["huberman", "applied metabolics", "examine"])}.`;
  }

  if (liverStressPattern && (!hasTudca || !hasTaurine)) {
    supplements += `\n\nVu ton stress hépatique, je renforce le protocole avec une logique hépatoprotectrice de niveau supérieur: TUDCA en introduction prudente, NAC en base antioxydante et taurine pour soutenir le flux biliaire et le terrain métabolique${citation(["tudca", "liver", "nafld"], ["applied metabolics", "mpmd", "newsletter"])}${citation(["nac", "glutathione", "liver"], ["applied metabolics", "pubmed"])}${citation(["taurine", "liver", "metabolic"], ["examine", "applied metabolics"])}. Je garde la silymarine comme fondation, je bloque les molécules potentiellement hépatotoxiques, et je ne valide aucune montée de dose si ALT/GGT ne s'améliorent pas objectivement au retest${citation(["silymarin", "alt", "nafld"], ["pubmed", "applied metabolics"])}.`;
  }

  const citationIds = new Set(extractSourceIdsFromText(supplements));
  const sourceById = new Map(catalog.map((entry) => [entry.id, entry.normalizedSourceLabel]));
  const hasHubermanCitation = Array.from(citationIds).some((id) => (sourceById.get(id) || "").includes("huberman"));
  const hasAppliedCitation = Array.from(citationIds).some((id) =>
    (sourceById.get(id) || "").includes("applied metabolics"),
  );
  const hasExamineCitation = Array.from(citationIds).some((id) => (sourceById.get(id) || "").includes("examine"));
  if ((lowFreeTestosterone || dyslipidemiaPattern || liverStressPattern) && (!hasHubermanCitation || !hasAppliedCitation || !hasExamineCitation)) {
    const hubermanId = pickSourceCitationIdBySource(catalog, "huberman");
    const appliedId = pickSourceCitationIdBySource(catalog, "applied metabolics");
    const examineId = pickSourceCitationIdBySource(catalog, "examine");
    const anchors: string[] = [];
    if (hubermanId) {
      anchors.push(`les leviers pratiques de Huberman Lab sur l'axe hormonal et la regulation neuroendocrine [SRC:${hubermanId}]`);
    }
    if (appliedId) {
      anchors.push(`l'approche terrain Applied Metabolics sur lipides, recomposition et charge hépatique [SRC:${appliedId}]`);
    }
    if (examineId) {
      anchors.push(`les fiches evidence-based Examine sur formes, dosages et interactions [SRC:${examineId}]`);
    }
    if (anchors.length) {
      supplements += `\n\nAncrage bibliotheque expert: ce protocole s'appuie explicitement sur ${anchors.join(", ")}.`;
    }
  }

  if (/\bALT\b/i.test(supplements) && !/\bALT\s*(?:\(|,)\s*ce\s+marqueur\s+mesure/i.test(supplements)) {
    supplements = supplements.replace(
      /\bALT\b/i,
      "ALT (ce marqueur mesure une enzyme hépatique qui monte quand les cellules du foie sont irritées)",
    );
  }

  out.supplements = supplements;
  return out;
}

/**
 * Generate report content via 3 sequential API calls.
 * Each call generates a batch of related sections using streaming.
 * Returns a map of { sectionKey: sectionContent }.
 */
async function generateBatchedContent(
  ctx: BatchContext,
): Promise<Record<string, string>> {
  const allSections: Record<string, string> = {};

  const batches = [
    { label: "Batch 1/3 (overview)", prompt: buildBatch1Prompt(ctx), maxTokens: 16000, expectedKeys: ["synthese", "qualite", "tableau", "recomposition"] },
    { label: "Batch 2/3 (analysis)", prompt: buildBatch2Prompt(ctx), maxTokens: 22000, expectedKeys: ["axes", "interconnexions", "deep_dive"] },
    { label: "Batch 3/3 (action)", prompt: buildBatch3Prompt(ctx), maxTokens: 22000, expectedKeys: ["plan", "nutrition", "supplements", "annexes", "sources"] },
  ];

  // Run all 3 batches IN PARALLEL (not sequential) , cuts time from ~180s to ~60-90s
  const results = await Promise.allSettled(
    batches.map(async (batch) => {
      const rawContent = await streamApiCall(
        SYSTEM_PROMPT,
        batch.prompt,
        batch.maxTokens,
        batch.label,
      );
      return { batch, rawContent };
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { batch, rawContent } = result.value;
      const parsed = parseMarkdownSections(rawContent);
      const foundKeys = Object.keys(parsed);
      console.log(`[BatchHTML] ${batch.label}: parsed sections: [${foundKeys.join(", ")}]`);

      for (const key of batch.expectedKeys) {
        if (parsed[key]) {
          allSections[key] = parsed[key];
        } else {
          console.warn(`[BatchHTML] ${batch.label}: missing section "${key}"`);
        }
      }
    } else {
      console.error(`[BatchHTML] Batch FAILED: ${result.reason?.message || result.reason}`);
    }
  }

  return allSections;
}

// ============================================
// HTML TEMPLATE
// ============================================

function statusToColor(status: string): string {
  switch (status) {
    case "optimal": return "#22c55e";
    case "normal": return "#3b82f6";
    case "suboptimal": return "#f59e0b";
    case "critical": return "#ef4444";
    default: return "#6b7280";
  }
}

function statusToLabel(status: string): string {
  switch (status) {
    case "optimal": return "Optimal";
    case "normal": return "Normal";
    case "suboptimal": return "Sous-optimal";
    case "critical": return "Critique";
    default: return status;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert markdown-ish section content to basic HTML paragraphs */
function sectionContentToHtml(content: string): string {
  let text = content.replace(/^\s*##\s+[^\n]+\n?/, "").trim();

  // Handle ### subheadings
  text = text.replace(/^###\s+(.+)$/gm, '<h3 class="subsection-title">$1</h3>');

  // Handle [SRC:ID] citations
  text = text.replace(/\[SRC:([^\]]+)\]/g, '<span class="citation">[SRC:$1]</span>');

  // Bold text
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Split into paragraphs by double newlines
  const blocks = text.split(/\n{2,}/);
  const html = blocks
    .map((block) => {
      block = block.trim();
      if (!block) return "";
      if (block.startsWith("<h3")) return block;
      return `<p>${block.replace(/\n/g, "<br>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");

  return html;
}

function buildMarkersTableHtml(markers: MarkerAnalysis[]): string {
  if (!markers.length) return "";

  const formatRangeDisplay = (range: string): string => {
    const text = String(range || "").trim();
    const match = text.match(/(-?\d+(?:[.,]\d+)?)\s*(?:-|\u2013|,)\s*(-?\d+(?:[.,]\d+)?)/);
    if (!match) return text;
    const min = Number(String(match[1]).replace(",", "."));
    const max = Number(String(match[2]).replace(",", "."));
    if (!Number.isFinite(min) || !Number.isFinite(max)) return text;
    const minLabel = Number.isInteger(min) ? String(min) : String(min);
    const maxLabel = Number.isInteger(max) ? String(max) : String(max);
    if (max >= 900) return `${minLabel}+`;
    return `${minLabel} - ${maxLabel}`;
  };

  const rows = markers
    .map((m) => {
      const color = statusToColor(m.status);
      const label = statusToLabel(m.status);
      return `<tr>
        <td class="marker-name">${escapeHtml(m.name)}</td>
        <td class="marker-value">${m.value} ${escapeHtml(m.unit)}</td>
        <td class="marker-range">${escapeHtml(formatRangeDisplay(m.normalRange))}</td>
        <td class="marker-range">${escapeHtml(formatRangeDisplay(m.optimalRange))}</td>
        <td><span class="status-badge" style="background:${color}">${label}</span></td>
      </tr>`;
    })
    .join("\n");

  return `<div class="markers-overview">
    <h3 class="subsection-title">Apercu des marqueurs</h3>
    <div class="table-wrapper">
      <table class="markers-table">
        <thead>
          <tr>
            <th>Marqueur</th>
            <th>Valeur</th>
            <th>Normal</th>
            <th>Optimal</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function buildHtmlReport(
  sections: Array<{ key: string; title: string; content: string }>,
  markers: MarkerAnalysis[],
  profile: UserProfile,
  generatedAt: string,
): string {
  const clientName = profile.prenom || "Client";

  const sectionMap = new Map(sections.map((s) => [s.key, s]));

  const sectionsHtml = SECTION_ORDER
    .map((key) => {
      const section = sectionMap.get(key);
      if (!section) return "";
      const bodyHtml = sectionContentToHtml(section.content);
      return `<section class="report-section" id="section-${key}">
        <h2 class="section-title">${escapeHtml(section.title)}</h2>
        <div class="section-body">${bodyHtml}</div>
      </section>`;
    })
    .join("\n");

  const optimal = markers.filter((m) => m.status === "optimal").length;
  const normal = markers.filter((m) => m.status === "normal").length;
  const suboptimal = markers.filter((m) => m.status === "suboptimal").length;
  const critical = markers.filter((m) => m.status === "critical").length;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APEXLABS | ACHZOD | ${escapeHtml(clientName)} | Bilan sanguin complet</title>
  <style>
    :root {
      --bg: #0a0a0f;
      --surface: #111118;
      --surface-2: #1a1a24;
      --border: #2a2a3a;
      --text: #e4e4ef;
      --text-muted: #8888a0;
      --accent: #6366f1;
      --accent-glow: rgba(99, 102, 241, 0.15);
      --optimal: #22c55e;
      --normal: #3b82f6;
      --suboptimal: #f59e0b;
      --critical: #ef4444;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      font-size: 15px;
      -webkit-font-smoothing: antialiased;
    }

    .report-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 24px 80px;
    }

    /* HEADER */
    .report-header {
      text-align: center;
      padding: 48px 24px;
      margin-bottom: 40px;
      background: linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%);
      border: 1px solid var(--border);
      border-radius: 16px;
    }

    .report-header h1 {
      font-size: 28px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }

    .report-header .subtitle {
      color: var(--text-muted);
      font-size: 14px;
      margin-bottom: 24px;
    }

    .stats-row {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .stat-card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px 24px;
      min-width: 120px;
      text-align: center;
    }

    .stat-card .stat-value {
      font-size: 28px;
      font-weight: 700;
      line-height: 1;
    }

    .stat-card .stat-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 6px;
    }

    /* TABLE OF CONTENTS */
    .toc {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px 32px;
      margin-bottom: 40px;
    }

    .toc h3 {
      font-size: 13px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 16px;
    }

    .toc-list {
      list-style: none;
      columns: 2;
      column-gap: 32px;
    }

    .toc-list li {
      padding: 6px 0;
      border-bottom: 1px solid var(--border);
    }

    .toc-list a {
      color: var(--text);
      text-decoration: none;
      font-size: 14px;
      transition: color 0.2s;
    }

    .toc-list a:hover {
      color: var(--accent);
    }

    .toc-list .toc-num {
      color: var(--accent);
      font-weight: 600;
      margin-right: 8px;
      font-size: 13px;
    }

    /* MARKERS TABLE */
    .markers-overview {
      margin-bottom: 40px;
    }

    .table-wrapper {
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: 12px;
    }

    .markers-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .markers-table th {
      background: var(--surface-2);
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 1px;
      font-weight: 600;
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }

    .markers-table td {
      padding: 10px 16px;
      border-bottom: 1px solid var(--border);
    }

    .markers-table tr:last-child td {
      border-bottom: none;
    }

    .markers-table tr:hover {
      background: var(--accent-glow);
    }

    .marker-name { font-weight: 600; }
    .marker-value { font-variant-numeric: tabular-nums; }
    .marker-range { color: var(--text-muted); font-size: 12px; }

    .status-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* SECTIONS */
    .report-section {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
      transition: border-color 0.3s;
    }

    .report-section:hover {
      border-color: var(--accent);
    }

    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid var(--accent);
      letter-spacing: -0.3px;
    }

    .section-body p {
      margin-bottom: 14px;
      color: var(--text);
    }

    .subsection-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--accent);
      margin: 24px 0 12px;
    }

    .citation {
      color: var(--accent);
      font-size: 12px;
      font-weight: 600;
      opacity: 0.8;
    }

    /* FOOTER */
    .report-footer {
      text-align: center;
      padding: 32px;
      color: var(--text-muted);
      font-size: 12px;
      border-top: 1px solid var(--border);
      margin-top: 40px;
    }

    .report-footer .brand {
      font-weight: 700;
      color: var(--accent);
    }

    /* PRINT */
    @media print {
      body { background: #fff; color: #111; font-size: 12px; }
      .report-container { max-width: 100%; padding: 20px; }
      .report-header { background: #f8f8f8; border: 1px solid #ddd; }
      .report-section { border: 1px solid #ddd; break-inside: avoid; }
      .section-title { border-color: #333; color: #111; }
      .stat-card { background: #f8f8f8; border: 1px solid #ddd; }
      .markers-table th { background: #f0f0f0; }
      .toc { background: #f8f8f8; }
      :root {
        --text: #111;
        --text-muted: #666;
        --accent: #4338ca;
      }
    }

    /* RESPONSIVE */
    @media (max-width: 640px) {
      .report-container { padding: 16px 12px 60px; }
      .report-header { padding: 32px 16px; }
      .report-header h1 { font-size: 22px; }
      .stats-row { gap: 8px; }
      .stat-card { min-width: 80px; padding: 12px 16px; }
      .stat-card .stat-value { font-size: 22px; }
      .toc-list { columns: 1; }
      .report-section { padding: 20px 16px; }
      .section-title { font-size: 18px; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <header class="report-header">
      <h1>Analyse Sanguine , ${escapeHtml(clientName)}</h1>
      <p class="subtitle">${escapeHtml(profile.gender === "femme" ? "Femme" : "Homme")}${profile.age ? ` · ${escapeHtml(profile.age)} ans` : ""} · ${markers.length} marqueurs analyses · ${escapeHtml(generatedAt)}</p>
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-value" style="color:var(--optimal)">${optimal}</div>
          <div class="stat-label">Optimal</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--normal)">${normal}</div>
          <div class="stat-label">Normal</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--suboptimal)">${suboptimal}</div>
          <div class="stat-label">Sous-optimal</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color:var(--critical)">${critical}</div>
          <div class="stat-label">Critique</div>
        </div>
      </div>
    </header>

    <nav class="toc">
      <h3>Sommaire</h3>
      <ol class="toc-list">
${SECTION_ORDER.map((key, i) => {
  const section = sectionMap.get(key);
  if (!section) return "";
  return `        <li><a href="#section-${key}"><span class="toc-num">${String(i + 1).padStart(2, "0")}</span>${escapeHtml(section.title)}</a></li>`;
}).filter(Boolean).join("\n")}
      </ol>
    </nav>

    ${buildMarkersTableHtml(markers)}

    ${sectionsHtml}

    <footer class="report-footer">
      <p>Ce rapport est genere par <span class="brand">APEXLABS</span> et ne constitue pas un avis medical.</p>
      <p>Consulte un professionnel de sante pour toute decision medicale.</p>
    </footer>
  </div>
</body>
</html>`;
}

// ============================================
// MAIN EXPORT
// ============================================

export async function generateParallelHtmlReport(
  analysisResult: BloodAnalysisResult,
  userProfile: UserProfile,
  knowledgeContext?: string,
): Promise<{ html: string; markdown: string; sections: Record<string, string> }> {
  const markerCount = analysisResult.markers.length;

  // Build markers table (shared context)
  const markersTable = analysisResult.markers
    .map((marker) => {
      const range = BIOMARKER_RANGES[marker.markerId];
      const panel = getMarkerPanelName(marker.markerId, marker.category);
      const deltaOptimal =
        range && Number.isFinite(range.optimalMin) && Number.isFinite(range.optimalMax)
          ? formatPercentDelta(marker.value, range.optimalMin, range.optimalMax)
          : "N/A";
      return `- ${marker.name} [${marker.markerId}] | Axe: ${panel} | Valeur: ${marker.value} ${marker.unit} | Normal: ${marker.normalRange} | Optimal: ${marker.optimalRange} | Ecart vs optimal: ${deltaOptimal} | Statut: ${marker.status.toUpperCase()}${marker.interpretation ? ` | Note: ${marker.interpretation}` : ""}`;
    })
    .join("\n");

  const patternsText = analysisResult.patterns.length
    ? analysisResult.patterns
        .map((p) => `Pattern detecte: ${p.name}\nCauses probables: ${p.causes.join(", ")}`)
        .join("\n\n")
    : "Aucun pattern robuste detecte avec les donnees disponibles.";

  const bmi =
    typeof userProfile.poids === "number" && typeof userProfile.taille === "number" && userProfile.taille > 0
      ? (userProfile.poids / Math.pow(userProfile.taille / 100, 2)).toFixed(1)
      : "N/A";

  const lifestyleLine = `Sommeil: ${userProfile.sleepHours ?? "N/A"} h/nuit | Training: ${userProfile.trainingHours ?? "N/A"} h/sem | Deficit: ${userProfile.calorieDeficit ?? "N/A"}% | Alcool: ${userProfile.alcoholWeekly ?? "N/A"} verres/sem | Stress: ${userProfile.stressLevel ?? "N/A"}/10 | Poids: ${userProfile.poids ?? "N/A"} kg | Taille: ${userProfile.taille ?? "N/A"} cm | IMC: ${bmi}`;

  const focusMarkers = analysisResult.markers
    .filter((m) => m.status !== "optimal")
    .slice(0, 6)
    .map((m) => `${m.name} (${m.value} ${m.unit}, ${m.status})`)
    .join(", ");

  const summaryText = `Optimal: ${analysisResult.summary.optimal.join(", ") || "Aucun"} | A surveiller: ${analysisResult.summary.watch.join(", ") || "Aucun"} | Action requise: ${analysisResult.summary.action.join(", ") || "Aucun"}`;

  const minDeepDiveMarkers = Math.max(3, Math.min(10, Math.ceil(markerCount * 0.55)));

  // Build deep dive context
  console.log(`[BatchHTML] Building deep dive context for ${markerCount} markers...`);
  const deepDivePayload = await buildDeepDiveContext(analysisResult.markers, {
    prenom: userProfile.prenom,
    nom: userProfile.nom,
    age: userProfile.age,
  });

  const ctx: BatchContext = {
    profile: userProfile,
    markersTable,
    patternsText,
    lifestyleLine,
    deepDiveContext: deepDivePayload.context,
    knowledgeContext: knowledgeContext || "",
    focusMarkers: focusMarkers || "Aucun marqueur en alerte",
    markerCount,
    minDeepDiveMarkers,
    summaryText,
    supplementsExpertDirectives: buildSupplementsExpertDirectives(analysisResult.markers),
  };

  const sourcesContext = [ctx.knowledgeContext, ctx.deepDiveContext].filter(Boolean).join("\n\n");

  const startTime = Date.now();
  let sectionsMap: Record<string, string> = {};

  // ========== 3 PARALLEL batch calls ==========
  console.log(`[BatchHTML] Starting 3 parallel batched API calls...`);
  try {
    sectionsMap = await generateBatchedContent(ctx);
    const foundCount = Object.keys(sectionsMap).length;
    console.log(`[BatchHTML] Parallel generation produced ${foundCount}/12 sections`);
  } catch (err: any) {
    console.error(`[BatchHTML] Generation failed: ${err.message}`);
  }

  const fillMissingFromMarkdown = (markdown: string, reason: string) => {
    const parsed = parseMarkdownSections(markdown || "");
    const missingBefore = SECTION_ORDER.filter((key) => !sectionsMap[key]);
    for (const key of missingBefore) {
      if (parsed[key]) sectionsMap[key] = parsed[key];
    }
    const missingAfter = SECTION_ORDER.filter((key) => !sectionsMap[key]);
    console.log(
      `[BatchHTML] Missing sections repair (${reason}): ${missingBefore.length} -> ${missingAfter.length}`
    );
  };

  const missingAfterParallel = SECTION_ORDER.filter((key) => !sectionsMap[key]);
  if (missingAfterParallel.length > 0) {
    try {
      console.warn(
        `[BatchHTML] Incomplete parallel output (${missingAfterParallel.length}/12 missing). Running canonical markdown recovery.`
      );
      const canonicalMarkdown = await generateAIBloodAnalysis(
        analysisResult,
        userProfile,
        knowledgeContext
      );
      fillMissingFromMarkdown(canonicalMarkdown, "canonical_markdown");
    } catch (err: any) {
      console.error(`[BatchHTML] Canonical markdown recovery failed: ${err?.message || err}`);
    }
  }

  const missingAfterCanonical = SECTION_ORDER.filter((key) => !sectionsMap[key]);
  if (missingAfterCanonical.length > 0) {
    try {
      console.warn(
        `[BatchHTML] Still incomplete (${missingAfterCanonical.length}/12 missing). Applying deterministic fallback recovery.`
      );
      const fallbackMarkdown = buildFallbackAnalysis(
        analysisResult,
        userProfile,
        knowledgeContext
      );
      fillMissingFromMarkdown(fallbackMarkdown, "deterministic_fallback");
    } catch (err: any) {
      console.error(`[BatchHTML] Deterministic fallback recovery failed: ${err?.message || err}`);
    }
  }

  // Deterministic quality guards so final output always follows hard constraints
  sectionsMap = ensureMandatorySections(sectionsMap, analysisResult, userProfile);
  sectionsMap = sanitizeNarrativeTone(sectionsMap);
  sectionsMap = injectFirstMentionDefinitions(sectionsMap, analysisResult.markers);
  sectionsMap = enforceNarrativeProse(sectionsMap);
  sectionsMap = ensureBodySourceCitations(sectionsMap, sourcesContext, 8);
  sectionsMap = normalizeSourceIdsAgainstKnowledge(sectionsMap, sourcesContext);
  sectionsMap = limitRepeatedStatMentions(sectionsMap, analysisResult.markers, 3);
  sectionsMap = enforceExpertSupplementsSection(sectionsMap, analysisResult.markers, sourcesContext);
  sectionsMap = sanitizeNarrativeTone(sectionsMap);
  sectionsMap = rebuildSourcesSectionFromCitations(sectionsMap, sourcesContext);
  sectionsMap = sanitizeNarrativeTone(sectionsMap);
  sectionsMap = Object.fromEntries(
    Object.entries(sectionsMap).map(([key, value]) => [
      key,
      stripForbiddenStyleTokens(applyFrenchAccentCorrections(value || "")),
    ]),
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalSections = Object.keys(sectionsMap).length;
  console.log(`[BatchHTML] Generation complete: ${totalSections}/12 sections in ${elapsed}s`);

  // ========== ASSEMBLE SECTIONS ==========
  const generatedSections: Array<{ key: string; title: string; content: string }> = [];
  for (const key of SECTION_ORDER) {
    const title = SECTION_TITLES[key] || key;
    const content = sectionsMap[key] || "";
    generatedSections.push({ key, title, content });
  }

  // Build markdown for backwards compatibility
  const markdown = stripForbiddenStyleTokens(generatedSections
    .map((s) => {
      const hasHeading = s.content.match(/^\s*##\s+/);
      return hasHeading ? s.content : `## ${s.title}\n\n${s.content}`;
    })
    .join("\n\n"));

  // Build HTML
  const now = new Date();
  const generatedAt = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;

  const html = stripForbiddenStyleTokens(buildHtmlReport(
    generatedSections,
    analysisResult.markers,
    userProfile,
    generatedAt,
  ));

  console.log(`[BatchHTML] Final: ${html.length} chars HTML, ${markdown.length} chars markdown, ${totalSections}/12 sections`);

  return { html, markdown, sections: sectionsMap };
}
