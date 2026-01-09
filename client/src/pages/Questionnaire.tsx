import { useState, useEffect, Component, ErrorInfo, ReactNode } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Error Boundary pour debug
class QuestionnaireErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Questionnaire] Error caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 max-w-md">
            <h2 className="text-red-500 font-bold text-lg mb-2">Erreur Questionnaire</h2>
            <p className="text-sm text-red-300 mb-4">{this.state.error?.message}</p>
            <pre className="text-xs text-red-200 overflow-auto max-h-40 bg-black/50 p-2 rounded">
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded"
            >
              Reset et Recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/Header";
import { QUESTIONNAIRE_SECTIONS, type Question } from "@shared/schema";
import { getQuestionsForSection, getSectionProgress } from "@/lib/questionnaire-data";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Save,
  User,
  Scale,
  Zap,
  Apple,
  Beaker,
  Dumbbell,
  Moon,
  Heart,
  TestTube,
  Activity,
  Coffee,
  Bone,
  Brain,
  HeartHandshake,
  Camera,
  Upload,
  AlertCircle,
  X,
  Clock,
  Watch,
  Smartphone,
  Link2,
  CheckCircle2,
  Timer,
  Thermometer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const iconMap: Record<string, React.ElementType> = {
  User,
  Scale,
  Zap,
  Apple,
  Beaker,
  Dumbbell,
  Moon,
  Heart,
  TestTube,
  Activity,
  Coffee,
  Bone,
  Brain,
  HeartHandshake,
  Camera,
};

