import React from "react";

export type AISection = { title: string; content: string };

export type AISections = {
  synthesis?: AISection;
  quality?: AISection;
  alerts?: AISection;
  potential?: AISection;
  systems?: AISection;
  interconnections?: AISection;
  deepDive?: AISection;
  plan90?: AISection;
  nutrition?: AISection;
  supplements?: AISection;
  annexes?: AISection;
  sources?: AISection;
  [key: string]: AISection | undefined;
};

const parsedSectionsCache = new Map<string, AISections>();
const normalizeTextCache = new Map<string, string>();
const highlightCache = new Map<string, React.ReactNode[]>();

export const EXPERT_REGEX = /(Derek(?: de MPMD)?|MPMD|Huberman|Attia|Masterjohn|Examine(?:\.com)?)/gi;

export const normalizeText = (value: string) => {
  if (normalizeTextCache.has(value)) {
    return normalizeTextCache.get(value)!;
  }
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  normalizeTextCache.set(value, normalized);
  return normalized;
};

export const parseAISections = (markdown: string): AISections => {
  if (parsedSectionsCache.has(markdown)) {
    return parsedSectionsCache.get(markdown)!;
  }

  const sections: AISection[] = [];
  // Two-pass parser: split on ## headers, then capture content between them
  const headerRegex = /^##\s+(.+)$/gm;
  const headerPositions: Array<{ title: string; start: number; end: number }> = [];
  let match;
  while ((match = headerRegex.exec(markdown)) !== null) {
    headerPositions.push({
      title: match[1].trim(),
      start: match.index + match[0].length,
      end: markdown.length,
    });
  }
  // Set end of each section to start of next header
  for (let i = 0; i < headerPositions.length - 1; i++) {
    headerPositions[i].end = markdown.lastIndexOf("\n", headerPositions[i + 1].start - headerPositions[i + 1].title.length - 3);
  }
  for (const pos of headerPositions) {
    const content = markdown.slice(pos.start, pos.end).trim();
    if (pos.title) sections.push({ title: pos.title, content });
  }

  const getBy = (...keywords: string[]) =>
    sections.find((section) =>
      keywords.some((keyword) => normalizeText(section.title).includes(keyword))
    );

  const result: AISections = {
    synthesis: getBy("synthese"),
    quality: getBy("qualite des donnees", "qualite"),
    alerts: getBy("tableau de bord", "alertes", "vigilance"),
    potential: getBy("potentiel recomposition", "potentiel"),
    systems: getBy("lecture compartimentee", "analyse par axe", "analyse par axes", "systeme", "systemes"),
    interconnections: getBy("interconnexions", "interconnexion", "correlations", "correlation"),
    deepDive: getBy("deep dive"),
    plan90: getBy("plan d'action 90 jours", "plan 90"),
    nutrition: getBy("nutrition"),
    supplements: getBy("supplements"),
    annexes: getBy("annexes"),
    sources: getBy("sources (bibliotheque)", "sources scientifiques", "sources"),
  };

  parsedSectionsCache.set(markdown, result);
  return result;
};

export const highlightText = (text: string) => {
  if (highlightCache.has(text)) {
    return highlightCache.get(text)!;
  }
  const parts = text.split(EXPERT_REGEX);
  const result = parts.map((part, idx) => {
    if (part.match(EXPERT_REGEX)) {
      return (
        <span key={`hl-${idx}`} className="font-semibold text-cyan-300">
          {part}
        </span>
      );
    }
    return part;
  });
  highlightCache.set(text, result);
  return result;
};

export const renderWithHighlights = (children: React.ReactNode) => {
  if (typeof children === "string") {
    return highlightText(children);
  }
  if (Array.isArray(children)) {
    return children.map((child, idx) => {
      if (typeof child === "string") {
        return <span key={`hl-${idx}`}>{highlightText(child)}</span>;
      }
      return child;
    });
  }
  return children;
};
