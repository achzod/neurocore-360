import { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from "react";
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
import {
  filterQuestionsByGender,
  getQuestionsForTier,
  getSectionsForTier,
  type Question,
} from "@/lib/questionnaire-tiers";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Save,
  User,
  Stethoscope,
  Scale,
  Zap,
  Apple,
  Beaker,
  Dumbbell,
  Moon,
  Heart,
  HeartPulse,
  TestTube,
  Pill,
  Activity,
  Coffee,
  Bone,
  Brain,
  BrainCircuit,
  HeartHandshake,
  Camera,
  TrendingUp,
  Target,
  Utensils,
  UtensilsCrossed,
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
  Stethoscope,
  Scale,
  Zap,
  Apple,
  Beaker,
  Dumbbell,
  Moon,
  Heart,
  HeartPulse,
  TestTube,
  Pill,
  Activity,
  Coffee,
  Bone,
  Brain,
  BrainCircuit,
  HeartHandshake,
  Camera,
  Target,
  Utensils,
  UtensilsCrossed,
  TrendingUp,
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
    case "email":
      return (
        <Input
          type="email"
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
        if (!file) return;

        // No size limit ,  we compress everything automatically
        const compressImage = (dataUrl: string): Promise<string> => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                // Max 1200px to keep enough detail for Claude photo analysis
                const MAX_DIM = 1200;
                let w = img.width;
                let h = img.height;
                if (w > MAX_DIM || h > MAX_DIM) {
                  const ratio = Math.min(MAX_DIM / w, MAX_DIM / h);
                  w = Math.round(w * ratio);
                  h = Math.round(h * ratio);
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, w, h);
                  // Compress to under 800KB but never below quality 0.5
                  for (const q of [0.85, 0.7, 0.5]) {
                    const result = canvas.toDataURL('image/jpeg', q);
                    if (result.length < 800000) {
                      resolve(result);
                      return;
                    }
                  }
                  resolve(canvas.toDataURL('image/jpeg', 0.5));
                } else {
                  resolve(dataUrl);
                }
              } catch {
                resolve(dataUrl);
              }
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
          });
        };

        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const raw = reader.result as string;
            const compressed = await compressImage(raw);
            onChange(compressed);
          } catch {
            // Fallback: use raw if compression fails
            onChange(reader.result as string);
          }
        };
        reader.onerror = () => {
          onError?.("Erreur de lecture du fichier. Reessaie ou prends une nouvelle photo.");
        };
        reader.readAsDataURL(file);
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

type PlanId = "gratuit" | "anabolic" | "ultimate";
type PlanTier = "free" | "essential" | "elite";

const PLAN_TIER_MAP: Record<PlanId, PlanTier> = {
  gratuit: "free",
  anabolic: "essential",
  ultimate: "elite",
};

const normalizePlan = (plan: string | null | undefined): PlanId | null => {
  if (!plan) return null;
  const normalized = plan.toLowerCase();
  if (normalized === "gratuit" || normalized === "discovery" || normalized === "free") return "gratuit";
  if (normalized === "anabolic" || normalized === "premium" || normalized === "essential") return "anabolic";
  if (normalized === "ultimate" || normalized === "elite") return "ultimate";
  return null;
};

