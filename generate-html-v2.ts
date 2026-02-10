import fs from "fs";
import { marked } from "marked";

// Load env
const envPath = ".env";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !line.startsWith("#")) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

async function generateHTML() {
  const { db } = await import("./server/db.js");
  const { bloodTests } = await import("./shared/drizzle-schema.js");
  const { eq } = await import("drizzle-orm");

  const reportId = "bb7c8437-eefa-4730-84cd-33cb40d4ae7a";

  const [report] = await db
    .select()
    .from(bloodTests)
    .where(eq(bloodTests.id, reportId))
    .limit(1);

  if (!report) {
    console.error("❌ Report not found!");
    process.exit(1);
  }

  const aiReport = report.analysis?.aiReport as string;
  const markers = report.markers as any[];

  // Convert markdown to HTML
  const htmlContent = marked.parse(aiReport);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport Blood Analysis Premium - Version Conversationnelle</title>
  <style>
    :root {
      --bg: #0a0a0a;
      --surface: #141414;
      --surface-elevated: #1e1e1e;
      --border: rgba(255,255,255,0.08);
      --text: #ffffff;
      --text-muted: rgba(255,255,255,0.7);
      --accent: #3b82f6;
      --critical: #ef4444;
      --warning: #f59e0b;
      --success: #10b981;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.8;
      padding: 2rem;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: var(--surface);
      border-radius: 16px;
      padding: 3rem;
      border: 1px solid var(--border);
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }

    .header {
      text-align: center;
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 2px solid var(--border);
    }

    .header h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .header .subtitle {
      font-size: 1.1rem;
      color: var(--text-muted);
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 3rem;
      padding: 2rem;
      background: var(--surface-elevated);
      border-radius: 12px;
      border: 1px solid var(--border);
    }

    .stat {
      text-align: center;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 0.9rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    h1 {
      font-size: 2rem;
      font-weight: 800;
      margin-bottom: 1.5rem;
      margin-top: 3rem;
      color: var(--text);
    }

    h2 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-top: 3rem;
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid var(--border);
      color: var(--accent);
    }

    h3 {
      font-size: 1.35rem;
      font-weight: 600;
      margin-top: 2.5rem;
      margin-bottom: 1rem;
      color: var(--text);
    }

    h4 {
      font-size: 1.15rem;
      font-weight: 600;
      margin-top: 2rem;
      margin-bottom: 0.75rem;
      color: rgba(255,255,255,0.9);
    }

    p {
      margin-bottom: 1.25rem;
      color: var(--text-muted);
      font-size: 1.05rem;
      line-height: 1.8;
    }

    strong {
      color: var(--text);
      font-weight: 600;
    }

    em {
      color: var(--accent);
      font-style: normal;
    }

    ul, ol {
      margin-left: 2rem;
      margin-bottom: 1.5rem;
      color: var(--text-muted);
    }

    li {
      margin-bottom: 0.75rem;
      line-height: 1.7;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 2rem 0;
      background: var(--surface-elevated);
      border-radius: 8px;
      overflow: hidden;
    }

    th {
      background: rgba(59, 130, 246, 0.15);
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: var(--accent);
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 0.9rem 1rem;
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover {
      background: rgba(255,255,255,0.02);
    }

    code {
      background: var(--surface-elevated);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
      color: var(--accent);
    }

    pre {
      background: var(--surface-elevated);
      padding: 1.5rem;
      border-radius: 8px;
      overflow-x: auto;
      margin: 2rem 0;
      border: 1px solid var(--border);
    }

    pre code {
      background: transparent;
      padding: 0;
    }

    blockquote {
      border-left: 4px solid var(--accent);
      padding-left: 1.5rem;
      margin: 2rem 0;
      color: var(--text-muted);
      font-style: italic;
    }

    hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 3rem 0;
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-critical {
      background: rgba(239, 68, 68, 0.15);
      color: var(--critical);
    }

    .badge-warning {
      background: rgba(245, 158, 11, 0.15);
      color: var(--warning);
    }

    .badge-success {
      background: rgba(16, 185, 129, 0.15);
      color: var(--success);
    }

    /* Markers grid */
    .markers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
      margin: 2rem 0 3rem 0;
    }

    .marker-card {
      background: var(--surface-elevated);
      padding: 1.5rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      transition: all 0.2s ease;
    }

    .marker-card:hover {
      border-color: var(--accent);
      transform: translateY(-2px);
    }

    .marker-name {
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .marker-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 0.5rem;
    }

    .marker-status {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🩸 Rapport Blood Analysis Premium</h1>
      <div class="subtitle">Version Conversationnelle Expert • Test, 35 ans</div>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-value">${markers.length}</div>
        <div class="stat-label">Marqueurs</div>
      </div>
      <div class="stat">
        <div class="stat-value">${Math.round(aiReport.length / 1000)}k</div>
        <div class="stat-label">Caractères</div>
      </div>
      <div class="stat">
        <div class="stat-value">100%</div>
        <div class="stat-label">Tutoiement</div>
      </div>
      <div class="stat">
        <div class="stat-value">0</div>
        <div class="stat-label">Ton impersonnel</div>
      </div>
    </div>

    <div class="markers-grid">
      ${markers.map(m => `
        <div class="marker-card">
          <div class="marker-name">${m.markerId.replace(/_/g, ' ')}</div>
          <div class="marker-value">${m.value}</div>
          <div class="marker-status">${m.status || 'normal'}</div>
        </div>
      `).join('')}
    </div>

    <hr>

    ${htmlContent}
  </div>
</body>
</html>`;

  fs.writeFileSync('/Users/achzod/Desktop/neurocore/neurocore-github/blood-report-conversational.html', html);
  console.log('✅ HTML conversationnel généré: blood-report-conversational.html');
  console.log('📂 Ouvre ce fichier dans ton navigateur');
  console.log('\n📊 Stats rapport:');
  console.log(`   - ${aiReport.length} caractères`);
  console.log(`   - ${markers.length} marqueurs`);
  console.log(`   - Tutoiement: ${(aiReport.match(/\bton\b/gi)?.length || 0) + (aiReport.match(/\bta\b/gi)?.length || 0) + (aiReport.match(/\btes\b/gi)?.length || 0)} occurrences`);
  console.log(`   - "Le patient": ${aiReport.match(/Le patient/gi)?.length || 0} occurrences`);
}

generateHTML()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ERROR:", error);
    process.exit(1);
  });
