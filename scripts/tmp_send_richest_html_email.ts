import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

import { sendBloodAnalysisHtmlEmail } from "../server/emailService.ts";
import {
  analyzeBloodwork,
  extractMarkersFromPdfText,
} from "../server/blood-analysis/index.ts";
import { generateComprehensiveRiskProfile } from "../server/blood-analysis/risk-scores.ts";

const DATA_DIR = path.resolve("data");
const OUTPUT_DIR = path.resolve("output");
const REPORT_MD_PATH = path.join(OUTPUT_DIR, "richest-report.md");

async function pickRichestPdf() {
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((name) => name.toLowerCase().endsWith(".pdf"))
    .map((name) => path.join(DATA_DIR, name));

  let richest: { file: string; markers: any[] } | null = null;

  for (const file of files) {
    try {
      const parsed = await pdf(fs.readFileSync(file));
      const previousAnthropicKey = process.env.ANTHROPIC_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      let markers: any[] = [];
      try {
        markers = await extractMarkersFromPdfText(parsed.text || "", path.basename(file));
      } finally {
        if (previousAnthropicKey) process.env.ANTHROPIC_API_KEY = previousAnthropicKey;
      }
      if (!markers.length) continue;
      if (!richest || markers.length > richest.markers.length) {
        richest = { file, markers };
      }
    } catch {
      // ignore invalid pdfs
    }
  }

  if (!richest) throw new Error("Aucun PDF exploitable trouvé dans data/");
  return richest;
}

async function main() {
  const to = String(process.env.BLOOD_REPORT_TO || "achkou@gmail.com").trim();
  const baseUrl = String(process.env.PUBLIC_BASE_URL || "https://apexlabs.achzodcoaching.com").trim();
  const reportId = `richest-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const orderRef = `manual-richest-${Date.now()}`;

  if (!to || !to.includes("@")) {
    throw new Error("BLOOD_REPORT_TO invalide");
  }

  if (!fs.existsSync(REPORT_MD_PATH)) {
    throw new Error(`Rapport introuvable: ${REPORT_MD_PATH}. Lance d'abord scripts/tmp_audit_richest_parallel.ts`);
  }

  const reportMarkdown = fs.readFileSync(REPORT_MD_PATH, "utf8");
  if (!reportMarkdown.trim()) {
    throw new Error("Rapport markdown vide");
  }

  const richest = await pickRichestPdf();
  const analysis = await analyzeBloodwork(richest.markers, { gender: "homme" });
  const riskProfile = generateComprehensiveRiskProfile(richest.markers as any[], {
    gender: "homme",
    age: "34",
  });
  const sent = await sendBloodAnalysisHtmlEmail(
    to,
    reportId,
    reportMarkdown,
    baseUrl,
    analysis.markers as any[],
    {
      clientName: "Alex",
      markerCount: analysis.markers.length,
      riskProfile,
      orderRef,
    },
  );
  if (!sent) {
    throw new Error("Envoi SendPulse échoué");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        to,
        reportId,
        richestPdf: path.relative(process.cwd(), richest.file),
        richestMarkerCount: richest.markers.length,
        reportPath: path.relative(process.cwd(), REPORT_MD_PATH),
        orderRef,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[tmp_send_richest_html_email] fatal", error);
  process.exit(1);
});
