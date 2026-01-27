import { useId, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  Loader2,
  ShieldAlert,
  Activity,
  Flame,
  HeartPulse,
  Dna,
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
} from "lucide-react";

import BloodHeader from "@/components/blood/BloodHeader";
import BloodShell from "@/components/blood/BloodShell";
import { BloodThemeProvider, useBloodTheme } from "@/components/blood/BloodThemeContext";
import { BloodRadar } from "@/components/blood/BloodRadar";
import { StatusBadge } from "@/components/blood/StatusBadge";
import { BiomarkerRangeIndicator } from "@/components/blood/BiomarkerRangeIndicator";
import { StatusIndicator } from "@/components/blood/StatusIndicator";
import { AnimatedNumber } from "@/components/blood/AnimatedNumber";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BIOMARKER_DETAILS, buildDefaultBiomarkerDetail } from "@/data/bloodBiomarkerDetails";
import { BLOOD_PANEL_CITATIONS } from "@/data/bloodPanelCitations";
import { getCorrelationInsights, type PatientContext } from "@/lib/biomarkerCorrelations";
import { getPercentileRank } from "@/lib/biomarkerPercentiles";

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
    protocolPhases?: Array<{ id: string; title: string; items: string[] }>;
    aiAnalysis?: string;
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

type PanelKey = "hormonal" | "thyroid" | "metabolic" | "inflammatory" | "vitamins" | "liver_kidney";

const PANEL_META: Record<
  PanelKey,
  { label: string; bullets: string[]; impact: string; icon: typeof Activity }
> = {
  hormonal: {
    label: "Hormones",
    bullets: ["Testosterone, SHBG, estradiol", "LH/FSH, prolactine", "Cortisol, IGF-1, DHEA-S"],
    impact: "ta prise de muscle, ta libido et ta recuperation",
    icon: Flame,
  },
  thyroid: {
    label: "Thyroide",
    bullets: ["TSH, T3, T4", "Anti-TPO, T3 reverse", "Conversion et regulation"],
    impact: "ton metabolisme, ta thermogenese et ta perte de gras",
    icon: Activity,
  },
  metabolic: {
    label: "Metabolisme",
    bullets: ["Glycemie, HbA1c, HOMA-IR", "Lipides (TG/HDL/LDL)", "ApoB, Lp(a)"],
    impact: "ta sensibilite a l'insuline et ta capacite a bruler la graisse",
    icon: HeartPulse,
  },
  inflammatory: {
    label: "Inflammation",
    bullets: ["CRP-us, homocysteine", "Ferritine, fer serique", "Saturation transferrine"],
    impact: "ta recuperation, ton anabolisme et ton risque cardio",
    icon: ShieldAlert,
  },
  vitamins: {
    label: "Vitamines",
    bullets: ["Vitamine D, B12, folate", "Magnesium RBC", "Zinc"],
    impact: "ta production hormonale, ton energie et ton immunite",
    icon: Dna,
  },
  liver_kidney: {
    label: "Foie/Rein",
    bullets: ["ALT/AST/GGT", "Creatinine/eGFR", "Lecture hepatique + renale"],
    impact: "ta detox, le metabolisme de tes hormones et ton elimination",
    icon: Target,
  },
};

const CASE_STUDIES = [
  {
    id: "marc",
    initials: "MD",
    name: "Marc D.",
    age: 34,
    role: "Entrepreneur",
    baseline: "Testosterone 420 ng/dL (sous-optimal)",
    protocol: ["Sommeil 8h30", "Ashwagandha 600 mg", "Zinc 30 mg", "Deficit -15%"],
    result: "Testosterone 680 ng/dL (+62%)",
    quote: "Energie revenue, libido stable, progression plus rapide.",
  },
  {
    id: "ines",
    initials: "IB",
    name: "Ines B.",
    age: 29,
    role: "Athlete",
    baseline: "Ferritine 22 ng/mL (basse)",
    protocol: ["Fer bisglycinate 25 mg", "Vitamine C 500 mg", "Check menstruations"],
    result: "Ferritine 58 ng/mL (optimal)",
    quote: "Moins de fatigue, meilleure endurance a l'entrainement.",
  },
  {
    id: "samir",
    initials: "SK",
    name: "Samir K.",
    age: 41,
    role: "Cadre",
    baseline: "HbA1c 5.7% (pre-diabete)",
    protocol: ["Marche post-repas", "Suppression sucres liquides", "Training 3x/sem"],
    result: "HbA1c 5.1% (optimal)",
    quote: "Energie plus stable, perte de gras enclenchee.",
  },
];

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

const scoreToStatus = (score: number): MarkerStatus => {
  if (score >= 85) return "optimal";
  if (score >= 70) return "normal";
  if (score >= 55) return "suboptimal";
  return "critical";
};

const scoreLabel = (score: number): string => {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Bon";
  if (score >= 55) return "A optimiser";
  return "Prioritaire";
};

const statusLabel = (status: MarkerStatus): string => {
  if (status === "optimal") return "optimal";
  if (status === "normal") return "normal";
  if (status === "suboptimal") return "sous-optimal";
  return "critique";
};

const deltaFromOptimal = (marker: BloodTestDetail["markers"][number]) => {
  if (marker.optimalMin === null || marker.optimalMax === null) return null;
  const optimalMid = (marker.optimalMin + marker.optimalMax) / 2;
  if (!optimalMid) return null;
  if (marker.value < marker.optimalMin) {
    const pct = Math.abs(((marker.value - marker.optimalMin) / marker.optimalMin) * 100);
    return `${pct.toFixed(0)}% sous l'optimal`;
  }
  if (marker.value > marker.optimalMax) {
    const pct = ((marker.value - marker.optimalMax) / marker.optimalMax) * 100;
    return `${pct.toFixed(0)}% au-dessus de l'optimal`;
  }
  return "Dans la zone optimale";
};

const average = (values: Array<number | null>) => {
  const filtered = values.filter((v): v is number => typeof v === "number");
  if (!filtered.length) return null;
  return Math.round(filtered.reduce((sum, v) => sum + v, 0) / filtered.length);
};

const markerStatusRank: Record<MarkerStatus, number> = {
  critical: 0,
  suboptimal: 1,
  normal: 2,
  optimal: 3,
};

const getMarkerValue = (markers: BloodTestDetail["markers"], code: string) => {
  const found = markers.find((m) => m.code === code);
  return found ? found.value : null;
};

