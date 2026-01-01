/**
 * Formatage TXT -> Dashboard
 * 
 * Cette fonction prend le TXT brut généré par generateAuditTxt()
 * et le transforme en format structuré pour le dashboard
 * 
 * ARCHITECTURE EN 2 ÉTAPES :
 * 1. generateAuditTxt() → TXT brut (simple, fiable)
 * 2. formatTxtToDashboard() → Format dashboard (séparé, flexible)
 */

export interface DashboardSection {
  id: string;
  title: string;
  score: number;
  content: string;
  order: number;
  category: 'executive' | 'analysis' | 'action' | 'transformation' | 'supplements';
}

export interface AuditDashboardFormat {
  clientName: string;
  generatedAt: string;
  global: number;
  sections: DashboardSection[];
  resumeExecutif?: string;
  ctaDebut?: string;
  ctaFin?: string;
  metadata?: {
    totalSections: number;
    totalCharacters: number;
  };
}

const SECTION_CATEGORIES: Record<string, DashboardSection['category']> = {
  'executive summary': 'executive',
  'analyse visuelle et posturale complete': 'analysis',
  'analyse biomecanique et sangle profonde': 'analysis',
  'analyse entrainement et periodisation': 'analysis',
  'analyse systeme cardiovasculaire': 'analysis',
  'analyse metabolisme et nutrition': 'analysis',
  'analyse sommeil et recuperation': 'analysis',
  'analyse digestion et microbiote': 'analysis',
  'analyse axes hormonaux': 'analysis',
  'protocole matin anti-cortisol': 'action',
  'protocole soir verrouillage sommeil': 'action',
  'protocole digestion 14 jours': 'action',
  'protocole bureau anti-sedentarite': 'action',
  'protocole entrainement personnalise': 'action',
  'plan semaine par semaine 30-60-90': 'action',
  'kpi et tableau de bord': 'analysis',
  'stack supplements optimise': 'supplements',
  'synthese et prochaines etapes': 'analysis',
  // Garder les anciens pour compatibilité
  'resume executif': 'executive',
  'introduction': 'analysis',
  'analyse visuelle photo face et dos': 'analysis',
  'sangle profonde / posture lombaires': 'analysis',
  'analyse entrainement': 'analysis',
  'cardio': 'analysis',
  'nutrition & metabolisme': 'analysis',
  'sommeil & biohacking': 'analysis',
  'digestion & tolerances': 'analysis',
  'axes hormonaux & bilans': 'analysis',
  'moment revelation': 'transformation',
  'cause racine en 3 phrases': 'transformation',
  'actions immediates (7 premiers jours)': 'action',
  'radar profil actuel et profil optimise': 'transformation',
  'ton potentiel inexploite': 'transformation',
  'feuille de route en 6 points': 'action',
  'projection 30/60/90 jours': 'action',
  'ce qui va changer si on travaille ensemble': 'transformation',
  'reassurance emotionnelle': 'transformation',
  'stack de supplements': 'supplements',
  'protocole supplements personnalise': 'supplements',
  'synthese clinique globale et conclusion transformationnelle': 'executive'
};

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractClientName(txtContent: string): string {
  const match = txtContent.match(/AUDIT COMPLET NEUROCORE 360 - (.+?)(?:\s*={3,}|\s*[\r\n])/i);
  if (match) {
    return match[1].trim();
  }
  return 'Client';
}

function extractGeneratedAt(txtContent: string): string {
  const match = txtContent.match(/G[eé]n[eé]r[eé] le (.+?)[\r\n]/i);
  if (match) {
    return match[1].trim();
  }
  return new Date().toLocaleString('fr-FR');
}

function extractCTA(txtContent: string, type: 'debut' | 'fin'): string | undefined {
  if (type === 'debut') {
    const startMarker = '==== OFFRE EXCLUSIVE';
    const idx = txtContent.indexOf(startMarker);
    if (idx !== -1) {
      const endIdx = txtContent.indexOf('====', idx + startMarker.length);
      if (endIdx !== -1) {
        return txtContent.substring(idx, endIdx + 4).trim();
      }
    }
  } else {
    const markers = ['PROCHAINE ETAPE', 'OFFRE LIMITEE', 'RESERVE TA PLACE'];
    for (const marker of markers) {
      const idx = txtContent.lastIndexOf(marker);
      if (idx !== -1) {
        return txtContent.substring(idx).trim();
      }
    }
  }
  return undefined;
}

