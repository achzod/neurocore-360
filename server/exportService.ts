import puppeteer from "puppeteer";
import { formatTxtToDashboard } from "./formatDashboard";

// ==========================================
// CONFIGURATION DESIGN SYSTEM (Homepage)
// ==========================================

const CSS_VARIABLES = `
  :root {
    --primary: #5eead4; /* Teal-300 like */
    --primary-glow: rgba(94, 234, 212, 0.5);
    --secondary: #9F8CFF; /* Violet */
    --background: #0a0a0a; /* Darker than 0F0F0F */
    --card-bg: #121212;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --border: rgba(255, 255, 255, 0.1);
    --accent-gradient: linear-gradient(to right, #5eead4, #34d399, #22d3ee);
  }
`;

const SVG_SCALES_PATTERN = `
  <svg width="0" height="0">
    <pattern id="scales" x="0" y="0" width="28" height="49" patternUnits="userSpaceOnUse">
      <path d="M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z" fill="#5eead4" fill-opacity="0.03"/>
    </pattern>
  </svg>
`;

function getScoreColor(score: number): string {
  if (score >= 80) return "#5eead4"; // Primary
  if (score >= 65) return "#3b82f6"; // Blue
  if (score >= 50) return "#f59e0b"; // Amber
  return "#ef4444"; // Red
}

function getScoreLevel(score: number): string {
  if (score >= 85) return "ELITE";
  if (score >= 70) return "OPTIMAL";
  if (score >= 50) return "MOYEN";
  return "CRITIQUE";
}

function generateSVGGauge(score: number): string {
  const size = 140;
  const center = size / 2;
  const radius = 55;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0 0 10px ${color}40);">
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="#262626" stroke-width="${stroke}" />
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}" 
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 ${center} ${center})" />
      <text x="${center}" y="${center + 10}" font-size="28" font-family="Inter, sans-serif" font-weight="800" fill="#ffffff" text-anchor="middle">${score}</text>
    </svg>
  `;
}

function generateSVGRadar(scores: Record<string, number>): string {
  const categories = Object.keys(scores);
  const numCategories = categories.length;
  if (numCategories === 0) return "";

  const size = 400;
  const center = size / 2;
  const radius = (size / 2) * 0.65;
  const angleStep = (Math.PI * 2) / numCategories;

  // Background grid
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1];
  const gridHtml = gridLevels.map(level => {
    const r = radius * level;
    const points = categories.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(' ');
    return `<polygon points="${points}" fill="none" stroke="#333" stroke-width="1" />`;
  }).join('');

  // Axis
  const axisHtml = categories.map((_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    return `<line x1="${center}" y1="${center}" x2="${center + radius * Math.cos(angle)}" y2="${center + radius * Math.sin(angle)}" stroke="#333" stroke-width="1" />`;
  }).join('');

  // Score polygon
  const points = categories.map((cat, i) => {
    const score = scores[cat] || 0;
    const angle = i * angleStep - Math.PI / 2;
    const r = radius * (score / 100);
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  }).join(' ');

  const polygonHtml = `
    <polygon points="${points}" fill="rgba(94, 234, 212, 0.15)" stroke="#5eead4" stroke-width="2" stroke-linejoin="round" style="filter: drop-shadow(0 0 8px rgba(94, 234, 212, 0.3));" />
    ${categories.map((cat, i) => {
      const score = scores[cat] || 0;
      const angle = i * angleStep - Math.PI / 2;
      const r = radius * (score / 100);
      return `<circle cx="${center + r * Math.cos(angle)}" cy="${center + r * Math.sin(angle)}" r="4" fill="#5eead4" stroke="#000" stroke-width="2" />`;
    }).join('')}
  `;

  // Labels
  const labelsHtml = categories.map((cat, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = radius + 35;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    const textAnchor = Math.cos(angle) > 0.1 ? "start" : Math.cos(angle) < -0.1 ? "end" : "middle";
    
    // Split long labels
    const words = cat.split(' ');
    let label = cat;
    if (words.length > 2) label = words[0] + ' ' + words[1] + '...';
    
    return `<text x="${x}" y="${y}" font-size="11" font-family="Inter, sans-serif" font-weight="600" fill="#94a3b8" text-anchor="${textAnchor}">${label.toUpperCase()}</text>`;
  }).join('');

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      ${gridHtml}
      ${axisHtml}
      ${polygonHtml}
      ${labelsHtml}
    </svg>
  `;
}