const diabetesRisk = (markers: BloodTestDetail["markers"]) => {
  const gly = getMarkerValue(markers, "glycemie_jeun");
  const a1c = getMarkerValue(markers, "hba1c");
  const insulin = getMarkerValue(markers, "insuline_jeun");
  const homa = getMarkerValue(markers, "homa_ir");

  if (gly === null && a1c === null && insulin === null && homa === null) return null;

  let score = 20;
  if (a1c !== null && a1c >= 6.5) score = Math.max(score, 90);
  if (gly !== null && gly >= 126) score = Math.max(score, 90);
  if (a1c !== null && a1c >= 5.7) score = Math.max(score, 60);
  if (gly !== null && gly >= 100) score = Math.max(score, 60);
  if (homa !== null && homa >= 3.5) score = Math.max(score, 80);
  if (homa !== null && homa >= 2.5) score = Math.max(score, 65);
  if (insulin !== null && insulin >= 25) score = Math.max(score, 75);
  if (insulin !== null && insulin >= 15) score = Math.max(score, 60);

  const level = score >= 75 ? "eleve" : score >= 55 ? "modere" : "faible";
  return { score, level, gly, a1c, insulin, homa };
};

const getMarkerDetail = (marker: BloodTestDetail["markers"][number]) => {
  const detail = BIOMARKER_DETAILS[marker.code];
  if (detail) return detail;
  return buildDefaultBiomarkerDetail(marker.name, statusLabel(marker.status));
};

const getMarkerNarrative = (marker: BloodTestDetail["markers"][number], panel: PanelKey) => {
  const statusTone =
    marker.status === "critical"
      ? "critique"
      : marker.status === "suboptimal"
      ? "sous-optimal"
      : marker.status === "normal"
      ? "normal"
      : "optimal";

  const detail = getMarkerDetail(marker);
  const definition = `Ta valeur (${marker.value} ${marker.unit}) est ${statusTone}. ${
    marker.interpretation ? marker.interpretation : `Je l'analyse dans le contexte ${PANEL_META[panel].label.toLowerCase()}.`
  }`;
  const mechanism = `Quand ${marker.name} est ${statusTone}, cela impacte directement ${PANEL_META[panel].impact}.`;
  const optimization = detail?.protocol?.length
    ? detail.protocol[0]
    : "Je corrige les fondamentaux (sommeil, inflammation, nutriments) avant d'aller plus loin.";

  return { definition, mechanism, optimization };
};

const buildLifestyleCorrelations = (
  markers: BloodTestDetail["markers"],
  lifestyle?: {
    sleepHours?: number;
    trainingHours?: number;
    calorieDeficit?: number;
    alcoholWeekly?: number;
    stressLevel?: number;
  }
) => {
  const lookup = (code: string) => markers.find((m) => m.code === code);
  const cortisol = lookup("cortisol");
  const testo = lookup("testosterone_total");
  const a1c = lookup("hba1c");
  const insulin = lookup("insuline_jeun");

  const items: Array<{ factor: string; current: string; impact: string; recommendation: string }> = [];

  if (lifestyle?.sleepHours && lifestyle.sleepHours < 7) {
    items.push({
      factor: "Sommeil",
      current: `${lifestyle.sleepHours} h/nuit`,
      impact: "Cortisol plus eleve + testosterone plus basse.",
      recommendation: "Viser 7h30-8h30, coucher regulier, limiter cafeine apres 14h.",
    });
  }

  if (lifestyle?.trainingHours && lifestyle.trainingHours > 10) {
    items.push({
      factor: "Volume d'entrainement",
      current: `${lifestyle.trainingHours} h/sem`,
      impact: "Risque de recuperation incomplete et cortisol eleve.",
      recommendation: "Structurer 3-4 seances fortes + 1-2 seances legeres.",
    });
  }

  if (lifestyle?.calorieDeficit && lifestyle.calorieDeficit > 25) {
    items.push({
      factor: "Deficit calorique",
      current: `${lifestyle.calorieDeficit}%`,
      impact: "Baisse de T3 et de la testosterone libre.",
      recommendation: "Rester entre 10-20% pour preserver hormones et performance.",
    });
  }

  if (lifestyle?.stressLevel && lifestyle.stressLevel >= 7) {
    items.push({
      factor: "Stress percu",
      current: `${lifestyle.stressLevel}/10`,
      impact: "Inflammation plus haute, sommeil plus fragile.",
      recommendation: "Respiration 10 min/jour + deload et sommeil prioritaire.",
    });
  }

  if (lifestyle?.alcoholWeekly && lifestyle.alcoholWeekly >= 5) {
    items.push({
      factor: "Alcool",
      current: `${lifestyle.alcoholWeekly} verres/sem`,
      impact: "Risque hepatique et baisse de recuperation.",
      recommendation: "Objectif <3 verres/sem sur la phase 1.",
    });
  }

  if (items.length >= 3) return items.slice(0, 3);

  if (cortisol && (cortisol.status === "suboptimal" || cortisol.status === "critical")) {
    items.push({
      factor: "Stress / sommeil",
      current: `Cortisol ${cortisol.value} ${cortisol.unit}`,
      impact: "Recuperation plus lente + stockage plus facile.",
      recommendation: "Sommeil 7h30-8h30 + reduction cafeine + 10 min de respiration quotidienne.",
    });
  }

  if (testo && (testo.status === "suboptimal" || testo.status === "critical")) {
    items.push({
      factor: "Sommeil / nutrition",
      current: `Testosterone ${testo.value} ${testo.unit}`,
      impact: "Progression musculaire freinee.",
      recommendation: "Reequilibrer calories, lipides essentiels et charge d'entrainement.",
    });
  }

  if (a1c && (a1c.status === "suboptimal" || a1c.status === "critical")) {
    items.push({
      factor: "Nutrition / activite",
      current: `HbA1c ${a1c.value}${a1c.unit}`,
      impact: "Risque insulinique accru.",
      recommendation: "Marche post-repas + reduction sucres rapides + priorite a la musculation.",
    });
  }

  if (insulin && (insulin.status === "suboptimal" || insulin.status === "critical")) {
    items.push({
      factor: "Timing glucidique",
      current: `Insuline ${insulin.value} ${insulin.unit}`,
      impact: "Stockage accelere + energie instable.",
      recommendation: "Fenetre alimentaire plus stricte et glucides surtout autour des entrainements.",
    });
  }

  return items.slice(0, 3);
};

function scoreToHue(score: number) {
  const clamped = Math.max(0, Math.min(100, score));
  return Math.round((clamped / 100) * 120);
}

function ScoreDonut({ score, muted, textPrimary, textTertiary }: { score: number; muted: string; textPrimary: string; textTertiary: string }) {
  const circumference = 2 * Math.PI * 56;
  const clampedScore = Math.max(0, Math.min(100, score));
  const dash = (clampedScore / 100) * circumference;
  const dashOffset = circumference - dash;
  const hue = scoreToHue(clampedScore);
  const gradientId = useId();
  const glowId = useId();
  const strokeBase = `hsl(${hue}, 85%, 55%)`;
  const strokeHighlight = `hsl(${hue}, 90%, 65%)`;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="h-36 w-36 -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={strokeHighlight} />
            <stop offset="100%" stopColor={strokeBase} />
          </linearGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="72" cy="72" r="56" stroke={muted} strokeWidth="10" fill="none" />
        <motion.circle
          cx="72"
          cy="72"
          r="56"
          stroke={`url(#${gradientId})`}
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeLinecap="round"
          strokeDashoffset={circumference}
          filter={`url(#${glowId})`}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1.15, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-semibold tracking-tight" style={{ color: textPrimary }}>
          <AnimatedNumber value={score} decimals={0} />
        </div>
        <div className="text-xs tracking-[0.2em] uppercase" style={{ color: textTertiary }}>{scoreLabel(score)}</div>
      </div>
    </div>
  );
}

