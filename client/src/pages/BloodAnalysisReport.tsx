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
import { BIOMARKER_DETAILS, buildDefaultBiomarkerDetail, MARKER_CITATIONS } from "@/data/bloodBiomarkerDetails";
import { BLOOD_PANEL_CITATIONS } from "@/data/bloodPanelCitations";
import { type PatientContext } from "@/lib/biomarkerCorrelations";
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
    lifestyleCorrelations?: Array<{
      factor: string;
      current: string;
      impact: string;
      recommendation: string;
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

const buildRangeNote = (marker: BloodTestDetail["markers"][number]) => {
  const hasNormal = marker.refMin !== null && marker.refMax !== null;
  const hasOptimal = marker.optimalMin !== null && marker.optimalMax !== null;
  const unit = marker.unit ? ` ${marker.unit}` : "";
  if (hasNormal && hasOptimal) {
    return `Range labo ${marker.refMin}-${marker.refMax}${unit}. Zone performance ${marker.optimalMin}-${marker.optimalMax}${unit}.`;
  }
  if (hasNormal) {
    return `Range labo ${marker.refMin}-${marker.refMax}${unit}.`;
  }
  if (hasOptimal) {
    return `Zone performance ${marker.optimalMin}-${marker.optimalMax}${unit}.`;
  }
  return "";
};

const buildStatusNote = (status: MarkerStatus) => {
  switch (status) {
    case "critical":
      return "Niveau critique: priorite haute pour corriger les causes principales.";
    case "suboptimal":
      return "Sous-optimal: marges claires d'optimisation avec ajustements cibles.";
    case "normal":
      return "Dans la norme labo, mais l'optimal depend du contexte performance.";
    case "optimal":
      return "Zone optimale: niveau coherent avec performance et recuperation.";
    default:
      return "";
  }
};

const getMarkerDetail = (marker: BloodTestDetail["markers"][number]) => {
  const base = BIOMARKER_DETAILS[marker.code] || buildDefaultBiomarkerDetail(marker.name, statusLabel(marker.status));
  const rangeNote = buildRangeNote(marker);
  const statusNote = buildStatusNote(marker.status);
  const citations = MARKER_CITATIONS[marker.code] || base.citations || [];
  return {
    ...base,
    definition: `${base.definition}${rangeNote ? ` ${rangeNote}` : ""}`.trim(),
    mechanism: `${base.mechanism}${statusNote ? ` ${statusNote}` : ""}`.trim(),
    impact: `${base.impact} Le contexte clinique, la tendance dans le temps et les autres marqueurs modulent l'interpretation.`.trim(),
    citations,
  };
};

const buildScoreReflection = (marker: BloodTestDetail["markers"][number], percentile: number | null) => {
  const base = `Ta valeur de ${marker.value} ${marker.unit} est ${statusLabel(marker.status)}.`;
  let optimalNote = "";
  if (marker.optimalMin !== null && marker.optimalMax !== null) {
    if (marker.value < marker.optimalMin) {
      optimalNote = ` Tu es sous la zone optimale (${marker.optimalMin}-${marker.optimalMax} ${marker.unit}).`;
    } else if (marker.value > marker.optimalMax) {
      optimalNote = ` Tu es au-dessus de la zone optimale (${marker.optimalMin}-${marker.optimalMax} ${marker.unit}).`;
    } else {
      optimalNote = ` Tu es dans la zone optimale (${marker.optimalMin}-${marker.optimalMax} ${marker.unit}).`;
    }
  }
  const percentileNote = percentile ? ` Tu te situes autour du ${percentile}e percentile pour ce profil.` : "";
  return `${base}${optimalNote}${percentileNote}`.trim();
};

const buildCriticalAlerts = (markers: BloodTestDetail["markers"]) => {
  const lookup = (code: string) => markers.find((m) => m.code === code);
  const alerts: Array<{ title: string; detail: string; action: string }> = [];

  const homa = lookup("homa_ir");
  if (homa && homa.value >= 3.5) {
    alerts.push({
      title: "Resistance a l'insuline probable",
      detail: `HOMA-IR ${homa.value} (seuil critique >= 3.5).`,
      action: "Priorite: stabiliser glycemie, reduire sucres rapides, augmenter activite post-repas.",
    });
  }

  const tg = lookup("triglycerides");
  if (tg && tg.value >= 500) {
    alerts.push({
      title: "Hypertriglyceridemie severe",
      detail: `Triglycerides ${tg.value} mg/dL (risque pancreatite).`,
      action: "Action rapide: reduire alcool/sucres, revoir lipides, bilan medical conseille.",
    });
  } else if (tg && tg.value >= 200) {
    alerts.push({
      title: "Triglycerides eleves",
      detail: `Triglycerides ${tg.value} mg/dL.`,
      action: "Optimiser insuline, omega-3, fibres et activite cardio moderee.",
    });
  }

  const crp = lookup("crp_us");
  if (crp && crp.value >= 3) {
    alerts.push({
      title: "Inflammation systemique elevee",
      detail: `CRP-us ${crp.value} (>= 3).`,
      action: "Priorite: sommeil, reduction inflammation, verifier sources d'inflammation.",
    });
  }

  const a1c = lookup("hba1c");
  if (a1c && a1c.value >= 6.5) {
    alerts.push({
      title: "HbA1c tres elevee",
      detail: `HbA1c ${a1c.value}% (>= 6.5).`,
      action: "Action rapide: suivi medical + correction nutrition/entrainement.",
    });
  }

  const gly = lookup("glycemie_jeun");
  if (gly && gly.value >= 126) {
    alerts.push({
      title: "Glycemie a jeun critique",
      detail: `Glycemie a jeun ${gly.value} mg/dL (>= 126).`,
      action: "Priorite: stabiliser glucose et revoir strategie alimentaire.",
    });
  }

  if (!alerts.length) {
    const fallback = markers
      .filter((m) => m.status === "critical")
      .slice(0, 3)
      .map((m) => ({
        title: `${m.name} critique`,
        detail: `${m.value} ${m.unit}`,
        action: "A traiter en priorite cette semaine.",
      }));
    return fallback;
  }

  return alerts.slice(0, 4);
};

const trimLongText = (text: string, maxChars = 18000) => {
  if (!text) return "";
  if (text.length <= maxChars) return text.trim();
  const sliced = text.slice(0, maxChars);
  const lastBreak = sliced.lastIndexOf("\n\n");
  return (lastBreak > 1000 ? sliced.slice(0, lastBreak) : sliced).trim();
};


function scoreToRingColors(score: number) {
  if (score < 50) return { start: "#F43F5E", end: "#EF4444" };
  if (score < 70) return { start: "#FB923C", end: "#F59E0B" };
  if (score < 85) return { start: "#34D399", end: "#10B981" };
  return { start: "#00E5FF", end: "#38BDF8" };
}

function ScoreDonut({ score, muted, textPrimary, textTertiary }: { score: number; muted: string; textPrimary: string; textTertiary: string }) {
  const circumference = 2 * Math.PI * 56;
  const clampedScore = Math.max(0, Math.min(100, score));
  const dash = (clampedScore / 100) * circumference;
  const dashOffset = circumference - dash;
  const { start, end } = scoreToRingColors(clampedScore);
  const gradientId = useId();
  const glowId = useId();
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="h-36 w-36 -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={start} />
            <stop offset="100%" stopColor={end} />
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
      <motion.div
        className="pointer-events-none absolute h-36 w-36 rounded-full"
        animate={{
          boxShadow: [
            `0 0 0 rgba(0,229,255,0.0)`,
            `0 0 24px rgba(0,229,255,0.35)`,
            `0 0 0 rgba(0,229,255,0.0)`,
          ],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[80px] font-semibold leading-none tracking-tight" style={{ color: textPrimary }}>
          <AnimatedNumber value={score} decimals={0} />
        </div>
        <div className="text-xs tracking-[0.2em] uppercase" style={{ color: textTertiary }}>{scoreLabel(score)}</div>
      </div>
    </div>
  );
}

function MiniScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 20;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * circumference;
  const dashOffset = circumference - dash;
  const { start, end } = scoreToRingColors(clamped);
  const gradientId = useId();
  return (
    <svg className="h-12 w-12 -rotate-90">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={start} />
          <stop offset="100%" stopColor={end} />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.12)" strokeWidth="4" fill="none" />
      <motion.circle
        cx="24"
        cy="24"
        r="20"
        stroke={`url(#${gradientId})`}
        strokeWidth="4"
        fill="none"
        strokeDasharray={circumference}
        strokeLinecap="round"
        strokeDashoffset={circumference}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </svg>
  );
}