export function formatTxtToDashboard(txtContent: string): AuditDashboardFormat {
  const sections: DashboardSection[] = [];
  const clientName = extractClientName(txtContent);
  const generatedAt = extractGeneratedAt(txtContent);
  
  // Nouveau délimiteur Elite V4 : Titres en MAJUSCULES seuls sur une ligne
  const sectionLines = txtContent.split('\n');
  const sectionMatches: { title: string; startIndex: number; endIndex: number }[] = [];
  
  // Titres attendus (tirés de geminiPremiumEngine SECTIONS)
  const VALID_TITLES = [
    "EXECUTIVE SUMMARY",
    "ANALYSE VISUELLE ET POSTURALE COMPLETE",
    "ANALYSE BIOMECANIQUE ET SANGLE PROFONDE",
    "ANALYSE ENTRAINEMENT ET PERIODISATION",
    "ANALYSE SYSTEME CARDIOVASCULAIRE",
    "ANALYSE METABOLISME ET NUTRITION",
    "ANALYSE SOMMEIL ET RECUPERATION",
    "ANALYSE DIGESTION ET MICROBIOTE",
    "ANALYSE AXES HORMONAUX",
    "PROTOCOLE MATIN ANTI-CORTISOL",
    "PROTOCOLE SOIR VERROUILLAGE SOMMEIL",
    "PROTOCOLE DIGESTION 14 JOURS",
    "PROTOCOLE BUREAU ANTI-SEDENTARITE",
    "PROTOCOLE ENTRAINEMENT PERSONNALISE",
    "PLAN D'ACTION 30/60/90 JOURS",
    "KPI ET TABLEAU DE BORD",
    "STACK DE SUPPLEMENTS PERSONNALISE",
    "SYNTHESE CLINIQUE ET PROCHAINE ETAPE"
  ];

  let currentPos = 0;
  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i].trim();
    const lineFull = sectionLines[i];
    
    if (VALID_TITLES.includes(line.toUpperCase())) {
      const title = line;
      const startIndex = currentPos + lineFull.length + 1;
      
      if (sectionMatches.length > 0) {
        sectionMatches[sectionMatches.length - 1].endIndex = currentPos;
      }
      
      sectionMatches.push({
        title,
        startIndex,
        endIndex: txtContent.length
      });
    }
    currentPos += lineFull.length + 1;
  }
  
  let resumeExecutif: string | undefined;
  
  for (let i = 0; i < sectionMatches.length; i++) {
    const { title, startIndex, endIndex } = sectionMatches[i];
    const content = txtContent.substring(startIndex, endIndex).trim();
    
    const normalizedTitle = normalizeTitle(title);
    const category = SECTION_CATEGORIES[normalizedTitle] || 'analysis';
    
    const sectionId = normalizedTitle
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    
    if (normalizedTitle === 'resume executif' || normalizedTitle === 'executive summary') {
      resumeExecutif = content;
    }
    
    // Extraire le score de la section si présent
    // Cherche des patterns comme "Score : 65/100" ou "Score: 65%" ou juste "65/100"
    const scoreMatch = content.match(/(?:Score\s*:?\s*)?(\d+)(?:\/100|%)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 65; // Score par défaut si non trouvé
    
    sections.push({
      id: sectionId,
      title: title,
      score: score,
      content: content,
      order: i,
      category
    });
  }
  
  // Calculer le score global comme moyenne des scores des sections
  const totalScore = sections.reduce((sum, s) => sum + s.score, 0);
  const global = sections.length > 0 ? Math.round(totalScore / sections.length) : 65;
  
  return {
    clientName,
    generatedAt,
    global,
    sections,
    resumeExecutif,
    ctaDebut: extractCTA(txtContent, 'debut'),
    ctaFin: extractCTA(txtContent, 'fin'),
    metadata: {
      totalSections: sections.length,
      totalCharacters: txtContent.length
    }
  };
}

export function getSectionsByCategory(
  dashboard: AuditDashboardFormat,
  category: DashboardSection['category']
): DashboardSection[] {
  return dashboard.sections.filter(s => s.category === category);
}

export function getSectionById(
  dashboard: AuditDashboardFormat,
  sectionId: string
): DashboardSection | undefined {
  return dashboard.sections.find(s => s.id === sectionId);
}

export function formatSectionToHTML(section: DashboardSection): string {
  const lines = section.content.split('\n');
  let html = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) {
      html += '<br/>';
      continue;
    }
    
    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ')) {
      html += `<li>${trimmedLine.substring(2)}</li>`;
    } else if (trimmedLine.match(/^\d+\.\s/)) {
      html += `<li>${trimmedLine.replace(/^\d+\.\s/, '')}</li>`;
    } else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
      html += `<strong>${trimmedLine.slice(2, -2)}</strong><br/>`;
    } else if (trimmedLine.match(/^[A-Z][A-Z\s]+:$/)) {
      html += `<h4 class="font-semibold mt-4 mb-2">${trimmedLine}</h4>`;
    } else {
      html += `<p>${trimmedLine}</p>`;
    }
  }
  
  return html;
}

export function dashboardToJSON(dashboard: AuditDashboardFormat): string {
  return JSON.stringify(dashboard, null, 2);
}