function QuestionnaireContent() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [photoData, setPhotoData] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [rgpdConsent, setRgpdConsent] = useState(false);

  // Lire le plan depuis l'URL (anabolic/ultimate/gratuit)
  const [selectedPlan] = useState<PlanId>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlPlan = normalizePlan(urlParams.get("plan"));
    const storedPlan = normalizePlan(localStorage.getItem("neurocore_plan"));
    const plan = urlPlan ?? storedPlan ?? "gratuit";
    localStorage.setItem("neurocore_plan", plan);
    return plan;
  });

  const selectedTier = PLAN_TIER_MAP[selectedPlan];
  const allQuestions = getQuestionsForTier(selectedTier);
  const filteredSections = getSectionsForTier(selectedTier);

  // Bounds check pour éviter undefined
  const safeIndex = Math.min(Math.max(0, currentSectionIndex), filteredSections.length - 1);
  const currentSection = filteredSections[safeIndex];
  const userSex = responses["sexe"] as string | undefined;
  const [sexConfirmed, setSexConfirmed] = useState(false);
  const [prenomConfirmed, setPrenomConfirmed] = useState(false);
  const loadNonceRef = useRef(0);
  const normalizedSex = userSex === "homme" || userSex === "femme" ? userSex : undefined;
  const sectionQuestions = currentSection
    ? (
      normalizedSex
        ? filterQuestionsByGender(
            allQuestions.filter(q => q.sectionId === currentSection.id),
            normalizedSex,
          )
        : allQuestions.filter(q => q.sectionId === currentSection.id)
    )
    : [];
  const IconComponent = currentSection ? (iconMap[currentSection.icon] || User) : User;

  const totalProgress = Math.round(((currentSectionIndex + 1) / filteredSections.length) * 100);

  const shouldShowQuestion = (question: Question) => {
    if (!question.conditionalOn) return true;
    const [dependencyId, expectedValue] = question.conditionalOn.split(":");
    if (!dependencyId || !expectedValue) return true;
    const answer = responses[dependencyId];
    if (Array.isArray(answer)) {
      return answer.includes(expectedValue);
    }
    return answer === expectedValue;
  };

  // Charger la progression depuis la DB
  const loadProgressFromDB = async (userEmail: string) => {
    const nonce = loadNonceRef.current;
    try {
      const res = await fetch(`/api/questionnaire/progress/${encodeURIComponent(userEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (nonce !== loadNonceRef.current) {
          return false;
        }
        if (data && data.responses && Object.keys(data.responses).length > 0) {
          // Progress loaded from DB
          setResponses(prev => ({ ...prev, ...data.responses }));
          if (data.currentSection !== undefined) {
            setCurrentSectionIndex(data.currentSection);
          }
          if (data.responses["sexe"]) setSexConfirmed(true);
          if (data.responses["prenom"]) setPrenomConfirmed(true);
          // Restore photos from DB responses into photoData state
          const restoredPhotos: Record<string, string> = {};
          for (const field of PHOTO_FIELDS) {
            const val = data.responses[field];
            if (val && typeof val === "string" && val.startsWith("data:image")) {
              restoredPhotos[field] = val;
            }
          }
          if (Object.keys(restoredPhotos).length > 0) {
            setPhotoData(prev => ({ ...prev, ...restoredPhotos }));
          }
          return true;
        }
      }
    } catch (err) {
      console.error("[Questionnaire] Error loading from DB:", err);
    }
    return false;
  };

  // Magic-link resume flow: when an abandonment-reminder email links here
  // with `?resume=<token>`, hit the server to resolve the token → email +
  // saved progress. Bypasses localStorage entirely so the user can resume
  // on any device. The token is consumed (clicked_at marked) on the first
  // GET /api/questionnaire/resume call.
  const [resumeChecked, setResumeChecked] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("resume");
    if (!token) { setResumeChecked(true); return; }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/questionnaire/resume?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          console.warn("[Questionnaire] Resume token invalid, falling back to localStorage");
          return;
        }
        const data = await res.json();
        if (cancelled || !data?.email) return;

        // Pre-fill email + mark submitted so the rest of the questionnaire
        // mounts immediately without re-asking for the address.
        setEmail(data.email);
        setEmailSubmitted(true);
        try { localStorage.setItem("neurocore_email", data.email); } catch {}

        if (data.progress?.responses) {
          setResponses(prev => ({ ...prev, ...data.progress.responses, email: data.email }));
          if (data.progress.currentSection !== undefined) {
            setCurrentSectionIndex(data.progress.currentSection);
          }
          if (data.progress.responses["sexe"]) setSexConfirmed(true);
          if (data.progress.responses["prenom"]) setPrenomConfirmed(true);
        }

        // Clean the URL so reloads don't keep replaying the resume.
        url.searchParams.delete("resume");
        window.history.replaceState({}, "", url.toString());
      } catch (e) {
        console.error("[Questionnaire] Resume fetch failed:", e);
      } finally {
        if (!cancelled) setResumeChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    // Wait for the resume flow above to finish before falling back to the
    // localStorage hydrate path ,  otherwise we'd briefly show the previous
    // user's saved data on a shared device.
    if (!resumeChecked) return;
    try {
      const savedEmail = localStorage.getItem("neurocore_email");
      const savedResponses = localStorage.getItem("neurocore_responses");
      const savedSection = localStorage.getItem("neurocore_section");
      const savedPhotos: string | null = localStorage.getItem("neurocore_photos");

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
        try { localStorage.removeItem("neurocore_photos"); } catch {}
      }

      if (Object.keys(parsedPhotos).length > 0) {
        setPhotoData(parsedPhotos);
      }

      if (Object.keys(parsedResponses).length > 0 || Object.keys(parsedPhotos).length > 0 || savedEmail) {
        setResponses({ ...parsedResponses, ...parsedPhotos, ...(savedEmail ? { email: savedEmail } : {}) });
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

    } catch (e) {
      console.error("[Questionnaire] Init error:", e);
    }
  }, [resumeChecked]);

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
        totalSections: filteredSections.length,
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      setEmailSubmitted(true);
      localStorage.setItem("neurocore_email", email);
      setResponses((prev) => ({ ...prev, email }));

      // Immediately persist a progress row so the abandonment-recovery cron
      // can pick up this user even if they close the tab before answering
      // the first question. Without this, the first save wouldn't happen
      // until the 3s-debounced response-change effect fires ,  anyone who
      // bails in the first 3 seconds would be invisible to the abandon cron.
      // Fire-and-forget, best-effort.
      apiRequest("POST", "/api/questionnaire/save-progress", {
        email,
        responses: { email },
        currentSection: 0,
        totalSections: filteredSections.length,
      }).catch(() => { /* best-effort */ });

      // Load existing progress from DB (returning user on new device)
      await loadProgressFromDB(email);
    }
  };

  const handleResponseChange = (questionId: string, value: unknown) => {
    if (PHOTO_FIELDS.includes(questionId)) {
      const newPhotoData = { ...photoData, [questionId]: value as string };
      setPhotoData(newPhotoData);
      // Don't store photos in sessionStorage ,  they stay in React state only
      // This prevents quota exceeded errors on all browsers
    }
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = async () => {
    // Si on est dans la section 0 et qu'on n'a pas encore confirmé le prénom, ne pas avancer
    if (currentSectionIndex === 0 && sexConfirmed && !prenomConfirmed) {
      return;
    }

    // Vérifier les photos UNIQUEMENT pour Ultimate Scan
    const isLastSection = currentSectionIndex === filteredSections.length - 1;
    if (isLastSection && selectedPlan === "ultimate") {
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
      if (emailSubmitted && email) {
        try {
          await saveProgressMutation.mutateAsync();
        } catch {
          // Best-effort save; proceed to checkout even if it fails.
        }
      }
      const responsesToSave = { ...responses };
      PHOTO_FIELDS.forEach((f) => delete responsesToSave[f]);
      localStorage.setItem("neurocore_responses", JSON.stringify(responsesToSave));
      // Photos stored in localStorage instead of sessionStorage (more reliable)
      try {
        localStorage.setItem("neurocore_photos", JSON.stringify(photoData));
      } catch {
        console.warn("[Photos] localStorage full, photos will be in memory for checkout");
      }
      navigate(`/audit-complet/checkout?plan=${selectedPlan}`);
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

  const handleRestart = async () => {
    const emailToClear = email || localStorage.getItem("neurocore_email") || "";
    loadNonceRef.current += 1;
    if (emailToClear) {
      try {
        await fetch("/api/questionnaire/clear-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailToClear }),
        });
      } catch (err) {
        console.error("[Questionnaire] Unable to clear progress:", err);
      }
    }
    localStorage.removeItem("neurocore_email");
    localStorage.removeItem("neurocore_responses");
    localStorage.removeItem("neurocore_section");
    localStorage.removeItem("neurocore_plan");
    sessionStorage.removeItem("neurocore_photos");
    sessionStorage.removeItem("questionnaireProgress");
    setEmail("");
    setEmailSubmitted(false);
    setResponses({});
    setPhotoData({});
    setCurrentSectionIndex(0);
    setSexConfirmed(false);
    setPrenomConfirmed(false);
  };

  if (!emailSubmitted) {
    return (
      <div className="min-h-screen bg-background">
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
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="rgpd-consent"
                      checked={rgpdConsent}
                      onCheckedChange={(checked) => setRgpdConsent(checked === true)}
                      data-testid="checkbox-rgpd-consent"
                    />
                    <Label htmlFor="rgpd-consent" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                      J'accepte que mes donnees de sante soient collectees et traitees par APEXLABS dans le cadre de mon audit personnalise, conformement a la{" "}
                      <a href="/politique-confidentialite" target="_blank" className="text-primary underline">politique de confidentialite</a>.
                      <span className="ml-1 text-destructive">*</span>
                    </Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={!rgpdConsent} data-testid="button-start-questionnaire">
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
    <div className="min-h-screen bg-background">
      <Header />

      <div className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  saveProgressMutation.mutate();
                  toast({
                    title: "Sauvegardé !",
                    description: "Ta progression est enregistrée.",
                  });
                }}
                disabled={saveProgressMutation.isPending}
                data-testid="button-save-progress"
              >
                <Save className="mr-2 h-4 w-4" />
                {saveProgressMutation.isPending ? "..." : "Sauvegarder"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestart}
                data-testid="button-restart"
              >
                <X className="mr-2 h-4 w-4" />
                Recommencer
              </Button>
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
                <p className="text-muted-foreground">{currentSection.subtitle}</p>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Message d'importance pour la section Analyse Posturale */}
                {currentSection.id === "analyse-photo" && (
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
                      <Button
                        onClick={() => setSexConfirmed(true)}
                        className="w-full"
                        data-testid="button-confirm-sex"
                      >
                        Continuer
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
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
                      <Button
                        onClick={() => setPrenomConfirmed(true)}
                        className="w-full"
                        data-testid="button-confirm-prenom"
                      >
                        Continuer
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </motion.div>
                ) : (
                  <>
                    {sectionQuestions
                      .filter(q => q.id !== "sexe" && q.id !== "prenom" && q.id !== "email")
                      .filter(shouldShowQuestion)
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
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentSectionIndex === 0 && !sexConfirmed && !prenomConfirmed}
            className="min-w-[120px]"
            data-testid="button-previous"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Précédent
          </Button>

          <Button onClick={handleNext} className="min-w-[120px]" data-testid="button-next">
            {currentSectionIndex === filteredSections.length - 1 ? (
              <>
                Terminer
                <Check className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Suivant
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
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
