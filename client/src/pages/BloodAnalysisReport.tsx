import { useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientHeader } from "@/components/client/ClientHeader";
import { BloodRadar } from "@/components/blood/BloodRadar";
import { StatusBadge } from "@/components/blood/StatusBadge";
import { BiomarkerRangeIndicator } from "@/components/blood/BiomarkerRangeIndicator";
import { StatusIndicator } from "@/components/blood/StatusIndicator";
import { AlertTriangle, ArrowUpRight, FileText, LineChart, RefreshCcw, Shield, Upload } from "lucide-react";
import { LineChart as RechartLineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

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
    globalScore: number;
    categoryScores?: Record<string, number>;
    systemScores?: Record<string, number>;
    temporalRisk?: { score: number; level: string; critical: number; warning: number };
    summary?: { optimal: string[]; watch: string[]; action: string[] };
    patterns?: Array<{ name: string; causes: string[]; protocol: string[] }>;
    recommendations?: {
      priority1: Array<{ action: string; dosage?: string; timing?: string; why: string }>;
      priority2: Array<{ action: string; dosage?: string; timing?: string; why: string }>;
    };
    followUp?: Array<{ test: string; delay: string; objective: string }>;
    alerts?: string[];
    aiAnalysis?: string;
    protocolPhases?: Array<{ id: string; title: string; items: string[] }>;
    patient?: {
      prenom?: string;
      nom?: string;
      email?: string;
      gender?: string;
      dob?: string;
    };
  };
};

type BloodTestSummary = {
  id: string;
  fileName: string;
  uploadedAt: string;
  status: string;
  globalScore: number | null;
  globalLevel: string | null;
};

type BloodTestsResponse = { bloodTests: BloodTestSummary[] };

type SystemKey =
  | "cardio"
  | "hormonal"
  | "metabolic"
  | "inflammatory"
  | "hepatic"
  | "renal"
  | "hemato"
  | "thyroid";

const SYSTEM_META: Record<SystemKey, { label: string; description: string }> = {
  cardio: {
    label: "Cardio",
    description: "Profil lipidique, ApoB, risque cardiovasculaire.",
  },
  hormonal: {
    label: "Hormonal",
    description: "Testosterone, cortisol, axes gonadiques.",
  },
  metabolic: {
    label: "Metabolique",
    description: "Glycemie, insuline, rendement energetique.",
  },
  inflammatory: {
    label: "Inflammatoire",
    description: "Inflammation systemique et stress oxydatif.",
  },
  hepatic: {
    label: "Hepatique",
    description: "Foie, detox, enzymes hepatiques.",
  },
  renal: {
    label: "Renal",
    description: "Filtration renale, creatinine, eGFR.",
  },
  hemato: {
    label: "Hemato",
    description: "Fer, ferritine, vitamines sanguines.",
  },
  thyroid: {
    label: "Thyroide",
    description: "TSH, T3/T4, regulation endocrine.",
  },
};

const SYSTEM_ORDER: SystemKey[] = [
  "cardio",
  "hormonal",
  "metabolic",
  "inflammatory",
  "hepatic",
  "renal",
  "hemato",
  "thyroid",
];

const SYSTEM_BY_MARKER: Record<string, SystemKey> = {
  hdl: "cardio",
  ldl: "cardio",
  triglycerides: "cardio",
  apob: "cardio",
  lpa: "cardio",
  homocysteine: "cardio",
  crp_us: "inflammatory",
  ferritine: "hemato",
  fer_serique: "hemato",
  transferrine_sat: "hemato",
  vitamine_d: "hemato",
  b12: "hemato",
  folate: "hemato",
  magnesium_rbc: "hemato",
  zinc: "hemato",
  testosterone_total: "hormonal",
  testosterone_libre: "hormonal",
  shbg: "hormonal",
  estradiol: "hormonal",
  lh: "hormonal",
  fsh: "hormonal",
  prolactine: "hormonal",
  dhea_s: "hormonal",
  cortisol: "hormonal",
  igf1: "hormonal",
  glycemie_jeun: "metabolic",
  hba1c: "metabolic",
  insuline_jeun: "metabolic",
  homa_ir: "metabolic",
  tsh: "thyroid",
  t4_libre: "thyroid",
  t3_libre: "thyroid",
  t3_reverse: "thyroid",
  anti_tpo: "thyroid",
  alt: "hepatic",
  ast: "hepatic",
  ggt: "hepatic",
  creatinine: "renal",
  egfr: "renal",
};

