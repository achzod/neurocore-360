export type ParsedSection = {
  title: string;
  content: string;
};

export type ParsedAnalysis = {
  systems: ParsedSection[];
  patterns: ParsedSection[];
  correlations: ParsedSection[];
};

const normalizeHeading = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function parseAIAnalysis(markdown: string): ParsedAnalysis {
  const result: ParsedAnalysis = { systems: [], patterns: [], correlations: [] };
  if (!markdown || !markdown.trim()) return result;

  const matches = Array.from(
    markdown.matchAll(/^##\s+(.+)\n([\s\S]*?)(?=^##\s+|\s*$)/gm)
  );

  if (!matches.length) {
    result.systems.push({ title: "Synthese", content: markdown.trim() });
    return result;
  }

  matches.forEach((match) => {
    const title = match[1]?.trim() ?? "";
    const content = match[2]?.trim() ?? "";
    const normalized = normalizeHeading(title);

    if (normalized.includes("systeme") || normalized.includes("system")) {
      result.systems.push({ title, content });
    } else if (normalized.includes("pattern") || normalized.includes("motif")) {
      result.patterns.push({ title, content });
    } else if (normalized.includes("correlation")) {
      result.correlations.push({ title, content });
    } else {
      result.systems.push({ title, content });
    }
  });

  return result;
}
