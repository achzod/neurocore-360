import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { ArrowUpRight, FileUp, ShieldCheck, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

import BloodHeader from "@/components/blood/BloodHeader";
import BloodShell from "@/components/blood/BloodShell";
import { BLOOD_THEME } from "@/components/blood/bloodTheme";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
    sleepHours?: number;
    trainingHours?: number;
    calorieDeficit?: number;
    alcoholWeekly?: number;
    stressLevel?: number;
  } | null;
};

type BloodTestsResponse = { bloodTests: BloodTestSummary[] };

const fetcher = async <T,>(url: string): Promise<T> => {
  const token = localStorage.getItem("apexlabs_token");
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
  if (score >= 90) return "Exceptionnel";
  if (score >= 80) return "Tres bon";
  if (score >= 70) return "Correct";
  if (score >= 60) return "A optimiser";
  return "Prioritaire";
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
  const [sleepHours, setSleepHours] = useState("");
  const [trainingHours, setTrainingHours] = useState("");
  const [calorieDeficit, setCalorieDeficit] = useState("");
  const [alcoholWeekly, setAlcoholWeekly] = useState("");
  const [stressLevel, setStressLevel] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("apexlabs_token");
    if (!token) navigate("/auth/login?next=/blood-dashboard");
  }, [navigate]);

  const { data: me } = useQuery({
    queryKey: ["/api/me"],
    queryFn: () => fetcher<MeResponse>("/api/me"),
    onSuccess: (data) => setCredits(data.user.credits ?? 0),
    onError: () => navigate("/auth/login?next=/blood-dashboard"),
  });

  useEffect(() => {
    if (me?.user?.email && !email) setEmail(me.user.email);
  }, [me?.user?.email, email]);

  const { data: tests } = useQuery({
    queryKey: ["/api/blood-tests"],
    queryFn: () => fetcher<BloodTestsResponse>("/api/blood-tests"),
    onError: () => setError("Impossible de charger l'historique."),
    refetchInterval: (query) => {
      const current = query.state.data as BloodTestsResponse | undefined;
      const hasProcessing = current?.bloodTests?.some((test) => test.status === "processing");
      return hasProcessing ? 5000 : false;
    },
  });

  const orderedTests = useMemo(() => {
    return (tests?.bloodTests || [])
      .slice()
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }, [tests]);

  const completedTests = useMemo(
    () => orderedTests.filter((test) => test.status === "completed" && test.globalScore !== null),
    [orderedTests]
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
    if (latestPatient?.sleepHours && !sleepHours) setSleepHours(String(latestPatient.sleepHours));
    if (latestPatient?.trainingHours && !trainingHours) setTrainingHours(String(latestPatient.trainingHours));
    if (latestPatient?.calorieDeficit && !calorieDeficit) setCalorieDeficit(String(latestPatient.calorieDeficit));
    if (latestPatient?.alcoholWeekly && !alcoholWeekly) setAlcoholWeekly(String(latestPatient.alcoholWeekly));
    if (latestPatient?.stressLevel && !stressLevel) setStressLevel(String(latestPatient.stressLevel));
  }, [latestPatient, prenom, nom, dob, email, sleepHours, trainingHours, calorieDeficit, alcoholWeekly, stressLevel]);

  const stats = useMemo(() => {
    const total = orderedTests.length;
    const scores = completedTests.map((test) => test.globalScore || 0);
    const avg = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
    return { total, avg };
  }, [orderedTests, completedTests]);

  const displayName = prenom || latestPatient?.prenom || (me?.user?.email ? me.user.email.split("@")[0] : "");

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
      if (sleepHours) form.append("sleepHours", sleepHours);
      if (trainingHours) form.append("trainingHours", trainingHours);
      if (calorieDeficit) form.append("calorieDeficit", calorieDeficit);
      if (alcoholWeekly) form.append("alcoholWeekly", alcoholWeekly);
      if (stressLevel) form.append("stressLevel", stressLevel);
      const res = await fetch("/api/blood-tests/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erreur upload.");

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

  const delta = completedTests.length >= 2 ? completedTests[0].globalScore! - completedTests[1].globalScore! : null;

  return (
    <BloodShell>
      <BloodHeader credits={credits} />

      <motion.main variants={containerVariants} initial="hidden" animate="show" className="mx-auto max-w-6xl px-6 py-10">
        <motion.section variants={itemVariants} className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Blood Analysis</p>
            <h1 className="mt-3 blood-h1 text-white">Bonjour {displayName}.</h1>
            <p className="mt-3 max-w-2xl text-white/70 leading-relaxed blood-body">
              Je decode ton bilan sanguin ligne par ligne. Tu obtiens une lecture clinique + performance, des signaux prioritaires,
              et un plan d'action clair.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Card className="border border-white/13 bg-[#0a0a0a] px-4 py-3">
              <p className="text-xs text-white/50">Credits restants</p>
              <p className="text-2xl font-semibold text-white">{credits}</p>
            </Card>
            <Button
              className="text-white font-semibold hover:opacity-90"
              style={{ backgroundColor: BLOOD_THEME.primaryBlue }}
              onClick={() => navigate("/offers/blood-analysis")}
            >
              Acheter des credits
            </Button>
          </div>
        </motion.section>

        <motion.section variants={itemVariants} className="mt-10 grid gap-6 lg:grid-cols-3">
          <Card className="border border-white/13 bg-[#0a0a0a] p-6 lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-white">Uploader un bilan sanguin</h2>
                <p className="mt-1 text-sm text-white/70">PDF uniquement · 10 MB max · 1 credit par analyse</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium border ${
                  credits <= 0 ? "border-rose-200 bg-rose-50 text-rose-600" : "border-white/13 bg-[#0a0a0a] text-white/70"
                }`}
              >
                {credits <= 0 ? "Credits requis" : "Disponible"}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70">Prenom</label>
                <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prenom" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70">Nom</label>
                <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70">Date de naissance</label>
                <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70">Sexe</label>
                <div className="flex gap-2">
                  {(["homme", "femme"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGender(value)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        gender === value
                          ? "border-transparent text-white"
                          : "border-white/13 bg-[#0a0a0a] text-white/80 hover:bg-[#0a0a0a]"
                      }`}
                      style={gender === value ? { backgroundColor: BLOOD_THEME.primaryBlue } : undefined}
                    >
                      {value === "homme" ? "Homme" : "Femme"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70">Sommeil (h/nuit)</label>
                <Input
                  type="number"
                  min="3"
                  max="12"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  placeholder="Ex: 7.5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70">Training (h/sem)</label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  step="1"
                  value={trainingHours}
                  onChange={(e) => setTrainingHours(e.target.value)}
                  placeholder="Ex: 6"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70">Deficit calorique (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  step="1"
                  value={calorieDeficit}
                  onChange={(e) => setCalorieDeficit(e.target.value)}
                  placeholder="Ex: 15"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70">Alcool (verres/sem)</label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  step="1"
                  value={alcoholWeekly}
                  onChange={(e) => setAlcoholWeekly(e.target.value)}
                  placeholder="Ex: 3"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium text-white/70">Stress percu (0-10)</label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="1"
                  value={stressLevel}
                  onChange={(e) => setStressLevel(e.target.value)}
                  placeholder="Ex: 6"
                />
              </div>
            </div>

            <div
              className={`mt-6 rounded-xl border-2 border-dashed p-6 transition ${
                dragging ? "bg-[#0a0a0a]" : "bg-[#0a0a0a]/40"
              } ${credits <= 0 ? "opacity-60" : ""}`}
              style={{ borderColor: dragging ? "rgba(2,121,232,0.6)" : "rgba(255,255,255,0.15)" }}
              onDragEnter={(e) => {
                e.preventDefault();
                if (credits <= 0) return;
                setDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (credits <= 0) return;
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (credits <= 0) return;
                const dropped = e.dataTransfer.files?.[0] || null;
                if (dropped) setFile(dropped);
              }}
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="h-12 w-12 rounded-full bg-[#0a0a0a] flex items-center justify-center border border-white/13">
                  <FileUp className="h-6 w-6" style={{ color: BLOOD_THEME.primaryBlue }} />
                </div>
                <div>
                  <p className="font-medium text-white">{file ? file.name : "Glisse ton PDF ici, ou selectionne un fichier"}</p>
                  <p className="mt-1 text-xs text-white/50">PDF uniquement · 10 MB max</p>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={credits <= 0}
                  className="text-xs text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white/80 hover:file:bg-white/20"
                />
              </div>
            </div>

            {(error || message) && (
              <div className="mt-4">
                {error && <p className="text-sm text-rose-600">{error}</p>}
                {message && <p className="text-sm text-emerald-700">{message}</p>}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-white/50">
                Credit debite a l'upload. Statut: <span className="text-white/80">processing</span> →{" "}
                <span className="text-white/80">completed</span>.
              </div>
              <Button
                disabled={uploading || credits <= 0}
                className="text-white font-semibold hover:opacity-90"
                style={{ backgroundColor: BLOOD_THEME.primaryBlue }}
                onClick={handleUpload}
              >
                {uploading ? "Upload..." : "Lancer l'analyse"}
              </Button>
            </div>
          </Card>

          <Card className="border border-white/13 bg-[#0a0a0a] p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Stats</h2>
                <p className="text-xs text-white/50">Resume de tes bilans.</p>
              </div>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-6 grid gap-4">
              <div className="rounded-lg border border-white/13 bg-[#0a0a0a] p-4">
                <p className="text-xs text-white/50">Analyses totales</p>
                <p className="text-2xl font-semibold text-white">{stats.total}</p>
              </div>
              <div className="rounded-lg border border-white/13 bg-[#0a0a0a] p-4">
                <p className="text-xs text-white/50">Score moyen</p>
                <p className="text-2xl font-semibold text-white">{stats.avg}</p>
              </div>
              <div className="rounded-lg border border-white/13 bg-[#0a0a0a] p-4">
                <p className="text-xs text-white/50">Dernier bilan</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {latestCompleted ? new Date(latestCompleted.uploadedAt).toLocaleDateString("fr-FR") : "Aucun"}
                </p>
                <p className="mt-2 text-xs text-white/70">{getScoreMessage(latestCompleted?.globalScore)}</p>
              </div>
              <div className="rounded-lg border border-white/13 bg-[#0a0a0a] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <TrendingUp className="h-4 w-4" style={{ color: BLOOD_THEME.primaryBlue }} />
                  Focus performance
                </div>
                <p className="mt-2 text-xs text-white/70">
                  Les hormones et le metabolisme sont analyses avec un angle prise de muscle/perte de gras.
                </p>
              </div>
            </div>
          </Card>
        </motion.section>

        <motion.section variants={itemVariants} className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card className="border border-white/13 bg-[#0a0a0a] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Historique</h2>
                <p className="text-xs text-white/50">Ouvre un rapport complet quand le traitement est termine.</p>
              </div>
              <Button variant="outline" className="border-white/13 text-white/80 hover:bg-[#0a0a0a]" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/blood-tests"] })}>
                Rafraichir
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {orderedTests.length === 0 && <p className="text-sm text-white/70">Aucun bilan pour l'instant.</p>}
              {orderedTests.map((test) => {
                const canOpen = test.status === "completed";
                const badgeClass = statusStyles[test.status] || "bg-white/10 text-white/80 border border-white/13";
                return (
                  <button
                    key={test.id}
                    type="button"
                    disabled={!canOpen}
                    onClick={() => canOpen && navigate(`/analysis/${test.id}`)}
                    className={`w-full rounded-xl border border-white/13 px-4 py-3 text-left transition ${canOpen ? "hover:bg-[#0a0a0a]" : "opacity-70 cursor-default"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{test.fileName}</p>
                        <p className="text-xs text-white/50">{new Date(test.uploadedAt).toLocaleDateString("fr-FR", { dateStyle: "medium" })}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}>{test.status}</span>
                        {typeof test.globalScore === "number" && <span className="text-sm font-semibold text-white">{test.globalScore}/100</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-xl border border-white/13 bg-[#0a0a0a] p-4">
              <p className="text-xs font-medium text-white/80">Process</p>
              <ul className="mt-3 space-y-2 text-xs text-white/70">
                {["Upload du PDF", "Extraction biomarqueurs", "Analyse experte + protocoles", "Rapport disponible"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <ArrowUpRight className="h-3 w-3" style={{ color: BLOOD_THEME.primaryBlue }} /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="border border-white/13 bg-[#0a0a0a] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Tendances</h2>
                <p className="text-xs text-white/50">Evolution du score global.</p>
              </div>
              {delta !== null && (
                <p className="text-sm text-white">
                  {delta >= 0 ? "+" : ""}
                  {delta} pts
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
                    <Line type="monotone" dataKey="score" stroke={BLOOD_THEME.primaryBlue} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="mt-4 text-sm text-white/70">Uploade un second bilan pour debloquer la comparaison.</div>
            )}
          </Card>
        </motion.section>
      </motion.main>
    </BloodShell>
  );
}
