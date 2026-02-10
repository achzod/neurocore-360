import { useMemo } from 'react';

// French stop words stripped during normalization so "nutrition-et-entrainement"
// matches "nutrition-entrainement" regardless of AI title wording.
const STOP_WORDS = new Set(['et', 'de', 'des', 'du', 'le', 'la', 'les', 'un', 'une', 'en', 'par', 'au', 'aux', 'd', 'l']);

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
  // Parse AI report into sections based on ## headings
  const reportSections = useMemo(() => {
    if (!aiReport) return [];

    const sections: Array<{ id: string; title: string; content: string }> = [];
    const lines = aiReport.split('\n');
    let currentSection: { id: string; title: string; content: string } | null = null;

    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        const title = line.replace('## ', '').trim();
        const id = normalizeSectionId(title);
        currentSection = { id, title, content: line + '\n' };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }

    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }, [aiReport]);

  // Dynamically extract axe sections
  const axeSections = useMemo(() => {
    return reportSections
      .filter((section) => section.id.startsWith('axe-') && /axe-\d+/.test(section.id))
      .map((section) => section.id);
  }, [reportSections]);

  return {
    reportSections,
    axeSections,
    normalizeSectionId,
  };
};
