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

  const reportId = "25ccd9e0-7945-47e2-9e25-3714885425a0";

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
  <title>Rapport d'Analyse Sanguine - Blood Analysis Premium</title>
  <style>
    :root {
      --bg: #0a0a0a;
      --surface: #141414;
      --surface-elevated: #1e1e1e;
      --border: rgba(255,255,255,0.08);
      --text: #ffffff;
      --text-muted: rgba(255,255,255,0.6);
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
      line-height: 1.7;
      padding: 2rem;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: var(--surface);
      border-radius: 16px;
      padding: 3rem;
      border: 1px solid var(--border);
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin-bottom: 2rem;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
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
      font-size: 1.25rem;
      font-weight: 600;
      margin-top: 2rem;
      margin-bottom: 1rem;
      color: var(--text);
    }

    h4 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
      color: rgba(255,255,255,0.9);
    }

    p {
      margin-bottom: 1rem;
      color: var(--text-muted);
      font-size: 1rem;
    }

    strong {
      color: var(--text);
      font-weight: 600;
    }

    ul, ol {
      margin-left: 1.5rem;
      margin-bottom: 1rem;
      color: var(--text-muted);
    }

    li {
      margin-bottom: 0.5rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      background: var(--surface-elevated);
      border-radius: 8px;
      overflow: hidden;
    }

    th {
      background: rgba(59, 130, 246, 0.1);
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: var(--accent);
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
    }

    tr:last-child td {
      border-bottom: none;
    }

    code {
      background: var(--surface-elevated);
      padding: 0.2rem 0.4rem;
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
      margin: 1.5rem 0;
      border: 1px solid var(--border);
    }

    pre code {
      background: transparent;
      padding: 0;
    }

    blockquote {
      border-left: 4px solid var(--accent);
      padding-left: 1.5rem;
      margin: 1.5rem 0;
      color: var(--text-muted);
      font-style: italic;
    }

    hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 2rem 0;
    }

    .markers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
      margin: 2rem 0;
    }

    .marker-card {
      background: var(--surface-elevated);
      padding: 1.5rem;
      border-radius: 8px;
      border: 1px solid var(--border);
    }

    .marker-name {
      font-weight: 600;
      color: var(--text);
      margin-bottom: 0.5rem;
    }

    .marker-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 0.25rem;
    }

    .marker-status {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }

    .critical-alert {
      background: rgba(239, 68, 68, 0.1);
      border-left: 4px solid var(--critical);
      padding: 1rem 1.5rem;
      border-radius: 8px;
      margin: 1.5rem 0;
    }

    .warning-alert {
      background: rgba(245, 158, 11, 0.1);
      border-left: 4px solid var(--warning);
      padding: 1rem 1.5rem;
      border-radius: 8px;
      margin: 1.5rem 0;
    }

    .success-alert {
      background: rgba(16, 185, 129, 0.1);
      border-left: 4px solid var(--success);
      padding: 1rem 1.5rem;
      border-radius: 8px;
      margin: 1.5rem 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="markers-grid">
      ${markers.map(m => `
        <div class="marker-card">
          <div class="marker-name">${m.markerId.replace(/_/g, ' ').toUpperCase()}</div>
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

  fs.writeFileSync('/Users/achzod/Desktop/neurocore/neurocore-github/blood-report.html', html);
  console.log('✅ HTML report generated: blood-report.html');
  console.log('📂 Open in browser to view');
}

generateHTML()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ERROR:", error);
    process.exit(1);
  });
