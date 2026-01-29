import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";

export type StructuredSection = {
  title: string;
  content: string;
};

interface StructuredContentProps {
  sections: StructuredSection[];
}

export default function StructuredContent({ sections }: StructuredContentProps) {
  const { theme } = useBloodTheme();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  if (!sections.length) {
    return (
      <div className="rounded-xl border p-6 text-sm" style={{ borderColor: theme.borderDefault, color: theme.textSecondary }}>
        Aucune analyse detaillee disponible.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, index) => {
        const isLong = section.content.length > 800;
        const isExpanded = expanded[index] || !isLong;

        return (
          <div
            key={`${section.title}-${index}`}
            className="rounded-2xl border p-6"
            style={{ borderColor: theme.borderDefault, backgroundColor: theme.surface }}
          >
            <div className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
              {section.title}
            </div>
            <div className="mt-3 text-sm" style={{ color: theme.textSecondary }}>
              <div className={isExpanded ? "" : "max-h-36 overflow-hidden"}>
                <ReactMarkdown>{section.content}</ReactMarkdown>
              </div>
              {isLong && (
                <button
                  className="mt-3 text-xs font-semibold"
                  style={{ color: theme.primaryBlue }}
                  onClick={() => setExpanded((prev) => ({ ...prev, [index]: !isExpanded }))}
                >
                  {isExpanded ? "Voir moins" : "Voir plus"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
