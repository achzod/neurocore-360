/**
 * NEUROCORE 360 - Blood Analysis Page
 * Premium blood work analysis with AI-powered insights
 */

import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  Beaker,
  ArrowRight,
  Activity,
  Heart,
  Brain,
  Flame,
  Pill,
  Shield,
  CheckCircle2,
  TrendingUp,
  Target,
  Zap,
  AlertTriangle,
  Info,
} from "lucide-react";
import { BLOOD_PANELS, type BloodMarkerQuestion } from "@/lib/blood-questionnaire";
import { useToast } from "@/hooks/use-toast";

export default function BloodAnalysis() {
  const { toast } = useToast();
  const [activePanel, setActivePanel] = useState("hormonal");
  const [gender, setGender] = useState<"homme" | "femme">("homme");
  const [markerValues, setMarkerValues] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const panelIcons: Record<string, typeof Activity> = {
    hormonal: TrendingUp,
    thyroid: Activity,
    metabolic: Flame,
    inflammation: Zap,
    vitamins: Pill,
    liver_kidney: Heart,
  };

  const handleMarkerChange = (markerId: string, value: string) => {
    setMarkerValues((prev) => ({ ...prev, [markerId]: value }));
  };

  const getFilledMarkersCount = () => {
    return Object.values(markerValues).filter((v) => v && v.trim() !== "").length;
  };

  const handleAnalyze = async () => {
    const filledMarkers = Object.entries(markerValues)
      .filter(([_, value]) => value && value.trim() !== "")
      .map(([id, value]) => ({
        id,
        value: parseFloat(value),
      }));

    if (filledMarkers.length < 3) {
      toast({
        title: "Donnees insuffisantes",
        description: "Entre au moins 3 biomarqueurs pour lancer l'analyse.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/blood-analysis/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markers: filledMarkers,
          profile: { gender },
        }),
      });

      if (!response.ok) throw new Error("Analyse failed");

      const data = await response.json();
      setAnalysisResult(data);

      toast({
        title: "Analyse terminee",
        description: `${filledMarkers.length} biomarqueurs analyses avec succes.`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de lancer l'analyse. Reessaie.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-red-500/20 text-red-600 border-red-500/30">
            <Beaker className="mr-2 h-3 w-3" />
            Blood Analysis
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
            Analyse ton bilan sanguin
            <span className="block text-primary">avec les ranges OPTIMAUX</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Entre tes valeurs ci-dessous. Notre IA les compare aux ranges utilises par
            Peter Attia, Marek Health, et les meilleurs coaches en biohacking.
          </p>
        </motion.div>

        {/* Gender Selection */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-4 p-2 rounded-xl bg-muted/50">
            <Label className="text-sm text-muted-foreground">Sexe :</Label>
            <Select value={gender} onValueChange={(v: "homme" | "femme") => setGender(v)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homme">Homme</SelectItem>
                <SelectItem value="femme">Femme</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left - Input Panels */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Beaker className="h-5 w-5 text-primary" />
                    Tes Biomarqueurs
                  </span>
                  <Badge variant="outline">
                    {getFilledMarkersCount()} remplis
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs value={activePanel} onValueChange={setActivePanel}>
                  <TabsList className="w-full justify-start rounded-none border-b h-auto p-0 bg-transparent overflow-x-auto">
                    {BLOOD_PANELS.map((panel) => {
                      const Icon = panelIcons[panel.id] || Activity;
                      return (
                        <TabsTrigger
                          key={panel.id}
                          value={panel.id}
                          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 text-xs sm:text-sm"
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          <span className="hidden sm:inline">{panel.title}</span>
                          <span className="sm:hidden">{panel.id.slice(0, 4)}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {BLOOD_PANELS.map((panel) => (
                    <TabsContent key={panel.id} value={panel.id} className="p-4 sm:p-6">
                      <div className="mb-4">
                        <h3 className="font-semibold">{panel.title}</h3>
                        <p className="text-sm text-muted-foreground">{panel.subtitle}</p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        {panel.markers
                          .filter((m) => !m.genderSpecific || m.genderSpecific === gender)
                          .map((marker) => (
                            <div key={marker.id} className="space-y-2">
                              <Label className="text-sm flex items-center gap-2">
                                {marker.name}
                                {marker.required && (
                                  <span className="text-red-500">*</span>
                                )}
                              </Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="any"
                                  placeholder={marker.placeholder}
                                  value={markerValues[marker.id] || ""}
                                  onChange={(e) =>
                                    handleMarkerChange(marker.id, e.target.value)
                                  }
                                  className="pr-16"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                  {marker.unit}
                                </span>
                              </div>
                              {marker.hint && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Info className="h-3 w-3" />
                                  {marker.hint}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right - Summary & CTA */}
          <div className="space-y-6">
            {/* Pricing Card */}
            <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-primary mb-1">99€</div>
                  <p className="text-sm text-muted-foreground">Paiement unique</p>
                </div>

                <ul className="space-y-3 mb-6">
                  {[
                    "35+ biomarqueurs analyses",
                    "Ranges OPTIMAUX vs normaux",
                    "Detection patterns cliniques",
                    "Protocole supplements personnalise",
                    "Sources scientifiques citees",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || getFilledMarkersCount() < 3}
                >
                  {isAnalyzing ? (
                    <>Analyse en cours...</>
                  ) : (
                    <>
                      <Beaker className="h-5 w-5" />
                      Lancer l'analyse
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  <Shield className="h-3 w-3 inline mr-1" />
                  Donnees chiffrees et securisees
                </p>
              </CardContent>
            </Card>

            {/* Info Box */}
            <Card className="bg-amber-500/10 border-amber-500/20">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Disclaimer medical
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cette analyse ne remplace pas une consultation medicale.
                      Consulte ton medecin pour toute decision therapeutique.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Analysis Result */}
        {analysisResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12"
          >
            <Card>
              <CardHeader className="border-b bg-primary/5">
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  Resultat de l'analyse
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {analysisResult.aiReport ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: analysisResult.aiReport.replace(/\n/g, "<br />"),
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-sm font-medium text-green-600 mb-1">Optimal</p>
                        <p className="text-2xl font-bold text-green-600">
                          {analysisResult.analysis?.summary?.optimal?.length || 0}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-sm font-medium text-yellow-600 mb-1">A surveiller</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {analysisResult.analysis?.summary?.suboptimal?.length || 0}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-sm font-medium text-red-600 mb-1">Action requise</p>
                        <p className="text-2xl font-bold text-red-600">
                          {analysisResult.analysis?.summary?.action?.length || 0}
                        </p>
                      </div>
                    </div>

                    {analysisResult.analysis?.patterns?.length > 0 && (
                      <div className="p-4 rounded-lg bg-muted">
                        <p className="font-medium mb-2">Patterns detectes:</p>
                        <div className="flex flex-wrap gap-2">
                          {analysisResult.analysis.patterns.map((p: any, i: number) => (
                            <Badge key={i} variant="secondary">
                              {p.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
}
