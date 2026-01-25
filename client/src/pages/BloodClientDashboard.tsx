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
import { motion } from "framer-motion";

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
  patient?: {
    prenom?: string;
    nom?: string;
    email?: string;
    gender?: string;
    dob?: string;
  } | null;
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
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  processing: "bg-amber-50 text-amber-700 border border-amber-200",
  failed: "bg-rose-50 text-rose-700 border border-rose-200",
  error: "bg-rose-50 text-rose-700 border border-rose-200",
};

const getScoreMessage = (score?: number | null) => {
  if (score === null || score === undefined) return "Aucun score pour l'instant";
  if (score >= 90) return "Exceptionnel - Tu es une machine";
  if (score >= 80) return "Tres bien - Quelques optimisations possibles";
  if (score >= 70) return "Correct - Des axes d'amelioration clairs";
  if (score >= 60) return "Attention - Actions recommandees";
  return "Prioritaire - Consulte un professionnel";
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
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
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
  const latestPatient = latestCompleted?.patient || null;

  useEffect(() => {
    if (latestPatient?.prenom && !prenom) setPrenom(latestPatient.prenom);
    if (latestPatient?.nom && !nom) setNom(latestPatient.nom);
    if (latestPatient?.dob && !dob) setDob(latestPatient.dob);
    if (latestPatient?.gender && (latestPatient.gender === "homme" || latestPatient.gender === "femme")) {
      setGender(latestPatient.gender);
    }
    if (latestPatient?.email && !email) setEmail(latestPatient.email);
  }, [latestPatient, prenom, nom, dob, email]);

  const stats = useMemo(() => {
    const total = tests?.bloodTests?.length || 0;
    const scores = completedTests.map((test) => test.globalScore || 0);
    const avg = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
    return { total, avg };
  }, [tests, completedTests]);

  const displayName =
    prenom || latestPatient?.prenom || (me?.user?.email ? me.user.email.split("@")[0] : "");

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
    <div className="min-h-screen bg-[#f7f5f0] text-slate-900 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15,23,42,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.08) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <ClientHeader credits={credits} variant="light" />

      <motion.main
        className="relative z-10 mx-auto max-w-7xl px-6 py-10 space-y-10"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" variants={itemVariants}>
          <Card className="border border-slate-200 bg-white p-8 lg:col-span-2">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-4 max-w-2xl">
                <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
                  Dashboard client
                </p>
                <div>
                  <p className="text-sm text-slate-600">Bonjour {displayName || "Profil"}</p>
                  <h1 className="text-3xl font-semibold tracking-tight">
                    Compte rendu sanguin
                  </h1>
                </div>
                <p className="text-sm text-slate-600">
                  Tu retrouves ici chaque bilan, tes scores de systemes, et une lecture clinique claire pour comprendre ce qui est normal, ce qui est a surveiller, et ce qui demande une action.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-400">Dernier bilan</p>
                    <p className="text-sm mt-1 text-slate-900">
                      {latestCompleted
                        ? new Date(latestCompleted.uploadedAt).toLocaleDateString("fr-FR")
                        : "Aucun"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-400">Score global</p>
                    <p className="text-2xl font-semibold mt-1 text-[#0f172a]">
                      {latestCompleted?.globalScore ?? "--"}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {getScoreMessage(latestCompleted?.globalScore)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-400">Credits</p>
                    <p className="text-sm mt-1 text-slate-900">{credits}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-xs text-slate-400">Trajectoire</p>
                    <p className="text-sm mt-1 text-slate-900">
                      {completedTests.length >= 2
                        ? `${completedTests[0].globalScore! - completedTests[1].globalScore! >= 0 ? "+" : ""}${completedTests[0].globalScore! - completedTests[1].globalScore!} pts`
                        : "Non disponible"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/60 p-5 w-full lg:max-w-xs space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Etat du dossier</p>
                <p className="text-lg font-semibold">{latestCompleted ? "Rapport disponible" : "Aucun rapport"}</p>
                <p className="text-sm text-slate-600">
                  {latestCompleted
                    ? "Le dernier bilan est analyse et disponible."
                    : "Charge ton premier bilan pour demarrer l'analyse."}
                </p>
                {latestCompleted ? (
                  <Button
                    className="w-full bg-[#0f172a] text-white hover:bg-[#1e293b]"
                    onClick={() => navigate(`/analysis/${latestCompleted.id}`)}
                  >
                    Ouvrir le dernier rapport
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-[#0f172a] text-white hover:bg-[#1e293b]"
                    onClick={() => document.getElementById("blood-upload")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    Ajouter un bilan
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.section>

        <motion.section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" variants={itemVariants}>
          <Card id="blood-upload" className="border border-slate-200 bg-white p-6 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Depot de bilan</p>
              <h1 className="text-2xl font-semibold mt-2">Ajouter un compte rendu</h1>
              <p className="text-sm text-slate-600 mt-2">
                Tu deposes ton PDF de laboratoire. Je recupere les biomarqueurs, je synthese par systeme et je genere un rapport medical clair dans l'historique.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-3 text-xs text-slate-500">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  1. Extraction et controle des valeurs
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  2. Analyse clinique par systeme
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  3. Synthese et protocoles priorises
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Prenom</label>
                <Input
                  value={prenom}
                  onChange={(event) => setPrenom(event.target.value)}
                  className="mt-2 bg-white border-slate-200 text-slate-900"
                  placeholder="Achkan"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Nom</label>
                <Input
                  value={nom}
                  onChange={(event) => setNom(event.target.value)}
                  className="mt-2 bg-white border-slate-200 text-slate-900"
                  placeholder="Achzod"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Email</label>
                <Input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 bg-white border-slate-200 text-slate-900"
                  placeholder="achkan@email.com"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Genre</label>
                <div className="mt-2 flex gap-2">
                  {(["homme", "femme"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setGender(option)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                        gender === option
                          ? "border-[#0f172a] text-[#0f172a]"
                          : "border-slate-200 text-slate-700"
                      }`}
                    >
                      {option === "homme" ? "Homme" : "Femme"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Naissance</label>
                <Input
                  type="date"
                  value={dob}
                  onChange={(event) => setDob(event.target.value)}
                  className="mt-2 bg-white border-slate-200 text-slate-900"
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
                dragging ? "border-[#0f172a] bg-white" : "border-slate-200"
              }`}
            >
              <FileUp className="h-6 w-6 text-[#0f172a]" />
              <p className="text-slate-700 mt-3">Glisse un PDF ici</p>
              <p className="text-slate-400 text-xs mt-2">PDF - 10 MB max</p>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="mt-4 max-w-sm bg-white border-slate-200 text-slate-900"
              />
              {file && <Badge className="mt-3 bg-white text-slate-900">{file.name}</Badge>}
            </div>

            {message && <p className="text-sm text-emerald-700">{message}</p>}
            {error && <p className="text-sm text-rose-700">{error}</p>}
            {credits <= 0 && (
              <p className="text-sm text-slate-600">
                Credits a zero. Passe par l'achat pour relancer une analyse.
              </p>
            )}
            {credits <= 0 && (
              <Button
                variant="outline"
                className="border-slate-200 text-slate-900 hover:bg-white"
                onClick={() => navigate("/offers/blood-analysis")}
              >
                Acheter des credits
              </Button>
            )}

            <Button
              className="w-full bg-[#0f172a] text-white hover:bg-[#1e293b]"
              disabled={uploading || credits <= 0}
              onClick={handleUpload}
            >
              {uploading ? "Analyse en cours..." : credits > 0 ? "Lancer l'analyse" : "Credits insuffisants"}
            </Button>
          </Card>

          <div className="space-y-4">
            <Card className="border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Synthese</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs text-slate-500">Analyses totales</p>
                  <p className="text-2xl font-semibold mt-1">{stats.total}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs text-slate-500">Score moyen</p>
                  <p className="text-2xl font-semibold mt-1">{stats.avg}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs text-slate-500">Credits restants</p>
                  <p className="text-2xl font-semibold mt-1">{credits}</p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 text-xs text-slate-600">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Donnees securisees et historisees par bilan.
              </div>
            </Card>

            <Card className="border border-slate-200 bg-white p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Processus d'analyse</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <ArrowUpRight className="h-3 w-3 text-[#0f172a]" /> Upload du PDF
                </li>
                <li className="flex gap-2">
                  <ArrowUpRight className="h-3 w-3 text-[#0f172a]" /> Extraction biomarqueurs
                </li>
                <li className="flex gap-2">
                  <ArrowUpRight className="h-3 w-3 text-[#0f172a]" /> Analyse experte + protocoles
                </li>
                <li className="flex gap-2">
                  <ArrowUpRight className="h-3 w-3 text-[#0f172a]" /> Rapport premium disponible
                </li>
              </ul>
            </Card>
          </div>
        </motion.section>

        <motion.section className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]" variants={itemVariants}>
          <Card className="border border-slate-200 bg-white">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold">Historique des bilans</h2>
              <p className="text-xs text-slate-500">Clique un rapport termine pour l'ouvrir.</p>
            </div>
            <div className="divide-y divide-slate-200">
              {(tests?.bloodTests || []).map((test, index) => {
                const isCompleted = test.status === "completed";
                return (
                  <div
                    key={test.id}
                    className={`flex flex-col gap-2 px-6 py-4 md:flex-row md:items-center md:justify-between ${
                      isCompleted ? "cursor-pointer hover:bg-white" : "opacity-60"
                    }`}
                    onClick={() => {
                      if (isCompleted) navigate(`/analysis/${test.id}`);
                    }}
                  >
                    <div>
                      <p className="font-medium">{test.fileName}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(test.uploadedAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {index === 0 && isCompleted && (
                        <Badge className="bg-slate-900 text-white">Recent</Badge>
                      )}
                      <Badge className={statusStyles[test.status] || "bg-slate-100 text-slate-700"}>
                        {test.status}
                      </Badge>
                      {test.globalScore !== null && (
                        <span className="text-sm text-slate-700">Score {test.globalScore}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {(!tests || tests.bloodTests.length === 0) && (
                <div className="px-6 py-6 text-sm text-slate-500">Aucun bilan pour l'instant.</div>
              )}
            </div>
          </Card>

          <Card className="border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Tendances</h2>
                <p className="text-xs text-slate-500">Evolution du score global.</p>
              </div>
              {completedTests.length >= 2 && (
                <p className="text-sm text-slate-900">
                  {completedTests[0].globalScore! - completedTests[1].globalScore! >= 0 ? "+" : ""}
                  {completedTests[0].globalScore! - completedTests[1].globalScore!} pts
                </p>
              )}
            </div>

            {completedTests.length >= 2 ? (
              <div className="h-48 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <XAxis dataKey="date" stroke="rgba(15,23,42,0.45)" />
                    <YAxis stroke="rgba(15,23,42,0.45)" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#0f172a" }}
                      labelStyle={{ color: "#0f172a" }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#0f172a" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-4 text-sm text-slate-600">
                Uploade un second bilan pour debloquer la comparaison.
              </div>
            )}
          </Card>
        </motion.section>
      </motion.main>
    </div>
  );
}