const statusScore: Record<MarkerStatus, number> = {
  optimal: 100,
  normal: 80,
  suboptimal: 55,
  critical: 30,
};
const statusRank: Record<MarkerStatus, number> = {
  critical: 0,
  suboptimal: 1,
  normal: 2,
  optimal: 3,
};

const compactLabel = (label: string) => {
  const cleaned = label.replace(/\s*\(.*?\)\s*/g, "").trim();
  if (cleaned.length <= 14) return cleaned;
  return `${cleaned.slice(0, 12)}…`;
};

const buildSystemNarrative = (label: string, items: BloodTestDetail["markers"], score: number) => {
  if (!items.length) {
    return `Pas assez de donnees pour lire ton systeme ${label.toLowerCase()}.`;
  }
  const ordered = [...items].sort((a, b) => statusRank[a.status] - statusRank[b.status]);
  const worst = ordered[0];
  const best = ordered.find((item) => item.status === "optimal");
  const criticalCount = items.filter((item) => item.status === "critical").length;
  const suboptimalCount = items.filter((item) => item.status === "suboptimal").length;
  const tone =
    score >= 80
      ? "solide"
      : score >= 70
      ? "stable"
      : score >= 60
      ? "fragile"
      : "prioritaire";

  const headline = `Ton systeme ${label.toLowerCase()} est ${tone} (${score}/100).`;
  const alerts =
    criticalCount > 0
      ? `Tu as ${criticalCount} signal${criticalCount > 1 ? "s" : ""} critique${
          criticalCount > 1 ? "s" : ""
        } a corriger.`
      : suboptimalCount > 0
      ? `${suboptimalCount} levier${suboptimalCount > 1 ? "s" : ""} d'optimisation clair${
          suboptimalCount > 1 ? "s" : ""
        }.`
      : "Rien d'urgent, l'objectif est de consolider.";
  const highlight = worst
    ? `Point cle: ${worst.name} a ${worst.value} ${worst.unit}.`
    : "Point cle: donnees insuffisantes.";
  const positive = best ? `Bon signal: ${best.name} est dans ta zone optimale.` : "";

  return [headline, alerts, highlight, positive].filter(Boolean).join(" ");
};

