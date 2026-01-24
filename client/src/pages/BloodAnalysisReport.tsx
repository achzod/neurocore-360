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
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ClipboardList,
  FileText,
  Shield,
  Stethoscope,
} from "lucide-react";

const categoryMeta: Record<string, { label: string; description: string }> = {
  hormonal: {
    label: "Hormonal",
    description: "Testosterone, cortisol, thyroid, regulation endocrine.",
  },
  thyroid: {
    label: "Thyroide",
    description: "TSH, T3/T4, regulation metabolique globale.",
  },
  metabolic: {
    label: "Metabolique",
    description: "Glycemie, insuline, lipides, efficacite energetique.",
  },
  inflammatory: {
    label: "Inflammation",
    description: "CRP-us, homocysteine, stress oxydatif.",
  },
  vitamins: {
    label: "Vitamines",
    description: "Vitamines et mineraux, reserves tissulaires.",
  },
  liver_kidney: {
    label: "Foie & Rein",
    description: "Detox, enzymes hepatiques, filtration renale.",
  },
  general: {
    label: "General",
    description: "Marqueurs transversaux et indicateurs globaux.",
  },
};

const categoryOrder = [
  "metabolic",
  "hormonal",
  "thyroid",
  "inflammatory",
  "vitamins",
  "liver_kidney",
  "general",
];

const getScoreLevel = (score: number) => {
  if (score >= 80) return { label: "Optimal", tone: "optimal" };
  if (score >= 65) return { label: "Stable", tone: "normal" };
  if (score >= 45) return { label: "Fragile", tone: "suboptimal" };
  return { label: "Critique", tone: "critical" };
};

type MarkerStatus = "optimal" | "normal" | "suboptimal" | "critical";