function QuestionField({
  question,
  value,
  onChange,
  onError,
}: {
  question: Question;
  value: unknown;
  onChange: (value: unknown) => void;
  onError?: (message: string) => void;
}) {
  switch (question.type) {
    case "text":
      return (
        <Input
          type="text"
          placeholder={question.placeholder}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          data-testid={`input-${question.id}`}
        />
      );

    case "number":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder={question.placeholder}
            min={question.min}
            max={question.max}
            value={(value as number) || ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
            className="max-w-32"
            data-testid={`input-${question.id}`}
          />
          {question.unit && (
            <span className="text-sm text-muted-foreground">{question.unit}</span>
          )}
        </div>
      );

    case "textarea":
      return (
        <Textarea
          placeholder={question.placeholder}
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-24"
          data-testid={`textarea-${question.id}`}
        />
      );

    case "select":
      return (
        <Select value={(value as string) || ""} onValueChange={onChange}>
          <SelectTrigger className="max-w-md" data-testid={`select-${question.id}`}>
            <SelectValue placeholder="Sélectionner..." />
          </SelectTrigger>
          <SelectContent>
            {question.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "radio":
      return (
        <RadioGroup
          value={(value as string) || ""}
          onValueChange={onChange}
          className="flex flex-wrap gap-4"
          data-testid={`radio-${question.id}`}
        >
          {question.options?.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <RadioGroupItem value={option.value} id={`${question.id}-${option.value}`} />
              <Label htmlFor={`${question.id}-${option.value}`} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );

    case "checkbox":
      const selectedValues = (value as string[]) || [];
      return (
        <div className="flex flex-wrap gap-4" data-testid={`checkbox-${question.id}`}>
          {question.options?.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <Checkbox
                id={`${question.id}-${option.value}`}
                checked={selectedValues.includes(option.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onChange([...selectedValues, option.value]);
                  } else {
                    onChange(selectedValues.filter((v) => v !== option.value));
                  }
                }}
              />
              <Label htmlFor={`${question.id}-${option.value}`} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      );

    case "scale":
      const scaleValue = (value as number) ?? 5;
      return (
        <div className="space-y-4">
          <Slider
            value={[scaleValue]}
            onValueChange={([v]) => onChange(v)}
            min={question.min ?? 0}
            max={question.max ?? 10}
            step={1}
            className="max-w-md"
            data-testid={`slider-${question.id}`}
          />
          <div className="flex justify-between text-sm text-muted-foreground max-w-md">
            <span>{question.min ?? 0}</span>
            <Badge variant="secondary">{scaleValue}</Badge>
            <span>{question.max ?? 10}</span>
          </div>
        </div>
      );

    case "photo":
      const photoUrl = (value as string) || "";
      const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          if (file.size > 10 * 1024 * 1024) {
            onError?.("Fichier trop volumineux (max 10 Mo). Compresse ton image ou prends une photo de moindre qualite.");
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            onChange(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
      };
      return (
        <div className="space-y-4">
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              photoUrl ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"
            }`}
          >
            {photoUrl ? (
              <div className="space-y-4">
                <img
                  src={photoUrl}
                  alt={question.label}
                  className="mx-auto max-h-64 rounded-md object-contain"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onChange("")}
                  data-testid={`button-remove-${question.id}`}
                >
                  <X className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid={`input-${question.id}`}
                />
                <div className="space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Clique pour uploader</p>
                    <p className="text-sm text-muted-foreground">JPG, PNG (max 10 Mo)</p>
                  </div>
                </div>
              </label>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
}

const PHOTO_FIELDS = ["photo-front", "photo-side", "photo-back"];

function QuestionnaireContent() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [photoData, setPhotoData] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  // Lire le plan depuis l'URL (premium = Anabolic Bioscan, pro = Ultimate Scan)
  const [selectedPlan] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("plan") || "premium"; // Default to premium (pas de photos)
  });

  // Filtrer les sections : analyse-posturale (photos) uniquement pour plan=pro (Ultimate Scan)
  const filteredSections = selectedPlan === "pro"
    ? QUESTIONNAIRE_SECTIONS
    : QUESTIONNAIRE_SECTIONS.filter(s => s.id !== "analyse-posturale");

  // Bounds check pour éviter undefined
  const safeIndex = Math.min(Math.max(0, currentSectionIndex), filteredSections.length - 1);
  const currentSection = filteredSections[safeIndex];
  const userSex = responses["sexe"] as string | undefined;
  const [sexConfirmed, setSexConfirmed] = useState(false);
  const [prenomConfirmed, setPrenomConfirmed] = useState(false);
  const [wearablesSyncShown, setWearablesSyncShown] = useState(false);
  const [terraConnecting, setTerraConnecting] = useState(false);
  const [terraConnected, setTerraConnected] = useState(false);
  const [terraSkippedQuestions, setTerraSkippedQuestions] = useState<string[]>([]);
  const sectionQuestions = currentSection ? getQuestionsForSection(currentSection.id, userSex) : [];
  const IconComponent = currentSection ? (iconMap[currentSection.icon] || User) : User;

  const totalProgress = Math.round(((currentSectionIndex + 1) / filteredSections.length) * 100);

  // Charger la progression depuis la DB
  const loadProgressFromDB = async (userEmail: string) => {
    try {
      const res = await fetch(`/api/questionnaire/progress/${encodeURIComponent(userEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.responses && Object.keys(data.responses).length > 0) {
          console.log("[Questionnaire] Loaded progress from DB:", Object.keys(data.responses).length, "responses");
          setResponses(prev => ({ ...prev, ...data.responses }));
          if (data.currentSection !== undefined) {
            setCurrentSectionIndex(data.currentSection);
          }
          if (data.responses["sexe"]) setSexConfirmed(true);
          if (data.responses["prenom"]) setPrenomConfirmed(true);
          return true;
        }
      }
    } catch (err) {
      console.error("[Questionnaire] Error loading from DB:", err);
    }
    return false;
  };

  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("neurocore_email");
      const savedResponses = localStorage.getItem("neurocore_responses");
      const savedSection = localStorage.getItem("neurocore_section");
      const savedPhotos = sessionStorage.getItem("neurocore_photos");

      if (savedEmail) {
        setEmail(savedEmail);
        setEmailSubmitted(true);
        loadProgressFromDB(savedEmail);
      }

      let parsedResponses: Record<string, unknown> = {};
      let parsedPhotos: Record<string, string> = {};

      try {
        parsedResponses = savedResponses ? JSON.parse(savedResponses) : {};
      } catch {
        console.error("[Questionnaire] Invalid responses, clearing");
        localStorage.removeItem("neurocore_responses");
      }

      try {
        parsedPhotos = savedPhotos ? JSON.parse(savedPhotos) : {};
      } catch {
        console.error("[Questionnaire] Invalid photos, clearing");
        sessionStorage.removeItem("neurocore_photos");
      }

      if (Object.keys(parsedPhotos).length > 0) {
        setPhotoData(parsedPhotos);
      }

      if (Object.keys(parsedResponses).length > 0 || Object.keys(parsedPhotos).length > 0) {
        setResponses({ ...parsedResponses, ...parsedPhotos });
      }

      if (savedSection) {
        const sectionNum = Number(savedSection);
        // Valider que l'index est dans les limites
        if (!isNaN(sectionNum) && sectionNum >= 0 && sectionNum < filteredSections.length) {
          setCurrentSectionIndex(sectionNum);
        } else {
          // Index invalide, reset à 0
          localStorage.removeItem("neurocore_section");
        }
      }

      if (parsedResponses["sexe"]) {
        setSexConfirmed(true);
      }
      if (parsedResponses["prenom"]) {
        setPrenomConfirmed(true);
      }

      // Check URL params for Terra callback
      const urlParams = new URLSearchParams(window.location.search);
      const terraSuccess = urlParams.get("terra_success");
      const terraError = urlParams.get("terra_error");

      // Clean URL params after reading
      if (terraSuccess || terraError) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, "", cleanUrl);
      }

      // Handle Terra error (SDK provider selected or connection failed)
      if (terraError === "true") {
        setWearablesSyncShown(true);
        toast({
          title: "Connexion non finalisee",
          description: "Si tu as choisi Samsung Health ou Huawei, installe l'app Terra Avengers sur ton telephone pour synchroniser.",
          variant: "destructive",
          duration: 10000,
        });
      }

      // Check if returning from Terra widget
      const wasConnecting = sessionStorage.getItem("terraConnecting");
      if (wasConnecting === "true" || terraSuccess === "true") {
        sessionStorage.removeItem("terraConnecting");
        setWearablesSyncShown(true);

        const emailToCheck = savedEmail || localStorage.getItem("neurocore_email");
        if (emailToCheck) {
          // Fetch mapped wearable answers
          fetch(`/api/terra/answers/${encodeURIComponent(emailToCheck)}`)
            .then(res => res.json())
            .then(data => {
              if (data.success && data.hasData) {
                setTerraConnected(true);
                // Pre-fill responses with wearable data
                if (data.answers && Object.keys(data.answers).length > 0) {
                  setResponses(prev => ({ ...prev, ...data.answers }));
                  console.log("[Terra] Pre-filled", Object.keys(data.answers).length, "answers from wearable");
                }
                // Store skipped questions
                if (data.skippedQuestions && data.skippedQuestions.length > 0) {
                  setTerraSkippedQuestions(data.skippedQuestions);
                  console.log("[Terra] Will skip", data.skippedQuestions.length, "questions");
                }
                toast({
                  title: "Wearable synchronise !",
                  description: `${Object.keys(data.answers || {}).length} reponses pre-remplies automatiquement.`,
                });
              } else if (terraSuccess === "true") {
                // User connected but no data yet - might be SDK provider
                toast({
                  title: "Connexion en cours...",
                  description: "Si tu utilises Samsung Health ou Apple Health, ouvre l'app Terra Avengers pour finaliser la sync.",
                  duration: 8000,
                });
              }
            })
            .catch(err => console.error("[Terra] Sync check failed:", err));
        }
      }
    } catch (e) {
      console.error("[Questionnaire] Init error:", e);
    }
  }, []);

  useEffect(() => {
    if (emailSubmitted) {
      localStorage.setItem("neurocore_email", email);
      const responsesToSave = { ...responses };
      PHOTO_FIELDS.forEach((f) => delete responsesToSave[f]);
      localStorage.setItem("neurocore_responses", JSON.stringify(responsesToSave));
      localStorage.setItem("neurocore_section", String(currentSectionIndex));
    }
  }, [email, responses, currentSectionIndex, emailSubmitted]);

  const saveProgressMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/questionnaire/save-progress", {
        email,
        currentSection: currentSectionIndex,
        responses,
      });
    },
    onSuccess: () => {
      // Silent save - no toast to avoid interrupting the user
    },
  });

  // Auto-save every 15 seconds if email is submitted
  useEffect(() => {
    if (!emailSubmitted || !email) return;

    const autoSaveInterval = setInterval(() => {
      if (Object.keys(responses).length > 0) {
        saveProgressMutation.mutate();
      }
    }, 15000); // Reduced from 30s to 15s for better reliability

    return () => clearInterval(autoSaveInterval);
  }, [emailSubmitted, email]);

  // Save on section change
  useEffect(() => {
    if (emailSubmitted && email && Object.keys(responses).length > 0) {
      saveProgressMutation.mutate();
    }
  }, [currentSectionIndex]);

  // Save when responses change (debounced 3 seconds after last change)
  useEffect(() => {
    if (!emailSubmitted || !email || Object.keys(responses).length === 0) return;

    const debounceTimer = setTimeout(() => {
      saveProgressMutation.mutate();
    }, 3000); // Save 3 seconds after last response change

    return () => clearTimeout(debounceTimer);
  }, [responses]);

  // Motivational messages based on progress
  const getMotivationalMessage = (): { title: string; message: string } | null => {
    if (totalProgress >= 75 && totalProgress < 80) {
      return {
        title: "Tu y es presque !",
        message: "Plus que quelques questions et tu auras accès à ton analyse personnalisée complète."
      };
    }
    if (totalProgress >= 50 && totalProgress < 55) {
      return {
        title: "Mi-parcours atteint !",
        message: "Tu avances super bien. Ces infos vont me permettre de créer un audit vraiment sur-mesure."
      };
    }
    if (totalProgress >= 25 && totalProgress < 30) {
      return {
        title: "Excellent départ !",
        message: "Continue comme ça. Chaque réponse compte pour ton analyse."
      };
    }
    return null;
  };

  // Time estimate
  const getTimeEstimate = (): string => {
    const remainingSections = filteredSections.length - currentSectionIndex - 1;
    const minutesPerSection = 1.5; // Average
    const remainingMinutes = Math.ceil(remainingSections * minutesPerSection);
    if (remainingMinutes <= 1) return "Moins d'1 min";
    if (remainingMinutes <= 5) return `~${remainingMinutes} min`;
    return `~${remainingMinutes} min`;
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      setEmailSubmitted(true);
      localStorage.setItem("neurocore_email", email);
    }
  };

  const handleResponseChange = (questionId: string, value: unknown) => {
    if (PHOTO_FIELDS.includes(questionId)) {
      const newPhotoData = { ...photoData, [questionId]: value as string };
      setPhotoData(newPhotoData);
      sessionStorage.setItem("neurocore_photos", JSON.stringify(newPhotoData));
    }
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    // Si on est dans la section 0 et qu'on n'a pas encore confirmé le prénom, ne pas avancer
    if (currentSectionIndex === 0 && sexConfirmed && !prenomConfirmed) {
      return;
    }

    // Vérifier les photos UNIQUEMENT pour Ultimate Scan (plan=pro)
    // La section analyse-posturale n'existe pas pour premium, donc on skip la validation
    const isLastSection = currentSectionIndex === filteredSections.length - 1;
    if (isLastSection && selectedPlan === "pro") {
      const missingPhotos = PHOTO_FIELDS.filter(field => !photoData[field]);
      if (missingPhotos.length > 0) {
        toast({
          title: "Photos obligatoires",
          description: `Il manque ${missingPhotos.length} photo(s). Les 3 photos (face, profil, dos) sont necessaires pour ton analyse posturale.`,
          variant: "destructive",
        });
        return;
      }
    }

    if (currentSectionIndex < filteredSections.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const responsesToSave = { ...responses };
      PHOTO_FIELDS.forEach((f) => delete responsesToSave[f]);
      localStorage.setItem("neurocore_responses", JSON.stringify(responsesToSave));
      sessionStorage.setItem("neurocore_photos", JSON.stringify(photoData));
      navigate("/audit-complet/checkout");
    }
  };

  const handlePrevious = () => {
    // Si on est dans la section prénom, revenir au sexe
    if (currentSectionIndex === 0 && prenomConfirmed) {
      setPrenomConfirmed(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // Si on est dans la section sexe, on ne peut pas revenir en arrière
    if (currentSectionIndex === 0 && sexConfirmed && !prenomConfirmed) {
      setSexConfirmed(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // Sinon, section précédente normale
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleRestart = () => {
    localStorage.removeItem("neurocore_email");
    localStorage.removeItem("neurocore_responses");
    localStorage.removeItem("neurocore_section");
    sessionStorage.removeItem("neurocore_photos");
    setEmail("");
    setEmailSubmitted(false);
    setResponses({});
    setPhotoData({});
    setCurrentSectionIndex(0);
    setSexConfirmed(false);
    setPrenomConfirmed(false);
    window.location.reload();
  };

  if (!emailSubmitted) {
    return (
      <div className="min-h-screen bg-[#050505]">
        <Header />
        <div className="mx-auto max-w-xl px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-sm bg-primary/10">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Commençons ton audit</CardTitle>
                <p className="mt-2 text-muted-foreground">
                  Entre ton email pour sauvegarder ta progression et recevoir tes résultats.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Adresse email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="ton@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="input-email"
                    />
                  </div>
                  <Button type="submit" className="w-full" data-testid="button-start-questionnaire">
                    Commencer le questionnaire
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Tes données restent confidentielles et ne seront jamais partagées.
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505]">
      <Header />

      <div className="sticky top-16 z-40 border-b border-neutral-800 bg-[#050505]/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium" data-testid="text-current-section">
                  Section {currentSectionIndex + 1}/{filteredSections.length}
                </p>
                <p className="text-xs text-muted-foreground">{currentSection.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* Time estimate */}
              <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{getTimeEstimate()} restantes</span>
              </div>
              <div className="hidden sm:block">
                <Progress value={totalProgress} className="w-32" />
              </div>
              <Badge variant="secondary">{totalProgress}%</Badge>
              <button
                onClick={() => {
                  saveProgressMutation.mutate();
                  toast({
                    title: "Sauvegardé !",
                    description: "Ta progression est enregistrée.",
                  });
                }}
                disabled={saveProgressMutation.isPending}
                data-testid="button-save-progress"
                className="px-4 py-2 text-sm rounded-sm bg-white text-black hover:bg-[#FCDD00] transition-colors disabled:opacity-50"
              >
                <Save className="mr-2 h-4 w-4 inline" />
                {saveProgressMutation.isPending ? "..." : "Sauvegarder"}
              </button>
              <button
                onClick={handleRestart}
                data-testid="button-restart"
                className="px-4 py-2 text-sm rounded-sm bg-black border border-neutral-800 text-white hover:border-[#FCDD00]/30 transition-colors"
              >
                <X className="mr-2 h-4 w-4 inline" />
                Recommencer
              </button>
            </div>
          </div>

          {/* Motivational message */}
          {getMotivationalMessage() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2"
            >
              <p className="text-sm font-medium text-primary">{getMotivationalMessage()?.title}</p>
              <p className="text-xs text-primary/80">{getMotivationalMessage()?.message}</p>
            </motion.div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8 flex flex-wrap gap-2">
          {filteredSections.map((section, index) => {
            const SectionIcon = iconMap[section.icon] || User;
            const isActive = index === currentSectionIndex;
            const isComplete = index < currentSectionIndex;

            return (
              <button
                key={section.id}
                onClick={() => setCurrentSectionIndex(index)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isComplete
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
                title={section.title}
                data-testid={`section-nav-${section.id}`}
              >
                {isComplete ? <Check className="h-4 w-4" /> : <SectionIcon className="h-4 w-4" />}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSection.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <IconComponent className="h-6 w-6 text-primary" />
                  {currentSection.title}
                </CardTitle>
                <p className="text-muted-foreground">{currentSection.description}</p>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Message d'importance pour la section Analyse Posturale */}
                {currentSection.id === "analyse-posturale" && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="space-y-2">
                        <p className="font-semibold text-amber-700 dark:text-amber-400">
                          Ces photos sont ESSENTIELLES pour ton analyse
                        </p>
                        <p className="text-sm text-amber-700/90 dark:text-amber-400/90">
                          Sans ces 3 photos, je ne pourrai pas realiser ton analyse posturale complete. 
                          C'est l'un des piliers de l'audit : je detecte les desequilibres musculaires, 
                          les compensations, et les sources potentielles de douleurs ou contre-performances.
                        </p>
                        <div className="text-sm text-amber-700/80 dark:text-amber-400/80 space-y-1">
                          <p className="font-medium">Instructions pour de bonnes photos :</p>
                          <ul className="list-disc list-inside space-y-0.5 text-xs">
                            <li>Vetements moulants ou sous-vetements (pour voir la posture)</li>
                            <li>Position naturelle, debout, bras le long du corps</li>
                            <li>Bon eclairage, fond neutre</li>
                            <li>Corps entier visible (tete aux pieds)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Afficher la question sexe si pas encore confirmé */}
                {currentSectionIndex === 0 && !sexConfirmed ? (
                  <motion.div
                    key="sexe-question"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Label className="text-base font-medium">
                          Tu es ?
                          <span className="ml-1 text-destructive">*</span>
                        </Label>
                      </div>
                      <QuestionField
                        question={sectionQuestions.find(q => q.id === "sexe")!}
                        value={responses["sexe"]}
                        onChange={(value) => handleResponseChange("sexe", value)}
                        onError={(msg) => toast({ title: "Erreur", description: msg, variant: "destructive" })}
                      />
                    </div>
                    {userSex && userSex !== "" && (
                      <button
                        onClick={() => setSexConfirmed(true)}
                        className="w-full px-6 py-3 rounded-sm bg-white text-black hover:bg-[#FCDD00] transition-colors"
                        data-testid="button-confirm-sex"
                      >
                        Continuer
                        <ChevronRight className="ml-2 h-4 w-4 inline" />
                      </button>
                    )}
                  </motion.div>
                ) : currentSectionIndex === 0 && sexConfirmed && !prenomConfirmed ? (
                  <motion.div
                    key="prenom-question"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Label className="text-base font-medium">
                          Quel est ton prénom ?
                          <span className="ml-1 text-destructive">*</span>
                        </Label>
                      </div>
                      <QuestionField
                        question={sectionQuestions.find(q => q.id === "prenom")!}
                        value={responses["prenom"]}
                        onChange={(value) => handleResponseChange("prenom", value)}
                        onError={(msg) => toast({ title: "Erreur", description: msg, variant: "destructive" })}
                      />
                    </div>
                    {String(responses["prenom"] ?? "").trim().length > 0 && (
                      <button
                        onClick={() => setPrenomConfirmed(true)}
                        className="w-full px-6 py-3 rounded-sm bg-white text-black hover:bg-[#FCDD00] transition-colors"
                        data-testid="button-confirm-prenom"
                      >
                        Continuer
                        <ChevronRight className="ml-2 h-4 w-4 inline" />
                      </button>
                    )}
                  </motion.div>
                ) : currentSectionIndex === 0 && prenomConfirmed && !wearablesSyncShown ? (
                  /* WEARABLES SYNC SCREEN */
                  <motion.div
                    key="wearables-sync"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-sm bg-primary/10 flex items-center justify-center">
                        <Watch className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">
                          Synchronise tes données santé
                        </h3>
                        <p className="text-muted-foreground mt-2">
                          Connecte ton wearable pour un audit plus précis et un questionnaire plus court.
                        </p>
                      </div>
                    </div>

                    {/* Wearables Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { name: "Apple", Icon: Apple },
                        { name: "Oura", Icon: Activity },
                        { name: "Whoop", Icon: Watch },
                        { name: "Garmin", Icon: Activity },
                        { name: "Fitbit", Icon: Heart },
                        { name: "Samsung", Icon: Smartphone },
                        { name: "Polar", Icon: Heart },
                        { name: "Autre", Icon: Link2 },
                      ].map((w, i) => (
                        <div
                          key={i}
                          className="flex flex-col items-center p-3 rounded bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                        >
                          <w.Icon className="w-5 h-5 mb-1 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{w.name}</span>
                        </div>
                      ))}
                    </div>

                    {/* Data types */}
                    <div className="bg-muted/30 rounded p-4 border border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-3 text-center">
                        DONNÉES AUTO-SYNCHRONISÉES
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { Icon: Activity, label: "HRV" },
                          { Icon: Moon, label: "Sommeil" },
                          { Icon: Heart, label: "FC repos" },
                          { Icon: Zap, label: "Activité" },
                          { Icon: Timer, label: "SpO2" },
                          { Icon: Thermometer, label: "Temp." },
                        ].map((d, i) => (
                          <div key={i} className="text-center">
                            <d.Icon className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-[10px] text-muted-foreground">{d.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="space-y-2">
                      {[
                        { icon: CheckCircle2, text: "Data exacte (pas d'estimation)" },
                        { icon: Clock, text: "Questionnaire 2x plus rapide" },
                        { icon: Brain, text: "Analyse plus précise" },
                      ].map((b, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <b.icon className="w-4 h-4 text-primary" />
                          <span>{b.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* SDK Provider Note */}
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <p className="text-xs text-amber-200">
                        <strong>Samsung Health / Apple Health :</strong> Ces apps nécessitent l'installation de <strong>Terra Avengers</strong> (gratuit) sur ton téléphone pour synchroniser les données.
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      <Button
                        onClick={async () => {
                          setTerraConnecting(true);
                          try {
                            const res = await apiRequest("POST", "/api/terra/connect", {
                              userId: email || `guest-${Date.now()}`,
                            });
                            const data = await res.json();
                            if (data.widgetUrl) {
                              // Stocker l'état avant de quitter la page
                              sessionStorage.setItem("terraConnecting", "true");
                              sessionStorage.setItem("questionnaireProgress", JSON.stringify(responses));
                              // Rediriger vers Terra (fonctionne sur mobile)
                              window.location.href = data.widgetUrl;
                            } else {
                              throw new Error(data.error || "Widget URL non reçue");
                            }
                          } catch (error: any) {
                            setTerraConnecting(false);
                            console.error("[Terra] Connection error:", error);
                            const errorMsg = error?.message || error?.error || "Erreur de connexion";
                            toast({
                              title: "Erreur de connexion",
                              description: `${errorMsg}. Réessaie ou passe cette étape.`,
                              variant: "destructive",
                            });
                          }
                        }}
                        className="w-full"
                        disabled={terraConnecting}
                      >
                        {terraConnecting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                            Connexion...
                          </>
                        ) : terraConnected ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Connecté ! Continuer
                          </>
                        ) : (
                          <>
                            <Link2 className="w-4 h-4 mr-2" />
                            Connecter mon wearable
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setWearablesSyncShown(true)}
                        className="w-full text-muted-foreground"
                      >
                        Passer cette étape
                      </Button>
                    </div>

                    <p className="text-[10px] text-center text-muted-foreground">
                      Connexion sécurisée • 100+ appareils supportés
                    </p>
                  </motion.div>
                ) : (
                  <>
                    {/* Show badge if some questions were auto-filled */}
                    {terraSkippedQuestions.length > 0 && sectionQuestions.some(q => terraSkippedQuestions.includes(q.id)) && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
                      >
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {sectionQuestions.filter(q => terraSkippedQuestions.includes(q.id)).length} question(s)
                            pre-remplie(s) par ton wearable
                          </span>
                        </div>
                      </motion.div>
                    )}
                    {sectionQuestions
                      .filter(q => (q.id !== "sexe" && q.id !== "prenom") || currentSectionIndex !== 0)
                      .filter(q => !terraSkippedQuestions.includes(q.id))
                      .map((question, index) => (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="space-y-3"
                      >
                        <div className="flex items-start gap-2">
                          <Label className="text-base font-medium">
                            {question.label}
                            {question.required && <span className="ml-1 text-destructive">*</span>}
                          </Label>
                        </div>
                        {question.helpText && (
                          <p className="text-sm text-muted-foreground">{question.helpText}</p>
                        )}
                        <QuestionField
                          question={question}
                          value={responses[question.id]}
                          onChange={(value) => handleResponseChange(question.id, value)}
                          onError={(msg) => toast({ title: "Erreur", description: msg, variant: "destructive" })}
                        />
                      </motion.div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between gap-4">
          <button
            onClick={handlePrevious}
            disabled={currentSectionIndex === 0 && !sexConfirmed && !prenomConfirmed}
            className="min-w-[120px] px-6 py-3 rounded-sm bg-black border border-neutral-800 text-white hover:border-[#FCDD00]/30 transition-colors disabled:opacity-50"
            data-testid="button-previous"
          >
            <ChevronLeft className="mr-2 h-4 w-4 inline" />
            Précédent
          </button>

          <button onClick={handleNext} className="min-w-[120px] px-6 py-3 rounded-sm bg-white text-black hover:bg-[#FCDD00] transition-colors" data-testid="button-next">
            {currentSectionIndex === filteredSections.length - 1 ? (
              <>
                Terminer
                <Check className="ml-2 h-4 w-4 inline" />
              </>
            ) : (
              <>
                Suivant
                <ChevronRight className="ml-2 h-4 w-4 inline" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Export with error boundary
export default function Questionnaire() {
  return (
    <QuestionnaireErrorBoundary>
      <QuestionnaireContent />
    </QuestionnaireErrorBoundary>
  );
}
