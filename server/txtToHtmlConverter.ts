import { formatTxtToDashboard } from "./formatDashboard";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function convertTxtToHtml(txtContent: string): string {
  const dashboard = formatTxtToDashboard(txtContent);

  const sectionsHTML = dashboard.sections
    .map((section) => {
      const lines = section.content.split("\n");
      let inList = false;

      const formattedContent = lines
        .map((line) => {
          let l = line.trim();

          l = l.replace(/\[[■□\s#=-]+\]\s*\d+\/\d+/, "");
          l = l
            .replace(/^[=\-#*]{2,}/, "")
            .replace(/[=\-#*]{2,}$/, "")
            .trim();

          if (!l) {
            if (inList) {
              inList = false;
              return "</ul>";
            }
            return "";
          }

          if (
            l.match(/^[A-Z\s]{5,}:?$/) ||
            (l.length < 40 && l.toUpperCase() === l && !l.includes("."))
          ) {
            if (inList) {
              inList = false;
              return `</ul><h4 class="subsection-title">${escapeHtml(l.replace(":", ""))}</h4>`;
            }
            return `<h4 class="subsection-title">${escapeHtml(l.replace(":", ""))}</h4>`;
          }

          if (l.startsWith("+ ") || l.startsWith("- ") || l.startsWith("• ")) {
            const item = escapeHtml(l.substring(2).trim());
            if (!inList) {
              inList = true;
              return `<ul><li>${item}</li>`;
            }
            return `<li>${item}</li>`;
          }

          if (inList) {
            inList = false;
            return `</ul><p>${escapeHtml(l)}</p>`;
          }
          return `<p>${escapeHtml(l)}</p>`;
        })
        .join("");

      const safeContent = inList
        ? `${formattedContent}</ul>`
        : formattedContent;

      return `
      <div class="section-card">
        <div class="section-header">
          <h3 class="section-title">${escapeHtml(section.title)}</h3>
          ${section.score ? `<span class="score-badge">${escapeHtml(String(section.score))}/100</span>` : ""}
        </div>
        <div class="section-content">
          ${safeContent}
        </div>
      </div>
    `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audit NEUROCORE 360 - ${dashboard.clientName || "Rapport"}</title>
  <style>
    :root {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --text-primary: #eaeaea;
      --text-secondary: #b8b8b8;
      --accent: #10b981;
      --accent-light: #34d399;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.7;
      padding: 2rem;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .header {
      text-align: center;
      padding: 3rem 0;
      border-bottom: 2px solid var(--accent);
      margin-bottom: 3rem;
    }
    .header h1 {
      font-size: 2.5rem;
      color: var(--accent);
      margin-bottom: 0.5rem;
    }
    .header p { color: var(--text-secondary); }
    .section-card {
      background: var(--bg-secondary);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
      border-left: 4px solid var(--accent);
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .section-title {
      font-size: 1.4rem;
      color: var(--accent-light);
    }
    .score-badge {
      background: var(--accent);
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9rem;
    }
    .section-content p {
      margin-bottom: 1rem;
      color: var(--text-primary);
    }
    .section-content ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .section-content li {
      margin-left: 1.5rem;
      margin-bottom: 0.5rem;
      color: var(--text-secondary);
      position: relative;
    }
    .section-content li::before {
      content: "→";
      position: absolute;
      left: -1.2rem;
      color: var(--accent);
    }
    .subsection-title {
      color: var(--accent);
      margin: 1.5rem 0 1rem;
      font-size: 1.1rem;
    }
    .footer {
      text-align: center;
      padding: 2rem;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>NEUROCORE 360</h1>
      <p>Audit Metabolique Premium${dashboard.clientName ? ` - ${dashboard.clientName}` : ""}</p>
      ${dashboard.generatedAt ? `<p>Genere le ${dashboard.generatedAt}</p>` : ""}
    </header>

    <main>
      ${sectionsHTML}
    </main>

    <footer class="footer">
      <p>Rapport genere par NEUROCORE 360 - Intelligence Artificielle</p>
    </footer>
  </div>
</body>
</html>`;
}

// Compat imports legacy (default + named)
export default convertTxtToHtml;