const getAdminKey = () => {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("key");
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const token = localStorage.getItem("apexlabs_token");
  const adminKey = getAdminKey();
  const requestUrl = adminKey
    ? `${url}${url.includes("?") ? "&" : "?"}key=${encodeURIComponent(adminKey)}`
    : url;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (adminKey) headers["x-admin-key"] = adminKey;
  const res = await fetch(requestUrl, {
    headers: Object.keys(headers).length ? headers : undefined,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
};

const fetchDetail = async (id: string): Promise<BloodTestDetail> => {
  return fetcher(`/api/blood-tests/${id}`);
};

const fetchMe = async (): Promise<{ user: { credits: number } }> => {
  return fetcher("/api/me");
};

const fetchTests = async (): Promise<BloodTestsResponse> => {
  return fetcher("/api/blood-tests");
};

const getScoreLevel = (score: number) => {
  if (score >= 90) return { label: "Exceptionnel", tone: "optimal" };
  if (score >= 80) return { label: "Tres bien", tone: "optimal" };
  if (score >= 70) return { label: "Correct", tone: "normal" };
  if (score >= 60) return { label: "Attention", tone: "suboptimal" };
  return { label: "Prioritaire", tone: "critical" };
};

const getScoreMessage = (score: number) => {
  if (score >= 90) return "Exceptionnel - Tu es une machine";
  if (score >= 80) return "Tres bien - Quelques optimisations possibles";
  if (score >= 70) return "Correct - Des axes d'amelioration clairs";
  if (score >= 60) return "Attention - Actions recommandees";
  return "Prioritaire - Consulte un professionnel";
};

const getPercentile = (score: number) => {
  if (score >= 90) return 10;
  if (score >= 80) return 20;
  if (score >= 70) return 35;
  if (score >= 60) return 50;
  return 70;
};

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.08, duration: 0.4, ease: "easeOut" },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export default function BloodAnalysisReport() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const adminKey = getAdminKey();

  const { data: me } = useQuery({
    queryKey: ["/api/me"],
    queryFn: fetchMe,
    enabled: !adminKey,
    onError: () => {
      if (!adminKey) {
        navigate("/auth/login");
      }
    },
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: [`/api/blood-tests/${id}`],
    queryFn: () => fetchDetail(id || ""),
    enabled: Boolean(id),
    onError: () => navigate("/auth/login"),
  });

  const { data: tests } = useQuery({
    queryKey: ["/api/blood-tests"],
    queryFn: fetchTests,
    onError: () => undefined,
  });

  const markers = data?.markers || [];
  const analysis = data?.analysis;
  const fallbackScore = useMemo(() => {
    if (!markers.length) return 0;
    const values = markers.map((marker) => statusScore[marker.status]);
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  }, [markers]);
  const rawGlobalScore = analysis?.globalScore ?? data?.bloodTest.globalScore ?? null;
  const globalScore =
    rawGlobalScore === null || (rawGlobalScore === 0 && markers.length > 0)
      ? fallbackScore
      : rawGlobalScore;
  const patient = (data?.bloodTest?.patient || analysis?.patient || {}) as {
    prenom?: string;
    nom?: string;
    email?: string;
    gender?: string;
    dob?: string;
  };
  const patientLabel = [patient.prenom, patient.nom].filter(Boolean).join(" ") || "Anonyme";

  const groupedBySystem = useMemo(() => {
    const groups: Record<SystemKey, typeof markers> = {
      cardio: [],
      hormonal: [],
      metabolic: [],
      inflammatory: [],
      hepatic: [],
      renal: [],
      hemato: [],
      thyroid: [],
    };
    markers.forEach((marker) => {
      const system = SYSTEM_BY_MARKER[marker.code] || "metabolic";
      groups[system].push(marker);
    });
    return groups;
  }, [markers]);

  const systemScores = useMemo(() => {
    const scores: Partial<Record<SystemKey, number>> = {};
    SYSTEM_ORDER.forEach((system) => {
      const items = groupedBySystem[system];
      if (!items.length) {
        scores[system] = 0;
        return;
      }
      const avg =
        items.reduce((sum, item) => sum + statusScore[item.status], 0) /
        items.length;
      scores[system] = Math.round(avg);
    });
    if (analysis?.systemScores && Object.keys(analysis.systemScores).length > 0) {
      return {
        ...scores,
        ...(analysis.systemScores as Record<SystemKey, number>),
      } as Record<SystemKey, number>;
    }
    return scores as Record<SystemKey, number>;
  }, [analysis?.systemScores, groupedBySystem]);

  const systemRadarData = useMemo(() => {
    const data: Partial<Record<SystemKey, { key: string; label: string; score: number; status: MarkerStatus }[]>> = {};
    SYSTEM_ORDER.forEach((system) => {
      const items = groupedBySystem[system];
      if (!items.length) return;
      const ordered = [...items].sort((a, b) => statusRank[a.status] - statusRank[b.status]);
      const selected = ordered.slice(0, Math.min(6, ordered.length));
      data[system] = selected.map((marker) => ({
        key: marker.code,
        label: compactLabel(marker.name),
        score: statusScore[marker.status],
        status: marker.status,
      }));
    });
    return data as Record<SystemKey, { key: string; label: string; score: number; status: MarkerStatus }[]>;
  }, [groupedBySystem]);

  const systemNarratives = useMemo(() => {
    const narratives: Partial<Record<SystemKey, string>> = {};
    SYSTEM_ORDER.forEach((system) => {
      const items = groupedBySystem[system];
      if (!items.length) return;
      narratives[system] = buildSystemNarrative(SYSTEM_META[system].label, items, systemScores[system] ?? 0);
    });
    return narratives as Record<SystemKey, string>;
  }, [groupedBySystem, systemScores]);

  const radarData = useMemo(() => {
    return SYSTEM_ORDER.map((system) => ({
      key: system,
      label: SYSTEM_META[system].label,
      score: systemScores[system] ?? 0,
      status:
        (systemScores[system] ?? 0) >= 80
          ? "optimal"
          : (systemScores[system] ?? 0) >= 65
          ? "normal"
          : (systemScores[system] ?? 0) >= 45
          ? "suboptimal"
          : "critical",
    }));
  }, [systemScores]);

  const critical = markers.filter((marker) => marker.status === "critical");
  const warning = markers.filter((marker) => marker.status === "suboptimal");
  const summary = analysis?.summary || {
    optimal: markers.filter((marker) => marker.status === "optimal").map((marker) => marker.name),
    watch: markers.filter((marker) => marker.status === "normal").map((marker) => marker.name),
    action: markers
      .filter((marker) => marker.status === "suboptimal" || marker.status === "critical")
      .map((marker) => marker.name),
  };
  const riskScore = analysis?.temporalRisk?.score ?? Math.min(100, critical.length * 20 + warning.length * 10);
  const riskLabel = analysis?.temporalRisk?.level || getScoreLevel(100 - riskScore).label;

  const orderedTests = useMemo(() => {
    if (!tests?.bloodTests?.length) return [];
    return [...tests.bloodTests].sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }, [tests?.bloodTests]);

  const currentIndex = orderedTests.findIndex((test) => test.id === data?.bloodTest.id);
  const previousTest = currentIndex >= 0 ? orderedTests[currentIndex + 1] : undefined;
  const trendDelta =
    previousTest && data?.bloodTest.globalScore !== null && previousTest.globalScore !== null
      ? data.bloodTest.globalScore - previousTest.globalScore
      : null;

  const age = patient.dob ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / 31557600000) : null;
  const ageBio = age ? Math.max(18, Math.round(age - (globalScore - 70) / 5)) : null;

  const protocolPhases =
    analysis?.protocolPhases && analysis.protocolPhases.length > 0
      ? analysis.protocolPhases
      : [
          {
            id: "phase-1",
            title: "Jours 1-30",
            items: analysis?.recommendations?.priority1?.map((rec) => rec.action) || [],
          },
          {
            id: "phase-2",
            title: "Jours 31-90",
            items: analysis?.recommendations?.priority2?.map((rec) => rec.action) || [],
          },
          {
            id: "phase-3",
            title: "Jours 91-180",
            items: analysis?.followUp?.map((item) => item.test) || [],
          },
        ].filter((phase) => phase.items.length > 0);

  const quickWins = useMemo(() => {
    const actions = analysis?.recommendations?.priority1 || [];
    if (actions.length) {
      return actions.slice(0, 3).map((item, index) => ({
        action: item.action,
        impact: `Impact estime: +${4 + index} pts en 8 semaines`,
      }));
    }
    const fallback = [...critical, ...warning].slice(0, 3);
    return fallback.map((marker, index) => ({
      action: `Corriger ${marker.name} en priorite`,
      impact: `Impact estime: +${3 + index} pts en 8 semaines`,
    }));
  }, [analysis?.recommendations?.priority1, critical, warning]);

  const fallbackAiAnalysis = useMemo(() => {
    const optimal = summary.optimal.slice(0, 6).join(", ") || "Aucun";
    const watch = summary.watch.slice(0, 6).join(", ") || "Aucun";
    const action = summary.action.slice(0, 6).join(", ") || "Aucune";
    const phase1 = protocolPhases[0]?.items || [];
    const phase2 = protocolPhases[1]?.items || [];
    const phase3 = protocolPhases[2]?.items || [];
    const followUp = analysis?.followUp?.map((item) => `- ${item.test} - ${item.delay}`) || [];

    return [
      "## Synthese executive",
      `- Optimal: ${optimal}`,
      `- A surveiller: ${watch}`,
      `- Action requise: ${action}`,
      `- Lecture globale: Ton score global est de ${globalScore}/100, il reste des axes cles a stabiliser.`,
      "",
      "## Protocoles 180 jours",
      "### Jours 1-30",
      ...(phase1.length ? phase1.map((item) => `- ${item}`) : ["- Stabiliser sommeil, hydratation, apports proteiques."]),
      "### Jours 31-90",
      ...(phase2.length ? phase2.map((item) => `- ${item}`) : ["- Optimiser activite, stress et nutrition."]),
      "### Jours 91-180",
      ...(phase3.length ? phase3.map((item) => `- ${item}`) : ["- Consolider les routines et re-tester."]),
      "",
      "## Controles a prevoir",
      ...(followUp.length ? followUp : ["- Aucun controle prioritaire pour l'instant."]),
    ].join("\n");
  }, [analysis?.followUp, globalScore, protocolPhases, summary.action, summary.optimal, summary.watch]);

  const aiAnalysis =
    analysis?.aiAnalysis && analysis.aiAnalysis.trim() ? analysis.aiAnalysis : fallbackAiAnalysis;

  const expertIntro = useMemo(() => {
    const plain = aiAnalysis
      .replace(/[#>*`_-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!plain) return "Je consolide la lecture experte de ton bilan.";
    return plain.length > 260 ? `${plain.slice(0, 260)}…` : plain;
  }, [aiAnalysis]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] text-slate-900 flex items-center justify-center">
        Chargement...
      </div>
    );
  }

  if (data && data.bloodTest.status !== "completed") {
    const statusLabel =
      data.bloodTest.status === "processing"
        ? "Analyse en cours"
        : data.bloodTest.status === "error"
        ? "Analyse interrompue"
        : "Analyse en attente";
    return (
      <div className="min-h-screen bg-[#f7f5f0] text-slate-900 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-xl font-semibold">{statusLabel}</p>
        <p className="text-sm text-slate-600 max-w-md">
          {data.bloodTest.error ||
            "Ton bilan est en cours de traitement. Rafraichis dans quelques instants pour voir le rapport."}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Recharger
          </Button>
          <Button className="bg-[#0f172a] text-white hover:bg-[#1e293b]" onClick={() => navigate("/dashboard")}>
            Retour dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] text-slate-900 flex flex-col items-center justify-center gap-3">
        <p>Rapport introuvable.</p>
        <Button onClick={() => navigate("/dashboard")}>Retour dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5f0] text-slate-900 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <ClientHeader credits={me?.user?.credits ?? 0} variant="light" />

      <motion.main
        className="relative z-10 mx-auto max-w-7xl px-6 py-10"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5"
          variants={itemVariants}
        >
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Bonjour {patientLabel}</p>
            <h1 className="text-2xl font-semibold mt-2">Analyse du {new Date(data.bloodTest.uploadedAt).toLocaleDateString("fr-FR")}</h1>
            {previousTest && (
              <p className="text-sm text-slate-600 mt-1">
                vs ton bilan du {new Date(previousTest.uploadedAt).toLocaleDateString("fr-FR")}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-2">
              Biohacking Bloodwork · lecture experte et actionnable
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {`REF-${data.bloodTest.id.slice(0, 8).toUpperCase()}`} · {markers.length} biomarqueurs analyses
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {patient.gender ? `Sexe: ${patient.gender}` : "Sexe: non renseigne"} ·{" "}
              {patient.dob ? `Naissance: ${patient.dob}` : "Naissance: non renseignee"} ·{" "}
              {patient.email ? `Email: ${patient.email}` : "Email: non renseigne"}
            </p>
          </div>
          <Button className="bg-[#0f172a] text-white hover:bg-[#1e293b]" onClick={() => navigate("/dashboard")}> 
            <Upload className="h-4 w-4 mr-2" />
            Retour au dossier
          </Button>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Tabs defaultValue="dashboard" className="mt-8 space-y-6">
            <TabsList className="flex w-full flex-wrap justify-start gap-2 rounded-full border border-slate-200 bg-white px-2 py-2">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="systemes">Systemes</TabsTrigger>
              <TabsTrigger value="marqueurs">Marqueurs</TabsTrigger>
              <TabsTrigger value="protocoles">Protocoles</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="historique">Historique</TabsTrigger>
              <TabsTrigger value="simulateur">Simulateur</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
            </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Score global</p>
                    <p className="text-5xl font-semibold mt-3 text-[#0f172a]">{globalScore}/100</p>
                    <p className="text-sm text-slate-600 mt-2">{getScoreMessage(globalScore)}</p>
                    <p className="text-xs text-slate-500 mt-2">
                      Je lis ton terrain biologique comme une cartographie d'actions precises, pas comme un simple PDF.
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-600">
                    {trendDelta !== null && (
                      <p>{trendDelta >= 0 ? "+" : ""}{trendDelta} pts depuis le dernier bilan</p>
                    )}
                  {age !== null && ageBio !== null && (
                    <p className="mt-2">Age bio: {ageBio} ans (age reel: {age})</p>
                  )}
                  <StatusIndicator status={getScoreLevel(globalScore).tone} label={getScoreLevel(globalScore).label} />
                  <p className="mt-2 text-xs text-slate-500">
                    Top {getPercentile(globalScore)}% des profils similaires
                  </p>
                </div>
              </div>
            </Card>

              <Card className="border border-slate-200 bg-white p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Alertes prioritaires</p>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  {critical.length === 0 && <p>Aucune alerte critique.</p>}
                  {critical.slice(0, 3).map((marker) => (
                    <div key={marker.code} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-900">{marker.name}</p>
                        <p className="text-xs text-slate-500">{marker.value} {marker.unit}</p>
                      </div>
                      <Button variant="outline" size="sm">Voir le protocole</Button>
                    </div>
                  ))}
                  {critical.length > 3 && (
                    <p className="text-xs text-slate-500">+{critical.length - 3} alertes supplementaires</p>
                  )}
                </div>
              </Card>
            </div>

            <Card className="border border-slate-200 bg-white p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lecture experte</p>
              <p className="text-sm text-slate-700 mt-3">{expertIntro}</p>
            </Card>

            <Card className="border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Radar des systemes</p>
                  <p className="text-sm text-slate-600 mt-2">8 axes cles pour lire ton bilan en 10 secondes.</p>
                </div>
                <StatusIndicator status={getScoreLevel(globalScore).tone} />
              </div>
              <div className="mt-4">
                <BloodRadar data={radarData} />
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="border border-slate-200 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Quick wins</p>
                <div className="mt-3 space-y-3 text-sm text-slate-700">
                  {quickWins.length ? (
                    quickWins.map((item, index) => (
                      <div key={`quick-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
                        <p className="font-semibold text-slate-900">{index + 1}. {item.action}</p>
                        <p className="text-xs text-slate-500 mt-1">{item.impact}</p>
                      </div>
                    ))
                  ) : (
                    <p>Aucune action rapide prioritaire.</p>
                  )}
                </div>
              </Card>
              <Card className="border border-slate-200 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Risque temporel</p>
                <div className="mt-4 flex items-center gap-3">
                  <Shield className="h-5 w-5 text-[#0f172a]" />
                  <div>
                    <p className="text-lg font-semibold">{riskScore}/100</p>
                    <p className="text-xs text-slate-600">Risque {riskLabel}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    Critiques <span className="text-slate-900">{critical.length}</span>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                    Sous-optimaux <span className="text-slate-900">{warning.length}</span>
                  </div>
                </div>
              </Card>
              <Card className="border border-slate-200 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Resume</p>
                <div className="mt-3 text-sm text-slate-700 space-y-2">
                  <p><span className="text-slate-900">Optimal:</span> {summary?.optimal?.length ? summary.optimal.join(", ") : "Aucun"}</p>
                  <p><span className="text-slate-900">A surveiller:</span> {summary?.watch?.length ? summary.watch.join(", ") : "Aucun"}</p>
                  <p><span className="text-slate-900">Action requise:</span> {summary?.action?.length ? summary.action.join(", ") : "Aucune"}</p>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="systemes" className="space-y-6">
            {SYSTEM_ORDER.map((system) => {
              const items = groupedBySystem[system];
              if (!items.length) return null;
              const score = systemScores[system] ?? 0;
              const level = getScoreLevel(score);
              const meta = SYSTEM_META[system];
              const systemFocus = systemNarratives[system] || "";
              const radarPoints = systemRadarData[system] || [];
              return (
                <Card key={system} className="border border-slate-200 bg-white p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Systeme</p>
                      <p className="text-lg font-semibold mt-2">{meta.label}</p>
                      <p className="text-xs text-slate-500">{meta.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-2xl font-semibold">{score}/100</p>
                      <StatusBadge status={level.tone} label={level.label} />
                    </div>
                  </div>
                  <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="space-y-4">
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lecture directe</p>
                        <p className="text-sm text-slate-700 mt-2">{systemFocus}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Radar du theme</p>
                        <p className="text-xs text-slate-500 mt-2">
                          Visualise les marqueurs cles de ce systeme.
                        </p>
                        <div className="mt-4">
                          {radarPoints.length ? (
                            <BloodRadar data={radarPoints} height={220} outerRadius="72%" />
                          ) : (
                            <p className="text-xs text-slate-500">Aucune donnee radar disponible.</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {items.map((marker) => (
                        <div key={`${system}-${marker.code}`} className="rounded-xl border border-slate-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">{marker.name}</p>
                              <p className="text-xs text-slate-500">{marker.code}</p>
                            </div>
                            <StatusBadge status={marker.status} />
                          </div>
                          <div className="mt-3 text-sm">
                            <span className="text-2xl font-semibold">{marker.value}</span>{" "}
                            <span className="text-slate-600">{marker.unit}</span>
                          </div>
                          <BiomarkerRangeIndicator
                            value={marker.value}
                            unit={marker.unit}
                            status={marker.status}
                            normalMin={marker.refMin ?? undefined}
                            normalMax={marker.refMax ?? undefined}
                            optimalMin={marker.optimalMin ?? undefined}
                            optimalMax={marker.optimalMax ?? undefined}
                            className="mt-3"
                          />
                          <p className="mt-3 text-xs text-slate-600">
                            {marker.interpretation || "Je detaille ce marqueur dans ta synthese experte."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="marqueurs" className="space-y-6">
            <Card className="border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">Liste complete des marqueurs</p>
                  <p className="text-xs text-slate-500">{markers.length} marqueurs detectes.</p>
                </div>
                <StatusIndicator status={getScoreLevel(globalScore).tone} />
              </div>
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              {markers.map((marker) => (
                <div key={`${marker.code}-full`} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{marker.name}</p>
                      <p className="text-xs text-slate-500">{marker.code}</p>
                    </div>
                    <StatusBadge status={marker.status} />
                  </div>
                  <div className="mt-3 text-sm">
                    <span className="text-2xl font-semibold">{marker.value}</span>{" "}
                    <span className="text-slate-600">{marker.unit}</span>
                  </div>
                  <BiomarkerRangeIndicator
                    value={marker.value}
                    unit={marker.unit}
                    status={marker.status}
                    normalMin={marker.refMin ?? undefined}
                    normalMax={marker.refMax ?? undefined}
                    optimalMin={marker.optimalMin ?? undefined}
                    optimalMax={marker.optimalMax ?? undefined}
                    className="mt-3"
                  />
                  <p className="mt-3 text-xs text-slate-600">
                    {marker.interpretation || "Je detaille ce marqueur dans ta synthese experte."}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="protocoles" className="space-y-6">
            <Card className="border border-slate-200 bg-white p-6">
              <p className="text-lg font-semibold">Plan d'action personnalise</p>
              <p className="text-xs text-slate-500">Protocoles progressifs sur 180 jours.</p>
            </Card>
            <div className="grid gap-4 md:grid-cols-3">
              {protocolPhases.map((phase) => (
                <Card key={phase.id} className="border border-slate-200 bg-white p-4">
                  <p className="font-semibold">{phase.title}</p>
                  <ul className="mt-3 space-y-2 text-xs text-slate-600">
                    {phase.items.map((item, index) => (
                      <li key={`${phase.id}-${index}`} className="flex gap-2">
                        <ArrowUpRight className="h-3 w-3 text-[#0f172a]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
            <Card className="border border-slate-200 bg-white p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Controles a prevoir</p>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                {analysis?.followUp?.length
                  ? analysis.followUp.map((item, index) => (
                      <div key={`follow-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3">
                        <p>{item.test}</p>
                        <span className="text-xs text-slate-500">{item.delay}</span>
                      </div>
                    ))
                  : "Aucun controle recommande."}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border border-slate-200 bg-white p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Synthese experte</p>
                <div className="mt-3 text-sm text-slate-700 prose prose-slate max-w-none">
                  <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                </div>
              </Card>
              <Card className="border border-slate-200 bg-white p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Patterns detectes</p>
                <div className="mt-4 space-y-4 text-sm text-slate-700">
                  {analysis?.patterns?.length ? (
                    analysis.patterns.map((pattern) => (
                      <div key={pattern.name} className="rounded-lg border border-slate-200 bg-white p-4">
                        <p className="font-semibold text-slate-900">{pattern.name}</p>
                        <p className="text-xs text-slate-500 mt-1">Causes: {pattern.causes.join(", ")}</p>
                        <p className="text-xs text-slate-500 mt-2">Protocoles: {pattern.protocol.join(", ")}</p>
                      </div>
                    ))
                  ) : (
                    <p>Aucun pattern prioritaire detecte.</p>
                  )}
                </div>
              </Card>
            </div>
            <Card className="border border-slate-200 bg-white p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Alertes medicales</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                {analysis?.alerts?.length
                  ? analysis.alerts.map((alert, index) => (
                      <li key={`alert-${index}`} className="flex gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <span>{alert}</span>
                      </li>
                    ))
                  : "Aucune alerte critique a signaler."}
              </ul>
            </Card>
          </TabsContent>

          <TabsContent value="historique" className="space-y-6">
            <Card className="border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">Evolution dans le temps</p>
                  <p className="text-xs text-slate-500">Suivi de tes scores par bilan.</p>
                </div>
                <LineChart className="h-5 w-5 text-[#0f172a]" />
              </div>
              {orderedTests.length >= 2 ? (
                <div className="h-48 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartLineChart data={orderedTests.slice().reverse().map((test) => ({
                      date: new Date(test.uploadedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
                      score: test.globalScore || 0,
                    }))}>
                      <XAxis dataKey="date" stroke="rgba(15,23,42,0.45)" />
                      <YAxis stroke="rgba(15,23,42,0.45)" domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#0f172a" }}
                        labelStyle={{ color: "#0f172a" }}
                      />
                      <Line type="monotone" dataKey="score" stroke="#0f172a" strokeWidth={2} dot={false} />
                    </RechartLineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-600 mt-4">Uploade un second bilan pour debloquer la comparaison.</p>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="simulateur" className="space-y-6">
            <Card className="border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <RefreshCcw className="h-5 w-5 text-[#0f172a]" />
                <div>
                  <p className="text-lg font-semibold">Simulateur what-if</p>
                  <p className="text-xs text-slate-500">Scenario interactif en preparation.</p>
                </div>
              </div>
              <p className="text-sm text-slate-700 mt-4">
                Ici tu pourras simuler l'impact de changements (vitamine D, sommeil, activite) sur ton score.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <Card className="border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">Export</p>
                  <p className="text-xs text-slate-500">PDF partageable avec ton medecin.</p>
                </div>
                <Button variant="outline" onClick={() => window.open(`/api/blood-tests/${data.bloodTest.id}/export/pdf`, "_blank")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
              <p className="text-sm text-slate-600 mt-4">
                L'export inclut tes scores, marqueurs et protocoles. Si l'export est indisponible, contacte-moi.
              </p>
            </Card>
          </TabsContent>
          </Tabs>
        </motion.div>
      </motion.main>
    </div>
  );
}