export function generateExportHTMLFromTxt(txt: string, auditId: string, photos?: string[]): string {
  const dashboard = formatTxtToDashboard(txt);
  
  // Extraire les scores réels
  const scores: Record<string, number> = {};
  dashboard.sections.forEach(s => {
    if (s.score > 0) scores[s.title.replace('ANALYSE ', '').substring(0, 12)] = s.score;
  });

  const photosHTML = (photos && photos.length > 0) ? `
    <div class="photos-grid">
      ${photos.map(p => `
        <div class="photo-container">
          <img src="${p}" alt="Cliché d'analyse" />
          <div class="photo-overlay"></div>
        </div>
      `).join('')}
    </div>
  ` : '';

  const sectionsHTML = dashboard.sections.map(section => {
    const lines = section.content.split('\n');
    const formattedContent = lines.map(line => {
      let l = line.trim();
      
      // Nettoyage
      l = l.replace(/\[[■□\s#=-]+\]\s*\d+\/\d+/, '');
      l = l.replace(/^[=\-#*]{2,}/, '').replace(/[=\-#*]{2,}$/, '').trim();
      
      if (!l) return '';

      // Titres internes
      if (l.match(/^[A-Z\s]{5,}:?$/) || (l.length < 50 && l.toUpperCase() === l && !l.includes('.') && l.length > 4)) {
        return `<h4 class="subsection-title">${l.replace(':', '')}</h4>`;
      }

      // Points d'attention
      if (l.startsWith('🟢') || l.startsWith('🔴') || l.startsWith('🟡') || l.startsWith('🧬') || l.startsWith('🛡️')) {
        return `<div class="insight-box">${l}</div>`;
      }
      
      // KPI Boxes (pour le dashboard final)
      if (l.includes(' : ') && (l.includes('🔴') || l.includes('🟢'))) {
         const parts = l.split(':');
         return `<div class="kpi-row"><span class="kpi-label">${parts[0]}</span><span class="kpi-value">${parts.slice(1).join(':')}</span></div>`;
      }

      // Listes
      if (l.startsWith('+ ') || l.startsWith('- ') || l.startsWith('• ') || l.startsWith('! ')) {
        const icon = l.startsWith('!') ? '⚠️' : l.startsWith('+') ? 'check_circle' : 'arrow_right';
        const isCheck = l.startsWith('+');
        return `
          <div class="list-item ${isCheck ? 'positive' : ''}">
            <span class="material-icons icon">${icon}</span>
            <span>${l.substring(2)}</span>
          </div>
        `;
      }

      return `<p>${l}</p>`;
    }).join('');

    const level = getScoreLevel(section.score);
    const color = getScoreColor(section.score);

    return `
      <section class="card section-card" id="${section.id}">
        <div class="section-header">
          <div>
            <span class="section-category">ANALYSE & STRATÉGIE</span>
            <h3 class="section-title">${section.title}</h3>
          </div>
          <div class="score-badge">
            ${generateSVGGauge(section.score)}
            <div class="score-meta">
              <span class="score-level" style="color: ${color}">${level}</span>
            </div>
          </div>
        </div>
        <div class="section-content">
          ${formattedContent}
        </div>
      </section>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NEUROCORE 360 - ${dashboard.clientName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <style>
    ${CSS_VARIABLES}

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--background);
      background-image: url("data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z' fill='%235eead4' fill-opacity='0.03' fill-rule='evenodd'/%3E%3C/svg%3E");
      color: var(--text-primary);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    /* TYPOGRAPHY */
    h1, h2, h3, h4 { color: white; letter-spacing: -0.02em; }
    p { margin-bottom: 1.5rem; color: #cbd5e1; font-weight: 300; font-size: 1.05rem; }
    strong { color: var(--primary); font-weight: 600; }

    /* HERO SECTION */
    .hero {
      position: relative;
      background: radial-gradient(circle at top right, rgba(94, 234, 212, 0.1), transparent 40%),
                  linear-gradient(to bottom, #111, #0a0a0a);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 60px 40px;
      margin-bottom: 60px;
      overflow: hidden;
      text-align: center;
    }
    .hero::before {
      content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 1px;
      background: linear-gradient(90deg, transparent, var(--primary), transparent);
      opacity: 0.5;
    }
    .hero-badge {
      display: inline-block;
      padding: 6px 16px;
      background: rgba(94, 234, 212, 0.1);
      border: 1px solid rgba(94, 234, 212, 0.3);
      border-radius: 100px;
      color: var(--primary);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin-bottom: 24px;
      box-shadow: 0 0 20px rgba(94, 234, 212, 0.2);
    }
    .hero h1 {
      font-size: 3.5rem;
      font-weight: 800;
      margin-bottom: 16px;
      background: linear-gradient(to bottom, #fff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .client-name {
      font-size: 1.5rem;
      color: var(--text-secondary);
      font-weight: 400;
    }

    /* GLOBAL STATS */
    .global-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 60px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 30px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .stat-card h3 {
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: var(--text-secondary);
      margin-bottom: 20px;
    }

    /* SECTIONS */
    .section-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 24px;
      margin-bottom: 40px;
      overflow: hidden;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .section-card:hover {
      border-color: rgba(94, 234, 212, 0.3);
      box-shadow: 0 0 30px rgba(0,0,0,0.5);
    }
    .section-header {
      padding: 40px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      background: linear-gradient(to right, rgba(255,255,255,0.02), transparent);
    }
    .section-category {
      font-size: 0.7rem;
      color: var(--primary);
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      display: block;
      margin-bottom: 10px;
    }
    .section-title {
      font-size: 2rem;
      font-weight: 700;
      color: white;
      max-width: 80%;
    }
    .score-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .score-level {
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      margin-top: 5px;
    }

    .section-content {
      padding: 40px;
    }

    /* CONTENT ELEMENTS */
    .subsection-title {
      font-size: 1.1rem;
      color: white;
      border-left: 3px solid var(--primary);
      padding-left: 15px;
      margin: 40px 0 20px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .insight-box {
      background: rgba(94, 234, 212, 0.05);
      border: 1px solid rgba(94, 234, 212, 0.2);
      border-radius: 16px;
      padding: 24px;
      margin: 30px 0;
      font-size: 1rem;
      color: #e2e8f0;
    }

    .list-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      color: #cbd5e1;
    }
    .list-item .icon {
      color: var(--text-secondary);
      font-size: 20px;
      margin-top: 2px;
    }
    .list-item.positive .icon {
      color: var(--primary);
    }

    .kpi-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 20px;
      background: rgba(255,255,255,0.03);
      border-radius: 8px;
      margin-bottom: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
    }
    .kpi-label { color: var(--text-secondary); }
    .kpi-value { color: white; font-weight: 700; }

    .photos-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 60px;
    }
    .photo-container {
      aspect-ratio: 3/4;
      border-radius: 20px;
      overflow: hidden;
      border: 1px solid var(--border);
      position: relative;
    }
    .photo-container img {
      width: 100%; height: 100%; object-fit: cover;
      opacity: 0.8;
      transition: opacity 0.5s;
    }
    .photo-container:hover img { opacity: 1; }
    
    .footer {
      text-align: center;
      padding: 80px 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
      border-top: 1px solid var(--border);
      margin-top: 60px;
    }

    @media (max-width: 768px) {
      .hero h1 { font-size: 2.5rem; }
      .global-stats { grid-template-columns: 1fr; }
      .photos-grid { grid-template-columns: 1fr; }
      .section-header { flex-direction: column; gap: 20px; }
      .container { padding: 20px; }
    }

    @media print {
      body { background: white; color: black; }
      .hero, .card, .section-card, .stat-card { 
        background: white; color: black; border: 1px solid #ccc; box-shadow: none; 
      }
      h1, h2, h3, h4, p, strong { color: black !important; }
      .hero-badge { border-color: black; color: black; }
    }
  </style>
</head>
<body>
  <div class="container">
    
    <header class="hero">
      <span class="hero-badge">Analyse Métabolique Complète</span>
      <h1>NEUROCORE 360°</h1>
      <p class="client-name">${dashboard.clientName}</p>
      <div style="margin-top: 30px; font-size: 0.8rem; color: var(--text-secondary);">
        ID: ${auditId} • Généré le ${dashboard.generatedAt}
      </div>
    </header>

    <div class="global-stats">
      <div class="stat-card">
        <h3>Indice de Vitalité</h3>
        ${generateSVGGauge(dashboard.global)}
      </div>
      <div class="stat-card">
        <h3>Profil Métabolique</h3>
        ${generateSVGRadar(scores)}
      </div>
    </div>

    ${photosHTML}

    <main>
      ${sectionsHTML}
    </main>

    <footer class="footer">
      <p>Rapport généré par l'intelligence clinique <strong>NEUROCORE</strong></p>
      <p>Expertise certifiée • Science appliquée • Résultats mesurables</p>
    </footer>

  </div>
</body>
</html>`;
}

export function generateExportHTML(report: any, auditId: string, photos?: string[]): string {
  if (report.txt) {
    return generateExportHTMLFromTxt(report.txt, auditId, photos);
  }
  return "Ancien format non supporté";
}

export async function generateExportPDF(report: any, auditId: string, photos?: string[]): Promise<Buffer> {
  const html = generateExportHTML(report, auditId, photos);
  
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
    
    return Buffer.from(pdf);
  } catch (error) {
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}
