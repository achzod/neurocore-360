import fs from "fs";
import path from "path";

import { sendBloodAnalysisHtmlEmail } from "../server/emailService.ts";

const OUTPUT_DIR = path.resolve("output");
const REPORT_MD_PATH = path.join(OUTPUT_DIR, "richest-report.md");

async function main() {
  const to = String(process.env.BLOOD_REPORT_TO || "achkou@gmail.com").trim();
  const baseUrl = String(process.env.PUBLIC_BASE_URL || "https://neurocore-360.onrender.com").trim();
  const reportId = `richest-${new Date().toISOString().replace(/[:.]/g, "-")}`;

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

  const sent = await sendBloodAnalysisHtmlEmail(to, reportId, reportMarkdown, baseUrl);
  if (!sent) {
    throw new Error("Envoi SendPulse échoué");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        to,
        reportId,
        reportPath: path.relative(process.cwd(), REPORT_MD_PATH),
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
