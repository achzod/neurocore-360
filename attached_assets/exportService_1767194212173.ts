import puppeteer from "puppeteer";
import { formatTxtToDashboard } from "./formatDashboard";

interface NarrativeSection {
  id: string;
  title: string;
  score: number;
  content: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981"; // Emeraude
  if (score >= 65) return "#3b82f6"; // Bleu
  if (score >= 50) return "#f59e0b"; // Ambre
  return "#ef4444"; // Rouge
}

function getScoreLevel(score: number): string {
  if (score >= 85) return "Elite";
  if (score >= 70) return "Optimal";
  if (score >= 50) return "Moyen";
  return "Critique";
}

function generateSVGGauge(score: number): string {
  const size = 120;
  const center = size / 2;
  const radius = 45;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));">
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="#f3f4f6" stroke-width="${stroke}" />
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}" 
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 ${center} ${center})" />
      <text x="${center}" y="${center + 8}" font-size="24" font-family="Inter" font-weight="800" fill="#111827" text-anchor="middle">${score}</text>
    </svg>
  `;
}

function generateSVGRadar(scores: Record<string, number>): string {
  const categories = Object.keys(scores);
  const numCategories = categories.length;
  if (numCategories === 0) return "";

  const size = 350;
  const center = size / 2;
  const radius = (size / 2) * 0.7;
  const angleStep = (Math.PI * 2) / numCategories;

  // Background grid
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1];
  const gridHtml = gridLevels.map(level => {
    const r = radius * level;
    const points = categories.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(' ');
    return `<polygon points="${points}" fill="none" stroke="#e5e7eb" stroke-width="1" />`;
  }).join('');

  // Axis
  const axisHtml = categories.map((_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    return `<line x1="${center}" y1="${center}" x2="${center + radius * Math.cos(angle)}" y2="${center + radius * Math.sin(angle)}" stroke="#e5e7eb" stroke-width="1" />`;
  }).join('');

  // Score polygon
  const points = categories.map((cat, i) => {
    const score = scores[cat] || 0;
    const angle = i * angleStep - Math.PI / 2;
    const r = radius * (score / 100);
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  }).join(' ');

  const polygonHtml = `
    <polygon points="${points}" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" stroke-width="3" stroke-linejoin="round" />
    ${categories.map((cat, i) => {
      const score = scores[cat] || 0;
      const angle = i * angleStep - Math.PI / 2;
      const r = radius * (score / 100);
      return `<circle cx="${center + r * Math.cos(angle)}" cy="${center + r * Math.sin(angle)}" r="4" fill="#10b981" />`;
    }).join('')}
  `;

  // Labels
  const labelsHtml = categories.map((cat, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = radius + 30;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    const textAnchor = Math.cos(angle) > 0.1 ? "start" : Math.cos(angle) < -0.1 ? "end" : "middle";
    return `<text x="${x}" y="${y}" font-size="10" font-family="Inter" font-weight="700" fill="#4b5563" text-anchor="${textAnchor}">${cat.toUpperCase()}</text>`;
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
  
  // Générer le bloc photos si elles existent
  const photosHTML = (photos && photos.length > 0) ? `
    <div class="photos-grid">
      ${photos.map(p => `
        <div class="photo-container">
          <img src="${p}" alt="Cliché d'analyse" />
        </div>
      `).join('')}
    </div>
  ` : '';
  // Extraire les scores réels
  const scores: Record<string, number> = {};
  dashboard.sections.forEach(s => {
    if (s.score > 0) scores[s.title.substring(0, 10)] = s.score;
  });

  const sectionsHTML = dashboard.sections.map(section => {
    const lines = section.content.split('\n');
    const formattedContent = lines.map(line => {
      let l = line.trim();
      
      // Nettoyage des barres ASCII et autres scories
      l = l.replace(/\[[■□\s#=-]+\]\s*\d+\/\d+/, ''); // Enleve [■■■□□] 4/10
      l = l.replace(/^[=\-#*]{2,}/, '').replace(/[=\-#*]{2,}$/, '').trim(); // Enleve === et ---
      
      if (!l) return '';

      // Titres internes
      if (l.match(/^[A-Z\s]{5,}:?$/) || (l.length < 40 && l.toUpperCase() === l && !l.includes('.'))) {
        return `<h4 class="clinical-title">${l.replace(':', '')}</h4>`;
      }

      // Points d'attention
      if (l.startsWith('🟢') || l.startsWith('🔴') || l.startsWith('🟡') || l.startsWith('🧬') || l.startsWith('🛡️')) {
        return `<div class="insight-box">${l}</div>`;
      }

      // Listes stylisées
      if (l.startsWith('+ ') || l.startsWith('- ') || l.startsWith('• ') || l.startsWith('! ')) {
        const icon = l.startsWith('!') ? '⚠️' : l.startsWith('+') ? '🟢' : '→';
        return `<div class="protocol-item"><span class="icon">${icon}</span> ${l.substring(2)}</div>`;
      }

      return `<p class="clinical-narrative">${l}</p>`;
    }).join('');

    const level = getScoreLevel(section.score);
    const color = getScoreColor(section.score);

    return `
      <section class="report-section" id="${section.id}">
        <div class="section-header">
          <div class="title-meta">
            <span class="category-tag">ANALYSE D'EXPERT</span>
            <h3 class="section-title">${section.title}</h3>
          </div>
          <div class="score-container">
            <span class="score-label" style="color: ${color}">${level}</span>
            <span class="score-value">${section.score}%</span>
          </div>
        </div>
        <div class="section-body">
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
  <title>NEUROCORE 360 - RAPPORT ÉLITE - ${dashboard.clientName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --gold: #c5a059;
      --emerald: #059669;
      --navy: #0f172a;
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #1e293b;
      --muted: #64748b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.8;
      padding: 0;
    }
    .container { max-width: 900px; margin: 0 auto; padding: 60px 20px; }
    
    /* Hero Header */
    .hero {
      background: var(--navy);
      color: white;
      padding: 100px 60px;
      border-radius: 40px;
      margin-bottom: 60px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    }
    .hero::before {
      content: ""; position: absolute; top: -50%; right: -20%; width: 100%; height: 200%;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
      transform: rotate(-15deg);
    }
    .hero-tag {
      font-weight: 800; color: var(--emerald); letter-spacing: 0.3em;
      text-transform: uppercase; font-size: 0.9rem; margin-bottom: 20px; display: block;
    }
    .hero h1 {
      font-family: 'Playfair Display', serif; font-size: 4rem;
      line-height: 1.1; margin-bottom: 30px; font-weight: 900;
    }
    .client-badge {
      display: inline-flex; align-items: center; background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1); padding: 12px 30px; border-radius: 100px;
    }
    .client-name { font-size: 1.4rem; font-weight: 700; color: white; }

    /* Stats Section */
    .stats-layout {
      display: grid; grid-template-columns: 1fr 1.5fr; gap: 30px; margin-bottom: 60px;
    }
    
    .photos-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px; margin-bottom: 60px;
    }
    .photo-container {
      border-radius: 20px; overflow: hidden; border: 4px solid white;
      box-shadow: 0 10px 20px rgba(0,0,0,0.1); background: #eee;
      aspect-ratio: 3/4;
    }
    .photo-container img {
      width: 100%; height: 100%; object-fit: cover;
    }

    .card {
      background: var(--card); border-radius: 32px; padding: 40px;
      border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .stats-title {
      text-transform: uppercase; font-size: 0.75rem; font-weight: 800;
      color: var(--muted); letter-spacing: 0.1em; margin-bottom: 30px; text-align: center;
    }

    /* Report Sections */
    .report-section {
      background: var(--card); border-radius: 32px; padding: 60px;
      margin-bottom: 40px; border: 1px solid #e2e8f0; position: relative;
    }
    .section-header {
      display: flex; justify-content: space-between; align-items: flex-end;
      margin-bottom: 40px; border-bottom: 2px solid #f1f5f9; padding-bottom: 30px;
    }
    .category-tag {
      font-size: 0.7rem; font-weight: 800; color: var(--emerald);
      letter-spacing: 0.15em; display: block; margin-bottom: 8px;
    }
    .section-title {
      font-family: 'Playfair Display', serif; font-size: 2.2rem;
      color: var(--navy); font-weight: 900;
    }
    .score-container { text-align: right; }
    .score-value { font-size: 2.5rem; font-weight: 900; color: var(--navy); display: block; line-height: 1; }
    .score-label { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; }

    /* Content Styling */
    .clinical-title {
      font-size: 1.1rem; font-weight: 800; color: var(--navy);
      margin: 40px 0 20px; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .clinical-narrative {
      font-size: 1.15rem; color: #334155; margin-bottom: 25px; text-align: justify;
    }
    .insight-box {
      background: #f8fafc; border-radius: 20px; padding: 30px;
      border-left: 6px solid var(--emerald); margin: 40px 0;
      font-weight: 600; font-size: 1.1rem; color: var(--navy);
    }
    .protocol-item {
      display: flex; align-items: flex-start; gap: 15px;
      padding: 15px 0; border-bottom: 1px solid #f1f5f9; font-weight: 500;
    }
    .protocol-item .icon { font-size: 1.2rem; }

    .footer {
      text-align: center; padding: 100px 20px; color: var(--muted);
    }
    .footer strong { color: var(--navy); }

    @media print {
      body { background: white; }
      .container { padding: 0; }
      .hero, .report-section { border-radius: 0; box-shadow: none; border: 1px solid #eee; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="hero">
      <span class="hero-tag">Clinical Intelligence</span>
      <h1>Neurocore 360°</h1>
      <div class="client-badge">
        <span class="client-name">${dashboard.clientName}</span>
      </div>
      <p style="margin-top: 20px; opacity: 0.5;">Analytic ID: ${auditId} • ${dashboard.generatedAt}</p>
    </header>

    <div class="stats-layout">
      <div class="card">
        <h2 class="stats-title">VITALITÉ GLOBALE</h2>
        <div style="display: flex; justify-content: center;">
          ${generateSVGGauge(dashboard.global)}
        </div>
      </div>
      <div class="card">
        <h2 class="stats-title">SPECTRE MÉTABOLIQUE</h2>
        <div style="display: flex; justify-content: center;">
          ${generateSVGRadar(scores)}
        </div>
      </div>
    </div>

    ${photosHTML}

    <div class="report-flow">
      ${sectionsHTML}
    </div>

    <footer class="footer">
      <p>Expertise Clinique Délivrée par <strong>ACHZOD</strong></p>
      <p style="margin-top: 10px; font-size: 0.8rem;">© 2025 Neurocore 360 - Tous droits réservés.</p>
    </footer>
  </div>
</body>
</html>`;
}

export function generateExportHTML(report: any, auditId: string, photos?: string[]): string {
  // Détection du nouveau format TXT (V4 Pro)
  if (report.txt) {
    return generateExportHTMLFromTxt(report.txt, auditId, photos);
  }

  // Fallback sur l'ancien système si besoin
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
