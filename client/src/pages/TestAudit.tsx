import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Sparkles, TestTube } from "lucide-react";

const sampleResponses = {
  "age": "26-35",
  "sexe": "homme",
  "objectif": "perte-graisse",
  "niveau-activite": "modere",
  "historique-medical": ["aucun"],
  "profession": "bureau",
  "taille": "178",
  "poids": "82",
  "masse-grasse": "21-25",
  "evolution-poids": "yoyo",
  "morphologie": "mesomorphe",
  "zones-stockage": ["ventre", "hanches"],
  "retention-eau": "parfois",
  "regimes-passes": "2-3",
  "energie-matin": "moyenne",
  "energie-apres-midi": "basse",
  "coups-fatigue": "oui-quotidien",
  "glycemie": "instable",
  "tolerance-froid": "normale",
  "sudation": "normale",
  "repas-jour": "3",
  "petit-dejeuner": "sucre",
  "proteines-repas": "1-2",
  "legumes-jour": "1-2",
  "hydratation": "1-1.5L",
  "tracking": "jamais",
  "supplements": ["vitamine-d", "omega3"],
  "digestion-generale": "moyenne",
  "ballonnements": "reguliers",
  "transit": "irregulier",
  "intolerance": ["lactose"],
  "probiotiques": "jamais",
  "antibiotiques": "1-2-fois",
  "type-entrainement": ["musculation", "cardio"],
  "frequence-sport": "3-4",
  "intensite": "moderee",
  "progression": "stagnation",
  "recup-musculaire": "48-72h",
  "blessures": "anciennes",
  "heures-sommeil": "6-7",
  "qualite-sommeil": "moyenne",
  "endormissement": "15-30min",
  "reveils-nocturnes": "1-2",
  "reveil-matin": "fatigue",
  "siestes": "rarement",
  "hrv-mesure": "non",
  "frequence-repos": "60-70",
  "variabilite": "moyenne",
  "palpitations": "parfois",
  "tension": "normale",
  "essoufflement": "effort-modere",
  "bilan-recent": "6-12-mois",
  "vitamine-d": "insuffisant",
  "ferritine": "normal",
  "thyroide": "non-teste",
  "testosterone": "non-teste",
  "cortisol": "non-teste",
  "stress-niveau": "modere",
  "stress-chronique": "oui",
  "anxiete": "parfois",
  "cortisol-signes": ["fatigue-matin", "energie-soir"],
  "libido": "moyenne",
  "cycle-menstruel": "na",
  "cafe-jour": "2-3",
  "alcool": "1-2-semaine",
  "tabac": "non",
  "cannabis": "non",
  "ecrans-soir": "2-3h",
  "nature": "rarement",
  "douleurs-dos": "occasionnel",
  "posture": "moyenne",
  "mobilite-hanches": "limitee",
  "mobilite-epaules": "correcte",
  "etirements": "rarement",
  "position-travail": "assis-prolonge",
  "concentration": "difficile",
  "memoire": "correcte",
  "motivation": "variable",
  "humeur": "stable",
  "creativite": "soir",
  "addictions": ["reseaux-sociaux"],
};

export default function TestAudit() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [planType, setPlanType] = useState<"GRATUIT" | "PREMIUM" | "ELITE">("PREMIUM");

  const createTestAudit = async () => {
    setLoading(true);
    try {
      const response = await apiRequest("POST", "/api/audit/create", {
        email: "test@neurocore.com",
        type: planType,
        responses: sampleResponses,
      });
      const audit = await response.json();
      navigate(`/dashboard/${audit.id}`);
    } catch (error) {
      console.error("Error creating test audit:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <TestTube className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="mt-4 text-2xl">Mode Test APEXLABS</CardTitle>
            <p className="text-muted-foreground">
              Genere un audit avec des reponses pre-remplies pour tester l'analyse personnalisee
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <p className="text-sm font-medium">Type de plan a tester :</p>
              <div className="flex gap-3">
                <Button
                  variant={planType === "GRATUIT" ? "default" : "outline"}
                  onClick={() => setPlanType("GRATUIT")}
                  className="flex-1"
                  data-testid="button-plan-gratuit"
                >
                  Gratuit (4 sections)
                </Button>
                <Button
                  variant={planType === "PREMIUM" ? "default" : "outline"}
                  onClick={() => setPlanType("PREMIUM")}
                  className="flex-1"
                  data-testid="button-plan-anabolic"
                >
                  Anabolic Bioscan (15 sections)
                </Button>
                <Button
                  variant={planType === "ELITE" ? "default" : "outline"}
                  onClick={() => setPlanType("ELITE")}
                  className="flex-1"
                  data-testid="button-plan-ultimate"
                >
                  Ultimate Scan (15 sections)
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="font-medium mb-2">Donnees de test :</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Homme, 26-35 ans</li>
                <li>Objectif : Perte de graisse</li>
                <li>Activite : Moderee (3-4x/semaine)</li>
                <li>Problemes : Yoyo, fatigue, sommeil moyen</li>
                <li>Stress : Modere avec signes de cortisol</li>
              </ul>
            </div>

            <Button
              onClick={createTestAudit}
              disabled={loading}
              className="w-full"
              size="lg"
              data-testid="button-generate-test"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generation en cours...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generer l'analyse de test
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
