import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader2, ArrowRight, Check, Shield } from "lucide-react";

const PRIMARY_BLUE = "rgb(2,121,232)";

export default function BloodAnalysisStart() {
  const [, navigate] = useLocation();
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");
    const paypalToken = urlParams.get("token");
    const isPaypal = urlParams.get("paypal") === "true";

    // PayPal return
    if (isPaypal && paypalToken) {
      setConfirming(true);
      window.history.replaceState({}, "", "/blood-analysis");
      (async () => {
        try {
          const response = await fetch("/api/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paypalOrderId: paypalToken }),
          });
          const data = await response.json();
          if (response.ok && data.success) {
            if (data.email) localStorage.setItem("neurocore_email", data.email);
            navigate("/auth/login?next=/blood-dashboard&paid=true");
            return;
          }
          setConfirmError(data?.error || "Erreur de confirmation PayPal.");
        } catch {
          setConfirmError("Erreur de confirmation du paiement PayPal.");
        } finally {
          setConfirming(false);
        }
      })();
      return;
    }

    // Stripe return
    if (sessionId) {
      setConfirming(true);
      window.history.replaceState({}, "", "/blood-analysis");
      (async () => {
        try {
          const response = await fetch("/api/stripe/confirm-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          const data = await response.json();
          if (response.ok && data.success) {
            if (data.email) localStorage.setItem("neurocore_email", data.email);
            navigate("/auth/login?next=/blood-dashboard&paid=true");
            return;
          }
          setConfirmError(data?.error || "Erreur de confirmation Stripe.");
        } catch {
          setConfirmError("Erreur de confirmation du paiement.");
        } finally {
          setConfirming(false);
        }
      })();
      return;
    }

    // Already logged in → go to dashboard
    const token = typeof window !== "undefined" ? localStorage.getItem("apexlabs_token") : null;
    if (token) {
      navigate("/blood-dashboard");
    }

    // Pre-fill email if stored
    const stored = localStorage.getItem("neurocore_email");
    if (stored) setEmail(stored);
  }, [navigate]);

  const handleCheckout = async () => {
    if (!email || !email.includes("@")) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, planType: "BLOOD_ANALYSIS" }),
      });
      const data = await res.json();
      if (data.url) {
        localStorage.setItem("neurocore_email", email);
        window.location.href = data.url;
      } else if (data.free) {
        // Free via promo code
        localStorage.setItem("neurocore_email", email);
        navigate("/auth/login?next=/blood-dashboard&paid=true");
      } else {
        setConfirmError(data.error || "Erreur de creation du paiement.");
      }
    } catch {
      setConfirmError("Erreur serveur. Reessaie dans quelques instants.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (confirming) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="mx-auto max-w-xl px-6 py-20">
          <Card className="border border-white/10 bg-white/5 p-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: PRIMARY_BLUE }} />
            <p className="text-sm text-white/60">Confirmation du paiement en cours...</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="mx-auto max-w-lg px-6 py-20">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.3em] mb-3" style={{ color: PRIMARY_BLUE }}>Blood Analysis</p>
          <h1 className="text-3xl font-bold mb-3">Analyse ton bilan sanguin</h1>
          <p className="text-white/50 text-sm">39 biomarqueurs · 6 panels · Ranges optimaux</p>
        </div>

        <Card className="border border-white/10 bg-[#0a0a0a] p-8 space-y-6">
          {/* Price */}
          <div className="text-center">
            <p className="text-4xl font-bold text-white">99€</p>
            <p className="text-white/40 text-xs mt-1">Paiement unique — 1 analyse complete</p>
          </div>

          {/* Features */}
          <div className="space-y-2.5">
            {[
              "39 biomarqueurs analyses sur 6 panels",
              "Ranges optimaux vs normaux",
              "Plan d'action personnalise et priorise",
              "Dashboard interactif + export PDF",
              "Liste des marqueurs a demander au labo",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm text-white/70">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: PRIMARY_BLUE }} />
                <span>{f}</span>
              </div>
            ))}
          </div>

          {/* Email */}
          <div>
            <label className="text-xs text-white/40 block mb-1.5">Ton email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ton@email.com"
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {confirmError && (
            <p className="text-sm text-red-400 text-center">{confirmError}</p>
          )}

          {/* CTA */}
          <Button
            className="w-full py-6 text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
            style={{ backgroundColor: PRIMARY_BLUE, color: "#fff" }}
            onClick={handleCheckout}
            disabled={checkoutLoading || !email.includes("@")}
          >
            {checkoutLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Payer 99€ et analyser mon bilan
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-3 text-[10px] text-white/30">
            <Shield className="w-3 h-3" />
            <span>Paiement securise Stripe · RGPD</span>
          </div>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
