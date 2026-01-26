import { useMemo } from "react";
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
import { BLOOD_THEME } from "@/components/blood/bloodTheme";
import { BloodRadar } from "@/components/blood/BloodRadar";
import { StatusBadge } from "@/components/blood/StatusBadge";
import { BiomarkerRangeIndicator } from "@/components/blood/BiomarkerRangeIndicator";
import { StatusIndicator } from "@/components/blood/StatusIndicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
    impact: "Impact direct sur prise de muscle, libido, recuperation.",
    icon: Flame,
  },
  thyroid: {
    label: "Thyroide",
    bullets: ["TSH, T3, T4", "Anti-TPO, T3 reverse", "Conversion et regulation"],
    impact: "Levier majeur sur metabolismes et perte de gras.",
    icon: Activity,
  },
  metabolic: {
    label: "Metabolisme",
    bullets: ["Glycemie, HbA1c, HOMA-IR", "Lipides (TG/HDL/LDL)", "ApoB, Lp(a)"],
    impact: "Determine ton aptitude a bruler la graisse.",
    icon: HeartPulse,
  },
  inflammatory: {
    label: "Inflammation",
    bullets: ["CRP-us, homocysteine", "Ferritine, fer serique", "Saturation transferrine"],
    impact: "Inflammation haute = recuperation ralentie.",
    icon: ShieldAlert,
  },
  vitamins: {
    label: "Vitamines",
    bullets: ["Vitamine D, B12, folate", "Magnesium RBC", "Zinc"],
    impact: "Micronutriments = performance et energie.",
    icon: Dna,
  },
  liver_kidney: {
    label: "Foie/Rein",
    bullets: ["ALT/AST/GGT", "Creatinine/eGFR", "Lecture hepatique + renale"],
    impact: "Detox, metabolisme des hormones.",
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

const getMarkerNarrative = (marker: BloodTestDetail["markers"][number], panel: PanelKey) => {
  const statusTone =
    marker.status === "critical"
      ? "critique"
      : marker.status === "suboptimal"
      ? "sous-optimal"
      : marker.status === "normal"
      ? "normal"
      : "optimal";

  const definition = `Ta valeur (${marker.value} ${marker.unit}) est ${statusTone}. ${marker.interpretation ? marker.interpretation : `Je l'analyse dans le contexte ${PANEL_META[panel].label.toLowerCase()}.`}`;
  const mechanism = `Quand ${marker.name} est ${statusTone}, l'impact est direct sur ${PANEL_META[panel].impact.toLowerCase()}`;
  const optimization =
    panel === "hormonal"
      ? "Je commence par optimiser sommeil, entrainement et lipides essentiels pour remonter l'anabolisme."
      : panel === "metabolic"
      ? "Je stabilise la glycemie, j'ameliore la sensibilite a l'insuline et je structure le timing glucidique."
      : panel === "thyroid"
      ? "Je securise la conversion T4 → T3 et je reduis les freins inflammatoires."
      : panel === "vitamins"
      ? "Je corrige les deficits micronutriments pour restaurer energie et recuperation."
      : "Je corrige les fondamentaux (sommeil, inflammation, nutriments) avant d'aller plus loin.";

  return { definition, mechanism, optimization };
};

function ScoreDonut({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 56;
  const dash = (score / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="h-36 w-36 -rotate-90">
        <circle cx="72" cy="72" r="56" stroke="rgba(15, 23, 42, 0.12)" strokeWidth="10" fill="none" />
        <circle
          cx="72"
          cy="72"
          r="56"
          stroke={BLOOD_THEME.primaryBlue}
          strokeWidth="10"
          fill="none"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-4xl font-semibold tracking-tight text-slate-900">{score}</div>
        <div className="text-xs tracking-[0.2em] uppercase text-slate-500">{scoreLabel(score)}</div>
      </div>
    </div>
  );
}

export default function BloodAnalysisReport() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const [, navigate] = useLocation();
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
    return (Object.keys(PANEL_META) as PanelKey[]).map((key) => {
      const score = panelScores[key];
      if (score === null) {
        return { key, label: PANEL_META[key].label, score: 0, status: "normal" as MarkerStatus, muted: true };
      }
      return { key, label: PANEL_META[key].label, score, status: scoreToStatus(score) };
    });
  }, [panelScores]);

  const globalScore = data?.analysis?.globalScore ?? data?.bloodTest?.globalScore ?? 0;
  const patient = data?.bloodTest?.patient || data?.analysis?.patient || null;
  const displayName = patient?.prenom || (me?.user?.email ? me.user.email.split("@")[0] : "toi");
  const patientAge = patient?.dob ? Math.floor((Date.now() - new Date(patient.dob).getTime()) / 31557600000) : null;
  const genderLabel = patient?.gender === "femme" ? "Femme" : patient?.gender === "homme" ? "Homme" : "N/A";

  const anabolicIndex = panelScores.hormonal;
  const recompReadiness = average([panelScores.hormonal, panelScores.thyroid, panelScores.metabolic]);
  const diabetes = data?.markers ? diabetesRisk(data.markers) : null;

  const topMarkers = useMemo(() => {
    return (data?.markers || [])
      .filter((m) => m.status === "critical" || m.status === "suboptimal")
      .slice(0, 3);
  }, [data?.markers]);

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
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-24 text-slate-600">
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
          <div className="text-lg font-semibold text-slate-900">
            {isUnauthorized ? "Connexion requise." : "Rapport introuvable."}
          </div>
          <div className="text-sm text-slate-600">
            {isUnauthorized ? "Connecte-toi pour ouvrir ce rapport." : "Le lien est invalide ou le rapport n'est pas accessible."}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              className="text-white"
              style={{ backgroundColor: BLOOD_THEME.primaryBlue }}
              onClick={() => navigate(`/auth/login?next=/analysis/${encodeURIComponent(reportId)}`)}
            >
              Se connecter
            </Button>
            <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => navigate("/blood-dashboard")}>
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
          <Card className="border border-slate-200 bg-white p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: BLOOD_THEME.primaryBlue }} />
            </div>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">Analyse en cours</h1>
            <p className="mt-3 text-sm text-slate-600">
              J'extrais tes biomarqueurs et je construis le rapport. La page se met a jour automatiquement.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button className="text-white" style={{ backgroundColor: BLOOD_THEME.primaryBlue }} onClick={() => refetch()}>
                Rafraichir
              </Button>
              <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => navigate("/blood-dashboard")}>
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
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Blood Analysis</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900">
              {displayName}, voici ton bilan sanguin expert.
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600 leading-relaxed">
              Je compare tes ranges labo (normaux) aux ranges optimaux (performance/longévité), je detecte les patterns,
              puis je te donne une trajectoire claire.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                <FileText className="h-3.5 w-3.5" />
                {data.bloodTest.fileName}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                {new Date(data.bloodTest.uploadedAt).toLocaleDateString("fr-FR", { dateStyle: "medium" })}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                {data.markers.length} biomarqueurs
              </span>
              {data.analysis.temporalRisk && (
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1">
                  Risque: {data.analysis.temporalRisk.level} ({data.analysis.temporalRisk.score}/100)
                </span>
              )}
            </div>
            <div className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Patient</span>
                <div className="mt-1 text-sm text-slate-800">
                  {patient?.prenom || ""} {patient?.nom || ""}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Sexe</span>
                <div className="mt-1 text-sm text-slate-800">{genderLabel}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Age</span>
                <div className="mt-1 text-sm text-slate-800">{patientAge ?? "N/A"} {patientAge ? "ans" : ""}</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Email</span>
                <div className="mt-1 text-sm text-slate-800">{patient?.email || "N/A"}</div>
              </div>
            </div>
          </div>

          <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => navigate("/blood-dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>

        <div className="mt-10">
          <Tabs defaultValue="overview">
            <TabsList className="border border-slate-200 bg-white/80 p-1">
              <TabsTrigger value="overview" className="text-slate-600 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                Overview
              </TabsTrigger>
              <TabsTrigger value="systems" className="text-slate-600 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                Systemes
              </TabsTrigger>
              <TabsTrigger value="markers" className="text-slate-600 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                Biomarqueurs
              </TabsTrigger>
              <TabsTrigger value="insights" className="text-slate-600 data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                Insights
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-[0.45fr_0.55fr]">
                <Card className="border border-slate-200 bg-white p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Score global</p>
                      <p className="mt-2 text-sm text-slate-600">Lecture multi-systemes sur 100.</p>
                    </div>
                    <StatusIndicator status={scoreToStatus(globalScore)} />
                  </div>
                  <div className="mt-6 flex justify-center">
                    <ScoreDonut score={globalScore} />
                  </div>
                  <div className="mt-6 grid gap-3">
                    {(Object.keys(PANEL_META) as PanelKey[]).map((key) => {
                      const score = panelScores[key];
                      return (
                        <div key={key} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-sm font-medium text-slate-900">{PANEL_META[key].label}</div>
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

                <Card className="border border-slate-200 bg-white p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Balance systemique</p>
                      <p className="mt-2 text-sm text-slate-600">6 panels, score 0-100.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 text-xs text-slate-500">
                      <ShieldAlert className="h-4 w-4" style={{ color: BLOOD_THEME.primaryBlue }} />
                      Optimal vs normal
                    </div>
                  </div>
                  <div className="mt-6">
                    <BloodRadar data={radarData} height={320} accentColor={BLOOD_THEME.primaryBlue} />
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {patterns.length ? (
                      patterns.slice(0, 2).map((pattern) => (
                        <div key={pattern.name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-900">{pattern.name}</div>
                            <StatusBadge status="suboptimal" />
                          </div>
                          {!!pattern.causes?.length && (
                            <ul className="mt-3 space-y-1 text-xs text-slate-600">
                              {pattern.causes.slice(0, 3).map((cause) => (
                                <li key={cause} className="flex items-start gap-2">
                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-300" />
                                  <span>{cause}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-600">Aucun pattern majeur detecte.</div>
                    )}
                  </div>
                </Card>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Card className="border border-slate-200 bg-white p-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Hormonal & anabolic index</p>
                  <p className="mt-2 text-sm text-slate-600">Levier majeur prise de muscle / perte de gras.</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-3xl font-semibold text-slate-900">{anabolicIndex ?? "N/A"}</div>
                    {typeof anabolicIndex === "number" && <StatusBadge status={scoreToStatus(anabolicIndex)} />}
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {typeof anabolicIndex === "number"
                      ? "Si ce score est bas, tes resultats stagnent meme avec un entrainement dur."
                      : "Pas assez de donnees pour conclure sur l'axe anabolique."}
                  </p>
                </Card>

                <Card className="border border-slate-200 bg-white p-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Body recomp readiness</p>
                  <p className="mt-2 text-sm text-slate-600">Synthese hormones + thyroide + metabolisme.</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-3xl font-semibold text-slate-900">{recompReadiness ?? "N/A"}</div>
                    {typeof recompReadiness === "number" && <StatusBadge status={scoreToStatus(recompReadiness)} />}
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {typeof recompReadiness === "number"
                      ? "Plus ce score est haut, plus ta recomposition est realiste."
                      : "Donnees insuffisantes pour estimer la recomposition."}
                  </p>
                </Card>

                <Card className="border border-slate-200 bg-white p-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Diabetes risk assessment</p>
                  <p className="mt-2 text-sm text-slate-600">Lecture glycémie, HbA1c, insuline, HOMA-IR.</p>
                  {diabetes ? (
                    <>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-3xl font-semibold text-slate-900">{diabetes.score}/100</div>
                        <StatusBadge status={diabetes.score >= 75 ? "critical" : diabetes.score >= 55 ? "suboptimal" : "normal"} />
                      </div>
                      <p className="mt-3 text-sm text-slate-600">
                        Risque {diabetes.level}. Priorite: stabiliser la glycemie et l'insuline.
                      </p>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-slate-600">Donnees insuffisantes pour estimer le risque.</p>
                  )}
                </Card>
              </div>

              <div className="mt-6">
                <Card className="border border-slate-200 bg-white p-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Lecture humaine</p>
                  <p className="mt-3 text-sm text-slate-700 leading-relaxed">{narrative}</p>
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
                    <Card key={key} className="border border-slate-200 bg-white p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Systeme</p>
                          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{PANEL_META[key].label}</h3>
                          <p className="mt-2 text-sm text-slate-600">{intro}</p>
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
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Lecture rapide</p>
                          <p className="mt-2 text-sm text-slate-600">{PANEL_META[key].impact}</p>
                          <ul className="mt-3 space-y-2 text-xs text-slate-600">
                            {PANEL_META[key].bullets.map((bullet) => (
                              <li key={bullet} className="flex items-start gap-2">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Points d'attention</p>
                          {highlights.length ? (
                            <ul className="mt-3 space-y-2 text-sm text-slate-700">
                              {highlights.map((marker) => (
                                <li key={marker.code} className="flex items-center justify-between gap-3">
                                  <span className="font-medium text-slate-900">{marker.name}</span>
                                  <StatusBadge status={marker.status} label={`${marker.value} ${marker.unit}`} />
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-3 text-sm text-slate-600">Pas de signal critique sur ce systeme.</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {markers.length ? (
                          markers.map((marker) => {
                            const narrativeBlocks = getMarkerNarrative(marker, key);
                            return (
                              <div key={marker.code} className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="text-sm font-semibold text-slate-900">{marker.name}</div>
                                    <div className="text-xs text-slate-500">{marker.code}</div>
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
                                  />
                                </div>
                                <div className="mt-4 space-y-2 text-sm text-slate-600">
                                  <p>
                                    <span className="font-semibold text-slate-900">Ce que ca dit :</span>{" "}
                                    {narrativeBlocks.definition}
                                  </p>
                                  <p>
                                    <span className="font-semibold text-slate-900">Impact performance :</span>{" "}
                                    {narrativeBlocks.mechanism}
                                  </p>
                                  <p>
                                    <span className="font-semibold text-slate-900">Prochaine etape :</span>{" "}
                                    {narrativeBlocks.optimization}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-sm text-slate-600">Aucun marqueur pour ce systeme.</div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="markers" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-[0.33fr_0.67fr]">
                <Card className="border border-slate-200 bg-white p-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Panels</p>
                  <div className="mt-5 space-y-3">
                    {(Object.keys(PANEL_META) as PanelKey[]).map((key) => (
                      <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-900">{PANEL_META[key].label}</div>
                          {panelScores[key] === null ? (
                            <StatusBadge status="normal" label="N/A" className="opacity-70" />
                          ) : (
                            <StatusBadge status={scoreToStatus(panelScores[key]!)} label={`${panelScores[key]}/100`} />
                          )}
                        </div>
                        <p className="mt-2 text-xs text-slate-600">{PANEL_META[key].impact}</p>
                        <ul className="mt-3 space-y-1 text-xs text-slate-600">
                          {PANEL_META[key].bullets.map((bullet) => (
                            <li key={bullet} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-300" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="border border-slate-200 bg-white p-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Biomarqueurs</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Chaque biomarqueur a son range normal, son range optimal, et une lecture orientee performance/sante.
                  </p>

                  <div className="mt-6">
                    <Accordion type="multiple" className="space-y-3">
                      {(Object.keys(PANEL_META) as PanelKey[]).flatMap((panelKey) => {
                        return markersByPanel[panelKey].map((marker) => {
                          const narrative = getMarkerNarrative(marker, panelKey);
                          return (
                            <AccordionItem
                              key={`${panelKey}:${marker.code}`}
                              value={`${panelKey}:${marker.code}`}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-4"
                            >
                              <AccordionTrigger className="py-4 text-left hover:no-underline">
                                <div className="flex w-full items-start justify-between gap-4">
                                  <div>
                                    <div className="text-sm font-semibold text-slate-900">{marker.name}</div>
                                    <div className="mt-1 text-xs text-slate-500">{PANEL_META[panelKey].label}</div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-sm font-semibold text-slate-900">
                                      {marker.value} {marker.unit}
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
                                />
                                <div className="mt-4 grid gap-3 md:grid-cols-3">
                                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                                    <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Definition</div>
                                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{narrative.definition}</p>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                                    <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Ce que ca revele</div>
                                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{narrative.mechanism}</p>
                                  </div>
                                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                                    <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Optimisation</div>
                                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{narrative.optimization}</p>
                                  </div>
                                </div>
                                {marker.interpretation && (
                                  <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                                    <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Lecture experte</div>
                                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{marker.interpretation}</p>
                                  </div>
                                )}
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
                <Card className="border border-slate-200 bg-white p-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Patterns detectes</p>
                  <div className="mt-6 space-y-4">
                    {patterns.length ? (
                      patterns.map((pattern) => (
                        <div key={pattern.name} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{pattern.name}</div>
                              {!!pattern.causes?.length && (
                                <div className="mt-2 text-xs text-slate-600">
                                  Causes: {pattern.causes.slice(0, 3).join(" · ")}
                                </div>
                              )}
                            </div>
                            <StatusBadge status="suboptimal" />
                          </div>
                          {!!pattern.protocol?.length && (
                            <div className="mt-4">
                              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Protocole</div>
                              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                                {pattern.protocol.slice(0, 6).map((item) => (
                                  <li key={item} className="flex items-start gap-2">
                                    <span className="mt-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BLOOD_THEME.primaryBlue }} />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-slate-600">Aucun pattern majeur detecte.</div>
                    )}
                  </div>
                </Card>

                <Card className="border border-slate-200 bg-white p-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Diabetes Risk Assessment</p>
                  {diabetes ? (
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <p>
                        Score: <span className="font-semibold text-slate-900">{diabetes.score}/100</span> (risque {diabetes.level}).
                      </p>
                      <ul className="space-y-1">
                        {diabetes.gly !== null && <li>Glycemie a jeun: {diabetes.gly} mg/dL</li>}
                        {diabetes.a1c !== null && <li>HbA1c: {diabetes.a1c}%</li>}
                        {diabetes.insulin !== null && <li>Insuline: {diabetes.insulin} µIU/mL</li>}
                        {diabetes.homa !== null && <li>HOMA-IR: {diabetes.homa}</li>}
                      </ul>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Protocole rapide</div>
                        <ul className="mt-2 space-y-2 text-sm text-slate-600">
                          <li>Reduire sucres rapides + repas ultra transformes.</li>
                          <li>Augmenter fibres + proteines a chaque repas.</li>
                          <li>Marche post-prandiale 10-15 min.</li>
                          <li>Sommeil 7-9h pour stabiliser l'insuline.</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-600">Donnees insuffisantes pour estimer le risque.</p>
                  )}

                  <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Muscle & performance protocol</div>
                    <p className="mt-2 text-sm text-slate-600">
                      Priorite: sommeil profond, deficit calorique maitrise, entrainement lourd structure, micronutriments cles (vitamine D, zinc, magnesium).
                    </p>
                  </div>
                </Card>
              </div>

              {aiAnalysis ? (
                <Card className="mt-6 border border-slate-200 bg-white p-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Analyse detaillee</p>
                  <div className="prose mt-4 max-w-none prose-p:text-slate-700 prose-li:text-slate-700 prose-strong:text-slate-900">
                    <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                  </div>
                </Card>
              ) : null}

              {protocolPhases.length > 0 && (
                <Card className="mt-6 border border-slate-200 bg-white p-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Protocoles en 3 phases</p>
                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    {protocolPhases.map((phase) => (
                      <div key={phase.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm font-semibold text-slate-900">{phase.title}</div>
                        <ul className="mt-3 space-y-2 text-xs text-slate-600">
                          {phase.items.slice(0, 4).map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: BLOOD_THEME.primaryBlue }} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <Card className="mt-6 border border-slate-200 bg-slate-50 p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Actions immediates</p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {topMarkers.length ? (
                    topMarkers.map((marker) => (
                      <div key={marker.code} className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="text-sm font-semibold text-slate-900">{marker.name}</div>
                        <p className="mt-2 text-xs text-slate-600">
                          Je priorise {marker.name.toLowerCase()} avec un protocole cible (sommeil, nutrition, supplements).
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-slate-600">Aucune action urgente detectee.</div>
                  )}
                </div>
              </Card>

              <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                <span>Educationnel · Ne remplace pas un avis medical.</span>
                <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50" onClick={() => navigate("/offers/blood-analysis")}>
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
