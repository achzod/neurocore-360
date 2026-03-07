import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Loader2 } from "lucide-react";

export default function BloodAnalysisStart() {
  const [, navigate] = useLocation();
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");
    const paypalToken = urlParams.get("token");
    const isPaypal = urlParams.get("paypal") === "true";

    // PayPal return: capture the order
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
            // Store email for blood dashboard access
            if (data.email) {
              localStorage.setItem("neurocore_email", data.email);
            }
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

    // Stripe return: confirm the session
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
            if (data.email) {
              localStorage.setItem("neurocore_email", data.email);
            }
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

    // No payment params: check if already logged in
    const token = typeof window !== "undefined" ? localStorage.getItem("apexlabs_token") : null;
    if (token) {
      navigate("/blood-dashboard");
    }
  }, [navigate]);

  if (confirming) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="mx-auto max-w-xl px-6 py-20">
          <Card className="border border-white/10 bg-white/5 p-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#FCDD00]" />
            <p className="text-sm text-white/60">Confirmation du paiement en cours...</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="mx-auto max-w-xl px-6 py-20">
        <Card className="border border-white/10 bg-white/5 p-8 text-center space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Blood Analysis</p>
          <h1 className="text-2xl font-semibold">Accede au dashboard client</h1>
          {confirmError ? (
            <p className="text-sm text-red-400">{confirmError}</p>
          ) : (
            <p className="text-sm text-white/60">
              Connecte-toi pour uploader ton bilan, suivre ton historique et ouvrir ton rapport premium.
            </p>
          )}
          <Button
            className="w-full bg-[#FCDD00] text-black hover:bg-[#e7c700]"
            onClick={() => navigate("/auth/login?next=/blood-dashboard")}
          >
            Ouvrir le dashboard
          </Button>
        </Card>
      </div>
    </div>
  );
}
