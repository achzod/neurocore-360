import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Menu } from "lucide-react";

import BloodHeader from "@/components/blood/BloodHeader";
import BloodShell from "@/components/blood/BloodShell";
import BloodSidebar from "@/components/blood/BloodSidebar";
import BloodTabs, { TabKey } from "@/components/blood/BloodTabs";
import { BloodThemeProvider, useBloodTheme } from "@/components/blood/BloodThemeContext";
import LoadingSpinner from "@/components/blood/shared/LoadingSpinner";
import { BLOOD_PANEL_CITATIONS } from "@/data/bloodPanelCitations";
import {
  calculateAnabolicIndex,
  calculateDiabetesRisk,
  calculateGlobalScore,
  calculateInflammationScore,
  calculateMarkerScore,
  calculatePanelScore,
  calculateRecompReadiness,
} from "@/lib/bloodScores";
import { calculatePercentile } from "@/lib/percentileCalculator";
import { buildProtocolSteps, buildSupplements } from "@/lib/protocolGenerator";
import type { BloodReportData, BloodMarker, PanelKey, CorrelationInsight } from "@/types/blood";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const fetcher = async <T,>(url: string, adminKey?: string): Promise<T> => {
  const token = localStorage.getItem("apexlabs_token");
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (adminKey) headers["x-admin-key"] = adminKey;
  const res = await fetch(url, { headers: Object.keys(headers).length ? headers : undefined });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, `${res.status} ${text}`);
  }
  return res.json();
};

type MarkerStatus = "optimal" | "normal" | "suboptimal" | "critical";

type BloodTestDetail = {
  bloodTest: {
    id: string;
    fileName: string;
    uploadedAt: string;
    status: string;
    error: string | null;
    globalScore: number | null;
    globalLevel: string | null;
    patient?: {
      prenom?: string;
      nom?: string;
      email?: string;
      gender?: string;
      dob?: string;
      poids?: number;
      taille?: number;
      sleepHours?: number;
      trainingHours?: number;
      calorieDeficit?: number;
      alcoholWeekly?: number;
      stressLevel?: number;
    } | null;
  };
  markers: Array<{
    name: string;
    code: string;
    category: string;
    value: number;
    unit: string;
    refMin: number | null;
    refMax: number | null;
    optimalMin: number | null;
    optimalMax: number | null;
    status: MarkerStatus;
    interpretation?: string;
  }>;
  analysis: {
    globalScore?: number;
    globalLevel?: string | null;
    categoryScores?: Record<string, number>;
    systemScores?: Record<string, number>;
    temporalRisk?: { score: number; level: string; critical: number; warning: number };
    patterns?: Array<{ name: string; causes?: string[]; protocol?: string[] }>;
    recommendations?: {
      priority1?: Array<{ action: string; dosage?: string; timing?: string; why: string }>;
      priority2?: Array<{ action: string; dosage?: string; timing?: string; why: string }>;
    };
    comprehensiveData?: {
      supplements?: Array<any>;
      protocols?: Array<any>;
    };
    protocolPhases?: Array<{ id: string; title: string; items: string[] }>;
    aiAnalysis?: string;
    lifestyleCorrelations?: Array<{
      factor: string;
      current: string;
      impact: string;
      recommendation: string;
      status: MarkerStatus;
      evidence?: string;
    }>;
    patient?: {
      prenom?: string;
      nom?: string;
      email?: string;
      gender?: string;
      dob?: string;
      poids?: number;
      taille?: number;
      sleepHours?: number;
      trainingHours?: number;
      calorieDeficit?: number;
      alcoholWeekly?: number;
      stressLevel?: number;
    };
  };
};

type MeResponse = {
  user: { id: string; email: string; credits: number };
};

const PANEL_KEYS: PanelKey[] = [
  "hormonal",
  "thyroid",
  "metabolic",
  "inflammatory",
  "vitamins",
  "liver_kidney",
];

const toPanelKey = (panel: string): PanelKey => {
  if (PANEL_KEYS.includes(panel as PanelKey)) return panel as PanelKey;
  return "metabolic";
};

const getPatientAge = (dob?: string): number | null => {
  if (!dob) return null;
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return null;
  const age = Math.floor((Date.now() - parsed.getTime()) / 31557600000);
  return Number.isFinite(age) ? age : null;
};

const getPatientSex = (gender?: string): "male" | "female" | "unknown" => {
  if (gender === "homme") return "male";
  if (gender === "femme") return "female";
  return "unknown";
};

