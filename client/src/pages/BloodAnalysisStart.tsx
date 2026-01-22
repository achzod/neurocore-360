import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function BloodAnalysisStart() {
  const [, setLocation] = useLocation();
  const [reportId, setReportId] = useState("");

  const handleOpen = () => {
    const trimmed = reportId.trim();
    if (!trimmed) return;
    setLocation(`/blood-analysis/${trimmed}`);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 py-12">
      <div className="max-w-xl w-full space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Blood Analysis</p>
          <h1 className="text-3xl font-semibold mt-2">Accede a ton dashboard</h1>
          <p className="text-sm text-white/60 mt-3">
            Ton rapport complet est envoye par email apres l'analyse. Utilise l'identifiant recu pour ouvrir le
            dashboard biomarqueurs.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-white/50">Report ID</label>
            <Input
              value={reportId}
              onChange={(event) => setReportId(event.target.value)}
              placeholder="ex: 2c9f7f2a-..."
              className="mt-2 bg-black/40 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <Button onClick={handleOpen} className="w-full bg-[#FCDD00] text-black hover:bg-[#e7c700]">
            Ouvrir mon rapport
          </Button>
        </div>
      </div>
    </div>
  );
}
