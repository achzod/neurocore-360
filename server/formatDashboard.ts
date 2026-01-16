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
  'analyse energie et recuperation': 'analysis',
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
  'stack supplements personnalise': 'supplements',
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
  'stack de supplements personnalise': 'supplements',
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

const SOURCE_NAME_REGEX = new RegExp(
  "\\b(huberman|andrew\\s+huberman|huberman\\s+lab|peter\\s+attia|attia|applied\\s+metabolics|stronger\\s+by\\s+science|sbs|examine(?:\\.com)?|renaissance\\s+periodization|mpmd|more\\s+plates|moreplates|newsletter|achzod|matthew\\s+walker|sapolsky|layne\\s+norton|ben\\s+bikman|rhonda\\s+patrick|robert\\s+lustig|andy\\s+galpin|brad\\s+schoenfeld|mike\\s+israetel|justin\\s+sonnenburg|chris\\s+kresser)\\b",
  "gi"
);

function cleanSectionContent(content: string): string {
  return content
    .replace(/^\s*(Sources?|References?|Références?)\s*:.*$/gmi, '')
    .replace(/Sources?\s*:.*$/gmi, '')
    .replace(/^.*\b(Sources?|References?|Références?)\b\s*[:\-–—].*$/gmi, '')
    .replace(/^\s*score\s*:?\s*\d{1,3}\s*\/\s*100\s*$/gmi, '')
    .replace(/score\s*:?\s*\d{1,3}\s*\/\s*100/gi, '')
    .replace(/^\s*score\s+global\s*:?.*$/gmi, '')
    .replace(/score\s+global\s*:?\s*\d{1,3}\s*\/\s*100/gi, '')
    .replace(/\bscore\s+global\b.*$/gmi, '')
    .replace(/^\s*={3,}.*$/gm, '')
    .replace(/={3,}/g, '')
    .replace(/^\s*-{3,}.*$/gm, '')
    .replace(/-{3,}/g, '')
    .replace(/^.*\brapport\s+genere\b.*$/gmi, '')
    .replace(/^\s*note\s*\(technique\).*$/gmi, '')
    .replace(SOURCE_NAME_REGEX, '')
    .trim();
}

function stripCtaFromContent(content: string): string {
  const markers = [
    "COACHING APEXLABS",
    "RAPPEL COACHING",
    "TU AS LES CLES - MAINTENANT, PASSONS A L'EXECUTION",
    "PROCHAINES ETAPES - CE QUE TU PEUX FAIRE MAINTENANT",
    "PROCHAINES ETAPES",
    "PRET A TRANSFORMER CES INSIGHTS"
  ];
  const markerRegex = [
    /tu\s+as\s+les\s+cles/i,
    /coaching/i,
    /code\s+promo/i,
    /bonus\s+exclusif/i,
    /^email\s*:/i,
    /^site\s*:/i,
    /^\s*rapports?\s+genere/i
  ];
  const lines = content.split("\n");
  const cutIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (markers.some((marker) => trimmed.toLowerCase().includes(marker.toLowerCase()))) {
      return true;
    }
    return markerRegex.some((re) => re.test(trimmed));
  });
  if (cutIndex === -1) return content;
  return lines.slice(0, cutIndex).join("\n").trim();
}

function findLastLineMarker(text: string, markers: string[]): { index: number; marker: string | null } {
  let lastIndex = -1;
  let lastMarker: string | null = null;
  for (const marker of markers) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`^\\s*${escaped}\\s*$`, 'gmi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match.index >= lastIndex) {
        lastIndex = match.index;
        lastMarker = marker;
      }
    }
  }
  return { index: lastIndex, marker: lastMarker };
}

function extractClientName(txtContent: string): string {
  const match = txtContent.match(/AUDIT COMPLET (?:NEUROCORE 360|APEXLABS) - (.+?)(?:\s*={3,}|\s*[\r\n])/i);
  if (match) {
    return match[1].trim();
  }
  return 'Profil';
}

