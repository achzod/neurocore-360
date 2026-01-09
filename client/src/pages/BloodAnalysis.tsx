/**
 * APEXLABS - Blood Analysis Page
 * PDF Upload + AI-powered expert analysis with optimal ranges
 */

import { useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Beaker,
  Upload,
  FileText,
  ArrowRight,
  Activity,
  Heart,
  Brain,
  Flame,
  Pill,
  Shield,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  Loader2,
  X,
  Download,
  Zap,
  Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type AnalysisStep = "upload" | "processing" | "payment" | "results";

interface MarkerResult {
  name: string;
  value: number;
  unit: string;
  labRange: { min: number; max: number };
  optimalRange: { min: number; max: number };
  status: "optimal" | "suboptimal" | "action";
  interpretation: string;
}

interface CategoryAnalysis {
  category: string;
  icon: string;
  score: number;
  markers: MarkerResult[];
  summary: string;
  recommendations: string[];
}

interface AnalysisResult {
  categories: CategoryAnalysis[];
  patterns: { name: string; description: string; severity: "low" | "medium" | "high" }[];
  protocols: {
    nutrition: string[];
    supplements: { name: string; dosage: string; reason: string }[];
    lifestyle: string[];
  };
  globalScore: number;
  executiveSummary: string;
}

export default function BloodAnalysis() {
  const { toast } = useToast();
  const [step, setStep] = useState<AnalysisStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
    } else {
      toast({
        title: "Format non supporte",
        description: "Seuls les fichiers PDF sont acceptes.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.type === "application/pdf") {
      setFile(selectedFile);
    } else if (selectedFile) {
      toast({
        title: "Format non supporte",
        description: "Seuls les fichiers PDF sont acceptes.",
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = async () => {
    if (!file || !email) {
      toast({
        title: "Informations manquantes",
        description: "Upload ton PDF et entre ton email.",
        variant: "destructive",
      });
      return;
    }

    setStep("processing");

    // Simulate upload progress
    const uploadInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(uploadInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("email", email);

      // Upload and analyze
      const response = await fetch("/api/blood-analysis/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(uploadInterval);
      setUploadProgress(100);

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      // Start analysis progress
      const analysisInterval = setInterval(() => {
        setAnalysisProgress((prev) => {
          if (prev >= 90) {
            clearInterval(analysisInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 500);

      const data = await response.json();

      clearInterval(analysisInterval);
      setAnalysisProgress(100);

      if (data.requiresPayment) {
        setStep("payment");
      } else {
        setAnalysisResult(data.analysis);
        setStep("results");
      }

      toast({
        title: "Analyse terminee",
        description: "Tes resultats sont prets.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'analyser le fichier. Reessaie.",
        variant: "destructive",
      });
      setStep("upload");
      setUploadProgress(0);
      setAnalysisProgress(0);
    }
  };

  const categoryIcons: Record<string, typeof Activity> = {
    hormonal: TrendingUp,
    thyroid: Activity,
    metabolic: Flame,
    inflammation: Zap,
    vitamins: Pill,
    liver_kidney: Heart,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "optimal":
        return "text-green-500 bg-green-500/10 border-green-500/20";
      case "suboptimal":
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case "action":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 bg-red-500/20 text-red-600 border-red-500/30">
            <Beaker className="mr-2 h-3 w-3" />
            Blood Analysis - 99€
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
            Decode ton bilan sanguin
            <span className="block text-red-500">avec les ranges OPTIMAUX</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Upload ton PDF de bilan sanguin. Analyse avec les ranges utilises par
            Peter Attia, Marek Health, et les meilleurs en medecine fonctionnelle.
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-4">
            {["Upload", "Analyse", "Resultats"].map((label, i) => {
              const stepIndex = ["upload", "processing", "results"].indexOf(step);
              const isActive = i <= stepIndex || (step === "payment" && i <= 1);
              return (
                <div key={label} className="flex items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                      isActive
                        ? "bg-red-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className={`ml-2 text-sm ${isActive ? "" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                  {i < 2 && <div className="mx-4 h-px w-12 bg-border" />}
                </div>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Upload */}
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid lg:grid-cols-2 gap-8"
            >
              {/* Left - Upload Zone */}
              <Card className="border-dashed border-2">
                <CardContent className="p-8">
                  <div
                    className={`relative border-2 border-dashed rounded p-12 text-center transition-colors ${
                      isDragging
                        ? "border-red-500 bg-red-500/5"
                        : file
                        ? "border-green-500 bg-green-500/5"
                        : "border-muted-foreground/30 hover:border-red-500/50"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    {file ? (
                      <div className="space-y-4">
                        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-green-500/10">
                          <FileText className="h-8 w-8 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium text-green-600">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Changer de fichier
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-red-500/10">
                          <Upload className="h-8 w-8 text-red-500" />
                        </div>
                        <div>
                          <p className="font-medium">Glisse ton PDF ici</p>
                          <p className="text-sm text-muted-foreground">
                            ou clique pour selectionner
                          </p>
                        </div>
                        <Badge variant="outline">PDF uniquement</Badge>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <Label htmlFor="email">Email pour recevoir le rapport</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="ton@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    <Button
                      size="lg"
                      className="w-full gap-2 bg-red-500 hover:bg-red-600"
                      onClick={handleAnalyze}
                      disabled={!file || !email}
                    >
                      <Beaker className="h-5 w-5" />
                      Analyser mon bilan - 99€
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Right - What's included */}
              <div className="space-y-6">
                <Card className="border-red-500/20 bg-gradient-to-b from-red-500/5 to-transparent">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-red-500" />
                      Ce que tu vas recevoir
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      "Extraction automatique de tous tes biomarqueurs",
                      "Comparaison ranges LABO vs ranges OPTIMAUX",
                      "Radar de risques par categorie (hormonal, thyroide, metabolique...)",
                      "Detection de patterns cliniques (Low T, Thyroid Slowdown, Insuline Resistance...)",
                      "Protocole nutrition personnalise",
                      "Stack supplements avec dosages precis",
                      "Sources scientifiques pour chaque recommandation",
                      "Rapport PDF de 20+ pages exportable",
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-amber-500/10 border-amber-500/20">
                  <CardContent className="p-4 flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-600">
                        Disclaimer medical
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cette analyse ne remplace pas une consultation medicale.
                        Consulte ton medecin pour toute decision therapeutique.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Step 2: Processing */}
          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-lg mx-auto"
            >
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-red-500/10 mb-6">
                    <Loader2 className="h-10 w-10 text-red-500 animate-spin" />
                  </div>

                  <h2 className="text-xl font-bold mb-2">Analyse en cours...</h2>
                  <p className="text-muted-foreground mb-8">
                    Extraction et analyse de chaque biomarqueur de ton bilan.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Upload du PDF</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Analyse Expert</span>
                        <span>{analysisProgress}%</span>
                      </div>
                      <Progress value={analysisProgress} className="h-2" />
                    </div>
                  </div>

                  <div className="mt-8 text-xs text-muted-foreground">
                    <p>Extraction des valeurs... Detection des patterns...</p>
                    <p>Generation des recommandations personnalisees...</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Payment */}
          {step === "payment" && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg mx-auto"
            >
              <Card className="border-red-500/20">
                <CardContent className="p-8 text-center">
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-green-500/10 mb-6">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>

                  <h2 className="text-xl font-bold mb-2">PDF analyse avec succes</h2>
                  <p className="text-muted-foreground mb-6">
                    Nous avons extrait tous tes biomarqueurs. Finalise le paiement pour
                    acceder a ton rapport complet.
                  </p>

                  <div className="bg-muted/50 rounded-lg p-4 mb-6">
                    <div className="text-4xl font-bold text-red-500 mb-1">99€</div>
                    <p className="text-sm text-muted-foreground">Paiement unique</p>
                    <p className="text-xs text-green-600 mt-2">
                      Deduit de ton coaching si tu prends un accompagnement
                    </p>
                  </div>

                  <Button
                    size="lg"
                    className="w-full gap-2 bg-red-500 hover:bg-red-600"
                    onClick={() => {
                      // Redirect to Stripe checkout
                      window.location.href = `/api/blood-analysis/checkout?email=${encodeURIComponent(email)}`;
                    }}
                  >
                    <Shield className="h-5 w-5" />
                    Payer et voir mes resultats
                  </Button>

                  <p className="text-xs text-muted-foreground mt-4">
                    Paiement securise par Stripe
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Results */}
          {step === "results" && analysisResult && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Global Score */}
              <Card className="border-red-500/20 bg-gradient-to-r from-red-500/10 to-transparent">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500/20">
                      <span className="text-3xl font-bold text-red-500">
                        {analysisResult.globalScore}/100
                      </span>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-xl font-bold mb-2">Score Global Sante</h2>
                      <p className="text-muted-foreground">
                        {analysisResult.executiveSummary}
                      </p>
                    </div>
                    <Button variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Telecharger PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Patterns Detected */}
              {analysisResult.patterns.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      Patterns cliniques detectes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {analysisResult.patterns.map((pattern, i) => (
                        <div
                          key={i}
                          className={`p-4 rounded-lg border ${
                            pattern.severity === "high"
                              ? "bg-red-500/10 border-red-500/20"
                              : pattern.severity === "medium"
                              ? "bg-amber-500/10 border-amber-500/20"
                              : "bg-yellow-500/10 border-yellow-500/20"
                          }`}
                        >
                          <h4 className="font-semibold">{pattern.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {pattern.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Categories Radar */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {analysisResult.categories.map((cat, i) => {
                  const Icon = categoryIcons[cat.icon] || Activity;
                  return (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-base">
                          <span className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-red-500" />
                            {cat.category}
                          </span>
                          <Badge
                            className={
                              cat.score >= 80
                                ? "bg-green-500/20 text-green-600"
                                : cat.score >= 60
                                ? "bg-yellow-500/20 text-yellow-600"
                                : "bg-red-500/20 text-red-600"
                            }
                          >
                            {cat.score}/100
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {cat.summary}
                        </p>
                        <div className="space-y-2">
                          {cat.markers.slice(0, 3).map((marker, j) => (
                            <div
                              key={j}
                              className={`flex items-center justify-between text-xs p-2 rounded ${getStatusColor(
                                marker.status
                              )}`}
                            >
                              <span>{marker.name}</span>
                              <span className="font-mono">
                                {marker.value} {marker.unit}
                              </span>
                            </div>
                          ))}
                          {cat.markers.length > 3 && (
                            <p className="text-xs text-muted-foreground text-center pt-2">
                              +{cat.markers.length - 3} autres marqueurs
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Protocols */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Nutrition */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Flame className="h-4 w-4 text-orange-500" />
                      Protocole Nutrition
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysisResult.protocols.nutrition.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Supplements */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Pill className="h-4 w-4 text-cyan-500" />
                      Stack Supplements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {analysisResult.protocols.supplements.map((supp, i) => (
                        <li key={i} className="text-sm">
                          <div className="font-medium">{supp.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {supp.dosage} - {supp.reason}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Lifestyle */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Heart className="h-4 w-4 text-pink-500" />
                      Ajustements Lifestyle
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysisResult.protocols.lifestyle.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-pink-500 shrink-0 mt-0.5" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* CTA */}
              <Card className="bg-gradient-to-r from-red-500/10 to-purple-500/10 border-red-500/20">
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-bold mb-2">
                    Tu veux un accompagnement expert ?
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Les 99€ de cette analyse sont deduits si tu prends un coaching.
                  </p>
                  <Link href="/offers/pro-panel">
                    <Button size="lg" className="gap-2 bg-red-500 hover:bg-red-600">
                      Voir les coachings
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
