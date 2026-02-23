import { useMemo } from 'react';

// French stop words stripped during normalization so "nutrition-et-entrainement"
// matches "nutrition-entrainement" regardless of AI title wording.
const STOP_WORDS = new Set(['et', 'de', 'des', 'du', 'le', 'la', 'les', 'un', 'une', 'en', 'par', 'au', 'aux', 'd', 'l']);

const H2_HEADING_REGEX = /^ {0,3}##(?!#)\s*(.+?)\s*$/gim;
const H3_HEADING_REGEX = /^ {0,3}###(?!#)\s*(.+?)\s*$/gim;

// Function to normalize section IDs for flexible matching
const normalizeSectionId = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .filter(w => !STOP_WORDS.has(w))
    .join('-');
};

export const useReportSections = (aiReport: string | undefined) => {
  const sanitizedReport = useMemo(() => {
    if (!aiReport) return undefined;
    return aiReport
      .replace(/\r\n/g, '\n')
      .replace(/^##\s+Annexes\s*\(ultra long\)\s*$/gim, "## Annexes (references et vigilance)");
  }, [aiReport]);

  // Parse AI report into sections based on robust H2 detection.
  // Handles "##Title", extra indentation and small markdown variations.
  const reportSections = useMemo(() => {
    if (!sanitizedReport) return [];
    const text = sanitizedReport;
    const headingMatches = Array.from(text.matchAll(H2_HEADING_REGEX));
    if (headingMatches.length === 0) {
      return [];
    }

    return headingMatches.map((match, index) => {
      const start = match.index ?? 0;
      const nextStart = headingMatches[index + 1]?.index ?? text.length;
      const rawTitle = String(match[1] || '').trim().replace(/\*\*/g, '');
      const title = rawTitle || `Section ${index + 1}`;
      const content = text.slice(start, nextStart).trim() + '\n';
      return {
        id: normalizeSectionId(title),
        title,
        content,
      };
    });
  }, [sanitizedReport]);

  // Dynamically extract axe sections from all H3 headings.
  const axeSections = useMemo(() => {
    if (!sanitizedReport) return [];
    const text = sanitizedReport;
    const matches = Array.from(text.matchAll(H3_HEADING_REGEX));
    const byAxis = new Map<number, string>();

    for (const match of matches) {
      const title = String(match[1] || '').trim();
      const id = normalizeSectionId(title);
      const axisNumber = id.match(/^axe-(\d{1,2})\b/);
      if (!axisNumber) continue;
      const n = Number(axisNumber[1]);
      if (!Number.isFinite(n) || n < 1 || n > 20) continue;
      if (!byAxis.has(n)) byAxis.set(n, id);
    }

    return Array.from(byAxis.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, id]) => id);
  }, [sanitizedReport]);

  return {
    reportSections,
    axeSections,
    normalizeSectionId,
  };
};
