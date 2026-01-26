import { useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, FileText, Loader2, ShieldAlert } from "lucide-react";

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

const PANEL_META: Record<PanelKey, { label: string; bullets: string[] }> = {
  hormonal: {
    label: "Hormones",
    bullets: ["Testosterone, SHBG, estradiol", "LH/FSH, prolactine", "Cortisol, IGF-1, DHEA-S"],
  },
  thyroid: {
    label: "Thyroide",
    bullets: ["TSH, T3, T4", "Anti-TPO, T3 reverse", "Conversion et regulation"],
  },
  metabolic: {
    label: "Metabolisme",
    bullets: ["Glycemie, HbA1c, HOMA-IR", "Lipides (TG/HDL/LDL)", "ApoB, Lp(a)"],
  },
  inflammatory: {
    label: "Inflammation",
    bullets: ["CRP-us, homocysteine", "Ferritine, fer serique", "Saturation transferrine"],
  },
  vitamins: {
    label: "Vitamines",
    bullets: ["Vitamine D, B12, folate", "Magnesium RBC", "Zinc"],
  },
  liver_kidney: {
    label: "Foie/Rein",
    bullets: ["ALT/AST/GGT", "Creatinine/eGFR", "Lecture hepatique + renale"],
  },
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

const fetcher = async <T,>(url: string): Promise<T> => {
  const token = localStorage.getItem("apexlabs_token");
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return res.json();
};

function ScoreDonut({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 56;
  const dash = (score / 100) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="h-36 w-36 -rotate-90">
        <circle cx="72" cy="72" r="56" stroke="rgba(255,255,255,0.12)" strokeWidth="10" fill="none" />
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
        <div className="text-4xl font-semibold tracking-tight text-white">{score}</div>
        <div className="text-xs tracking-[0.2em] uppercase text-white/50">{scoreLabel(score)}</div>
      </div>
    </div>
  );
}

export default function BloodAnalysisReport() {
  const params = useParams<{ id: string }>();
  const reportId = params.id;
  const [, navigate] = useLocation();

  const { data: me } = useQuery({
    queryKey: ["/api/me"],
    queryFn: () => fetcher<MeResponse>("/api/me"),
    retry: false,
    onError: () => navigate(`/auth/login?next=/analysis/${encodeURIComponent(reportId)}`),
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/blood-tests", reportId],
    queryFn: () => fetcher<BloodTestDetail>(`/api/blood-tests/${reportId}`),
    retry: false,
    refetchInterval: (query) => {
      const current = query.state.data as BloodTestDetail | undefined;
      const status = current?.bloodTest?.status;
      return status === "processing" ? 5000 : false;
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "";
      if (message.startsWith("401")) navigate(`/auth/login?next=/analysis/${encodeURIComponent(reportId)}`);
    },
  });

  const credits = me?.user?.credits ?? 0;

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
        const rank: Record<MarkerStatus, number> = { critical: 0, suboptimal: 1, normal: 2, optimal: 3 };
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
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

    const resolved: Record<PanelKey, number | null> = {
      hormonal: raw.hormonal ?? fallbackAvg("hormonal"),
      thyroid: raw.thyroid ?? fallbackAvg("thyroid"),
      metabolic: raw.metabolic ?? fallbackAvg("metabolic"),
      inflammatory: raw.inflammatory ?? fallbackAvg("inflammatory"),
      vitamins: raw.vitamins ?? fallbackAvg("vitamins"),
      liver_kidney: raw.liver_kidney ?? fallbackAvg("liver_kidney"),
    };
    return resolved;
  }, [data?.analysis?.categoryScores, markersByPanel]);

  const globalScore = data?.analysis?.globalScore ?? data?.bloodTest?.globalScore ?? 0;
  const patient = data?.bloodTest?.patient || data?.analysis?.patient || null;
  const displayName = patient?.prenom || (me?.user?.email ? me.user.email.split("@")[0] : "toi");

  const radarData = useMemo(() => {
    const points: Array<{ key: PanelKey; label: string; score: number; status: MarkerStatus; muted?: boolean }> = [];
    (Object.keys(PANEL_META) as PanelKey[]).forEach((key) => {
      const score = panelScores[key];
      if (score === null) {
        points.push({ key, label: PANEL_META[key].label, score: 0, status: "normal", muted: true });
        return;
      }
      points.push({ key, label: PANEL_META[key].label, score, status: scoreToStatus(score) });
    });
    return points;
  }, [panelScores]);

  const patterns = data?.analysis?.patterns || [];
  const aiAnalysis = data?.analysis?.aiAnalysis || "";
  const protocolPhases = data?.analysis?.protocolPhases || [];

  if (isLoading) {
    return (
      <BloodShell>
        <BloodHeader credits={credits} />
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-24 text-white/70">
          <Loader2 className="mr-3 h-5 w-5 animate-spin" />
          Chargement du rapport...
        </div>
      </BloodShell>
    );
  }

  if (error || !data) {
    return (
      <BloodShell>
        <BloodHeader credits={credits} />
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-6 py-24 text-center">
          <AlertTriangle className="h-8 w-8 text-rose-300" />
          <div className="text-lg font-semibold text-white">Rapport introuvable.</div>
          <div className="text-sm text-white/60">Le lien est invalide ou le rapport n'est pas accessible.</div>
          <Button className="bg-white text-black hover:bg-white/90" onClick={() => navigate("/blood-dashboard")}>
            Retour dashboard
          </Button>
        </div>
      </BloodShell>
    );
  }

  if (data.bloodTest.status === "processing") {
    return (
      <BloodShell>
        <BloodHeader credits={credits} />
        <div className="mx-auto max-w-3xl px-6 py-24">
          <Card className="border border-white/10 bg-white/[0.02] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: BLOOD_THEME.primaryBlue }} />
            </div>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white">Analyse en cours</h1>
            <p className="mt-3 text-sm text-white/60">
              J'extrais tes biomarqueurs et je construis le rapport. La page se met a jour automatiquement.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button className="bg-white text-black hover:bg-white/90" onClick={() => refetch()}>
                Rafraichir
              </Button>
              <Button
                variant="outline"
                className="border-white/10 bg-transparent text-white/70 hover:bg-white/5"
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
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Rapport Blood Analysis</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              {displayName}, voici ton bilan.
            </h1>
            <p className="mt-3 max-w-2xl text-white/70 leading-relaxed">
              Je compare tes ranges labo (normaux) aux ranges optimaux (performance/longévité), je détecte les patterns,
              puis je te donne une trajectoire claire.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/50">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1">
                <FileText className="h-3.5 w-3.5" />
                {data.bloodTest.fileName}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1">
                {new Date(data.bloodTest.uploadedAt).toLocaleDateString("fr-FR", { dateStyle: "medium" })}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1">
                {data.markers.length} biomarqueurs
              </span>
              {data.analysis.temporalRisk && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1">
                  Risque: {data.analysis.temporalRisk.level} ({data.analysis.temporalRisk.score}/100)
                </span>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            className="border-white/10 bg-transparent text-white/70 hover:bg-white/5"
            onClick={() => navigate("/blood-dashboard")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </div>

        <div className="mt-10">
          <Tabs defaultValue="overview">
            <TabsList className="border border-white/10 bg-white/[0.02]">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="markers">Biomarqueurs</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-[0.45fr_0.55fr]">
                <Card className="border border-white/10 bg-white/[0.02] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-white/50">Score global</p>
                      <p className="mt-2 text-sm text-white/60">Lecture multi-systèmes sur 100.</p>
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
                        <div key={key} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/40 px-4 py-3">
                          <div className="text-sm font-medium text-white">{PANEL_META[key].label}</div>
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

                <Card className="border border-white/10 bg-white/[0.02] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-white/50">Balance systémique</p>
                      <p className="mt-2 text-sm text-white/60">6 panels, score 0-100.</p>
                    </div>
                    <div className="inline-flex items-center gap-2 text-xs text-white/50">
                      <ShieldAlert className="h-4 w-4" style={{ color: BLOOD_THEME.primaryBlue }} />
                      Optimal vs normal
                    </div>
                  </div>
                  <div className="mt-6">
                    <BloodRadar data={radarData} height={320} />
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {patterns.length ? (
                      patterns.slice(0, 2).map((pattern) => (
                        <div key={pattern.name} className="rounded-xl border border-white/10 bg-black/40 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-sm font-semibold text-white">{pattern.name}</div>
                            <StatusBadge status="suboptimal" />
                          </div>
                          {!!pattern.causes?.length && (
                            <ul className="mt-3 space-y-1 text-xs text-white/60">
                              {pattern.causes.slice(0, 3).map((cause) => (
                                <li key={cause} className="flex items-start gap-2">
                                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/30" />
                                  <span>{cause}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          {!!pattern.protocol?.length && (
                            <div className="mt-3 text-xs text-white/60">
                              <span className="text-white/70">Protocole:</span> {pattern.protocol.slice(0, 2).join(" · ")}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-white/60">Aucun pattern majeur détecté sur ce PDF.</div>
                    )}
                  </div>
                </Card>
              </div>

              {protocolPhases.length > 0 && (
                <div className="mt-6">
                  <Card className="border border-white/10 bg-white/[0.02] p-6">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/50">Trajectoire</p>
                    <p className="mt-2 text-sm text-white/60">Plan en 3 phases (90-180 jours).</p>
                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      {protocolPhases.map((phase) => (
                        <div key={phase.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
                          <div className="text-sm font-semibold text-white">{phase.title}</div>
                          <ul className="mt-3 space-y-2 text-xs text-white/60">
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
                </div>
              )}
            </TabsContent>

            <TabsContent value="markers" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-[0.33fr_0.67fr]">
                <Card className="border border-white/10 bg-white/[0.02] p-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/50">Panels</p>
                  <div className="mt-5 space-y-3">
                    {(Object.keys(PANEL_META) as PanelKey[]).map((key) => (
                      <div key={key} className="rounded-xl border border-white/10 bg-black/40 p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-white">{PANEL_META[key].label}</div>
                          {panelScores[key] === null ? (
                            <StatusBadge status="normal" label="N/A" className="opacity-70" />
                          ) : (
                            <StatusBadge status={scoreToStatus(panelScores[key]!)} label={`${panelScores[key]}/100`} />
                          )}
                        </div>
                        <ul className="mt-3 space-y-1 text-xs text-white/60">
                          {PANEL_META[key].bullets.map((bullet) => (
                            <li key={bullet} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/30" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="border border-white/10 bg-white/[0.02] p-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/50">Biomarqueurs</p>
                  <p className="mt-2 text-sm text-white/60">
                    Chaque biomarqueur a son range normal, son range optimal, et une lecture. Les protocoles sont dans l'onglet Insights.
                  </p>

                  <div className="mt-6">
                    <Accordion type="multiple" className="space-y-3">
                      {(Object.keys(PANEL_META) as PanelKey[]).flatMap((panelKey) => {
                        return markersByPanel[panelKey].map((marker) => (
                          <AccordionItem
                            key={`${panelKey}:${marker.code}`}
                            value={`${panelKey}:${marker.code}`}
                            className="rounded-xl border border-white/10 bg-black/40 px-4"
                          >
                            <AccordionTrigger className="py-4 text-left hover:no-underline">
                              <div className="flex w-full items-start justify-between gap-4">
                                <div>
                                  <div className="text-sm font-semibold text-white">{marker.name}</div>
                                  <div className="mt-1 text-xs text-white/50">{PANEL_META[panelKey].label}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-sm font-semibold text-white">
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
                              {marker.interpretation && (
                                <div className="mt-4">
                                  <div className="text-xs uppercase tracking-[0.22em] text-white/50">Lecture</div>
                                  <p className="mt-2 text-sm text-white/70 leading-relaxed">{marker.interpretation}</p>
                                </div>
                              )}
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                                  <div className="text-xs uppercase tracking-[0.22em] text-white/50">Définition</div>
                                  <p className="mt-2 text-sm text-white/70 leading-relaxed">
                                    {marker.name} est un biomarqueur du panel {PANEL_META[panelKey].label.toLowerCase()}. Je le lis pour comprendre ton état actuel et les leviers d'optimisation.
                                  </p>
                                </div>
                                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                                  <div className="text-xs uppercase tracking-[0.22em] text-white/50">Optimisation</div>
                                  <p className="mt-2 text-sm text-white/70 leading-relaxed">
                                    Si ce marqueur est hors optimal, je priorise d'abord les fondations (sommeil, nutrition, stress), puis j'ajoute des interventions ciblées via les protocoles (voir Insights).
                                  </p>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ));
                      })}
                    </Accordion>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-[0.45fr_0.55fr]">
                <Card className="border border-white/10 bg-white/[0.02] p-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/50">Patterns détectés</p>
                  <div className="mt-6 space-y-4">
                    {patterns.length ? (
                      patterns.map((pattern) => (
                        <div key={pattern.name} className="rounded-xl border border-white/10 bg-black/40 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm font-semibold text-white">{pattern.name}</div>
                              {!!pattern.causes?.length && (
                                <div className="mt-2 text-xs text-white/60">
                                  Causes: {pattern.causes.slice(0, 3).join(" · ")}
                                </div>
                              )}
                            </div>
                            <StatusBadge status="suboptimal" />
                          </div>
                          {!!pattern.protocol?.length && (
                            <div className="mt-4">
                              <div className="text-xs uppercase tracking-[0.22em] text-white/50">Protocole</div>
                              <ul className="mt-3 space-y-2 text-sm text-white/70">
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
                      <div className="text-sm text-white/60">Aucun pattern majeur détecté.</div>
                    )}
                  </div>
                </Card>

                <Card className="border border-white/10 bg-white/[0.02] p-6">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/50">Analyse</p>
                  {aiAnalysis ? (
                    <div className="prose prose-invert mt-6 max-w-none prose-p:text-white/70 prose-li:text-white/70 prose-strong:text-white">
                      <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="mt-6 text-sm text-white/60">Analyse IA indisponible pour ce rapport.</div>
                  )}
                </Card>
              </div>

              {data.analysis.recommendations && (
                <div className="mt-6">
                  <Card className="border border-white/10 bg-white/[0.02] p-6">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/50">Actions prioritaires</p>
                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                      {(data.analysis.recommendations.priority1 || []).slice(0, 4).map((rec) => (
                        <div key={rec.action} className="rounded-xl border border-white/10 bg-black/40 p-5">
                          <div className="text-sm font-semibold text-white">{rec.action}</div>
                          <div className="mt-2 text-xs text-white/60">
                            {[rec.dosage, rec.timing].filter(Boolean).join(" · ")}
                          </div>
                          <div className="mt-3 text-sm text-white/70 leading-relaxed">{rec.why}</div>
                        </div>
                      ))}
                    </div>
                    {data.analysis.recommendations.priority2?.length ? (
                      <div className="mt-6 text-sm text-white/60">
                        +{data.analysis.recommendations.priority2.length} actions secondaires disponibles.
                      </div>
                    ) : null}
                  </Card>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <div className="text-xs text-white/50">
                  Educational only · Ne remplace pas un avis medical · Consulte ton medecin en cas de marqueur critique.
                </div>
                <Button
                  variant="outline"
                  className="border-white/10 bg-transparent text-white/70 hover:bg-white/5"
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
