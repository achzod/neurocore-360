import { Suspense, lazy, memo, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQueries } from "@tanstack/react-query";
import { motion } from "framer-motion";
import FileText from "lucide-react/dist/esm/icons/file-text";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Info from "lucide-react/dist/esm/icons/info";
import Target from "lucide-react/dist/esm/icons/target";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import { AnimatedGradientMesh } from "@/components/AnimatedGradientMesh";
import { BiometricProgressCircle } from "@/components/BiometricProgressCircle";
import { BiomarkerCardPremium } from "@/components/BiomarkerCardPremium";
import { BiometricProgressCircleSkeleton } from "@/components/BiometricProgressCircleSkeleton";
import { BiomarkerCardPremiumSkeleton } from "@/components/BiomarkerCardPremiumSkeleton";
import { GlossaryItem } from "@/components/GlossaryItem";
import { SupplementCard } from "@/components/SupplementCard";
import { ReportErrorBoundary } from "@/components/ReportErrorBoundary";
import { highlightText, parseAISections } from "@/lib/markdown-utils";

import { calculateGlobalScore, calculateMarkerScore } from "@/lib/bloodScores";
import { calculatePercentile } from "@/lib/percentileCalculator";
import type { BloodMarker, PanelKey } from "@/types/blood";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const withAdminKey = (url: string, adminKey?: string) => {
  if (!adminKey) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}key=${encodeURIComponent(adminKey)}`;
};

const fetcher = async <T,>(url: string, adminKey?: string): Promise<T> => {
  const token = localStorage.getItem("apexlabs_token");
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (adminKey) headers["x-admin-key"] = adminKey;
  const res = await fetch(withAdminKey(url, adminKey), {
    headers: Object.keys(headers).length ? headers : undefined,
  });
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

const MarkdownBlock = lazy(() => import("@/components/MarkdownBlock"));

const MarkdownSection = memo(({ content }: { content: string }) => {
  if (!content) return null;
  return (
    <Suspense fallback={<div className="h-20 animate-pulse rounded bg-[--bg-tertiary]" />}>
      <MarkdownBlock content={content} />
    </Suspense>
  );
});

MarkdownSection.displayName = "MarkdownSection";

const formatPercentDiff = (value: number, ref: number) => {
  if (!Number.isFinite(value) || !Number.isFinite(ref) || ref === 0) return null;
  return Math.round(((value - ref) / ref) * 100);
};

const getScoreLabel = (score: number) => {
  if (score < 50) return { label: "Zone rouge", color: "text-rose-600" };
  if (score < 70) return { label: "Zone orange", color: "text-amber-600" };
  if (score < 85) return { label: "Zone verte", color: "text-emerald-600" };
  return { label: "Zone bleue", color: "text-cyan-600" };
};

const buildPatientName = (patient: BloodTestDetail["bloodTest"]["patient"]) => {
  const name = [patient?.prenom, patient?.nom].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (patient?.email) return patient.email.split("@")[0] || "Client ApexLabs";
  return "Client ApexLabs";
};

const formatValue = (value: number | null, unit?: string) => {
  if (value === null || value === undefined) return "-";
  return `${value}${unit ? ` ${unit}` : ""}`;
};

const glossaryEntries = [
  {
    term: "HOMA-IR",
    definition:
      "Indice de résistance à l'insuline calculé à partir de la glycémie et de l'insuline à jeun. >3 indique une résistance insulinique installée.",
  },
  {
    term: "GGT",
    definition:
      "Enzyme hépatique qui augmente en cas de stress oxydatif du foie ou de stéatose. Marqueur précoce de souffrance hépatique.",
  },
  {
    term: "Créatinine",
    definition:
      "Déchet musculaire éliminé par les reins. Un taux élevé suggère une filtration rénale diminuée ou une déshydratation.",
  },
  {
    term: "DFG",
    definition:
      "Débit de filtration glomérulaire, estimation de la fonction rénale. >90 est idéal chez l'adulte.",
  },
  {
    term: "VLDL",
    definition:
      "Lipoprotéines riches en triglycérides fabriquées par le foie. Trop de VLDL = hypertriglycéridémie.",
  },
  {
    term: "NAFLD",
    definition:
      "Stéatose hépatique non alcoolique. Excès de graisse dans le foie lié au syndrome métabolique.",
  },
  {
    term: "SREBP-1c",
    definition:
      "Facteur de transcription qui stimule la fabrication de lipides dans le foie. Activé par l'insuline.",
  },
  {
    term: "GLUT4",
    definition:
      "Transporteur de glucose dans les muscles. L'exercice améliore son activation et baisse l'insuline requise.",
  },
  {
    term: "Aromatase",
    definition:
      "Enzyme qui convertit la testostérone en estrogènes. Plus de graisse viscérale = plus d'aromatase.",
  },
];

const SECTION_NAV = [
  { id: "introduction", label: "Introduction" },
  { id: "overview", label: "Vue d'ensemble" },
  { id: "alerts", label: "Alertes prioritaires" },
  { id: "strengths", label: "Tes forces" },
  { id: "systems", label: "Analyse détaillée" },
  { id: "interconnections", label: "Interconnexions" },
  { id: "protocol", label: "Protocole 90 jours" },
  { id: "full-report", label: "Rapport complet" },
  { id: "glossary", label: "Glossaire" },
  { id: "sources", label: "Sources" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

function BloodAnalysisReportInner() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const [, navigate] = useLocation();

  const adminKey = useMemo(() => {
    if (typeof window === "undefined") return "";
    const value = new URLSearchParams(window.location.search).get("key");
    return value ? value.trim() : "";
  }, []);

  const [meQuery, bloodTestQuery] = useQueries({
    queries: [
      {
        queryKey: ["/api/me"],
        queryFn: () => fetcher<MeResponse>("/api/me", adminKey || undefined),
        retry: false,
        enabled: !adminKey,
      },
      {
        queryKey: ["/api/blood-tests", reportId],
        queryFn: () => fetcher<BloodTestDetail>(`/api/blood-tests/${reportId}`, adminKey || undefined),
        retry: false,
        refetchInterval: (query: any) => {
          const current = query.state.data as BloodTestDetail | undefined;
          const status = current?.bloodTest?.status;
          return status === "processing" ? 5000 : false;
        },
      },
    ],
  });

  const me = meQuery.data as MeResponse | undefined;
  const meError = meQuery.error as ApiError | null;
  const data = bloodTestQuery.data as BloodTestDetail | undefined;
  const isLoading = bloodTestQuery.isLoading;
  const error = bloodTestQuery.error as ApiError | null;
  const refetch = bloodTestQuery.refetch;

  useEffect(() => {
    if (adminKey) return;
    if (meError) {
      navigate(`/auth/login?next=/analysis/${encodeURIComponent(reportId)}`);
    }
  }, [adminKey, meError, navigate, reportId]);

  // Blood report uses its own theme palette; no global override needed.

  useEffect(() => {
    if (adminKey) return;
    if (error instanceof ApiError && error.status === 401) {
      navigate(`/auth/login?next=/analysis/${encodeURIComponent(reportId)}`);
    }
  }, [adminKey, error, navigate, reportId]);

  const reportData = useMemo(() => {
    if (!data || !reportId) return null;
    const patient = data.bloodTest.patient || data.analysis.patient || null;
    const patientName = buildPatientName(patient);
    const patientAge = getPatientAge(patient?.dob);

    const markers: BloodMarker[] = (data.markers || []).map((marker) => {
      const panel = toPanelKey(marker.category);
      const percentile =
        patientAge !== null && patient?.gender
          ? calculatePercentile(marker.code, marker.value, patientAge, patient.gender === "femme" ? "female" : "male")
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

    const globalScore =
      data.analysis.globalScore ??
      data.bloodTest.globalScore ??
      (markers.length ? calculateGlobalScore(markers) : 0);

    return {
      reportId,
      patient,
      patientName,
      patientAge,
      markers,
      globalScore,
      createdAt: data.bloodTest.uploadedAt,
      aiAnalysis: data.analysis.aiAnalysis || "",
      comprehensiveData: data.analysis.comprehensiveData,
    };
  }, [data, reportId]);

  const isLoadingReport = isLoading || !reportData;
  const displayName = reportData?.patientName ?? "Chargement...";
  const displayCreatedAt = reportData?.createdAt ?? new Date().toISOString();
  const displayScore = reportData?.globalScore ?? 0;
  const displayMarkersCount = reportData?.markers.length ?? 0;

  const aiData = useMemo(() => {
    const sections = parseAISections(reportData?.aiAnalysis || "");
    const hasContent = Object.values(sections).some((section) => Boolean(section?.content));
    return { sections, hasContent };
  }, [reportData?.aiAnalysis]);

  const aiSections = aiData.sections;
  const hasAISections = aiData.hasContent;

  const markerBuckets = useMemo(() => {
    if (!reportData) return { critical: [], strong: [] };
    const critical = reportData.markers.filter((marker) => marker.status === "critical");
    const fallback = reportData.markers.filter((marker) => marker.status === "suboptimal");
    const strong = reportData.markers.filter((marker) => marker.status === "optimal").slice(0, 4);

    return {
      critical: (critical.length ? critical : fallback).slice(0, 4),
      strong,
    };
  }, [reportData?.markers]);

  const criticalMarkers = markerBuckets.critical;
  const strongMarkers = markerBuckets.strong;

  const supplements = reportData?.comprehensiveData?.supplements || [];
  const protocols = reportData?.comprehensiveData?.protocols || [];

  const handleExportPDF = async () => {
    if (!reportId) return;
    try {
      const token = localStorage.getItem("apexlabs_token");
      const res = await fetch(withAdminKey(`/api/blood-tests/${reportId}/export/pdf`, adminKey || undefined), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("Export PDF indisponible.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const baseName = reportData?.patientName ? `Blood_Analysis_${displayName}` : "Blood_Analysis";
      a.href = url;
      a.download = `${baseName}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'export PDF.");
    }
  };

  if (!isLoading && (error || !data || !reportData)) {
    const isUnauthorized = error instanceof ApiError && error.status === 401;
    return (
      <div className="blood-report-premium min-h-screen bg-[--bg-primary] text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center font-body">
          <div className="text-lg font-semibold text-slate-900">
            {isUnauthorized ? "Connexion requise" : "Rapport introuvable"}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {isUnauthorized
              ? "Connecte-toi pour ouvrir ce rapport."
              : "Le lien est invalide ou le rapport est indisponible."}
          </p>
        </div>
      </div>
    );
  }

  if (data?.bloodTest?.status === "processing") {
    return (
      <div className="blood-report-premium min-h-screen bg-[--bg-primary] text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center font-body">
          <div className="text-lg font-semibold text-slate-900">Analyse en cours</div>
          <p className="mt-2 text-sm text-slate-600">
            Je prepare ton rapport, la page se met a jour automatiquement.
          </p>
          <button
            className="mt-6 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
            onClick={() => refetch()}
          >
            Rafraichir
          </button>
        </div>
      </div>
    );
  }

  const scoreLabel = getScoreLabel(displayScore);
  const targetScore = Math.min(85, Math.max(displayScore + 15, 78));

  return (
    <div className="blood-report-premium min-h-screen bg-[--bg-primary] text-slate-900">
      <a
        href="#introduction"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-cyan-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Aller au contenu principal
      </a>
      <header className="sticky top-0 z-20 border-b border-[--border-primary] bg-[--bg-secondary]/90 backdrop-blur relative overflow-hidden">
        <AnimatedGradientMesh />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-4 font-body">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-cyan-500 p-2 text-white">
              <FileText className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-slate-600">ApexLabs</div>
              <div className="text-lg font-semibold text-slate-900">Rapport sanguin premium</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-900">{displayName}</div>
              <div className="text-xs text-slate-600">{new Date(displayCreatedAt).toLocaleDateString("fr-FR")}</div>
            </div>
            <button
              onClick={handleExportPDF}
              className="rounded-md border border-[--border-primary] px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-[--bg-tertiary] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              Export PDF
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-10 font-body">
        <aside className="hidden w-60 flex-shrink-0 lg:block">
          <div className="sticky top-28 rounded-xl border border-[--border-primary] bg-[--bg-secondary] p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Navigation</div>
            <nav className="mt-4 space-y-2 text-sm">
              {SECTION_NAV.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-md px-2 py-1 text-slate-700 hover:bg-[--bg-tertiary] hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <motion.main
          className="w-full max-w-[900px] font-body"
          style={{ lineHeight: 1.8 }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.section id="introduction" className="scroll-mt-24 report-section" variants={itemVariants}>
            <div className="rounded-2xl border border-[--border-primary] bg-[--bg-secondary] p-8 grain-texture">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-cyan-600" aria-hidden="true" />
                <h2 className="blood-h2 text-2xl font-semibold font-display text-slate-900">
                  Introduction & guide de lecture
                </h2>
              </div>
              <p className="mt-4 text-sm text-slate-700">
                Bonjour {displayName},
              </p>
              <p className="mt-3 text-sm text-slate-700">
                Ce rapport analyse tes {displayMarkersCount} marqueurs sanguins pour identifier ce qui
                fonctionne bien et ce qui nécessite une optimisation. Il a été généré par ApexLabs, plateforme
                d'analyse de bilans sanguins orientée santé, performance et composition corporelle.
              </p>
              <div className="mt-5 rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-5 grain-texture">
                <div className="text-sm font-semibold text-slate-900 font-display">
                  Notre approche combine
                </div>
                <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
                  <li>Analyse de tes marqueurs vs ranges optimaux (pas juste "normaux")</li>
                  <li>Protocoles basés sur la science et citations d'experts (Derek, Huberman, Attia)</li>
                  <li>Plan d'action personnalisé 90 jours avec résultats attendus chiffrés</li>
                </ul>
              </div>
              <div className="mt-6">
                <div className="text-sm font-semibold text-slate-900 font-display">
                  Comment lire ce rapport
                </div>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
                  <li>Vue d'ensemble: score global, priorités absolues, forces.</li>
                  <li>Analyse détaillée: explication de chaque marqueur et impact sur toi.</li>
                  <li>Protocole personnalisé: plan 90 jours, suppléments, lifestyle, retests.</li>
                  <li>Annexes: glossaire + sources scientifiques.</li>
                </ol>
              </div>
            </div>
          </motion.section>

          <motion.section id="overview" className="mt-10 scroll-mt-24 report-section" variants={itemVariants}>
            <div className="rounded-2xl border border-[--border-primary] bg-[--bg-secondary] p-8 grain-texture">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-cyan-600" aria-hidden="true" />
                <h2 className="blood-h2 text-2xl font-semibold font-display text-slate-900">
                  Score global expliqué
                </h2>
              </div>
              {aiSections.synthesis?.content ? (
                <div className="mt-5 rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-5 grain-texture">
                  <div className="text-sm font-semibold text-slate-900 font-display">
                    Synthèse exécutive personnalisée
                  </div>
                  <MarkdownSection content={aiSections.synthesis.content} />
                </div>
              ) : null}
              {aiSections.quality?.content ? (
                <div className="mt-4 rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-5 grain-texture">
                  <div className="text-sm font-semibold text-slate-900 font-display">
                    Qualité des données & limites
                  </div>
                  <MarkdownSection content={aiSections.quality.content} />
                </div>
              ) : null}
              {aiSections.potential?.content ? (
                <div className="mt-4 rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-5 grain-texture">
                  <div className="text-sm font-semibold text-slate-900 font-display">
                    Potentiel recomposition
                  </div>
                  <MarkdownSection content={aiSections.potential.content} />
                </div>
              ) : null}
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div className="rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-6 grain-texture text-center">
                  {isLoadingReport ? (
                    <BiometricProgressCircleSkeleton />
                  ) : (
                    <BiometricProgressCircle score={displayScore} size={220} />
                  )}
                  {isLoadingReport ? (
                    <div className="mt-4 text-sm font-semibold text-slate-600">Score en cours de calcul</div>
                  ) : (
                    <div className={`mt-4 text-sm font-semibold ${scoreLabel.color}`}>{scoreLabel.label}</div>
                  )}
                  {isLoadingReport ? (
                    <p className="mt-4 text-sm text-slate-700">
                      Les indicateurs se chargent. Le score final sera disponible dans quelques secondes.
                    </p>
                  ) : (
                    <p className="mt-4 text-sm text-slate-700">
                      Un score de {displayScore}/100 te place dans la catégorie{" "}
                      <span className="font-semibold text-slate-900">{scoreLabel.label.toLowerCase()}</span>.
                      L'objectif réaliste sur 90 jours est d'atteindre {targetScore}/100.
                    </p>
                  )}
                  {!isLoadingReport && (
                    <div className="mt-4 text-xs text-slate-600">
                      0-50: Zone rouge · 50-70: Zone orange · 70-85: Zone verte · 85-100: Zone bleue
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-[--border-primary] bg-[--bg-secondary] p-5 grain-texture">
                  <div className="text-sm font-semibold text-slate-900 font-display">
                    Tes infos personnelles
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-700">
                    <div>Nom: {displayName}</div>
                    <div>Age: {reportData?.patientAge ?? "Non renseigné"}</div>
                    <div>Poids: {reportData?.patient?.poids ? `${reportData.patient.poids} kg` : "Non renseigné"}</div>
                    <div>Taille: {reportData?.patient?.taille ? `${reportData.patient.taille} cm` : "Non renseigné"}</div>
                    <div>Sommeil: {reportData?.patient?.sleepHours ? `${reportData.patient.sleepHours} h/nuit` : "Non renseigné"}</div>
                    <div>Training: {reportData?.patient?.trainingHours ? `${reportData.patient.trainingHours} h/sem` : "Non renseigné"}</div>
                    <div>Stress: {reportData?.patient?.stressLevel ? `${reportData.patient.stressLevel}/10` : "Non renseigné"}</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section id="alerts" className="mt-10 scroll-mt-24 report-section" variants={itemVariants}>
            <div className="rounded-2xl border border-[--border-primary] bg-[--bg-secondary] p-8 grain-texture">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600" aria-hidden="true" />
                <h2 className="blood-h2 text-2xl font-semibold font-display text-slate-900">
                  Alertes prioritaires (ce qui nécessite une action rapide)
                </h2>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                Voici les marqueurs qui demandent ton attention immédiate. Chaque alerte est expliquée pour que tu
                comprennes quoi faire, pourquoi, et avec quel impact attendu.
              </p>
              <div className="mt-6 space-y-6">
                {aiSections.alerts?.content ? (
                  <div className="rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-5 grain-texture">
                    <div className="text-sm font-semibold text-slate-900 font-display">
                      Tableau de bord (scores & priorités)
                    </div>
                    <MarkdownSection content={aiSections.alerts.content} />
                  </div>
                ) : null}
                {isLoadingReport ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <BiomarkerCardPremiumSkeleton key={`skeleton-${idx}`} />
                    ))}
                  </div>
                ) : criticalMarkers.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {criticalMarkers.map((marker) => (
                      <BiomarkerCardPremium
                        key={marker.code}
                        marker={{
                          name: marker.name,
                          value: marker.value,
                          unit: marker.unit,
                          status: marker.status,
                          normalMin: marker.normalMin,
                          normalMax: marker.normalMax,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-5 text-sm text-slate-700">
                    Aucun marqueur critique détecté. Le rapport complet détaille les optimisations possibles.
                  </div>
                )}
              </div>
            </div>
          </motion.section>

          <motion.section id="strengths" className="mt-10 scroll-mt-24 report-section" variants={itemVariants}>
            <div className="rounded-2xl border border-[--border-primary] bg-[--bg-secondary] p-8 grain-texture">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                <h2 className="blood-h2 text-2xl font-semibold font-display text-slate-900">
                  Tes forces (ce qui fonctionne déjà)
                </h2>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                Ces marqueurs sont solides. On va s'appuyer dessus pour accélérer le reste de ta progression.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {strongMarkers.length ? (
                  strongMarkers.map((marker) => (
                    <div key={marker.code} className="rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-4 grain-texture">
                      <div className="text-sm font-semibold text-slate-900 font-display">
                        {marker.name} ({formatValue(marker.value, marker.unit)})
                      </div>
                      <p className="mt-2 text-sm text-slate-700">
                        Ton {marker.name.toLowerCase()} est dans la zone optimale. Continue tes habitudes actuelles
                        pour maintenir ce point fort.
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-4 text-sm text-slate-700">
                    Tes marqueurs forts seront détaillés dans l'analyse complète.
                  </div>
                )}
              </div>
            </div>
          </motion.section>

          <motion.section id="systems" className="mt-10 scroll-mt-24 report-section" variants={itemVariants}>
            <div className="rounded-2xl border border-[--border-primary] bg-[--bg-secondary] p-8 grain-texture">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-cyan-600" aria-hidden="true" />
                <h2 className="blood-h2 text-2xl font-semibold font-display text-slate-900">
                  Analyse système par système
                </h2>
              </div>
              <MarkdownSection content={aiSections.systems?.content || ""} />
              {!aiSections.systems?.content && (
                <p className="mt-4 text-sm text-slate-600">
                  Analyse détaillée en cours de génération. Consulte le rapport complet ci-dessous pour le texte intégral.
                </p>
              )}
              {aiSections.deepDive?.content ? (
                <div className="mt-6 rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-5 grain-texture">
                  <div className="text-sm font-semibold text-slate-900 font-display">
                    Deep dive (explications détaillées)
                  </div>
                  <MarkdownSection content={aiSections.deepDive.content} />
                </div>
              ) : null}
            </div>
          </motion.section>

          <motion.section id="interconnections" className="mt-10 scroll-mt-24 report-section" variants={itemVariants}>
            <div className="rounded-2xl border border-[--border-primary] bg-[--bg-secondary] p-8 grain-texture">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-cyan-600" aria-hidden="true" />
                <h2 className="blood-h2 text-2xl font-semibold font-display text-slate-900">
                  Interconnexions clés
                </h2>
              </div>
              <MarkdownSection content={aiSections.interconnections?.content || ""} />
              {!aiSections.interconnections?.content && (
                <p className="mt-4 text-sm text-slate-600">
                  Les interconnexions détaillées sont disponibles dans le rapport complet.
                </p>
              )}
            </div>
          </motion.section>

          <motion.section id="protocol" className="mt-10 scroll-mt-24 report-section" variants={itemVariants}>
            <div className="rounded-2xl border border-[--border-primary] bg-[--bg-secondary] p-8 grain-texture">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-cyan-600" aria-hidden="true" />
                <h2 className="blood-h2 text-2xl font-semibold font-display text-slate-900">
                  Protocole 90 jours (phase par phase)
                </h2>
              </div>
              <MarkdownSection content={aiSections.plan90?.content || ""} />
              {!aiSections.plan90?.content && (
                <p className="mt-4 text-sm text-slate-600">
                  Le plan 90 jours est en cours de génération et apparaît dans le rapport complet.
                </p>
              )}

              {aiSections.nutrition?.content ? (
                <div className="mt-6 rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-5 grain-texture">
                  <div className="text-sm font-semibold text-slate-900 font-display">
                    Nutrition & lifestyle
                  </div>
                  <MarkdownSection content={aiSections.nutrition.content} />
                </div>
              ) : null}

              {aiSections.supplements?.content ? (
                <div className="mt-6 rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-5 grain-texture">
                  <div className="text-sm font-semibold text-slate-900 font-display">
                    Suppléments (contexte scientifique)
                  </div>
                  <MarkdownSection content={aiSections.supplements.content} />
                </div>
              ) : null}

              <div className="mt-8">
                <div className="text-sm font-semibold text-slate-900 font-display">
                  Recommandations supplements (format actionnable)
                </div>
                <div className="mt-4 space-y-4">
                  {supplements.length ? (
                    supplements.map((supp: any, idx: number) => (
                      <SupplementCard
                        key={`${supp.name}-${idx}`}
                        supp={{
                          name: supp.name,
                          mechanism: supp.mechanism || "Optimiser tes marqueurs prioritaires.",
                          dosage: [supp.dosage, supp.timing].filter(Boolean).join(" · "),
                          priority: supp.priority || 2,
                          citations: supp.citations,
                        }}
                      />
                    ))
                  ) : (
                    <div className="rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-4 text-sm text-slate-700">
                      Aucun supplément recommandé pour ce profil.
                    </div>
                  )}
                </div>
              </div>

              {protocols.length ? (
                <div className="mt-8">
                  <div className="text-sm font-semibold text-slate-900 font-display">
                    Protocoles lifestyle & training
                  </div>
                  <div className="mt-4 space-y-4">
                    {protocols.map((protocol: any, idx: number) => (
                      <div key={`${protocol.name}-${idx}`} className="rounded-xl border border-[--border-primary] bg-[--bg-tertiary] p-4 grain-texture">
                        <div className="text-sm font-semibold text-slate-900 font-display">
                          {protocol.name}
                        </div>
                        <div className="mt-2 text-sm text-slate-700">
                          <div>
                            <span className="font-semibold text-slate-900">QUOI:</span>{" "}
                            {protocol.description || protocol.name}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900">POURQUOI:</span>{" "}
                            {protocol.scienceContext || protocol.expectedOutcome || "Optimiser tes marqueurs."}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900">COMMENT:</span>{" "}
                            {protocol.steps && protocol.steps.length ? protocol.steps.join(" · ") : protocol.frequency}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900">QUAND:</span>{" "}
                            {protocol.duration || "Phase actuelle"}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900">IMPACT:</span>{" "}
                            {protocol.expectedOutcome || "Amélioration attendue sur tes objectifs."}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900">EXPERT:</span>{" "}
                            {protocol.citations && protocol.citations.length
                              ? highlightText(protocol.citations[0])
                              : "-"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.section>

          <motion.section id="full-report" className="mt-10 scroll-mt-24 report-section" variants={itemVariants}>
            <div className="rounded-2xl border border-[--border-primary] bg-[--bg-secondary] p-8 grain-texture">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-cyan-600" aria-hidden="true" />
                <h2 className="blood-h2 text-2xl font-semibold font-display text-slate-900">
                  Rapport complet (texte intégral)
                </h2>
              </div>
              {hasAISections ? (
                <div className="mt-4 space-y-6 text-sm text-slate-700">
                  {aiSections.synthesis?.content && <MarkdownSection content={aiSections.synthesis.content} />}
                  {aiSections.alerts?.content && <MarkdownSection content={aiSections.alerts.content} />}
                  {aiSections.systems?.content && <MarkdownSection content={aiSections.systems.content} />}
                  {aiSections.interconnections?.content && (
                    <MarkdownSection content={aiSections.interconnections.content} />
                  )}
                  {aiSections.deepDive?.content && <MarkdownSection content={aiSections.deepDive.content} />}
                  {aiSections.plan90?.content && <MarkdownSection content={aiSections.plan90.content} />}
                  {aiSections.nutrition?.content && <MarkdownSection content={aiSections.nutrition.content} />}
                  {aiSections.supplements?.content && <MarkdownSection content={aiSections.supplements.content} />}
                  {aiSections.sources?.content && <MarkdownSection content={aiSections.sources.content} />}
                </div>
              ) : (
                <MarkdownSection content={reportData?.aiAnalysis ?? ""} />
              )}
            </div>
          </motion.section>

          <motion.section id="glossary" className="mt-10 scroll-mt-24 report-section" variants={itemVariants}>
            <div className="rounded-2xl border border-[--border-primary] bg-[--bg-secondary] p-8 grain-texture">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-cyan-600" aria-hidden="true" />
                <h2 className="blood-h2 text-2xl font-semibold font-display text-slate-900">
                  Glossaire & explications
                </h2>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                Ce glossaire vulgarise les termes techniques utilisés dans ton rapport.
              </p>
              <div className="mt-6 space-y-4">
                {glossaryEntries.map((entry) => (
                  <GlossaryItem key={entry.term} term={entry.term} definition={entry.definition} />
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section id="sources" className="mt-10 scroll-mt-24 report-section" variants={itemVariants}>
            <div className="rounded-2xl border border-[--border-primary] bg-[--bg-secondary] p-8 grain-texture">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-cyan-600" aria-hidden="true" />
                <h2 className="blood-h2 text-2xl font-semibold font-display text-slate-900">
                  Sources (bibliothèque)
                </h2>
              </div>
              {aiSections.sources?.content ? (
                <MarkdownSection content={aiSections.sources.content} />
              ) : (
                <p className="mt-3 text-sm text-slate-700">
                  Sources disponibles dans la base scientifique ApexLabs.
                </p>
              )}
            </div>
          </motion.section>
        </motion.main>
      </div>
    </div>
  );
}

export default function BloodAnalysisReport() {
  return (
    <ReportErrorBoundary>
      <BloodAnalysisReportInner />
    </ReportErrorBoundary>
  );
}
