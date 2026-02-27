/**
 * NEUROCORE 360 - Batched HTML Blood Report Generator (V2)
 *
 * Architecture:
 *   1. Build shared context (markers, patterns, lifestyle, deep dive)
 *   2. Generate content via 3 sequential API calls (batches of related sections)
 *      - Uses streaming, same pattern as the proven generateAIBloodAnalysis()
 *   3. Parse sections from each response by ## headings
 *   4. Render all sections into styled HTML template
 *   5. Fallback: if batches fail, use generateAIBloodAnalysis() + parse + HTML
 */

import Anthropic from "@anthropic-ai/sdk";
import { searchArticles } from "../knowledge/storage";
import type { ScrapedArticle } from "../knowledge/storage";
import {
  BIOMARKER_RANGES,
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

const buildSourceExcerpt = (article: ScrapedArticle) => {
  const excerpt = (article.content || "").slice(0, 300).replace(/\n/g, " ");
  return `- [SRC:${article.id}] ${article.title || "Sans titre"} (${article.source || "N/A"}): ${excerpt}...`;
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
  synthese: "Synthese executive",
  qualite: "Qualite des donnees & limites",
  tableau: "Tableau de bord (scores & priorites)",
  recomposition: "Potentiel recomposition (perte de gras + gain de muscle)",
  axes: "Lecture compartimentee par axes",
  interconnexions: "Interconnexions majeures (le pattern)",
  deep_dive: "Deep dive — marqueurs prioritaires",
  plan: "Plan d'action 90 jours",
  nutrition: "Nutrition & entrainement",
  supplements: "Supplements & stack",
  annexes: "Annexes (references et vigilance)",
  sources: "Sources (bibliotheque)",
};

/** Map section heading text to section key (fuzzy) */
const HEADING_TO_KEY: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /synth[eè]se\s+executive/i, key: "synthese" },
  { pattern: /qualit[eé]\s+des\s+donn[eé]es/i, key: "qualite" },
  { pattern: /tableau\s+de\s+bord/i, key: "tableau" },
  { pattern: /potentiel\s+recomposition/i, key: "recomposition" },
  { pattern: /lecture\s+compartiment/i, key: "axes" },
  { pattern: /interconnexions?\s+majeure/i, key: "interconnexions" },
  { pattern: /deep\s*dive/i, key: "deep_dive" },
  { pattern: /plan\s+d['']?action\s+90/i, key: "plan" },
  { pattern: /nutrition\s*[&et]+\s*entra[iî]nement/i, key: "nutrition" },
  { pattern: /suppl[eé]ments?\s*[&et]+\s*stack/i, key: "supplements" },
  { pattern: /annexes?\s*\(r[eé]f[eé]rences/i, key: "annexes" },
  { pattern: /sources?\s*\(biblioth[eè]que/i, key: "sources" },
];

const SYSTEM_PROMPT = `Tu es Achzod, coach expert bloodwork performance (sante + recomposition + longevite). Tu parles DIRECTEMENT au client en le tutoyant. C'est TOI le coach qui a analyse son bilan.

REGLES ABSOLUES:
- Tu ES le coach. Premiere personne ("j'ai analyse ton bilan", "je te recommande").
- Tutoiement OBLIGATOIRE partout.
- JAMAIS de mention d'IA, de generation automatique, d'algorithme.
- N'invente jamais une valeur, un marqueur, un symptome ou une source.
- Si une donnee manque: "Non renseigne" + impact + test utile.
- Emoji interdits.
- Style narratif dense: paragraphes complets, phrases detaillees.
- Interdiction absolue de listes a puces, listes numerotees, tableaux markdown.
- Cite [SRC:ID] uniquement si l'ID existe dans le contexte fourni.
- Ton expert, clair, concret, sans jargon inutile.`;

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
  anthropic: Anthropic,
  system: string,
  userPrompt: string,
  maxTokens: number,
  label: string,
): Promise<string> {
  const model = process.env.BLOOD_ANALYSIS_MODEL || "claude-opus-4-6";
  console.log(`[BatchHTML] ${label}: starting stream (model=${model}, max_tokens=${maxTokens})`);

  const stream = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userPrompt }],
    stream: true,
  });

  let content = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      content += event.delta.text;
    }
  }

  const trimmed = content.trim();
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

STYLE: Prose narrative dense. Interdiction absolue de listes a puces, listes numerotees, tableaux. Uniquement paragraphes complets.`;
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

## Deep dive — marqueurs prioritaires
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

STYLE: Prose narrative dense. Interdiction absolue de listes a puces, listes numerotees, tableaux. Uniquement paragraphes complets.`;
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