function extractGeneratedAt(txtContent: string): string {
  const match = txtContent.match(/G[eé]n[eé]r[eé] le (.+?)[\r\n]/i);
  if (match) {
    return match[1].trim();
  }
  return new Date().toLocaleString('fr-FR');
}

function extractGlobalScoreFromTxt(txtContent: string): number | null {
  const re = /SCORE\s+GLOBAL\s*:?\s*(\d{1,3})\s*\/\s*100/gi;
  let m: RegExpExecArray | null = null;
  let last: number | null = null;
  while ((m = re.exec(txtContent)) !== null) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) last = Math.max(0, Math.min(100, Math.round(n)));
  }
  return last;
}

function extractSectionScoreFromContent(content: string): number | null {
  const re = /Score\s*:?\s*(\d{1,3})\s*\/\s*100/gi;
  let m: RegExpExecArray | null = null;
  let last: number | null = null;
  while ((m = re.exec(content)) !== null) {
    const n = Number(m[1]);
    if (Number.isFinite(n)) last = Math.max(0, Math.min(100, Math.round(n)));
  }
  return last;
}

function extractCTA(txtContent: string, type: 'debut' | 'fin'): string | undefined {
  if (type === 'debut') {
    // Chercher "RAPPEL IMPORTANT" ou "INFOS IMPORTANTES"
    const markers = ['RAPPEL COACHING', 'RAPPEL IMPORTANT', 'INFOS IMPORTANTES'];
    const start = findLastLineMarker(txtContent, markers);
    if (start.index !== -1) {
      // Trouver la fin du CTA (avant la première section principale ou avant "AUDIT COMPLET")
      const endMarkers = ['AUDIT COMPLET APEXLABS', 'AUDIT COMPLET NEUROCORE 360', 'EXECUTIVE SUMMARY', '---'];
      let endIdx = txtContent.length;
      for (const marker of endMarkers) {
        const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^\\s*${escaped}\\s*$`, 'gmi');
        let match: RegExpExecArray | null;
        while ((match = regex.exec(txtContent)) !== null) {
          if (match.index > start.index && match.index < endIdx) {
            endIdx = match.index;
          }
        }
      }
      return txtContent.substring(start.index, endIdx).trim();
    }
  } else {
    // Chercher "PRET A TRANSFORMER" ou "PROCHAINES ETAPES"
    const markers = [
      'COACHING APEXLABS',
      'PRET A TRANSFORMER CES INSIGHTS',
      'PROCHAINES ETAPES - CE QUE TU PEUX FAIRE MAINTENANT'
    ];
    const start = findLastLineMarker(txtContent, markers);
    if (start.index !== -1) {
      return txtContent.substring(start.index).trim();
    }
  }
  return undefined;
}

export function formatTxtToDashboard(txtContent: string): AuditDashboardFormat {
  const sections: DashboardSection[] = [];
  const clientName = extractClientName(txtContent);
  const generatedAt = extractGeneratedAt(txtContent);
  
  const ctaDebut = extractCTA(txtContent, 'debut');
  const ctaFin = extractCTA(txtContent, 'fin');

  // Nouveau délimiteur Elite V4 : Titres en MAJUSCULES seuls sur une ligne
  const sectionLines = txtContent.split('\n');
  const sectionMatches: { title: string; startIndex: number; endIndex: number }[] = [];
  
  // Titres attendus (tirés de geminiPremiumEngine SECTIONS)
  // Mise à jour pour correspondre aux titres générés par Gemini 2.5
  const VALID_TITLES = [
    "EXECUTIVE SUMMARY",
    "ANALYSE VISUELLE ET POSTURALE COMPLETE",
    "ANALYSE BIOMECANIQUE ET SANGLE PROFONDE",
    "ANALYSE ENTRAINEMENT ET PERIODISATION",
    "ANALYSE SYSTEME CARDIOVASCULAIRE",
    "ANALYSE ENERGIE ET RECUPERATION",
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
    "STACK SUPPLEMENTS PERSONNALISE",
    "STACK SUPPLEMENTS OPTIMISE",
    "SYNTHESE CLINIQUE ET PROCHAINE ETAPE",
    "SYNTHESE ET PROCHAINES ETAPES",
    "PLAN SEMAINE PAR SEMAINE 30-60-90",
    "ANALYSE D'EXPERT", // Parfois généré
  ];

  const normalizedTitles = new Map(
    VALID_TITLES.map(title => [normalizeTitle(title), title])
  );

  let currentPos = 0;
  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i].trim();
    const lineFull = sectionLines[i];
    
    // IGNORER les lignes qui ne sont clairement PAS des titres principaux
    if (line.startsWith('#') || line.startsWith('Absolument') || line.startsWith('===') || line.startsWith('---')) {
      continue;
    }
    
    // Ne garder QUE les titres connus de la liste VALID_TITLES (normalisés)
    const matchedTitle = normalizedTitles.get(normalizeTitle(line));
    
    if (matchedTitle) {
      // Vérifier qu'on n'a pas déjà cette section (éviter les doublons)
      const alreadyExists = sectionMatches.some(s => 
        s.title.toUpperCase().replace(/[^A-Z]/g, '') === matchedTitle.toUpperCase().replace(/[^A-Z]/g, '')
      );
      
      if (!alreadyExists) {
        const title = line;
        const startIndex = txtContent.indexOf(lineFull, currentPos) + lineFull.length;
        
        if (sectionMatches.length > 0) {
          sectionMatches[sectionMatches.length - 1].endIndex = txtContent.indexOf(lineFull, currentPos);
        }
        
        sectionMatches.push({
          title,
          startIndex,
          endIndex: txtContent.length
        });
        
        currentPos = startIndex;
        continue;
      }
    }
    
    const foundIndex = txtContent.indexOf(lineFull, currentPos);
    if (foundIndex !== -1) {
       currentPos = foundIndex + lineFull.length;
    }
  }
  
  let resumeExecutif: string | undefined;
  
  for (let i = 0; i < sectionMatches.length; i++) {
    const { title, startIndex, endIndex } = sectionMatches[i];
    let rawContent = txtContent.substring(startIndex, endIndex).trim();
    if (ctaFin) {
      rawContent = rawContent.replace(ctaFin, '').trim();
    }
    rawContent = stripCtaFromContent(rawContent);
    const extractedScore = extractSectionScoreFromContent(rawContent);
    const content = cleanSectionContent(rawContent);
    
    const normalizedTitle = normalizeTitle(title);
    const category =
      SECTION_CATEGORIES[normalizedTitle] ||
      (normalizedTitle.includes('supplement') ? 'supplements' : 'analysis');
    
    const sectionId = normalizedTitle
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
    
    if (normalizedTitle === 'resume executif' || normalizedTitle === 'executive summary') {
      resumeExecutif = content;
    }
    
    // Score: uniquement si explicitement formaté "Score : NN/100".
    // Pour éviter l'incohérence perçue: pas de score affiché sur Executive Summary / protocoles / supplements.
    const extracted = extractedScore ?? extractSectionScoreFromContent(content);
    const score = category === 'analysis' ? (extracted ?? 0) : 0;
    const finalScore = category === 'executive' ? 0 : score;
    
    sections.push({
      id: sectionId,
      title: title,
      score: finalScore,
      content: content,
      order: i,
      category
    });
  }
  
  // Score global: privilégier "SCORE GLOBAL : NN/100" si présent.
  // Sinon: moyenne des sections d'analyse scorées (pas les protocoles).
  const extractedGlobal = extractGlobalScoreFromTxt(txtContent);
  const analysisScores = sections
    .filter(s => s.category === 'analysis' && s.score > 0)
    .map(s => s.score);
  const avgAnalysis = analysisScores.length > 0
    ? Math.round(analysisScores.reduce((a, b) => a + b, 0) / analysisScores.length)
    : 65;
  const global = extractedGlobal ?? avgAnalysis;
  
  return {
    clientName,
    generatedAt,
    global,
    sections,
    resumeExecutif,
    ctaDebut,
    ctaFin,
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
