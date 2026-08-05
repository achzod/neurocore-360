import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  aiMeta?: {
    status?: string | null;
    model?: string | null;
    generatedAt?: string | null;
    validationMissing?: string[] | null;
    fallbackAt?: string | null;
    fallbackReason?: string | null;
  };
  currentTheme: Theme;
  normalizeSectionId: (text: string) => string;
}

export function ReportSectionTab({
  sectionIds,
  reportSections,
  aiReport,
  aiMeta,
  currentTheme,
  normalizeSectionId,
}: ReportSectionTabProps) {
  const sanitizedAiReport = aiReport
    ? aiReport.replace(/^##\s+Annexes\s*\(ultra long\)\s*$/gim, "## Annexes (references et vigilance)")
    : aiReport;
  const aiStatus = String(aiMeta?.status || "").toLowerCase();
  const isFinalizedReport = aiStatus === "generated" || aiStatus === "completed";
  const validationHints = Array.isArray(aiMeta?.validationMissing)
    ? aiMeta?.validationMissing.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const generatedAtText = aiMeta?.generatedAt
    ? new Date(aiMeta.generatedAt).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const statusBadge =
    isFinalizedReport
      ? { label: "Rapport premium", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.35)", text: "#059669" }
      : aiStatus === "fallback"
      ? { label: "Mode déterministe", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.35)", text: "#B45309" }
      : aiStatus === "processing"
      ? { label: "Génération en cours", bg: "rgba(59, 130, 246, 0.12)", border: "rgba(59, 130, 246, 0.35)", text: "#2563EB" }
      : null;

  const markdownComponents = {
    h2: ({ children }: { children?: ReactNode }) => (
      <h2
        className="mt-7 mb-3 text-xl sm:text-2xl font-semibold tracking-tight"
        style={{ color: currentTheme.colors.text }}
      >
        {children}
      </h2>
    ),
    h3: ({ children }: { children?: ReactNode }) => (
      <h3
        className="mt-6 mb-2 text-lg sm:text-xl font-semibold"
        style={{ color: currentTheme.colors.text }}
      >
        {children}
      </h3>
    ),
    h4: ({ children }: { children?: ReactNode }) => (
      <h4 className="mt-4 mb-1 text-base font-semibold" style={{ color: currentTheme.colors.text }}>
        {children}
      </h4>
    ),
    p: ({ children }: { children?: ReactNode }) => (
      <p className="mt-3 leading-7 text-sm sm:text-[15px]" style={{ color: currentTheme.colors.text }}>
        {children}
      </p>
    ),
    ul: ({ children }: { children?: ReactNode }) => (
      <ul className="mt-3 space-y-1 pl-5 list-disc" style={{ color: currentTheme.colors.text }}>
        {children}
      </ul>
    ),
    ol: ({ children }: { children?: ReactNode }) => (
      <ol className="mt-3 space-y-1 pl-5 list-decimal" style={{ color: currentTheme.colors.text }}>
        {children}
      </ol>
    ),
    li: ({ children }: { children?: ReactNode }) => (
      <li className="leading-7 text-sm sm:text-[15px]">
        {children}
      </li>
    ),
    strong: ({ children }: { children?: ReactNode }) => (
      <strong style={{ color: currentTheme.colors.text, fontWeight: 700 }}>{children}</strong>
    ),
    blockquote: ({ children }: { children?: ReactNode }) => (
      <blockquote
        className="mt-4 border-l-4 pl-4 py-1"
        style={{ borderColor: currentTheme.colors.primary, color: currentTheme.colors.text }}
      >
        {children}
      </blockquote>
    ),
    table: ({ children }: { children?: ReactNode }) => (
      <div className="mt-4 mb-2 overflow-x-auto rounded border" style={{ borderColor: currentTheme.colors.border }}>
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          {children}
        </table>
      </div>
    ),
    th: ({ children }: { children?: ReactNode }) => (
      <th
        className="px-3 py-2 text-left text-xs uppercase tracking-[0.08em]"
        style={{
          borderBottom: `1px solid ${currentTheme.colors.border}`,
          backgroundColor: currentTheme.colors.background,
          color: currentTheme.colors.text,
        }}
      >
        {children}
      </th>
    ),
    td: ({ children }: { children?: ReactNode }) => (
      <td
        className="px-3 py-2 align-top"
        style={{ borderBottom: `1px solid ${currentTheme.colors.border}`, color: currentTheme.colors.text }}
      >
        {children}
      </td>
    ),
    code: ({ children }: { children?: ReactNode }) => (
      <code
        className="px-1.5 py-0.5 rounded text-[0.9em]"
        style={{ backgroundColor: currentTheme.colors.background, color: currentTheme.colors.text }}
      >
        {children}
      </code>
    ),
    hr: () => <hr className="my-5" style={{ borderColor: currentTheme.colors.border }} />,
  };

  const proseStyle = {
    backgroundColor: currentTheme.colors.surface,
    borderColor: currentTheme.colors.border,
    color: currentTheme.colors.text,
  } as CSSProperties;

  if (!sanitizedAiReport) {
    const isProcessing = aiStatus === "processing";
    return (
      <div
        className="rounded border p-6"
        style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
      >
        <div className="flex flex-col items-center justify-center py-12">
          {isProcessing ? (
            <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: currentTheme.colors.primary }} />
          ) : (
            <RefreshCw className="w-10 h-10 mb-4" style={{ color: currentTheme.colors.primary }} />
          )}
          <h2 className="text-xl font-semibold mb-2" style={{ color: currentTheme.colors.text }}>
            {isProcessing ? "Génération premium en cours" : "Rafraîchissement du rapport"}
          </h2>
          <p className="text-sm text-center max-w-md" style={{ color: currentTheme.colors.textMuted }}>
            {isProcessing
              ? "Le rapport complet est en construction. La page se mettra à jour automatiquement dès que le contenu final sera disponible."
              : "Le contenu n'est pas encore disponible. Le moteur relance la génération en arrière-plan."}
          </p>
          {!!aiMeta?.fallbackReason && (
            <p className="mt-3 text-xs text-center" style={{ color: currentTheme.colors.textMuted }}>
              Diagnostic: {aiMeta.fallbackReason}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Normalize search IDs for better matching
  const normalizedSearchIds = sectionIds.map(normalizeSectionId);

  // Build normalized ids once (avoid re-normalizing in nested loops)
  const normalizedById = new Map<string, string>();
  const normalizedByTitle = new Map<string, string>();
  for (const section of reportSections) {
    normalizedById.set(section.id, normalizeSectionId(section.id));
    normalizedByTitle.set(section.id, normalizeSectionId(section.title));
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
      const normalizedTitle = normalizedByTitle.get(section.id) || "";
      const normalizedCandidates = [normalizedSectionId, normalizedTitle].filter(Boolean);

      // Exact normalized match: strongest signal
      for (const candidate of normalizedCandidates) {
        if (candidate === searchId) {
          const score = 1000 - candidate.length; // tie-break: shorter id wins
          if (score > bestScore) {
            bestScore = score;
            bestId = section.id;
          }
          continue;
        }

        // Fuzzy match: substring containment, but only for meaningful searchIds
        if (searchId.length >= 5 && (candidate.includes(searchId) || searchId.includes(candidate))) {
          // Prefer close-length matches + prefix matches
          const lenDelta = Math.abs(candidate.length - searchId.length);
          const prefixBonus =
            candidate.startsWith(searchId) || searchId.startsWith(candidate) ? 25 : 0;
          const score = 500 - lenDelta + prefixBonus;
          if (score > bestScore) {
            bestScore = score;
            bestId = section.id;
          }
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
    // Last-resort fallback: AI report exists but headings parsing didn't match this tab.
    // Show full report content instead of empty premium tab.
    if (reportSections.length === 0 && sanitizedAiReport.trim().length > 0) {
      return (
        <div
          className="rounded border p-4 sm:p-6 max-w-none"
          style={proseStyle}
        >
          <div className="overflow-x-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {sanitizedAiReport}
            </ReactMarkdown>
          </div>
        </div>
      );
    }

    return (
      <div
        className="rounded border p-6"
        style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5" style={{ color: currentTheme.colors.primary }} />
          <p style={{ color: currentTheme.colors.textMuted }}>
            Aucune section correspondante trouvée pour cet onglet. Le contenu brut existe, mais sa structure ne
            correspond pas encore à la découpe attendue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded border p-4 sm:p-6 max-w-none"
      style={proseStyle}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {statusBadge && (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] sm:text-xs"
            style={{
              backgroundColor: statusBadge.bg,
              border: `1px solid ${statusBadge.border}`,
              color: statusBadge.text,
            }}
          >
            {statusBadge.label}
          </span>
        )}
        {sectionsToShow.map((section) => (
          <span
            key={`chip-${section.id}`}
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] sm:text-xs"
            style={{
              backgroundColor: currentTheme.colors.background,
              border: `1px solid ${currentTheme.colors.border}`,
              color: currentTheme.colors.textMuted,
            }}
          >
            {section.title}
          </span>
        ))}
        {(isFinalizedReport || aiStatus === "fallback") && generatedAtText && (
          <span className="text-[11px] sm:text-xs ml-auto" style={{ color: currentTheme.colors.textMuted }}>
            Mis à jour: {generatedAtText}
          </span>
        )}
      </div>
      {aiStatus === "fallback" && validationHints.length > 0 && (
        <div className="mb-4 rounded border px-3 py-2" style={{ borderColor: currentTheme.colors.border, backgroundColor: currentTheme.colors.background }}>
          <p className="text-[11px] sm:text-xs" style={{ color: currentTheme.colors.textMuted }}>
            Vérifications automatiques restantes: {validationHints.slice(0, 4).join(" · ")}
          </p>
        </div>
      )}

      {sectionsToShow.map((section, idx) => (
        <div key={section.id} className="overflow-x-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {section.content}
          </ReactMarkdown>
          {idx < sectionsToShow.length - 1 && <hr className="my-4 sm:my-6" style={{ borderColor: currentTheme.colors.border }} />}
        </div>
      ))}
    </div>
  );
}
