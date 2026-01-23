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
  }>;
  analysis: {
    globalScore: number;
    categoryScores: Record<string, number>;
    temporalRisk?: { score: number; level: string; critical: number; warning: number };
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
  const radarData = useMemo(() => {
    const scores = analysis?.categoryScores || {};
    return Object.entries(scores).map(([key, score]) => ({
      key,
      label: categoryLabels[key] || key,
      score,
      status: score >= 80 ? "optimal" : score >= 65 ? "normal" : score >= 45 ? "suboptimal" : "critical",
    }));
  }, [analysis]);

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
