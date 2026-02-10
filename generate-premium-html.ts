import fs from "fs";
import { marked } from "marked";

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

async function generatePremiumHTML() {
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

  // Extract sections for TOC
  const sections: { id: string; title: string; level: number }[] = [];
  const lines = aiReport.split('\n');

  lines.forEach(line => {
    if (line.startsWith('## ')) {
      const title = line.replace('## ', '').trim();
      const id = title.toLowerCase()
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-');
      sections.push({ id, title, level: 2 });
    } else if (line.startsWith('### ')) {
      const title = line.replace('### ', '').trim();
      const id = title.toLowerCase()
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-');
      sections.push({ id, title, level: 3 });
    }
  });

  // Add IDs to markdown headers
  let processedMarkdown = aiReport;
  sections.forEach(section => {
    const regex = new RegExp(`^(#{2,3})\\s+${section.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gm');
    processedMarkdown = processedMarkdown.replace(regex, `$1 <a id="${section.id}"></a>${section.title}`);
  });

  const htmlContent = marked.parse(processedMarkdown);

  // Build TOC
  const tocItems = sections.map(s => {
    const indent = s.level === 3 ? 'margin-left: 1.5rem;' : '';
    const size = s.level === 3 ? 'font-size: 0.9rem;' : 'font-size: 1rem; font-weight: 600;';
    return `<a href="#${s.id}" class="toc-item" style="${indent}${size}" data-section="${s.id}">${s.title}</a>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blood Analysis Premium - Test</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --bg: #000000;
      --surface: #0a0a0a;
      --surface-elevated: #141414;
      --border: rgba(255,255,255,0.06);
      --text: #ffffff;
      --text-muted: rgba(255,255,255,0.6);
      --accent: #0ea5e9;
      --accent-glow: rgba(14, 165, 233, 0.3);
      --critical: #ef4444;
      --warning: #f59e0b;
      --success: #10b981;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.8;
      overflow-x: hidden;
    }

    /* Animated gradient background */
    body::before {
      content: '';
      position: fixed;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at 20% 50%, rgba(14, 165, 233, 0.08) 0%, transparent 50%),
                  radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.06) 0%, transparent 50%);
      animation: rotate 30s linear infinite;
      z-index: -1;
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* Header */
    .header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 80px;
      background: rgba(10, 10, 10, 0.8);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      z-index: 100;
      display: flex;
      align-items: center;
      padding: 0 3rem;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 2rem;
      width: 100%;
    }

    .logo {
      font-size: 1.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .patient-info {
      font-size: 0.95rem;
      color: var(--text-muted);
    }

    .header-stats {
      margin-left: auto;
      display: flex;
      gap: 2rem;
    }

    .header-stat {
      text-align: center;
    }

    .header-stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--accent);
    }

    .header-stat-label {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Layout */
    .layout {
      display: flex;
      margin-top: 80px;
    }

    /* Sidebar TOC */
    .sidebar {
      position: fixed;
      left: 0;
      top: 80px;
      bottom: 0;
      width: 320px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      overflow-y: auto;
      padding: 2rem 0;
    }

    .sidebar::-webkit-scrollbar {
      width: 6px;
    }

    .sidebar::-webkit-scrollbar-track {
      background: transparent;
    }

    .sidebar::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
    }

    .toc-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--text-muted);
      padding: 0 2rem;
      margin-bottom: 1.5rem;
      font-weight: 600;
    }

    .toc-item {
      display: block;
      padding: 0.75rem 2rem;
      color: var(--text-muted);
      text-decoration: none;
      transition: all 0.2s ease;
      border-left: 2px solid transparent;
      font-size: 0.95rem;
    }

    .toc-item:hover {
      color: var(--accent);
      background: rgba(14, 165, 233, 0.05);
      border-left-color: var(--accent);
    }

    .toc-item.active {
      color: var(--accent);
      background: rgba(14, 165, 233, 0.1);
      border-left-color: var(--accent);
      font-weight: 600;
    }

    /* Main content */
    .content {
      margin-left: 320px;
      padding: 3rem 4rem 6rem 4rem;
      max-width: 1200px;
      animation: fadeIn 0.6s ease-out;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Markers Grid */
    .markers-section {
      margin-bottom: 4rem;
    }

    .markers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1rem;
    }

    .marker-card {
      background: var(--surface-elevated);
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .marker-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent), var(--accent));
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .marker-card:hover {
      border-color: var(--accent);
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(14, 165, 233, 0.2);
    }

    .marker-card:hover::before {
      opacity: 1;
    }

    .marker-name {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
      font-weight: 600;
    }

    .marker-value {
      font-size: 2rem;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 0.5rem;
      font-variant-numeric: tabular-nums;
    }

    .marker-status {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-transform: capitalize;
    }

    /* Typography */
    h1 {
      font-size: 3rem;
      font-weight: 800;
      margin-bottom: 2rem;
      background: linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.2;
    }

    h2 {
      font-size: 2rem;
      font-weight: 700;
      margin-top: 4rem;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid var(--border);
      color: var(--text);
      scroll-margin-top: 100px;
    }

    h3 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-top: 3rem;
      margin-bottom: 1.5rem;
      color: var(--accent);
      scroll-margin-top: 100px;
    }

    h4 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-top: 2rem;
      margin-bottom: 1rem;
      color: rgba(255,255,255,0.9);
    }

    p {
      margin-bottom: 1.5rem;
      color: var(--text-muted);
      font-size: 1.05rem;
      line-height: 1.9;
    }

    strong {
      color: var(--text);
      font-weight: 600;
    }

    ul, ol {
      margin-left: 2rem;
      margin-bottom: 2rem;
      color: var(--text-muted);
    }

    li {
      margin-bottom: 0.75rem;
      line-height: 1.8;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 2rem 0;
      background: var(--surface-elevated);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border);
    }

    th {
      background: rgba(14, 165, 233, 0.1);
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: var(--accent);
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 1rem;
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover {
      background: rgba(255,255,255,0.02);
    }

    hr {
      border: none;
      border-top: 1px solid var(--border);
      margin: 3rem 0;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .sidebar {
        transform: translateX(-100%);
        transition: transform 0.3s ease;
      }

      .content {
        margin-left: 0;
        padding: 2rem;
      }

      .header {
        padding: 0 1.5rem;
      }

      .header-stats {
        display: none;
      }
    }

    /* Scroll progress */
    .scroll-progress {
      position: fixed;
      top: 80px;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, var(--accent), #8b5cf6);
      transform-origin: left;
      z-index: 101;
      transition: transform 0.1s ease;
    }
  </style>
</head>
<body>
  <div class="scroll-progress" id="scrollProgress"></div>

  <header class="header">
    <div class="header-content">
      <div class="logo">🩸 Blood Analysis</div>
      <div class="patient-info">Test • 35 ans • Homme</div>
      <div class="header-stats">
        <div class="header-stat">
          <div class="header-stat-value">${markers.length}</div>
          <div class="header-stat-label">Marqueurs</div>
        </div>
        <div class="header-stat">
          <div class="header-stat-value">${Math.round(aiReport.length / 1000)}k</div>
          <div class="header-stat-label">Chars</div>
        </div>
      </div>
    </div>
  </header>

  <div class="layout">
    <nav class="sidebar">
      <div class="toc-title">Table des matières</div>
      ${tocItems}
    </nav>

    <main class="content">
      <div class="markers-section">
        <h1>Analyse Sanguine Approfondie</h1>
        <div class="markers-grid">
          ${markers.map(m => `
            <div class="marker-card">
              <div class="marker-name">${m.markerId.replace(/_/g, ' ')}</div>
              <div class="marker-value">${m.value}</div>
              <div class="marker-status">${m.status || 'normal'}</div>
            </div>
          `).join('')}
        </div>
      </div>

      ${htmlContent}
    </main>
  </div>

  <script>
    // Active TOC item on scroll
    const tocItems = document.querySelectorAll('.toc-item');
    const sections = Array.from(tocItems).map(item => {
      const id = item.getAttribute('data-section');
      return document.getElementById(id);
    }).filter(Boolean);

    function updateActiveTOC() {
      let currentSection = '';

      sections.forEach(section => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom >= 150) {
          currentSection = section.id;
        }
      });

      tocItems.forEach(item => {
        if (item.getAttribute('data-section') === currentSection) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }

    // Scroll progress
    function updateScrollProgress() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = (scrollTop / scrollHeight) * 100;
      document.getElementById('scrollProgress').style.transform = \`scaleX(\${progress / 100})\`;
    }

    window.addEventListener('scroll', () => {
      updateActiveTOC();
      updateScrollProgress();
    });

    // Smooth scroll for TOC links
    tocItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = item.getAttribute('href').substring(1);
        const target = document.getElementById(targetId);
        if (target) {
          window.scrollTo({
            top: target.offsetTop - 100,
            behavior: 'smooth'
          });
        }
      });
    });

    // Initial call
    updateActiveTOC();
    updateScrollProgress();
  </script>
</body>
</html>`;

  fs.writeFileSync('/Users/achzod/Desktop/neurocore/neurocore-github/blood-report-premium.html', html);
  console.log('✅ HTML Premium généré: blood-report-premium.html');
}

generatePremiumHTML()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ ERROR:", error);
    process.exit(1);
  });
