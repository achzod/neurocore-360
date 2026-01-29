import { useMemo } from "react";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import { PANEL_LABELS } from "@/components/blood/overview/utils";
import type { Citation, PanelKey } from "@/types/blood";

interface CitationsByPanelProps {
  sources: Citation[];
}

export default function CitationsByPanel({ sources }: CitationsByPanelProps) {
  const { theme } = useBloodTheme();

  const grouped = useMemo(() => {
    const map = new Map<PanelKey, Citation[]>();
    sources.forEach((source) => {
      const current = map.get(source.panel) ?? [];
      current.push(source);
      map.set(source.panel, current);
    });
    return map;
  }, [sources]);

  if (!sources.length) {
    return (
      <div className="rounded-xl border p-6 text-sm" style={{ borderColor: theme.borderDefault, color: theme.textSecondary }}>
        Aucune source disponible.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([panel, items]) => (
        <div key={panel} className="rounded-2xl border p-5" style={{ borderColor: theme.borderDefault, backgroundColor: theme.surface }}>
          <div className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
            {PANEL_LABELS[panel]}
          </div>
          <ul className="mt-3 space-y-2 text-sm" style={{ color: theme.textSecondary }}>
            {items.map((item, idx) => (
              <li key={`${panel}-${idx}`}>
                {item.url ? (
                  <a href={item.url} target="_blank" rel="noreferrer" style={{ color: theme.primaryBlue }}>
                    {item.text}
                  </a>
                ) : (
                  item.text
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
