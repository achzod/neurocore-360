import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BLOOD_PANELS, getMarkersByGender } from "@/lib/blood-questionnaire";

export default function BloodAnalysisStart() {
  const [, setLocation] = useLocation();
  const [reportId, setReportId] = useState("");
  const [email, setEmail] = useState("");
  const [prenom, setPrenom] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"homme" | "femme">("homme");
  const [objectives, setObjectives] = useState("");
  const [medications, setMedications] = useState("");
  const [markerValues, setMarkerValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const panels = useMemo(() => {
    const genderMarkers = getMarkersByGender(gender);
    return BLOOD_PANELS.map((panel) => ({
      ...panel,
      markers: panel.markers.filter((marker) =>
        genderMarkers.some((allowed) => allowed.id === marker.id)
      ),
    })).filter((panel) => panel.markers.length > 0);
  }, [gender]);

  const handleOpen = () => {
    const trimmed = reportId.trim();
    if (!trimmed) return;
    setLocation(`/blood-analysis/${trimmed}`);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim()) {
      setError("Merci d'indiquer un email valide.");
      return;
    }

    const requiredMarkers = panels.flatMap((panel) => panel.markers.filter((marker) => marker.required));
    const missingRequired = requiredMarkers.filter((marker) => !markerValues[marker.id]?.trim());
    if (missingRequired.length > 0) {
      setError(`Champs requis manquants: ${missingRequired.map((m) => m.name).join(", ")}`);
      return;
    }

    const markers = panels
      .flatMap((panel) => panel.markers)
      .map((marker) => {
        const raw = markerValues[marker.id];
        if (!raw) return null;
        const parsed = Number(raw.replace(",", "."));
        if (Number.isNaN(parsed)) {
          return { marker, invalid: true };
        }
        return { markerId: marker.id, value: parsed };
      })
      .filter(Boolean);

    const invalidMarkers = markers.filter((entry) => "invalid" in entry) as Array<{ marker: { name: string } }>;
    if (invalidMarkers.length > 0) {
      setError(`Valeurs invalides: ${invalidMarkers.map((m) => m.marker.name).join(", ")}`);
      return;
    }

    const payloadMarkers = markers.filter((entry) => !("invalid" in entry)) as Array<{
      markerId: string;
      value: number;
    }>;

    if (payloadMarkers.length === 0) {
      setError("Renseigne au moins un biomarqueur pour lancer l'analyse.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/blood-analysis/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          markers: payloadMarkers,
          profile: {
            prenom: prenom.trim() || undefined,
            gender,
            age: age.trim() || undefined,
            objectives: objectives.trim() || undefined,
            medications: medications.trim() || undefined,
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
            Renseigne tes marqueurs pour declencher l'analyse premium. Le rapport sera genere automatiquement et
            accessible depuis ton email.
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
                  <label className="text-xs uppercase tracking-[0.2em] text-white/50">Age</label>
                  <Input
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                    placeholder="36"
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
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">Objectifs</label>
                <Textarea
                  value={objectives}
                  onChange={(event) => setObjectives(event.target.value)}
                  placeholder="Performance, perte de gras, optimisation hormonale..."
                  className="mt-2 bg-black/40 border-white/10 text-white placeholder:text-white/40 min-h-[90px]"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-white/50">Medicaments / suppl.</label>
                <Textarea
                  value={medications}
                  onChange={(event) => setMedications(event.target.value)}
                  placeholder="Ex: metformine, TRT, complement..."
                  className="mt-2 bg-black/40 border-white/10 text-white placeholder:text-white/40 min-h-[90px]"
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold mb-4">Biomarqueurs</h2>
              <Accordion type="multiple" defaultValue={panels.map((panel) => panel.id)}>
                {panels.map((panel) => (
                  <AccordionItem key={panel.id} value={panel.id} className="border-white/10">
                    <AccordionTrigger className="text-left text-white/90">
                      <div>
                        <p className="text-sm font-semibold">{panel.title}</p>
                        <p className="text-xs text-white/50">{panel.subtitle}</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        {panel.markers.map((marker) => (
                          <div key={marker.id} className="rounded-lg border border-white/10 bg-black/40 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">{marker.name}</p>
                                <p className="text-xs text-white/50">{marker.hint || "Range optimal disponible"}</p>
                              </div>
                              <span className="text-xs text-white/50">{marker.unit}</span>
                            </div>
                            <Input
                              value={markerValues[marker.id] || ""}
                              onChange={(event) =>
                                setMarkerValues((prev) => ({ ...prev, [marker.id]: event.target.value }))
                              }
                              placeholder={marker.placeholder}
                              className="mt-3 bg-black/60 border-white/10 text-white placeholder:text-white/40"
                            />
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#FCDD00] text-black hover:bg-[#e7c700]"
            >
              {submitting ? "Analyse en cours..." : "Generer mon rapport Blood Analysis"}
            </Button>
          </div>

          <div className="space-y-6">
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
              <p>Minimum requis: TSH, glycemie a jeun, HDL, LDL, ferritine, vitamine D.</p>
              <p>Les valeurs sont analysees selon des ranges optimaux orientés performance.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
