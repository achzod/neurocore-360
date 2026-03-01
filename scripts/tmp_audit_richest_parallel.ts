import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

import {
  extractMarkersFromPdfText,
  analyzeBloodwork,
  getBloodworkKnowledgeContext,
} from "../server/blood-analysis/index.ts";
import { generateComprehensiveRiskProfile } from "../server/blood-analysis/risk-scores.ts";
import { generateParallelHtmlReport } from "../server/blood-analysis/parallel-html-generator.ts";

type SectionRule = { title: string; minChars: number };

const DATA_DIR = path.resolve("data");
const OUTPUT_DIR = path.resolve("output");

const requiredSections: SectionRule[] = [
  { title: "Synthèse exécutive", minChars: 1200 },
  { title: "Qualité des données & limites", minChars: 850 },
  { title: "Tableau de bord (scores & priorités)", minChars: 900 },
  { title: "Potentiel recomposition (perte de gras + gain de muscle)", minChars: 1200 },
  { title: "Lecture compartimentée par axes", minChars: 6000 },
  { title: "Interconnexions majeures (le pattern)", minChars: 1500 },
  { title: "Deep dive — marqueurs prioritaires", minChars: 4600 },
  { title: "Plan d'action 90 jours", minChars: 3400 },
  { title: "Nutrition & entraînement", minChars: 2600 },
  { title: "Suppléments & stack", minChars: 3000 },
  { title: "Annexes (références et vigilance)", minChars: 900 },
  { title: "Sources (bibliothèque)", minChars: 120 },
];

