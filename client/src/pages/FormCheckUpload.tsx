/**
 * APEXLABS - FormCheck V2 : page d'envoi de vidéo (lien reçu par email ou retour Stripe).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Check, FileText, Loader2, Upload, AlertTriangle } from "lucide-react";

const ACCENT = "#FCDD00";
const TOKEN_KEY = "apexlabs_formcheck_token";
const MAX_BYTES = 200 * 1024 * 1024;
const MAX_SECONDS = 60;

type Balance = { total: number; used: number; reserved: number; available: number };
type AnalysisRow = { id: string; exercise_label: string | null; status: string; score: number | null; decision_reason: string | null; created_at: string };
type Me = { email: string; balance: Balance; analyses: AnalysisRow[] };

const STATUS_LABEL: Record<string, string> = {
  queued: "En file d'attente",
  processing: "Analyse en cours",
  retry: "Analyse en cours",
  delivered: "Rapport envoyé",
  rejected: "À refilmer (crédit non utilisé)",
  needs_review: "Vérification manuelle (crédit non utilisé)",
};

function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => done(null);
    setTimeout(() => done(null), 8000);
    video.src = url;
  });
}

export default function FormCheckUpload() {
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<"init" | "confirming" | "ready" | "no-access">("init");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [accessEmail, setAccessEmail] = useState("");
  const [accessSent, setAccessSent] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const loadMe = useCallback(async (t: string) => {
    const res = await fetch("/api/formcheck/me", { headers: { "x-formcheck-token": t } });
    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setStatus("no-access");
      return;
    }
    if (!res.ok) throw new Error("FormCheck est momentanément indisponible.");
    setMe(await res.json());
    setStatus("ready");
  }, []);

  // Initialisation : retour Stripe (session_id), lien email (token) ou accès mémorisé.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const urlToken = params.get("token");
    const clean = () => window.history.replaceState({}, "", "/formcheck/upload");

    const start = async () => {
      if (sessionId) {
        setStatus("confirming");
        for (let attempt = 0; attempt < 10; attempt++) {
          const res = await fetch(`/api/formcheck/session/${encodeURIComponent(sessionId)}`);
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.token) {
            localStorage.setItem(TOKEN_KEY, data.token);
            setToken(data.token);
            setMessage("Paiement confirmé, tes crédits sont disponibles. Ton lien d'accès t'a aussi été envoyé par email.");
            clean();
            await loadMe(data.token);
            return;
          }
          if (res.status !== 202) break;
          await new Promise((r) => setTimeout(r, 3000));
        }
        clean();
        setMessage("Ton paiement est en cours de confirmation. Ton lien d'accès arrive par email dans quelques minutes.");
      }
      const stored = urlToken || localStorage.getItem(TOKEN_KEY);
      if (urlToken) {
        localStorage.setItem(TOKEN_KEY, urlToken);
        clean();
      }
      if (stored) {
        setToken(stored);
        await loadMe(stored);
      } else {
        setStatus("no-access");
      }
    };
    start().catch((e) => {
      setError(e?.message || "Une erreur est survenue.");
      setStatus("no-access");
    });
  }, [loadMe]);

  // Suivi des analyses en cours.
  useEffect(() => {
    if (!token || !me) return;
    const pending = me.analyses.some((a) => ["queued", "processing", "retry"].includes(a.status));
    if (!pending) return;
    const id = setInterval(() => loadMe(token).catch(() => {}), 10_000);
    return () => clearInterval(id);
  }, [token, me, loadMe]);

  const onFile = async (selected: File | null) => {
    setError(null);
    setFile(null);
    if (!selected) return;
    const name = selected.name.toLowerCase();
    if (!name.endsWith(".mp4") && !name.endsWith(".mov")) {
      setError("Format non accepté. Envoie une vidéo en .mp4 ou .mov.");
      return;
    }
    if (selected.size > MAX_BYTES) {
      setError("Vidéo trop lourde (200 Mo maximum). Filme en 1080p plutôt qu'en 4K.");
      return;
    }
    const duration = await readVideoDuration(selected);
    if (duration !== null && duration > MAX_SECONDS + 1) {
      setError("Vidéo trop longue (60 secondes maximum). Coupe-la pour ne garder qu'une seule série.");
      return;
    }
    setFile(selected);
  };

  const submit = () => {
    if (!token || !file) return;
    setError(null);
    setMessage(null);
    setProgress(0);
    const form = new FormData();
    form.append("video", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/formcheck/upload");
    xhr.setRequestHeader("x-formcheck-token", token);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      setProgress(null);
      let data: any = {};
      try { data = JSON.parse(xhr.responseText || "{}"); } catch { /* réponse vide */ }
      if (xhr.status === 202) {
        setMessage(data.message || "Vidéo reçue. Ton rapport arrive par email dans quelques minutes.");
        setFile(null);
        if (fileInput.current) fileInput.current.value = "";
        loadMe(token).catch(() => {});
      } else {
        setError(data.message || "L'envoi a échoué. Réessaie dans un instant.");
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setError("L'envoi a échoué. Vérifie ta connexion et réessaie.");
    };
    xhr.send(form);
  };

  const requestAccess = async () => {
    setError(null);
    await fetch("/api/formcheck/access-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: accessEmail.trim() }),
    }).catch(() => null);
    setAccessSent(true);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="mx-auto max-w-3xl px-6 pt-32 pb-24">
        <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">Envoyer ma vidéo FormCheck</h1>

        {message && (
          <p className="mt-6 flex items-start gap-2 rounded-sm border border-[#FCDD00]/40 bg-[#FCDD00]/10 p-4 text-sm text-white" role="status">
            <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} /> {message}
          </p>
        )}
        {error && (
          <p className="mt-6 flex items-start gap-2 rounded-sm border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </p>
        )}

        {(status === "init" || status === "confirming") && (
          <p className="mt-10 flex items-center gap-2 text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" /> {status === "confirming" ? "Confirmation de ton paiement…" : "Chargement…"}
          </p>
        )}

        {status === "no-access" && (
          <div className="mt-10 rounded-sm border border-white/10 bg-white/[0.03] p-8">
            <h2 className="text-xl font-bold">Retrouver mon accès</h2>
            <p className="mt-2 text-white/60">Indique l'email utilisé lors de ton achat : on t'envoie ton lien personnel.</p>
            {accessSent ? (
              <p className="mt-6 text-sm text-white/80">Si un achat FormCheck existe pour cette adresse, un nouveau lien vient d'être envoyé. Pense à vérifier tes spams.</p>
            ) : (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  value={accessEmail}
                  onChange={(e) => setAccessEmail(e.target.value)}
                  placeholder="toi@email.com"
                  className="flex-1 rounded-sm border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#FCDD00] focus:outline-none"
                />
                <button onClick={requestAccess} className="px-6 py-3 font-bold text-black" style={{ backgroundColor: ACCENT }}>
                  Recevoir mon lien
                </button>
              </div>
            )}
            <p className="mt-6 text-sm text-white/50">
              Pas encore de crédit ? <Link href="/offers/formcheck#packs" className="underline hover:text-white">Voir les packs FormCheck</Link>
            </p>
          </div>
        )}

        {status === "ready" && me && (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-sm border border-white/10 bg-white/[0.03] p-6">
              <div>
                <div className="text-sm text-white/50">{me.email}</div>
                <div className="mt-1 text-2xl font-bold" data-testid="formcheck-credits">
                  {me.balance.available} crédit{me.balance.available > 1 ? "s" : ""} disponible{me.balance.available > 1 ? "s" : ""}
                </div>
                {me.balance.reserved > 0 && <div className="text-sm text-white/50">{me.balance.reserved} en cours d'analyse</div>}
              </div>
              <Link href="/offers/formcheck#packs" className="text-sm underline text-white/70 hover:text-white">Racheter des crédits</Link>
            </div>

            {me.balance.available > 0 ? (
              <div className="mt-8 rounded-sm border border-white/10 bg-white/[0.03] p-8">
                <p className="text-sm text-white/60" data-testid="formcheck-auto-exercise">
                  Pas besoin d'indiquer l'exercice : l'analyse le reconnaît automatiquement sur ta vidéo.
                </p>

                <label className="mt-6 block text-sm font-semibold text-white/80" htmlFor="formcheck-video">Vidéo d'une série (60 s maximum, .mp4 ou .mov, 200 Mo maximum)</label>
                <input
                  ref={fileInput}
                  id="formcheck-video"
                  data-testid="formcheck-video"
                  type="file"
                  accept="video/mp4,video/quicktime,.mp4,.mov"
                  onChange={(e) => onFile(e.target.files?.[0] || null)}
                  className="mt-2 block w-full text-sm text-white/70 file:mr-4 file:border-0 file:bg-white/10 file:px-4 file:py-3 file:text-white"
                />

                <ul className="mt-6 space-y-2 text-sm text-white/60">
                  <li>Téléphone posé et stable, corps entier et charge visibles du début à la fin.</li>
                  <li>De profil pour le squat, le soulevé de terre, le hip thrust et le développé couché.</li>
                  <li>Une seule série d'un exercice de musculation par vidéo.</li>
                  <li>Ton crédit n'est utilisé que si le rapport est livré.</li>
                </ul>

                <button
                  type="button"
                  data-testid="formcheck-submit"
                  onClick={submit}
                  disabled={!file || progress !== null}
                  className="mt-8 flex w-full items-center justify-center gap-2 py-4 font-bold text-black disabled:opacity-50"
                  style={{ backgroundColor: ACCENT }}
                >
                  {progress !== null ? <><Loader2 className="h-4 w-4 animate-spin" /> Envoi {progress} %</> : <><Upload className="h-4 w-4" /> Envoyer ma vidéo</>}
                </button>
              </div>
            ) : (
              <div className="mt-8 rounded-sm border border-white/10 bg-white/[0.03] p-8 text-center">
                <p className="text-white/70">Tu n'as plus de crédit disponible.</p>
                <Link href="/offers/formcheck#packs" className="mt-4 inline-block px-6 py-3 font-bold text-black" style={{ backgroundColor: ACCENT }}>
                  Choisir un pack
                </Link>
              </div>
            )}

            {me.analyses.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold">Mes analyses</h2>
                <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
                  {me.analyses.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div>
                        <div className="font-semibold">{a.exercise_label || (a.status === "rejected" || a.status === "needs_review" ? "Vidéo" : "Exercice en cours de détection")}{a.status === "delivered" && a.score !== null ? ` : ${a.score}/100` : ""}</div>
                        <div className="text-sm text-white/50">
                          {new Date(a.created_at).toLocaleString("fr-FR")} · {STATUS_LABEL[a.status] || a.status}
                        </div>
                        {a.status === "rejected" && a.decision_reason && <div className="mt-1 text-sm text-white/70">{a.decision_reason}</div>}
                      </div>
                      {a.status === "delivered" && token && (
                        <a
                          href={`/api/formcheck/analyses/${encodeURIComponent(a.id)}/pdf?token=${encodeURIComponent(token)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold"
                          style={{ color: ACCENT }}
                        >
                          <FileText className="h-4 w-4" /> Télécharger le PDF
                        </a>
                      )}
                      {["queued", "processing", "retry"].includes(a.status) && <Loader2 className="h-4 w-4 animate-spin text-white/50" />}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
