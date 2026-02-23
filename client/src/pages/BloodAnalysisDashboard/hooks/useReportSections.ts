import { useMemo } from 'react';

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
    .replace(/^-+|-+$/g, '');
};

export const useReportSections = (aiReport: string | undefined) => {
  // Parse AI report into sections based on level-2 headings.
  const reportSections = useMemo(() => {
    if (!aiReport) return [];

    const sections: Array<{ id: string; title: string; content: string }> = [];
    const lines = aiReport.split('\n');
    let currentSection: { id: string; title: string; content: string } | null = null;

    for (const line of lines) {
      const headingMatch = line.match(/^##\s+(.+)$/);
      if (headingMatch) {
        if (currentSection) {
          sections.push(currentSection);
        }
        const title = headingMatch[1].trim();
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
    if (!aiReport) return [];
    const ids = new Set<string>();
    const lines = aiReport.split('\n');
    for (const line of lines) {
      const headingMatch = line.match(/^###\s+(.+)$/i);
      if (!headingMatch) continue;
      const id = normalizeSectionId(headingMatch[1]);
      if (/^axe-\d+/.test(id)) {
        ids.add(id);
      }
    }
    return Array.from(ids);
  }, [aiReport]);

  return {
    reportSections,
    axeSections,
    normalizeSectionId,
  };
};
