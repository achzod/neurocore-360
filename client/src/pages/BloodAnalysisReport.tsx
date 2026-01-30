import { useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { FileText, AlertTriangle, CheckCircle2, Info, Target, BookOpen } from "lucide-react";

import {
  calculateGlobalScore,
  calculateMarkerScore,
} from "@/lib/bloodScores";
import { calculatePercentile } from "@/lib/percentileCalculator";
import type { BloodMarker, PanelKey } from "@/types/blood";

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

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const EXPERT_REGEX = /(Derek(?: de MPMD)?|MPMD|Huberman|Attia|Masterjohn|Examine(?:\.com)?)/gi;

const highlightText = (text: string) => {
  const parts = text.split(EXPERT_REGEX);
  return parts.map((part, idx) => {
    if (part.match(EXPERT_REGEX)) {
      return (
        <span
          key={`expert-${idx}-${part}`}
          className="rounded-sm bg-blue-50 px-1 font-semibold text-blue-700"
        >
          {part}
        </span>
      );
    }
    return <span key={`text-${idx}`}>{part}</span>;
  });
};

const renderWithHighlights = (children: React.ReactNode) => {
  return (Array.isArray(children) ? children : [children]).map((child, idx) => {
    if (typeof child === "string") {
      return <span key={`hl-${idx}`}>{highlightText(child)}</span>;
    }
    return child;
  });
};

const MarkdownBlock = ({ content }: { content: string }) => {
  if (!content) return null;
  return (
    <ReactMarkdown
      components={{
        h2: ({ children }) => (
          <h2 className="mt-6 text-xl font-semibold" style={{ color: "#0f172a" }}>
            {renderWithHighlights(children)}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-4 text-lg font-semibold" style={{ color: "#0f172a" }}>
            {renderWithHighlights(children)}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mt-3 text-sm leading-7 text-slate-700">
            {renderWithHighlights(children)}
          </p>
        ),
        li: ({ children }) => (
          <li className="mt-2 text-sm leading-6 text-slate-700">
            {renderWithHighlights(children)}
          </li>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-slate-900">
            {renderWithHighlights(children)}
          </strong>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

type AISection = { title: string; content: string };

type AISections = {
  synthesis?: AISection;
  alerts?: AISection;
  systems?: AISection;
  interconnections?: AISection;
  deepDive?: AISection;
  plan90?: AISection;
  nutrition?: AISection;
  supplements?: AISection;
  sources?: AISection;
};

const parseAISections = (markdown: string): AISections => {
  const sections: AISection[] = [];
  const matches = Array.from(
    markdown.matchAll(/^##\s+(.+)\n([\s\S]*?)(?=^##\s+|\s*$)/gm)
  );
  matches.forEach((match) => {
    const title = match[1]?.trim() ?? "";
    const content = match[2]?.trim() ?? "";
    if (title) sections.push({ title, content });
  });

  const getBy = (keyword: string) =>
    sections.find((section) => normalizeText(section.title).includes(keyword));

  return {
    synthesis: getBy("synthese"),
    alerts: getBy("alertes"),
    systems: getBy("systeme"),
    interconnections: getBy("interconnexion"),
    deepDive: getBy("deep dive"),
    plan90: getBy("plan 90"),
    nutrition: getBy("nutrition"),
    supplements: getBy("supplements"),
    sources: getBy("sources scientifiques"),
  };
};

const parseSubsections = (content: string): AISection[] => {
  if (!content) return [];
  const matches = Array.from(
    content.matchAll(/^###\s+(.+)\n([\s\S]*?)(?=^###\s+|\s*$)/gm)
  );
  return matches.map((match) => ({
    title: match[1]?.trim() ?? "",
    content: match[2]?.trim() ?? "",
  }));
};

const formatPercentDiff = (value: number, ref: number) => {
  if (!Number.isFinite(value) || !Number.isFinite(ref) || ref === 0) return null;
  return Math.round(((value - ref) / ref) * 100);
};

const getScoreLabel = (score: number) => {
  if (score < 50) return { label: "Zone rouge", color: "text-red-600" };
  if (score < 70) return { label: "Zone orange", color: "text-amber-600" };
  if (score < 85) return { label: "Zone verte", color: "text-emerald-600" };
  return { label: "Zone bleue", color: "text-blue-600" };
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
  { id: "glossary", label: "Glossaire" },
  { id: "sources", label: "Sources" },
];

function BloodAnalysisReportInner() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const [, navigate] = useLocation();

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

  const aiSections = useMemo(() => parseAISections(reportData?.aiAnalysis || ""), [reportData?.aiAnalysis]);
  const deepDiveItems = useMemo(
    () => parseSubsections(aiSections.deepDive?.content || ""),
    [aiSections.deepDive?.content]
  );

  const criticalMarkers = useMemo(() => {
    if (!reportData) return [];
    const critical = reportData.markers.filter((marker) => marker.status === "critical");
    if (critical.length) return critical.slice(0, 4);
    return reportData.markers.filter((marker) => marker.status === "suboptimal").slice(0, 4);
  }, [reportData]);

  const strongMarkers = useMemo(() => {
    if (!reportData) return [];
    return reportData.markers.filter((marker) => marker.status === "optimal").slice(0, 4);
  }, [reportData]);

  const supplements = reportData?.comprehensiveData?.supplements || [];

  const handleExportPDF = async () => {
    if (!reportId) return;
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
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-center px-6 py-24">
          <div className="rounded-xl border border-slate-200 px-6 py-8 text-center">
            <div className="text-lg font-semibold">Chargement du rapport</div>
            <div className="mt-2 text-sm text-slate-600">Analyse en cours, merci de patienter.</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || !reportData) {
    const isUnauthorized = error instanceof ApiError && error.status === 401;
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="text-lg font-semibold">
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

  if (data.bloodTest.status === "processing") {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <div className="text-lg font-semibold">Analyse en cours</div>
          <p className="mt-2 text-sm text-slate-600">
            Je prepare ton rapport, la page se met a jour automatiquement.
          </p>
          <button
            className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
            onClick={() => refetch()}
          >
            Rafraichir
          </button>
        </div>
      </div>
    );
  }

  const scoreLabel = getScoreLabel(reportData.globalScore);
  const targetScore = Math.min(85, Math.max(reportData.globalScore + 15, 78));

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-600 p-2 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-slate-500">ApexLabs</div>
              <div className="text-lg font-semibold">Rapport sanguin premium</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-semibold">{reportData.patientName}</div>
              <div className="text-xs text-slate-500">{new Date(reportData.createdAt).toLocaleDateString("fr-FR")}</div>
            </div>
            <button
              onClick={handleExportPDF}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Export PDF
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-10">
        <aside className="hidden w-60 flex-shrink-0 lg:block">
          <div className="sticky top-28 rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Navigation</div>
            <nav className="mt-4 space-y-2 text-sm">
              {SECTION_NAV.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <main
          className="w-full max-w-[900px]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif", lineHeight: 1.8 }}
        >
          <section id="introduction" className="scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-blue-600" />
                <h2 className="text-2xl font-semibold" style={{ fontFamily: "Inter, sans-serif" }}>
                  Introduction & guide de lecture
                </h2>
              </div>
              <p className="mt-4 text-sm text-slate-700">
                Bonjour {reportData.patientName},
              </p>
              <p className="mt-3 text-sm text-slate-700">
                Ce rapport analyse tes {reportData.markers.length} marqueurs sanguins pour identifier ce qui
                fonctionne bien et ce qui nécessite une optimisation. Il a été généré par ApexLabs, plateforme
                d'analyse de bilans sanguins orientée santé, performance et composition corporelle.
              </p>
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                  Notre approche combine
                </div>
                <ul className="mt-3 list-disc pl-5 text-sm text-slate-700">
                  <li>Analyse de tes marqueurs vs ranges optimaux (pas juste "normaux")</li>
                  <li>Protocoles basés sur la science et citations d'experts (Derek, Huberman, Attia)</li>
                  <li>Plan d'action personnalisé 90 jours avec résultats attendus chiffrés</li>
                </ul>
              </div>
              <div className="mt-6">
                <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
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
          </section>

          <section id="overview" className="mt-10 scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-blue-600" />
                <h2 className="text-2xl font-semibold" style={{ fontFamily: "Inter, sans-serif" }}>
                  Score global expliqué
                </h2>
              </div>
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Score global</div>
                  <div className="mt-2 text-4xl font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                    {reportData.globalScore}/100
                  </div>
                  <div className={`mt-2 text-sm font-semibold ${scoreLabel.color}`}>{scoreLabel.label}</div>
                  <p className="mt-4 text-sm text-slate-700">
                    Un score de {reportData.globalScore}/100 te place dans la catégorie
                    {" "}
                    <span className="font-semibold text-slate-900">{scoreLabel.label.toLowerCase()}</span>.
                    L'objectif réaliste sur 90 jours est d'atteindre {targetScore}/100.
                  </p>
                  <div className="mt-4 text-xs text-slate-500">
                    0-50: Zone rouge · 50-70: Zone orange · 70-85: Zone verte · 85-100: Zone bleue
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-5">
                  <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                    Tes infos personnelles
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-700">
                    <div>Nom: {reportData.patientName}</div>
                    <div>Age: {reportData.patientAge ?? "Non renseigné"}</div>
                    <div>Poids: {reportData.patient?.poids ? `${reportData.patient.poids} kg` : "Non renseigné"}</div>
                    <div>Taille: {reportData.patient?.taille ? `${reportData.patient.taille} cm` : "Non renseigné"}</div>
                    <div>Sommeil: {reportData.patient?.sleepHours ? `${reportData.patient.sleepHours} h/nuit` : "Non renseigné"}</div>
                    <div>Training: {reportData.patient?.trainingHours ? `${reportData.patient.trainingHours} h/sem` : "Non renseigné"}</div>
                    <div>Stress: {reportData.patient?.stressLevel ? `${reportData.patient.stressLevel}/10` : "Non renseigné"}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="alerts" className="mt-10 scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <h2 className="text-2xl font-semibold" style={{ fontFamily: "Inter, sans-serif" }}>
                  Alertes prioritaires (ce qui nécessite une action rapide)
                </h2>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                Voici les marqueurs qui demandent ton attention immédiate. Chaque alerte est expliquée pour que tu
                comprennes quoi faire, pourquoi, et avec quel impact attendu.
              </p>
              <div className="mt-6 space-y-6">
                {criticalMarkers.map((marker, idx) => {
                  const deepDive = deepDiveItems.find((item) =>
                    normalizeText(item.title).includes(normalizeText(marker.name))
                  );
                  const diffNormal =
                    marker.normalMax !== null && marker.value > marker.normalMax
                      ? formatPercentDiff(marker.value, marker.normalMax)
                      : null;
                  const diffOptimal =
                    marker.optimalMax !== null && marker.value > marker.optimalMax
                      ? formatPercentDiff(marker.value, marker.optimalMax)
                      : null;

                  return (
                    <div key={`${marker.code}-${idx}`} className="rounded-2xl border border-slate-200 p-6">
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                          🚨 Alerte #{idx + 1}: {marker.name.toUpperCase()}
                        </div>
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                          {marker.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
                        <div>
                          <div className="text-xs uppercase text-slate-500">Ta valeur</div>
                          <div className="mt-1 font-semibold text-slate-900">{formatValue(marker.value, marker.unit)}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase text-slate-500">Range normal</div>
                          <div className="mt-1 font-semibold text-slate-900">
                            {marker.normalMin ?? "-"} - {marker.normalMax ?? "-"} {marker.unit}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase text-slate-500">Range optimal</div>
                          <div className="mt-1 font-semibold text-slate-900">
                            {marker.optimalMin ?? "-"} - {marker.optimalMax ?? "-"} {marker.unit}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase text-slate-500">Ton statut</div>
                          <div className="mt-1 font-semibold text-slate-900">
                            {diffNormal !== null ? `${diffNormal}% au-dessus du normal` : "Hors optimal"}
                            {diffOptimal !== null ? ` · ${diffOptimal}% au-dessus de l'optimal` : ""}
                          </div>
                        </div>
                      </div>
                      {deepDive?.content ? (
                        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Analyse personnalisée
                          </div>
                          <MarkdownBlock content={deepDive.content} />
                        </div>
                      ) : (
                        <div className="mt-4 text-sm text-slate-600">
                          Analyse détaillée indisponible pour ce marqueur.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="strengths" className="mt-10 scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <h2 className="text-2xl font-semibold" style={{ fontFamily: "Inter, sans-serif" }}>
                  Tes forces (ce qui fonctionne déjà)
                </h2>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                Ces marqueurs sont solides. On va s'appuyer dessus pour accélérer le reste de ta progression.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {strongMarkers.map((marker) => (
                  <div key={marker.code} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                      {marker.name} ({formatValue(marker.value, marker.unit)})
                    </div>
                    <p className="mt-2 text-sm text-slate-700">
                      Ton {marker.name.toLowerCase()} est dans la zone optimale. Continue tes habitudes actuelles
                      pour maintenir ce point fort.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="systems" className="mt-10 scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-blue-600" />
                <h2 className="text-2xl font-semibold" style={{ fontFamily: "Inter, sans-serif" }}>
                  Analyse système par système
                </h2>
              </div>
              <MarkdownBlock content={aiSections.systems?.content || ""} />
            </div>
          </section>

          <section id="interconnections" className="mt-10 scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-blue-600" />
                <h2 className="text-2xl font-semibold" style={{ fontFamily: "Inter, sans-serif" }}>
                  Interconnexions clés
                </h2>
              </div>
              <MarkdownBlock content={aiSections.interconnections?.content || ""} />
            </div>
          </section>

          <section id="protocol" className="mt-10 scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-blue-600" />
                <h2 className="text-2xl font-semibold" style={{ fontFamily: "Inter, sans-serif" }}>
                  Protocole 90 jours (phase par phase)
                </h2>
              </div>
              <MarkdownBlock content={aiSections.plan90?.content || ""} />

              <div className="mt-8">
                <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                  Recommandations supplements (format actionnable)
                </div>
                <div className="mt-4 space-y-4">
                  {supplements.map((supp: any, idx: number) => (
                    <div key={`${supp.name}-${idx}`} className="rounded-xl border border-slate-200 p-4">
                      <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                        {supp.name}
                      </div>
                      <div className="mt-2 text-sm text-slate-700">
                        <div>✅ QUOI: {supp.name}</div>
                        <div>🎯 POURQUOI: {supp.mechanism || "Optimiser tes marqueurs prioritaires."}</div>
                        <div>
                          📊 COMMENT: {supp.dosage} · {supp.timing}
                          {supp.brand ? ` · Marque: ${supp.brand}` : ""}
                        </div>
                        <div>🕐 QUAND: {supp.priority === 1 ? "Phase d'attaque" : "Phase d'optimisation"}</div>
                        <div>📈 IMPACT: Amélioration attendue sur marqueurs ciblés.</div>
                        <div>
                          💬 EXPERT: {supp.citations && supp.citations.length ? highlightText(supp.citations[0]) : "-"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="glossary" className="mt-10 scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <h2 className="text-2xl font-semibold" style={{ fontFamily: "Inter, sans-serif" }}>
                  Glossaire & explications
                </h2>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                Ce glossaire vulgarise les termes techniques utilisés dans ton rapport.
              </p>
              <div className="mt-6 space-y-4">
                {glossaryEntries.map((entry) => (
                  <div key={entry.term} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                      {entry.term}
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{entry.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="sources" className="mt-10 scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <h2 className="text-2xl font-semibold" style={{ fontFamily: "Inter, sans-serif" }}>
                  Sources scientifiques
                </h2>
              </div>
              {aiSections.sources?.content ? (
                <MarkdownBlock content={aiSections.sources.content} />
              ) : (
                <p className="mt-3 text-sm text-slate-700">
                  Sources disponibles dans la base scientifique ApexLabs.
                </p>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default function BloodAnalysisReport() {
  return <BloodAnalysisReportInner />;
}
