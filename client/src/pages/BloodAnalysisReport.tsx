import { useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClientHeader } from "@/components/client/ClientHeader";
import { BloodRadar } from "@/components/blood/BloodRadar";
import { StatusBadge } from "@/components/blood/StatusBadge";
import { BiomarkerRangeIndicator } from "@/components/blood/BiomarkerRangeIndicator";
import { getBiomarkerStatusLabel } from "@/lib/biomarker-colors";

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

const categoryLabels: Record<string, string> = {
  hormonal: "Hormonal",
  thyroid: "Thyroide",
  metabolic: "Metabolique",
  inflammatory: "Inflammation",
  vitamins: "Vitamines",
  liver_kidney: "Foie & Rein",
  general: "General",
};

export default function BloodAnalysisReport() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activePhase, setActivePhase] = useState(0);

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
      label: categoryLabels[key] || key,
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

  const critical = markers.filter((m) => m.status === "critical");
  const warning = markers.filter((m) => m.status === "suboptimal");
  const patient = analysis?.patient || {};
  const patientLabel = [patient.prenom, patient.nom].filter(Boolean).join(" ") || "Anonyme";

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

  const phases = analysis?.protocolPhases || [];

  return (
    <div className="min-h-screen bg-black text-white">
      <ClientHeader credits={me?.user?.credits ?? 0} />

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Rapport premium</p>
          <h1 className="text-3xl font-semibold">Analyse {data.bloodTest.fileName}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-white/60">
            <span>REF-{data.bloodTest.id.slice(0, 8).toUpperCase()}</span>
            <span>Patient {patientLabel}</span>
            {patient.gender && <span>Sexe {patient.gender}</span>}
            {patient.dob && <span>Naissance {patient.dob}</span>}
            {patient.email && <span>{patient.email}</span>}
            <span>Upload {new Date(data.bloodTest.uploadedAt).toLocaleDateString("fr-FR")}</span>
            <span>{markers.length} marqueurs</span>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Score global</p>
            <p className="text-4xl font-semibold mt-3">{globalScore}</p>
            <p className="text-sm text-white/60 mt-2">Indice global multi-systemes</p>
          </Card>
          <Card className="border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Radar multi-systemes</p>
            {radarData.length > 0 ? <BloodRadar data={radarData} /> : <p className="text-white/60">Radar indisponible.</p>}
          </Card>
        </section>

        {analysis?.summary && (
          <section className="grid gap-4 md:grid-cols-3">
            <Card className="border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Optimaux</p>
              <p className="text-sm text-white/70 mt-3">
                {analysis.summary.optimal.length ? analysis.summary.optimal.join(", ") : "Aucun"}
              </p>
            </Card>
            <Card className="border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">A surveiller</p>
              <p className="text-sm text-white/70 mt-3">
                {analysis.summary.watch.length ? analysis.summary.watch.join(", ") : "Aucun"}
              </p>
            </Card>
            <Card className="border border-white/10 bg-white/5 p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Action requise</p>
              <p className="text-sm text-white/70 mt-3">
                {analysis.summary.action.length ? analysis.summary.action.join(", ") : "Aucune"}
              </p>
            </Card>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Court terme</p>
            <p className="text-2xl font-semibold mt-2">{analysis?.temporalRisk?.critical ?? critical.length}</p>
            <p className="text-sm text-white/50">Marqueurs critiques</p>
          </Card>
          <Card className="border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Moyen terme</p>
            <p className="text-2xl font-semibold mt-2">{analysis?.temporalRisk?.warning ?? warning.length}</p>
            <p className="text-sm text-white/50">Sous-optimaux</p>
          </Card>
          <Card className="border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Long terme</p>
            <p className="text-2xl font-semibold mt-2">{analysis?.temporalRisk?.score ?? globalScore}</p>
            <p className="text-sm text-white/50">Indice global</p>
          </Card>
        </section>

        {analysis?.aiAnalysis && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Analyse IA</h2>
            <Card className="border border-white/10 bg-white/5 p-6 whitespace-pre-wrap text-sm text-white/70">
              {analysis.aiAnalysis}
            </Card>
          </section>
        )}

        {analysis?.patterns && analysis.patterns.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Patterns detectes</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {analysis.patterns.map((pattern) => (
                <Card key={pattern.name} className="border border-white/10 bg-white/5 p-5 space-y-2">
                  <p className="font-semibold">{pattern.name}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">Causes</p>
                  <p className="text-sm text-white/70">{pattern.causes.join(", ")}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/40">Protocoles</p>
                  <ul className="text-sm text-white/70 space-y-1">
                    {pattern.protocol.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Protocole d'optimisation</h2>
          <div className="flex flex-wrap gap-2">
            {phases.map((phase, index) => (
              <Button
                key={phase.id}
                variant={activePhase === index ? "default" : "secondary"}
                className={activePhase === index ? "bg-[#FCDD00] text-black" : "bg-white/10 text-white"}
                onClick={() => setActivePhase(index)}
              >
                {phase.title}
              </Button>
            ))}
          </div>
          {phases[activePhase] && (
            <Card className="border border-white/10 bg-white/5 p-6 space-y-2 text-sm text-white/70">
              {phases[activePhase].items.map((item) => (
                <div key={item}>• {item}</div>
              ))}
            </Card>
          )}
        </section>

        {analysis?.recommendations && (
          <section className="grid gap-4 md:grid-cols-2">
            <Card className="border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold mb-3">Priorite 1</h3>
              {analysis.recommendations.priority1.length === 0 ? (
                <p className="text-sm text-white/50">Aucune recommandation urgente.</p>
              ) : (
                <ul className="space-y-2 text-sm text-white/70">
                  {analysis.recommendations.priority1.map((item) => (
                    <li key={item.action}>
                      <span className="font-semibold">{item.action}</span>
                      {item.dosage ? ` • ${item.dosage}` : ""}
                      {item.timing ? ` • ${item.timing}` : ""}
                      <span className="block text-xs text-white/50">Pourquoi: {item.why}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold mb-3">Priorite 2</h3>
              {analysis.recommendations.priority2.length === 0 ? (
                <p className="text-sm text-white/50">Aucune recommandation secondaire.</p>
              ) : (
                <ul className="space-y-2 text-sm text-white/70">
                  {analysis.recommendations.priority2.map((item) => (
                    <li key={item.action}>
                      <span className="font-semibold">{item.action}</span>
                      {item.dosage ? ` • ${item.dosage}` : ""}
                      {item.timing ? ` • ${item.timing}` : ""}
                      <span className="block text-xs text-white/50">Pourquoi: {item.why}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        )}

        {analysis?.followUp && analysis.followUp.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Controles a prevoir</h2>
            <Card className="border border-white/10 bg-white/5 p-6">
              <div className="grid gap-3 md:grid-cols-3 text-sm text-white/70">
                {analysis.followUp.map((item) => (
                  <div key={item.test} className="space-y-1">
                    <p className="font-semibold">{item.test}</p>
                    <p className="text-xs text-white/50">Delai: {item.delay}</p>
                    <p className="text-xs text-white/50">{item.objective}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        )}

        {analysis?.alerts && analysis.alerts.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Alertes prioritaires</h2>
            <Card className="border border-white/10 bg-white/5 p-6 text-sm text-white/70">
              <ul className="space-y-2">
                {analysis.alerts.map((alert) => (
                  <li key={alert}>• {alert}</li>
                ))}
              </ul>
            </Card>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          <Card className="border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold mb-3">Critiques</h3>
            {critical.length === 0 ? (
              <p className="text-sm text-white/50">Aucun marqueur critique.</p>
            ) : (
              critical.map((marker) => (
                <div key={marker.code} className="border-b border-white/10 py-3 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{marker.name}</p>
                    <StatusBadge status={marker.status} />
                  </div>
                  <BiomarkerRangeIndicator
                    value={marker.value}
                    unit={marker.unit}
                    status={marker.status}
                    normalMin={marker.refMin ?? undefined}
                    normalMax={marker.refMax ?? undefined}
                    optimalMin={marker.optimalMin ?? undefined}
                    optimalMax={marker.optimalMax ?? undefined}
                    className="mt-2"
                  />
                </div>
              ))
            )}
          </Card>
          <Card className="border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold mb-3">A surveiller</h3>
            {warning.length === 0 ? (
              <p className="text-sm text-white/50">Aucun marqueur a surveiller.</p>
            ) : (
              warning.map((marker) => (
                <div key={marker.code} className="border-b border-white/10 py-3 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{marker.name}</p>
                    <StatusBadge status={marker.status} />
                  </div>
                  <BiomarkerRangeIndicator
                    value={marker.value}
                    unit={marker.unit}
                    status={marker.status}
                    normalMin={marker.refMin ?? undefined}
                    normalMax={marker.refMax ?? undefined}
                    optimalMin={marker.optimalMin ?? undefined}
                    optimalMax={marker.optimalMax ?? undefined}
                    className="mt-2"
                  />
                </div>
              ))
            )}
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Detail par systeme</h2>
          {Object.entries(groupedMarkers).map(([category, items]) => (
            <Card key={category} className="border border-white/10 bg-white/5 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{categoryLabels[category] || category}</h3>
                <span className="text-sm text-white/50">{items.length} marqueurs</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((marker) => (
                  <div key={marker.code} className="rounded border border-white/10 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/60">{marker.code.toUpperCase()}</p>
                        <p className="font-medium">{marker.name}</p>
                      </div>
                      <StatusBadge status={marker.status} />
                    </div>
                    <p className="text-sm text-white/60 mt-2">
                      {getBiomarkerStatusLabel(marker.status)} • Ref {marker.refMin ?? "-"}-{marker.refMax ?? "-"}
                    </p>
                    <BiomarkerRangeIndicator
                      value={marker.value}
                      unit={marker.unit}
                      status={marker.status}
                      normalMin={marker.refMin ?? undefined}
                      normalMax={marker.refMax ?? undefined}
                      optimalMin={marker.optimalMin ?? undefined}
                      optimalMax={marker.optimalMax ?? undefined}
                      className="mt-2"
                    />
                    {marker.interpretation && (
                      <p className="text-xs text-white/50 mt-2">{marker.interpretation}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </section>

        <section className="flex flex-wrap gap-3">
          <Button className="bg-white/10 text-white hover:bg-white/20" onClick={() => window.print()}>
            Imprimer
          </Button>
          <Button
            className="bg-white/10 text-white hover:bg-white/20"
            onClick={() => window.open(`/api/blood-tests/${data.bloodTest.id}/export/pdf`, "_blank")}
          >
            Export PDF
          </Button>
        </section>
      </main>
    </div>
  );
}
