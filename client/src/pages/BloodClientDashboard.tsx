import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClientHeader } from "@/components/client/ClientHeader";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { ArrowUpRight, FileUp, ShieldCheck } from "lucide-react";

type MeResponse = {
  user: {
    id: string;
    email: string;
    credits: number;
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

const fetcher = async <T,>(url: string): Promise<T> => {
  const token = localStorage.getItem("apexlabs_token");
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
};

const statusStyles: Record<string, string> = {
  completed: "bg-emerald-500/15 text-emerald-300",
  processing: "bg-amber-500/15 text-amber-300",
  failed: "bg-red-500/15 text-red-300",
  error: "bg-red-500/15 text-red-300",
};

export default function BloodClientDashboard() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [credits, setCredits] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [gender, setGender] = useState<"homme" | "femme">("homme");
  const [dob, setDob] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("apexlabs_token");
    if (!token) {
      navigate("/auth/login");
    }
  }, [navigate]);

  const { data: me } = useQuery({
    queryKey: ["/api/me"],
    queryFn: () => fetcher<MeResponse>("/api/me"),
    onSuccess: (data) => setCredits(data.user.credits ?? 0),
    onError: () => navigate("/auth/login"),
  });

  useEffect(() => {
    if (me?.user?.email && !email) {
      setEmail(me.user.email);
    }
  }, [me?.user?.email, email]);

  const { data: tests } = useQuery({
    queryKey: ["/api/blood-tests"],
    queryFn: () => fetcher<BloodTestsResponse>("/api/blood-tests"),
    onError: () => setError("Impossible de charger l'historique."),
  });

  const completedTests = useMemo(
    () => (tests?.bloodTests || []).filter((test) => test.status === "completed" && test.globalScore !== null),
    [tests]
  );

  const latestCompleted = completedTests[0];

  const stats = useMemo(() => {
    const total = tests?.bloodTests?.length || 0;
    const scores = completedTests.map((test) => test.globalScore || 0);
    const avg = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
    return { total, avg };
  }, [tests, completedTests]);

  const displayName = prenom || (me?.user?.email ? me.user.email.split("@")[0] : "");

  const trendData = useMemo(() => {
    return completedTests
      .slice()
      .reverse()
      .map((test) => ({
        date: new Date(test.uploadedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
        score: test.globalScore || 0,
      }));
  }, [completedTests]);

  const handleUpload = async () => {
    if (!file) {
      setError("Ajoute un PDF.");
      return;
    }
    if (credits <= 0) {
      setError("Plus aucun credit disponible.");
      return;
    }
    if (!email.trim()) {
      setError("Email requis.");
      return;
    }
    if (!prenom.trim() || !nom.trim() || !dob) {
      setError("Prenom, nom et date de naissance requis.");
      return;
    }
    setError(null);
    setMessage(null);
    setUploading(true);

    try {
      const token = localStorage.getItem("apexlabs_token");
      const form = new FormData();
      form.append("file", file);
      form.append("email", email.trim());
      form.append("prenom", prenom);
      form.append("nom", nom);
      form.append("gender", gender);
      form.append("dob", dob);
      const res = await fetch("/api/blood-tests/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Erreur upload.");
      }
      setCredits(data.remainingCredits ?? credits);
      setMessage("Analyse lancee. Le rapport apparaitra dans l'historique.");
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/blood-tests"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <ClientHeader credits={credits} />

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border border-white/10 bg-white/5 p-6 space-y-4 lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">
              Bonjour {displayName || "Profil"}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">Dashboard Blood Analysis</h1>
                <p className="text-sm text-white/60 mt-2">
                  Ton historique, tes scores et tes protocoles en un seul endroit.
                </p>
              </div>
              {latestCompleted ? (
                <Button
                  className="bg-[#FCDD00] text-black hover:bg-[#e7c700]"
                  onClick={() => navigate(`/analysis/${latestCompleted.id}`)}
                >
                  Ouvrir le dernier rapport
                </Button>
              ) : (
                <Button
                  className="bg-[#FCDD00] text-black hover:bg-[#e7c700]"
                  onClick={() => document.getElementById("blood-upload")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Lancer un premier bilan
                </Button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3">
                <p className="text-xs text-white/50">Dernier bilan</p>
                <p className="text-sm mt-1 text-white">
                  {latestCompleted
                    ? new Date(latestCompleted.uploadedAt).toLocaleDateString("fr-FR")
                    : "Aucun"}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3">
                <p className="text-xs text-white/50">Score global</p>
                <p className="text-sm mt-1 text-white">
                  {latestCompleted?.globalScore ?? "--"}
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3">
                <p className="text-xs text-white/50">Credits restants</p>
                <p className="text-sm mt-1 text-white">{credits}</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card id="blood-upload" className="border border-white/10 bg-white/5 p-6 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Blood Analysis</p>
              <h1 className="text-2xl font-semibold mt-2">Injecter un bilan</h1>
              <p className="text-sm text-white/60 mt-2">
                Uploade un PDF de laboratoire, je lance l'analyse et le rapport expert apparait dans l'historique.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">Prenom</label>
                <Input
                  value={prenom}
                  onChange={(event) => setPrenom(event.target.value)}
                  className="mt-2 bg-black/50 border-white/10 text-white"
                  placeholder="Achkan"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">Nom</label>
                <Input
                  value={nom}
                  onChange={(event) => setNom(event.target.value)}
                  className="mt-2 bg-black/50 border-white/10 text-white"
                  placeholder="Achzod"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">Email</label>
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 bg-black/50 border-white/10 text-white"
                  placeholder="achkan@email.com"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">Genre</label>
                <div className="mt-2 flex gap-2">
                  {(["homme", "femme"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setGender(option)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                        gender === option
                          ? "border-[#FCDD00] text-[#FCDD00]"
                          : "border-white/10 text-white/70"
                      }`}
                    >
                      {option === "homme" ? "Homme" : "Femme"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">Naissance</label>
                <Input
                  type="date"
                  value={dob}
                  onChange={(event) => setDob(event.target.value)}
                  className="mt-2 bg-black/50 border-white/10 text-white"
                />
              </div>
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const dropped = event.dataTransfer.files?.[0];
                if (dropped) setFile(dropped);
              }}
              className={`flex flex-col items-center justify-center rounded-xl border border-dashed p-6 text-sm ${
                dragging ? "border-[#FCDD00] bg-white/5" : "border-white/10"
              }`}
            >
              <FileUp className="h-6 w-6 text-[#FCDD00]" />
              <p className="text-white/70 mt-3">Glisse un PDF ici</p>
              <p className="text-white/40 text-xs mt-2">PDF - 10 MB max</p>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="mt-4 max-w-sm bg-black/40 border-white/10 text-white"
              />
              {file && <Badge className="mt-3 bg-white/10 text-white">{file.name}</Badge>}
            </div>

            {message && <p className="text-sm text-emerald-300">{message}</p>}
            {error && <p className="text-sm text-red-300">{error}</p>}
            {credits <= 0 && (
              <p className="text-sm text-white/60">
                Credits a zero. Passe par l'achat pour relancer une analyse.
              </p>
            )}

            <Button
              className="w-full bg-[#FCDD00] text-black hover:bg-[#e7c700]"
              disabled={uploading || credits <= 0}
              onClick={handleUpload}
            >
              {uploading ? "Analyse en cours..." : credits > 0 ? "Lancer l'analyse" : "Credits insuffisants"}
            </Button>
          </Card>

          <div className="space-y-4">
            <Card className="border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Vue rapide</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3">
                  <p className="text-xs text-white/50">Analyses totales</p>
                  <p className="text-2xl font-semibold mt-1">{stats.total}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3">
                  <p className="text-xs text-white/50">Score moyen</p>
                  <p className="text-2xl font-semibold mt-1">{stats.avg}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 px-4 py-3">
                  <p className="text-xs text-white/50">Credits restants</p>
                  <p className="text-2xl font-semibold mt-1">{credits}</p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 text-xs text-white/60">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Donnees securisees, historisees par bilan.
              </div>
            </Card>

            <Card className="border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">Workflow</p>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                <li className="flex gap-2">
                  <ArrowUpRight className="h-3 w-3 text-[#FCDD00]" /> Upload du PDF
                </li>
                <li className="flex gap-2">
                  <ArrowUpRight className="h-3 w-3 text-[#FCDD00]" /> Extraction biomarqueurs
                </li>
                <li className="flex gap-2">
                  <ArrowUpRight className="h-3 w-3 text-[#FCDD00]" /> Analyse experte + protocoles
                </li>
                <li className="flex gap-2">
                  <ArrowUpRight className="h-3 w-3 text-[#FCDD00]" /> Rapport premium disponible
                </li>
              </ul>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <Card className="border border-white/10 bg-white/5">
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold">Historique des bilans</h2>
              <p className="text-xs text-white/50">Clique un rapport termine pour l'ouvrir.</p>
            </div>
            <div className="divide-y divide-white/10">
              {(tests?.bloodTests || []).map((test, index) => {
                const isCompleted = test.status === "completed";
                return (
                  <div
                    key={test.id}
                    className={`flex flex-col gap-2 px-6 py-4 md:flex-row md:items-center md:justify-between ${
                      isCompleted ? "cursor-pointer hover:bg-white/5" : "opacity-60"
                    }`}
                    onClick={() => {
                      if (isCompleted) navigate(`/analysis/${test.id}`);
                    }}
                  >
                    <div>
                      <p className="font-medium">{test.fileName}</p>
                      <p className="text-xs text-white/40">
                        {new Date(test.uploadedAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {index === 0 && isCompleted && (
                        <Badge className="bg-[#FCDD00] text-black">Recent</Badge>
                      )}
                      <Badge className={statusStyles[test.status] || "bg-white/10 text-white"}>
                        {test.status}
                      </Badge>
                      {test.globalScore !== null && (
                        <span className="text-sm text-white/70">Score {test.globalScore}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!tests || tests.bloodTests.length === 0) && (
                <div className="px-6 py-6 text-sm text-white/50">Aucun bilan pour l'instant.</div>
              )}
            </div>
          </Card>

          <Card className="border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Tendances</h2>
                <p className="text-xs text-white/50">Evolution du score global.</p>
              </div>
              {completedTests.length >= 2 && (
                <p className="text-sm text-white">
                  {completedTests[0].globalScore! - completedTests[1].globalScore! >= 0 ? "+" : ""}
                  {completedTests[0].globalScore! - completedTests[1].globalScore!} pts
                </p>
              )}
            </div>

            {completedTests.length >= 2 ? (
              <div className="h-48 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" />
                    <YAxis stroke="rgba(255,255,255,0.4)" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#111", border: "1px solid rgba(255,255,255,0.1)" }}
                      labelStyle={{ color: "#fff" }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#FCDD00" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-4 text-sm text-white/60">
                Uploade un second bilan pour debloquer la comparaison.
              </div>
            )}
          </Card>
        </section>
      </main>
    </div>
  );
}