function BloodAnalysisReportInner() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const [, navigate] = useLocation();
  const { theme, mode } = useBloodTheme();
  const [isExporting, setIsExporting] = useState(false);
  const adminKey = useMemo(() => {
    if (typeof window === "undefined") return "";
    const value = new URLSearchParams(window.location.search).get("key");
    return value ? value.trim() : "";
  }, []);

  const { data: me } = useQuery({
    queryKey: ["/api/me"],
    queryFn: () => fetcher<MeResponse>("/api/me", adminKey || undefined),
    retry: false,
    enabled: !adminKey,
    onError: () => navigate(`/auth/login?next=/analysis/${encodeURIComponent(reportId)}`),
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/blood-tests", reportId],
    queryFn: () => fetcher<BloodTestDetail>(`/api/blood-tests/${reportId}`, adminKey || undefined),
    retry: false,
    refetchInterval: (query) => {
      const current = query.state.data as BloodTestDetail | undefined;
      const status = current?.bloodTest?.status;
      return status === "processing" ? 5000 : false;
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401 && !adminKey) {
        navigate(`/auth/login?next=/analysis/${encodeURIComponent(reportId)}`);
      }
    },
  });

  const credits = adminKey ? 0 : me?.user?.credits ?? 0;

  const markersByPanel = useMemo(() => {
    const groups: Record<PanelKey, BloodTestDetail["markers"]> = {
      hormonal: [],
      thyroid: [],
      metabolic: [],
      inflammatory: [],
      vitamins: [],
      liver_kidney: [],
    };
    for (const marker of data?.markers || []) {
      const category = marker.category as PanelKey;
      if (category in groups) groups[category].push(marker);
    }
    (Object.keys(groups) as PanelKey[]).forEach((key) => {
      groups[key].sort((a, b) => {
        if (markerStatusRank[a.status] !== markerStatusRank[b.status]) {
          return markerStatusRank[a.status] - markerStatusRank[b.status];
        }
        return a.name.localeCompare(b.name);
      });
    });
    return groups;
  }, [data?.markers]);

  const panelScores = useMemo(() => {
    const raw = data?.analysis?.categoryScores || {};
    const scoreByStatus: Record<MarkerStatus, number> = { optimal: 100, normal: 80, suboptimal: 55, critical: 30 };

    const fallbackAvg = (panelKey: PanelKey): number | null => {
      const markers = markersByPanel[panelKey];
      if (!markers.length) return null;
      const avg = markers.reduce((sum, marker) => sum + scoreByStatus[marker.status], 0) / markers.length;
      return Math.round(avg);
    };

    return {
      hormonal: raw.hormonal ?? fallbackAvg("hormonal"),
      thyroid: raw.thyroid ?? fallbackAvg("thyroid"),
      metabolic: raw.metabolic ?? fallbackAvg("metabolic"),
      inflammatory: raw.inflammatory ?? fallbackAvg("inflammatory"),
      vitamins: raw.vitamins ?? fallbackAvg("vitamins"),
      liver_kidney: raw.liver_kidney ?? fallbackAvg("liver_kidney"),
    } satisfies Record<PanelKey, number | null>;
  }, [data?.analysis?.categoryScores, markersByPanel]);

  const radarData = useMemo(() => {
    const targetScore = 85;
    return (Object.keys(PANEL_META) as PanelKey[]).map((key) => {
      const score = panelScores[key];
      if (score === null) {
        return { key, label: PANEL_META[key].label, score: 0, target: 0, status: "normal" as MarkerStatus, muted: true };
      }
      return { key, label: PANEL_META[key].label, score, target: targetScore, status: scoreToStatus(score) };
    });
  }, [panelScores]);

  const globalScore = data?.analysis?.globalScore ?? data?.bloodTest?.globalScore ?? 0;
  const patient = data?.bloodTest?.patient || data?.analysis?.patient || null;
  const patientName = [patient?.prenom, patient?.nom].filter(Boolean).join(" ").trim();
  const displayName = patient?.prenom || patient?.nom || patientName || "Patient";
  const patientAgeRaw = patient?.dob ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / 31557600000) : null;
  const patientAge = Number.isFinite(patientAgeRaw) ? patientAgeRaw : null;

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
      const name = patient?.prenom ? `Blood_Analysis_${patient.prenom}_${new Date().toISOString().slice(0, 10)}.pdf` : `Blood_Analysis_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.href = url;
      a.download = name;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'export PDF.");
    } finally {
      setIsExporting(false);
    }
  };
  const patientContext: PatientContext | null = useMemo(() => {
    if (!patient?.dob || !patient?.gender || !patient?.poids || !patient?.taille) return null;
    const age = Math.floor((Date.now() - new Date(patient.dob).getTime()) / 31557600000);
    const bmi = patient.poids / Math.pow(patient.taille / 100, 2);
    if (!Number.isFinite(age) || !Number.isFinite(bmi)) return null;
    const sexe =
      patient.gender === "femme" ? "femme" : patient.gender === "homme" ? "homme" : "autre";
    return { age, sexe, poids: patient.poids, taille: patient.taille, bmi };
  }, [patient?.dob, patient?.gender, patient?.poids, patient?.taille]);
  const genderLabel = patient?.gender === "femme" ? "Femme" : patient?.gender === "homme" ? "Homme" : "N/A";

  const anabolicIndex = panelScores.hormonal;
  const recompReadiness = average([panelScores.hormonal, panelScores.thyroid, panelScores.metabolic]);
  const diabetes = data?.markers ? diabetesRisk(data.markers) : null;

  const topMarkers = useMemo(() => {
    return (data?.markers || [])
      .filter((m) => m.status === "critical" || m.status === "suboptimal")
      .slice(0, 3);
  }, [data?.markers]);

  const lifestyleCorrelations = useMemo(() => {
    return data?.markers ? buildLifestyleCorrelations(data.markers, patient || undefined) : [];
  }, [data?.markers, patient]);

  const narrative = useMemo(() => {
    if (!data?.markers?.length) return "";
    const criticalCount = data.markers.filter((m) => m.status === "critical").length;
    const subCount = data.markers.filter((m) => m.status === "suboptimal").length;
    const headline = `Tu as ${criticalCount} marqueur(s) critique(s) et ${subCount} sous-optimaux.`;
    const hormonalNote =
      typeof anabolicIndex === "number"
        ? `Ton index hormonal est a ${anabolicIndex}/100, ce qui influence directement ta prise de muscle et ta perte de gras.`
        : "Ton panel hormonal manque de donnees pour conclure.";
    const metabolicNote =
      typeof panelScores.metabolic === "number"
        ? `Ton metabolisme est a ${panelScores.metabolic}/100. C'est un signal cle pour ta recomposition corporelle.`
        : "Ton panel metabolique manque de donnees.";
    return `${headline} ${hormonalNote} ${metabolicNote}`;
  }, [data?.markers, anabolicIndex, panelScores.metabolic]);

  const patterns = data?.analysis?.patterns || [];
  const aiAnalysis = data?.analysis?.aiAnalysis || "";
  const protocolPhases = data?.analysis?.protocolPhases || [];

  if (isLoading) {
    return (
      <BloodShell>
        <BloodHeader credits={credits} />
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-24 blood-text-secondary">
          <Loader2 className="mr-3 h-5 w-5 animate-spin" />
          Chargement du rapport...
        </div>
      </BloodShell>
    );
  }

  if (error || !data) {
    const isUnauthorized = error instanceof ApiError && error.status === 401;
    return (
      <BloodShell>
        <BloodHeader credits={credits} />
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-6 py-24 text-center">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
          <div className="text-lg font-semibold blood-text-primary">
            {isUnauthorized ? "Connexion requise." : "Rapport introuvable."}
          </div>
          <div className="text-sm blood-text-secondary">
            {isUnauthorized ? "Connecte-toi pour ouvrir ce rapport." : "Le lien est invalide ou le rapport n'est pas accessible."}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              className="blood-text-primary"
              style={{ backgroundColor: theme.primaryBlue }}
              onClick={() => navigate(`/auth/login?next=/analysis/${encodeURIComponent(reportId)}`)}
            >
              Se connecter
            </Button>
            <Button
              variant="outline"
              className="hover:bg-transparent"
              style={{ borderColor: theme.borderDefault, color: theme.textSecondary }}
              onClick={() => navigate("/blood-dashboard")}
            >
              Retour dashboard
            </Button>
          </div>
        </div>
      </BloodShell>
    );
  }

  if (data.bloodTest.status === "processing") {
    return (
      <BloodShell>
        <BloodHeader credits={credits} />
        <div className="mx-auto max-w-3xl px-6 py-24">
          <Card className="border p-8 text-center" style={{ backgroundColor: theme.surface, borderColor: theme.borderDefault }}>
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border"
              style={{ borderColor: theme.borderDefault, backgroundColor: theme.surfaceMuted }}
            >
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: theme.primaryBlue }} />
            </div>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight blood-text-primary">Analyse en cours</h1>
            <p className="mt-3 text-sm blood-text-secondary">
              J'extrais tes biomarqueurs et je construis le rapport. La page se met a jour automatiquement.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button className="text-white" style={{ backgroundColor: theme.primaryBlue }} onClick={() => refetch()}>
                Rafraichir
              </Button>
              <Button
                variant="outline"
                className="hover:bg-transparent"
                style={{ borderColor: theme.borderDefault, color: theme.textSecondary }}
                onClick={() => navigate("/blood-dashboard")}
              >
                Retour dashboard
              </Button>
            </div>
          </Card>
        </div>
      </BloodShell>
    );
  }

  return (
    <BloodShell>
      <BloodHeader credits={credits} />

      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] blood-text-tertiary">Blood Analysis</p>
            <h1 className="mt-3 blood-h1 blood-text-primary">
              {displayName}, voici ton bilan sanguin expert.
            </h1>
            <p className="mt-3 max-w-2xl blood-text-secondary leading-relaxed blood-body">
              Je compare tes ranges labo (normaux) aux ranges optimaux (performance/longévité), je detecte les patterns,
              puis je te donne une trajectoire claire.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs blood-text-tertiary">
              <span className="inline-flex items-center gap-2 rounded-full border blood-border-default blood-surface px-3 py-1">
                <FileText className="h-3.5 w-3.5" />
                {data.bloodTest.fileName}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border blood-border-default blood-surface px-3 py-1">
                {new Date(data.bloodTest.uploadedAt).toLocaleDateString("fr-FR", { dateStyle: "medium" })}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border blood-border-default blood-surface px-3 py-1">
                {data.markers.length} biomarqueurs
              </span>
              {data.analysis.temporalRisk && (
                <span className="inline-flex items-center gap-2 rounded-full border blood-border-default blood-surface px-3 py-1">
                  Risque: {data.analysis.temporalRisk.level} ({data.analysis.temporalRisk.score}/100)
                </span>
              )}
            </div>
            <div className="mt-4 grid gap-3 text-xs blood-text-tertiary sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border blood-border-default blood-surface px-3 py-2">
                <span className="text-[11px] uppercase tracking-[0.2em] blood-text-tertiary">Patient</span>
                <div className="mt-1 text-sm blood-text-primary">
                  {patientName || "Patient"}
                </div>
              </div>
              <div className="rounded-lg border blood-border-default blood-surface px-3 py-2">
                <span className="text-[11px] uppercase tracking-[0.2em] blood-text-tertiary">Sexe</span>
                <div className="mt-1 text-sm blood-text-primary">{genderLabel}</div>
              </div>
              {patientAge !== null && (
                <div className="rounded-lg border blood-border-default blood-surface px-3 py-2">
                  <span className="text-[11px] uppercase tracking-[0.2em] blood-text-tertiary">Age</span>
                  <div className="mt-1 text-sm blood-text-primary">{patientAge} ans</div>
                </div>
              )}
              <div className="rounded-lg border blood-border-default blood-surface px-3 py-2">
                <span className="text-[11px] uppercase tracking-[0.2em] blood-text-tertiary">Email</span>
                <div className="mt-1 text-sm blood-text-primary truncate" title={patient?.email || ""}>
                  {patient?.email || "N/A"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="hover:opacity-80"
              style={{ borderColor: theme.borderDefault, color: theme.textSecondary }}
              onClick={() => navigate("/blood-dashboard")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button
              className="text-white hover:opacity-90"
              style={{ backgroundColor: theme.primaryBlue }}
              onClick={handleExportPDF}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Export en cours
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="mt-10">
          <Tabs defaultValue="overview">
            <TabsList className="blood-tabs border p-1">
              <TabsTrigger value="overview" className="blood-text-secondary">
                Overview
              </TabsTrigger>
              <TabsTrigger value="systems" className="blood-text-secondary">
                Systemes
              </TabsTrigger>
              <TabsTrigger value="markers" className="blood-text-secondary">
                Biomarqueurs
              </TabsTrigger>
              <TabsTrigger value="insights" className="blood-text-secondary">
                Insights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-[0.45fr_0.55fr]">
                <Card className="border blood-border-default blood-surface p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Score global</p>
                      <p className="mt-2 text-sm blood-text-secondary">Lecture multi-systemes sur 100.</p>
                    </div>
                    <StatusIndicator status={scoreToStatus(globalScore)} />
                  </div>
                  <div className="mt-6 flex justify-center">
                    <ScoreDonut
                      score={globalScore}
                      muted={theme.borderSubtle}
                      textPrimary={theme.textPrimary}
                      textTertiary={theme.textTertiary}
                    />
                  </div>
                  <div className="mt-6 grid gap-3">
                    {(Object.keys(PANEL_META) as PanelKey[]).map((key) => {
                      const score = panelScores[key];
                      return (
                        <div key={key} className="flex items-center justify-between rounded-lg border blood-border-default blood-surface px-4 py-3">
                          <div className="text-sm font-medium blood-text-primary">{PANEL_META[key].label}</div>
                          <div className="flex items-center gap-2">
                            {score === null ? (
                              <StatusBadge status="normal" label="N/A" className="opacity-70" />
                            ) : (
                              <StatusBadge status={scoreToStatus(score)} label={`${score}/100`} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card className="border blood-border-default blood-surface p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Balance systemique</p>
                      <p className="mt-2 text-sm blood-text-secondary">6 panels, score 0-100.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 text-xs blood-text-tertiary">
                      <ShieldAlert className="h-4 w-4" style={{ color: theme.primaryBlue }} />
                      Optimal vs normal
                    </div>
                  </div>
                  <div className="mt-6">
                    <BloodRadar data={radarData} height={320} accentColor={theme.primaryBlue} />
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {patterns.length ? (
                      patterns.slice(0, 2).map((pattern) => (
                        <div key={pattern.name} className="rounded-xl border blood-border-default blood-surface p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm font-semibold blood-text-primary">{pattern.name}</div>
                            <StatusBadge status="suboptimal" />
                          </div>
                          {!!pattern.causes?.length && (
                            <ul className="mt-3 space-y-1 text-xs blood-text-secondary">
                              {pattern.causes.slice(0, 3).map((cause) => (
                                <li key={cause} className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.borderStrong }} />
                                  <span>{cause}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm blood-text-secondary">Aucun pattern majeur detecte.</div>
                    )}
                  </div>
                </Card>
              </div>

              <Card className="mt-6 border blood-border-default blood-surface p-6">
                <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Sources scientifiques</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {(Object.keys(PANEL_META) as PanelKey[]).map((key) => (
                    <div key={key} className="rounded-xl border blood-border-default blood-surface-muted p-4">
                      <div className="text-sm font-semibold blood-text-primary">{PANEL_META[key].label}</div>
                      <ul className="mt-3 space-y-2 text-xs blood-text-secondary">
                        {(BLOOD_PANEL_CITATIONS[key] || []).map((citation) => (
                          <li key={citation.url}>
                            →{" "}
                            <a className="underline" style={{ color: theme.textSecondary }} href={citation.url} target="_blank" rel="noreferrer">
                              {citation.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Card className="border blood-border-default blood-surface p-6">
                  <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Hormonal & anabolic index</p>
                  <p className="mt-2 text-sm blood-text-secondary">Levier majeur prise de muscle / perte de gras.</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-3xl font-semibold blood-text-primary">
                      {typeof anabolicIndex === "number" ? <AnimatedNumber value={anabolicIndex} decimals={0} /> : "N/A"}
                    </div>
                    {typeof anabolicIndex === "number" && <StatusBadge status={scoreToStatus(anabolicIndex)} />}
                  </div>
                  <p className="mt-3 text-sm blood-text-secondary">
                    {typeof anabolicIndex === "number"
                      ? "Si ce score est bas, tes resultats stagnent meme avec un entrainement dur."
                      : "Pas assez de donnees pour conclure sur l'axe anabolique."}
                  </p>
                </Card>

                <Card className="border blood-border-default blood-surface p-6">
                  <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Body recomp readiness</p>
                  <p className="mt-2 text-sm blood-text-secondary">Synthese hormones + thyroide + metabolisme.</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-3xl font-semibold blood-text-primary">
                      {typeof recompReadiness === "number" ? <AnimatedNumber value={recompReadiness} decimals={0} /> : "N/A"}
                    </div>
                    {typeof recompReadiness === "number" && <StatusBadge status={scoreToStatus(recompReadiness)} />}
                  </div>
                  <p className="mt-3 text-sm blood-text-secondary">
                    {typeof recompReadiness === "number"
                      ? "Plus ce score est haut, plus ta recomposition est realiste."
                      : "Donnees insuffisantes pour estimer la recomposition."}
                  </p>
                </Card>

                <Card className="border blood-border-default blood-surface p-6">
                  <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Diabetes risk assessment</p>
                  <p className="mt-2 text-sm blood-text-secondary">Lecture glycémie, HbA1c, insuline, HOMA-IR.</p>
                  {diabetes ? (
                    <>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-3xl font-semibold blood-text-primary">
                          <AnimatedNumber value={diabetes.score} decimals={0} />/100
                        </div>
                        <StatusBadge status={diabetes.score >= 75 ? "critical" : diabetes.score >= 55 ? "suboptimal" : "normal"} />
                      </div>
                      <p className="mt-3 text-sm blood-text-secondary">
                        Risque {diabetes.level}. Priorite: stabiliser la glycemie et l'insuline.
                      </p>
                    </>
                  ) : (
                    <p className="mt-4 text-sm blood-text-secondary">Donnees insuffisantes pour estimer le risque.</p>
                  )}
                </Card>
              </div>

              <div className="mt-6">
                <Card className="border blood-border-default blood-surface p-6">
                  <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Lecture humaine</p>
                  <p className="mt-3 text-sm blood-text-secondary leading-relaxed">{narrative}</p>
                </Card>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Card className="border blood-border-default blood-surface p-6">
                  <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Correlations lifestyle</p>
                  <p className="mt-2 text-sm blood-text-secondary">
                    J'estime les liens entre tes marqueurs et tes habitudes (sommeil, stress, nutrition).
                  </p>
                  <div className="mt-4 grid gap-3">
                    {lifestyleCorrelations.length ? (
                      lifestyleCorrelations.map((item) => (
                        <div key={item.factor} className="rounded-xl border blood-border-default blood-surface-muted p-4">
                          <div className="text-sm font-semibold blood-text-primary">{item.factor}</div>
                          <p className="mt-1 text-xs blood-text-tertiary">{item.current}</p>
                          <p className="mt-3 text-xs" style={{ color: theme.primaryBlue }}>Impact: {item.impact}</p>
                          <p className="mt-2 text-xs blood-text-secondary">→ {item.recommendation}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm blood-text-secondary">Pas assez d'informations pour estimer les correlations lifestyle.</p>
                    )}
                  </div>
                </Card>

                <Card className="border blood-border-default blood-surface p-6">
                  <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Cas reels (reference)</p>
                  <p className="mt-2 text-sm blood-text-secondary">
                    Exemples de progressions observees apres protocoles appliques.
                  </p>
                  <div className="mt-4 grid gap-4">
                    {CASE_STUDIES.map((story) => (
                      <div key={story.id} className="rounded-xl border blood-border-default blood-surface-muted p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full border blood-border-default blood-surface-muted flex items-center justify-center text-xs font-semibold blood-text-primary">
                            {story.initials}
                          </div>
                          <div>
                            <div className="text-sm font-semibold blood-text-primary">{story.name}</div>
                            <div className="text-xs blood-text-tertiary">
                              {story.age} ans · {story.role}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2 text-xs blood-text-secondary">
                          <div>
                            <span className="blood-text-tertiary uppercase">Baseline</span>
                            <p className="mt-1">{story.baseline}</p>
                          </div>
                          <div>
                            <span className="blood-text-tertiary uppercase">Protocole</span>
                            <ul className="mt-1 space-y-1">
                              {story.protocol.map((item) => (
                                <li key={item}>→ {item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="blood-text-tertiary uppercase">Resultat</span>
                            <p className="mt-1">{story.result}</p>
                          </div>
                          <blockquote className="border-l-2 pl-3 blood-text-secondary italic" style={{ borderColor: theme.primaryBlue }}>
                            "{story.quote}"
                          </blockquote>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="systems" className="mt-6">
              <div className="space-y-6">
                {(Object.keys(PANEL_META) as PanelKey[]).map((key) => {
                  const score = panelScores[key];
                  const markers = markersByPanel[key];
                  const systemStatus = typeof score === "number" ? scoreToStatus(score) : "normal";
                  const intro = `Je lis ton systeme ${PANEL_META[key].label.toLowerCase()} comme un levier direct sur ta performance.`;
                  const highlights = markers.filter((marker) => marker.status !== "optimal").slice(0, 3);
                  return (
                    <Card key={key} className="border blood-border-default blood-surface p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Systeme</p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-tight blood-text-primary">{PANEL_META[key].label}</h3>
                          <p className="mt-2 text-sm blood-text-secondary">{intro}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {typeof score === "number" ? (
                            <StatusBadge status={systemStatus} label={`${score}/100`} />
                          ) : (
                            <StatusBadge status="normal" label="N/A" />
                          )}
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border blood-border-default blood-surface p-4">
                          <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Lecture rapide</p>
                          <p className="mt-2 text-sm blood-text-secondary">{PANEL_META[key].impact}</p>
                          <ul className="mt-3 space-y-2 text-xs blood-text-secondary">
                            {PANEL_META[key].bullets.map((bullet) => (
                              <li key={bullet} className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.borderStrong }} />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-xl border blood-border-default blood-surface p-4">
                          <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Points d'attention</p>
                          {highlights.length ? (
                            <ul className="mt-3 space-y-2 text-sm blood-text-secondary">
                              {highlights.map((marker) => (
                                <li key={marker.code} className="flex items-center justify-between gap-3">
                                  <span className="font-medium blood-text-primary">{marker.name}</span>
                                  <StatusBadge status={marker.status} label={`${marker.value} ${marker.unit}`} />
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-3 text-sm blood-text-secondary">Pas de signal critique sur ce systeme.</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {markers.length ? (
                          markers.map((marker) => {
                            const narrativeBlocks = getMarkerNarrative(marker, key);
                            const correlations = patientContext
                              ? getCorrelationInsights(marker.code, marker.value, marker.unit, patientContext)
                              : [];
                            return (
                              <div
                                key={marker.code}
                                className="group rounded-xl border blood-border-default blood-surface p-4 transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.35)]"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="text-sm font-semibold blood-text-primary">{marker.name}</div>
                                    <div className="text-xs blood-text-tertiary">{marker.code}</div>
                                  </div>
                                  <StatusBadge status={marker.status} />
                                </div>
                                <div className="mt-4">
                                  <BiomarkerRangeIndicator
                                    value={marker.value}
                                    unit={marker.unit}
                                    status={marker.status}
                                    normalMin={marker.refMin ?? undefined}
                                    normalMax={marker.refMax ?? undefined}
                                    optimalMin={marker.optimalMin ?? undefined}
                                    optimalMax={marker.optimalMax ?? undefined}
                                    normalLabel="Normal labo"
                                    optimalLabel="Optimal performance"
                                  />
                                </div>
                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                  <div
                                    className="rounded-lg border p-3"
                                    style={{
                                      borderLeftWidth: "2px",
                                      borderLeftColor: theme.primaryBlue,
                                      borderColor: theme.borderDefault,
                                      backgroundColor: mode === "dark" ? "rgba(2,121,232,0.05)" : theme.surface,
                                    }}
                                  >
                                    <div className="mb-2 flex items-center gap-2">
                                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.primaryBlue }} />
                                      <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textSecondary }}>
                                        Definition
                                      </span>
                                    </div>
                                    <p className="text-sm leading-relaxed" style={{ color: theme.textPrimary }}>
                                      {narrativeBlocks.definition}
                                    </p>
                                  </div>

                                  <div
                                    className="rounded-lg border p-3"
                                    style={{
                                      borderLeftWidth: "2px",
                                      borderLeftColor: "#F59E0B",
                                      borderColor: theme.borderDefault,
                                      backgroundColor: mode === "dark" ? "rgba(245,158,11,0.05)" : theme.surface,
                                    }}
                                  >
                                    <div className="mb-2 flex items-center gap-2">
                                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#F59E0B" }} />
                                      <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textSecondary }}>
                                        Impact
                                      </span>
                                    </div>
                                    <p className="text-sm leading-relaxed" style={{ color: theme.textPrimary }}>
                                      {narrativeBlocks.mechanism}
                                    </p>
                                  </div>

                                  <div
                                    className="rounded-lg border p-3"
                                    style={{
                                      borderLeftWidth: "2px",
                                      borderLeftColor: "#10B981",
                                      borderColor: theme.borderDefault,
                                      backgroundColor: mode === "dark" ? "rgba(16,185,129,0.05)" : theme.surface,
                                    }}
                                  >
                                    <div className="mb-2 flex items-center gap-2">
                                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#10B981" }} />
                                      <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textSecondary }}>
                                        Action
                                      </span>
                                    </div>
                                    <p className="text-sm leading-relaxed" style={{ color: theme.textPrimary }}>
                                      {narrativeBlocks.optimization}
                                    </p>
                                  </div>
                                </div>
                                {patientContext && correlations.length > 0 && (
                                  <div className="mt-4 space-y-2">
                                    {correlations.map((insight, idx) => {
                                      const bg =
                                        insight.type === "warning"
                                          ? "rgba(245,158,11,0.12)"
                                          : insight.type === "success"
                                          ? "rgba(16,185,129,0.12)"
                                          : "rgba(59,130,246,0.12)";
                                      return (
                                        <div
                                          key={`${marker.code}-corr-${idx}`}
                                          className="rounded-lg border p-3 text-xs"
                                          style={{
                                            backgroundColor: mode === "dark" ? bg : theme.surfaceMuted,
                                            borderColor: theme.borderDefault,
                                            color: theme.textSecondary,
                                          }}
                                        >
                                          <div className="font-semibold blood-text-primary">{insight.message}</div>
                                          {insight.recommendation && (
                                            <div className="mt-1">→ {insight.recommendation}</div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-sm blood-text-secondary">Aucun marqueur pour ce systeme.</div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="markers" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-[0.33fr_0.67fr]">
                <Card className="border blood-border-default blood-surface p-6">
                  <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Panels</p>
                  <div className="mt-5 space-y-3">
                    {(Object.keys(PANEL_META) as PanelKey[]).map((key) => (
                      <div key={key} className="rounded-xl border blood-border-default blood-surface p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold blood-text-primary">{PANEL_META[key].label}</div>
                          {panelScores[key] === null ? (
                            <StatusBadge status="normal" label="N/A" className="opacity-70" />
                          ) : (
                            <StatusBadge status={scoreToStatus(panelScores[key]!)} label={`${panelScores[key]}/100`} />
                          )}
                        </div>
                        <p className="mt-2 text-xs blood-text-secondary">{PANEL_META[key].impact}</p>
                        <ul className="mt-3 space-y-1 text-xs blood-text-secondary">
                          {PANEL_META[key].bullets.map((bullet) => (
                            <li key={bullet} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.borderStrong }} />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="border blood-border-default blood-surface p-6">
                  <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Biomarqueurs</p>
                  <p className="mt-2 text-sm blood-text-secondary">
                    Chaque biomarqueur a son range normal, son range optimal, et une lecture orientee performance/sante.
                  </p>

                  <div className="mt-6">
                    <Accordion type="multiple" className="space-y-3">
                      {(Object.keys(PANEL_META) as PanelKey[]).flatMap((panelKey) => {
                        return markersByPanel[panelKey].map((marker) => {
                          const detail = getMarkerDetail(marker);
                          const citations = detail.citations.length
                            ? detail.citations
                            : BLOOD_PANEL_CITATIONS[panelKey] || [];
                          const deltaText = deltaFromOptimal(marker);
                          const percentile =
                            patientContext
                              ? getPercentileRank(marker.code, marker.value, patientContext.age, patientContext.sexe)
                              : null;
                          const correlations = patientContext
                            ? getCorrelationInsights(marker.code, marker.value, marker.unit, patientContext)
                            : [];
                          return (
                            <AccordionItem
                              key={`${panelKey}:${marker.code}`}
                              value={`${panelKey}:${marker.code}`}
                              className="rounded-xl border blood-border-default blood-surface px-4 transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.35)]"
                            >
                              <AccordionTrigger className="py-4 text-left hover:no-underline">
                                <div className="flex w-full items-start justify-between gap-4">
                                  <div>
                                    <div className="text-sm font-semibold blood-text-primary">{marker.name}</div>
                                    <div className="mt-1 text-xs blood-text-tertiary">{PANEL_META[panelKey].label}</div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-sm font-semibold blood-text-primary">
                                      <AnimatedNumber value={marker.value} decimals={1} /> {marker.unit}
                                    </div>
                                    <StatusBadge status={marker.status} />
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pb-5">
                                <BiomarkerRangeIndicator
                                  value={marker.value}
                                  unit={marker.unit}
                                  status={marker.status}
                                  normalMin={marker.refMin ?? undefined}
                                  normalMax={marker.refMax ?? undefined}
                                  optimalMin={marker.optimalMin ?? undefined}
                                  optimalMax={marker.optimalMax ?? undefined}
                                  normalLabel="Normal labo"
                                  optimalLabel="Optimal performance"
                                />
                                {(deltaText || percentile || (marker.optimalMin !== null && marker.optimalMax !== null)) && (
                                  <div className="mt-3 flex flex-wrap items-center gap-3">
                                    {deltaText && (
                                      <div className="flex items-center gap-2">
                                        {deltaText.includes("sous") ? (
                                          <TrendingDown size={18} style={{ color: "#F59E0B" }} />
                                        ) : deltaText.includes("au-dessus") ? (
                                          <TrendingUp size={18} style={{ color: "#10B981" }} />
                                        ) : (
                                          <CheckCircle2 size={18} style={{ color: theme.primaryBlue }} />
                                        )}
                                        <span
                                          className="text-sm font-semibold"
                                          style={{
                                            color: deltaText.includes("sous")
                                              ? "#F59E0B"
                                              : deltaText.includes("au-dessus")
                                              ? "#10B981"
                                              : theme.primaryBlue,
                                          }}
                                        >
                                          {deltaText}
                                        </span>
                                      </div>
                                    )}

                                    {percentile && (
                                      <div className="flex items-center gap-1.5 text-sm" style={{ color: theme.textSecondary }}>
                                        <span className="font-medium">·</span>
                                        <span>
                                          Top{" "}
                                          <span className="font-semibold" style={{ color: theme.primaryBlue }}>
                                            {100 - percentile}%
                                          </span>
                                        </span>
                                        <span className="text-xs" style={{ color: theme.textTertiary }}>
                                          ({patientContext?.age} ans)
                                        </span>
                                      </div>
                                    )}

                                    {marker.optimalMin !== null && marker.optimalMax !== null && (
                                      <div className="text-xs" style={{ color: theme.textTertiary }}>
                                        <span className="font-medium">Cible:</span> {marker.optimalMin}-{marker.optimalMax}{" "}
                                        {marker.unit}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {patientContext && correlations.length > 0 && (
                                  <div className="mt-4 space-y-2">
                                    {correlations.map((insight, idx) => {
                                      const bg =
                                        insight.type === "warning"
                                          ? "rgba(245,158,11,0.12)"
                                          : insight.type === "success"
                                          ? "rgba(16,185,129,0.12)"
                                          : "rgba(59,130,246,0.12)";
                                      return (
                                        <div
                                          key={`${marker.code}-corr-${idx}`}
                                          className="rounded-lg border p-3 text-xs"
                                          style={{
                                            backgroundColor: mode === "dark" ? bg : theme.surfaceMuted,
                                            borderColor: theme.borderDefault,
                                            color: theme.textSecondary,
                                          }}
                                        >
                                          <div className="font-semibold blood-text-primary">{insight.message}</div>
                                          {insight.recommendation && (
                                            <div className="mt-1">→ {insight.recommendation}</div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                  <div className="rounded-lg border blood-border-default blood-surface p-4">
                                    <div className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Definition</div>
                                    <p className="mt-2 text-sm blood-text-secondary leading-relaxed">{detail.definition}</p>
                                  </div>
                                  <div className="rounded-lg border blood-border-default blood-surface p-4">
                                    <div className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Mecanisme</div>
                                    <p className="mt-2 text-sm blood-text-secondary leading-relaxed">{detail.mechanism}</p>
                                  </div>
                                  <div className="rounded-lg border blood-border-default blood-surface p-4">
                                    <div className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Impact & optimisation</div>
                                    <p className="mt-2 text-sm blood-text-secondary leading-relaxed">{detail.impact}</p>
                                  </div>
                                </div>

                                <div className="mt-4 rounded-lg border blood-border-default blood-surface p-4">
                                  <div className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Protocole</div>
                                  <ul className="mt-3 space-y-2 text-sm blood-text-secondary">
                                    {detail.protocol.map((item) => (
                                      <li key={item} className="flex items-start gap-2">
                                        <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.primaryBlue }} />
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="mt-4 rounded-lg border blood-border-default blood-surface p-4">
                                  <div className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Recherche</div>
                                  {citations.length ? (
                                    <ul className="mt-3 space-y-2 text-xs blood-text-secondary">
                                      {citations.map((item) => (
                                        <li key={item.url}>
                                          →{" "}
                                          <a className="underline" style={{ color: theme.textSecondary }} href={item.url} target="_blank" rel="noreferrer">
                                            {item.title}
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="mt-3 text-xs blood-text-tertiary">Aucune source specifique associee.</p>
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        });
                      })}
                    </Accordion>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-[0.45fr_0.55fr]">
                <Card className="border blood-border-default blood-surface p-6">
                  <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Patterns detectes</p>
                  <div className="mt-6 space-y-4">
                    {patterns.length ? (
                      patterns.map((pattern) => (
                        <div key={pattern.name} className="rounded-xl border blood-border-default blood-surface p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-semibold blood-text-primary">{pattern.name}</div>
                              {!!pattern.causes?.length && (
                                <div className="mt-2 text-xs blood-text-secondary">
                                  Causes: {pattern.causes.slice(0, 3).join(" · ")}
                                </div>
                              )}
                            </div>
                            <StatusBadge status="suboptimal" />
                          </div>
                          {!!pattern.protocol?.length && (
                            <div className="mt-4">
                              <div className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Protocole</div>
                              <ul className="mt-3 space-y-2 text-sm blood-text-secondary">
                                {pattern.protocol.slice(0, 6).map((item) => (
                                  <li key={item} className="flex items-start gap-2">
                                    <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.primaryBlue }} />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm blood-text-secondary">Aucun pattern majeur detecte.</div>
                    )}
                  </div>
                </Card>

                <Card className="border blood-border-default blood-surface p-6">
                  <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Diabetes Risk Assessment</p>
                  {diabetes ? (
                    <div className="mt-4 space-y-3 text-sm blood-text-secondary">
                      <p>
                        Score: <span className="font-semibold blood-text-primary">{diabetes.score}/100</span> (risque {diabetes.level}).
                      </p>
                      <ul className="space-y-1">
                        {diabetes.gly !== null && <li>Glycemie a jeun: {diabetes.gly} mg/dL</li>}
                        {diabetes.a1c !== null && <li>HbA1c: {diabetes.a1c}%</li>}
                        {diabetes.insulin !== null && <li>Insuline: {diabetes.insulin} µIU/mL</li>}
                        {diabetes.homa !== null && <li>HOMA-IR: {diabetes.homa}</li>}
                      </ul>
                      <div className="rounded-lg border blood-border-default blood-surface p-4">
                        <div className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Protocole rapide</div>
                        <ul className="mt-2 space-y-2 text-sm blood-text-secondary">
                          <li>Reduire sucres rapides + repas ultra transformes.</li>
                          <li>Augmenter fibres + proteines a chaque repas.</li>
                          <li>Marche post-prandiale 10-15 min.</li>
                          <li>Sommeil 7-9h pour stabiliser l'insuline.</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm blood-text-secondary">Donnees insuffisantes pour estimer le risque.</p>
                  )}

                  <div className="mt-6 rounded-lg border blood-border-default blood-surface p-4">
                    <div className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Muscle & performance protocol</div>
                    <p className="mt-2 text-sm blood-text-secondary">
                      Priorite: sommeil profond, deficit calorique maitrise, entrainement lourd structure, micronutriments cles (vitamine D, zinc, magnesium).
                    </p>
                  </div>
                </Card>
              </div>

              {aiAnalysis ? (
                <Card className="mt-6 border blood-border-default blood-surface p-6">
                  <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Analyse detaillee</p>
                  <div className="prose mt-4 max-w-none prose-p:blood-text-secondary prose-li:blood-text-secondary prose-strong:blood-text-primary">
                    <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                  </div>
                </Card>
              ) : null}

              {protocolPhases.length > 0 && (
                <Card className="mt-6 border blood-border-default blood-surface p-6">
                  <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Protocoles en 3 phases</p>
                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    {protocolPhases.map((phase) => (
                      <div key={phase.id} className="rounded-xl border blood-border-default blood-surface p-4">
                        <div className="text-sm font-semibold blood-text-primary">{phase.title}</div>
                        <ul className="mt-3 space-y-2 text-xs blood-text-secondary">
                          {phase.items.slice(0, 4).map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.primaryBlue }} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card className="mt-6 border blood-border-default blood-surface p-6">
                <p className="text-xs uppercase tracking-[0.22em] blood-text-tertiary">Actions immediates</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {topMarkers.length ? (
                    topMarkers.map((marker) => (
                      <div key={marker.code} className="rounded-lg border blood-border-default blood-surface p-4">
                        <div className="text-sm font-semibold blood-text-primary">{marker.name}</div>
                        <p className="mt-2 text-xs blood-text-secondary">
                          Je priorise {marker.name.toLowerCase()} avec un protocole cible (sommeil, nutrition, supplements).
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm blood-text-secondary">Aucune action urgente detectee.</div>
                  )}
                </div>
              </Card>

              <div className="mt-6 flex items-center justify-between text-xs blood-text-tertiary">
                <span>Educationnel · Ne remplace pas un avis medical.</span>
                <Button
                  variant="outline"
                  className="hover:opacity-80"
                  style={{ borderColor: theme.borderDefault, color: theme.textSecondary }}
                  onClick={() => navigate("/offers/blood-analysis")}
                >
                  Acheter des credits
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
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