const buildCorrelations = (
  correlations: BloodTestDetail["analysis"]["lifestyleCorrelations"]
): CorrelationInsight[] => {
  if (!correlations?.length) return [];
  return correlations.map((item) => ({
    markerCode: item.factor.toLowerCase().replace(/\s+/g, "_"),
    insight: item.impact,
    recommendation: item.recommendation || null,
    confidence: item.status === "critical" ? "high" : item.status === "suboptimal" ? "medium" : "low",
  }));
};

const buildSources = (): BloodReportData["sources"] => {
  const sources: BloodReportData["sources"] = [];
  Object.entries(BLOOD_PANEL_CITATIONS).forEach(([panel, items]) => {
    if (!PANEL_KEYS.includes(panel as PanelKey)) return;
    items.forEach((item) => {
      sources.push({
        panel: panel as PanelKey,
        text: item.title,
        url: item.url,
      });
    });
  });
  return sources;
};

const mapReportData = (data: BloodTestDetail, reportId: string): BloodReportData => {
  const patient = data.bloodTest.patient || data.analysis.patient || null;
  const patientName = [patient?.prenom, patient?.nom].filter(Boolean).join(" ").trim();
  const patientAge = getPatientAge(patient?.dob);
  const patientSex = getPatientSex(patient?.gender);

  const markers: BloodMarker[] = (data.markers || []).map((marker) => {
    const panel = toPanelKey(marker.category);
    const percentile =
      patientAge !== null && patientSex !== "unknown"
        ? calculatePercentile(marker.code, marker.value, patientAge, patientSex)
        : null;

    return {
      code: marker.code,
      name: marker.name,
      value: marker.value,
      unit: marker.unit,
      status: marker.status,
      score: calculateMarkerScore(marker),
      optimalMin: marker.optimalMin,
      optimalMax: marker.optimalMax,
      normalMin: marker.refMin,
      normalMax: marker.refMax,
      panel,
      percentile: percentile ?? undefined,
    };
  });

  const panelScores = PANEL_KEYS.map((panel) => {
    const panelMarkers = markers.filter((marker) => marker.panel === panel);
    return {
      panel,
      score: calculatePanelScore(markers, panel),
      markersCount: panelMarkers.length,
      criticalCount: panelMarkers.filter((marker) => marker.status === "critical").length,
      suboptimalCount: panelMarkers.filter((marker) => marker.status === "suboptimal").length,
    };
  });

  const globalScore = markers.length ? calculateGlobalScore(markers) : data.analysis.globalScore ?? 0;

  const patientContext = {
    age: patientAge,
    sex: patientSex,
    bmi:
      typeof patient?.poids === "number" && typeof patient?.taille === "number" && patient.taille > 0
        ? Math.round((patient.poids / Math.pow(patient.taille / 100, 2)) * 10) / 10
        : null,
    sleep: typeof patient?.sleepHours === "number" ? `${patient.sleepHours} h/nuit` : null,
    training: typeof patient?.trainingHours === "number" ? `${patient.trainingHours} h/sem` : null,
    calories: typeof patient?.calorieDeficit === "number" ? `${patient.calorieDeficit} kcal` : null,
    alcohol: typeof patient?.alcoholWeekly === "number" ? `${patient.alcoholWeekly} verres/sem` : null,
    stress: typeof patient?.stressLevel === "number" ? `${patient.stressLevel}/10` : null,
    supplements: null,
  };

  return {
    reportId,
    patientName: patientName || "Patient",
    patientAge,
    patientSex,
    createdAt: data.bloodTest.uploadedAt,
    globalScore,
    panelScores,
    markers,
    derivedMetrics: {
      anabolicIndex: calculateAnabolicIndex(markers),
      recompReadiness: calculateRecompReadiness(markers),
      diabetesRisk: calculateDiabetesRisk(markers),
      inflammationScore: calculateInflammationScore(markers),
    },
    patientContext,
    aiAnalysis: data.analysis.aiAnalysis || "",
    correlations: buildCorrelations(data.analysis.lifestyleCorrelations),
    protocolSteps: buildProtocolSteps(data.analysis.protocolPhases),
    supplements: buildSupplements(data.analysis.recommendations, data.analysis.comprehensiveData),
    sources: buildSources(),
  };
};

