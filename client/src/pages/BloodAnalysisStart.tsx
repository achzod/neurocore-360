import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function BloodAnalysisStart() {
  const [, setLocation] = useLocation();
  const [reportId, setReportId] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"homme" | "femme">("homme");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const requirePayment = import.meta.env.VITE_BLOOD_ANALYSIS_REQUIRE_PAYMENT === "true";
  const [paymentReady, setPaymentReady] = useState(!requirePayment);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const sessionId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("session_id")
      : null;

  const handleOpen = () => {
    const trimmed = reportId.trim();
    if (!trimmed) return;
    setLocation(`/blood-analysis/${trimmed}`);
  };

  useEffect(() => {
    if (!requirePayment || !sessionId) return;
    const confirmPayment = async () => {
      setPaymentLoading(true);
      try {
        const response = await fetch("/api/stripe/confirm-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await response.json();
        if (data?.success) {
          setPaymentReady(true);
          if (data.email && !email) {
            setEmail(data.email);
          }
        } else {
          setError("Paiement non confirme. Reessaie ou contacte le support.");
        }
      } catch {
        setError("Impossible de verifier le paiement.");
      } finally {
        setPaymentLoading(false);
      }
    };
    confirmPayment();
  }, [sessionId, requirePayment]);

  const handlePayment = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Merci d'indiquer un email valide.");
      return;
    }
    const priceId = import.meta.env.VITE_STRIPE_PRICE_BLOOD_ANALYSIS;
    if (!priceId) {
      setError("Stripe price_id manquant pour Blood Analysis.");
      return;
    }

    setPaymentLoading(true);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          email: email.trim(),
          planType: "BLOOD_ANALYSIS",
          responses: {},
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "Paiement indisponible.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur paiement.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const fileToBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Lecture PDF impossible"));
          return;
        }
        const base64 = result.split(",")[1];
        resolve(base64 || "");
      };
      reader.onerror = () => reject(new Error("Lecture PDF impossible"));
      reader.readAsDataURL(file);
    });

  const handleSubmit = async () => {
    setError(null);
    if (requirePayment && !paymentReady) {
      setError("Paiement requis avant l'analyse.");
      return;
    }
    if (!email.trim()) {
      setError("Merci d'indiquer un email valide.");
      return;
    }
    if (!pdfFile) {
      setError("Ajoute ton PDF de prise de sang.");
      return;
    }

    setSubmitting(true);
    try {
      const pdfBase64 = await fileToBase64(pdfFile);
      const response = await fetch("/api/blood-analysis/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          markers: [],
          pdfBase64,
          pdfName: pdfFile.name,
          sessionId: requirePayment ? sessionId : undefined,
          profile: {
            prenom: prenom.trim() || undefined,
            nom: nom.trim() || undefined,
            gender,
            dob: dob || undefined,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Impossible de generer le rapport.");
      }
      setLocation(`/blood-analysis/${data.reportId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur serveur. Reessaie dans quelques instants.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-6xl mx-auto space-y-10">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Blood Analysis</p>
          <h1 className="text-3xl font-semibold mt-2">Soumettre ton bilan sanguin</h1>
          <p className="text-sm text-white/60 mt-3">
            Paiement puis upload du PDF, dashboard expert en sortie.
          </p>
        </div>

        <div className="grid lg:grid-cols-[2fr,1fr] gap-8">
          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Infos essentielles</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50">Prenom</label>
                  <Input
                    value={prenom}
                    onChange={(event) => setPrenom(event.target.value)}
                    placeholder="Achkan"
                    className="mt-2 bg-black/40 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50">Email</label>
                  <Input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="achkou@gmail.com"
                    className="mt-2 bg-black/40 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50">Nom</label>
                  <Input
                    value={nom}
                    onChange={(event) => setNom(event.target.value)}
                    placeholder="Achzod"
                    className="mt-2 bg-black/40 border-white/10 text-white placeholder:text-white/40"
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
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50">Date de naissance</label>
                  <Input
                    type="date"
                    value={dob}
                    onChange={(event) => setDob(event.target.value)}
                    className="mt-2 bg-black/40 border-white/10 text-white placeholder:text-white/40"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Upload PDF</h2>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  if (file && file.size > 8 * 1024 * 1024) {
                    setError("PDF trop lourd (max 8MB).");
                    setPdfFile(null);
                    return;
                  }
                  setPdfFile(file);
                }}
                className="block w-full text-sm text-white/70 file:mr-4 file:rounded-md file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-white/20"
              />
              <p className="text-xs text-white/50">
                Formats acceptes: PDF. Extraction automatique des marqueurs.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {requirePayment && !paymentReady ? (
              <Button
                onClick={handlePayment}
                disabled={paymentLoading}
                className="w-full bg-[#FCDD00] text-black hover:bg-[#e7c700]"
              >
                {paymentLoading ? "Paiement en cours..." : "Payer et debloquer l'analyse"}
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-[#FCDD00] text-black hover:bg-[#e7c700]"
              >
                {submitting ? "Analyse en cours..." : "Generer mon rapport Blood Analysis"}
              </Button>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Suivi paiement</h2>
              <p className="text-sm text-white/60">
                {!requirePayment
                  ? "Mode test actif. Paiement desactive."
                  : paymentReady
                  ? "Paiement confirme. Tu peux uploader ton PDF."
                  : paymentLoading
                  ? "Verification du paiement..."
                  : "Paiement requis avant l'analyse."}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
              <h2 className="text-lg font-semibold">Deja un rapport</h2>
              <p className="text-sm text-white/60">
                Si tu as deja recu ton lien, colle l'identifiant ci-dessous pour acceder directement au dashboard.
              </p>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">Report ID</label>
                <Input
                  value={reportId}
                  onChange={(event) => setReportId(event.target.value)}
                  placeholder="ex: 2c9f7f2a-..."
                  className="mt-2 bg-black/40 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              <Button onClick={handleOpen} className="w-full bg-white/10 text-white hover:bg-white/20">
                Ouvrir mon rapport
              </Button>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/60 space-y-2">
              <p>Une fois le PDF soumis, le dashboard expert est accessible en quelques minutes.</p>
              <p>Si l'analyse echoue, tu recevras un email de correction.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
