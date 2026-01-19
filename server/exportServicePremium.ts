import { formatTxtToDashboard } from "./formatDashboard";
import { getCTADebut, getCTAFin, PRICING } from "./cta";
import type { AuditTier } from "./types";

/**
 * NEUROCORE 360 - Premium HTML Export Engine
 * Ultrahuman-inspired design with glassmorphism, bento grids, and tech aesthetics
 */

function getScoreColor(score: number): string {
  if (score >= 80) return "#00FF94"; // Green
  if (score >= 65) return "#FF5C00"; // Orange
  if (score >= 50) return "#00F0FF"; // Cyan
  return "#FF3333"; // Red
}

function getScoreStatus(score: number): string {
  if (score >= 80) return "status-green";
  if (score >= 65) return "status-orange";
  return "status-red";
}

function getScoreLabel(score: number): string {
  if (score >= 85) return "EXCELLENT";
  if (score >= 70) return "GOOD";
  if (score >= 50) return "MOYEN";
  return "CRITICAL";
}

function generateRingSVG(score: number): string {
  // Circumference = 2 * π * 90 = 565
  // Offset = 565 * (1 - score/100)
  const offset = 565 * (1 - score / 100);

  return `
    <div class="ring-container">
      <svg class="ring-svg" viewBox="0 0 200 200">
        <circle class="ring-bg" cx="100" cy="100" r="90"></circle>
        <circle class="ring-val" cx="100" cy="100" r="90" style="stroke-dashoffset: ${offset};"></circle>
      </svg>
      <div class="ring-center">
        <span class="big-score">${score}</span>
        <span class="score-label">Global Score</span>
      </div>
    </div>
  `;
}

