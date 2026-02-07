import { useState } from "react";
import { useParams } from "wouter";
import { BloodThemeProvider, useBloodTheme } from "@/components/blood/BloodThemeContext";
import { BloodTabs, type BloodTabKey } from "@/components/blood/BloodTabs";
import BloodHeader from "@/components/blood/BloodHeader";
import {
  OverviewTab,
  BiomarkersTab,
  AnalysisTab,
  ProtocolsTab,
  TrendsTab,
  SourcesTab,
} from "@/components/blood/tabs";
import { useBloodReport } from "@/pages/BloodAnalysisDashboard/hooks/useBloodReport";
import { useBloodCalculations } from "@/pages/BloodAnalysisDashboard/hooks/useBloodCalculations";
import { parseAISections } from "@/lib/markdown-utils";
import { Loader2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import type { BloodMarker, PanelKey } from "@/types/blood";

const STATUS_SCORE: Record<string, number> = {
  optimal: 100,
  normal: 80,
  suboptimal: 55,
  critical: 30,
};

function BloodReportModernInner() {
  const { reportId } = useParams<{ reportId: string }>();
  const [activeTab, setActiveTab] = useState<BloodTabKey>("overview");
  const { theme } = useBloodTheme();

  // Fetch report data
  const { data: report, isLoading, error } = useBloodReport(reportId);

  // Calculate derived data
  const { normalizedMarkers, panelGroups, globalScore } = useBloodCalculations(report || null);

  // Parse AI report sections
  const aiSections = report?.aiReport ? parseAISections(report.aiReport) : {};

  // Process markers for tabs - fix panel and score mapping
  const markers: BloodMarker[] = normalizedMarkers.map((m: any) => ({
    code: m.id,
    name: m.name,
    value: m.value,
    unit: m.unit,
    status: m.status,
    normalMin: m.normalMin ?? null,
    normalMax: m.normalMax ?? null,
    optimalMin: m.optimalMin ?? null,
    optimalMax: m.optimalMax ?? null,
    panel: (m.panelId || "metabolic") as PanelKey,
    score: STATUS_SCORE[m.status] || 80,
  }));

  const optimalMarkers = markers.filter((m) => m.status === "optimal");
  const watchMarkers = markers.filter((m) => m.status === "normal" || m.status === "suboptimal");
  const actionMarkers = markers.filter((m) => m.status === "critical");

  // Convert panelGroups array to Record<PanelKey, BloodMarker[]> for OverviewTab
  const panelGroupRecord = Object.fromEntries(
    panelGroups.map((g: any) => [
      g.id as PanelKey,
      (g.markers || []).map((m: any) => ({
        code: m.id,
        name: m.name,
        value: m.value,
        unit: m.unit,
        status: m.status,
        normalMin: m.normalMin ?? null,
        normalMax: m.normalMax ?? null,
        optimalMin: m.optimalMin ?? null,
        optimalMax: m.optimalMax ?? null,
        panel: (m.panelId || g.id) as PanelKey,
        score: STATUS_SCORE[m.status] || 80,
      })),
    ])
  ) as Record<PanelKey, BloodMarker[]>;

  // Build protocol phases from AI sections (simplified)
  const protocolPhases = aiSections.plan90
    ? [
        {
          id: 1,
          title: "Phase 1: Attaque",
          duration: "Jours 1-30",
          description: "Corriger les marqueurs critiques et initier les protocoles",
          items: ["Optimiser sommeil 7-9h", "Supplémentation de base", "Ajuster nutrition"],
          completed: false,
        },
        {
          id: 2,
          title: "Phase 2: Optimisation",
          duration: "Jours 31-60",
          description: "Affiner les protocoles selon la réponse initiale",
          items: ["Stack avancé", "Training adapté", "Suivi hebdomadaire"],
          completed: false,
        },
        {
          id: 3,
          title: "Phase 3: Consolidation",
          duration: "Jours 61-90",
          description: "Stabiliser les acquis et préparer le retest",
          items: ["Maintenir protocoles", "Ajuster dosages", "Préparer retest"],
          completed: false,
        },
      ]
    : undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: theme.background }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.primaryBlue }} />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: theme.background }}>
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold" style={{ color: theme.textPrimary }}>Erreur de chargement</p>
          <p className="text-sm" style={{ color: theme.textSecondary }}>{error?.message || "Rapport introuvable"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      <BloodHeader
        title="Analyse Sanguine"
        subtitle={`Rapport du ${new Date(report.createdAt || Date.now()).toLocaleDateString("fr-FR")}`}
      />

      <BloodTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="mx-auto max-w-6xl px-6 pt-6">
        <AnimatePresence mode="wait">
          {activeTab === "overview" ? (
            <OverviewTab
              key="overview"
              globalScore={globalScore}
              optimalMarkers={optimalMarkers}
              watchMarkers={watchMarkers}
              actionMarkers={actionMarkers}
              panelGroups={panelGroupRecord}
              patientInfo={report.profile as any}
            />
          ) : activeTab === "biomarkers" ? (
            <BiomarkersTab key="biomarkers" markers={markers} />
          ) : activeTab === "analysis" ? (
            <AnalysisTab key="analysis" aiSections={aiSections} />
          ) : activeTab === "protocols" ? (
            <ProtocolsTab
              key="protocols"
              aiSections={aiSections}
              protocolPhases={protocolPhases}
            />
          ) : activeTab === "trends" ? (
            <TrendsTab key="trends" />
          ) : activeTab === "sources" ? (
            <SourcesTab key="sources" aiSections={aiSections} />
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function BloodReportModern() {
  return (
    <BloodThemeProvider>
      <BloodReportModernInner />
    </BloodThemeProvider>
  );
}