type BloodTestDetail = {
  bloodTest: {
    id: string;
    fileName: string;
    uploadedAt: string;
    status: string;
    globalScore: number | null;
    globalLevel: string | null;
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
    categoryScores: Record<string, number>;
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

const fetchDetail = async (id: string): Promise<BloodTestDetail> => {
  const token = localStorage.getItem("apexlabs_token");
  const res = await fetch(`/api/blood-tests/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Not found");
  return res.json();
};

const fetchMe = async (): Promise<{ user: { credits: number } }> => {
  const token = localStorage.getItem("apexlabs_token");
  const res = await fetch("/api/me", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
};

export default function BloodAnalysisReport() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: me } = useQuery({
    queryKey: ["/api/me"],
    queryFn: fetchMe,
    onError: () => navigate("/auth/login"),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: [`/api/blood-tests/${id}`],
    queryFn: () => fetchDetail(id || ""),
    enabled: Boolean(id),
    onError: () => navigate("/auth/login"),
  });

  const markers = data?.markers || [];
  const analysis = data?.analysis;
  const globalScore = analysis?.globalScore ?? data?.bloodTest.globalScore ?? 0;
  const categoryScores = analysis?.categoryScores || {};
  const hasCategoryScores = Object.keys(categoryScores).length > 0;
  const computeFallbackScores = () => {
    const buckets: Record<string, number[]> = {};
    markers.forEach((marker) => {
      const bucket = marker.category || "general";
      if (!buckets[bucket]) buckets[bucket] = [];
      const score =
        marker.status === "optimal"
          ? 100
          : marker.status === "normal"
          ? 80
          : marker.status === "suboptimal"
          ? 55
          : 30;
      buckets[bucket].push(score);
    });
    return Object.fromEntries(
      Object.entries(buckets).map(([key, values]) => [
        key,
        Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
      ])
    );
  };

  const fallbackScores = useMemo(() => computeFallbackScores(), [markers]);
  const radarData = useMemo(() => {
    const scores = hasCategoryScores ? categoryScores : fallbackScores;
    return Object.entries(scores).map(([key, score]) => ({
      key,
      label: categoryMeta[key]?.label || key,
      score,
      status: score >= 80 ? "optimal" : score >= 65 ? "normal" : score >= 45 ? "suboptimal" : "critical",
    }));
  }, [categoryScores, fallbackScores, hasCategoryScores]);

  const groupedMarkers = useMemo(() => {
    return markers.reduce<Record<string, typeof markers>>((acc, marker) => {
      const key = marker.category || "general";
      if (!acc[key]) acc[key] = [];
      acc[key].push(marker);
      return acc;
    }, {});
  }, [markers]);

  const critical = markers.filter((marker) => marker.status === "critical");
  const warning = markers.filter((marker) => marker.status === "suboptimal");
  const patient = analysis?.patient || {};
  const patientLabel = [patient.prenom, patient.nom].filter(Boolean).join(" ") || "Anonyme";
  const riskScore = analysis?.temporalRisk?.score ?? Math.min(100, critical.length * 18 + warning.length * 8);
  const riskLevel = analysis?.temporalRisk?.level || getScoreLevel(100 - riskScore).label;
  const summary = analysis?.summary;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Chargement...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-3">
        <p>Rapport introuvable.</p>
        <Button onClick={() => navigate("/dashboard")}>Retour dashboard</Button>
      </div>
    );
  }

  const orderedCategories = categoryOrder.filter((key) => groupedMarkers[key]?.length);

  return (
    <div className="min-h-screen bg-black text-white">
      <ClientHeader credits={me?.user?.credits ?? 0} />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Rapport premium</p>
              <h1 className="mt-2 text-2xl font-semibold">{patientLabel}</h1>
              <p className="text-sm text-white/60">{data.bloodTest.fileName}</p>
              <div className="mt-4 space-y-2 text-xs text-white/60">
                <div className="flex items-center justify-between">
                  <span>Reference</span>
                  <span>REF-{data.bloodTest.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Upload</span>
                  <span>{new Date(data.bloodTest.uploadedAt).toLocaleDateString("fr-FR")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Marqueurs</span>
                  <span>{markers.length}</span>
                </div>
                {patient.gender && (
                  <div className="flex items-center justify-between">
                    <span>Sexe</span>
                    <span>{patient.gender}</span>
                  </div>
                )}
                {patient.dob && (
                  <div className="flex items-center justify-between">
                    <span>Naissance</span>
                    <span>{patient.dob}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center justify-between">
                    <span>Email</span>
                    <span>{patient.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">Etat global</p>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-semibold">{globalScore}</p>
                  <StatusIndicator status={getScoreLevel(globalScore).tone} label={getScoreLevel(globalScore).label} />
                </div>
                <div className="text-right text-xs text-white/60">
                  <p>Risque</p>
                  <p className="text-white">{riskLevel}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/60">
                <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2">
                  Critiques <span className="text-white">{critical.length}</span>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2">
                  A surveiller <span className="text-white">{warning.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-xs text-white/60">
              <p className="uppercase tracking-[0.3em] text-white/40">Navigation</p>
              <ul className="mt-3 space-y-2">
                <li className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#FCDD00]" />
                  Overview
                </li>
                <li className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#FCDD00]" />
                  Biomarkers
                </li>
                <li className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#FCDD00]" />
                  Insights
                </li>
              </ul>
            </div>
          </aside>

          <section className="space-y-8">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 bg-white/5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="biomarkers">Biomarkers</TabsTrigger>
                <TabsTrigger value="insights">Insights</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                  <Card className="border border-white/10 bg-white/5 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Radar multi-systemes</p>
                        <p className="text-sm text-white/60 mt-2">
                          Vue globale des systemes, basee sur les biomarqueurs disponibles.
                        </p>
                      </div>
                      <StatusIndicator status={getScoreLevel(globalScore).tone} />
                    </div>
                    <div className="mt-4">
                      {radarData.length > 0 ? (
                        <BloodRadar data={radarData} />
                      ) : (
                        <p className="text-white/60">Radar indisponible.</p>
                      )}
                    </div>
                  </Card>

                  <Card className="border border-white/10 bg-white/5 p-6 space-y-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Priorites</p>
                    <div className="space-y-3 text-sm text-white/70">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-red-400 mt-1" />
                        <div>
                          <p className="text-white">Critiques detectees</p>
                          <p className="text-white/60">
                            {critical.length ? critical.map((item) => item.name).join(", ") : "Aucune alerte critique."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield className="h-4 w-4 text-amber-400 mt-1" />
                        <div>
                          <p className="text-white">A surveiller</p>
                          <p className="text-white/60">
                            {warning.length ? warning.map((item) => item.name).join(", ") : "Rien a surveiller pour le moment."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Stethoscope className="h-4 w-4 text-emerald-400 mt-1" />
                        <div>
                          <p className="text-white">Suivi recommande</p>
                          <p className="text-white/60">
                            {analysis?.followUp?.length
                              ? analysis.followUp.map((item) => `${item.test} (${item.delay})`).join(", ")
                              : "Aucune recommandation de suivi automatique."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                {(summary?.optimal || summary?.watch || summary?.action) && (
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="border border-white/10 bg-white/5 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/40">Optimaux</p>
                      <p className="text-sm text-white/70 mt-3">
                        {summary?.optimal?.length ? summary.optimal.join(", ") : "Aucun marqueur optimal notable."}
                      </p>
                    </Card>
                    <Card className="border border-white/10 bg-white/5 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/40">A surveiller</p>
                      <p className="text-sm text-white/70 mt-3">
                        {summary?.watch?.length ? summary.watch.join(", ") : "Aucune faiblesse majeure identifiee."}
                      </p>
                    </Card>
                    <Card className="border border-white/10 bg-white/5 p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/40">Actions clees</p>
                      <p className="text-sm text-white/70 mt-3">
                        {summary?.action?.length ? summary.action.join(", ") : "Aucune action prioritaire."}
                      </p>
                    </Card>
                  </div>
                )}

                <div className="grid gap-4 lg:grid-cols-3">
                  {categoryOrder
                    .filter((key) => radarData.find((item) => item.key === key))
                    .map((key) => {
                      const score = (hasCategoryScores ? categoryScores : fallbackScores)[key];
                      const meta = categoryMeta[key] || { label: key, description: "" };
                      const level = getScoreLevel(score || 0);
                      return (
                        <Card key={key} className="border border-white/10 bg-white/5 p-5">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{meta.label}</p>
                            <StatusBadge status={level.tone} />
                          </div>
                          <p className="text-xs text-white/50 mt-2">{meta.description}</p>
                          <div className="mt-4 flex items-end justify-between">
                            <p className="text-2xl font-semibold">{score || 0}</p>
                            <span className="text-xs text-white/60">{level.label}</span>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </TabsContent>

              <TabsContent value="biomarkers" className="space-y-6">
                {orderedCategories.length === 0 && (
                  <Card className="border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                    Aucun biomarqueur exploitable dans ce bilan.
                  </Card>
                )}
                {orderedCategories.map((category) => {
                  const items = groupedMarkers[category];
                  const meta = categoryMeta[category] || { label: category, description: "" };
                  return (
                    <Card key={category} className="border border-white/10 bg-white/5 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-semibold">{meta.label}</p>
                          <p className="text-xs text-white/50">{meta.description}</p>
                        </div>
                        <span className="text-xs text-white/60">{items.length} marqueurs</span>
                      </div>
                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        {items.map((marker) => (
                          <div key={`${marker.code}-${marker.name}`} className="rounded-xl border border-white/10 bg-black/40 p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold">{marker.name}</p>
                                <p className="text-xs text-white/50">{marker.code}</p>
                              </div>
                              <StatusBadge status={marker.status} />
                            </div>
                            <div className="mt-3 text-sm">
                              <span className="text-2xl font-semibold">{marker.value}</span>{" "}
                              <span className="text-white/60">{marker.unit}</span>
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
                            <p className="mt-3 text-xs text-white/60">
                              {marker.interpretation || "Analyse clinique en cours d'enrichissement."}
                            </p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </TabsContent>

              <TabsContent value="insights" className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="border border-white/10 bg-white/5 p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Synthese experte</p>
                    <p className="mt-3 text-sm text-white/70 whitespace-pre-line">
                      {analysis?.aiAnalysis || "Analyse en cours de generation."}
                    </p>
                  </Card>
                  <Card className="border border-white/10 bg-white/5 p-6">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">Patterns detectes</p>
                    <div className="mt-4 space-y-4 text-sm text-white/70">
                      {analysis?.patterns?.length ? (
                        analysis.patterns.map((pattern) => (
                          <div key={pattern.name} className="rounded-lg border border-white/10 bg-black/40 p-4">
                            <p className="font-semibold text-white">{pattern.name}</p>
                            <p className="text-xs text-white/50 mt-1">Causes: {pattern.causes.join(", ")}</p>
                            <p className="text-xs text-white/50 mt-2">Protocoles: {pattern.protocol.join(", ")}</p>
                          </div>
                        ))
                      ) : (
                        <p>Aucun pattern prioritaire detecte.</p>
                      )}
                    </div>
                  </Card>
                </div>

                {(analysis?.alerts?.length || analysis?.recommendations) && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="border border-white/10 bg-white/5 p-6">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/40">Alertes</p>
                      <ul className="mt-3 space-y-2 text-sm text-white/70">
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
                    <Card className="border border-white/10 bg-white/5 p-6">
                      <p className="text-xs uppercase tracking-[0.2em] text-white/40">Actions prioritaires</p>
                      <div className="mt-3 space-y-3 text-sm text-white/70">
                        {analysis?.recommendations?.priority1?.length ? (
                          analysis.recommendations.priority1.map((rec, index) => (
                            <div key={`p1-${index}`} className="rounded-lg border border-white/10 bg-black/40 p-3">
                              <p className="font-semibold text-white">{rec.action}</p>
                              <p className="text-xs text-white/50 mt-1">
                                {rec.dosage ? `Dosage: ${rec.dosage}. ` : ""}
                                {rec.timing ? `Timing: ${rec.timing}. ` : ""}
                                {rec.why}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p>Aucune action prioritaire definie.</p>
                        )}
                      </div>
                    </Card>
                  </div>
                )}

                <Card className="border border-white/10 bg-white/5 p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">Protocoles 180 jours</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {protocolPhases.length ? (
                      protocolPhases.map((phase) => (
                        <div key={phase.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
                          <p className="font-semibold">{phase.title}</p>
                          <ul className="mt-3 space-y-2 text-xs text-white/60">
                            {phase.items.map((item, index) => (
                              <li key={`${phase.id}-${index}`} className="flex gap-2">
                                <ArrowUpRight className="h-3 w-3 text-[#FCDD00]" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-white/60">Aucun protocole detaille disponible.</p>
                    )}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </section>
        </div>
      </main>
    </div>
  );
}
