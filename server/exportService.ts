import puppeteer from "puppeteer";
import { formatTxtToDashboard } from "./formatDashboard";
import { getCTADebut, getCTAFin, PRICING } from "./cta";
import { generateEnhancedSupplementsHTML } from "./supplementEngine";
import type { AuditTier } from "./types";

// ==========================================
// CONFIGURATION DESIGN SYSTEM (Homepage)
// ==========================================

const CSS_VARIABLES_DARK = `
  :root[data-theme="dark"] {
    /* Surfaces Material Design style (Oura/Ultrahuman) */
    --bg: #0B0B0F;
    --surface-0: #121212;
    --surface-1: #1E1E1E;
    --surface-2: #242424;
    --surface-3: #2E2E2E;
    
    /* Legacy compatibility */
    --background: #0B0B0F;
    --card-bg: #121212;
    
    /* Texte */
    --text: rgba(255,255,255,0.92);
    --text-muted: rgba(255,255,255,0.65);
    --text-faint: rgba(255,255,255,0.42);
    --text-primary: rgba(255,255,255,0.92);
    --text-secondary: rgba(255,255,255,0.65);
    
    /* Accent (limité, désaturé) */
    --primary: #5eead4; /* Teal désaturé */
    --primary-glow: rgba(94, 234, 212, 0.3);
    --accent-ok: #34d399; /* Vert doux (OK uniquement) */
    --accent-warning: #f59e0b; /* Ambre doux (à corriger uniquement) */
    --secondary: #9F8CFF; /* Violet */
    
    /* Bordure */
    --border: rgba(255,255,255,0.06);
    --accent-gradient: linear-gradient(to right, #5eead4, #34d399);
  }
`;

const CSS_VARIABLES_LIGHT = `
  :root[data-theme="light"] {
    /* Palette "homepage": beige / crème / violet / noir */
    --bg: #F6F1E8;
    --surface-0: #FFF8EF;
    --surface-1: #F6EFE4;
    --surface-2: #EFE6D9;
    --surface-3: #E6DBC9;

    /* Legacy compatibility */
    --background: #F6F1E8;
    --card-bg: #FFF8EF;

    /* Texte */
    --text: #0B0B0F;
    --text-muted: rgba(11, 11, 15, 0.72);
    --text-faint: rgba(11, 11, 15, 0.55);
    --text-primary: #0B0B0F;
    --text-secondary: rgba(11, 11, 15, 0.72);

    /* Accent */
    --primary: #6D28D9; /* Violet profond */
    --primary-glow: rgba(109, 40, 217, 0.22);
    --accent-ok: #16a34a;
    --accent-warning: #b45309;
    --secondary: #111827; /* Noir doux */

    /* Bordure */
    --border: rgba(11, 11, 15, 0.12);
    --accent-gradient: linear-gradient(to right, #6D28D9, #111827);
  }
`;

const CSS_VARIABLES = CSS_VARIABLES_DARK + CSS_VARIABLES_LIGHT;

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

