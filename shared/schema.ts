import { z } from "zod";

// Audit Types (internal DB names - DO NOT CHANGE, used in existing DB records)
export const AuditType = {
  GRATUIT: "GRATUIT",
  PREMIUM: "PREMIUM",
  ELITE: "ELITE",
} as const;

// Display names mapping (frontend)
export const AuditTypeDisplayNames = {
  GRATUIT: "Discovery Scan",
  PREMIUM: "Anabolic Bioscan",
  ELITE: "Ultimate Scan",
} as const;

// Reverse mapping for URL slugs
export const AuditTypeFromSlug = {
  "discovery-scan": "GRATUIT",
  "anabolic-bioscan": "PREMIUM",
  "ultimate-scan": "ELITE",
} as const;

export type AuditTypeEnum = (typeof AuditType)[keyof typeof AuditType];

// Audit Status
export const AuditStatus = {
  STARTED: "STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  ABANDONED: "ABANDONED",
} as const;

// Report Delivery Status
export const ReportDeliveryStatus = {
  PENDING: "PENDING",
  GENERATING: "GENERATING",
  READY: "READY",
  SENT: "SENT",
  FAILED: "FAILED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  NEED_PHOTOS: "NEED_PHOTOS",
} as const;

export type ReportDeliveryStatusEnum = (typeof ReportDeliveryStatus)[keyof typeof ReportDeliveryStatus];

// Report Job Status
export const ReportJobStatus = {
  PENDING: "pending",
  GENERATING: "generating",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ReportJobStatusEnum = (typeof ReportJobStatus)[keyof typeof ReportJobStatus];

// Report Job (persisted in DB)
export interface ReportJob {
  auditId: string;
  status: ReportJobStatusEnum;
  progress: number;
  currentSection: string;
  error: string | null;
  attemptCount: number;
  startedAt: Date | string;
  updatedAt: Date | string;
  lastProgressAt: Date | string;
  completedAt: Date | string | null;
}

export type AuditStatusEnum = (typeof AuditStatus)[keyof typeof AuditStatus];

// User
export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string | Date;
}

export const insertUserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// Audit
export interface Audit {
  id: string;
  userId: string;
  email: string;
  type: AuditTypeEnum;
  status: AuditStatusEnum;
  responses: Record<string, unknown>;
  scores: Record<string, number>;
  narrativeReport?: unknown;
  // Optionnels: utilisés pour cache/traçabilité (peuvent être absents selon stockage)
  reportTxt?: string;
  reportHtml?: string;
  reportGeneratedAt?: string | Date;
  reportDeliveryStatus: ReportDeliveryStatusEnum;
  reportScheduledFor?: string | Date;
  reportSentAt?: string | Date;
  createdAt: string | Date;
  completedAt?: string | Date;
}

export const insertAuditSchema = z.object({
  userId: z.string(),
  type: z.enum(["GRATUIT", "PREMIUM", "ELITE"]),
  responses: z.record(z.unknown()).optional().default({}),
});

export type InsertAudit = z.infer<typeof insertAuditSchema>;

// Questionnaire Progress
export interface QuestionnaireProgress {
  id: string;
  email: string;
  currentSection: number;
  totalSections: number;
  percentComplete: number;
  responses: Record<string, unknown>;
  status: AuditStatusEnum;
  startedAt: string | Date;
  lastActivityAt: string | Date;
}

export const saveProgressSchema = z.object({
  email: z.string().email(),
  currentSection: z.number().min(0).max(50),
  totalSections: z.number().min(1).max(50).optional(),
  responses: z.record(z.unknown()),
});

export type SaveProgressInput = z.infer<typeof saveProgressSchema>;

// Questionnaire sections configuration
export const QUESTIONNAIRE_SECTIONS = [
  {
    id: "profil-base",
    title: "Profil de Base",
    icon: "User",
    description: "Informations personnelles de base",
  },
  {
    id: "composition-corporelle",
    title: "Composition Corporelle",
    icon: "Scale",
    description: "Mesures et proportions corporelles",
  },
  {
    id: "metabolisme-energie",
    title: "Métabolisme & Énergie",
    icon: "Zap",
    description: "Niveau d'énergie et métabolisme",
  },
  {
    id: "nutrition-tracking",
    title: "Nutrition & Tracking",
    icon: "Apple",
    description: "Habitudes alimentaires",
  },
  {
    id: "digestion-microbiome",
    title: "Digestion & Microbiome",
    icon: "Beaker",
    description: "Santé digestive",
  },
  {
    id: "activite-performance",
    title: "Activité & Performance",
    icon: "Dumbbell",
    description: "Exercice et performance physique",
  },
  {
    id: "sommeil-recuperation",
    title: "Sommeil & Récupération",
    icon: "Moon",
    description: "Qualité du sommeil",
  },
  {
    id: "hrv-cardiaque",
    title: "HRV & Cardiaque",
    icon: "Heart",
    description: "Variabilité cardiaque",
  },
  {
    id: "cardio-endurance",
    title: "Cardio & Endurance",
    icon: "Timer",
    description: "Capacité aérobique et Zone 2",
  },
  {
    id: "analyses-biomarqueurs",
    title: "Analyses & Biomarqueurs",
    icon: "TestTube",
    description: "Analyses sanguines",
  },
  {
    id: "hormones-stress",
    title: "Hormones & Stress",
    icon: "Activity",
    description: "Profil hormonal et stress",
  },
  {
    id: "lifestyle-substances",
    title: "Lifestyle & Substances",
    icon: "Coffee",
    description: "Mode de vie",
  },
  {
    id: "biomecanique-mobilite",
    title: "Biomécanique & Mobilité",
    icon: "Bone",
    description: "Posture et mobilité",
  },
  {
    id: "psychologie-mental",
    title: "Psychologie & Mental",
    icon: "HeartHandshake",
    description: "Équilibre psychologique",
  },
  {
    id: "neurotransmetteurs",
    title: "Neurotransmetteurs",
    icon: "Brain",
    description: "Équilibre cérébral",
  },
  {
    id: "analyse-posturale",
    title: "Analyse Posturale",
    icon: "Camera",
    description: "Photos pour analyse biomécanique complète",
  },
] as const;

