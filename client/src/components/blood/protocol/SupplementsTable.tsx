import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useBloodTheme } from "../BloodThemeContext";
import CitationCard from "./CitationCard";
import type { Supplement } from "@/types/blood";

interface SupplementsTableProps {
  supplements: Supplement[];
}

export default function SupplementsTable({ supplements }: SupplementsTableProps) {
  const { theme } = useBloodTheme();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  if (!supplements?.length) {
    return (
      <div className="text-center py-8" style={{ color: theme.textSecondary }}>
        Aucun supplément recommandé
      </div>
    );
  }

  const toggleExpand = (idx: number) => {
    setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-3">
      {supplements.map((supp, idx) => {
        const isExpanded = expanded[idx];
        const hasCitations = supp.citations && supp.citations.length > 0;

        return (
          <div
            key={idx}
            className="rounded-lg border"
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          >
            {/* Header - always visible */}
            <button
              onClick={() => hasCitations && toggleExpand(idx)}
              className="w-full px-4 py-3 text-left flex items-center justify-between hover:opacity-80 transition-opacity"
              disabled={!hasCitations}
            >
              <div className="flex-1">
                <div className="font-semibold" style={{ color: theme.textPrimary }}>
                  {supp.name}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: theme.textSecondary }}>
                  <span>Dosage: {supp.dosage}</span>
                  <span>Timing: {supp.timing}</span>
                  {supp.brand && <span>Marque: {supp.brand}</span>}
                </div>
              </div>
              {hasCitations && (
                <div className="ml-4 flex items-center gap-2">
                  <span className="text-xs" style={{ color: theme.primaryBlue }}>
                    {supp.citations.length} citation{supp.citations.length > 1 ? "s" : ""}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5" style={{ color: theme.primaryBlue }} />
                  ) : (
                    <ChevronDown className="h-5 w-5" style={{ color: theme.primaryBlue }} />
                  )}
                </div>
              )}
            </button>

            {/* Expanded content */}
            {isExpanded && hasCitations && (
              <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: theme.border }}>
                {supp.mechanism && (
                  <div className="text-sm mb-3" style={{ color: theme.textSecondary }}>
                    <span className="font-semibold" style={{ color: theme.textPrimary }}>Mécanisme: </span>
                    {supp.mechanism}
                  </div>
                )}
                <div className="text-xs font-semibold mb-2" style={{ color: theme.textPrimary }}>
                  CITATIONS D'EXPERTS
                </div>
                <div className="space-y-2">
                  {supp.citations.map((citation, citIdx) => (
                    <CitationCard key={citIdx} citation={citation} theme={theme} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
