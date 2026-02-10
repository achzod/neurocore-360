import { Loader2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Theme } from "@/components/ultrahuman/types";

type ReportSection = {
  id: string;
  title: string;
  content: string;
};

interface ReportSectionTabProps {
  sectionIds: string[];
  reportSections: ReportSection[];
  aiReport?: string;
  currentTheme: Theme;
  normalizeSectionId: (text: string) => string;
}

export function ReportSectionTab({
  sectionIds,
  reportSections,
  aiReport,
  currentTheme,
  normalizeSectionId,
}: ReportSectionTabProps) {
  if (!aiReport) {
    return (
      <div
        className="rounded border p-6"
        style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: currentTheme.colors.primary }} />
          <h2 className="text-xl font-semibold mb-2">Génération du rapport AI en cours...</h2>
          <p className="text-sm text-center max-w-md" style={{ color: currentTheme.colors.textMuted }}>
            L'analyse approfondie de tes biomarqueurs est en cours de génération.
            Le rapport complet sera disponible sous peu.
          </p>
        </div>
      </div>
    );
  }

  // Normalize search IDs for better matching
  const normalizedSearchIds = sectionIds.map(normalizeSectionId);

  // Build normalized ids once (avoid re-normalizing in nested loops)
  const normalizedById = new Map<string, string>();
  for (const section of reportSections) {
    normalizedById.set(section.id, normalizeSectionId(section.id));
  }

  // Use Set to prevent duplicate sections
  const matchedSectionIds = new Set<string>();

  // Pick the best matching section for each searchId.
  // This prevents the fuzzy substring matcher from accidentally pulling in unrelated sections.
  const pickBestMatch = (searchId: string): string | null => {
    if (!searchId) return null;

    let bestId: string | null = null;
    let bestScore = -Infinity;

    for (const section of reportSections) {
      const normalizedSectionId = normalizedById.get(section.id) || "";

      // Exact normalized match: strongest signal
      if (normalizedSectionId === searchId) {
        const score = 1000 - normalizedSectionId.length; // tie-break: shorter id wins
        if (score > bestScore) {
          bestScore = score;
          bestId = section.id;
        }
        continue;
      }

      // Fuzzy match: substring containment, but only for meaningful searchIds
      if (searchId.length >= 5 && (normalizedSectionId.includes(searchId) || searchId.includes(normalizedSectionId))) {
        // Prefer close-length matches + prefix matches
        const lenDelta = Math.abs(normalizedSectionId.length - searchId.length);
        const prefixBonus =
          normalizedSectionId.startsWith(searchId) || searchId.startsWith(normalizedSectionId) ? 25 : 0;
        const score = 500 - lenDelta + prefixBonus;
        if (score > bestScore) {
          bestScore = score;
          bestId = section.id;
        }
      }
    }

    return bestId;
  };

  for (const searchId of normalizedSearchIds) {
    const best = pickBestMatch(searchId);
    if (best) matchedSectionIds.add(best);
  }

  const sectionsToShow = reportSections.filter(section => matchedSectionIds.has(section.id));

  if (sectionsToShow.length === 0) {
    return (
      <div
        className="rounded border p-6"
        style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
      >
        <p style={{ color: currentTheme.colors.textMuted }}>
          Cette section sera disponible une fois le rapport complet généré.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded border p-4 sm:p-6 max-w-none ${
        currentTheme.type === 'dark' ? 'prose prose-slate prose-sm sm:prose-base' : 'prose prose-stone prose-sm sm:prose-base'
      }`}
      style={{
        backgroundColor: currentTheme.colors.surface,
        borderColor: currentTheme.colors.border,
        color: currentTheme.colors.text,
        '--tw-prose-headings': currentTheme.colors.text,
        '--tw-prose-body': currentTheme.colors.text,
        '--tw-prose-bold': currentTheme.colors.text,
        '--tw-prose-links': currentTheme.colors.primary,
        '--tw-prose-code': currentTheme.colors.primary,
        '--tw-prose-pre-bg': currentTheme.colors.surface,
        '--tw-prose-pre-code': currentTheme.colors.text,
        '--tw-prose-quotes': currentTheme.colors.textMuted,
        '--tw-prose-quote-borders': currentTheme.colors.border,
        '--tw-prose-hr': currentTheme.colors.border,
        '--tw-prose-th-borders': currentTheme.colors.border,
        '--tw-prose-td-borders': currentTheme.colors.border,
      } as React.CSSProperties}
    >
      {sectionsToShow.map((section, idx) => (
        <div key={section.id} className="overflow-x-auto">
          <ReactMarkdown>{section.content}</ReactMarkdown>
          {idx < sectionsToShow.length - 1 && <hr className="my-4 sm:my-6" style={{ borderColor: currentTheme.colors.border }} />}
        </div>
      ))}
    </div>
  );
}
