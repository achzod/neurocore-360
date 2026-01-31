import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { X } from "lucide-react";
import { useBloodTheme } from "@/components/blood/BloodThemeContext";
import BiomarkerTabs, { BiomarkerModalTab } from "@/components/blood/biomarkers/BiomarkerTabs";
import { PANEL_LABELS } from "@/components/blood/overview/utils";
import { BIOMARKER_DETAILS_EXTENDED } from "@/data/bloodBiomarkerDetailsExtended";
import { BIOMARKER_DETAILS, buildDefaultBiomarkerDetail } from "@/data/bloodBiomarkerDetails";
import type { BloodMarker } from "@/types/blood";

interface BiomarkerDetailModalProps {
  marker: BloodMarker | null;
  isOpen: boolean;
  onClose: () => void;
}

const getStatusStyles = (status: string) => {
  if (status === "critical") {
    return { background: "rgba(239, 68, 68, 0.1)", color: "#EF4444", label: "CRITIQUE" };
  }
  if (status === "suboptimal") {
    return { background: "rgba(245, 158, 11, 0.1)", color: "#F59E0B", label: "ATTENTION" };
  }
  return { background: "rgba(2, 121, 232, 0.1)", color: "#0279E8", label: "BON ETAT" };
};

export default function BiomarkerDetailModal({ marker, isOpen, onClose }: BiomarkerDetailModalProps) {
  const { theme } = useBloodTheme();
  const [activeTab, setActiveTab] = useState<BiomarkerModalTab>("definition");

  useEffect(() => {
    if (isOpen) setActiveTab("definition");
  }, [isOpen, marker?.code]);

  const extended = useMemo(() => {
    if (!marker) return null;
    return BIOMARKER_DETAILS_EXTENDED[marker.code] ?? null;
  }, [marker]);

  const fallback = useMemo(() => {
    if (!marker) return null;
    const statusLabel = marker.status === "critical" ? "critique" : marker.status === "suboptimal" ? "sous-optimal" : "normal";
    return BIOMARKER_DETAILS[marker.code] ?? buildDefaultBiomarkerDetail(marker.name, statusLabel);
  }, [marker]);

  const statusStyles = marker ? getStatusStyles(marker.status) : null;

  const renderContent = () => {
    if (!marker) return null;

    if (extended) {
      if (activeTab === "definition") {
        return (
          <div className="prose max-w-none">
            <ReactMarkdown>{extended.definition.intro}</ReactMarkdown>
            <ReactMarkdown>{extended.definition.mechanism}</ReactMarkdown>
            <ReactMarkdown>{extended.definition.clinical}</ReactMarkdown>
            <ReactMarkdown>{extended.definition.ranges.interpretation}</ReactMarkdown>
            <ReactMarkdown>{extended.definition.variations}</ReactMarkdown>
          </div>
        );
      }

      if (activeTab === "impact") {
        return (
          <div className="prose max-w-none">
            <ReactMarkdown>{extended.impact.performance.hypertrophy}</ReactMarkdown>
            <ReactMarkdown>{extended.impact.performance.strength}</ReactMarkdown>
            <ReactMarkdown>{extended.impact.performance.recovery}</ReactMarkdown>
            <ReactMarkdown>{extended.impact.performance.bodyComp}</ReactMarkdown>
            <ReactMarkdown>{extended.impact.health.energy}</ReactMarkdown>
            <ReactMarkdown>{extended.impact.health.mood}</ReactMarkdown>
            <ReactMarkdown>{extended.impact.health.cognition}</ReactMarkdown>
            <ReactMarkdown>{extended.impact.health.immunity}</ReactMarkdown>
            <ReactMarkdown>{extended.impact.longTerm.cardiovascular}</ReactMarkdown>
            <ReactMarkdown>{extended.impact.longTerm.metabolic}</ReactMarkdown>
            <ReactMarkdown>{extended.impact.longTerm.lifespan}</ReactMarkdown>
          </div>
        );
      }

      return (
        <div className="prose max-w-none">
          <ReactMarkdown>{extended.protocol.phase1_lifestyle.sleep}</ReactMarkdown>
          <ReactMarkdown>{extended.protocol.phase1_lifestyle.nutrition}</ReactMarkdown>
          <ReactMarkdown>{extended.protocol.phase1_lifestyle.training}</ReactMarkdown>
          <ReactMarkdown>{extended.protocol.phase1_lifestyle.stress}</ReactMarkdown>
          <ReactMarkdown>{extended.protocol.phase1_lifestyle.alcohol}</ReactMarkdown>
          <ReactMarkdown>{extended.protocol.phase1_lifestyle.expected_impact}</ReactMarkdown>
          {extended.protocol.phase2_supplements.supplements.map((supplement, idx) => (
            <div key={`${supplement.name}-${idx}`} className="mt-4 rounded-xl border p-4">
              <div className="text-sm font-semibold" style={{ color: theme.textPrimary }}>
                {supplement.name}
              </div>
              <div className="text-xs" style={{ color: theme.textSecondary }}>
                {supplement.dosage} - {supplement.timing}
              </div>
              <ReactMarkdown>{supplement.mechanism}</ReactMarkdown>
            </div>
          ))}
          <ReactMarkdown>{extended.protocol.phase2_supplements.expected_impact}</ReactMarkdown>
          <ReactMarkdown>{extended.protocol.phase3_retest.when}</ReactMarkdown>
          <ReactMarkdown>{extended.protocol.phase3_retest.markers}</ReactMarkdown>
          <ReactMarkdown>{extended.protocol.phase3_retest.success_criteria}</ReactMarkdown>
          <ReactMarkdown>{extended.protocol.phase3_retest.next_steps}</ReactMarkdown>
          <ReactMarkdown>{extended.protocol.special_cases.non_responders}</ReactMarkdown>
          <ReactMarkdown>{extended.protocol.special_cases.contraindications}</ReactMarkdown>
          <ReactMarkdown>{extended.protocol.special_cases.red_flags}</ReactMarkdown>
        </div>
      );
    }

    if (!fallback) return null;

    if (activeTab === "definition") {
      return (
        <div className="prose max-w-none">
          <ReactMarkdown>{fallback.definition}</ReactMarkdown>
          <ReactMarkdown>{fallback.mechanism}</ReactMarkdown>
        </div>
      );
    }

    if (activeTab === "impact") {
      return (
        <div className="prose max-w-none">
          <ReactMarkdown>{fallback.impact}</ReactMarkdown>
        </div>
      );
    }

    return (
      <div className="prose max-w-none">
        {fallback.protocol.map((line, idx) => (
          <ReactMarkdown key={idx}>{line}</ReactMarkdown>
        ))}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && marker && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            style={{
              backgroundColor: theme.mode === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.3)'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div
              className="flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border"
              style={{ backgroundColor: theme.surface, borderColor: theme.borderDefault }}
            >
              <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: theme.borderDefault }}>
                <div>
                  <div className="text-xs uppercase tracking-[0.2em]" style={{ color: theme.textTertiary }}>
                    {PANEL_LABELS[marker.panel]}
                  </div>
                  <div className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
                    {marker.name}
                  </div>
                  <div className="text-sm" style={{ color: theme.textSecondary }}>
                    {marker.value} {marker.unit}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full border p-2"
                  style={{ borderColor: theme.borderSubtle, color: theme.textSecondary }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {statusStyles && (
                <div className="px-6 py-3" style={{ backgroundColor: statusStyles.background }}>
                  <div className="text-sm font-semibold" style={{ color: statusStyles.color }}>
                    {statusStyles.label}
                  </div>
                </div>
              )}

              <BiomarkerTabs activeTab={activeTab} onTabChange={setActiveTab} />

              <div className="flex-1 overflow-y-auto px-6 py-6" style={{ color: theme.textSecondary }}>
                {renderContent()}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