function BloodAnalysisReportInner() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const [, navigate] = useLocation();
  const { theme } = useBloodTheme();
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
  const aiAnalysisDisplay = useMemo(() => trimLongText(aiAnalysis), [aiAnalysis]);
  const protocolPhases = data?.analysis?.protocolPhases || [];
  const lifestyleCorrelations = data?.analysis?.lifestyleCorrelations || [];

  const summaryCounts = useMemo(() => {
    const markers = data?.markers || [];
    return {
      total: markers.length,
      optimal: markers.filter((m) => m.status === "optimal").length,
      normal: markers.filter((m) => m.status === "normal").length,
      suboptimal: markers.filter((m) => m.status === "suboptimal").length,
      critical: markers.filter((m) => m.status === "critical").length,
    };
  }, [data?.markers]);

  const criticalAlerts = useMemo(() => buildCriticalAlerts(data?.markers || []), [data?.markers]);

  const urgentMarkers = useMemo(() => {
    return (data?.markers || []).filter((m) => m.status === "critical").slice(0, 4);
  }, [data?.markers]);

  const staggerContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

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
            <h1 className="mt-3 text-xl font-semibold blood-text-primary">Dossier patient</h1>
            <p className="mt-2 max-w-2xl text-sm blood-text-secondary">
              Resume clinique et performance base sur tes biomarqueurs sanguins.
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

        <div className="mt-10 space-y-16">
          <motion.section
            id="overview"
            initial="hidden"
            animate="show"
            variants={fadeUp}
          >
            <div className="grid gap-8 lg:grid-cols-[0.58fr_0.42fr]">
              <div>
                <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Synthese globale</p>
                <h2 className="mt-3 blood-hero blood-text-primary">{displayName}, voici ton bilan sanguin expert.</h2>
                <p className="mt-4 text-base blood-text-secondary">{narrative}</p>
                <div className="mt-6 flex flex-wrap gap-3 text-xs">
                  <span className="rounded-full border blood-border-default blood-surface px-3 py-1 text-xs blood-text-secondary">
                    Optimal {summaryCounts.optimal}
                  </span>
                  <span className="rounded-full border blood-border-default blood-surface px-3 py-1 text-xs blood-text-secondary">
                    Normal {summaryCounts.normal}
                  </span>
                  <span className="rounded-full border blood-border-default blood-surface px-3 py-1 text-xs blood-text-secondary">
                    A surveiller {summaryCounts.suboptimal}
                  </span>
                  <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300">
                    Critiques {summaryCounts.critical}
                  </span>
                </div>
                {criticalAlerts.length > 0 && (
                  <Card className="mt-6 border border-rose-500/40 bg-rose-500/10 p-5">
                    <p className="text-[12px] uppercase tracking-[0.2em] text-rose-200">Alertes prioritaires</p>
                    <ul className="mt-4 space-y-3 text-sm text-rose-100">
                      {criticalAlerts.map((alert) => (
                        <li key={alert.title}>
                          <div className="font-semibold">{alert.title}</div>
                          <div className="mt-1 text-xs text-rose-100/80">{alert.detail}</div>
                          <div className="mt-1 text-xs text-rose-200">Action: {alert.action}</div>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
                <div className="mt-6">
                  <a
                    href="#systems"
                    className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[12px] uppercase tracking-[0.2em] transition hover:border-white/40"
                    style={{ borderColor: theme.borderDefault, color: theme.textSecondary }}
                  >
                    Voir le detail
                  </a>
                </div>
              </div>

              <Card className="border blood-border-default blood-surface p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Score global</p>
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
            </div>
          </motion.section>

          {lifestyleCorrelations.length > 0 && (
            <motion.section
              id="correlations"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeUp}
            >
              <Card className="border blood-border-default blood-surface p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Correlations lifestyle</p>
                    <h2 className="mt-3 blood-h2 blood-text-primary">Ce qui relie tes habitudes aux marqueurs</h2>
                    <p className="mt-2 text-sm blood-text-secondary">
                      Base sur les informations renseignees avant l upload. Ajuste ces leviers pour corriger les marqueurs prioritaires.
                    </p>
                  </div>
                  <a
                    href="#biomarkers"
                    className="rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.2em] transition hover:border-white/40"
                    style={{ borderColor: theme.borderDefault, color: theme.textSecondary }}
                  >
                    Voir marqueurs
                  </a>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {lifestyleCorrelations.map((item) => (
                    <div key={item.factor} className="rounded-xl border blood-border-default blood-surface-muted p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold blood-text-primary">{item.factor}</p>
                          <p className="mt-1 text-xs blood-text-tertiary">{item.current}</p>
                        </div>
                        <StatusIndicator status="suboptimal" />
                      </div>
                      <p className="mt-3 text-sm blood-text-secondary">{item.impact}</p>
                      <p className="mt-3 text-xs blood-text-secondary">
                        Action: <span className="font-semibold blood-text-primary">{item.recommendation}</span>
                      </p>
                      {item.evidence && <p className="mt-2 text-xs blood-text-tertiary">{item.evidence}</p>}
                    </div>
                  ))}
                </div>
              </Card>
            </motion.section>
          )}

          <motion.section
            id="systems"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Systemes</p>
                <h2 className="mt-3 blood-h2 blood-text-primary">Cartographie par systeme</h2>
                <p className="mt-2 text-sm blood-text-secondary">
                  Clique sur un systeme pour descendre directement a ses biomarqueurs.
                </p>
              </div>
              <div className="text-xs blood-text-tertiary">6 systemes critiques pour performance & sante</div>
            </div>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              {(Object.keys(PANEL_META) as PanelKey[]).map((key) => {
                const score = panelScores[key] ?? 0;
                const markers = markersByPanel[key];
                const critical = markers.filter((m) => m.status === "critical").length;
                const suboptimal = markers.filter((m) => m.status === "suboptimal").length;
                return (
                  <motion.a
                    key={key}
                    variants={fadeUp}
                    href={`#system-${key}`}
                    className="group rounded-2xl border blood-border-default blood-surface p-5 transition hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold blood-text-primary">{PANEL_META[key].label}</div>
                        <div className="mt-1 text-xs blood-text-tertiary">
                          {markers.length} marqueurs · {critical} critiques · {suboptimal} a surveiller
                        </div>
                      </div>
                      <MiniScoreRing score={score} />
                    </div>
                    <p className="mt-4 text-xs blood-text-secondary">{PANEL_META[key].impact}</p>
                    <div className="mt-4 inline-flex items-center gap-2 text-xs blood-text-tertiary">
                      <ShieldAlert className="h-4 w-4" style={{ color: theme.primaryBlue }} />
                      {score}/100
                    </div>
                  </motion.a>
                );
              })}
            </motion.div>
            <div className="mt-8 grid gap-6 lg:grid-cols-[0.6fr_0.4fr]">
              <Card className="border blood-border-default blood-surface p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Radar systemique</p>
                    <p className="mt-2 text-sm blood-text-secondary">Equilibre global des 6 axes cles.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 text-xs blood-text-tertiary">
                    <ShieldAlert className="h-4 w-4" style={{ color: theme.primaryBlue }} />
                    Optimal cible
                  </div>
                </div>
                <div className="mt-6">
                  <BloodRadar data={radarData} height={320} accentColor={theme.primaryBlue} />
                </div>
              </Card>

              <div className="grid gap-4">
                <Card className="border blood-border-default blood-surface p-5">
                  <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Hormonal index</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-2xl font-semibold blood-text-primary">
                      {typeof anabolicIndex === "number" ? <AnimatedNumber value={anabolicIndex} decimals={0} /> : "N/A"}
                    </div>
                    {typeof anabolicIndex === "number" && <StatusBadge status={scoreToStatus(anabolicIndex)} />}
                  </div>
                  <p className="mt-2 text-xs blood-text-secondary">Levier majeur pour prise de muscle et libido.</p>
                </Card>

                <Card className="border blood-border-default blood-surface p-5">
                  <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Recomp readiness</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-2xl font-semibold blood-text-primary">
                      {typeof recompReadiness === "number" ? <AnimatedNumber value={recompReadiness} decimals={0} /> : "N/A"}
                    </div>
                    {typeof recompReadiness === "number" && <StatusBadge status={scoreToStatus(recompReadiness)} />}
                  </div>
                  <p className="mt-2 text-xs blood-text-secondary">Capacite a perdre du gras sans perdre du muscle.</p>
                </Card>

                <Card className="border blood-border-default blood-surface p-5">
                  <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Diabetes risk</p>
                  {diabetes ? (
                    <>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-2xl font-semibold blood-text-primary">
                          <AnimatedNumber value={diabetes.score} decimals={0} />/100
                        </div>
                        <StatusBadge status={diabetes.score >= 75 ? "critical" : diabetes.score >= 55 ? "suboptimal" : "normal"} />
                      </div>
                      <p className="mt-2 text-xs blood-text-secondary">Risque {diabetes.level}. Stabiliser glycemie & insuline.</p>
                    </>
                  ) : (
                    <p className="mt-3 text-xs blood-text-secondary">Donnees insuffisantes.</p>
                  )}
                </Card>
              </div>
            </div>
          </motion.section>

          <section id="biomarkers" className="space-y-12">
            {(Object.keys(PANEL_META) as PanelKey[]).map((panelKey) => {
              const markers = markersByPanel[panelKey];
              const panelScore = panelScores[panelKey];
              return (
                <div key={panelKey} id={`system-${panelKey}`} className="scroll-mt-24 space-y-6">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Systeme</p>
                      <h3 className="mt-2 text-2xl font-semibold tracking-tight blood-text-primary">{PANEL_META[panelKey].label}</h3>
                      <p className="mt-2 text-sm blood-text-secondary">{PANEL_META[panelKey].impact}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {panelScore === null ? (
                        <StatusBadge status="normal" label="N/A" className="opacity-70" />
                      ) : (
                        <StatusBadge status={scoreToStatus(panelScore)} label={`${panelScore}/100`} />
                      )}
                    </div>
                  </div>

                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.2 }}
                    className="grid gap-6"
                  >
                    {markers.length ? (
                      markers.map((marker) => {
                        const detail = getMarkerDetail(marker);
                        const citations = detail.citations.length
                          ? detail.citations
                          : BLOOD_PANEL_CITATIONS[panelKey] || [];
                        const percentile =
                          patientContext
                            ? getPercentileRank(marker.code, marker.value, patientContext.age, patientContext.sexe)
                            : null;
                        const scoreReflection = buildScoreReflection(marker, percentile);
                        const impactItems = detail.impact
                          .split(". ")
                          .map((item) => item.trim())
                          .filter(Boolean);
                        return (
                          <motion.div
                            key={marker.code}
                            variants={fadeUp}
                            className="rounded-2xl border blood-border-default blood-surface p-6 transition hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">{marker.code}</p>
                                <div className="mt-2 text-lg font-semibold blood-text-primary">{marker.name}</div>
                                <p className="mt-1 text-xs blood-text-tertiary">{PANEL_META[panelKey].label}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-semibold blood-text-primary">
                                  <AnimatedNumber value={marker.value} decimals={1} /> {marker.unit}
                                </div>
                                <StatusBadge status={marker.status} />
                              </div>
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
                            <div className="mt-6 grid gap-4 lg:grid-cols-2">
                              <div className="rounded-xl border blood-border-default blood-surface-muted p-4">
                                <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">C'est quoi</p>
                                <p className="mt-2 text-sm blood-text-secondary leading-relaxed">{detail.definition}</p>
                              </div>
                              <div className="rounded-xl border blood-border-default blood-surface-muted p-4">
                                <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Ce que reflète ton score</p>
                                <p className="mt-2 text-sm blood-text-secondary leading-relaxed">{detail.mechanism}</p>
                                {marker.interpretation ? (
                                  <p className="mt-3 text-sm blood-text-secondary leading-relaxed">{marker.interpretation}</p>
                                ) : null}
                                <p className="mt-3 text-xs blood-text-tertiary">{scoreReflection}</p>
                              </div>
                              <div className="rounded-xl border blood-border-default blood-surface-muted p-4">
                                <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Impacts sur ton corps</p>
                                {impactItems.length > 1 ? (
                                  <ul className="mt-3 space-y-2 text-sm blood-text-secondary">
                                    {impactItems.slice(0, 4).map((item) => (
                                      <li key={item} className="flex items-start gap-2">
                                        <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.primaryBlue }} />
                                        <span>{item}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="mt-2 text-sm blood-text-secondary leading-relaxed">{detail.impact}</p>
                                )}
                              </div>
                              <div className="rounded-xl border blood-border-default blood-surface-muted p-4">
                                <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Protocole recommande</p>
                                <ul className="mt-3 space-y-2 text-sm blood-text-secondary">
                                  {detail.protocol.map((item) => (
                                    <li key={item} className="flex items-start gap-2">
                                      <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.primaryBlue }} />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            <div className="mt-5 rounded-xl border blood-border-default blood-surface-muted p-4">
                              <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Sources</p>
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
                                <p className="mt-2 text-xs blood-text-tertiary">Aucune source specifique associee.</p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <p className="text-sm blood-text-secondary">Aucun biomarqueur renseigne pour ce systeme.</p>
                    )}
                  </motion.div>
                </div>
              );
            })}
          </section>

          <motion.section
            id="patterns"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            className="space-y-6"
          >
            <div>
              <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Patterns & insights</p>
              <h2 className="mt-3 blood-h2 blood-text-primary">Lecture croisee de tes marqueurs</h2>
              <p className="mt-2 text-sm blood-text-secondary">
                Je recoupe tes biomarqueurs pour identifier des syndromes fonctionnels et des priorites cliniques.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-[0.55fr_0.45fr]">
              <Card className="border blood-border-default blood-surface p-6">
                <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Patterns detectes</p>
                <div className="mt-6 space-y-4">
                  {patterns.length ? (
                    patterns.map((pattern) => (
                      <div key={pattern.name} className="rounded-xl border blood-border-default blood-surface-muted p-5">
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
                            <div className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Protocole</div>
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
                <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Diabetes Risk Assessment</p>
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
                    <div className="rounded-lg border blood-border-default blood-surface-muted p-4">
                      <div className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Protocole rapide</div>
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
              </Card>
            </div>

            {aiAnalysisDisplay ? (
              <Card className="border blood-border-default blood-surface p-6">
                <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Analyse detaillee</p>
                <div className="prose mt-4 max-w-none prose-p:blood-text-secondary prose-li:blood-text-secondary prose-strong:blood-text-primary">
                  <ReactMarkdown>{aiAnalysisDisplay}</ReactMarkdown>
                </div>
              </Card>
            ) : null}
          </motion.section>

          <motion.section
            id="action-plan"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            className="space-y-6"
          >
            <div>
              <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Action plan</p>
              <h2 className="mt-3 blood-h2 blood-text-primary">Plan d'action personnalise</h2>
              <p className="mt-2 text-sm blood-text-secondary">
                Priorites immediates, protocole court terme et retest planifie.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="border border-rose-500/40 bg-rose-500/10 p-6">
                <p className="text-[12px] uppercase tracking-[0.2em] text-rose-200">Urgent cette semaine</p>
                {urgentMarkers.length ? (
                  <ul className="mt-4 space-y-2 text-sm text-rose-100">
                    {urgentMarkers.map((marker) => (
                      <li key={marker.code} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-rose-300" />
                        <span>{marker.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-rose-100">Pas de marqueur critique detecte.</p>
                )}
              </Card>

              <Card className="border blood-border-default blood-surface p-6">
                <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Court terme (1 mois)</p>
                {protocolPhases[0]?.items?.length ? (
                  <ul className="mt-4 space-y-2 text-sm blood-text-secondary">
                    {protocolPhases[0].items.slice(0, 5).map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.primaryBlue }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm blood-text-secondary">Focus: sommeil, nutrition, stabilite metabolique.</p>
                )}
              </Card>

              <Card className="border blood-border-default blood-surface p-6">
                <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Moyen terme (3 mois)</p>
                {protocolPhases[1]?.items?.length ? (
                  <ul className="mt-4 space-y-2 text-sm blood-text-secondary">
                    {protocolPhases[1].items.slice(0, 5).map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.primaryBlue }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm blood-text-secondary">Retest conseille a 3-6 mois.</p>
                )}
              </Card>
            </div>
          </motion.section>

          <motion.section
            id="sources"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            variants={fadeUp}
            className="space-y-6"
          >
            <div>
              <p className="text-[12px] uppercase tracking-[0.2em] blood-text-tertiary">Sources</p>
              <h2 className="mt-3 blood-h2 blood-text-primary">References scientifiques</h2>
            </div>
            <Card className="border blood-border-default blood-surface p-6">
              <div className="grid gap-4 md:grid-cols-2">
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
            <div className="flex items-center justify-between text-xs blood-text-tertiary">
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
          </motion.section>
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
