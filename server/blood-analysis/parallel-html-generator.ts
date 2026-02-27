/**
 * NEUROCORE 360 - Parallel HTML Blood Report Generator
 *
 * Generates each report section in parallel via Promise.all(),
 * then assembles them into a styled HTML document.
 */

import Anthropic from "@anthropic-ai/sdk";
import { searchArticles } from "../knowledge/storage";
import type { ScrapedArticle } from "../knowledge/storage";
import {
  BIOMARKER_RANGES,
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

interface SectionSpec {
  key: string;
  title: string;
  maxTokens: number;
  minChars: number;
  buildPrompt: (ctx: PromptContext) => string;
}

interface PromptContext {
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

// ============================================
// PANEL / HELPERS (duplicated minimal set to stay self-contained)
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
// SECTION SYSTEM PROMPT (shared for all sections)
// ============================================

const SECTION_SYSTEM_PROMPT = `Tu es Achzod, coach expert bloodwork performance (sante + recomposition + longevite). Tu parles DIRECTEMENT au client en le tutoyant. C'est TOI le coach qui a analyse son bilan.

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
// SECTION DEFINITIONS
// ============================================

const buildSectionSpecs = (markerCount: number): SectionSpec[] => {
  const mult = markerCount >= 22 ? 1.2 : markerCount >= 16 ? 1.08 : markerCount >= 12 ? 1.0 : markerCount >= 8 ? 0.85 : 0.72;
  const mc = (base: number) => Math.round(base * mult);

  return [
    {
      key: "synthese",
      title: "Synthese executive",
      maxTokens: 5000,
      minChars: mc(1200),
      buildPrompt: (ctx) => `Genere UNIQUEMENT la section "## Synthese executive".

Contraintes:
- Longueur minimale: ${mc(1200)} caracteres.
- Inclure: triage des priorites, impact performance/recomposition, sequence logique des actions, risques a surveiller.
- S'appuyer strictement sur les marqueurs reels et leur statut.
- Inclure au moins 2 citations [SRC:ID] si des sources sont disponibles.

Contexte:
Client: ${ctx.profile.prenom || "le client"} (${ctx.profile.gender} ${ctx.profile.age || ""})
Lifestyle: ${ctx.lifestyleLine}
Marqueurs: ${ctx.markersTable}
Patterns: ${ctx.patternsText}
Resume: ${ctx.summaryText}
${ctx.knowledgeContext ? `\nSources disponibles:\n${ctx.knowledgeContext}` : ""}`,
    },
    {
      key: "qualite",
      title: "Qualite des donnees & limites",
      maxTokens: 4200,
      minChars: mc(900),
      buildPrompt: (ctx) => `Genere UNIQUEMENT la section "## Qualite des donnees & limites".

Contraintes:
- Longueur minimale: ${mc(900)} caracteres.
- Inclure: fiabilite du panel, limites de couverture, facteurs confondants, ce qui manque pour conclure, tests prioritaires a ajouter.
- Quand une info manque: "Non renseigne" + impact concret.

Contexte:
Lifestyle: ${ctx.lifestyleLine}
Marqueurs (${ctx.markerCount} au total): ${ctx.markersTable}
Patterns: ${ctx.patternsText}`,
    },
    {
      key: "tableau",
      title: "Tableau de bord (scores & priorites)",
      maxTokens: 4500,
      minChars: mc(900),
      buildPrompt: (ctx) => `Genere UNIQUEMENT la section "## Tableau de bord (scores & priorites)".

Contraintes:
- Longueur minimale: ${mc(900)} caracteres.
- Inclure: priorites critiques/importantes, quick wins, KPI de suivi hebdo et mensuel, criteres d'escalade.
- Lier explicitement les priorites aux biomarqueurs.

Contexte:
Marqueurs: ${ctx.markersTable}
Patterns: ${ctx.patternsText}
Resume: ${ctx.summaryText}`,
    },
    {
      key: "recomposition",
      title: "Potentiel recomposition (perte de gras + gain de muscle)",
      maxTokens: 4500,
      minChars: mc(1300),
      buildPrompt: (ctx) => `Genere UNIQUEMENT la section "## Potentiel recomposition (perte de gras + gain de muscle)".

Contraintes:
- Longueur minimale: ${mc(1300)} caracteres.
- Inclure: freins biologiques dominants, opportunites court terme, conditions de progression training/nutrition, indicateurs de validation.
- Relier les conclusions aux marqueurs prioritaires.

Contexte:
Client: ${ctx.profile.prenom || "le client"} (${ctx.profile.gender} ${ctx.profile.age || ""})
Lifestyle: ${ctx.lifestyleLine}
Marqueurs: ${ctx.markersTable}
Patterns: ${ctx.patternsText}`,
    },
    {
      key: "axes",
      title: "Lecture compartimentee par axes",
      maxTokens: 9000,
      minChars: mc(6200),
      buildPrompt: (ctx) => `Genere UNIQUEMENT la section "## Lecture compartimentee par axes".

Contraintes:
- Longueur minimale: ${mc(6200)} caracteres.
- Couvre explicitement chaque axe disponible dans les marqueurs du bilan.
- Pour chaque axe: sous-titre "### Nom de l'axe" puis score, lecture clinique, lecture performance/bodybuilding, actions prioritaires, tests manquants.
- Utilise les vrais marqueurs et leurs valeurs. Si un axe est incomplet, ecris "Non renseigne" et les tests requis.

Contexte marqueurs:
${ctx.markersTable}

Patterns:
${ctx.patternsText}`,
    },
    {
      key: "interconnexions",
      title: "Interconnexions majeures (le pattern)",
      maxTokens: 6000,
      minChars: mc(1600),
      buildPrompt: (ctx) => `Genere UNIQUEMENT la section "## Interconnexions majeures (le pattern)".

Contraintes:
- Longueur minimale: ${mc(1600)} caracteres.
- 5 a 12 interconnexions concretes maximum.
- Chaque interconnexion: pattern observe, hypothese mecanistique, ce qui confirmerait, action concrete.
- Lier explicitement les marqueurs entre eux.
- Cite [SRC:ID] si disponible.

Contexte:
Marqueurs: ${ctx.markersTable}
Patterns: ${ctx.patternsText}
${ctx.knowledgeContext ? `\nSources disponibles:\n${ctx.knowledgeContext}` : ""}`,
    },
    {
      key: "deep_dive",
      title: "Deep dive — marqueurs prioritaires",
      maxTokens: 10000,
      minChars: mc(5000),
      buildPrompt: (ctx) => `Genere UNIQUEMENT la section "## Deep dive — marqueurs prioritaires".

Contraintes:
- Longueur minimale: ${mc(5000)} caracteres.
- Couvrir au moins ${ctx.minDeepDiveMarkers} marqueurs prioritaires (critiques/suboptimaux d'abord).
- Pour chaque marqueur: sous-titre "### Nom du marqueur" puis priorite, valeur et ranges, lecture clinique, lecture performance, causes plausibles, facteurs confondants, plan d'action, tests a ajouter, niveau de confiance.
- Cite au moins 2 [SRC:ID] si disponible.

Contexte:
${ctx.markersTable}

Top marqueurs focus: ${ctx.focusMarkers}
${ctx.deepDiveContext ? `\nDonnees detaillees et sources:\n${ctx.deepDiveContext}` : ""}`,
    },
    {
      key: "plan",
      title: "Plan d'action 90 jours",
      maxTokens: 9000,
      minChars: mc(3500),
      buildPrompt: (ctx) => `Genere UNIQUEMENT la section "## Plan d'action 90 jours".

Contraintes:
- Longueur minimale: ${mc(3500)} caracteres.
- Sous-titres exacts obligatoires:
  ### Jours 1-14 (Stabilisation)
  ### Jours 15-30 (Phase d'Attaque)
  ### Jours 31-60 (Consolidation)
  ### Jours 61-90 (Optimisation)
  ### Retest & conditions de prelevement
- Dans chaque phase: objectifs, actions, indicateurs, erreurs a eviter.
- Lier chaque action aux marqueurs concernes.

Contexte:
Client: ${ctx.profile.prenom || "le client"} (${ctx.profile.gender} ${ctx.profile.age || ""})
Lifestyle: ${ctx.lifestyleLine}
Marqueurs: ${ctx.markersTable}
Patterns: ${ctx.patternsText}`,
    },
    {
      key: "nutrition",
      title: "Nutrition & entrainement",
      maxTokens: 8000,
      minChars: mc(2700),
      buildPrompt: (ctx) => `Genere UNIQUEMENT la section "## Nutrition & entrainement".

Contraintes:
- Longueur minimale: ${mc(2700)} caracteres.
- Sous-sections: Nutrition / Entrainement.
- Pour chaque recommandation: biomarqueur cible, rationale, implementation pratique.
- Inclure structure hebdo, timing glucides, proteines, micronutriments, volume/intensite, cardio, NEAT, recuperation.
- Si une donnee manque: "Non renseigne".

Contexte:
Client: ${ctx.profile.prenom || "le client"} (${ctx.profile.gender} ${ctx.profile.age || ""})
Lifestyle: ${ctx.lifestyleLine}
Marqueurs: ${ctx.markersTable}`,
    },
    {
      key: "supplements",
      title: "Supplements & stack",
      maxTokens: 9000,
      minChars: mc(3200),
      buildPrompt: (ctx) => `Genere UNIQUEMENT la section "## Supplements & stack".

Contraintes:
- Longueur minimale: ${mc(3200)} caracteres.
- 8 a 16 options max, classees par priorite (Niveau 1/2/3).
- Pour chaque supplement: pourquoi (marqueur/pattern vise), dose indicative, timing, duree, precautions/interactions, critere d'efficacite au retest.
- Integrer ce qui est deja utilise par le client si l'info est disponible.

Contexte:
Supplements deja utilises: ${ctx.profile.supplementsUsed?.join(", ") || "Non renseigne"}
${ctx.markersTable}
Resume: ${ctx.summaryText}`,
    },
    {
      key: "annexes",
      title: "Annexes (references et vigilance)",
      maxTokens: 5000,
      minChars: mc(900),
      buildPrompt: (ctx) => `Genere UNIQUEMENT la section "## Annexes (references et vigilance)".

Contraintes:
- Longueur minimale: ${mc(900)} caracteres.
- Inclure:
  - Annexe A: marqueurs secondaires (statut + interpretation + action rapide)
  - Annexe B: hypotheses ouvertes + tests de confirmation
  - Annexe C: glossaire utile
  - Vigilance

Contexte:
${ctx.markersTable}`,
    },
    {
      key: "sources",
      title: "Sources (bibliotheque)",
      maxTokens: 3000,
      minChars: 120,
      buildPrompt: (ctx) => `Genere UNIQUEMENT la section "## Sources (bibliotheque)".

Contraintes:
- Liste uniquement les sources reellement utilisees dans le rapport.
- Format: [SRC:ID] Titre — Auteur/Source — Resume en 1 ligne.
- Si aucune source n'a ete citee: ecrire "Aucune source externe citee dans ce rapport."

Sources disponibles:
${ctx.knowledgeContext || "Aucune source fournie."}`,
    },
  ];
};

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
      console.warn(`[ParallelHTML] searchArticles failed for ${marker.name}, skipping sources:`, (err as any)?.message);
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
// PARALLEL GENERATION ENGINE
// ============================================

async function generateSectionContent(
  anthropic: Anthropic,
  spec: SectionSpec,
  ctx: PromptContext,
): Promise<{ key: string; title: string; content: string }> {
  const prompt = spec.buildPrompt(ctx);
  const model = process.env.BLOOD_ANALYSIS_MODEL || "claude-opus-4-6";

  const stream = await anthropic.messages.create({
    model,
    max_tokens: spec.maxTokens,
    system: SECTION_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
    stream: true,
  });

  let content = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      content += event.delta.text;
    }
  }

  return { key: spec.key, title: spec.title, content: content.trim() };
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
  // Remove the ## heading if present at the start (we render it separately)
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
      // Preserve single newlines within paragraphs as <br>
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

  const sectionOrder = [
    "synthese", "qualite", "tableau", "recomposition",
    "axes", "interconnexions", "deep_dive", "plan",
    "nutrition", "supplements", "annexes", "sources",
  ];

  const sectionMap = new Map(sections.map((s) => [s.key, s]));

  const sectionsHtml = sectionOrder
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

  // Summary stats
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
${sectionOrder.map((key, i) => {
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

  // Build markers table (shared across all prompts)
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
  console.log(`[ParallelHTML] Building deep dive context for ${markerCount} markers...`);
  const deepDivePayload = await buildDeepDiveContext(analysisResult.markers, {
    prenom: userProfile.prenom,
    nom: userProfile.nom,
    age: userProfile.age,
  });

  const ctx: PromptContext = {
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

  // Build all section specs
  const specs = buildSectionSpecs(markerCount);

  // ========== PARALLEL GENERATION ==========
  console.log(`[ParallelHTML] Launching ${specs.length} parallel section generations...`);
  const startTime = Date.now();

  const results = await Promise.allSettled(
    specs.map((spec) =>
      generateSectionContent(anthropic, spec, ctx).catch((err) => {
        console.error(`[ParallelHTML] Section "${spec.key}" failed:`, err.message);
        throw err;
      })
    )
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[ParallelHTML] All sections completed in ${elapsed}s`);

  // Collect results
  const generatedSections: Array<{ key: string; title: string; content: string }> = [];
  const failedSections: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const spec = specs[i];
    if (result.status === "fulfilled") {
      const { key, title, content } = result.value;
      if (content.length < spec.minChars * 0.5) {
        console.warn(`[ParallelHTML] Section "${key}" too short (${content.length}/${spec.minChars}), will retry`);
        failedSections.push(key);
      } else {
        console.log(`[ParallelHTML] Section "${key}": ${content.length} chars`);
        generatedSections.push({ key, title, content });
      }
    } else {
      console.error(`[ParallelHTML] Section "${spec.key}" rejected:`, result.reason);
      failedSections.push(spec.key);
    }
  }

  // Retry failed sections sequentially (with relaxed thresholds)
  if (failedSections.length > 0) {
    console.log(`[ParallelHTML] Retrying ${failedSections.length} failed sections...`);
    for (const key of failedSections) {
      const spec = specs.find((s) => s.key === key);
      if (!spec) continue;
      try {
        const result = await generateSectionContent(anthropic, spec, ctx);
        console.log(`[ParallelHTML] Retry "${key}": ${result.content.length} chars`);
        generatedSections.push(result);
      } catch (err: any) {
        console.error(`[ParallelHTML] Retry "${key}" also failed:`, err.message);
        // Push empty section so the report still has the heading
        generatedSections.push({ key, title: spec.title, content: `Section non disponible. Veuillez regenerer le rapport.` });
      }
    }
  }

  // Build markdown for backwards compatibility
  const markdown = generatedSections
    .sort((a, b) => {
      const order = specs.map((s) => s.key);
      return order.indexOf(a.key) - order.indexOf(b.key);
    })
    .map((s) => {
      // Ensure section starts with ## heading
      const hasHeading = s.content.match(/^\s*##\s+/);
      return hasHeading ? s.content : `## ${s.title}\n\n${s.content}`;
    })
    .join("\n\n");

  // Build sections map
  const sectionsMap: Record<string, string> = {};
  for (const s of generatedSections) {
    sectionsMap[s.key] = s.content;
  }

  // Build HTML
  const now = new Date();
  const generatedAt = `${now.getDate().toString().padStart(2, "0")}/${(now.getMonth() + 1).toString().padStart(2, "0")}/${now.getFullYear()}`;

  const html = buildHtmlReport(
    generatedSections.sort((a, b) => {
      const order = specs.map((s) => s.key);
      return order.indexOf(a.key) - order.indexOf(b.key);
    }),
    analysisResult.markers,
    userProfile,
    generatedAt,
  );

  console.log(`[ParallelHTML] Final report: ${html.length} chars HTML, ${markdown.length} chars markdown, ${generatedSections.length}/${specs.length} sections`);

  return { html, markdown, sections: sectionsMap };
}
