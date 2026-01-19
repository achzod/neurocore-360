/**
 * APEXLABS - Peptides Engine Questionnaire Page
 * Questionnaire specialise pour recommandation de protocoles peptides
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Activity,
  Brain,
  Shield,
  CheckCircle2,
  Loader2,
  Clock,
  Target,
  FlaskConical,
  Zap,
  Heart
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type QuestionType = "text" | "textarea" | "number" | "select" | "multiselect";

interface QuestionOption {
  value: string;
  label: string;
}

interface PeptidesQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: QuestionOption[];
  placeholder?: string;
  helper?: string;
}

interface PeptidesSection {
  id: string;
  title: string;
  icon: React.ElementType;
  questions: PeptidesQuestion[];
}

const PEPTIDES_SECTIONS: PeptidesSection[] = [
  {
    id: "profil",
    title: "Profil & objectifs",
    icon: Target,
    questions: [
      { id: "prenom", text: "Prenom", type: "text", placeholder: "Ex: Achkan" },
      { id: "age", text: "Age", type: "number", placeholder: "Ex: 28" },
      {
        id: "sexe",
        text: "Sexe",
        type: "select",
        options: [
          { value: "homme", label: "Homme" },
          { value: "femme", label: "Femme" }
        ]
      },
      { id: "taille", text: "Taille (cm)", type: "number", placeholder: "Ex: 180" },
      { id: "poids", text: "Poids (kg)", type: "number", placeholder: "Ex: 78" },
      {
        id: "niveau_entrainement",
        text: "Niveau d'entrainement",
        type: "select",
        options: [
          { value: "debutant", label: "Debutant" },
          { value: "intermediaire", label: "Intermediaire" },
          { value: "avance", label: "Avance" },
          { value: "athlete", label: "Athlete" }
        ]
      },
      {
        id: "objectif_principal",
        text: "Objectif principal",
        type: "select",
        options: [
          { value: "prise_masse", label: "Prise de muscle" },
          { value: "recomposition", label: "Recomposition" },
          { value: "performance", label: "Performance" },
          { value: "perte_gras", label: "Perte de gras" },
          { value: "recuperation", label: "Recuperation" }
        ]
      },
      {
        id: "objectifs_secondaires",
        text: "Objectifs secondaires",
        type: "multiselect",
        options: [
          { value: "sommeil", label: "Sommeil" },
          { value: "focus", label: "Focus" },
          { value: "libido", label: "Libido" },
          { value: "energie", label: "Energie" },
          { value: "peau", label: "Peau/Collagene" },
          { value: "blessures", label: "Blessures" }
        ]
      }
    ]
  },
  {
    id: "sante",
    title: "Contexte sante",
    icon: Shield,
    questions: [
      {
        id: "antecedents",
        text: "Antecedents medicaux pertinents",
        type: "multiselect",
        options: [
          { value: "cardio", label: "Cardio" },
          { value: "thyroide", label: "Thyroide" },
          { value: "autoimmune", label: "Auto-immunite" },
          { value: "metabolique", label: "Metabolique" },
          { value: "anxiete", label: "Anxiete/Stress" },
          { value: "aucun", label: "Aucun" }
        ]
      },
      { id: "medicaments", text: "Medicaments actuels", type: "textarea", placeholder: "Ex: aucun / finasteride / metformine..." },
      { id: "supplements", text: "Supplements actuels", type: "textarea", placeholder: "Ex: creatine, omega-3, magnesium..." },
      {
        id: "sommeil_qualite",
        text: "Qualite du sommeil",
        type: "select",
        options: [
          { value: "moins5", label: "Moins de 5h" },
          { value: "5-6", label: "5-6h" },
          { value: "6-7", label: "6-7h" },
          { value: "7-8", label: "7-8h" },
          { value: "8+", label: "8h+" }
        ]
      },
      {
        id: "stress_niveau",
        text: "Niveau de stress",
        type: "select",
        options: [
          { value: "bas", label: "Bas" },
          { value: "moyen", label: "Moyen" },
          { value: "eleve", label: "Eleve" }
        ]
      },
      {
        id: "digestion",
        text: "Digestion",
        type: "select",
        options: [
          { value: "ok", label: "OK" },
          { value: "ballonnements", label: "Ballonnements" },
          { value: "douleurs", label: "Douleurs" },
          { value: "transit", label: "Transit irregulier" }
        ]
      },
      { id: "blessures", text: "Blessures ou douleurs chroniques", type: "textarea", placeholder: "Ex: tendon biceps, genou droit..." },
      { id: "allergies", text: "Allergies ou reactions connues", type: "textarea", placeholder: "Ex: latex, peptides X, aucun" }
    ]
  },
  {
    id: "performance",
    title: "Performance & composition",
    icon: Activity,
    questions: [
      {
        id: "frequence_entrainement",
        text: "Frequence d'entrainement",
        type: "select",
        options: [
          { value: "1-2", label: "1-2x / semaine" },
          { value: "3-4", label: "3-4x / semaine" },
          { value: "5-6", label: "5-6x / semaine" },
          { value: "7+", label: "7x+ / semaine" }
        ]
      },
      {
        id: "type_entrainement",
        text: "Type d'entrainement",
        type: "multiselect",
        options: [
          { value: "musculation", label: "Musculation" },
          { value: "crossfit", label: "Crossfit" },
          { value: "endurance", label: "Endurance" },
          { value: "combat", label: "Sports de combat" },
          { value: "collectif", label: "Sports collectifs" },
          { value: "autre", label: "Autre" }
        ]
      },
      {
        id: "recuperation",
        text: "Recuperation entre les seances",
        type: "select",
        options: [
          { value: "bonne", label: "Bonne" },
          { value: "moyenne", label: "Moyenne" },
          { value: "mauvaise", label: "Mauvaise" }
        ]
      },
      {
        id: "plateau",
        text: "Tu es en plateau depuis plus de 6 semaines",
        type: "select",
        options: [
          { value: "oui", label: "Oui" },
          { value: "non", label: "Non" }
        ]
      },
      {
        id: "masse_grasse",
        text: "Taux de masse grasse estime",
        type: "select",
        options: [
          { value: "<10", label: "<10%" },
          { value: "10-15", label: "10-15%" },
          { value: "15-20", label: "15-20%" },
          { value: "20-25", label: "20-25%" },
          { value: ">25", label: ">25%" }
        ]
      },
      {
        id: "douleurs_articulaires",
        text: "Douleurs articulaires",
        type: "select",
        options: [
          { value: "jamais", label: "Jamais" },
          { value: "parfois", label: "Parfois" },
          { value: "souvent", label: "Souvent" }
        ]
      },
      {
        id: "energie_journee",
        text: "Energie au cours de la journee",
        type: "select",
        options: [
          { value: "stable", label: "Stable" },
          { value: "chute", label: "Chute l'apres-midi" },
          { value: "fatigue", label: "Fatigue constante" }
        ]
      },
      {
        id: "cardio",
        text: "Cardio par semaine",
        type: "select",
        options: [
          { value: "0", label: "0" },
          { value: "1-2", label: "1-2 sessions" },
          { value: "3-4", label: "3-4 sessions" },
          { value: "5+", label: "5+ sessions" }
        ]
      }
    ]
  },
  {
    id: "peptides",
    title: "Objectifs peptides",
    icon: FlaskConical,
    questions: [
      {
        id: "objectifs_peptides",
        text: "Priorites peptides",
        type: "multiselect",
        options: [
          { value: "gh", label: "Axe GH/recuperation" },
          { value: "tendons", label: "Reparation tendons/ligaments" },
          { value: "sommeil", label: "Sommeil" },
          { value: "cognition", label: "Focus/cognition" },
          { value: "libido", label: "Libido/testosterone" },
          { value: "peau", label: "Peau/collagene" },
          { value: "perte_gras", label: "Perte de gras" },
          { value: "immunite", label: "Immunite" }
        ]
      },
      {
        id: "experience_peptides",
        text: "Experience avec les peptides",
        type: "select",
        options: [
          { value: "jamais", label: "Jamais" },
          { value: "occasionnel", label: "1-2 fois" },
          { value: "regulier", label: "Regulier" }
        ]
      },
      {
        id: "tolerance_injection",
        text: "Tolerance aux injectables",
        type: "select",
        options: [
          { value: "ok", label: "OK injectables" },
          { value: "oral", label: "Preferer oral/topique" },
          { value: "eviter", label: "A eviter" }
        ]
      },
      {
        id: "delai",
        text: "Delai attendu pour les resultats",
        type: "select",
        options: [
          { value: "4", label: "4 semaines" },
          { value: "8", label: "8 semaines" },
          { value: "12", label: "12+ semaines" }
        ]
      },
      {
        id: "budget",
        text: "Budget mensuel",
        type: "select",
        options: [
          { value: "<100", label: "<100€/mois" },
          { value: "100-200", label: "100-200€/mois" },
          { value: "200-400", label: "200-400€/mois" },
          { value: "400+", label: "400€+/mois" }
        ]
      },
      {
        id: "suivi",
        text: "Souhaites-tu un suivi personnalise ensuite",
        type: "select",
        options: [
          { value: "oui", label: "Oui" },
          { value: "non", label: "Non" }
        ]
      },
      {
        id: "peptides_precis",
        text: "Peptides deja testes (si oui, lesquels)",
        type: "textarea",
        placeholder: "Ex: BPC-157, TB-500, CJC-1295..."
      },
      {
        id: "effets_secondaires",
        text: "Effets secondaires deja observes",
        type: "textarea",
        placeholder: "Ex: retention d'eau, fatigue, aucun..."
      }
    ]
  },
  {
    id: "biomarqueurs",
    title: "Biomarqueurs",
    icon: Brain,
    questions: [
      {
        id: "bilans_dispo",
        text: "Bilans sanguins recents disponibles",
        type: "select",
        options: [
          { value: "oui", label: "Oui" },
          { value: "non", label: "Non" }
        ]
      },
      {
        id: "biomarqueurs_notes",
        text: "Valeurs clefs si tu les as (IGF-1, testo, TSH, HbA1c...)",
        type: "textarea",
        placeholder: "Ex: IGF-1 210 ng/mL, TSH 1.6, HbA1c 5.1..."
      },
      {
        id: "traitement_hormonal",
        text: "Traitement hormonal en cours",
        type: "select",
        options: [
          { value: "non", label: "Non" },
          { value: "trt", label: "TRT" },
          { value: "autre", label: "Autre" }
        ]
      },
      {
        id: "objectif_igf1",
        text: "Priorite IGF-1",
        type: "select",
        options: [
          { value: "augmenter", label: "Augmenter" },
          { value: "optimiser", label: "Optimiser" },
          { value: "stabiliser", label: "Stabiliser" }
        ]
      },
      {
        id: "suivi_medical",
        text: "Suivi medical regulier",
        type: "select",
        options: [
          { value: "oui", label: "Oui" },
          { value: "non", label: "Non" }
        ]
      }
    ]
  },
  {
    id: "attentes",
    title: "Contraintes & attentes",
    icon: Clock,
    questions: [
      {
        id: "timeline",
        text: "Deadline ou objectif specifique",
        type: "text",
        placeholder: "Ex: competition en juin, shooting photo..."
      },
      {
        id: "top_resultats",
        text: "Top 3 resultats attendus",
        type: "textarea",
        placeholder: "Ex: meilleure recuperation, sommeil profond, repartition graisse..."
      },
      {
        id: "contraintes",
        text: "Contraintes a prendre en compte",
        type: "textarea",
        placeholder: "Ex: budget limite, voyage, douleur injection..."
      },
      {
        id: "tolerance_risque",
        text: "Tolerance au risque",
        type: "select",
        options: [
          { value: "prudent", label: "Prudent" },
          { value: "modere", label: "Modere" },
          { value: "agressif", label: "Agressif" }
        ]
      },
      {
        id: "niveau_engagement",
        text: "Niveau d'engagement",
        type: "select",
        options: [
          { value: "minimal", label: "Minimum efficace" },
          { value: "optimise", label: "Optimisation complete" },
          { value: "agressif", label: "Approche agressive" }
        ]
      },
      {
        id: "notes_finales",
        text: "Infos importantes a ajouter",
        type: "textarea",
        placeholder: "Tout ce qui peut changer le plan..."
      }
    ]
  }
];

type Step = "intro" | "questions" | "email" | "processing";

type ResponseValue = string | string[];

export default function PeptidesEnginePage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("intro");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [email, setEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const totalSections = PEPTIDES_SECTIONS.length;
  const currentSection = PEPTIDES_SECTIONS[currentSectionIndex];
  const totalQuestions = useMemo(
    () => PEPTIDES_SECTIONS.reduce((acc, s) => acc + s.questions.length, 0),
    []
  );
  const answeredQuestions = Object.values(responses).filter((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value && value.toString().trim().length > 0);
  }).length;
  const progress = (answeredQuestions / totalQuestions) * 100;

  const isSectionComplete = currentSection?.questions.every((question) => {
    const value = responses[question.id];
    if (question.type === "multiselect") return Array.isArray(value) && value.length > 0;
    return typeof value === "string" && value.trim().length > 0;
  });

  const isEmailValid = email.includes("@");

  useEffect(() => {
    const storedEmail = localStorage.getItem("peptides_email");
    if (!storedEmail) return;

    const loadProgress = async () => {
      try {
        const response = await fetch(`/api/peptides-engine/progress/${encodeURIComponent(storedEmail)}`);
        const data = await response.json();
        if (data.success && data.progress) {
          setEmail(storedEmail);
          setResponses(data.progress.responses || {});
          setCurrentSectionIndex(Number(data.progress.currentSection) || 0);
          setStep("questions");
          return;
        }
      } catch (err) {
        console.error("Peptides progress load failed:", err);
      }

      const storedResponses = localStorage.getItem("peptides_responses");
      const storedSection = localStorage.getItem("peptides_section");
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
        description: "Tu peux reprendre quand tu veux pour finaliser ton protocole.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (success === "true" && sessionId) {
      setStep("processing");
      setIsProcessing(true);
      fetch("/api/peptides-engine/confirm-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.id) {
            localStorage.removeItem("peptides_email");
            localStorage.removeItem("peptides_responses");
            localStorage.removeItem("peptides_section");
            window.history.replaceState({}, "", window.location.pathname);
            setLocation(`/peptides/${data.id}`);
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

  const handleResponse = (questionId: string, value: ResponseValue) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleMulti = (questionId: string, value: string) => {
    setResponses((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [questionId]: next };
    });
  };

  const saveProgress = async (nextSection?: number, nextResponses?: Record<string, ResponseValue>) => {
    if (!email || !email.includes("@")) return;
    try {
      await fetch("/api/peptides-engine/save-progress", {
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
      console.error("Peptides progress save failed:", err);
    }
  };

  const handleNext = () => {
    if (currentSectionIndex < PEPTIDES_SECTIONS.length - 1) {
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
    localStorage.setItem("peptides_email", email);
    localStorage.setItem("peptides_responses", JSON.stringify(responses));
    localStorage.setItem("peptides_section", String(currentSectionIndex));
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
        description: "Entre ton email pour recevoir ton protocole.",
        variant: "destructive",
      });
      return;
    }

    setStep("processing");
    setIsProcessing(true);

    try {
      await saveProgress(currentSectionIndex, responses);
      const response = await fetch("/api/peptides-engine/create-checkout-session", {
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

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {/* Intro */}
          {step === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-3xl mx-auto"
            >
              <Badge className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/30">
                Peptides Engine • 99€
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Cartographie peptides precise, protocole actionnable.
              </h1>
              <p className="text-lg text-gray-300 mb-8">
                Tu completes un questionnaire pointu. Je te livre un protocole peptides sur-mesure,
                des dosages et un plan d'execution clair. Bonus: ebook offert.
              </p>

              <div className="grid md:grid-cols-3 gap-4 mb-10">
                {[
                  { icon: FlaskConical, title: "Protocoles precis", desc: "Peptides cibles, dosages, timing" },
                  { icon: Zap, title: "Stack optimise", desc: "Synergies supplements + lifestyle" },
                  { icon: Heart, title: "Sources claires", desc: "Ou acheter + check qualite" },
                ].map((item) => (
                  <Card key={item.title} className="bg-white/5 border-white/10">
                    <CardContent className="p-5 text-left">
                      <item.icon className="h-6 w-6 text-amber-400 mb-3" />
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-400">{item.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button
                size="lg"
                className="gap-2 bg-amber-500 hover:bg-amber-600"
                onClick={() => setStep("questions")}
              >
                Commencer le questionnaire
                <ArrowRight className="h-5 w-5" />
              </Button>
              <p className="text-sm text-gray-400 mt-4">
                Progression sauvegardee automatiquement. Tu peux reprendre plus tard.
              </p>
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
              <div className="mb-8">
                <div className="flex justify-between text-sm mb-2 text-gray-400">
                  <span>
                    Section {currentSectionIndex + 1}/{PEPTIDES_SECTIONS.length}
                  </span>
                  <span>
                    {answeredQuestions}/{totalQuestions} questions
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <Card className="mb-6 border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-transparent">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-amber-500/10">
                    <currentSection.icon className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{currentSection.title}</h2>
                    <p className="text-sm text-gray-400">{currentSection.questions.length} questions</p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                {currentSection.questions.map((question, qi) => (
                  <Card key={question.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-4">
                      <p className="font-medium mb-3">
                        {qi + 1}. {question.text}
                      </p>
                      {question.helper && (
                        <p className="text-xs text-gray-400 mb-3">{question.helper}</p>
                      )}

                      {question.type === "select" && question.options && (
                        <RadioGroup
                          value={typeof responses[question.id] === "string" ? responses[question.id] : ""}
                          onValueChange={(value) => handleResponse(question.id, value)}
                          className="flex flex-wrap gap-2"
                        >
                          {question.options.map((option) => (
                            <div key={option.value} className="flex items-center">
                              <RadioGroupItem
                                value={option.value}
                                id={`${question.id}-${option.value}`}
                                className="peer sr-only"
                              />
                              <Label
                                htmlFor={`${question.id}-${option.value}`}
                                className="px-4 py-2 rounded-full border border-white/10 cursor-pointer transition-colors peer-data-[state=checked]:bg-amber-500 peer-data-[state=checked]:text-black peer-data-[state=checked]:border-amber-500 hover:bg-white/10"
                              >
                                {option.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}

                      {question.type === "multiselect" && question.options && (
                        <div className="grid sm:grid-cols-2 gap-3">
                          {question.options.map((option) => {
                            const selected = Array.isArray(responses[question.id])
                              ? responses[question.id].includes(option.value)
                              : false;
                            return (
                              <label
                                key={option.value}
                                className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                                  selected ? "border-amber-500 bg-amber-500/10" : "border-white/10"
                                }`}
                              >
                                <Checkbox
                                  checked={selected}
                                  onCheckedChange={() => toggleMulti(question.id, option.value)}
                                />
                                <span className="text-sm">{option.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {question.type === "text" && (
                        <Input
                          value={typeof responses[question.id] === "string" ? responses[question.id] : ""}
                          onChange={(e) => handleResponse(question.id, e.target.value)}
                          placeholder={question.placeholder}
                          className="bg-black/30 border-white/10"
                        />
                      )}

                      {question.type === "number" && (
                        <Input
                          type="number"
                          value={typeof responses[question.id] === "string" ? responses[question.id] : ""}
                          onChange={(e) => handleResponse(question.id, e.target.value)}
                          placeholder={question.placeholder}
                          className="bg-black/30 border-white/10"
                        />
                      )}

                      {question.type === "textarea" && (
                        <Textarea
                          value={typeof responses[question.id] === "string" ? responses[question.id] : ""}
                          onChange={(e) => handleResponse(question.id, e.target.value)}
                          placeholder={question.placeholder}
                          className="bg-black/30 border-white/10 min-h-[110px]"
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentSectionIndex === 0}
                  className="gap-2 border-white/20 text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Precedent
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!isSectionComplete}
                  className="gap-2 bg-amber-500 hover:bg-amber-600"
                >
                  {currentSectionIndex === PEPTIDES_SECTIONS.length - 1 ? "Terminer" : "Suivant"}
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
              <Card className="border-amber-500/20 bg-white/5">
                <CardContent className="p-8 text-center">
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-amber-500/10 mb-6">
                    <CheckCircle2 className="h-8 w-8 text-amber-400" />
                  </div>

                  <h2 className="text-xl font-bold mb-2">Questionnaire termine</h2>
                  <p className="text-gray-400 mb-6">
                    Entre ton email pour recevoir ton protocole et l'ebook offert.
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
                        className="mt-2 bg-black/30 border-white/10"
                      />
                    </div>

                    <div className="bg-black/30 rounded-lg p-4 border border-white/10">
                      <div className="text-3xl font-bold text-amber-400 mb-1">99€</div>
                      <p className="text-sm text-gray-400">Paiement unique • Ebook offert inclus</p>
                    </div>

                    <Button
                      size="lg"
                      className="w-full gap-2 bg-amber-500 hover:bg-amber-600"
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
                          <FlaskConical className="h-5 w-5" />
                          Proceder au paiement - 99€
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-gray-500">
                      Tu recevras aussi l'ebook sur les peptides des que le paiement est valide.
                    </p>
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
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8">
                  <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-amber-500/10 mb-6">
                    <Loader2 className="h-10 w-10 text-amber-400 animate-spin" />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Analyse en cours...</h2>
                  <p className="text-gray-400">
                    Validation du paiement et generation du protocole personnalise.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Besoin d'aide ? Ecris-moi directement sur <Link href="/contact" className="text-amber-400">le formulaire</Link>.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
