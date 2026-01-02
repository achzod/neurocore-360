import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function Questionnaire() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [photoData, setPhotoData] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const currentSection = QUESTIONNAIRE_SECTIONS[currentSectionIndex];
  const userSex = responses["sexe"] as string | undefined;
  const [sexConfirmed, setSexConfirmed] = useState(false);
  const [prenomConfirmed, setPrenomConfirmed] = useState(false);
  const sectionQuestions = getQuestionsForSection(currentSection.id, userSex);
  const IconComponent = iconMap[currentSection.icon] || User;

  const totalProgress = Math.round(((currentSectionIndex + 1) / QUESTIONNAIRE_SECTIONS.length) * 100);

  useEffect(() => {
    const savedEmail = localStorage.getItem("neurocore_email");
    const savedResponses = localStorage.getItem("neurocore_responses");
    const savedSection = localStorage.getItem("neurocore_section");
    const savedPhotos = sessionStorage.getItem("neurocore_photos");

    if (savedEmail) {
      setEmail(savedEmail);
      setEmailSubmitted(true);
    }
    
    const parsedResponses = savedResponses ? JSON.parse(savedResponses) : {};
    const parsedPhotos = savedPhotos ? JSON.parse(savedPhotos) : {};
    
    if (Object.keys(parsedPhotos).length > 0) {
      setPhotoData(parsedPhotos);
    }
    
    if (Object.keys(parsedResponses).length > 0 || Object.keys(parsedPhotos).length > 0) {
      setResponses({ ...parsedResponses, ...parsedPhotos });
    }
    
    if (savedSection) {
      setCurrentSectionIndex(Number(savedSection));
    }
    
    if (parsedResponses["sexe"]) {
      setSexConfirmed(true);
    }
    if (parsedResponses["prenom"]) {
      setPrenomConfirmed(true);
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
      toast({
        title: "Progression sauvegardée",
        description: "Tu peux reprendre ton questionnaire à tout moment.",
      });
    },
  });

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
    if (currentSectionIndex < QUESTIONNAIRE_SECTIONS.length - 1) {
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
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
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
                  Section {currentSectionIndex + 1}/{QUESTIONNAIRE_SECTIONS.length}
                </p>
                <p className="text-xs text-muted-foreground">{currentSection.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
                <Progress value={totalProgress} className="w-32" />
              </div>
              <Badge variant="secondary">{totalProgress}%</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => saveProgressMutation.mutate()}
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
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8 flex flex-wrap gap-2">
          {QUESTIONNAIRE_SECTIONS.map((section, index) => {
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
                  sectionQuestions.filter(q => q.id !== "sexe" && q.id !== "prenom" || currentSectionIndex !== 0).map((question, index) => (
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
                  ))
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
            {currentSectionIndex === QUESTIONNAIRE_SECTIONS.length - 1 ? (
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