STYLE: Prose narrative dense. Interdiction absolue de listes a puces, listes numerotees, tableaux. Uniquement paragraphes complets.`;
}

/**
 * Generate report content via 3 sequential API calls.
 * Each call generates a batch of related sections using streaming.
 * Returns a map of { sectionKey: sectionContent }.
 */
async function generateBatchedContent(
  anthropic: Anthropic,
  ctx: BatchContext,
): Promise<Record<string, string>> {
  const allSections: Record<string, string> = {};

  const batches = [
    { label: "Batch 1/3 (overview)", prompt: buildBatch1Prompt(ctx), maxTokens: 16000, expectedKeys: ["synthese", "qualite", "tableau", "recomposition"] },
    { label: "Batch 2/3 (analysis)", prompt: buildBatch2Prompt(ctx), maxTokens: 22000, expectedKeys: ["axes", "interconnexions", "deep_dive"] },
    { label: "Batch 3/3 (action)", prompt: buildBatch3Prompt(ctx), maxTokens: 22000, expectedKeys: ["plan", "nutrition", "supplements", "annexes", "sources"] },
  ];

  for (const batch of batches) {
    try {
      const rawContent = await streamApiCall(
        anthropic,
        SYSTEM_PROMPT,
        batch.prompt,
        batch.maxTokens,
        batch.label,
      );

      // Parse sections from the response
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
    } catch (err: any) {
      console.error(`[BatchHTML] ${batch.label} FAILED: ${err.message} (status=${err.status || "N/A"})`);
      // Don't throw — continue with remaining batches, missing sections will use fallback
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

  const rows = markers
    .map((m) => {
      const color = statusToColor(m.status);
      const label = statusToLabel(m.status);
      return `<tr>
        <td class="marker-name">${escapeHtml(m.name)}</td>
        <td class="marker-value">${m.value} ${escapeHtml(m.unit)}</td>
        <td class="marker-range">${escapeHtml(m.normalRange)}</td>
        <td class="marker-range">${escapeHtml(m.optimalRange)}</td>
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
  <title>Rapport Sanguin — ${escapeHtml(clientName)}</title>
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
      <h1>Analyse Sanguine — ${escapeHtml(clientName)}</h1>
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
      <p>Ce rapport est genere par <span class="brand">NEUROCORE 360</span> et ne constitue pas un avis medical.</p>
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
  const anthropic = new Anthropic();
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
  };

  const startTime = Date.now();
  let sectionsMap: Record<string, string> = {};

  // ========== TIER 1: Batched sequential generation ==========
  console.log(`[BatchHTML] Starting Tier 1: 3 sequential batched API calls...`);
  try {
    sectionsMap = await generateBatchedContent(anthropic, ctx);
    const foundCount = Object.keys(sectionsMap).length;
    console.log(`[BatchHTML] Tier 1 produced ${foundCount}/12 sections`);
  } catch (err: any) {
    console.error(`[BatchHTML] Tier 1 completely failed: ${err.message}`);
  }

  // ========== TIER 2: Fallback to existing generateAIBloodAnalysis ==========
  const missingSections = SECTION_ORDER.filter((k) => !sectionsMap[k]);
  if (missingSections.length > 0) {
    console.log(`[BatchHTML] Missing ${missingSections.length} sections: [${missingSections.join(", ")}]. Trying Tier 2 fallback...`);
    try {
      const fallbackMarkdown = await generateAIBloodAnalysis(analysisResult, userProfile, knowledgeContext);
      const fallbackSections = parseMarkdownSections(fallbackMarkdown);
      const fallbackKeys = Object.keys(fallbackSections);
      console.log(`[BatchHTML] Tier 2 fallback parsed ${fallbackKeys.length} sections: [${fallbackKeys.join(", ")}]`);

      // Fill in only the missing sections
      for (const key of missingSections) {
        if (fallbackSections[key]) {
          sectionsMap[key] = fallbackSections[key];
        }
      }
    } catch (err: any) {
      console.error(`[BatchHTML] Tier 2 fallback also failed: ${err.message}`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalSections = Object.keys(sectionsMap).length;
  console.log(`[BatchHTML] Generation complete: ${totalSections}/12 sections in ${elapsed}s`);

  // ========== ASSEMBLE SECTIONS ==========
  const generatedSections: Array<{ key: string; title: string; content: string }> = [];
  for (const key of SECTION_ORDER) {
    const title = SECTION_TITLES[key] || key;
    const content = sectionsMap[key] || "Section non disponible. Veuillez regenerer le rapport.";
    generatedSections.push({ key, title, content });
  }

  // Build markdown for backwards compatibility
  const markdown = generatedSections
    .map((s) => {
      const hasHeading = s.content.match(/^\s*##\s+/);
      return hasHeading ? s.content : `## ${s.title}\n\n${s.content}`;
    })
    .join("\n\n");

  // Build HTML
  const now = new Date();
  const generatedAt = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;

  const html = buildHtmlReport(
    generatedSections,
    analysisResult.markers,
    userProfile,
    generatedAt,
  );

  console.log(`[BatchHTML] Final: ${html.length} chars HTML, ${markdown.length} chars markdown, ${totalSections}/12 sections`);

  return { html, markdown, sections: sectionsMap };
}