// Question types
export type QuestionType = "text" | "number" | "select" | "radio" | "checkbox" | "scale" | "textarea" | "photo";

export interface Question {
  id: string;
  sectionId: string;
  type: QuestionType;
  label: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  max?: number;
  unit?: string;
  helpText?: string;
  showFor?: "homme" | "femme" | "all";
}

// Pricing Plans

export const PRICING_PLANS = [
  {
    id: "gratuit",
    name: "Discovery Scan",
    price: 0,
    priceLabel: "Gratuit",
    subtitle: "Pour tester",
    description: "Questionnaire 180 questions + rapport decouverte",
    icon: "Star",
    color: "slate",
    href: "/offers/discovery-scan",
    features: [
      "Résumé Exécutif",
      "Analyse Anthropométrique",
      "Profil Métabolique de Base",
      "Plan d'Action 30 Jours",
    ],
    lockedFeatures: ["10 sections verrouillées"],
    popular: false,
    cta: "Commencer gratuitement",
  },
  {
    id: "anabolic",
    name: "Anabolic Bioscan",
    price: 79,
    priceLabel: "79€",
    subtitle: "Paiement unique",
    description: "Analyse complete 15 domaines + protocoles personnalises",
    icon: "Crown",
    color: "emerald",
    href: "/offers/anabolic-bioscan",
    coachingNote: "Deduit de ton coaching",
    features: [
      "15 sections d'analyse completes",
      "Profil Hormonal complet",
      "Digestion & Microbiome",
      "Protocole Nutrition detaille",
      "Protocole Supplements",
      "Feuille de Route 90 Jours",
    ],
    lockedFeatures: [],
    popular: true,
    cta: "Choisir Anabolic Bioscan",
  },
  {
    id: "blood",
    name: "Blood Analysis",
    price: 99,
    priceLabel: "99€",
    subtitle: "Paiement unique",
    description: "Upload ton PDF, analyse avec ranges optimaux",
    icon: "Beaker",
    color: "red",
    href: "/offers/blood-analysis",
    features: [
      "Upload PDF bilan sanguin",
      "Ranges OPTIMAUX vs normaux",
      "Détection patterns (Low T, Thyroid...)",
      "Radar de risques par catégorie",
      "Protocole suppléments personnalisé",
      "Sources scientifiques citées",
    ],
    lockedFeatures: [],
    popular: false,
    cta: "Analyser mon sang",
  },
  {
    id: "ultimate",
    name: "Ultimate Scan",
    price: 149,
    priceLabel: "149€",
    subtitle: "Paiement unique",
    description: "Anabolic Bioscan + wearables + blessures",
    icon: "Zap",
    color: "cyan",
    href: "/offers/ultimate-scan",
    coachingNote: "Deduit de ton coaching Private Lab",
    features: [
      "Tout l'Anabolic Bioscan inclus",
      "Sync wearables (Oura, Whoop, Garmin...)",
      "Analyse HRV avancee",
      "Questions blessures & douleurs",
      "Protocole rehabilitation",
      "Acces coach prioritaire",
    ],
    lockedFeatures: [],
    popular: false,
    cta: "Choisir Ultimate Scan",
  },
  {
    id: "burnout",
    name: "Burnout Detection",
    price: 49,
    priceLabel: "49€",
    subtitle: "Paiement unique",
    description: "Détecte le burnout avant la crise",
    icon: "Brain",
    color: "purple",
    href: "/offers/burnout-detection",
    features: [
      "Questionnaire neuro-endocrinien",
      "Profil hormonal estimé",
      "Score de risque burnout",
      "Protocole sortie 4 semaines",
      "Dashboard temps réel",
      "Rapport PDF 18 pages",
    ],
    lockedFeatures: [],
    popular: false,
    cta: "Détecter mon risque",
  },
] as const;

// Review system
export const ReviewStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type ReviewStatusEnum = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const ReviewAuditType = {
  DISCOVERY: "DISCOVERY",
  ANABOLIC_BIOSCAN: "ANABOLIC_BIOSCAN",
  ULTIMATE_SCAN: "ULTIMATE_SCAN",
  BLOOD_ANALYSIS: "BLOOD_ANALYSIS",
  BURNOUT: "BURNOUT",
} as const;

export type ReviewAuditTypeEnum = (typeof ReviewAuditType)[keyof typeof ReviewAuditType];

export interface Review {
  id: string;
  auditId: string;
  userId?: string;
  email: string;
  auditType: ReviewAuditTypeEnum;
  rating: number;
  comment: string;
  status: ReviewStatusEnum;
  promoCode?: string;
  promoCodeSentAt?: string | Date;
  adminNotes?: string;
  createdAt: string | Date;
  reviewedAt?: string | Date;
  reviewedBy?: string;
}

export const insertReviewSchema = z.object({
  auditId: z.string(),
  userId: z.string().optional(),
  email: z.string().email("Email invalide"),
  auditType: z.enum(["DISCOVERY", "ANABOLIC_BIOSCAN", "ULTIMATE_SCAN", "BLOOD_ANALYSIS", "BURNOUT"]),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, "Le commentaire doit contenir au moins 10 caractères"),
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
