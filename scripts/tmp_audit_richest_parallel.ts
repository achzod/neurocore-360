import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

import {
  extractMarkersFromPdfText,
  analyzeBloodwork,
  getBloodworkKnowledgeContext,
  generateAIBloodAnalysis,
} from "../server/blood-analysis/index.ts";

type SectionRule = { title: string; minChars: number };

const DATA_DIR = path.resolve("data");
const OUTPUT_DIR = path.resolve("output");

const requiredSections: SectionRule[] = [
  { title: "Synthese executive", minChars: 1200 },
  { title: "Qualite des donnees & limites", minChars: 850 },
  { title: "Tableau de bord (scores & priorites)", minChars: 900 },
  { title: "Potentiel recomposition (perte de gras + gain de muscle)", minChars: 1200 },
  { title: "Lecture compartimentee par axes", minChars: 6000 },
  { title: "Interconnexions majeures (le pattern)", minChars: 1500 },
  { title: "Deep dive — marqueurs prioritaires", minChars: 4600 },
  { title: "Plan d'action 90 jours", minChars: 3400 },
  { title: "Nutrition & entrainement", minChars: 2600 },
  { title: "Supplements & stack", minChars: 3000 },
  { title: "Annexes (references et vigilance)", minChars: 900 },
  { title: "Sources (bibliotheque)", minChars: 120 },
];

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

const findSection = (sections: Array<{ title: string; content: string }>, title: string) =>
  sections.find((section) => section.title.toLowerCase().includes(title.toLowerCase()));

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
      const markers = await extractMarkersFromPdfText(parsed.text || "", path.basename(file));
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
    sectionAudits,
    pass:
      missing.length === 0 &&
      thin.length === 0 &&
      bulletCount === 0 &&
      tableCount === 0 &&
      placeholderAxes === 0 &&
      dossierPlaceholder <= 1,
    failReasons: [
      ...(missing.length ? [`missing_sections:${missing.join(",")}`] : []),
      ...(thin.length ? [`thin_sections:${thin.join(",")}`] : []),
      ...(bulletCount ? [`bullet_points:${bulletCount}`] : []),
      ...(tableCount ? [`markdown_tables:${tableCount}`] : []),
      ...(placeholderAxes ? [`placeholder_axes:${placeholderAxes}`] : []),
      ...(dossierPlaceholder > 1 ? [`dossier_placeholder_overuse:${dossierPlaceholder}`] : []),
    ],
  };
}

async function renderEmailHtml(reportMarkdown: string) {
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
    );
    if (!sent) {
      throw new Error("sendBloodAnalysisHtmlEmail returned false");
    }
    const base64Html = smtpPayload?.email?.html;
    if (!base64Html) {
      throw new Error("SMTP payload missing html body");
    }
    return Buffer.from(base64Html, "base64").toString("utf8");
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
    .replace(/[\u0300-\u036f]/g, "");
  const missingHeadings = requiredSections
    .filter((section) => {
      const target = section.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return !normalized.includes(target);
    })
    .map((section) => section.title);
  const placeholderAxes = (text.match(/Axe\s+\d+\s+[—-]\s*Non renseigne/gi) || []).length;
  const hasDashboardButton = text.includes("Ouvrir le dashboard");

  return {
    htmlLength: text.length,
    missingHeadings,
    placeholderAxes,
    hasDashboardButton,
    pass: missingHeadings.length === 0 && placeholderAxes === 0 && hasDashboardButton,
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
  const knowledge = await getBloodworkKnowledgeContext(analysis.markers, analysis.patterns);

  const report = await generateAIBloodAnalysis(
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

  const markdownAudit = auditMarkdown(report, analysis.markers.length);
  const html = await renderEmailHtml(report);
  const htmlAudit = auditHtml(html);

  const summary = {
    timestamp: new Date().toISOString(),
    richestPdf: path.relative(process.cwd(), richest.file),
    richestMarkerCount: richest.markers.length,
    skippedPdfs: skips,
    markdownAudit,
    htmlAudit,
    pass: markdownAudit.pass && htmlAudit.pass,
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, "richest-report.md"), report);
  fs.writeFileSync(path.join(OUTPUT_DIR, "richest-report-email.html"), html);
  fs.writeFileSync(path.join(OUTPUT_DIR, "richest-report-audit.json"), JSON.stringify(summary, null, 2));

  console.log(JSON.stringify(summary, null, 2));

  if (!summary.pass) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[tmp_audit_richest_parallel] fatal", error);
  process.exit(1);
});
