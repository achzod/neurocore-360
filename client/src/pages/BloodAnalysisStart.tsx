import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/Header";

export default function BloodAnalysisStart() {
  const [, navigate] = useLocation();

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("apexlabs_token") : null;
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <div className="mx-auto max-w-xl px-6 py-20">
        <Card className="border border-white/10 bg-white/5 p-8 text-center space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Blood Analysis</p>
          <h1 className="text-2xl font-semibold">Accede au dashboard client</h1>
          <p className="text-sm text-white/60">
            Connecte-toi pour uploader ton bilan, suivre ton historique et ouvrir ton rapport premium.
          </p>
          <Button
            className="w-full bg-[#FCDD00] text-black hover:bg-[#e7c700]"
            onClick={() => navigate("/auth/login")}
          >
            Ouvrir le dashboard
          </Button>
        </Card>
      </div>
    </div>
  );
}
