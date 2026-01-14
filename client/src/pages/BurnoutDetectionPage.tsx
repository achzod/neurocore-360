/**
 * APEXLABS - Burnout Detection Questionnaire Page
 * Neuro-endocrine questionnaire with 50 questions
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  ArrowRight,
  ArrowLeft,
  Battery,
  Zap,
  Moon,
  Activity,
  Heart,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  TrendingDown,
  Clock,
  Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// Burnout questionnaire sections
const BURNOUT_SECTIONS = [
  {
    id: "energy",
    title: "Niveau d'energie",
    icon: Battery,
    questions: [
      { id: "e1", text: "Je me sens epuise(e) des le reveil", category: "physical" },
      { id: "e2", text: "J'ai besoin de cafe/stimulants pour fonctionner", category: "physical" },
      { id: "e3", text: "Mon energie chute brutalement l'apres-midi", category: "physical" },
      { id: "e4", text: "Je n'ai plus l'energie pour mes hobbies", category: "physical" },
      { id: "e5", text: "Les taches simples me semblent epuisantes", category: "physical" },
      { id: "e6", text: "Je me sens vide meme apres du repos", category: "physical" },
      { id: "e7", text: "Mon corps est constamment tendu", category: "physical" },
      { id: "e8", text: "J'ai des douleurs musculaires frequentes", category: "physical" },
    ],
  },
  {
    id: "sleep",
    title: "Sommeil & Recuperation",
    icon: Moon,
    questions: [
      { id: "s1", text: "J'ai du mal a m'endormir", category: "sleep" },
      { id: "s2", text: "Je me reveille souvent la nuit", category: "sleep" },
      { id: "s3", text: "Je me reveille fatigue(e) meme apres 8h de sommeil", category: "sleep" },
      { id: "s4", text: "J'ai des pensees qui tournent en boucle la nuit", category: "sleep" },
      { id: "s5", text: "Je fais des cauchemars ou des reves stressants", category: "sleep" },
      { id: "s6", text: "Je ne me sens jamais vraiment repose(e)", category: "sleep" },
    ],
  },
  {
    id: "cognitive",
    title: "Fonctions cognitives",
    icon: Brain,
    questions: [
      { id: "c1", text: "J'ai du mal a me concentrer", category: "cognitive" },
      { id: "c2", text: "Ma memoire s'est deterioree", category: "cognitive" },
      { id: "c3", text: "Je fais plus d'erreurs qu'avant", category: "cognitive" },
      { id: "c4", text: "J'ai du mal a prendre des decisions", category: "cognitive" },
      { id: "c5", text: "Je perds le fil de mes pensees", category: "cognitive" },
      { id: "c6", text: "Je me sens dans le brouillard mental", category: "cognitive" },
      { id: "c7", text: "Ma creativite a diminue", category: "cognitive" },
    ],
  },
  {
    id: "emotional",
    title: "Etat emotionnel",
    icon: Heart,
    questions: [
      { id: "em1", text: "Je suis plus irritable qu'avant", category: "emotional" },
      { id: "em2", text: "Je me sens detache(e) de mon travail", category: "emotional" },
      { id: "em3", text: "J'ai perdu motivation et enthousiasme", category: "emotional" },
      { id: "em4", text: "Je me sens anxieux(se) sans raison", category: "emotional" },
      { id: "em5", text: "Je ressens un sentiment de vide", category: "emotional" },
      { id: "em6", text: "Je pleure plus facilement", category: "emotional" },
      { id: "em7", text: "Je me sens cynique ou negatif", category: "emotional" },
      { id: "em8", text: "J'ai des sautes d'humeur frequentes", category: "emotional" },
    ],
  },
  {
    id: "physical",
    title: "Symptomes physiques",
    icon: Activity,
    questions: [
      { id: "p1", text: "J'ai des maux de tete frequents", category: "physical_symptoms" },
      { id: "p2", text: "Mon systeme digestif est perturbe", category: "physical_symptoms" },
      { id: "p3", text: "J'ai des palpitations ou le coeur qui s'emballe", category: "physical_symptoms" },
      { id: "p4", text: "Je tombe malade plus souvent", category: "physical_symptoms" },
      { id: "p5", text: "J'ai pris ou perdu du poids sans raison", category: "physical_symptoms" },
      { id: "p6", text: "Ma libido a diminue", category: "physical_symptoms" },
      { id: "p7", text: "J'ai des vertiges ou sensations de faiblesse", category: "physical_symptoms" },
    ],
  },
  {
    id: "social",
    title: "Vie sociale & Pro",
    icon: Target,
    questions: [
      { id: "so1", text: "Je m'isole de mes proches", category: "social" },
      { id: "so2", text: "Je n'ai plus envie de voir mes amis", category: "social" },
      { id: "so3", text: "Je procrastine beaucoup plus qu'avant", category: "social" },
      { id: "so4", text: "Je dreads d'aller au travail", category: "social" },
      { id: "so5", text: "Je me sens incompris(e) par mon entourage", category: "social" },
      { id: "so6", text: "J'ai du mal a dire non aux demandes", category: "social" },
      { id: "so7", text: "Je travaille plus mais produis moins", category: "social" },
      { id: "so8", text: "Je me sens coupable quand je me repose", category: "social" },
    ],
  },
];

const RESPONSE_OPTIONS = [
  { value: "0", label: "Jamais", score: 0 },
  { value: "1", label: "Rarement", score: 1 },
  { value: "2", label: "Parfois", score: 2 },
  { value: "3", label: "Souvent", score: 3 },
  { value: "4", label: "Toujours", score: 4 },
];

type Step = "intro" | "questions" | "email" | "processing" | "results";

interface BurnoutResult {
  score: number;
  phase: "alarme" | "resistance" | "epuisement";
  phaseDescription: string;
  categoryScores: { category: string; score: number; max: number }[];
  riskLevel: "low" | "medium" | "high" | "critical";
  topConcerns: string[];
  protocol: {
    week: number;
    focus: string;
    actions: string[];
  }[];
}

export default function BurnoutDetectionPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("intro");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<BurnoutResult | null>(null);

  const totalSections = BURNOUT_SECTIONS.length;
  const currentSection = BURNOUT_SECTIONS[currentSectionIndex];
  const totalQuestions = BURNOUT_SECTIONS.reduce((acc, s) => acc + s.questions.length, 0);
  const answeredQuestions = Object.keys(responses).length;
  const progress = (answeredQuestions / totalQuestions) * 100;

  const isSectionComplete = currentSection?.questions.every((q) => responses[q.id]);
  const isEmailValid = email.includes("@");

  useEffect(() => {
    const storedEmail = localStorage.getItem("burnout_email");
    if (!storedEmail) return;

    const loadProgress = async () => {
      try {
        const response = await fetch(`/api/burnout-detection/progress/${encodeURIComponent(storedEmail)}`);
        const data = await response.json();
        if (data.success && data.progress) {
          setEmail(storedEmail);
          setResponses(data.progress.responses || {});
          setCurrentSectionIndex(Number(data.progress.currentSection) || 0);
          setStep("questions");
          return;
        }
      } catch (err) {
        console.error("Burnout progress load failed:", err);
      }

      const storedResponses = localStorage.getItem("burnout_responses");
      const storedSection = localStorage.getItem("burnout_section");
      if (storedResponses) {
        setEmail(storedEmail);
        setResponses(JSON.parse(storedResponses));
        setCurrentSectionIndex(storedSection ? Number(storedSection) : 0);
        setStep("questions");
      }
    };

    loadProgress();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const success = params.get("success");
    const cancelled = params.get("cancelled");

    if (cancelled === "true") {
      toast({
        title: "Paiement annule",
        description: "Tu peux reprendre quand tu veux pour finaliser ton rapport.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (success === "true" && sessionId) {
      setStep("processing");
      setIsProcessing(true);
      fetch("/api/burnout-detection/confirm-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.id) {
            localStorage.removeItem("burnout_email");
            localStorage.removeItem("burnout_responses");
            localStorage.removeItem("burnout_section");
            window.history.replaceState({}, "", window.location.pathname);
            setLocation(`/burnout/${data.id}`);
            return;
          }
          throw new Error(data?.error || "Validation paiement echouee");
        })
        .catch(() => {
          setStep("email");
          toast({
            title: "Erreur de paiement",
            description: "Impossible de valider le paiement. Reessaie.",
            variant: "destructive",
          });
        })
        .finally(() => setIsProcessing(false));
    }
  }, [location, setLocation, toast]);

  const handleResponse = (questionId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const saveProgress = async (nextSection?: number, nextResponses?: Record<string, string>) => {
    if (!email || !email.includes("@")) return;
    try {
      await fetch("/api/burnout-detection/save-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          currentSection: typeof nextSection === "number" ? nextSection : currentSectionIndex,
          totalSections,
          responses: nextResponses || responses,
        }),
      });
    } catch (err) {
      console.error("Burnout progress save failed:", err);
    }
  };

  const handleNext = () => {
    if (currentSectionIndex < BURNOUT_SECTIONS.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
    } else {
      setStep("email");
    }
  };

  const handleBack = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
    }
  };

  useEffect(() => {
    if (!email) return;
    localStorage.setItem("burnout_email", email);
    localStorage.setItem("burnout_responses", JSON.stringify(responses));
    localStorage.setItem("burnout_section", String(currentSectionIndex));
  }, [email, responses, currentSectionIndex]);

  useEffect(() => {
    if (!email || Object.keys(responses).length === 0) return;
    const timer = setTimeout(() => {
      saveProgress();
    }, 2000);
    return () => clearTimeout(timer);
  }, [responses]);

  useEffect(() => {
    if (!email) return;
    saveProgress(currentSectionIndex);
  }, [currentSectionIndex]);

  useEffect(() => {
    if (!email) return;
    const interval = setInterval(() => {
      if (Object.keys(responses).length > 0) {
        saveProgress();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [email, responses]);

  const handleSubmit = async () => {
    if (!email) {
      toast({
        title: "Email requis",
        description: "Entre ton email pour recevoir ton rapport.",
        variant: "destructive",
      });
      return;
    }

    setStep("processing");
    setIsProcessing(true);

    try {
      await saveProgress(currentSectionIndex, responses);
      const response = await fetch("/api/burnout-detection/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses, email }),
      });

      if (!response.ok) throw new Error("Checkout failed");

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error(data.error || "Missing checkout URL");
    } catch (error) {
      toast({
        title: "Erreur de paiement",
        description: "Impossible de lancer le paiement pour le moment. Reessaie dans quelques minutes.",
        variant: "destructive",
      });
      setStep("email");
    } finally {
      setIsProcessing(false);
    }
  };

  // Local calculation fallback
  const calculateBurnoutScore = (resp: Record<string, string>): BurnoutResult => {
    const totalScore = Object.values(resp).reduce((acc, v) => acc + parseInt(v || "0"), 0);
    const maxScore = totalQuestions * 4;
    const percentage = (totalScore / maxScore) * 100;

    let phase: "alarme" | "resistance" | "epuisement";
    let phaseDescription: string;
    let riskLevel: "low" | "medium" | "high" | "critical";

    if (percentage < 30) {
      phase = "alarme";
      phaseDescription = "Tu es en phase d'alarme. Le stress commence a s'accumuler mais tu peux encore inverser la tendance facilement.";
      riskLevel = "low";
    } else if (percentage < 55) {
      phase = "resistance";
      phaseDescription = "Tu es en phase de resistance. Ton corps s'adapte au stress chronique mais les reserves s'epuisent. Action necessaire.";
      riskLevel = "medium";
    } else if (percentage < 75) {
      phase = "resistance";
      phaseDescription = "Tu es en phase de resistance avancee. Les signes d'epuisement sont clairs. Il faut agir maintenant.";
      riskLevel = "high";
    } else {
      phase = "epuisement";
      phaseDescription = "Tu es en phase d'epuisement. Le burnout est installe. Une intervention immediate et un accompagnement sont necessaires.";
      riskLevel = "critical";
    }

    // Calculate category scores
    const categoryScores = BURNOUT_SECTIONS.map((section) => {
      const sectionScore = section.questions.reduce(
        (acc, q) => acc + parseInt(resp[q.id] || "0"),
        0
      );
      return {
        category: section.title,
        score: sectionScore,
        max: section.questions.length * 4,
      };
    });

    // Find top concerns (highest scoring categories)
    const sortedCategories = [...categoryScores].sort(
      (a, b) => b.score / b.max - a.score / a.max
    );
    const topConcerns = sortedCategories.slice(0, 3).map((c) => c.category);

    // Generate protocol based on phase
    const protocol = [
      {
        week: 1,
        focus: "Reset nerveux",
        actions: [
          "Respiration coherence cardiaque 3x/jour (5 min)",
          "Deconnexion digitale apres 20h",
          "Coucher avant 22h30 obligatoire",
          "Marche lente 20 min en nature",
        ],
      },
      {
        week: 2,
        focus: "Nutrition anti-stress",
        actions: [
          "Magnesium bisglycinate 300mg le soir",
          "Ashwagandha 300mg le matin (adaptogene)",
          "Eliminer cafe apres 12h",
          "Augmenter proteines au petit-dejeuner",
        ],
      },
      {
        week: 3,
        focus: "Mouvement regenerateur",
        actions: [
          "Yoga doux ou stretching 15 min/jour",
          "Pas de cardio intense (ajoute du stress)",
          "Exposition soleil matinal 10 min",
          "Douche froide progressive (30 sec)",
        ],
      },
      {
        week: 4,
        focus: "Reconstruction durable",
        actions: [
          "Etablir limites claires (travail/perso)",
          "Identifier les draineurs d'energie",
          "Planifier mini-breaks reguliers",
          "Creer routine matinale sanctuarisee",
        ],
      },
    ];

    return {
      score: Math.round(percentage),
      phase,
      phaseDescription,
      categoryScores,
      riskLevel,
      topConcerns,
      protocol,
    };
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-500 bg-green-500/10 border-green-500/20";
      case "medium":
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case "high":
        return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "critical":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {/* Intro */}
          {step === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <Badge className="mb-6 bg-purple-500/20 text-purple-600 border-purple-500/30">
                <Brain className="mr-2 h-3 w-3" />
                Burnout Detection - 39€
              </Badge>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-4">
                Detecte ton niveau de burnout
                <span className="block text-purple-500">avant la crise</span>
              </h1>

              <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                50 questions basees sur les recherches en neuro-endocrinologie.
                Score de risque + detection de phase + protocole de sortie personnalise.
              </p>

              <div className="grid sm:grid-cols-3 gap-4 mb-8 text-left">
                {[
                  { icon: Clock, title: "5 minutes", desc: "Questionnaire rapide et precis" },
                  { icon: Target, title: "Score 0-100", desc: "Evaluation precise du risque" },
                  { icon: Shield, title: "Protocole 4 semaines", desc: "Plan de sortie personnalise" },
                ].map((item, i) => (
                  <Card key={i} className="border-purple-500/20">
                    <CardContent className="p-4 flex items-start gap-3">
                      <item.icon className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="max-w-md mx-auto text-left mb-6">
                <Label htmlFor="email-intro">Ton email</Label>
                <Input
                  id="email-intro"
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  On sauvegarde ta progression pour que tu puisses reprendre plus tard.
                </p>
              </div>

              <Button
                size="lg"
                className="gap-2 bg-purple-500 hover:bg-purple-600"
                onClick={() => setStep("questions")}
                disabled={!isEmailValid}
              >
                Commencer l'evaluation
                <ArrowRight className="h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {/* Questions */}
          {step === "questions" && currentSection && (
            <motion.div
              key={`section-${currentSectionIndex}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Progress */}
              <div className="mb-8">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    Section {currentSectionIndex + 1}/{BURNOUT_SECTIONS.length}
                  </span>
                  <span className="text-muted-foreground">
                    {answeredQuestions}/{totalQuestions} questions
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Section Header */}
              <Card className="mb-6 border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-transparent">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-purple-500/10">
                    <currentSection.icon className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{currentSection.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {currentSection.questions.length} questions
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Questions */}
              <div className="space-y-6">
                {currentSection.questions.map((question, qi) => (
                  <Card key={question.id}>
                    <CardContent className="p-4">
                      <p className="font-medium mb-4">
                        {qi + 1}. {question.text}
                      </p>
                      <RadioGroup
                        value={responses[question.id] || ""}
                        onValueChange={(value) => handleResponse(question.id, value)}
                        className="flex flex-wrap gap-2"
                      >
                        {RESPONSE_OPTIONS.map((option) => (
                          <div key={option.value} className="flex items-center">
                            <RadioGroupItem
                              value={option.value}
                              id={`${question.id}-${option.value}`}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={`${question.id}-${option.value}`}
                              className="px-4 py-2 rounded-full border cursor-pointer transition-colors peer-data-[state=checked]:bg-purple-500 peer-data-[state=checked]:text-white peer-data-[state=checked]:border-purple-500 hover:bg-muted"
                            >
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentSectionIndex === 0}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Precedent
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!isSectionComplete}
                  className="gap-2 bg-purple-500 hover:bg-purple-600"
                >
                  {currentSectionIndex === BURNOUT_SECTIONS.length - 1
                    ? "Terminer"
                    : "Suivant"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Email */}
          {step === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-lg mx-auto"
            >
              <Card className="border-purple-500/20">
                <CardContent className="p-8 text-center">
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-green-500/10 mb-6">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>

                  <h2 className="text-xl font-bold mb-2">Questionnaire termine</h2>
                  <p className="text-muted-foreground mb-6">
                    Entre ton email pour recevoir ton rapport complet et passer au paiement securise.
                  </p>

                  <div className="space-y-4">
                    <div className="text-left">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="ton@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-2"
                      />
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4">
                      <div className="text-3xl font-bold text-purple-500 mb-1">39€</div>
                      <p className="text-sm text-muted-foreground">Paiement unique</p>
                    </div>

                    <Button
                      size="lg"
                      className="w-full gap-2 bg-purple-500 hover:bg-purple-600"
                      onClick={handleSubmit}
                      disabled={!email || isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Redirection...
                        </>
                      ) : (
                        <>
                          <Brain className="h-5 w-5" />
                          Proceder au paiement - 39€
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Processing */}
          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-lg mx-auto text-center"
            >
              <Card>
                <CardContent className="p-8">
                  <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-purple-500/10 mb-6">
                    <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Analyse en cours...</h2>
                  <p className="text-muted-foreground">
                    Validation du paiement et generation du protocole personnalise.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Results */}
          {step === "results" && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Score Card */}
              <Card className={`border-2 ${getRiskColor(result.riskLevel)}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex h-28 w-28 items-center justify-center rounded-full bg-purple-500/20">
                      <div className="text-center">
                        <span className="text-4xl font-bold text-purple-500">
                          {result.score}
                        </span>
                        <span className="text-lg text-muted-foreground">/100</span>
                      </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <Badge className={`mb-2 ${getRiskColor(result.riskLevel)}`}>
                        Phase: {result.phase.charAt(0).toUpperCase() + result.phase.slice(1)}
                      </Badge>
                      <h2 className="text-xl font-bold mb-2">Score de Burnout</h2>
                      <p className="text-muted-foreground">{result.phaseDescription}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-purple-500" />
                    Analyse par categorie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.categoryScores.map((cat, i) => {
                      const percentage = (cat.score / cat.max) * 100;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{cat.category}</span>
                            <span className={percentage > 60 ? "text-red-500" : percentage > 40 ? "text-yellow-500" : "text-green-500"}>
                              {Math.round(percentage)}%
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                percentage > 60
                                  ? "bg-red-500"
                                  : percentage > 40
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Top Concerns */}
              <Card className="bg-amber-500/10 border-amber-500/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-600 mb-2">
                        Points d'attention prioritaires
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.topConcerns.map((concern, i) => (
                          <Badge key={i} variant="outline" className="border-amber-500/30">
                            {concern}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Protocol */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-500" />
                    Protocole de sortie 4 semaines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {result.protocol.map((week, i) => (
                      <div
                        key={i}
                        className="p-4 rounded bg-muted/50 border"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white text-sm font-bold">
                            {week.week}
                          </div>
                          <span className="font-semibold">{week.focus}</span>
                        </div>
                        <ul className="space-y-1">
                          {week.actions.map((action, j) => (
                            <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <CheckCircle2 className="h-3 w-3 text-purple-500 shrink-0 mt-0.5" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* CTA */}
              <Card className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border-purple-500/20">
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-bold mb-2">
                    Tu veux un accompagnement personnalise ?
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    Decouvre mes programmes de coaching pour sortir du burnout durablement.
                  </p>
                  <Link href="/offers/ultimate-scan">
                    <Button size="lg" className="gap-2 bg-purple-500 hover:bg-purple-600">
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