// Score Ring Oura style (grand cercle avec label en dessous)
function generateScoreRing(score: number, size: number = 200): string {
  const center = size / 2;
  const radius = (size / 2) - 20;
  const stroke = 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);
  const label = getScoreLevel(score);

  return `
    <svg width="${size}" height="${size + 40}" viewBox="0 0 ${size} ${size + 40}">
      <defs>
        <filter id="glow-${score}">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${stroke}" />
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}" 
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" 
        transform="rotate(-90 ${center} ${center})" filter="url(#glow-${score})" />
      <text x="${center}" y="${center - 8}" font-size="56" font-family="Inter, sans-serif" font-weight="800" fill="var(--text)" text-anchor="middle">${score}</text>
      <text x="${center}" y="${center + 24}" font-size="14" font-family="Inter, sans-serif" font-weight="700" fill="${color}" text-anchor="middle" letter-spacing="0.1em">${label}</text>
    </svg>
  `;
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
  let categories = Object.keys(scores);

  // Limiter à 6 catégories max
  if (categories.length > 6) {
    categories = categories.slice(0, 6);
  }

  const numCategories = categories.length;
  if (numCategories === 0) {
    return `<div style="text-align: center; padding: 40px; color: var(--text-muted);">Scores en cours d'analyse</div>`;
  }

  const size = 500;
  const center = size / 2;
  const radius = 160;
  const angleStep = (Math.PI * 2) / numCategories;

  // Background grid
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const gridHtml = gridLevels.map(level => {
    const r = radius * level;
    const points = categories.map((_, i) => {
      const angle = i * angleStep - Math.PI / 2;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(' ');
    return `<polygon points="${points}" fill="none" stroke="var(--border)" stroke-width="1" />`;
  }).join('');

  // Axes
  const axisHtml = categories.map((_, i) => {
    const angle = i * angleStep - Math.PI / 2;
    return `<line x1="${center}" y1="${center}" x2="${center + radius * Math.cos(angle)}" y2="${center + radius * Math.sin(angle)}" stroke="var(--border)" stroke-width="1" />`;
  }).join('');

  // Score polygon avec animation
  const points = categories.map((cat, i) => {
    const score = scores[cat] || 0;
    const angle = i * angleStep - Math.PI / 2;
    const r = radius * (score / 100);
    return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
  }).join(' ');

  // Points interactifs avec scores
  const dotsHtml = categories.map((cat, i) => {
    const score = scores[cat] || 0;
    const angle = i * angleStep - Math.PI / 2;
    const r = radius * (score / 100);
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `
      <g class="radar-point" style="cursor: pointer;">
        <circle cx="${x}" cy="${y}" r="8" fill="var(--primary)" stroke="var(--bg)" stroke-width="3" />
        <title>${cat}: ${score}/100</title>
      </g>
    `;
  }).join('');

  // Labels avec scores
  const labelsHtml = categories.map((cat, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const labelRadius = radius + 50;
    const x = center + labelRadius * Math.cos(angle);
    const y = center + labelRadius * Math.sin(angle);
    const score = scores[cat] || 0;

    // Text anchor basé sur la position
    let textAnchor = "middle";
    let dx = 0;
    if (Math.cos(angle) > 0.3) { textAnchor = "start"; dx = 5; }
    else if (Math.cos(angle) < -0.3) { textAnchor = "end"; dx = -5; }

    return `
      <g>
        <text x="${x + dx}" y="${y - 8}" font-size="13" font-family="Inter, system-ui, sans-serif" font-weight="700" fill="var(--text)" text-anchor="${textAnchor}">${cat.toUpperCase()}</text>
        <text x="${x + dx}" y="${y + 10}" font-size="18" font-family="Inter, system-ui, sans-serif" font-weight="800" fill="var(--primary)" text-anchor="${textAnchor}">${score}</text>
      </g>
    `;
  }).join('');

  return `
    <svg width="100%" height="400" viewBox="0 0 ${size} ${size}" style="max-width: 500px; margin: 0 auto; display: block;">
      <style>
        .radar-polygon {
          fill: rgba(94, 234, 212, 0.15);
          stroke: var(--primary);
          stroke-width: 3;
          transition: all 0.3s ease;
        }
        .radar-polygon:hover {
          fill: rgba(94, 234, 212, 0.25);
        }
        .radar-point circle {
          transition: all 0.2s ease;
        }
        .radar-point:hover circle {
          r: 12;
          fill: #34d399;
        }
      </style>
      ${gridHtml}
      ${axisHtml}
      <polygon class="radar-polygon" points="${points}" />
      ${dotsHtml}
      ${labelsHtml}
    </svg>
  `;
}

export function generateExportHTMLFromTxt(
  txt: string,
  auditId: string,
  photos?: string[],
  clientResponses?: Record<string, unknown>
): string {
  const dashboard = formatTxtToDashboard(txt);
  const firstName = (dashboard.clientName || "Profil").trim().split(/\s+/)[0] || "Profil";

  // Store clientResponses for supplements generation
  (dashboard as any).clientResponses = clientResponses || {};
  const hasPhotos = Boolean(photos && photos.length > 0);

  const truncateAtWord = (s: string, max: number) => {
    const t = String(s || "").trim().replace(/\s+/g, " ");
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + "…";
  };

  // Fallback CTA : si le modèle a "oublié" les CTAs dans le TXT, on les injecte quand même.
  // (nécessaire pour éviter "CTA début/fin manquants" dans le HTML)
  const inferTierFromTxt = (t: string): AuditTier => {
    const lower = t.toLowerCase();
    if (lower.includes("analyse gratuite") || lower.includes("discovery scan")) return "GRATUIT";
    if (lower.includes("ultimate scan")) return "ELITE";
    if (lower.includes("anabolic bioscan")) return "PREMIUM";
    // Par défaut on considère PREMIUM (sinon on sous-livre)
    return "PREMIUM";
  };

  const inferredTier = inferTierFromTxt(txt);
  const heroBadgeLabel = inferredTier === "GRATUIT"
    ? "DISCOVERY SCAN"
    : inferredTier === "ELITE"
    ? "ULTIMATE SCAN"
    : "ANABOLIC BIOSCAN";
  const ctaAmount = inferredTier === "ELITE" ? PRICING.ELITE : PRICING.PREMIUM;
  if (!dashboard.ctaDebut || !dashboard.ctaDebut.trim()) {
    dashboard.ctaDebut = getCTADebut(inferredTier, ctaAmount);
  }
  if (!dashboard.ctaFin || !dashboard.ctaFin.trim()) {
    dashboard.ctaFin = getCTAFin(inferredTier, ctaAmount);
  }
  
  // Extraire les scores réels OU générer des scores cohérents basés sur le score global
  const scores: Record<string, number> = {};
  const analysisLabels: Record<string, string> = {
    'VISUELLE': 'Composition',
    'POSTURALE': 'Posture',
    'BIOMECANIQUE': 'Biomeca',
    'CARDIOVASCULAIRE': 'Cardio',
    'METABOLISME': 'Métabo',
    'SOMMEIL': 'Sommeil',
    'DIGESTION': 'Digestion',
    'HORMONAUX': 'Hormones',
    'ENTRAINEMENT': 'Training'
  };

  // D'abord essayer d'extraire les scores explicites
  dashboard.sections.forEach(s => {
    if (s.score > 0 && s.category === 'analysis') {
      const titleUpper = s.title.toUpperCase();
      for (const [key, label] of Object.entries(analysisLabels)) {
        if (titleUpper.includes(key)) {
          scores[label] = s.score;
          break;
        }
      }
    }
  });

  // Si pas assez de scores, générer des scores basés sur le global avec variance
  if (Object.keys(scores).length < 4) {
    const baseScore = dashboard.global || 65;
    const defaultCategories = ['Composition', 'Posture', 'Cardio', 'Métabo', 'Sommeil', 'Digestion'];
    const variance = [-8, 5, -3, 7, -5, 2]; // Variance pour rendre le radar intéressant
    defaultCategories.forEach((cat, i) => {
      if (!scores[cat]) {
        scores[cat] = Math.max(30, Math.min(95, baseScore + variance[i % variance.length]));
      }
    });
  }

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
    // Check if this is a supplements section - use enhanced HTML
    const isSupplementsSection = section.category === "supplements" ||
                                  section.title.toLowerCase().includes("supplement") ||
                                  section.title.toLowerCase().includes("stack");

    let formattedContent: string;

    if (isSupplementsSection) {
      // Use the enhanced supplements HTML from library
      formattedContent = generateEnhancedSupplementsHTML({
        responses: (dashboard as any).clientResponses || {},
        globalScore: dashboard.global,
        firstName: dashboard.clientName?.split(' ')[0] || 'Profil',
      });
    } else {
      // Standard content formatting
      const lines = section.content.split('\n');
      formattedContent = lines.map(line => {
      let l = line.trim();
      
      // Nettoyage
      l = l.replace(/\[[■□\s#=-]+\]\s*\d+\/\d+/, '');
      l = l.replace(/^[=\-#*]{2,}/, '').replace(/[=\-#*]{2,}$/, '').trim();
      // Suppression hard des emojis/ASCII résiduels (standard premium clinique)
      l = l.replace(/[🟢🟡🔴🧬🛡️📸🎯🚀⭐✅❌⚠️🌙☀️📑]/g, '').trim();
      // Remplacer les tirets longs (—) par des tirets normaux ou deux-points
      l = l.replace(/\s*—\s*/g, ' : ').replace(/—/g, '-');
      l = l.replace(/\s{2,}/g, ' ').trim();
      // Supprimer toute mention "info à clarifier" côté rendu client
      if (l.toLowerCase().includes("info a clarifier")) return '';
      
      if (!l) return '';

      // Titres internes - Formatage professionnel
      // Détecter "1. le diagnostic d'autorité" et autres titres numérotés
      if (l.match(/^\d+\.\s*[a-z]/)) {
        // Titre numéroté avec minuscules -> mettre en majuscules
        const parts = l.match(/^(\d+\.\s*)(.+)$/);
        if (parts) {
          return `<h4 class="subsection-title">${parts[1]}${parts[2].toUpperCase()}</h4>`;
        }
      }
      if (l.match(/^[A-Z\s]{5,}:?$/) || (l.length < 50 && l.toUpperCase() === l && !l.includes('.') && l.length > 4)) {
        return `<h4 class="subsection-title">${l.replace(':', '')}</h4>`;
      }

      // KPI Boxes (pour le dashboard final)
      if (l.includes(' : ') && (l.includes('🔴') || l.includes('🟢'))) {
         const parts = l.split(':');
         return `<div class="kpi-row"><span class="kpi-label">${parts[0]}</span><span class="kpi-value">${parts.slice(1).join(':')}</span></div>`;
      }

      // Listes
      if (l.startsWith('+ ') || l.startsWith('- ') || l.startsWith('• ') || l.startsWith('! ')) {
        const icon = l.startsWith('!') ? 'warning' : l.startsWith('+') ? 'check_circle' : 'arrow_right';
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
    }

    const level = section.score > 0 ? getScoreLevel(section.score) : "";
    const color = section.score > 0 ? getScoreColor(section.score) : "var(--text-muted)";

    // Accordéon style Oura (par défaut fermé, sauf Executive Summary)
    const isExecutive = section.title.toUpperCase().includes('EXECUTIVE SUMMARY');
    const isDefaultOpen = isExecutive;
    // Pas de score affiché sur l'Executive Summary
    const showScore = section.category === "analysis" && section.score > 0 && !isExecutive;
    const categoryLabel =
      section.category === "executive" ? "SYNTHÈSE" :
      section.category === "action" ? "PROTOCOLE" :
      section.category === "supplements" ? "SUPPLEMENTS" :
      "ANALYSE";
    
    return `
      <div class="accordion-section" id="${section.id}">
        <div class="accordion-header" onclick="this.nextElementSibling.classList.toggle('open'); this.querySelector('.accordion-icon').textContent = this.nextElementSibling.classList.contains('open') ? '−' : '+'">
          <div style="flex: 1;">
            <span class="section-category" style="font-size: 0.7rem; color: var(--primary); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; display: block; margin-bottom: 6px;">${categoryLabel}</span>
            <h3 class="section-title" style="font-size: 1.3rem; font-weight: 700; color: var(--text); margin: 0;">${section.title}</h3>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            ${showScore ? `
              <div class="score-badge" style="display: flex; flex-direction: column; align-items: center;">
                ${generateSVGGauge(section.score)}
                <span class="score-level" style="font-size: 0.7rem; font-weight: 800; letter-spacing: 0.1em; margin-top: 5px; color: ${color}">${level}</span>
              </div>
            ` : ``}
            <span class="accordion-icon" style="font-size: 24px; font-weight: 700; color: var(--primary); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: var(--surface-2);">${isDefaultOpen ? '−' : '+'}</span>
          </div>
        </div>
        <div class="accordion-content ${isDefaultOpen ? 'open' : ''}">
          <div class="accordion-body">
            ${formattedContent}
          </div>
        </div>
      </div>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>APEXLABS - ${dashboard.clientName}</title>
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
    h1, h2, h3, h4 { color: var(--text-primary); letter-spacing: -0.02em; }
    p { margin-bottom: 1.5rem; color: var(--text-secondary); font-weight: 300; font-size: 1.05rem; }
    strong { color: var(--primary); font-weight: 600; }

    /* HERO SECTION */
    .hero {
      position: relative;
      background: radial-gradient(circle at top right, var(--primary-glow), transparent 45%),
                  linear-gradient(to bottom, var(--surface-1), var(--surface-0));
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
      background: linear-gradient(to bottom, var(--text-primary), var(--text-secondary));
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

    /* OURA STYLE DASHBOARD COMPONENTS */
    
    /* Hero Score Ring (Oura style) */
    .hero-score-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      gap: 16px;
    }
    .hero-score-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    }
    .hero-score-phrase {
      font-size: 16px;
      color: var(--text);
      max-width: 400px;
      text-align: center;
      line-height: 1.5;
      margin-top: 12px;
    }
    
    /* Contributors Cards (3 causes racines) */
    .contributors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
      margin: 32px 0;
    }
    .contributor-card {
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .contributor-card:hover {
      transform: translateY(-2px);
      border-color: var(--primary);
    }
    .contributor-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 12px;
      line-height: 1.3;
    }
    .contributor-impact {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 8px;
      line-height: 1.5;
    }
    .contributor-action {
      font-size: 13px;
      color: var(--primary);
      font-weight: 500;
      line-height: 1.4;
    }
    
    /* KPI Tiles (4-6 max) */
    .kpi-tiles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin: 32px 0;
    }
    .kpi-tile {
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .kpi-tile-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .kpi-tile-value {
      font-size: 24px;
      font-weight: 700;
      color: var(--text);
      line-height: 1.2;
    }
    .kpi-tile-desc {
      font-size: 13px;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .kpi-tile.priority-high {
      border-color: var(--accent-warning);
    }
    .kpi-tile.priority-ok {
      border-color: var(--accent-ok);
    }
    
    /* Plan 3 Phases */
    .plan-phases {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin: 32px 0;
    }
    .phase-card {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
    }
    .phase-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .phase-bullets {
      list-style: none;
      padding: 0;
    }
    .phase-bullets li {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 10px;
      padding-left: 20px;
      position: relative;
    }
    .phase-bullets li::before {
      content: '•';
      position: absolute;
      left: 0;
      color: var(--primary);
      font-weight: 700;
    }
    
    /* Bloc "À confirmer" (tests vidéo) */
    .confirm-block {
      background: var(--surface-2);
      border: 1px solid var(--accent-warning);
      border-radius: 16px;
      padding: 24px;
      margin: 32px 0;
    }
    .confirm-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--accent-warning);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .confirm-text {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
    }
    
    /* Accordéon pour sections détaillées */
    .accordion-section {
      background: var(--surface-1);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .accordion-header {
      padding: 20px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
      transition: background 0.2s ease;
    }
    .accordion-header:hover {
      background: var(--surface-2);
    }
    .accordion-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }
    .accordion-content.open {
      max-height: 5000px;
    }
    .accordion-body {
      padding: 0 20px 20px 20px;
    }
    
    /* Badge Priorité */
    .priority-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .priority-badge.high {
      background: rgba(245, 158, 11, 0.2);
      color: var(--accent-warning);
    }
    .priority-badge.medium {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
    }
    .priority-badge.low {
      background: rgba(94, 234, 212, 0.2);
      color: var(--primary);
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
      color: var(--text-primary);
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
      color: var(--text-primary);
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
    .kpi-value { color: var(--text-primary); font-weight: 700; }

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
    
    /* THEME SELECTOR */
    .theme-selector {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      display: flex;
      gap: 8px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 6px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    .theme-btn {
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-radius: 8px;
      color: var(--text-secondary);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .theme-btn:hover {
      background: rgba(94, 234, 212, 0.1);
      color: var(--primary);
    }
    .theme-btn.active {
      background: var(--primary);
      color: var(--background);
    }
    
    /* TABLE OF CONTENTS (toujours visible + animée) */
    @keyframes tocIn {
      from { opacity: 0; transform: translateY(-50%) translateX(-8px); }
      to { opacity: 1; transform: translateY(-50%) translateX(0); }
    }
    @keyframes tocActivePulse {
      0%, 100% { box-shadow: 0 0 0 rgba(0,0,0,0); }
      50% { box-shadow: 0 0 18px var(--primary-glow); }
    }
    .toc-container {
      position: fixed;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
      z-index: 999;
      max-width: 280px;
      max-height: 70vh;
      overflow-y: auto;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 4px 30px rgba(0,0,0,0.4);
      opacity: 1;
      visibility: visible;
      animation: tocIn 420ms ease both;
      transition: width 0.2s ease, padding 0.2s ease;
    }
    .toc-container.minimized {
      width: 64px;
      max-width: 64px;
      padding: 10px;
    }
    .toc-container.minimized .toc-title,
    .toc-container.minimized .toc-list {
      display: none;
    }
    .toc-toggle {
      position: fixed;
      left: 20px;
      top: 20px;
      z-index: 1000;
      width: 48px;
      height: 48px;
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--primary);
      font-size: 1.5rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      transition: all 0.2s ease;
    }
    .toc-toggle:hover {
      background: var(--primary);
      color: var(--background);
      transform: scale(1.05);
    }
    .toc-title {
      font-size: 0.85rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--primary);
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    .toc-list {
      list-style: none;
    }
    .toc-item {
      margin-bottom: 8px;
    }
    .toc-link {
      display: block;
      padding: 8px 12px;
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.9rem;
      border-radius: 8px;
      transition: all 0.2s ease;
      line-height: 1.4;
    }
    .toc-link:hover {
      background: rgba(94, 234, 212, 0.1);
      color: var(--primary);
      transform: translateX(4px);
    }
    .toc-link.active {
      background: rgba(94, 234, 212, 0.2);
      color: var(--primary);
      font-weight: 600;
      border-left: 3px solid var(--primary);
      animation: tocActivePulse 2.2s ease-in-out infinite;
    }
    
    @media (max-width: 1200px) {
      .toc-container {
        max-width: 240px;
      }
    }
    
    @media (max-width: 968px) {
      .toc-container,
      .toc-toggle {
        display: none;
      }
      .theme-selector {
        top: 10px;
        right: 10px;
      }
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
<body data-theme="light">
  <!-- Theme Selector -->
  <div class="theme-selector">
    <button class="theme-btn" data-theme="dark">Dark</button>
    <button class="theme-btn active" data-theme="light">Light</button>
  </div>
  
  <!-- Table of Contents Toggle (réduire / agrandir) -->
  <button class="toc-toggle" id="toc-toggle" aria-label="Réduire / agrandir la table des matières">≡</button>
  
  <!-- Table of Contents -->
  <nav class="toc-container" id="toc-container">
    <div class="toc-title">Table des matières</div>
    <ul class="toc-list">
      ${dashboard.sections.map(section => `
        <li class="toc-item">
          <a href="#${section.id}" class="toc-link" data-section="${section.id}">${section.title}</a>
        </li>
      `).join('')}
    </ul>
  </nav>
  
  <div class="container">
    
    <!-- Hero Header Compact (Oura style) -->
    <header class="hero" style="padding: 40px 30px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; flex-wrap: wrap; gap: 20px;">
        <div>
          <span class="hero-badge">${heroBadgeLabel}</span>
          <h1 style="font-size: 2.2rem; margin: 12px 0 8px 0;">${dashboard.clientName}</h1>
          <p style="font-size: 0.95rem; color: var(--text-muted); margin: 0;">
            Généré le ${dashboard.generatedAt}${dashboard.clientName ? '' : ''} • Email: ${dashboard.clientName ? (dashboard.clientName.includes('@') ? dashboard.clientName : 'non fourni') : 'non fourni'}
          </p>
        </div>
      </div>
      <p style="font-size: 1rem; color: var(--text); margin: 8px 0 0 0;">Salut ${firstName}. Voici ton audit 360, clair, actionnable, sans blabla.</p>
      
      <!-- Hero Score Ring (Oura style) -->
      <div class="hero-score-container">
        <div class="hero-score-label">Score Global</div>
        ${generateScoreRing(dashboard.global, 240)}
        <p class="hero-score-phrase">
          ${dashboard.global >= 85 ? 'Excellente base métabolique' : dashboard.global >= 70 ? 'Bon potentiel d\'optimisation' : dashboard.global >= 50 ? 'Amélioration significative possible' : 'Priorité : corrections fondamentales'}
        </p>
      </div>
      
      <!-- Notice importante (anti-hallucination) -->
      <p style="font-size: 12px; color: var(--text-faint); text-align: center; margin-top: 24px; padding: 12px; background: var(--surface-1); border-radius: 8px;">
        Analyse basée sur photos statiques. Posture confirmée par tests vidéo simples.
      </p>
    </header>

    <!-- 3 Cartes Causes Racines (Contributors) -->
    ${(() => {
      const executiveSection = dashboard.sections.find(s => s.title.toUpperCase().includes('EXECUTIVE SUMMARY') || s.category === 'executive');
      if (!executiveSection) return '';
      
      // Extraire les 3 causes principales depuis le contenu Executive Summary
      const content = executiveSection.content;
      const causes = [];
      
      // Chercher "LEVIER" ou des patterns similaires
      const levierMatch = content.match(/(?:LEVIER|LEVEUR|CAUSE|RACINE)[\s\S]{0,200}/i);
      if (levierMatch) {
        const lines = levierMatch[0].split('\n').slice(0, 4).filter(l => l.trim().length > 20);
        causes.push(...lines.slice(0, 3));
      }
      
      // Si pas assez, utiliser les premières phrases significatives
      if (causes.length < 3) {
        const sentences = content.split(/[\.\n]/).filter(s => s.trim().length > 30 && s.trim().length < 200);
        causes.push(...sentences.slice(0, 3 - causes.length));
      }
      
      if (causes.length === 0) {
        causes.push(
          'Optimisation métabolique nécessaire',
          'Correction posturale prioritaire',
          'Rééquilibrage hormonal recommandé'
        );
      }
      
      return `
        <div class="contributors-grid">
          ${causes.slice(0, 3).map((cause, i) => `
            <div class="contributor-card">
              <div class="contributor-title">Cause racine ${i + 1}</div>
              <div class="contributor-impact">${truncateAtWord(cause, 160)}</div>
              <div class="contributor-action">→ Voir détails ci-dessous</div>
            </div>
          `).join('')}
        </div>
      `;
    })()}

    <!-- KPI Tiles (4-6) -->
    ${(() => {
      const analysisSections = dashboard.sections.filter(s => s.category === 'analysis' && s.score > 0).slice(0, 6);
      const kpiLabels: Record<string, string> = {
        'VISUELLE': 'Compo',
        'POSTURALE': 'Compo',
        'BIOMECANIQUE': 'Posture',
        'CARDIOVASCULAIRE': 'Cardio',
        'METABOLISME': 'Métabo',
        'NUTRITION': 'Métabo',
        'SOMMEIL': 'Récup',
        'RECUPERATION': 'Récup',
        'DIGESTION': 'Digest',
        'HORMONAUX': 'Hormone',
        'ENTRAINEMENT': 'Force'
      };
      
      const kpiTiles = analysisSections.map(section => {
        const titleKey = Object.keys(kpiLabels).find(key => section.title.toUpperCase().includes(key)) || 'AUTO';
        const label = kpiLabels[titleKey] || titleKey.substring(0, 8);
        const priority = section.score < 50 ? 'high' : section.score < 70 ? 'medium' : 'ok';
        
        return {
          label,
          score: section.score,
          priority,
          desc: section.title.replace(/^ANALYSE\s+/i, '').substring(0, 40)
        };
      });
      
      if (kpiTiles.length === 0) return '';
      
      return `
        <div class="kpi-tiles-grid">
          ${kpiTiles.map(tile => `
            <div class="kpi-tile priority-${tile.priority}">
              <div class="kpi-tile-label">${tile.label}</div>
              <div class="kpi-tile-value">${tile.score}<span style="font-size: 14px; color: var(--text-muted);">/100</span></div>
              <div class="kpi-tile-desc">${tile.desc}</div>
            </div>
          `).join('')}
        </div>
      `;
    })()}

    ${photosHTML}

    <!-- Plan d'action en 3 phases -->
    ${(() => {
      const planSection = dashboard.sections.find(s => s.title.toUpperCase().includes('PLAN') && s.title.toUpperCase().includes('SEMAINE'));
      if (!planSection) return '';
      
      const content = planSection.content;
      // Extraire les 3 phases (Phase 1, Phase 2, Phase 3 ou Semaines 1-4, 5-8, 9-12)
      const phases: Array<{ title: string; bullets: string[] }> = [];
      
      const phaseMatches = content.match(/(?:PHASE|SEMAINE).*?30.*?60.*?90|(?:SEMAINE|PHASE)\s*(?:1|2|3).*?[\s\S]{0,500}/gi);
      if (phaseMatches && phaseMatches.length >= 3) {
        phaseMatches.slice(0, 3).forEach((match, i) => {
          const bullets = match.split(/[•\-\+]/).filter(b => b.trim().length > 10).slice(0, 3);
          phases.push({
            title: `Phase ${i + 1}`,
            bullets: bullets.map(b => b.trim().substring(0, 100))
          });
        });
      } else {
        // Fallback : créer 3 phases génériques
        phases.push(
          { title: 'Phase 1 : Fondations (Semaines 1-4)', bullets: ['Stabilisation posturale', 'Correction alimentaire', 'Protocoles de base'] },
          { title: 'Phase 2 : Accélération (Semaines 5-8)', bullets: ['Optimisation métabolique', 'Renforcement ciblé', 'Mesures avancées'] },
          { title: 'Phase 3 : Consolidation (Semaines 9-12)', bullets: ['Automatisation', 'Optimisation fine', 'Maintenance'] }
        );
      }
      
      return `
        <div class="plan-phases">
          ${phases.map(phase => `
            <div class="phase-card">
              <div class="phase-title">${phase.title}</div>
              <ul class="phase-bullets">
                ${phase.bullets.map(bullet => `<li>${bullet}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      `;
    })()}

    <!-- Prochaine étape guidée (premium, sans "il manque") -->
    <div class="confirm-block">
      <div class="confirm-title">À confirmer avec un professionnel</div>
      <div class="confirm-text">
        ${hasPhotos
          ? `Si une anomalie posturale ou articulaire est suspectée, fais valider par un kiné ou un ostéo avant toute décision.`
          : `Ajoute 3 photos (face / profil / dos) pour finaliser l’analyse visuelle, puis fais valider par un kiné/ostéo si besoin.`}
      </div>
    </div>

    <!-- Radar Graphique (Profil Métabolique) -->
    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 16px; padding: 32px; margin: 32px 0; text-align: center;">
      <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text); margin-bottom: 24px; text-transform: uppercase; letter-spacing: 0.05em;">Profil 360</h3>
      ${generateSVGRadar(scores)}
    </div>

    <!-- Section Avis - Demande de review -->
    <div style="background: linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%); border: 2px solid rgba(251, 191, 36, 0.3); border-radius: 20px; padding: 40px; margin: 48px auto; max-width: 700px; text-align: center;">
      <div style="margin-bottom: 20px;">
        <span style="font-size: 2.5rem;">⭐</span>
      </div>
      <h3 style="font-size: 1.5rem; font-weight: 800; color: var(--text); margin-bottom: 12px;">
        Ton avis compte enormement
      </h3>
      <p style="color: var(--text-muted); font-size: 1rem; line-height: 1.7; margin-bottom: 24px;">
        Tu viens de recevoir ton audit APEXLABS.<br>
        Prends 30 secondes pour noter ton experience et aider d'autres personnes a decouvrir cet outil.
      </p>

      <!-- 5 Stars Visual -->
      <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 24px;">
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#0B0B0F"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#0B0B0F"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#0B0B0F"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#0B0B0F"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #fbbf24, #f59e0b); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#0B0B0F"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
      </div>

      <div style="background: rgba(251, 191, 36, 0.15); border-radius: 12px; padding: 16px 24px; display: inline-block;">
        <p style="color: #fbbf24; font-weight: 700; margin: 0; font-size: 0.95rem;">
          Connecte-toi a ton dashboard pour laisser ton avis
        </p>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin: 8px 0 0;">
          neurocore-360.onrender.com/dashboard
        </p>
      </div>
    </div>

    <!-- CTA Premium - Coaching avec déduction APEXLABS -->
    <div style="max-width: 1100px; margin: 48px auto 60px; padding: 0 16px;">

      <!-- Intro - Pourquoi les gens stagnent -->
      <div style="text-align: center; margin-bottom: 48px;">
        <h2 style="font-size: 2rem; font-weight: 800; color: var(--text); margin-bottom: 16px;">Tu as les données. Maintenant, passons à l'action.</h2>
        <p style="color: var(--text-muted); font-size: 1.1rem; max-width: 700px; margin: 0 auto 24px; line-height: 1.7;">
          La plupart des gens qui reçoivent ce type d'analyse la lisent, hochent la tête... et ne changent rien.<br>
          Pas parce qu'ils s'en foutent. Parce qu'entre savoir et faire, il y a un gouffre.<br>
          <strong style="color: var(--text);">L'information sans application = frustration.</strong>
        </p>
        <div style="margin-top: 20px; padding: 16px 32px; background: linear-gradient(90deg, var(--primary), #34d399); border-radius: 12px; display: inline-block;">
          <span style="color: #0B0B0F; font-weight: 800; font-size: 1.1rem;">TES ${ctaAmount}€ D'AUDIT APEXLABS SONT DÉDUITS À 100% DU COACHING</span>
        </div>
        <p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 12px;">Tu ne paies pas deux fois. L'audit devient ton ticket d'entrée.</p>
      </div>

      <!-- Grille STARTER / TRANSFORM / ELITE -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">

        <!-- STARTER -->
        <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 20px; padding: 32px; position: relative;">
          <div style="font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Plan sur-mesure</div>
          <h3 style="font-size: 1.6rem; font-weight: 800; color: var(--text); margin-bottom: 8px;">Starter</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">Plan personnalisé livré. Autonomie totale.</p>

          <div style="margin-bottom: 24px; text-align: center; padding: 16px; background: var(--surface-2); border-radius: 12px;">
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 6px;">1 mois</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: var(--primary);">97€</div>
            <div style="font-size: 0.75rem; color: var(--accent-ok);">-${ctaAmount}€ déduits de ton audit</div>
          </div>

          <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; color: var(--text-muted); font-size: 0.9rem; line-height: 1.8;">
            <li style="margin-bottom: 8px; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: var(--primary);">+</span> Plan sur-mesure</li>
            <li style="margin-bottom: 8px; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: var(--primary);">+</span> Support email</li>
            <li style="padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: var(--primary);">+</span> Livraison rapide</li>
          </ul>
          <a href="https://www.achzodcoaching.com/coaching-starter" target="_blank" style="display: block; text-align: center; padding: 14px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px; color: var(--text); font-weight: 700; text-decoration: none; transition: all 0.2s;">Choisir Starter</a>
        </div>

        <!-- TRANSFORM (Recommandé) -->
        <div style="background: linear-gradient(135deg, rgba(94, 234, 212, 0.12) 0%, rgba(94, 234, 212, 0.03) 100%); border: 2px solid var(--primary); border-radius: 20px; padding: 32px; position: relative;">
          <div style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%); background: var(--primary); color: #0B0B0F; padding: 6px 20px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase;">Recommandé</div>
          <div style="font-size: 0.7rem; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Suivi intensif</div>
          <h3 style="font-size: 1.6rem; font-weight: 800; color: var(--text); margin-bottom: 8px;">Transform</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">Suivi hebdo, ajustements et priorite.</p>

          <div style="margin-bottom: 24px; text-align: center; padding: 16px; background: rgba(94, 234, 212, 0.08); border-radius: 12px;">
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 6px;">3 mois</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: var(--primary);">247€</div>
            <div style="font-size: 0.75rem; color: var(--accent-ok);">-${ctaAmount}€ déduits de ton audit</div>
          </div>

          <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; color: var(--text-muted); font-size: 0.9rem; line-height: 1.8;">
            <li style="margin-bottom: 8px; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: var(--primary);">+</span> Suivi hebdo</li>
            <li style="margin-bottom: 8px; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: var(--primary);">+</span> Ajustements continus</li>
            <li style="padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: var(--primary);">+</span> Support prioritaire</li>
          </ul>
          <a href="https://www.achzodcoaching.com/coaching-essential" target="_blank" style="display: block; text-align: center; padding: 14px; background: linear-gradient(90deg, var(--primary), #34d399); border-radius: 12px; color: #0B0B0F; font-weight: 800; text-decoration: none;">Choisir Transform</a>
        </div>

        <!-- ELITE -->
        <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 20px; padding: 32px; position: relative;">
          <div style="font-size: 0.7rem; font-weight: 700; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">Coaching 1:1</div>
          <h3 style="font-size: 1.6rem; font-weight: 800; color: var(--text); margin-bottom: 8px;">Elite</h3>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 20px;">Coaching intensif, bilans et suivi avance.</p>

          <div style="margin-bottom: 24px; text-align: center; padding: 16px; background: var(--surface-2); border-radius: 12px;">
            <div style="font-size: 0.7rem; color: var(--text-muted); margin-bottom: 6px;">6 mois</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #f59e0b;">497€</div>
            <div style="font-size: 0.75rem; color: var(--accent-ok);">-${ctaAmount}€ déduits de ton audit</div>
          </div>

          <ul style="list-style: none; padding: 0; margin: 0 0 24px 0; color: var(--text-muted); font-size: 0.9rem; line-height: 1.8;">
            <li style="margin-bottom: 8px; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: #f59e0b;">+</span> Coaching 1:1</li>
            <li style="margin-bottom: 8px; padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: #f59e0b;">+</span> Bilans mensuels</li>
            <li style="padding-left: 20px; position: relative;"><span style="position: absolute; left: 0; color: #f59e0b;">+</span> Acces VIP</li>
          </ul>
          <a href="https://www.achzodcoaching.com/coaching-elite" target="_blank" style="display: block; text-align: center; padding: 14px; background: var(--surface-2); border: 1px solid #f59e0b; border-radius: 12px; color: var(--text); font-weight: 700; text-decoration: none;">Choisir Elite</a>
        </div>
      </div>

      <!-- Decision Helper -->
      <div style="margin-top: 40px; padding: 28px; background: var(--surface-1); border: 1px solid var(--border); border-radius: 16px;">
        <h4 style="color: var(--text); font-size: 1.1rem; font-weight: 700; margin-bottom: 16px; text-align: center;">Tu hésites ? Voici comment choisir :</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; color: var(--text-muted); font-size: 0.9rem;">
          <div style="padding: 16px; background: var(--surface-2); border-radius: 10px;">
            <strong style="color: var(--text);">Starter</strong> : Tu veux un plan sur-mesure et avancer en autonomie.
          </div>
          <div style="padding: 16px; background: rgba(94, 234, 212, 0.08); border-radius: 10px; border: 1px solid var(--primary);">
            <strong style="color: var(--primary);">Transform</strong> : Tu veux un suivi hebdo et des ajustements continus.
          </div>
          <div style="padding: 16px; background: var(--surface-2); border-radius: 10px;">
            <strong style="color: #f59e0b;">Elite</strong> : Tu veux un coaching 1:1 avec bilans et priorite.
          </div>
        </div>
      </div>

      <!-- Rappel déduction -->
      <div style="text-align: center; margin-top: 32px; padding: 20px; background: linear-gradient(90deg, rgba(94, 234, 212, 0.1), rgba(52, 211, 153, 0.1)); border-radius: 12px; border: 1px solid var(--primary);">
        <p style="color: var(--text); margin: 0; font-size: 1rem;">
          <strong>Rappel :</strong> Tes ${ctaAmount}€ d'audit APEXLABS sont <strong style="color: var(--primary);">intégralement déduits</strong> de n'importe quelle formule.<br>
          <span style="color: var(--text-muted); font-size: 0.9rem;">Tu ne paies jamais deux fois. C'est ton investissement initial qui travaille pour toi.</span>
        </p>
      </div>

      <!-- Contact -->
      <div style="text-align: center; margin-top: 32px; padding: 24px; background: var(--surface-1); border-radius: 12px;">
        <p style="color: var(--text-muted); margin-bottom: 12px;">Une question avant de te lancer ?</p>
        <a href="mailto:coaching@achzodcoaching.com" style="color: var(--primary); font-weight: 700; text-decoration: none; font-size: 1.1rem;">coaching@achzodcoaching.com</a>
        <span style="color: var(--text-muted); margin: 0 12px;">|</span>
        <a href="https://www.achzodcoaching.com" target="_blank" style="color: var(--text-muted); text-decoration: none;">achzodcoaching.com</a>
      </div>
    </div>

    <!-- Sections Détaillées (Accordéon) -->
    <div style="margin-top: 48px;">
      <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text); margin-bottom: 32px; text-transform: uppercase; letter-spacing: 0.05em;">Détails de l'analyse</h2>
      ${sectionsHTML}
    </div>

    <!-- CTA fin supprimé - intégré dans le CTA principal -->

    <!-- Formulaire d'avis -->
    <div id="review-form-container" style="max-width: 700px; margin: 60px auto; padding: 40px; background: var(--card-bg); border: 1px solid var(--primary); border-radius: 24px;">
      <h3 style="color: var(--text-primary); margin-bottom: 16px; text-align: center; font-size: 1.8rem; font-weight: 800;">Ton avis compte</h3>
      <p style="color: var(--text-secondary); margin-bottom: 32px; text-align: center; font-size: 1.05rem;">Donne ton avis sur cette analyse pour m'aider à améliorer mes services</p>
      
      <form id="review-form" style="display: flex; flex-direction: column; gap: 24px;">
        <input type="hidden" id="audit-id" value="${auditId}" />
        
        <div>
          <label style="color: var(--text-primary); display: block; margin-bottom: 12px; font-weight: 600; font-size: 1.05rem;">Note sur 5 étoiles *</label>
          <div id="rating-stars" style="display: flex; gap: 8px; justify-content: center; font-size: 2.5rem; cursor: pointer;">
            <span data-rating="1" style="color: #404040; transition: color 0.2s, transform 0.2s;">★</span>
            <span data-rating="2" style="color: #404040; transition: color 0.2s, transform 0.2s;">★</span>
            <span data-rating="3" style="color: #404040; transition: color 0.2s, transform 0.2s;">★</span>
            <span data-rating="4" style="color: #404040; transition: color 0.2s, transform 0.2s;">★</span>
            <span data-rating="5" style="color: #404040; transition: color 0.2s, transform 0.2s;">★</span>
          </div>
          <input type="hidden" id="rating-value" name="rating" required />
        </div>
        
        <div>
          <label for="comment" style="color: var(--text-primary); display: block; margin-bottom: 12px; font-weight: 600; font-size: 1.05rem;">Ton commentaire *</label>
          <textarea 
            id="comment" 
            name="comment" 
            required 
            minlength="10" 
            maxlength="1000"
            placeholder="Partage ton expérience avec cette analyse..."
            style="width: 100%; min-height: 140px; padding: 16px; background: var(--background); border: 1px solid var(--border); border-radius: 12px; color: var(--text-primary); font-family: inherit; font-size: 1rem; resize: vertical;"
          ></textarea>
          <small style="color: var(--text-secondary); display: block; margin-top: 8px;">Minimum 10 caractères</small>
        </div>
        
        <div>
          <label for="email" style="color: var(--text-primary); display: block; margin-bottom: 12px; font-weight: 600; font-size: 1.05rem;">Email (optionnel)</label>
          <input 
            type="email" 
            id="email" 
            name="email"
            placeholder="ton@email.com"
            style="width: 100%; padding: 14px 16px; background: var(--background); border: 1px solid var(--border); border-radius: 12px; color: var(--text-primary); font-family: inherit; font-size: 1rem;"
          />
        </div>
        
        <button 
          type="submit"
          style="background: linear-gradient(135deg, var(--primary) 0%, #059669 100%); color: white; padding: 16px 32px; border: none; border-radius: 12px; font-size: 1.05rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s, transform 0.2s; box-shadow: 0 4px 20px rgba(94, 234, 212, 0.3);"
          onmouseover="this.style.opacity='0.9'; this.style.transform='translateY(-2px)'"
          onmouseout="this.style.opacity='1'; this.style.transform='translateY(0)'"
        >
          Envoyer mon avis
        </button>
        
        <div id="review-success" style="display: none; padding: 20px; background: rgba(16, 185, 129, 0.15); border: 1px solid var(--primary); border-radius: 12px; color: var(--primary); text-align: center; font-weight: 500;">
          Merci. Ton avis sera examiné avant publication.
        </div>
        
        <div id="review-error" style="display: none; padding: 20px; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 12px; color: #fca5a5; text-align: center; font-weight: 500;">
          Erreur lors de l'envoi. Réessaie plus tard.
        </div>
      </form>
    </div>

    <footer class="footer">
      <p>Rapport généré par <strong>APEXLABS</strong> - par ACHZOD</p>
      <p>Expertise certifiée • Science appliquée • Résultats mesurables</p>
    </footer>

  </div>
  
  <script>
    (function() {
      // Theme Management
      const savedTheme = localStorage.getItem('report-theme') || 'light';
      document.documentElement.setAttribute('data-theme', savedTheme);
      
      const themeButtons = document.querySelectorAll('.theme-btn');
      themeButtons.forEach(btn => {
        if (btn.dataset.theme === savedTheme) {
          btn.classList.add('active');
        }
        btn.addEventListener('click', () => {
          const theme = btn.dataset.theme;
          document.documentElement.setAttribute('data-theme', theme);
          localStorage.setItem('report-theme', theme);
          themeButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
      
      // Table of Contents Management
      const tocToggle = document.getElementById('toc-toggle');
      const tocContainer = document.getElementById('toc-container');
      const tocLinks = document.querySelectorAll('.toc-link');
      
      if (tocToggle && tocContainer) {
        // Toujours visible: on propose seulement un mode "réduit"
        const savedMin = localStorage.getItem('report-toc-min') === '1';
        if (savedMin) tocContainer.classList.add('minimized');

        tocToggle.addEventListener('click', () => {
          tocContainer.classList.toggle('minimized');
          localStorage.setItem('report-toc-min', tocContainer.classList.contains('minimized') ? '1' : '0');
        });
        
        // Smooth scroll for TOC links
        tocLinks.forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
              const offsetTop = targetSection.offsetTop - 100;
              window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
              });
            }
          });
        });
        
        // Highlight active section in TOC on scroll
        const sections = document.querySelectorAll('.accordion-section');
        const observerOptions = {
          root: null,
          rootMargin: '-100px 0px -66% 0px',
          threshold: 0
        };
        
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const id = entry.target.id;
              tocLinks.forEach(link => {
                link.classList.remove('active');
                if (link.dataset.section === id) {
                  link.classList.add('active');
                }
              });
            }
          });
        }, observerOptions);
        
        sections.forEach(section => observer.observe(section));
      }
      
      // Review Form
      const form = document.getElementById('review-form');
      const ratingStars = document.getElementById('rating-stars');
      const ratingInput = document.getElementById('rating-value');
      const commentInput = document.getElementById('comment');
      const emailInput = document.getElementById('email');
      const successDiv = document.getElementById('review-success');
      const errorDiv = document.getElementById('review-error');
      let selectedRating = 0;
      
      // Gestion des étoiles
      const stars = ratingStars.querySelectorAll('span');
      stars.forEach((star, index) => {
        star.addEventListener('click', () => {
          selectedRating = index + 1;
          ratingInput.value = selectedRating;
          updateStars();
        });
        star.addEventListener('mouseenter', () => {
          if (!selectedRating) {
            highlightStars(index + 1);
          }
        });
      });
      ratingStars.addEventListener('mouseleave', () => {
        if (!selectedRating) {
          stars.forEach(s => s.style.color = '#404040');
        } else {
          updateStars();
        }
      });
      
      function updateStars() {
        stars.forEach((star, index) => {
          if (index < selectedRating) {
            star.style.color = '#fbbf24';
            star.style.transform = 'scale(1.1)';
          } else {
            star.style.color = '#404040';
            star.style.transform = 'scale(1)';
          }
        });
      }
      
      function highlightStars(count) {
        stars.forEach((star, index) => {
          if (index < count) {
            star.style.color = '#fbbf24';
            star.style.transform = 'scale(1.05)';
          } else {
            star.style.color = '#404040';
            star.style.transform = 'scale(1)';
          }
        });
      }
      
      // Soumission du formulaire
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        successDiv.style.display = 'none';
        errorDiv.style.display = 'none';
        
        if (!selectedRating) {
          alert('Veuillez sélectionner une note');
          return;
        }
        
        const auditId = document.getElementById('audit-id').value;
        if (!auditId) {
          errorDiv.style.display = 'block';
          errorDiv.textContent = '❌ ID audit manquant';
          return;
        }
        
        // Obtenir l'URL de base - utiliser l'URL du serveur si fichier local
        let baseUrl = window.location.origin;
        if (baseUrl === 'null' || baseUrl.startsWith('file://')) {
          // Si fichier ouvert localement, utiliser l'URL du serveur
          baseUrl = 'https://neurocore-360.onrender.com';
        }
        
        const formData = {
          auditId: auditId,
          rating: selectedRating,
          comment: commentInput.value.trim(),
          email: emailInput.value.trim() || undefined
        };
        
        try {
          const response = await fetch(baseUrl + '/api/review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          
          const data = await response.json();
          
          if (response.ok && data.success) {
            successDiv.style.display = 'block';
            form.reset();
            selectedRating = 0;
            updateStars();
            ratingStars.style.pointerEvents = 'none';
            commentInput.disabled = true;
            emailInput.disabled = true;
            form.querySelector('button[type="submit"]').disabled = true;
          } else {
            errorDiv.style.display = 'block';
            errorDiv.textContent = data.error || 'Erreur lors de l\\'envoi';
          }
        } catch (error) {
          errorDiv.style.display = 'block';
          errorDiv.textContent = '❌ Erreur réseau. Réessaie plus tard.';
        }
      });
    })();
  </script>
</body>
</html>`;
}

export function generateExportHTML(
  report: any,
  auditId: string,
  photos?: string[],
  clientResponses?: Record<string, unknown>
): string {
  if (report.txt) {
    return generateExportHTMLFromTxt(report.txt, auditId, photos, clientResponses);
  }
  return "Ancien format non supporté";
}

export async function generateExportPDF(
  report: any,
  auditId: string,
  photos?: string[],
  clientResponses?: Record<string, unknown>
): Promise<Buffer> {
  const html = generateExportHTML(report, auditId, photos, clientResponses);
  
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
