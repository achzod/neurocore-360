import puppeteer from "puppeteer";
import { formatTxtToDashboard } from "./formatDashboard";

interface NarrativeSection {
  id: string;
  title: string;
  score: number;
  introduction?: string;
  personalizedAnalysis?: string;
  whatIsWrong?: string;
  recommendations?: string;
  supplements?: Array<{ name: string; dosage: string; timing: string; brands?: string[] }>;
  dailyProtocol?: string;
  weeklyPlan?: string;
  teaser?: string;
  isPremium: boolean;
}

interface WeeklyPlanObject {
  week1?: string;
  week2?: string;
  weeks3_4?: string;
  months2_3?: string;
}

interface NarrativeReport {
  global: number;
  heroSummary: string;
  executiveNarrative?: string;
  globalDiagnosis?: string;
  sections: NarrativeSection[];
  supplementStack?: Array<{ name: string; dosage: string; timing: string; brands?: string[]; why?: string }>;
  dailyProtocol?: { morning: string[]; noon: string[]; evening: string[] };
  weeklyPlan?: WeeklyPlanObject;
  conclusion: string;
  auditType: "GRATUIT" | "PREMIUM" | "ELITE";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 65) return "#3b82f6";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function escapeHtmlBasic(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function convertMarkdownToHtml(text: string): string {
  if (!text) return "";
  let result = escapeHtmlBasic(text);
  result = result
    .replace(/\\/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
  return result;
}

function escapeHtml(text: string): string {
  if (!text) return "";
  let escaped = escapeHtmlBasic(text);
  escaped = escaped
    .replace(/\\/g, "")
    .replace(/\n/g, "<br/>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
  return escaped;
}

function safeMarkdownToHtml(text: string): string {
  if (!text) return "";
  let result = escapeHtmlBasic(text);
  result = result
    .replace(/\\/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/_([^_]+)_/g, "<em>$1</em>");
  return result;
}

function formatRecommendationsHtml(text: string): string {
  if (!text) return "";
  const cleaned = text.replace(/\\/g, "").trim();
  
  const lines = cleaned.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);
  
  if (lines.length <= 1) {
    const sentences = cleaned.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
    if (sentences.length > 1) {
      return `<ul class="reco-list">${sentences.map(s => `<li>${safeMarkdownToHtml(s)}.</li>`).join("")}</ul>`;
    }
    return `<p>${safeMarkdownToHtml(cleaned)}</p>`;
  }
  
  const items = lines.map(line => {
    const cleanedLine = line.replace(/^[-*•●◦▪️]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
    return cleanedLine;
  }).filter(l => l.length > 0);
  
  return `<ul class="reco-list">${items.map(item => `<li>${safeMarkdownToHtml(item)}</li>`).join("")}</ul>`;
}

export function generateExportHTML(report: any, auditId: string): string {
  // Détection du nouveau format TXT (V4 Pro)
  if (report.txt) {
    return generateExportHTMLFromTxt(report.txt, auditId);
  }

  const isPremium = report.auditType === "PREMIUM" || report.auditType === "ELITE";
  // ... (rest of existing generateExportHTML code)
  
  const sectionsHTML = report.sections
    .filter(s => !s.isPremium || isPremium)
    .map(section => `
      <div class="section">
        <div class="section-header">
          <h3>${section.title}</h3>
          <div class="score-badge" style="background-color: ${getScoreColor(section.score)}20; color: ${getScoreColor(section.score)};">
            ${section.score}/100
          </div>
        </div>
        ${section.introduction ? `<p class="intro">${escapeHtml(section.introduction)}</p>` : ""}
        ${section.whatIsWrong ? `
          <div class="alert">
            <h4>Ce qui necessite ton attention</h4>
            <p>${escapeHtml(section.whatIsWrong)}</p>
          </div>
        ` : ""}
        ${section.personalizedAnalysis ? `
          <div class="analysis">
            <h4>Analyse personnalisee</h4>
            <p>${escapeHtml(section.personalizedAnalysis)}</p>
          </div>
        ` : ""}
        ${section.recommendations ? `
          <div class="recommendations">
            <h4>Recommandations</h4>
            ${formatRecommendationsHtml(section.recommendations)}
          </div>
        ` : ""}
        ${section.supplements && section.supplements.length > 0 ? `
          <div class="supplements">
            <h4>Supplements recommandes</h4>
            <div class="supp-grid">
              ${section.supplements.map(s => `
                <div class="supp-item">
                  <strong>${s.name}</strong><br/>
                  <span>${s.dosage} - ${s.timing}</span>
                  ${s.brands && s.brands.length > 0 ? `<br/><em>${s.brands.join(", ")}</em>` : ""}
                </div>
              `).join("")}
            </div>
          </div>
        ` : ""}
      </div>
    `).join("");

  const weeklyPlanHTML = report.weeklyPlan ? `
    <div class="section">
      <h3>Plan d'Action sur 12 Semaines</h3>
      <div class="weekly-grid">
        ${report.weeklyPlan.week1 ? `
          <div class="week-item">
            <strong class="week-title">Semaine 1 : Fondations</strong>
            <p>${escapeHtml(report.weeklyPlan.week1)}</p>
          </div>
        ` : ""}
        ${report.weeklyPlan.week2 ? `
          <div class="week-item">
            <strong class="week-title">Semaine 2 : Nutrition</strong>
            <p>${escapeHtml(report.weeklyPlan.week2)}</p>
          </div>
        ` : ""}
        ${report.weeklyPlan.weeks3_4 ? `
          <div class="week-item">
            <strong class="week-title">Semaines 3-4 : Optimisation</strong>
            <p>${escapeHtml(report.weeklyPlan.weeks3_4)}</p>
          </div>
        ` : ""}
        ${report.weeklyPlan.months2_3 ? `
          <div class="week-item">
            <strong class="week-title">Mois 2-3 : Consolidation</strong>
            <p>${escapeHtml(report.weeklyPlan.months2_3)}</p>
          </div>
        ` : ""}
      </div>
    </div>
  ` : "";

  const supplementStackHTML = report.supplementStack && report.supplementStack.length > 0 ? `
    <div class="section">
      <h3>Stack de Supplements Personnalise</h3>
      <table class="supp-table">
        <thead>
          <tr>
            <th>Supplement</th>
            <th>Dosage</th>
            <th>Timing</th>
            <th>Marques</th>
          </tr>
        </thead>
        <tbody>
          ${report.supplementStack.map(s => `
            <tr>
              <td>
                <strong>${s.name}</strong>
                ${s.why ? `<br/><small>${escapeHtml(s.why)}</small>` : ""}
              </td>
              <td>${s.dosage}</td>
              <td>${s.timing}</td>
              <td>${s.brands?.join(", ") || "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  ` : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NEUROCORE 360 - Rapport ${report.auditType}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: hsl(35 30% 96%);
      color: hsl(0 0% 6%);
      line-height: 1.7;
      padding: 40px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      padding: 50px 40px;
      background: linear-gradient(135deg, hsl(164 100% 78% / 0.15), hsl(246 64% 74% / 0.15));
      border-radius: 16px;
      margin-bottom: 30px;
      border: 1px solid hsl(35 20% 85%);
    }
    .header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      color: hsl(164 80% 35%);
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    .header .tagline {
      color: hsl(0 0% 40%);
      margin-bottom: 24px;
      font-size: 1rem;
    }
    .header .badge {
      display: inline-block;
      padding: 8px 20px;
      background: ${report.auditType === "ELITE" ? "hsl(246 64% 74%)" : report.auditType === "PREMIUM" ? "hsl(164 80% 35%)" : "hsl(0 0% 50%)"};
      color: white;
      border-radius: 24px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 24px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .global-score {
      font-size: 5rem;
      font-weight: 700;
      color: ${getScoreColor(report.global)};
      line-height: 1;
    }
    .global-score span {
      font-size: 1.8rem;
      color: hsl(0 0% 50%);
      font-weight: 500;
    }
    .score-label {
      color: hsl(0 0% 50%);
      font-size: 0.9rem;
      margin-top: 8px;
    }
    .hero-summary {
      background: hsl(35 25% 98%);
      padding: 28px;
      border-radius: 12px;
      margin-bottom: 24px;
      border: 1px solid hsl(35 20% 88%);
      border-left: 4px solid hsl(164 80% 35%);
    }
    .hero-summary h3 {
      color: hsl(164 80% 30%);
      margin-bottom: 16px;
      font-size: 1.1rem;
      font-weight: 600;
    }
    .hero-summary p {
      color: hsl(0 0% 25%);
      font-size: 1rem;
    }
    .section {
      background: hsl(35 25% 98%);
      padding: 28px;
      border-radius: 12px;
      margin-bottom: 20px;
      border: 1px solid hsl(35 20% 88%);
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .section h3 {
      color: hsl(0 0% 10%);
      font-size: 1.25rem;
      font-weight: 600;
    }
    .score-badge {
      padding: 8px 16px;
      border-radius: 24px;
      font-weight: 600;
      font-size: 0.9rem;
    }
    .section h4 {
      color: hsl(164 80% 30%);
      margin: 20px 0 12px;
      font-size: 1rem;
      font-weight: 600;
    }
    .section p {
      color: hsl(0 0% 30%);
      font-size: 0.95rem;
    }
    .intro {
      color: hsl(0 0% 25%);
      font-size: 1rem;
      margin-bottom: 16px;
    }
    .alert {
      background: hsl(45 93% 47% / 0.1);
      border: 1px solid hsl(45 93% 47% / 0.3);
      padding: 20px;
      border-radius: 10px;
      margin: 16px 0;
    }
    .alert h4 { color: hsl(45 80% 35%); }
    .analysis {
      padding: 16px 0;
    }
    .recommendations {
      background: hsl(164 80% 35% / 0.08);
      border: 1px solid hsl(164 80% 35% / 0.2);
      padding: 20px;
      border-radius: 10px;
      margin: 16px 0;
    }
    .recommendations h4 { color: hsl(164 80% 25%); }
    .reco-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .reco-list li {
      padding: 10px 0 10px 28px;
      position: relative;
      color: hsl(0 0% 25%);
      font-size: 0.95rem;
      border-bottom: 1px solid hsl(164 80% 35% / 0.1);
    }
    .reco-list li:last-child {
      border-bottom: none;
    }
    .reco-list li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: hsl(164 80% 35%);
      font-weight: bold;
    }
    .supp-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
      margin-top: 14px;
    }
    .supp-item {
      background: hsl(35 20% 95%);
      padding: 16px;
      border-radius: 10px;
      border: 1px solid hsl(35 20% 88%);
    }
    .supp-item strong { color: hsl(0 0% 15%); }
    .supp-item span { color: hsl(0 0% 40%); font-size: 0.9rem; }
    .supp-item em { color: hsl(164 80% 30%); font-size: 0.85rem; }
    .supp-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      font-size: 0.9rem;
    }
    .supp-table th {
      text-align: left;
      padding: 12px;
      background: hsl(35 20% 92%);
      color: hsl(0 0% 20%);
      font-weight: 600;
      border-bottom: 2px solid hsl(35 20% 85%);
    }
    .supp-table td {
      padding: 14px 12px;
      border-bottom: 1px solid hsl(35 20% 90%);
      color: hsl(0 0% 30%);
      vertical-align: top;
    }
    .supp-table td strong { color: hsl(0 0% 15%); }
    .supp-table td small { color: hsl(0 0% 50%); display: block; margin-top: 4px; }
    .weekly-grid {
      display: grid;
      gap: 16px;
      margin-top: 16px;
    }
    .week-item {
      background: hsl(35 20% 95%);
      padding: 20px;
      border-radius: 10px;
      border: 1px solid hsl(35 20% 88%);
    }
    .week-title {
      color: hsl(164 80% 30%);
      font-size: 1rem;
      display: block;
      margin-bottom: 12px;
    }
    .week-item p {
      color: hsl(0 0% 35%);
      font-size: 0.95rem;
    }
    .footer {
      text-align: center;
      padding: 40px 20px;
      color: hsl(0 0% 50%);
      font-size: 0.9rem;
    }
    .footer strong { color: hsl(164 80% 30%); }
    @media print {
      body { 
        background: white; 
        padding: 20px;
        font-size: 11pt;
      }
      .section, .hero-summary, .header { 
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .header {
        background: white;
        border: 2px solid hsl(164 80% 35%);
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Rapport ${report.auditType}</div>
      <h1>NEUROCORE 360</h1>
      <p class="tagline">Audit Metabolique Complet - 14 Domaines</p>
      <div class="global-score">${report.global}<span>/100</span></div>
      <p class="score-label">Score Global</p>
    </div>

    <div class="hero-summary">
      <h3>Resume Executif</h3>
      <p>${escapeHtml(report.heroSummary)}</p>
    </div>

    ${report.executiveNarrative ? `
      <div class="section">
        <h3>Synthese Globale</h3>
        <p>${escapeHtml(report.executiveNarrative)}</p>
      </div>
    ` : ""}

    ${report.globalDiagnosis ? `
      <div class="section">
        <h3>Diagnostic Metabolique</h3>
        <p>${escapeHtml(report.globalDiagnosis)}</p>
      </div>
    ` : ""}

    ${sectionsHTML}
    ${supplementStackHTML}
    ${weeklyPlanHTML}

    ${report.conclusion ? `
      <div class="section">
        <h3>Conclusion</h3>
        <p>${escapeHtml(report.conclusion)}</p>
      </div>
    ` : ""}

    <div class="footer">
      <p>Rapport genere par <strong>ACHZOD</strong> - NEUROCORE 360</p>
      <p style="margin-top: 8px; font-size: 0.8rem; color: hsl(0 0% 60%);">ID: ${auditId}</p>
    </div>
  </div>
</body>
</html>`;
}

export function generateExportHTMLFromTxt(txt: string, auditId: string): string {
  const dashboard = formatTxtToDashboard(txt);
  
  const sectionsHTML = dashboard.sections.map(section => {
    // Nettoyage et formatage du contenu TXT en HTML simple
    const contentHtml = section.content
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '<br/>';
        if (trimmed.startsWith('===') || (trimmed.startsWith('---') && trimmed.length > 5)) {
          return `<h4 style="color: hsl(164 80% 30%); margin-top: 24px; border-bottom: 1px solid #eee; padding-bottom: 8px;">${trimmed.replace(/=/g, '').replace(/-/g, '').trim()}</h4>`;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
          return `<li style="margin-left: 20px; list-style-type: none; position: relative;">
                    <span style="position: absolute; left: -20px; color: hsl(164 80% 35%);">✓</span>
                    ${trimmed.substring(2)}
                  </li>`;
        }
        if (trimmed.match(/^\d+\.\s/)) {
          return `<li style="margin-left: 20px; list-style-type: decimal;">${trimmed.replace(/^\d+\.\s/, '')}</li>`;
        }
        if (trimmed.match(/^[A-Z][A-Z\s0-9]+:$/)) {
          return `<h5 style="font-weight: 600; margin-top: 16px; margin-bottom: 8px; color: #333;">${trimmed}</h5>`;
        }
        return `<p style="margin-bottom: 12px;">${trimmed}</p>`;
      })
      .join('');

    return `
      <div class="section" id="${section.id}">
        <div class="section-header">
          <h3>${section.title}</h3>
        </div>
        <div class="section-content">
          ${contentHtml}
        </div>
      </div>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NEUROCORE 360 - Rapport Premium - ${dashboard.clientName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #fcfbf9;
      color: #1a1a1a;
      line-height: 1.6;
      padding: 40px 20px;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      padding: 60px 40px;
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: white;
      border-radius: 20px;
      margin-bottom: 40px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
    }
    .header h1 {
      font-size: 3rem;
      font-weight: 800;
      margin-bottom: 10px;
      letter-spacing: -0.03em;
    }
    .header .tagline {
      opacity: 0.9;
      font-size: 1.1rem;
      font-weight: 500;
    }
    .header .client-name {
      margin-top: 30px;
      font-size: 1.5rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.2);
      display: inline-block;
      padding: 8px 25px;
      border-radius: 50px;
    }
    .section {
      background: white;
      padding: 40px;
      border-radius: 16px;
      margin-bottom: 30px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .section-header {
      margin-bottom: 25px;
      padding-bottom: 15px;
      border-bottom: 2px solid #f3f4f6;
    }
    .section h3 {
      color: #111827;
      font-size: 1.5rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .section-content {
      font-size: 1.05rem;
      color: #374151;
    }
    .footer {
      text-align: center;
      padding: 60px 20px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      margin-top: 40px;
    }
    .footer strong { color: #059669; }
    .cta-block {
      background: #111827;
      color: white;
      padding: 40px;
      border-radius: 16px;
      text-align: center;
      margin-top: 40px;
    }
    @media print {
      body { background: white; padding: 0; }
      .section { box-shadow: none; break-inside: avoid; border: 1px solid #eee; }
      .header { border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>NEUROCORE 360</h1>
      <p class="tagline">AUDIT MÉTABOLIQUE & PHYSIOLOGIQUE ÉLITE</p>
      <div class="client-name">${dashboard.clientName}</div>
      <p style="margin-top: 15px; font-size: 0.9rem; opacity: 0.8;">Généré le ${dashboard.generatedAt}</p>
    </div>

    ${sectionsHTML}

    <div class="footer">
      <p>Rapport généré par <strong>ACHZOD</strong> - Neurocore 360</p>
      <p style="margin-top: 10px; font-size: 0.8rem; color: #9ca3af;">ID Analyse: ${auditId}</p>
    </div>
  </div>
</body>
</html>`;
}

export async function generateExportPDF(report: NarrativeReport, auditId: string): Promise<Buffer> {
  const html = generateExportHTML(report, auditId);
  
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
      ],
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
    
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "15mm", right: "12mm", bottom: "15mm", left: "12mm" },
      displayHeaderFooter: false,
    });
    
    return Buffer.from(pdf);
  } catch (error) {
    console.error("[ExportService] PDF generation error:", error);
    throw new Error("Failed to generate PDF: " + (error instanceof Error ? error.message : "Unknown error"));
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