export function generatePremiumHTMLFromTxt(
  txt: string,
  auditId: string,
  photos?: string[],
  clientResponses?: Record<string, unknown>
): string {
  const dashboard = formatTxtToDashboard(txt);
  const firstName = (dashboard.clientName || "Profil").trim().split(/\s+/)[0] || "Profil";
  const globalScore = dashboard.global || 60;

  // Extract sections
  const sections = dashboard.sections || [];

  // Extract key scores for bento grid
  const sommeilSection = sections.find(s => s.id.includes('sommeil') || s.title.toLowerCase().includes('sommeil'));
  const nerveuxSection = sections.find(s => s.id.includes('nerveux') || s.title.toLowerCase().includes('nerveux') || s.title.toLowerCase().includes('stress'));
  const hormonesSection = sections.find(s => s.id.includes('hormon') || s.title.toLowerCase().includes('hormon'));
  const digestionSection = sections.find(s => s.id.includes('digest') || s.title.toLowerCase().includes('digest'));
  const trainingSection = sections.find(s => s.id.includes('train') || s.title.toLowerCase().includes('entraînement') || s.title.toLowerCase().includes('training'));
  const nutritionSection = sections.find(s => s.id.includes('nutri') || s.title.toLowerCase().includes('nutri') || s.title.toLowerCase().includes('métabo'));

  const scoreSommeil = sommeilSection?.score || 75;
  const scoreNerveux = nerveuxSection?.score || 60;
  const scoreHormones = hormonesSection?.score || 65;
  const scoreDigestion = digestionSection?.score || 70;
  const scoreTraining = trainingSection?.score || 68;
  const scoreNutrition = nutritionSection?.score || 72;

  // Build navigation links
  const navLinks = sections.map((section, index) => {
    const sectionId = `section-${index + 1}`;
    return `<a href="#${sectionId}" class="nav-item">${String(index).padStart(2, '0')} // ${section.title.toUpperCase()}</a>`;
  }).join('\n');

  // Build sections HTML
  const sectionsHTML = sections.map((section, index) => {
    const sectionId = `section-${index + 1}`;
    const sectionNum = String(index + 1).padStart(2, '0');

    // Parse content for better formatting
    const content = section.content || '';
    const paragraphs = content.split('\n\n').filter(p => p.trim());

    const contentHTML = paragraphs.map(para => {
      // Check if it's a list
      if (para.includes('•') || para.includes('-')) {
        const items = para.split(/\n/).filter(l => l.trim());
        return `
          <ul class="tech-list">
            ${items.map(item => `<li>${item.replace(/^[•\-]\s*/, '')}</li>`).join('')}
          </ul>
        `;
      }

      // Check if it's a protocol/action box
      if (para.toLowerCase().includes('protocole') || para.toLowerCase().includes('action')) {
        return `
          <div class="protocol-box">
            <span class="protocol-title">${para.split('\n')[0]}</span>
            <p style="margin:0; color:#fff;">${para.split('\n').slice(1).join(' ')}</p>
          </div>
        `;
      }

      return `<p>${para}</p>`;
    }).join('');

    return `
      <section class="section" id="${sectionId}">
        <span class="section-num">${sectionNum} // ${section.title.toUpperCase()}</span>
        <h2>${section.title}</h2>
        <div style="display:flex; gap:8px; margin-bottom:24px;">
          <span class="data-pill">SCORE: ${section.score}</span>
          <span class="data-pill">STATUS: ${getScoreLabel(section.score)}</span>
        </div>
        ${contentHTML}
      </section>
    `;
  }).join('');

  // CTA Fallback
  const lowerTxt = txt.toLowerCase();
  const inferredTier: AuditTier =
    lowerTxt.includes('discovery scan') || lowerTxt.includes('analyse gratuite')
      ? 'GRATUIT'
      : lowerTxt.includes('ultimate scan')
      ? 'ELITE'
      : 'PREMIUM';
  const ctaAmount = inferredTier === 'ELITE' ? PRICING.ELITE : PRICING.PREMIUM;
  const ctaDebut = dashboard.ctaDebut || getCTADebut(inferredTier, ctaAmount);
  const ctaFin = dashboard.ctaFin || getCTAFin(inferredTier, ctaAmount);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AUDIT EXPERT — ${firstName.toUpperCase()} | ACHZOD SYSTEM</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">

  <style>
    /* --- CORE VARIABLES --- */
    :root {
      --bg-deep: #050505;
      --bg-surface: #0A0A0A;
      --glass-panel: rgba(20, 20, 20, 0.6);
      --glass-border: rgba(255, 255, 255, 0.08);
      --glass-highlight: rgba(255, 255, 255, 0.15);

      --accent-primary: #EDEDED;
      --accent-secondary: #A1A1AA;

      --signal-green: #00FF94;
      --signal-orange: #FF5C00;
      --signal-cyan: #00F0FF;
      --signal-danger: #FF3333;

      --font-display: 'Inter', sans-serif;
      --font-mono: 'JetBrains Mono', monospace;

      --sidebar-width: 260px;
      --easing: cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* --- RESET & BASE --- */
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      background-color: var(--bg-deep);
      color: var(--accent-primary);
      font-family: var(--font-display);
      line-height: 1.6;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    body::before {
      content: '';
      position: fixed;
      width: 100vw; height: 100vh;
      top: 0; left: 0;
      background:
        radial-gradient(circle at 10% 20%, rgba(0, 240, 255, 0.04), transparent 40%),
        radial-gradient(circle at 90% 60%, rgba(255, 92, 0, 0.03), transparent 40%);
      pointer-events: none;
      z-index: -1;
    }

    #scroll-progress {
      position: fixed;
      top: 0; left: 0;
      height: 2px;
      background: var(--signal-orange);
      width: 0%;
      z-index: 1000;
      box-shadow: 0 0 10px var(--signal-orange);
      transition: width 0.1s linear;
    }

    /* --- TYPOGRAPHY --- */
    h1, h2, h3 { font-weight: 900; letter-spacing: -0.04em; color: #fff; }
    h1 { font-size: clamp(3rem, 5vw, 6rem); line-height: 0.95; text-transform: uppercase; }
    h2 { font-size: 2.5rem; margin-bottom: 1rem; }
    p { color: var(--accent-secondary); font-size: 1.05rem; margin-bottom: 1.5rem; max-width: 70ch; }

    .mono { font-family: var(--font-mono); letter-spacing: -0.05em; }
    .gradient-text {
      background: linear-gradient(90deg, #fff, #999);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* --- SIDEBAR (HUD) --- */
    .sidebar {
      position: fixed;
      left: 0; top: 0; bottom: 0;
      width: var(--sidebar-width);
      background: rgba(5, 5, 5, 0.8);
      backdrop-filter: blur(20px);
      border-right: 1px solid var(--glass-border);
      padding: 40px 24px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      transform: translateX(0);
      transition: transform 0.3s var(--easing);
    }

    .brand {
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--signal-orange);
      letter-spacing: 2px;
      margin-bottom: 40px;
      text-transform: uppercase;
      font-weight: 700;
    }

    .nav-links {
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #333 transparent;
    }
    .nav-links::-webkit-scrollbar { width: 4px; }
    .nav-links::-webkit-scrollbar-track { background: transparent; }
    .nav-links::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      color: #555;
      text-decoration: none;
      font-family: var(--font-mono);
      font-size: 11px;
      text-transform: uppercase;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .nav-item:hover { color: #fff; background: rgba(255,255,255,0.03); }
    .nav-item.active {
      color: var(--signal-green);
      background: rgba(0, 255, 148, 0.05);
      border-left: 2px solid var(--signal-green);
    }

    /* --- MAIN CONTENT --- */
    .main {
      margin-left: var(--sidebar-width);
      padding: 0;
      min-height: 100vh;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 80px 40px;
    }

    /* HERO SECTION */
    .hero {
      min-height: 90vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 100px 60px;
      border-bottom: 1px solid var(--glass-border);
      position: relative;
      overflow: hidden;
    }

    .hero-label {
      font-family: var(--font-mono);
      color: var(--signal-orange);
      font-size: 12px;
      border: 1px solid rgba(255, 92, 0, 0.3);
      padding: 6px 12px;
      border-radius: 100px;
      width: fit-content;
      margin-bottom: 24px;
      background: rgba(255, 92, 0, 0.05);
    }

    /* BENTO GRID SCORES */
    .bento-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-top: 60px;
    }

    .score-card {
      background: var(--glass-panel);
      border: 1px solid var(--glass-border);
      border-radius: 20px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.3s var(--easing);
      position: relative;
      overflow: hidden;
    }

    .score-card:hover {
      border-color: rgba(255,255,255,0.2);
      transform: translateY(-2px);
      box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
    }

    .score-card.main-score {
      grid-column: span 2;
      grid-row: span 2;
      background: radial-gradient(circle at top right, rgba(0,240,255,0.1), transparent 60%), var(--glass-panel);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 300px;
    }

    .ring-container { position: relative; width: 200px; height: 200px; }
    .ring-svg { transform: rotate(-90deg); width: 100%; height: 100%; }
    .ring-bg { fill: none; stroke: rgba(255,255,255,0.05); stroke-width: 8; }
    .ring-val {
      fill: none;
      stroke: var(--signal-cyan);
      stroke-width: 8;
      stroke-linecap: round;
      stroke-dasharray: 565;
      transition: stroke-dashoffset 1.5s ease-out;
      filter: drop-shadow(0 0 8px var(--signal-cyan));
    }

    .ring-center {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .big-score { font-size: 80px; font-weight: 800; line-height: 1; font-family: var(--font-mono); letter-spacing: -4px; }
    .score-label { font-size: 12px; text-transform: uppercase; color: #666; letter-spacing: 2px; margin-top: 8px; }

    .mini-score-val {
      font-size: 42px;
      font-family: var(--font-mono);
      font-weight: 700;
      color: #fff;
      margin-bottom: 4px;
    }
    .mini-score-label { font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #333; margin-bottom: 12px;
      box-shadow: 0 0 10px currentColor;
    }
    .status-green { background: var(--signal-green); color: var(--signal-green); }
    .status-orange { background: var(--signal-orange); color: var(--signal-orange); }
    .status-red { background: var(--signal-danger); color: var(--signal-danger); }

    /* SECTIONS */
    .section {
      padding: 100px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    .section-num {
      font-family: var(--font-mono);
      color: var(--signal-cyan);
      font-size: 14px;
      margin-bottom: 16px;
      display: block;
    }

    .data-pill {
      display: inline-block;
      border: 1px solid rgba(255,255,255,0.15);
      padding: 4px 12px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--accent-primary);
      margin-right: 8px;
      margin-bottom: 8px;
    }

    .protocol-box {
      background: rgba(255,255,255,0.02);
      border-left: 2px solid var(--signal-green);
      padding: 24px;
      margin: 24px 0;
    }
    .protocol-title { font-family: var(--font-mono); color: var(--signal-green); font-size: 12px; text-transform: uppercase; margin-bottom: 12px; display: block; }

    ul.tech-list { list-style: none; }
    ul.tech-list li {
      padding: 12px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    ul.tech-list li::before {
      content: '>';
      font-family: var(--font-mono);
      color: var(--signal-cyan);
    }

    /* PRICING */
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 40px; }
    .price-card {
      background: #000;
      border: 1px solid #222;
      padding: 32px;
      border-radius: 16px;
      position: relative;
    }
    .price-card.featured { border: 1px solid var(--signal-cyan); box-shadow: 0 0 30px rgba(0, 240, 255, 0.05); }
    .price-tag { font-family: var(--font-mono); font-size: 32px; font-weight: 700; color: #fff; margin: 20px 0; display: block; }
    .btn-tech {
      display: block; width: 100%;
      background: #fff; color: #000;
      text-align: center;
      padding: 16px;
      font-weight: 700;
      text-decoration: none;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 1px;
      margin-top: 24px;
      transition: transform 0.2s;
    }
    .btn-tech:hover { transform: scale(1.02); }
    .btn-tech.outline { background: transparent; border: 1px solid #fff; color: #fff; }

    .mobile-menu-btn {
      position: fixed; top: 20px; right: 20px; z-index: 200;
      background: rgba(0,0,0,0.8); border: 1px solid #333;
      color: #fff; padding: 12px; border-radius: 50%;
      display: none; cursor: pointer;
    }

    @media (max-width: 1024px) {
      .sidebar { transform: translateX(-100%); width: 280px; }
      .sidebar.open { transform: translateX(0); }
      .main { margin-left: 0; }
      .mobile-menu-btn { display: block; }
      h1 { font-size: 3rem; }
      .score-card.main-score { grid-column: span 1; grid-row: span 1; }
    }

    @media print {
      .sidebar, .mobile-menu-btn, #scroll-progress { display: none; }
      .main { margin-left: 0; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <div id="scroll-progress"></div>
  <button class="mobile-menu-btn" onclick="document.querySelector('.sidebar').classList.toggle('open')">☰</button>

  <aside class="sidebar">
    <div class="brand">ACHZOD // SYSTEM</div>
    <nav class="nav-links">
      <a href="#hero" class="nav-item active">00 // OVERVIEW</a>
      ${navLinks}
      <a href="#pricing" class="nav-item">${String(sections.length + 1).padStart(2, '0')} // UPGRADE</a>
    </nav>
  </aside>

  <main class="main">

    <section class="hero" id="hero">
      <div class="hero-label">AUDIT EXPERT — CONFIDENTIAL</div>
      <h1>${firstName.toUpperCase()},<br><span class="gradient-text">VOICI TON AUDIT.</span></h1>
      <p style="margin-top: 24px; border-left: 2px solid var(--signal-orange); padding-left: 20px;">
        ${firstName}, ${globalScore}/100. Voici ce qui se passe vraiment dans ton corps.
      </p>

      <div class="bento-grid">
        <div class="score-card main-score">
          ${generateRingSVG(globalScore)}
        </div>

        <div class="score-card">
          <div class="status-dot ${getScoreStatus(scoreSommeil)}"></div>
          <div>
            <div class="mini-score-val">${scoreSommeil}</div>
            <div class="mini-score-label">Sommeil</div>
          </div>
        </div>

        <div class="score-card">
          <div class="status-dot ${getScoreStatus(scoreNerveux)}"></div>
          <div>
            <div class="mini-score-val">${scoreNerveux}</div>
            <div class="mini-score-label">Nerveux</div>
          </div>
          ${scoreNerveux < 50 ? '<div style="font-size:10px; color:#666; margin-top:8px;">CRITICAL LIMIT</div>' : ''}
        </div>

        <div class="score-card">
          <div class="status-dot ${getScoreStatus(scoreHormones)}"></div>
          <div>
            <div class="mini-score-val">${scoreHormones}</div>
            <div class="mini-score-label">Hormones</div>
          </div>
        </div>

        <div class="score-card">
          <div class="status-dot ${getScoreStatus(scoreDigestion)}"></div>
          <div>
            <div class="mini-score-val">${scoreDigestion}</div>
            <div class="mini-score-label">Digestion</div>
          </div>
        </div>

        <div class="score-card">
          <div class="status-dot ${getScoreStatus(scoreTraining)}"></div>
          <div>
            <div class="mini-score-val">${scoreTraining}</div>
            <div class="mini-score-label">Training</div>
          </div>
        </div>
      </div>
    </section>

    <div class="container">

      <div style="background: linear-gradient(90deg, rgba(0,255,148,0.1), transparent); border: 1px solid var(--signal-green); padding: 16px; border-radius: 8px; display: flex; align-items: center; gap: 16px; margin-bottom: 60px;">
        <span style="font-family: var(--font-mono); font-size: 13px; color: var(--signal-green);">
          INVESTISSEMENT 100% DÉDUIT DE TON FUTUR COACHING.
        </span>
      </div>

      ${sectionsHTML}

      <section class="section" id="pricing" style="border-bottom:none;">
        <span class="section-num">${String(sections.length + 1).padStart(2, '0')} // COACHING</span>
        <h2>Passe à l'action</h2>
        <p>Les plans génériques ne fonctionnent pas. Tu as besoin d'un système de pilotage complet.</p>

        <div class="pricing-grid">
          <div class="price-card">
            <span class="mini-score-label">STARTER</span>
            <span class="price-tag">97€ <span style="font-size:14px; color:#666; font-weight:400;">/ 1 mois</span></span>
            <p style="font-size:13px; margin-bottom:24px;">Plan personnalisé livré. Autonomie totale. Pour les profils disciplinés.</p>
            <ul class="tech-list" style="font-size:12px;">
              <li>Plan sur-mesure</li>
              <li>Support email</li>
              <li>Livraison rapide</li>
            </ul>
            <a href="https://www.achzodcoaching.com/coaching-starter" class="btn-tech outline">Choisir Starter</a>
          </div>

          <div class="price-card featured">
            <div style="position:absolute; top:-12px; right:20px; background:var(--signal-cyan); color:#000; font-size:10px; font-weight:700; padding:4px 8px; border-radius:4px;">RECOMMANDE</div>
            <span class="mini-score-label" style="color:var(--signal-cyan)">TRANSFORM</span>
            <span class="price-tag">247€ <span style="font-size:14px; color:#666; font-weight:400;">/ 3 mois</span></span>
            <p style="font-size:13px; margin-bottom:24px;">Suivi hebdo, ajustements et priorite.</p>
            <ul class="tech-list" style="font-size:12px;">
              <li>Suivi hebdo</li>
              <li>Ajustements</li>
              <li>Support prioritaire</li>
            </ul>
            <a href="https://www.achzodcoaching.com/coaching-transform" class="btn-tech" style="background:var(--signal-cyan); border:none;">Choisir Transform</a>
          </div>

          <div class="price-card">
             <span class="mini-score-label" style="color:var(--signal-orange)">ELITE</span>
            <span class="price-tag">497€ <span style="font-size:14px; color:#666; font-weight:400;">/ 6 mois</span></span>
            <p style="font-size:13px; margin-bottom:24px;">Coaching 1:1, bilans et suivi avance.</p>
            <ul class="tech-list" style="font-size:12px;">
              <li>Coaching 1:1</li>
              <li>Bilans mensuels</li>
              <li>Acces VIP</li>
            </ul>
            <a href="https://www.achzodcoaching.com/coaching-elite" class="btn-tech outline">Decouvrir le coaching</a>
          </div>
        </div>
      </section>

    </div>

    <footer style="padding: 60px 0; text-align:center; border-top:1px solid rgba(255,255,255,0.05);">
      <div class="brand">ACHZOD // COACHING</div>
      <p style="font-size:12px; color:#444;">EXCELLENCE · SCIENCE · TRANSFORMATION</p>
    </footer>

  </main>

  <script>
    // SCROLL PROGRESS & ACTIVE LINK
    const progressBar = document.getElementById('scroll-progress');
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-item');

    window.addEventListener('scroll', () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = (scrollTop / scrollHeight) * 100;
      progressBar.style.width = progress + '%';

      let current = '';
      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (pageYOffset >= sectionTop - 200) {
          current = section.getAttribute('id');
        }
      });

      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').includes(current)) {
          link.classList.add('active');
        }
      });
    });
  </script>
</body>
</html>`;
}