const normalizeLoose = (value: string) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[—–-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const splitSections = (markdown: string): Array<{ title: string; content: string }> => {
  const lines = String(markdown || "").split(/\r?\n/);
  const sections: Array<{ title: string; content: string }> = [];
  let current: { title: string; content: string[] } | null = null;

  for (const line of lines) {
    const match = line.match(/^\s*##\s+(.+?)\s*$/);
    if (match) {
      if (current) sections.push({ title: current.title, content: current.content.join("\n").trim() });
      current = { title: match[1].trim(), content: [line] };
      continue;
    }
    if (current) current.content.push(line);
  }
  if (current) sections.push({ title: current.title, content: current.content.join("\n").trim() });
  return sections;
};

const findSection = (sections: Array<{ title: string; content: string }>, title: string) => {
  const normalizedTitle = normalizeLoose(title);
  return sections.find((section) => normalizeLoose(section.title).includes(normalizedTitle));
};

const SOURCE_ID_REGEX = /\[SRC:([^\]]+)\]/gi;

const extractSourceIds = (text: string): string[] => {
  const ids: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(SOURCE_ID_REGEX.source, "gi");
  while ((match = regex.exec(String(text || ""))) !== null) {
    const id = String(match[1] || "").trim();
    if (!id || /^id$/i.test(id)) continue;
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
};

async function pickRichestPdf() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((name) => name.toLowerCase().endsWith(".pdf"))
    .map((name) => path.join(DATA_DIR, name));

  let richest: { file: string; markers: any[] } | null = null;
  const skips: Array<{ file: string; reason: string }> = [];

  for (const file of files) {
    try {
      const parsed = await pdf(fs.readFileSync(file));
      // Keep richest-PDF detection deterministic: extraction must not depend on Anthropic credits.
      const previousAnthropicKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      let markers: any[] = [];
      try {
        markers = await extractMarkersFromPdfText(parsed.text || "", path.basename(file));
      } finally {
        if (previousAnthropicKey) {
          process.env.ANTHROPIC_API_KEY = previousAnthropicKey;
        }
      }
      if (!markers.length) {
        skips.push({ file: path.basename(file), reason: "no_markers" });
        continue;
      }
      if (!richest || markers.length > richest.markers.length) {
        richest = { file, markers };
      }
    } catch (error: any) {
      skips.push({ file: path.basename(file), reason: error?.message || "parse_error" });
    }
  }

  if (!richest) {
    throw new Error(`No valid lab PDF found in data/. Skips=${JSON.stringify(skips)}`);
  }

  return { richest, skips };
}

function auditMarkdown(report: string, markerCount: number) {
  const sections = splitSections(report);
  const bulletCount = (report.match(/^\s*(?:[-*+]|\d+[\.)])\s+/gm) || []).length;
  const tableCount = (report.match(/^\s*\|(?:[^|\n]+\|)+\s*$/gm) || []).length;
  const placeholderAxes = (report.match(/^\s*###\s*Axe\s+\d+\s+[—-]\s*Non renseigne\b/gim) || []).length;
  const dossierPlaceholder = (report.match(/non renseigne pour ce dossier/gi) || []).length;
  const sourcesSection = findSection(sections, "Sources (bibliothèque)");
  const reportWithoutSources = sourcesSection ? report.replace(sourcesSection.content, "").trim() : report;
  const sourceIdsInBody = extractSourceIds(reportWithoutSources);
  const sourceIdsInSourcesSection = extractSourceIds(sourcesSection?.content || "");
  const missingSourceIdsInSourcesSection = sourceIdsInBody.filter((id) => !sourceIdsInSourcesSection.includes(id));
  const extraSourceIdsInSourcesSection = sourceIdsInSourcesSection.filter((id) => !sourceIdsInBody.includes(id));
  const baseMinSourceCitations = Math.max(2, Math.min(8, Math.ceil(markerCount / 4)));
  const maxUsableSourceIds = Math.max(sourceIdsInBody.length, sourceIdsInSourcesSection.length);
  const minSourceCitations = maxUsableSourceIds > 0 ? Math.min(baseMinSourceCitations, maxUsableSourceIds) : 0;

  const sectionAudits = requiredSections.map((rule) => {
    const found = findSection(sections, rule.title);
    const length = found ? found.content.length : 0;
    return {
      title: rule.title,
      present: Boolean(found),
      length,
      minChars: rule.minChars,
      pass: Boolean(found) && length >= rule.minChars,
    };
  });

  const missing = sectionAudits.filter((s) => !s.present).map((s) => s.title);
  const thin = sectionAudits.filter((s) => s.present && !s.pass).map((s) => `${s.title}(${s.length}/${s.minChars})`);

  return {
    markerCount,
    reportLength: report.length,
    sectionsCount: sections.length,
    bulletCount,
    tableCount,
    placeholderAxes,
    dossierPlaceholder,
    sourceIdsInBodyCount: sourceIdsInBody.length,
    minSourceCitations,
    missingSourceIdsInSourcesSection,
    extraSourceIdsInSourcesSection,
    sectionAudits,
    pass:
      missing.length === 0 &&
      thin.length === 0 &&
      bulletCount === 0 &&
      tableCount === 0 &&
      placeholderAxes === 0 &&
      dossierPlaceholder <= 1 &&
      (minSourceCitations === 0 || sourceIdsInBody.length >= minSourceCitations) &&
      missingSourceIdsInSourcesSection.length === 0 &&
      extraSourceIdsInSourcesSection.length === 0,
    failReasons: [
      ...(missing.length ? [`missing_sections:${missing.join(",")}`] : []),
      ...(thin.length ? [`thin_sections:${thin.join(",")}`] : []),
      ...(bulletCount ? [`bullet_points:${bulletCount}`] : []),
      ...(tableCount ? [`markdown_tables:${tableCount}`] : []),
      ...(placeholderAxes ? [`placeholder_axes:${placeholderAxes}`] : []),
      ...(dossierPlaceholder > 1 ? [`dossier_placeholder_overuse:${dossierPlaceholder}`] : []),
      ...(minSourceCitations > 0 && sourceIdsInBody.length < minSourceCitations
        ? [`insufficient_source_citations:${sourceIdsInBody.length}/${minSourceCitations}`]
        : []),
      ...(missingSourceIdsInSourcesSection.length || extraSourceIdsInSourcesSection.length
        ? [
            `sources_section_mismatch:missing=${missingSourceIdsInSourcesSection.join(",") || "none"};extra=${
              extraSourceIdsInSourcesSection.join(",") || "none"
            }`,
          ]
        : []),
    ],
  };
}

type CriterionResult = {
  key: string;
  pass: boolean;
  details: string;
};

const normalizeAudit = (value: string) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const countRegex = (text: string, regex: RegExp) => {
  const matches = String(text || "").match(regex);
  return matches ? matches.length : 0;
};

const findSentenceWindow = (text: string, index: number): string => {
  const source = String(text || "");
  if (index < 0 || index >= source.length) return "";
  const start = Math.max(
    source.lastIndexOf(".", index),
    source.lastIndexOf("!", index),
    source.lastIndexOf("?", index),
    source.lastIndexOf("\n", index),
  );
  const rightSlice = source.slice(index);
  const relEndCandidates = [rightSlice.indexOf("."), rightSlice.indexOf("!"), rightSlice.indexOf("?"), rightSlice.indexOf("\n")]
    .filter((v) => v >= 0);
  const relEnd = relEndCandidates.length ? Math.min(...relEndCandidates) : Math.min(rightSlice.length, 320);
  const end = index + relEnd + 1;
  return source.slice(Math.max(0, start + 1), Math.min(source.length, end + 220)).trim();
};

const isWordLikeChar = (char?: string) => {
  if (!char) return false;
  return /[A-Za-z0-9À-ÖØ-öø-ÿ]/.test(char);
};

const findWholeTermIndex = (source: string, term: string): number => {
  const text = String(source || "");
  const needle = String(term || "");
  if (!needle) return -1;
  const normalizedSource = normalizeAudit(text);
  const normalizedNeedle = normalizeAudit(needle);
  let from = 0;
  while (from < normalizedSource.length) {
    const idx = normalizedSource.indexOf(normalizedNeedle, from);
    if (idx === -1) return -1;
    const before = normalizedSource[idx - 1];
    const after = normalizedSource[idx + normalizedNeedle.length];
    if (!isWordLikeChar(before) && !isWordLikeChar(after)) return idx;
    from = idx + Math.max(1, normalizedNeedle.length);
  }
  return -1;
};

function auditPromptCriteriaV2(
  report: string,
  markerSnapshots: Array<{ markerId?: string; name: string; value: number }>,
  attachmentHtmlAudit: any,
) {
  const sections = splitSections(report);
  const normalizedReport = normalizeAudit(report);

  const tutoiementForbiddenPatterns: Array<{ label: string; regex: RegExp }> = [
    { label: "vous", regex: /\bvous\b/gi },
    { label: "il presente", regex: /\bil presente\b/gi },
    { label: "le client", regex: /\ble client\b/gi },
    { label: "d'alex", regex: /\bd['’]alex\b/gi },
    { label: "son profil", regex: /\bson profil\b/gi },
  ];
  const tutoiementHits = tutoiementForbiddenPatterns
    .map((rule) => ({ label: rule.label, count: countRegex(normalizedReport, rule.regex) }))
    .filter((entry) => entry.count > 0);

  const markerNames = Array.from(
    new Set(
      markerSnapshots
        .map((marker) => String(marker?.name || "").trim())
        .filter((name) => name.length >= 2),
    ),
  );
  const definitionHintRegex =
    /\b(?:mesure|indique|refl[eè]te|represente|c['’]est|correspond|evalue|designe|sert a|permet de|estime|hormone|enzyme|joue un role)\b/i;
  const markerDefinitionMisses: Array<{ section: string; marker: string; excerpt: string }> = [];
  for (const section of sections) {
    if (normalizeAudit(section.title).includes("sources")) continue;
    const sectionText = section.content;
    for (const markerName of markerNames) {
      const markerNorm = normalizeAudit(markerName);
      if (!markerNorm || markerNorm.length < 3) continue;
      const firstIndex = findWholeTermIndex(sectionText, markerName);
      if (firstIndex === -1) continue;
      const sentence = findSentenceWindow(sectionText, firstIndex);
      if (!definitionHintRegex.test(normalizeAudit(sentence))) {
        markerDefinitionMisses.push({
          section: section.title,
          marker: markerName,
          excerpt: sentence.slice(0, 180),
        });
      }
    }
  }

  const steroidHits = countRegex(
    normalizedReport,
    /\b(?:steroides?|anabolisants?|dopants?|dopage|substances?\s+anabolisantes?|substances?\s+dopantes?)\b/gi,
  );

  const altMarker = markerSnapshots.find((marker) => normalizeAudit(marker.markerId || marker.name) === "alt");
  const altValue = altMarker?.value;
  const supplementsSection = sections.find((section) => normalizeAudit(section.title).includes("supplements"));
  const supplementsContent = String(supplementsSection?.content || "");
  const niacineMentionCount = countRegex(normalizeAudit(supplementsContent), /\bniacine\b/gi);
  const niacineSentences = supplementsContent
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0 && /\bniacine\b/i.test(sentence));
  const niacineRecommendationSentences = niacineSentences.filter((sentence) => {
    const normalized = normalizeAudit(sentence);
    const hasPositiveVerb = /\b(recommande|ajoute|prendre|prends|utilise|introduis|dose|stack)\b/.test(normalized);
    const hasContraSignal =
      /\b(ne\s+te\s+recommande\s+pas|contre.?indiqu(?:e|ee|ees)?|interdit|a\s+eviter|hepatotoxiques?|pas\s+de\s+niacine)\b/.test(
        normalized,
      );
    return hasPositiveVerb && !hasContraSignal;
  });
  const niacineForbidden = typeof altValue === "number" && altValue > 40;

  const statPatterns: Array<{ key: string; regex: RegExp }> = [
    { key: "hdl_19", regex: /\bhdl\b[\s\S]{0,40}\b19\s*mg\/?d?l\b/i },
    { key: "tg_166", regex: /\btriglycerides?\b[\s\S]{0,40}\b166\s*mg\/?d?l\b/i },
    { key: "alt_56", regex: /\balt\b[\s\S]{0,30}\b56\s*u\/?l\b/i },
  ];
  const statSectionCounts = statPatterns.map((pattern) => {
    let count = 0;
    for (const section of sections) {
      if (pattern.regex.test(normalizeAudit(section.content))) count += 1;
    }
    return { key: pattern.key, count };
  });
  const repetitionViolations = statSectionCounts.filter((entry) => entry.count > 3);

  const sourcesSection = sections.find((section) => normalizeAudit(section.title).includes("sources"));
  const bodyWithoutSources = sourcesSection ? report.replace(sourcesSection.content, "") : report;
  const citationIds = extractSourceIds(bodyWithoutSources);
  const uniqueCitationIds = Array.from(new Set(citationIds));

  const radarCoherent =
    attachmentHtmlAudit?.hasRadarTab === true &&
    attachmentHtmlAudit?.hasRadarSvg === true &&
    attachmentHtmlAudit?.hasScoreCards === true &&
    attachmentHtmlAudit?.testosteroneFreeScore !== 90;

  const themeOk =
    attachmentHtmlAudit?.hasTabsNav === true &&
    attachmentHtmlAudit?.hasTabButtons === true &&
    attachmentHtmlAudit?.hasPanels === true &&
    attachmentHtmlAudit?.hasTabScript === true &&
    attachmentHtmlAudit?.darkThemeSignals === 0;

  const criteria: CriterionResult[] = [
    {
      key: "TUTOIEMENT",
      pass: tutoiementHits.length === 0,
      details:
        tutoiementHits.length === 0
          ? "Aucune occurrence interdite detectee."
          : `Occurrences interdites: ${tutoiementHits.map((h) => `${h.label}:${h.count}`).join(", ")}`,
    },
    {
      key: "DEFINITIONS",
      pass: markerDefinitionMisses.length === 0,
      details:
        markerDefinitionMisses.length === 0
          ? "Definition detectee a la premiere mention pour chaque marqueur."
          : `Mentions sans definition: ${markerDefinitionMisses
              .slice(0, 12)
              .map((m) => `${m.section} -> ${m.marker}`)
              .join(" | ")}`,
    },
    {
      key: "STEROIDES",
      pass: steroidHits === 0,
      details: steroidHits === 0 ? "Aucune mention interdite." : `Mentions detectees: ${steroidHits}`,
    },
    {
      key: "NIACINE",
      pass: !(niacineForbidden && niacineRecommendationSentences.length > 0),
      details:
        niacineForbidden && niacineRecommendationSentences.length > 0
          ? `ALT=${altValue} > 40 et niacine recommandee dans le stack: ${niacineRecommendationSentences
              .slice(0, 2)
              .join(" | ")}`
          : niacineForbidden
          ? `ALT=${altValue} > 40 et aucune recommandation de niacine (mentions=${niacineMentionCount}).`
          : `ALT=${altValue ?? "N/A"} (regle non applicable).`,
    },
    {
      key: "REPETITION",
      pass: repetitionViolations.length === 0,
      details:
        repetitionViolations.length === 0
          ? `Repetitions controlees: ${statSectionCounts.map((s) => `${s.key}:${s.count}`).join(", ")}`
          : `Stats repetees dans >3 sections: ${repetitionViolations.map((s) => `${s.key}:${s.count}`).join(", ")}`,
    },
    {
      key: "CITATIONS",
      pass: uniqueCitationIds.length >= 8,
      details: `Sources uniques dans le corps: ${uniqueCitationIds.length} (${uniqueCitationIds.join(", ") || "none"})`,
    },
    {
      key: "RADAR",
      pass: radarCoherent,
      details: `testosteroneFreeScore=${attachmentHtmlAudit?.testosteroneFreeScore ?? "N/A"}; hasRadar=${attachmentHtmlAudit?.hasRadarSvg === true}`,
    },
    {
      key: "THEME",
      pass: themeOk,
      details: `tabsNav=${attachmentHtmlAudit?.hasTabsNav === true}, tabScript=${attachmentHtmlAudit?.hasTabScript === true}, darkSignals=${attachmentHtmlAudit?.darkThemeSignals ?? "N/A"}`,
    },
  ];

  return {
    criteria,
    pass: criteria.every((criterion) => criterion.pass),
    debug: {
      tutoiementHits,
      markerDefinitionMisses: markerDefinitionMisses.slice(0, 50),
      steroidHits,
      niacineMentionCount,
      niacineRecommendationSentences,
      altValue,
      statSectionCounts,
      uniqueCitationIds,
    },
  };
}

async function renderEmailPayload(
  reportMarkdown: string,
  markerSnapshots?: any[],
  riskProfile?: any,
) {
  process.env.SENDPULSE_USER_ID = process.env.SENDPULSE_USER_ID || "qa-user";
  process.env.SENDPULSE_SECRET = process.env.SENDPULSE_SECRET || "qa-secret";

  const originalFetch = globalThis.fetch;
  let smtpPayload: any = null;

  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(input);
    if (url.includes("/oauth/access_token")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: "qa-token", expires_in: 3600 }),
        text: async () => "ok",
      } as any;
    }
    if (url.includes("/smtp/emails")) {
      smtpPayload = init?.body ? JSON.parse(String(init.body)) : null;
      return {
        ok: true,
        status: 200,
        json: async () => ({ result: true }),
        text: async () => "ok",
      } as any;
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  }) as any;

  try {
    const { sendBloodAnalysisHtmlEmail } = await import("../server/emailService.ts");
    const sent = await sendBloodAnalysisHtmlEmail(
      "qa@example.com",
      "qa-report-id",
      reportMarkdown,
      "https://neurocore-360.onrender.com",
      markerSnapshots,
      {
        clientName: "Alex",
        markerCount: Array.isArray(markerSnapshots) ? markerSnapshots.length : undefined,
        riskProfile,
      },
    );
    if (!sent) {
      throw new Error("sendBloodAnalysisHtmlEmail returned false");
    }
    const base64BodyHtml = smtpPayload?.email?.html;
    if (!base64BodyHtml) {
      throw new Error("SMTP payload missing html body");
    }
    const bodyHtml = Buffer.from(base64BodyHtml, "base64").toString("utf8");
    const attachments = smtpPayload?.email?.attachments_binary || {};
    const attachmentName = Object.keys(attachments).find((name) => name.toLowerCase().endsWith(".html")) || null;
    const attachmentHtml = attachmentName ? Buffer.from(String(attachments[attachmentName]), "base64").toString("utf8") : "";
    return { bodyHtml, attachmentHtml, attachmentName };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function auditHtml(html: string) {
  const text = String(html || "");
  const normalized = text
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[—–-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const missingHeadings = requiredSections
    .filter((section) => {
      const target = section.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[—–-]+/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      return !normalized.includes(target);
    })
    .map((section) => section.title);
  const placeholderAxes = (text.match(/Axe\s+\d+\s+[—-]\s*Non renseigne/gi) || []).length;
  const hasDashboardButton = text.includes("Ouvrir le dashboard");
  const hasInlineReportShell = /class=["'][^"']*tabs-shell[^"']*["']/i.test(text);

  return {
    htmlLength: text.length,
    missingHeadings,
    placeholderAxes,
    hasDashboardButton,
    hasInlineReportShell,
    pass:
      placeholderAxes === 0 &&
      !hasDashboardButton &&
      !hasInlineReportShell &&
      (missingHeadings.length === 0 || text.length < 12000),
  };
}

function auditAttachmentHtml(html: string) {
  const text = String(html || "");
  const normalized = text
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[—–-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const missingHeadings = requiredSections
    .filter((section) => {
      const target = section.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[—–-]+/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      return !normalized.includes(target);
    })
    .map((section) => section.title);

  const hasTabsNav = /class=["'][^"']*tabs-nav[^"']*["']/i.test(text);
  const hasTabButtons = /class=["'][^"']*tab-btn[^"']*["']/i.test(text);
  const hasPanels = /class=["'][^"']*tab-panel[^"']*["']/i.test(text);
  const hasTabScript = /data-tab-target/i.test(text) && /activate\(/i.test(text);
  const hasRadarTab = /Radar des scores biomarqueurs/i.test(text);
  const hasRadarSvg = /class=["'][^"']*score-radar[^"']*["']/i.test(text);
  const hasScoreCards = /class=["'][^"']*score-card[^"']*["']/i.test(text);
  const hasCompositeScores = /Scores Composites/i.test(text);
  const hasAnabolicScore = /Score Anabolique|Anabolique/i.test(text);
  const hasMetabolicScore = /Score Métabolique|Métabolique/i.test(text);
  const hasInsulinScore = /Résistance Insuline|Resistance Insuline/i.test(text);
  const testosteroneCardMatch = text.match(
    /<h3>\s*Testost[ée]rone libre\s*<\/h3>[\s\S]{0,400}?(\d{1,3})\/100/i,
  );
  const testosteroneFreeScore = testosteroneCardMatch ? Number(testosteroneCardMatch[1]) : null;
  const testosteroneScoreLooksDynamic =
    testosteroneFreeScore === null ? true : testosteroneFreeScore <= 70;

  const darkThemeSignals = [
    /background\s*:\s*#0{3,6}/i,
    /background-color\s*:\s*#0{3,6}/i,
    /background\s*:\s*black/i,
    /--paper:\s*#0{3,6}/i,
    /--card:\s*#0{3,6}/i,
  ].filter((regex) => regex.test(text)).length;

  return {
    htmlLength: text.length,
    missingHeadings,
    hasTabsNav,
    hasTabButtons,
    hasPanels,
    hasTabScript,
    hasCompositeScores,
    hasAnabolicScore,
    hasMetabolicScore,
    hasInsulinScore,
    hasRadarTab,
    hasRadarSvg,
    hasScoreCards,
    testosteroneFreeScore,
    testosteroneScoreLooksDynamic,
    darkThemeSignals,
    pass:
      missingHeadings.length === 0 &&
      hasTabsNav &&
      hasTabButtons &&
      hasPanels &&
      hasTabScript &&
      hasCompositeScores &&
      hasAnabolicScore &&
      hasMetabolicScore &&
      hasInsulinScore &&
      hasRadarTab &&
      hasRadarSvg &&
      hasScoreCards &&
      testosteroneScoreLooksDynamic &&
      darkThemeSignals === 0,
  };
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  process.env.BLOOD_ANALYSIS_PARALLEL_SECTIONS = "true";
  process.env.BLOOD_ANALYSIS_FORCE_PARALLEL_SECTIONS = "true";
  process.env.BLOOD_ANALYSIS_SECTION_CONCURRENCY = process.env.BLOOD_ANALYSIS_SECTION_CONCURRENCY || "4";
  process.env.BLOOD_ANALYSIS_SKIP_MONOLITHIC = "true";

  const { richest, skips } = await pickRichestPdf();
  const analysis = await analyzeBloodwork(richest.markers, { gender: "homme" });
  const riskProfile = generateComprehensiveRiskProfile(richest.markers as any[], {
    gender: "homme",
    age: "34",
  });
  const knowledge = await getBloodworkKnowledgeContext(analysis.markers, analysis.patterns);

  let report = "";
  let generatedHtml = "";
  let generationError: string | null = null;
  try {
    const generated = await generateParallelHtmlReport(
      analysis,
      {
        gender: "homme",
        prenom: "Alex",
        age: "34",
        objectives: "Performance, recomposition corporelle et optimisation metabolique",
        medications: "Aucun",
        sleepHours: 6.5,
        trainingHours: 6,
        stressLevel: 6,
        calorieDeficit: 12,
        alcoholWeekly: 1,
        fastingHours: 12,
        drawTime: "08:00",
        supplementsUsed: ["omega-3", "magnesium"],
      },
      knowledge,
    );
    report = String(generated.markdown || "").trim();
    generatedHtml = String(generated.html || "");
  } catch (error: any) {
    generationError = String(error?.message || error);
  }

  if (!report) {
    const summary = {
      timestamp: new Date().toISOString(),
      richestPdf: path.relative(process.cwd(), richest.file),
      richestMarkerCount: richest.markers.length,
      skippedPdfs: skips,
      generationError: generationError || "empty_report",
      pass: false,
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, "richest-report-audit.json"), JSON.stringify(summary, null, 2));
    fs.writeFileSync(path.join(OUTPUT_DIR, "richest-report-audit-v2.json"), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = 1;
    return;
  }

  const markdownAudit = auditMarkdown(report, analysis.markers.length);
  const emailPayload = await renderEmailPayload(report, analysis.markers as any[], riskProfile);
  const htmlAudit = auditHtml(emailPayload.bodyHtml);
  const attachmentHtmlAudit = auditAttachmentHtml(emailPayload.attachmentHtml);
  const promptCriteriaV2 = auditPromptCriteriaV2(report, analysis.markers as any[], attachmentHtmlAudit);

  const summary = {
    timestamp: new Date().toISOString(),
    richestPdf: path.relative(process.cwd(), richest.file),
    richestMarkerCount: richest.markers.length,
    skippedPdfs: skips,
    markdownAudit,
    htmlAudit,
    attachmentHtmlAudit,
    promptCriteriaV2,
    attachmentName: emailPayload.attachmentName,
    pass: markdownAudit.pass && htmlAudit.pass && attachmentHtmlAudit.pass && promptCriteriaV2.pass,
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, "richest-report.md"), report);
  fs.writeFileSync(path.join(OUTPUT_DIR, "richest-report-parallel.html"), generatedHtml || "");
  fs.writeFileSync(path.join(OUTPUT_DIR, "richest-report-email.html"), emailPayload.bodyHtml);
  fs.writeFileSync(path.join(OUTPUT_DIR, "richest-report-attachment.html"), emailPayload.attachmentHtml || "");
  fs.writeFileSync(path.join(OUTPUT_DIR, "richest-report-audit.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(OUTPUT_DIR, "richest-report-audit-v2.json"), JSON.stringify(summary, null, 2));

  console.log(JSON.stringify(summary, null, 2));

  if (!summary.pass) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[tmp_audit_richest_parallel] fatal", error);
  process.exit(1);
});
