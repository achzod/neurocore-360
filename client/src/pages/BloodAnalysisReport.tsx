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
  dataQuality?: AISection;
  dashboard?: AISection;
  recomposition?: AISection;
  axes?: AISection;
  interconnections?: AISection;
  deepDive?: AISection;
  plan90?: AISection;
  nutrition?: AISection;
  supplements?: AISection;
  annexes?: AISection;
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

  // Match new Achzod-style section names
  return {
    synthesis: getBy("synthese executive") || getBy("synthese"),
    dataQuality: getBy("qualite des donnees") || getBy("limites"),
    dashboard: getBy("tableau de bord"),
    recomposition: getBy("potentiel recomposition") || getBy("recomposition"),
    axes: getBy("lecture compartimentee") || getBy("axes") || getBy("systeme"),
    interconnections: getBy("interconnexion"),
    deepDive: getBy("deep dive"),
    plan90: getBy("plan d'action") || getBy("plan 90"),
    nutrition: getBy("nutrition"),
    supplements: getBy("supplements"),
    annexes: getBy("annexes") || getBy("annexe"),
    sources: getBy("sources scientifiques") || getBy("sources"),
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

// Dynamic glossary - maps marker codes to definitions
const GLOSSARY_DATABASE: Record<string, { term: string; definition: string }> = {
  homa_ir: {
    term: "HOMA-IR",
    definition: "Indice de resistance a l'insuline calcule a partir de la glycemie et de l'insuline a jeun. >3 indique une resistance insulinique installee.",
  },
  insuline: {
    term: "Insuline",
    definition: "Hormone pancreatique qui regule la glycemie. Un taux eleve a jeun indique une resistance insulinique.",
  },
  glycemie: {
    term: "Glycemie a jeun",
    definition: "Taux de sucre dans le sang a jeun. Entre 70-100 mg/dL est optimal.",
  },
  hba1c: {
    term: "HbA1c",
    definition: "Hemoglobine glyquee - reflete la glycemie moyenne des 3 derniers mois. <5.7% est optimal.",
  },
  triglycerides: {
    term: "Triglycerides",
    definition: "Graisses circulantes. Un taux eleve indique souvent un exces de glucides et/ou d'alcool.",
  },
  ldl: {
    term: "LDL-Cholesterol",
    definition: "Cholesterol transporte vers les tissus. Trop eleve = risque atherosclerose.",
  },
  hdl: {
    term: "HDL-Cholesterol",
    definition: "Bon cholesterol qui nettoie les arteres. Plus c'est haut, mieux c'est.",
  },
  crp_us: {
    term: "CRP ultrasensible",
    definition: "Marqueur d'inflammation systemique. <1 mg/L est optimal pour la sante cardiovasculaire.",
  },
  vitamine_d: {
    term: "Vitamine D (25-OH)",
    definition: "Hormone essentielle pour les os, l'immunite et les hormones. Vise 50-80 ng/mL.",
  },
  testosterone_total: {
    term: "Testosterone totale",
    definition: "Hormone anabolique principale chez l'homme. Impacte muscle, energie, libido.",
  },
  tsh: {
    term: "TSH",
    definition: "Hormone thyreostimulante. Elevee = thyroide ralentie (hypothyroidie).",
  },
  t4_libre: {
    term: "T4 Libre",
    definition: "Hormone thyroidienne inactive. Convertie en T3 active dans les tissus.",
  },
  t3_libre: {
    term: "T3 Libre",
    definition: "Hormone thyroidienne active. Regule metabolisme, energie, perte de gras.",
  },
  ggt: {
    term: "GGT",
    definition: "Enzyme hepatique sensible au stress oxydatif et a l'alcool. Marqueur precoce de souffrance hepatique.",
  },
  ferritine: {
    term: "Ferritine",
    definition: "Reserve de fer dans l'organisme. Basse = carence, tres elevee = inflammation ou surcharge.",
  },
  creatinine: {
    term: "Creatinine",
    definition: "Dechet musculaire elimine par les reins. Taux eleve = filtration renale diminuee.",
  },
};

// Generate glossary dynamically from markers
const buildGlossary = (markers: BloodMarker[]) => {
  const entries: Array<{ term: string; definition: string }> = [];
  const seenTerms = new Set<string>();

  markers.forEach((marker) => {
    const key = marker.code.toLowerCase();
    if (GLOSSARY_DATABASE[key] && !seenTerms.has(key)) {
      seenTerms.add(key);
      entries.push(GLOSSARY_DATABASE[key]);
    }
  });

  // Always add common terms
  const commonTerms = ["homa_ir", "crp_us", "ggt"];
  commonTerms.forEach((key) => {
    if (GLOSSARY_DATABASE[key] && !seenTerms.has(key)) {
      seenTerms.add(key);
      entries.push(GLOSSARY_DATABASE[key]);
    }
  });

  return entries;
};

const SECTION_NAV = [
  { id: "introduction", label: "Introduction" },
  { id: "overview", label: "Synthese executive" },
  { id: "data-quality", label: "Qualite des donnees" },
  { id: "dashboard", label: "Tableau de bord" },
  { id: "recomposition", label: "Potentiel recomposition" },
  { id: "axes", label: "Lecture par axes" },
  { id: "interconnections", label: "Interconnexions" },
  { id: "protocol", label: "Plan d'action 90j" },
  { id: "full-report", label: "Rapport complet" },
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

  // Force light theme for blood report (white background only)
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Remove dark class and add light
    root.classList.remove("dark");
    root.classList.add("light");

    // Force white background with inline style (overrides all CSS)
    const previousBodyBg = body.style.backgroundColor;
    const previousBodyColor = body.style.color;
    body.style.backgroundColor = "#ffffff";
    body.style.color = "#0f172a"; // slate-900

    return () => {
      // Restore previous theme and styles on unmount
      const storedTheme = localStorage.getItem("neurocore-theme");
      root.classList.remove("light");
      if (storedTheme === "dark") {
        root.classList.add("dark");
      }
      body.style.backgroundColor = previousBodyBg;
      body.style.color = previousBodyColor;
    };
  }, []);

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
  const hasAISections = useMemo(
    () => Object.values(aiSections).some((section) => Boolean(section?.content)),
    [aiSections]
  );
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

  const glossaryEntries = useMemo(() => {
    if (!reportData) return [];
    return buildGlossary(reportData.markers);
  }, [reportData]);

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
        {/* Desktop sidebar */}
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

        {/* Mobile bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white p-2 lg:hidden">
          <div className="flex gap-1 overflow-x-auto pb-safe">
            {SECTION_NAV.slice(0, 6).map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex-shrink-0 rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200"
              >
                {section.label}
              </a>
            ))}
          </div>
        </nav>

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
              {aiSections.synthesis?.content ? (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                    Synthèse exécutive personnalisée
                  </div>
                  <MarkdownBlock content={aiSections.synthesis.content} />
                </div>
              ) : null}
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

          <section id="data-quality" className="mt-10 scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-amber-500" />
                <h2 className="text-2xl font-semibold" style={{ fontFamily: "Inter, sans-serif" }}>
                  Qualite des donnees et limites
                </h2>
              </div>
              {aiSections.dataQuality?.content ? (
                <div className="mt-4">
                  <MarkdownBlock content={aiSections.dataQuality.content} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-600">
                  Cette section detaille les limites de l'analyse et les marqueurs manquants.
                  Consulte le rapport complet ci-dessous.
                </p>
              )}
            </div>
          </section>

          <section id="dashboard" className="mt-10 scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-blue-600" />
                <h2 className="text-2xl font-semibold" style={{ fontFamily: "Inter, sans-serif" }}>
                  Tableau de bord - Priorites
                </h2>
              </div>
              {aiSections.dashboard?.content ? (
                <div className="mt-4">
                  <MarkdownBlock content={aiSections.dashboard.content} />
                </div>
              ) : (
                <>
                  <p className="mt-4 text-sm text-slate-700">
                    Voici tes marqueurs classes par priorite d'action.
                  </p>
                  <div className="mt-6 space-y-4">
                    {criticalMarkers.length ? (
                      criticalMarkers.map((marker, idx) => (
                        <div key={`${marker.code}-${idx}`} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="font-medium text-slate-900">{marker.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-600">{formatValue(marker.value, marker.unit)}</span>
                            <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
                              {marker.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        Aucun marqueur critique detecte.
                      </div>
                    )}
                    {strongMarkers.length ? (
                      strongMarkers.map((marker) => (
                        <div key={marker.code} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="font-medium text-slate-900">{marker.name}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-600">{formatValue(marker.value, marker.unit)}</span>
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">
                              OPTIMAL
                            </span>
                          </div>
                        </div>
                      ))
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </section>

          <section id="recomposition" className="mt-10 scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-purple-600" />
                <h2 className="text-2xl font-semibold" style={{ fontFamily: "Inter, sans-serif" }}>
                  Potentiel recomposition corporelle
                </h2>
              </div>
              {aiSections.recomposition?.content ? (
                <div className="mt-4">
                  <MarkdownBlock content={aiSections.recomposition.content} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-600">
                  Cette section analyse ton potentiel de recomposition corporelle (prise de muscle / perte de gras).
                  Consulte le rapport complet ci-dessous.
                </p>
              )}
            </div>
          </section>

          <section id="axes" className="mt-10 scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-3">
                <Info className="h-5 w-5 text-blue-600" />
                <h2 className="text-2xl font-semibold" style={{ fontFamily: "Inter, sans-serif" }}>
                  Lecture compartimentee par axes
                </h2>
              </div>
              <p className="mt-3 text-sm text-slate-700">
                Analyse detaillee de chaque systeme physiologique: muscle, metabolisme, lipides, thyroide, foie, reins, inflammation, hematologie.
              </p>
              {aiSections.axes?.content ? (
                <div className="mt-4">
                  <MarkdownBlock content={aiSections.axes.content} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-600">
                  L'analyse par axes est disponible dans le rapport complet ci-dessous.
                </p>
              )}
              {aiSections.deepDive?.content ? (
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                    Deep dive (explications detaillees)
                  </div>
                  <MarkdownBlock content={aiSections.deepDive.content} />
                </div>
              ) : null}
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
              {!aiSections.interconnections?.content && (
                <p className="mt-4 text-sm text-slate-600">
                  Les interconnexions détaillées sont disponibles dans le rapport complet.
                </p>
              )}
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
              {!aiSections.plan90?.content && (
                <p className="mt-4 text-sm text-slate-600">
                  Le plan 90 jours est en cours de génération et apparaît dans le rapport complet.
                </p>
              )}

              {aiSections.nutrition?.content ? (
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                    Nutrition & lifestyle
                  </div>
                  <MarkdownBlock content={aiSections.nutrition.content} />
                </div>
              ) : null}

              {aiSections.supplements?.content ? (
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                    Suppléments (contexte scientifique)
                  </div>
                  <MarkdownBlock content={aiSections.supplements.content} />
                </div>
              ) : null}

              <div className="mt-8">
                <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                  Recommandations supplements (format actionnable)
                </div>
                <div className="mt-4 space-y-4">
                  {supplements.length ? (
                    supplements.map((supp: any, idx: number) => (
                      <div key={`${supp.name}-${idx}`} className="rounded-xl border border-slate-200 p-4">
                        <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                          {supp.name}
                        </div>
                        <div className="mt-2 text-sm text-slate-700 space-y-1">
                          <div><span className="font-medium text-slate-900">QUOI:</span> {supp.name}</div>
                          <div><span className="font-medium text-slate-900">POURQUOI:</span> {supp.mechanism || "Optimiser tes marqueurs prioritaires."}</div>
                          <div>
                            <span className="font-medium text-slate-900">COMMENT:</span> {supp.dosage} · {supp.timing}
                            {supp.brand ? ` · Marque: ${supp.brand}` : ""}
                          </div>
                          <div><span className="font-medium text-slate-900">QUAND:</span> {supp.priority === 1 ? "Phase d'attaque" : "Phase d'optimisation"}</div>
                          <div><span className="font-medium text-slate-900">IMPACT:</span> Amelioration attendue sur marqueurs cibles.</div>
                          <div>
                            <span className="font-medium text-slate-900">EXPERT:</span> {supp.citations && supp.citations.length ? highlightText(supp.citations[0]) : "-"}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      Aucun supplément recommandé pour ce profil.
                    </div>
                  )}
                </div>
              </div>

              {protocols.length ? (
                <div className="mt-8">
                  <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                    Protocoles lifestyle & training
                  </div>
                  <div className="mt-4 space-y-4">
                    {protocols.map((protocol: any, idx: number) => (
                      <div key={`${protocol.name}-${idx}`} className="rounded-xl border border-slate-200 p-4">
                        <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                          {protocol.name}
                        </div>
                        <div className="mt-2 text-sm text-slate-700 space-y-1">
                          <div><span className="font-medium text-slate-900">QUOI:</span> {protocol.description || protocol.name}</div>
                          <div>
                            <span className="font-medium text-slate-900">POURQUOI:</span> {protocol.scienceContext || protocol.expectedOutcome || "Optimiser tes marqueurs."}
                          </div>
                          <div>
                            <span className="font-medium text-slate-900">COMMENT:</span>{" "}
                            {protocol.steps && protocol.steps.length ? protocol.steps.join(" · ") : protocol.frequency}
                          </div>
                          <div><span className="font-medium text-slate-900">QUAND:</span> {protocol.duration || "Phase actuelle"}</div>
                          <div><span className="font-medium text-slate-900">IMPACT:</span> {protocol.expectedOutcome || "Amelioration attendue sur tes objectifs."}</div>
                          <div>
                            <span className="font-medium text-slate-900">EXPERT:</span>{" "}
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
          </section>

          <section id="full-report" className="mt-10 scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 bg-white p-8">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-2xl font-semibold" style={{ fontFamily: "Inter, sans-serif" }}>
                  Rapport complet (texte intégral)
                </h2>
              </div>
              {hasAISections ? (
                <div className="mt-4 space-y-6 text-sm text-slate-700">
                  {aiSections.synthesis?.content && <MarkdownBlock content={aiSections.synthesis.content} />}
                  {aiSections.dataQuality?.content && <MarkdownBlock content={aiSections.dataQuality.content} />}
                  {aiSections.dashboard?.content && <MarkdownBlock content={aiSections.dashboard.content} />}
                  {aiSections.recomposition?.content && <MarkdownBlock content={aiSections.recomposition.content} />}
                  {aiSections.axes?.content && <MarkdownBlock content={aiSections.axes.content} />}
                  {aiSections.interconnections?.content && <MarkdownBlock content={aiSections.interconnections.content} />}
                  {aiSections.deepDive?.content && <MarkdownBlock content={aiSections.deepDive.content} />}
                  {aiSections.plan90?.content && <MarkdownBlock content={aiSections.plan90.content} />}
                  {aiSections.nutrition?.content && <MarkdownBlock content={aiSections.nutrition.content} />}
                  {aiSections.supplements?.content && <MarkdownBlock content={aiSections.supplements.content} />}
                  {aiSections.annexes?.content && <MarkdownBlock content={aiSections.annexes.content} />}
                  {aiSections.sources?.content && <MarkdownBlock content={aiSections.sources.content} />}
                </div>
              ) : (
                <MarkdownBlock content={reportData.aiAnalysis} />
              )}
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
                Ce glossaire vulgarise les termes techniques de tes marqueurs.
              </p>
              <div className="mt-6 space-y-4">
                {glossaryEntries.length ? (
                  glossaryEntries.map((entry) => (
                    <div key={entry.term} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Inter, sans-serif" }}>
                        {entry.term}
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{entry.definition}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">Aucun terme technique a definir pour ce rapport.</p>
                )}
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
