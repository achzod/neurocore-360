import { z } from "zod";

// Audit Types
export const AuditType = {
  GRATUIT: "GRATUIT",
  PREMIUM: "PREMIUM",
  ELITE: "ELITE",
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
  currentSection: z.number().min(0).max(14),
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
    name: "Audit Découverte",
    price: 0,
    priceLabel: "Gratuit",
    subtitle: "Pour tester",
    description: "Questionnaire 180 questions + rapport IA basique",
    icon: "Star",
    color: "slate",
    href: "/offers/audit-gratuit",
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
    id: "premium",
    name: "Audit Premium",
    price: 79,
    priceLabel: "79€",
    subtitle: "Paiement unique",
    description: "Analyse complète 15 domaines + photos + protocoles",
    icon: "Crown",
    color: "emerald",
    href: "/offers/audit-premium",
    coachingNote: "Déduit de ton coaching",
    features: [
      "15 sections d'analyse complètes",
      "Analyse photos (posture, composition)",
      "Profil Hormonal complet",
      "Digestion & Microbiome",
      "Protocole Nutrition détaillé",
      "Protocole Suppléments",
      "Feuille de Route 90 Jours",
    ],
    lockedFeatures: [],
    popular: true,
    cta: "Choisir Premium",
  },
  {
    id: "blood",
    name: "Blood Analysis",
    price: 99,
    priceLabel: "99€",
    subtitle: "Paiement unique",
    description: "Upload ton PDF, analyse IA avec ranges optimaux",
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
    id: "propanel",
    name: "Pro Panel",
    price: 149,
    priceLabel: "149€",
    subtitle: "Paiement unique",
    description: "Audit Elite + wearables + blessures + coaching",
    icon: "Zap",
    color: "amber",
    href: "/offers/pro-panel",
    coachingNote: "Déduit de ton coaching Private Lab",
    features: [
      "Tout le Premium inclus",
      "Sync wearables (Oura, Whoop, Garmin...)",
      "Analyse HRV avancée",
      "Questions blessures & douleurs",
      "Protocole réhabilitation",
      "Accès coach prioritaire",
    ],
    lockedFeatures: [],
    popular: false,
    cta: "Choisir Pro Panel",
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

export interface Review {
  id: string;
  auditId: string;
  userId?: string;
  email?: string;
  rating: number;
  comment: string;
  status: ReviewStatusEnum;
  createdAt: string | Date;
  reviewedAt?: string | Date;
  reviewedBy?: string;
}

export const insertReviewSchema = z.object({
  auditId: z.string(),
  userId: z.string().optional(),
  email: z.string().email().optional(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, "Le commentaire doit contenir au moins 10 caractères"),
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