function BloodAnalysisReportInner() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const [, navigate] = useLocation();
  const { theme } = useBloodTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [isExporting, setIsExporting] = useState(false);

  const adminKey = useMemo(() => {
    if (typeof window === "undefined") return "";
    const value = new URLSearchParams(window.location.search).get("key");
    return value ? value.trim() : "";
  }, []);

  const { data: me, error: meError } = useQuery<MeResponse, ApiError>({
    queryKey: ["/api/me"],
    queryFn: () => fetcher<MeResponse>("/api/me", adminKey || undefined),
    retry: false,
    enabled: !adminKey,
  });

  useEffect(() => {
    if (adminKey) return;
    if (meError) {
      navigate(`/auth/login?next=/analysis/${encodeURIComponent(reportId)}`);
    }
  }, [adminKey, meError, navigate, reportId]);

  const { data, isLoading, error, refetch } = useQuery<BloodTestDetail, ApiError>({
    queryKey: ["/api/blood-tests", reportId],
    queryFn: () => fetcher<BloodTestDetail>(`/api/blood-tests/${reportId}`, adminKey || undefined),
    retry: false,
    refetchInterval: (query) => {
      const current = query.state.data as BloodTestDetail | undefined;
      const status = current?.bloodTest?.status;
      return status === "processing" ? 5000 : false;
    },
  });

  useEffect(() => {
    if (adminKey) return;
    if (error instanceof ApiError && error.status === 401) {
      navigate(`/auth/login?next=/analysis/${encodeURIComponent(reportId)}`);
    }
  }, [adminKey, error, navigate, reportId]);

  const credits = adminKey ? 0 : me?.user?.credits ?? 0;

  const reportData = useMemo(() => {
    if (!data || !reportId) return null;
    return mapReportData(data, reportId);
  }, [data, reportId]);

  const progress = useMemo(() => {
    if (!reportData) return 0;
    const targetCount = 39;
    return Math.min(100, Math.round((reportData.markers.length / targetCount) * 100));
  }, [reportData]);

  const handleExportPDF = async () => {
    if (!reportId) return;
    setIsExporting(true);
    try {
      const token = localStorage.getItem("apexlabs_token");
      const res = await fetch(`/api/blood-tests/${reportId}/export/pdf`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Export PDF indisponible.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const baseName = reportData?.patientName ? `Blood_Analysis_${reportData.patientName}` : "Blood_Analysis";
      a.href = url;
      a.download = `${baseName}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'export PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <BloodShell>
        <BloodHeader credits={credits} title="Analyse Sanguine" subtitle="Chargement" showShare={false} />
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-24">
          <LoadingSpinner label="Chargement du rapport" />
        </div>
      </BloodShell>
    );
  }

  if (error || !data || !reportData) {
    const isUnauthorized = error instanceof ApiError && error.status === 401;
    return (
      <BloodShell>
        <BloodHeader credits={credits} title="Analyse Sanguine" subtitle="Acces" showShare={false} />
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
            {isUnauthorized ? "Connexion requise" : "Rapport introuvable"}
          </div>
          <p className="mt-2 text-sm" style={{ color: theme.textSecondary }}>
            {isUnauthorized ? "Connecte-toi pour ouvrir ce rapport." : "Le lien est invalide ou le rapport est indisponible."}
          </p>
        </div>
      </BloodShell>
    );
  }

  if (data.bloodTest.status === "processing") {
    return (
      <BloodShell>
        <BloodHeader credits={credits} title="Analyse Sanguine" subtitle="En cours" showShare={false} />
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <div className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
            Analyse en cours
          </div>
          <p className="mt-2 text-sm" style={{ color: theme.textSecondary }}>
            Je prepare ton rapport, la page se met a jour automatiquement.
          </p>
          <button
            className="mt-6 rounded-md px-4 py-2 text-sm"
            style={{ backgroundColor: theme.primaryBlue, color: "white" }}
            onClick={() => refetch()}
          >
            Rafraichir
          </button>
        </div>
      </BloodShell>
    );
  }

  return (
    <BloodShell>
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 transform transition-transform lg:translate-x-0 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <BloodSidebar
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setMobileSidebarOpen(false);
            }}
            score={reportData.globalScore}
            progress={progress}
            patientName={reportData.patientName}
          />
        </aside>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
        )}

        <div className="flex min-h-screen w-full flex-1 flex-col lg:pl-60">
          <BloodHeader
            credits={credits}
            title={`Analyse Sanguine - ${reportData.patientName}`}
            subtitle={new Date(reportData.createdAt).toLocaleDateString("fr-FR", { dateStyle: "medium" })}
            showShare
            onShare={handleExportPDF}
            showAccountActions={!adminKey}
          />

          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="fixed left-4 top-4 z-50 rounded-lg p-2 lg:hidden"
            style={{ backgroundColor: theme.surface, color: theme.textPrimary }}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
            <BloodTabs reportData={reportData} activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </div>
      </div>

      {isExporting && (
        <div className="fixed bottom-6 right-6 rounded-full px-4 py-2 text-xs" style={{ backgroundColor: theme.surfaceMuted }}>
          Export PDF en cours...
        </div>
      )}
    </BloodShell>
  );
}

export default function BloodAnalysisReport() {
  return (
    <BloodThemeProvider>
      <BloodAnalysisReportInner />
    </BloodThemeProvider>
  );
}
