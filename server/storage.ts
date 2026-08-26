import { randomUUID } from "crypto";
import { Pool } from "pg";
import type {
  User,
  InsertUser,
  Audit,
  InsertAudit,
  QuestionnaireProgress,
  SaveProgressInput,
  AuditStatusEnum,
  ReportDeliveryStatusEnum,
  ReportJob,
  ReportJobStatusEnum,
  ReviewAuditTypeEnum,
  Order,
  CreateOrderInput,
  OrderStatusEnum,
  ProductTypeEnum,
  PromoCodeUsage,
} from "@shared/schema";
import { ProductDisplayNames, ProductPriceCents } from "@shared/schema";
import { calculateScoresFromResponses, generateFullAnalysis } from "./analysisEngine";
import type {
  PeptidesGenerationAttemptClaim,
  PeptidesGenerationCircuitConfig,
} from "./peptidesGenerationCircuitBreaker";
import {
  DISCOVERY_SUPERSEDED_TERMINAL_SQL,
  isDiscoverySupersededTerminal,
} from "./discoverySupersededPolicy";
import { isDiscoveryTransactionalAutomationEligible } from "./discoveryAutomationPolicy";
import {
  GenericAuditMutationBarrierError,
  runGenericAuditMutation,
} from "./discoveryGenericMutationBarrier";
import {
  claimPendingGenericReportJob,
  completeGenericReportJob,
  deleteGenericReportJob,
  enqueueMissingDiscoveryReportJobFenced,
  failGenericReportJob,
  insertGenericReportArtifactFenced,
  listActiveGenericReportJobRows,
  markDiscoveryAuditSupersededFenced,
  updateGenericReportJobProgress,
  upsertGenericReportJobRow,
} from "./reportJobStorageSafety";
import { DISCOVERY_TRANSACTION_FENCE_KEY } from "./discoveryTransactionalPersistence";

const DISCOVERY_GENERIC_PROTECTED_STATE_SQL = `NOT (
  type = 'GRATUIT'
  AND (
    report_sent_at IS NOT NULL
    OR report_delivery_status IN ('BATCH_READY','SENDING','SENT','SUPERSEDED')
  )
)`;

// Configuration de la connexion PostgreSQL
const getDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_CONNECTION_STRING;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  // Vérifier que l'URL est valide (commence par postgres:// ou postgresql://)
  if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
    throw new Error(`Invalid DATABASE_URL format. Expected postgres:// or postgresql://, got: ${url.substring(0, 20)}...`);
  }
  return url;
};

const dbUrl = getDatabaseUrl();
const pool = new Pool({
  connectionString: dbUrl,
  ssl: (dbUrl.includes('render.com') || dbUrl.includes('neon.tech'))
    ? { rejectUnauthorized: false }
    : false,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
});

// Handle unexpected pool errors to prevent crashes
pool.on("error", (err) => {
  console.error("[DB Pool] Unexpected error on idle client:", err.message);
});

const DEFAULT_USER_CREDITS = Number(process.env.DEFAULT_BLOOD_CREDITS ?? "0");

export interface MagicToken {
  token: string;
  email: string;
  expiresAt: Date;
}

export interface ReportArtifact {
  id: string;
  auditId: string;
  tier: string;
  engine: string;
  model: string;
  txt: string;
  html: string;
  createdAt: Date;
}

export interface PromoCode {
  id: string;
  code: string;
  discountPercent: number;
  description: string | null;
  validFor: string; // 'ALL' | 'PREMIUM' | 'ELITE'
  maxUses: number | null;
  currentUses: number;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface EmailTracking {
  id: string;
  auditId: string;
  emailType: string;
  recipientEmail?: string | null;
  sentAt: Date;
  openedAt: Date | null;
  clickedAt: Date | null;
  opened?: Date | null;
  clicked?: Date | null;
  sendpulseStatus?: string | null;
  converted?: Date | null;
  conversionType?: string | null;
}

export interface BurnoutProgress {
  id: string;
  email: string;
  currentSection: number;
  totalSections: number;
  percentComplete: number;
  responses: Record<string, unknown>;
  status: AuditStatusEnum;
  startedAt: Date | string;
  lastActivityAt: Date | string;
}

export interface SaveBurnoutProgressInput {
  email: string;
  currentSection: number;
  totalSections?: number;
  responses: Record<string, unknown>;
}

export interface BurnoutReportRecord {
  id: string;
  email: string;
  responses: Record<string, unknown>;
  report: unknown;
  createdAt: Date | string;
}

export interface BloodReportRecord {
  id: string;
  email: string;
  profile: Record<string, unknown>;
  markers: unknown[];
  analysis: unknown;
  aiReport: string;
  deliveryStatus?: string;
  deliveryRetries?: number;
  reportScheduledFor?: Date | string | null;
  emailSentAt?: Date | string | null;
  createdAt: Date | string;
}

export interface BloodTestRecord {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  error?: string | null;
  markers: unknown[];
  analysis: unknown;
  patientProfile?: Record<string, unknown>;
  globalScore?: number | null;
  globalLevel?: string | null;
  createdAt: Date | string;
  completedAt?: Date | string | null;
}

export type AuditSummary = Pick<
  Audit,
  | "id"
  | "userId"
  | "email"
  | "type"
  | "status"
  | "reportDeliveryStatus"
  | "reportScheduledFor"
  | "reportSentAt"
  | "createdAt"
  | "completedAt"
>;

export type BloodReportSummary = Pick<
  BloodReportRecord,
  "id" | "email" | "deliveryStatus" | "emailSentAt" | "createdAt"
>;

export interface AdminAuditSummary {
  id: string;
  email: string;
  type: string;
  status: string;
  reportDeliveryStatus: string | null;
  reportSentAt: Date | string | null;
  createdAt: Date | string;
  completedAt: Date | string | null;
}

export interface AdminAuditSummaryPage {
  items: AdminAuditSummary[];
  total: number;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  adjustUserCredits(id: string, delta: number): Promise<User | undefined>;

  getAudit(id: string): Promise<Audit | undefined>;
  getAuditsByUserId(userId: string): Promise<Audit[]>;
  getAuditsByEmail(email: string): Promise<Audit[]>;
  getPendingAudits(): Promise<Audit[]>;
  getAllAudits(): Promise<Audit[]>;
  /** Memory-safe variant of getAllAudits that omits heavy JSONB columns (narrative_report, responses, scores). Use in long-running crons. */
  getAllAuditsLight(): Promise<Audit[]>;
  getAllAuditSummaries(): Promise<AuditSummary[]>;
  getAdminAuditSummariesPage(limit: number, offset: number): Promise<AdminAuditSummaryPage>;
  getScheduledAuditsForDelivery(): Promise<Audit[]>;
  createAudit(audit: InsertAudit & { email: string; responses: Record<string, unknown> }): Promise<Audit>;
  createDiscoveryAudit(audit: InsertAudit & { email: string; responses: Record<string, unknown> }): Promise<Audit>;
  updateAudit(id: string, data: Partial<Audit>): Promise<Audit | undefined>;

  getProgress(email: string): Promise<QuestionnaireProgress | undefined>;
  saveProgress(input: SaveProgressInput): Promise<QuestionnaireProgress>;
  deleteProgress(email: string): Promise<void>;
  getAllIncompleteProgress(): Promise<QuestionnaireProgress[]>;

  getBurnoutProgress(email: string): Promise<BurnoutProgress | undefined>;
  saveBurnoutProgress(input: SaveBurnoutProgressInput): Promise<BurnoutProgress>;
  createBurnoutReport(input: { email: string; responses: Record<string, unknown>; report: unknown }): Promise<BurnoutReportRecord>;
  getBurnoutReport(id: string): Promise<BurnoutReportRecord | undefined>;
  updateBurnoutReport(id: string, report: unknown): Promise<BurnoutReportRecord | undefined>;
  getAllBurnoutReports(): Promise<BurnoutReportRecord[]>;
  getPeptidesReportsByEmail(email: string): Promise<BurnoutReportRecord[]>;

  createBloodReport(input: { email: string; profile: Record<string, unknown>; markers: unknown[]; analysis: unknown; aiReport: string }): Promise<BloodReportRecord>;
  getBloodReport(id: string): Promise<BloodReportRecord | undefined>;
  updateBloodReport(id: string, data: Partial<BloodReportRecord>): Promise<BloodReportRecord | undefined>;
  getAllBloodReports(): Promise<BloodReportRecord[]>;
  getAllBloodReportSummaries(): Promise<BloodReportSummary[]>;
  getScheduledBloodReportsForDelivery(): Promise<BloodReportRecord[]>;

  createBloodTest(input: Omit<BloodTestRecord, "id" | "createdAt"> & { createdAt?: Date }): Promise<BloodTestRecord>;
  updateBloodTest(id: string, data: Partial<BloodTestRecord>): Promise<BloodTestRecord | undefined>;
  getBloodTest(id: string): Promise<BloodTestRecord | undefined>;
  getBloodTestsByUserId(userId: string): Promise<BloodTestRecord[]>;

  createMagicToken(email: string): Promise<string>;
  verifyMagicToken(token: string): Promise<string | null>;

  getReportJob(auditId: string): Promise<ReportJob | undefined>;
  getActiveReportJobs(): Promise<ReportJob[]>;
  createOrUpdateReportJob(job: Partial<ReportJob> & { auditId: string }): Promise<ReportJob>;
  /** Atomic cross-instance claim: pending -> generating. */
  claimPendingReportJob(auditId: string): Promise<ReportJob | undefined>;
  updateReportJobProgress(auditId: string, progress: number, currentSection: string): Promise<void>;
  completeReportJob(auditId: string): Promise<void>;
  failReportJob(auditId: string, error: string): Promise<void>;
  deleteReportJob(auditId: string): Promise<void>;
  /** True when a durable report artifact exists for the audit. */
  hasReportArtifact(auditId: string): Promise<boolean>;
  /**
   * Atomically claims an artifact-less Discovery audit and inserts one pending
   * report job. Returns false when a job/artifact/status race already won.
   */
  enqueueMissingDiscoveryReportJob(auditId: string, reason: string): Promise<boolean>;
  /** Moves a duplicate Discovery audit out of NEEDS_REVIEW with durable provenance. */
  markDiscoveryAuditSuperseded(auditId: string, replacementAuditId: string, reason: string): Promise<boolean>;

  // Traçabilité: conserver CHAQUE version générée (TXT + HTML)
  createReportArtifact(
    input: Omit<ReportArtifact, "id" | "createdAt"> & { createdAt?: Date },
    options?: { strict?: boolean },
  ): Promise<ReportArtifact>;

  // Promo codes
  getPromoCode(code: string): Promise<PromoCode | undefined>;
  getAllPromoCodes(): Promise<PromoCode[]>;
  createPromoCode(promo: Omit<PromoCode, "id" | "createdAt" | "currentUses">): Promise<PromoCode>;
  updatePromoCode(id: string, data: Partial<PromoCode>): Promise<PromoCode | undefined>;
  incrementPromoCodeUse(code: string): Promise<void>;
  validatePromoCode(code: string, auditType: string): Promise<{ valid: boolean; discount: number; error?: string }>;

  // Email tracking
  createEmailTracking(auditId: string, emailType: string, recipientEmail?: string): Promise<EmailTracking>;
  markEmailOpened(trackingId: string): Promise<void>;
  markEmailTrackingConvertedByEmail?(email: string, amountCents: number, conversionType: string, withinDays?: number): Promise<number>;
  getEmailTrackingForAudit(auditId: string): Promise<EmailTracking[]>;
  /** Returns true if a peptides delivery email (subject contains "protocole peptides") has been sent to this recipient */
  hasPeptidesDeliveryEmailBeenSent(email: string): Promise<boolean>;
  hasPeptidesOrderConfirmationBeenSent(email: string): Promise<boolean>;
  /** Atomic lease for the immediate paid-order confirmation. Prevents webhook,
   * browser confirmation and multi-instance recovery from sending concurrently. */
  claimPeptidesOrderConfirmation(orderId: string, leaseMs?: number): Promise<boolean>;
  finalizePeptidesOrderConfirmation(orderId: string, state: "ACCEPTED" | "FAILED" | "UNKNOWN"): Promise<void>;
  /** Atomic lease for one report delivery. The report id is part of the claim so
   * an in-place replacement cannot accidentally authorize an older artifact. */
  claimPeptidesReportDelivery(orderId: string, reportId: string, leaseMs?: number): Promise<boolean>;
  finalizePeptidesReportDelivery(orderId: string, reportId: string, state: "ACCEPTED" | "FAILED" | "UNKNOWN"): Promise<void>;
  resetPeptidesReportDeliveryCircuit(orderId: string, reportId: string): Promise<boolean>;
  /** Returns true if a blood analysis HTML email has already been tracked for this report (audit_id) */
  hasBloodAnalysisEmailBeenSentForReport(reportId: string): Promise<boolean>;
  /** Returns true if a blood analysis HTML email was sent to this recipient within the last N hours */
  hasBloodAnalysisEmailBeenSentRecently(email: string, withinHours: number): Promise<boolean>;
  hasUserLeftReview(auditId: string): Promise<boolean>;

  // Orders
  createOrder(input: CreateOrderInput): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByStripeSession(sessionId: string, forUpdate?: boolean): Promise<Order | undefined>;
  getOrderByPaymentIntent(paymentIntentId: string): Promise<Order | undefined>;
  getOrderByPaypalOrderId(paypalOrderId: string): Promise<Order | undefined>;
  getOrdersByUserId(userId: string): Promise<Order[]>;
  getOrdersByEmail(email: string): Promise<Order[]>;
  getAllOrders(opts?: { limit?: number; offset?: number; status?: OrderStatusEnum; productType?: ProductTypeEnum; email?: string }): Promise<{ orders: Order[]; total: number }>;
  updateOrder(id: string, data: Partial<Order>): Promise<Order | undefined>;
  claimOrderForAudit(orderId: string, auditId: string): Promise<boolean>;
  /** Atomic CAS: set metadata.peptidesReportId only if currently null/absent. Returns true if we won the race. */
  claimPeptidesReportSlot(orderId: string, reportId: string): Promise<boolean>;
  /** Atomic JSONB merge: set a single metadata key without stomping concurrently-set keys. */
  setOrderMetadataKey(orderId: string, key: string, value: unknown): Promise<boolean>;
  /** Human-reviewed retry path: clears the persisted generation circuit on an undelivered order. */
  resetPeptidesGenerationCircuit(orderId: string): Promise<boolean>;
  /**
   * Atomically reserves one bounded Peptides provider attempt. The reservation
   * and cost budget survive restarts because they live in order metadata.
   */
  claimPeptidesGenerationAttempt(
    orderId: string,
    config: PeptidesGenerationCircuitConfig,
  ): Promise<PeptidesGenerationAttemptClaim | null>;
  /** Opens the persistent circuit after any failed/source-blocked generation. */
  markPeptidesGenerationNeedsReview(
    orderId: string,
    reason: string,
    error: string,
  ): Promise<boolean>;
  /** Cross-order protection: true if ANY paid Peptides order for this email already has a reportId.
   *  Catches duplicate-payment case (2 orders same email) ,  without this, each order wins its own
   *  CAS and generates a separate report (alexm2220 incident 2026-03-30). */
  hasAnyPeptidesReportForEmail(email: string): Promise<{ exists: boolean; existingOrderId?: string; existingReportId?: string }>;
  /** Atomic CAS: transition audit to GENERATING iff current status allows. Prevents two concurrent generators. */
  claimAuditForGeneration(auditId: string): Promise<boolean>;
  /** Atomic CAS: transition audit to SENDING iff reportSentAt IS NULL and status in (READY,SCHEDULED). Prevents two concurrent senders. */
  claimAuditForSending(auditId: string): Promise<boolean>;
  /** Finalize send: success => SENT + reportSentAt=NOW(); failure => revert SENDING → READY. */
  finalizeAuditSend(auditId: string, sent: boolean): Promise<void>;
  /** Returns true if a sendReportReadyEmail row exists in email_tracking with non-failed status. */
  hasReportReadyEmailBeenSent(auditId: string): Promise<boolean>;
  /** Idempotency: find an existing audit for same (email, type) created in the last `minutes` minutes. */
  findRecentAuditByEmailAndType(email: string, type: string, minutes: number): Promise<Audit | undefined>;

  // Promo code usages
  createPromoCodeUsage(input: Omit<PromoCodeUsage, "id" | "usedAt">): Promise<PromoCodeUsage>;
  getPromoCodeUsagesByCode(promoCode: string): Promise<PromoCodeUsage[]>;
  getPromoCodeUsagesByEmail(email: string): Promise<PromoCodeUsage[]>;

  // Abandonment reminders
  getIncompleteQuestionnaires(): Promise<QuestionnaireProgress[]>;
  hasRecentReminder(email: string, hours: number): Promise<boolean>;
  logAbandonmentReminder(data: {
    email: string;
    percentComplete: number;
    hoursSinceStart: number;
    priorityScore: number;
    resumeToken?: string;
  }): Promise<void>;
  getAbandonmentReminderByToken?(token: string): Promise<{ email: string; sent_at: Date } | null>;
  markReminderClicked?(token: string): Promise<void>;
  markReminderOpened?(token: string): Promise<void>;
  markReminderConvertedByEmail?(email: string, amountCents: number, withinDays?: number): Promise<number>;
  getAbandonmentStats(days: number): Promise<{
    last24h: { sent: number; openRate: number; clickRate: number; conversions: number };
    last7days: { sent: number; openRate: number; conversions: number; revenue: number };
    pending: { count: number; highPriority: number; mediumPriority: number; lastChance: number };
    recommendations: string[];
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private audits: Map<string, Audit>;
  private progress: Map<string, QuestionnaireProgress>;
  private burnoutProgress: Map<string, BurnoutProgress>;
  private burnoutReports: Map<string, BurnoutReportRecord>;
  private bloodReports: Map<string, BloodReportRecord>;
  private bloodTests: Map<string, BloodTestRecord>;
  private magicTokens: Map<string, MagicToken>;
  private reportJobs: Map<string, ReportJob>;
  private reportArtifacts: ReportArtifact[];
  private promoCodes: Map<string, PromoCode>;
  private emailTrackings: Map<string, EmailTracking>;

  constructor() {
    this.users = new Map();
    this.audits = new Map();
    this.progress = new Map();
    this.burnoutProgress = new Map();
    this.burnoutReports = new Map();
    this.bloodReports = new Map();
    this.bloodTests = new Map();
    this.magicTokens = new Map();
    this.reportJobs = new Map();
    this.reportArtifacts = [];
    this.promoCodes = new Map();
    this.emailTrackings = new Map();

    // Default promo codes
    const analyse20: PromoCode = {
      id: randomUUID(),
      code: "ANALYSE20",
      discountPercent: 20,
      description: "Code promo 20% sur toutes les analyses APEXLABS",
      validFor: "ALL",
      maxUses: null,
      currentUses: 0,
      isActive: true,
      expiresAt: null,
      createdAt: new Date(),
    };

    // Code promo spécial abandons -30% (offres payantes uniquement)
    const retour30: PromoCode = {
      id: randomUUID(),
      code: "RETOUR30",
      discountPercent: 30,
      description: "Code promo 30% abandons - Anabolic/Ultimate/Blood uniquement",
      validFor: "PREMIUM", // On va gérer ELITE et BLOOD_ANALYSIS manuellement
      maxUses: null,
      currentUses: 0,
      isActive: true,
      expiresAt: null,
      createdAt: new Date(),
    };

    const welcome20: PromoCode = {
      id: randomUUID(),
      code: "WELCOME20",
      discountPercent: 20,
      description: "Code bienvenue -20% sur Anabolic, Ultimate et Blood (email relance J+7 post-Discovery)",
      validFor: "ALL",
      maxUses: null,
      currentUses: 0,
      isActive: true,
      expiresAt: null,
      createdAt: new Date(),
    };

    this.promoCodes.set("ANALYSE20", analyse20);
    this.promoCodes.set("RETOUR30", retour30);
    this.promoCodes.set("WELCOME20", welcome20);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    return Array.from(this.users.values()).find(
      (user) => user.email.trim().toLowerCase() === normalizedEmail
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const normalizedEmail = insertUser.email.trim().toLowerCase();
    const user: User = {
      ...insertUser,
      id,
      email: normalizedEmail,
      credits: insertUser.credits ?? DEFAULT_USER_CREDITS,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async adjustUserCredits(id: string, delta: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const current = user.credits ?? 0;
    const next = current + delta;
    if (next < 0) return undefined;
    const updated = { ...user, credits: next };
    this.users.set(id, updated);
    return updated;
  }

  async getAudit(id: string): Promise<Audit | undefined> {
    return this.audits.get(id);
  }

  async getAuditsByUserId(userId: string): Promise<Audit[]> {
    return Array.from(this.audits.values()).filter((audit) => audit.userId === userId);
  }

  async getAuditsByEmail(email: string): Promise<Audit[]> {
    const user = await this.getUserByEmail(email);
    if (!user) return [];
    return this.getAuditsByUserId(user.id);
  }

  async getPendingAudits(): Promise<Audit[]> {
    return Array.from(this.audits.values()).filter(
      (audit) => audit.reportDeliveryStatus === "PENDING"
    );
  }

  async getAllAudits(): Promise<Audit[]> {
    return Array.from(this.audits.values()).sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }

  async getAllAuditsLight(): Promise<Audit[]> {
    // MemStorage fallback ,  no JSONB in memory, return full rows
    return this.getAllAudits();
  }

  async getAllAuditSummaries(): Promise<AuditSummary[]> {
    const audits = await this.getAllAudits();
    return audits.map((audit) => ({
      id: audit.id,
      userId: audit.userId,
      email: audit.email,
      type: audit.type,
      status: audit.status,
      reportDeliveryStatus: audit.reportDeliveryStatus,
      reportScheduledFor: audit.reportScheduledFor,
      reportSentAt: audit.reportSentAt,
      createdAt: audit.createdAt,
      completedAt: audit.completedAt,
    }));
  }

  async getAdminAuditSummariesPage(limit: number, offset: number): Promise<AdminAuditSummaryPage> {
    const audits = (await this.getAllAuditSummaries()).map((audit) => ({
      id: audit.id,
      email: audit.email,
      type: audit.type,
      status: audit.status,
      reportDeliveryStatus: audit.reportDeliveryStatus ?? null,
      reportSentAt: audit.reportSentAt ?? null,
      createdAt: audit.createdAt,
      completedAt: audit.completedAt ?? null,
    }));
    const blood = (await this.getAllBloodReportSummaries()).map((report) => ({
      id: report.id,
      email: report.email,
      type: "BLOOD_ANALYSIS",
      status: "COMPLETED",
      reportDeliveryStatus: "SENT",
      reportSentAt: report.createdAt,
      createdAt: report.createdAt,
      completedAt: report.createdAt,
    }));
    const items = [...audits, ...blood].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { items: items.slice(offset, offset + limit), total: items.length };
  }

  async getScheduledAuditsForDelivery(): Promise<Audit[]> {
    const now = new Date();
    return Array.from(this.audits.values()).filter(
      (a) =>
        a.reportDeliveryStatus === "SCHEDULED" &&
        a.reportScheduledFor &&
        new Date(a.reportScheduledFor) <= now
    );
  }

  async createAudit(
    input: InsertAudit & { email: string; responses: Record<string, unknown> }
  ): Promise<Audit> {
    if (input.type === "GRATUIT") {
      throw new Error("DISCOVERY_AUDIT_REQUIRES_TRANSACTIONAL_CREATION");
    }
    return this.createAuditUnchecked(input);
  }

  async createDiscoveryAudit(
    input: InsertAudit & { email: string; responses: Record<string, unknown> }
  ): Promise<Audit> {
    if (input.type !== "GRATUIT") throw new Error("DISCOVERY_AUDIT_TYPE_REQUIRED");
    return this.createAuditUnchecked(input);
  }

  private async createAuditUnchecked(
    input: InsertAudit & { email: string; responses: Record<string, unknown> }
  ): Promise<Audit> {
    // Same lowercase-normalize policy as PgStorage.createAudit, keeps the
    // in-memory backend consistent with prod when used in dev/tests.
    const normalizedEmail = input.email.trim().toLowerCase();
    let user = await this.getUserByEmail(normalizedEmail);
    if (!user) {
      user = await this.createUser({ email: normalizedEmail });
    }

    const id = randomUUID();
    const scores = this.calculateScores(input.responses);

    const DELIVERY_DELAYS_HOURS: Record<string, number> = {
      GRATUIT: 0,
      PREMIUM: 24,
      ELITE: 24,
      BURNOUT: 0,
      BLOOD_ANALYSIS: 0,
    };
    const delayHours = DELIVERY_DELAYS_HOURS[input.type] ?? 24;
    const scheduledDate = delayHours > 0
      ? new Date(Date.now() + delayHours * 60 * 60 * 1000)
      : null;

    const audit: Audit = {
      id,
      userId: user.id,
      email: normalizedEmail,
      type: input.type,
      status: "COMPLETED",
      responses: input.responses,
      scores,
      reportDeliveryStatus: "PENDING",
      reportScheduledFor: scheduledDate,
      createdAt: new Date(),
      completedAt: new Date(),
    };

    this.audits.set(id, audit);
    return audit;
  }

  async updateAudit(id: string, data: Partial<Audit>): Promise<Audit | undefined> {
    const audit = this.audits.get(id);
    if (!audit) return undefined;
    if (isDiscoverySupersededTerminal(audit)) return undefined;
    if (audit.type === "GRATUIT") return undefined;

    const updated = { ...audit, ...data };
    this.audits.set(id, updated);
    return updated;
  }

  async getProgress(email: string): Promise<QuestionnaireProgress | undefined> {
    return this.progress.get(email);
  }

  async saveProgress(input: SaveProgressInput): Promise<QuestionnaireProgress> {
    const existing = this.progress.get(input.email);
    const totalSections = input.totalSections ?? 13;
    const percentComplete = Math.round(((input.currentSection + 1) / totalSections) * 100);

    const progress: QuestionnaireProgress = {
      id: existing?.id || randomUUID(),
      email: input.email,
      currentSection: input.currentSection,
      totalSections,
      percentComplete,
      responses: input.responses,
      status: input.currentSection >= totalSections - 1 ? "COMPLETED" : "IN_PROGRESS",
      startedAt: existing?.startedAt || new Date(),
      lastActivityAt: new Date(),
    };

    this.progress.set(input.email, progress);
    return progress;
  }

  async deleteProgress(email: string): Promise<void> {
    this.progress.delete(email);
  }

  async getAllIncompleteProgress(): Promise<QuestionnaireProgress[]> {
    return Array.from(this.progress.values())
      .filter(p => p.status === "IN_PROGRESS")
      .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
  }

  async getBurnoutProgress(email: string): Promise<BurnoutProgress | undefined> {
    return this.burnoutProgress.get(email);
  }

  async saveBurnoutProgress(input: SaveBurnoutProgressInput): Promise<BurnoutProgress> {
    const existing = this.burnoutProgress.get(input.email);
    const totalSections = input.totalSections ?? 6;
    const percentComplete = Math.round(((input.currentSection + 1) / totalSections) * 100);

    const progress: BurnoutProgress = {
      id: existing?.id || randomUUID(),
      email: input.email,
      currentSection: input.currentSection,
      totalSections,
      percentComplete,
      responses: input.responses,
      status: input.currentSection >= totalSections - 1 ? "COMPLETED" : "IN_PROGRESS",
      startedAt: existing?.startedAt || new Date(),
      lastActivityAt: new Date(),
    };

    this.burnoutProgress.set(input.email, progress);
    return progress;
  }

  async createBurnoutReport(input: { email: string; responses: Record<string, unknown>; report: unknown }): Promise<BurnoutReportRecord> {
    const id = randomUUID();
    const record: BurnoutReportRecord = {
      id,
      email: input.email,
      responses: input.responses,
      report: input.report,
      createdAt: new Date(),
    };
    this.burnoutReports.set(id, record);
    return record;
  }

  async getBurnoutReport(id: string): Promise<BurnoutReportRecord | undefined> {
    return this.burnoutReports.get(id);
  }

  async updateBurnoutReport(id: string, report: unknown): Promise<BurnoutReportRecord | undefined> {
    const existing = this.burnoutReports.get(id);
    if (!existing) return undefined;
    const updated: BurnoutReportRecord = {
      ...existing,
      report,
    };
    this.burnoutReports.set(id, updated);
    return updated;
  }

  async getAllBurnoutReports(): Promise<BurnoutReportRecord[]> {
    return Array.from(this.burnoutReports.values()).sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }

  async getPeptidesReportsByEmail(email: string): Promise<BurnoutReportRecord[]> {
    const prefixed = `peptides::${email.trim().toLowerCase()}`;
    return Array.from(this.burnoutReports.values())
      .filter(r => String(r.email ?? "").toLowerCase() === prefixed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createBloodReport(input: { email: string; profile: Record<string, unknown>; markers: unknown[]; analysis: unknown; aiReport: string }): Promise<BloodReportRecord> {
    const id = randomUUID();
    const record: BloodReportRecord = {
      id,
      email: input.email,
      profile: input.profile,
      markers: input.markers,
      analysis: input.analysis,
      aiReport: input.aiReport,
      deliveryStatus: "PENDING",
      reportScheduledFor: null,
      emailSentAt: null,
      createdAt: new Date(),
    };
    this.bloodReports.set(id, record);
    return record;
  }

  async getBloodReport(id: string): Promise<BloodReportRecord | undefined> {
    return this.bloodReports.get(id);
  }

  async updateBloodReport(
    id: string,
    data: Partial<BloodReportRecord>
  ): Promise<BloodReportRecord | undefined> {
    const existing = this.bloodReports.get(id);
    if (!existing) return undefined;
    const updated: BloodReportRecord = {
      ...existing,
      ...data,
    };
    this.bloodReports.set(id, updated);
    return updated;
  }

  async getAllBloodReports(): Promise<BloodReportRecord[]> {
    return Array.from(this.bloodReports.values()).sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }

  async getAllBloodReportSummaries(): Promise<BloodReportSummary[]> {
    const reports = await this.getAllBloodReports();
    return reports.map((report) => ({
      id: report.id,
      email: report.email,
      deliveryStatus: report.deliveryStatus,
      emailSentAt: report.emailSentAt,
      createdAt: report.createdAt,
    }));
  }

  async getScheduledBloodReportsForDelivery(): Promise<BloodReportRecord[]> {
    const now = new Date();
    return Array.from(this.bloodReports.values()).filter(
      (r) =>
        r.deliveryStatus === "SCHEDULED" &&
        r.reportScheduledFor &&
        new Date(r.reportScheduledFor) <= now &&
        r.aiReport
    );
  }

  async createBloodTest(
    input: Omit<BloodTestRecord, "id" | "createdAt"> & { createdAt?: Date }
  ): Promise<BloodTestRecord> {
    const id = randomUUID();
    const record: BloodTestRecord = {
      id,
      userId: input.userId,
      fileName: input.fileName,
      fileType: input.fileType,
      fileSize: input.fileSize,
      status: input.status,
      error: input.error ?? null,
      markers: input.markers || [],
      analysis: input.analysis || {},
      patientProfile: input.patientProfile || {},
      globalScore: input.globalScore ?? null,
      globalLevel: input.globalLevel ?? null,
      createdAt: input.createdAt || new Date(),
      completedAt: input.completedAt ?? null,
    };
    this.bloodTests.set(id, record);
    return record;
  }

  async updateBloodTest(id: string, data: Partial<BloodTestRecord>): Promise<BloodTestRecord | undefined> {
    const existing = this.bloodTests.get(id);
    if (!existing) return undefined;
    const updated: BloodTestRecord = {
      ...existing,
      ...data,
    };
    this.bloodTests.set(id, updated);
    return updated;
  }

  async getBloodTest(id: string): Promise<BloodTestRecord | undefined> {
    return this.bloodTests.get(id);
  }

  async getBloodTestsByUserId(userId: string): Promise<BloodTestRecord[]> {
    return Array.from(this.bloodTests.values())
      .filter((test) => test.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private calculateScores(responses: Record<string, unknown>): Record<string, number> {
    return calculateScoresFromResponses(responses);
  }

  async createMagicToken(email: string): Promise<string> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const normalizedEmail = email.trim().toLowerCase();
    this.magicTokens.set(token, { token, email: normalizedEmail, expiresAt });
    return token;
  }

  async verifyMagicToken(token: string): Promise<string | null> {
    const magicToken = this.magicTokens.get(token);
    if (!magicToken) return null;
    if (new Date() > magicToken.expiresAt) {
      this.magicTokens.delete(token);
      return null;
    }
    this.magicTokens.delete(token);
    return magicToken.email;
  }

  async getReportJob(auditId: string): Promise<ReportJob | undefined> {
    return this.reportJobs.get(auditId);
  }
  async getActiveReportJobs(): Promise<ReportJob[]> {
    return Array.from(this.reportJobs.values()).filter((job) => {
      const audit = this.audits.get(job.auditId);
      return audit?.type !== "GRATUIT" && ["pending", "generating"].includes(job.status);
    });
  }
  async createOrUpdateReportJob(job: Partial<ReportJob> & { auditId: string }): Promise<ReportJob> {
    const audit = this.audits.get(job.auditId);
    if (!audit || audit.type === "GRATUIT") {
      throw new Error("DISCOVERY_REPORT_JOB_REQUIRES_TRANSACTIONAL_WORKFLOW");
    }
    const now = new Date();
    const existing = this.reportJobs.get(job.auditId);
    const updated: ReportJob = {
      auditId: job.auditId,
      status: job.status ?? existing?.status ?? "pending",
      progress: job.progress ?? existing?.progress ?? 0,
      currentSection: job.currentSection ?? existing?.currentSection ?? "",
      error: job.error !== undefined ? job.error : existing?.error ?? null,
      attemptCount: job.attemptCount ?? existing?.attemptCount ?? 0,
      startedAt: existing?.startedAt ?? now,
      updatedAt: now,
      lastProgressAt: now,
      completedAt: job.completedAt !== undefined ? job.completedAt : existing?.completedAt ?? null,
    };
    this.reportJobs.set(job.auditId, updated);
    return updated;
  }
  async claimPendingReportJob(auditId: string): Promise<ReportJob | undefined> {
    const audit = this.audits.get(auditId);
    const job = this.reportJobs.get(auditId);
    if (!audit || audit.type === "GRATUIT" || !job || job.status !== "pending") return undefined;
    const now = new Date();
    const claimed = { ...job, status: "generating" as ReportJobStatusEnum, updatedAt: now, lastProgressAt: now };
    this.reportJobs.set(auditId, claimed);
    return claimed;
  }
  async updateReportJobProgress(auditId: string, progress: number, currentSection: string): Promise<void> {
    const audit = this.audits.get(auditId);
    const job = this.reportJobs.get(auditId);
    if (!job || audit?.type === "GRATUIT") return;
    const now = new Date();
    this.reportJobs.set(auditId, { ...job, progress, currentSection, updatedAt: now, lastProgressAt: now });
  }
  async completeReportJob(auditId: string): Promise<void> {
    const audit = this.audits.get(auditId);
    const job = this.reportJobs.get(auditId);
    if (!job || audit?.type === "GRATUIT") return;
    const now = new Date();
    this.reportJobs.set(auditId, {
      ...job,
      status: "completed",
      progress: 100,
      currentSection: "Rapport termine !",
      completedAt: now,
      updatedAt: now,
    });
  }
  async failReportJob(auditId: string, error: string): Promise<void> {
    const audit = this.audits.get(auditId);
    const job = this.reportJobs.get(auditId);
    if (!job || audit?.type === "GRATUIT") return;
    const now = new Date();
    this.reportJobs.set(auditId, { ...job, status: "failed", error, completedAt: now, updatedAt: now });
  }
  async deleteReportJob(auditId: string): Promise<void> {
    if (this.audits.get(auditId)?.type === "GRATUIT") return;
    this.reportJobs.delete(auditId);
  }
  async hasReportArtifact(auditId: string): Promise<boolean> {
    return this.reportArtifacts.some((artifact) => artifact.auditId === auditId);
  }
  async enqueueMissingDiscoveryReportJob(auditId: string, reason: string): Promise<boolean> {
    const audit = this.audits.get(auditId);
    if (!audit || audit.type !== "GRATUIT" || audit.reportDeliveryStatus !== "NEEDS_REVIEW") return false;
    if (!isDiscoveryTransactionalAutomationEligible(audit)) return false;
    if ((audit as any).reportSentAt || this.hasStoredDiscoveryArtifact(audit)) return false;
    if (await this.getReportJob(auditId)) return false;
    audit.narrativeReport = {
      ...((audit.narrativeReport && typeof audit.narrativeReport === "object") ? audit.narrativeReport as object : {}),
      recovery: { version: 1, disposition: "enqueued", reason, decidedAt: new Date().toISOString() },
    };
    const now = new Date();
    this.reportJobs.set(auditId, {
      auditId,
      status: "pending",
      progress: 0,
      currentSection: "Reprise Discovery en attente...",
      error: null,
      attemptCount: 0,
      startedAt: now,
      updatedAt: now,
      lastProgressAt: now,
      completedAt: null,
    });
    return true;
  }
  async markDiscoveryAuditSuperseded(auditId: string, replacementAuditId: string, reason: string): Promise<boolean> {
    const audit = this.audits.get(auditId);
    const replacement = this.audits.get(replacementAuditId);
    if (
      !audit
      || !replacement
      || audit.type !== "GRATUIT"
      || replacement.type !== "GRATUIT"
      || audit.email.trim().toLowerCase() !== replacement.email.trim().toLowerCase()
      || audit.reportDeliveryStatus !== "NEEDS_REVIEW"
      || (audit as any).reportSentAt
      || !isDiscoveryTransactionalAutomationEligible(audit)
      || this.hasStoredDiscoveryArtifact(audit)
      || this.reportJobs.has(auditId)
    ) return false;
    audit.reportDeliveryStatus = "SUPERSEDED" as any;
    audit.narrativeReport = {
      ...((audit.narrativeReport && typeof audit.narrativeReport === "object") ? audit.narrativeReport as object : {}),
      recovery: {
        version: 1,
        disposition: "superseded",
        reason,
        replacementAuditId,
        decidedAt: new Date().toISOString(),
      },
    };
    return true;
  }

  private hasStoredDiscoveryArtifact(audit: Audit): boolean {
    const narrative = audit.narrativeReport && typeof audit.narrativeReport === "object"
      ? audit.narrativeReport as Record<string, unknown>
      : {};
    return Boolean(
      String((audit as any).reportTxt || "").trim() ||
      String((audit as any).reportHtml || "").trim() ||
      Array.isArray(narrative.sections) ||
      String(narrative.txt || "").trim() ||
      String(narrative.html || "").trim() ||
      this.reportArtifacts.some((artifact) => artifact.auditId === audit.id)
    );
  }

  async createReportArtifact(
    input: Omit<ReportArtifact, "id" | "createdAt"> & { createdAt?: Date },
    _options?: { strict?: boolean },
  ): Promise<ReportArtifact> {
    const audit = this.audits.get(input.auditId);
    if (input.tier === "GRATUIT" || audit?.type === "GRATUIT") {
      throw new Error("DISCOVERY_ARTIFACT_REQUIRES_TRANSACTIONAL_PERSISTENCE");
    }
    const createdAt = input.createdAt ?? new Date();
    const art: ReportArtifact = {
      id: randomUUID(),
      auditId: input.auditId,
      tier: input.tier,
      engine: input.engine,
      model: input.model,
      txt: input.txt,
      html: input.html,
      createdAt,
    };
    this.reportArtifacts.push(art);
    return art;
  }

  // Promo codes methods (MemStorage)
  async getPromoCode(code: string): Promise<PromoCode | undefined> {
    return this.promoCodes.get(code.toUpperCase());
  }

  async getAllPromoCodes(): Promise<PromoCode[]> {
    return Array.from(this.promoCodes.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createPromoCode(promo: Omit<PromoCode, "id" | "createdAt" | "currentUses">): Promise<PromoCode> {
    const newPromo: PromoCode = {
      ...promo,
      id: randomUUID(),
      currentUses: 0,
      createdAt: new Date(),
    };
    this.promoCodes.set(promo.code.toUpperCase(), newPromo);
    return newPromo;
  }

  async updatePromoCode(id: string, data: Partial<PromoCode>): Promise<PromoCode | undefined> {
    const promo = Array.from(this.promoCodes.values()).find(p => p.id === id);
    if (!promo) return undefined;
    const updated = { ...promo, ...data };
    this.promoCodes.set(updated.code.toUpperCase(), updated);
    return updated;
  }

  async incrementPromoCodeUse(code: string): Promise<void> {
    const promo = this.promoCodes.get(code.toUpperCase());
    if (promo) {
      promo.currentUses++;
    }
  }

  async validatePromoCode(code: string, auditType: string): Promise<{ valid: boolean; discount: number; error?: string }> {
    const promo = this.promoCodes.get(code.toUpperCase());
    if (!promo) {
      return { valid: false, discount: 0, error: "Code promo invalide" };
    }
    if (!promo.isActive) {
      return { valid: false, discount: 0, error: "Ce code promo n'est plus actif" };
    }
    if (promo.expiresAt && new Date() > promo.expiresAt) {
      return { valid: false, discount: 0, error: "Ce code promo a expiré" };
    }
    if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
      return { valid: false, discount: 0, error: "Ce code promo a atteint son nombre maximum d'utilisations" };
    }
    if (promo.validFor !== "ALL" && promo.validFor !== auditType) {
      return { valid: false, discount: 0, error: `Ce code promo n'est pas valide pour l'analyse ${auditType}` };
    }
    return { valid: true, discount: promo.discountPercent };
  }

  // Email tracking methods (MemStorage)
  async createEmailTracking(auditId: string, emailType: string, recipientEmail?: string): Promise<EmailTracking> {
    const tracking: EmailTracking = {
      id: randomUUID(),
      auditId,
      emailType,
      recipientEmail: recipientEmail || "",
      sentAt: new Date(),
      openedAt: null,
      clickedAt: null,
    };
    this.emailTrackings.set(tracking.id, tracking);
    return tracking;
  }

  async markEmailOpened(trackingId: string): Promise<void> {
    const tracking = this.emailTrackings.get(trackingId);
    if (tracking && !tracking.openedAt) {
      tracking.openedAt = new Date();
    }
  }

  async markEmailTrackingConvertedByEmail(
    email: string,
    _amountCents: number,
    conversionType: string,
    withinDays: number = 14,
  ): Promise<number> {
    const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;
    let updated = 0;
    for (const tracking of this.emailTrackings.values()) {
      if (
        String(tracking.recipientEmail || "").toLowerCase() === email.toLowerCase()
        && !tracking.converted
        && new Date(tracking.sentAt).getTime() >= cutoff
      ) {
        tracking.converted = new Date();
        tracking.conversionType = conversionType;
        updated++;
      }
    }
    return updated;
  }

  async getEmailTrackingForAudit(auditId: string): Promise<EmailTracking[]> {
    return Array.from(this.emailTrackings.values()).filter(t => t.auditId === auditId);
  }

  async hasPeptidesDeliveryEmailBeenSent(email: string): Promise<boolean> {
    return Array.from(this.emailTrackings.values()).some(
      (t: any) => String(t.recipientEmail || "").toLowerCase() === email.toLowerCase()
        && (
          t.emailType === "sendPeptidesReportReadyEmail"
          || (t.emailType === "sendCTAEmail" && /protocole peptides|peptides personnalis/i.test(String(t.subject || "")))
        )
        && !["failed", "auth_failed", "unsubscribed"].includes(String(t.sendpulseStatus || "").toLowerCase())
    );
  }

  async hasPeptidesOrderConfirmationBeenSent(email: string): Promise<boolean> {
    return Array.from(this.emailTrackings.values()).some(
      (t: any) => String(t.recipientEmail || "").toLowerCase() === email.toLowerCase()
        && t.emailType === "sendPeptidesOrderConfirmation"
        && !["failed", "auth_failed", "unsubscribed"].includes(String(t.sendpulseStatus || "").toLowerCase())
    );
  }

  async claimPeptidesOrderConfirmation(orderId: string, leaseMs = 10 * 60 * 1000): Promise<boolean> {
    const order = this.memOrders.get(orderId);
    if (!order || order.productType !== "PEPTIDES_ENGINE" || order.status !== "paid") return false;
    const meta = ((order.metadata as any) ?? {}) as Record<string, any>;
    if (meta.peptidesEmailHold === true || meta.peptidesEmailHold === "true") return false;
    if (["ACCEPTED", "UNKNOWN"].includes(String(meta.peptidesConfirmationState || "").toUpperCase())) return false;
    const leaseUntil = new Date(String(meta.peptidesConfirmationLeaseUntil || 0)).getTime();
    if (String(meta.peptidesConfirmationState || "").toUpperCase() === "SENDING" && leaseUntil > Date.now()) return false;
    if (Number(meta.peptidesConfirmationAttempts || 0) >= 3) return false;
    order.metadata = {
      ...meta,
      peptidesConfirmationState: "SENDING",
      peptidesConfirmationAttempts: Number(meta.peptidesConfirmationAttempts || 0) + 1,
      peptidesConfirmationLeaseUntil: new Date(Date.now() + leaseMs).toISOString(),
      peptidesConfirmationStartedAt: new Date().toISOString(),
    } as any;
    return true;
  }

  async finalizePeptidesOrderConfirmation(orderId: string, state: "ACCEPTED" | "FAILED" | "UNKNOWN"): Promise<void> {
    const order = this.memOrders.get(orderId);
    if (!order) return;
    order.metadata = {
      ...((order.metadata as any) ?? {}),
      peptidesConfirmationState: state,
      peptidesConfirmationLeaseUntil: "",
      peptidesConfirmationCompletedAt: new Date().toISOString(),
    } as any;
  }

  async claimPeptidesReportDelivery(orderId: string, reportId: string, leaseMs = 10 * 60 * 1000): Promise<boolean> {
    const order = this.memOrders.get(orderId);
    if (!order || order.productType !== "PEPTIDES_ENGINE" || order.status !== "paid") return false;
    const meta = ((order.metadata as any) ?? {}) as Record<string, any>;
    if (String(meta.peptidesReportId || "") !== reportId) return false;
    if (meta.peptidesEmailHold === true || meta.peptidesEmailHold === "true") return false;
    if (["ACCEPTED", "UNKNOWN"].includes(String(meta.peptidesDeliveryState || "").toUpperCase())) return false;
    const leaseUntil = new Date(String(meta.peptidesDeliveryLeaseUntil || 0)).getTime();
    if (String(meta.peptidesDeliveryState || "").toUpperCase() === "SENDING" && leaseUntil > Date.now()) return false;
    if (Number(meta.peptidesDeliveryAttempts || 0) >= 3) return false;
    order.metadata = {
      ...meta,
      peptidesDeliveryState: "SENDING",
      peptidesDeliveryReportId: reportId,
      peptidesDeliveryAttempts: Number(meta.peptidesDeliveryAttempts || 0) + 1,
      peptidesDeliveryLeaseUntil: new Date(Date.now() + leaseMs).toISOString(),
      peptidesDeliveryStartedAt: new Date().toISOString(),
    } as any;
    return true;
  }

  async finalizePeptidesReportDelivery(orderId: string, reportId: string, state: "ACCEPTED" | "FAILED" | "UNKNOWN"): Promise<void> {
    const order = this.memOrders.get(orderId);
    if (!order || String((order.metadata as any)?.peptidesReportId || "") !== reportId) return;
    order.metadata = {
      ...((order.metadata as any) ?? {}),
      peptidesDeliveryState: state,
      peptidesDeliveryReportId: reportId,
      peptidesDeliveryLeaseUntil: "",
      peptidesDeliveryCompletedAt: new Date().toISOString(),
    } as any;
  }

  async resetPeptidesReportDeliveryCircuit(orderId: string, reportId: string): Promise<boolean> {
    const order = this.memOrders.get(orderId);
    if (!order || order.productType !== "PEPTIDES_ENGINE" || order.status !== "paid") return false;
    const meta = ((order.metadata as any) ?? {}) as Record<string, any>;
    if (String(meta.peptidesReportId || "") !== reportId) return false;
    if (["ACCEPTED", "UNKNOWN"].includes(String(meta.peptidesDeliveryState || "").toUpperCase())) return false;
    order.metadata = {
      ...meta,
      peptidesDeliveryState: "PENDING",
      peptidesDeliveryReportId: reportId,
      peptidesDeliveryAttempts: 0,
      peptidesDeliveryLeaseUntil: "",
      peptidesDeliveryResetAt: new Date().toISOString(),
    } as any;
    return true;
  }

  async hasBloodAnalysisEmailBeenSentForReport(reportId: string): Promise<boolean> {
    return Array.from(this.emailTrackings.values()).some(
      (t: any) => t.auditId === reportId && t.emailType === "sendBloodAnalysisHtmlEmail"
    );
  }

  async hasBloodAnalysisEmailBeenSentRecently(email: string, withinHours: number): Promise<boolean> {
    const cutoff = Date.now() - withinHours * 60 * 60 * 1000;
    return Array.from(this.emailTrackings.values()).some(
      (t: any) => String(t.recipientEmail || "").toLowerCase() === email.toLowerCase()
        && t.emailType === "sendBloodAnalysisHtmlEmail"
        && new Date(t.sentAt).getTime() >= cutoff
    );
  }

  async hasUserLeftReview(auditId: string): Promise<boolean> {
    // MemStorage doesn't have reviews, always return false
    return false;
  }

  // Orders (MemStorage stubs)
  private memOrders: Map<string, Order> = new Map();
  private memPromoUsages: PromoCodeUsage[] = [];

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const id = randomUUID();
    const productName = input.productName || ProductDisplayNames[input.productType] || input.productType;
    const discountCents = input.discountCents ?? 0;
    const finalAmountCents = input.finalAmountCents ?? Math.max(0, input.amountCents - discountCents);
    const order: Order = {
      id, userId: input.userId || null, email: input.email.trim().toLowerCase(),
      productType: input.productType, productName, amountCents: input.amountCents,
      currency: input.currency || "eur", discountCents, promoCode: input.promoCode || null,
      promoCodeId: input.promoCodeId || null, finalAmountCents,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId || null,
      paypalOrderId: input.paypalOrderId || null,
      stripePaymentIntentId: null, stripeCustomerId: null, status: "pending",
      refundAmountCents: 0, refundReason: null, refundStripeId: null,
      refundedAt: null, refundedBy: null, auditId: null, bloodReportId: null,
      ipAddress: input.ipAddress || null, userAgent: input.userAgent || null,
      metadata: input.metadata || null, createdAt: new Date(), paidAt: null, updatedAt: new Date(),
    };
    this.memOrders.set(id, order);
    return order;
  }
  async getOrder(id: string): Promise<Order | undefined> { return this.memOrders.get(id); }
  async getOrderByStripeSession(sessionId: string, _forUpdate?: boolean): Promise<Order | undefined> {
    return Array.from(this.memOrders.values()).find(o => o.stripeCheckoutSessionId === sessionId);
  }
  async getOrderByPaymentIntent(paymentIntentId: string): Promise<Order | undefined> {
    return Array.from(this.memOrders.values()).find(o => o.stripePaymentIntentId === paymentIntentId);
  }
  async getOrderByPaypalOrderId(paypalOrderId: string): Promise<Order | undefined> {
    return Array.from(this.memOrders.values()).find(o => o.paypalOrderId === paypalOrderId);
  }
  async getOrdersByUserId(userId: string): Promise<Order[]> {
    return Array.from(this.memOrders.values()).filter(o => o.userId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getOrdersByEmail(email: string): Promise<Order[]> {
    const norm = email.trim().toLowerCase();
    return Array.from(this.memOrders.values()).filter(o => o.email === norm).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  async getAllOrders(opts?: { limit?: number; offset?: number; status?: OrderStatusEnum; productType?: ProductTypeEnum; email?: string }): Promise<{ orders: Order[]; total: number }> {
    let list = Array.from(this.memOrders.values());
    if (opts?.status) list = list.filter(o => o.status === opts.status);
    if (opts?.productType) list = list.filter(o => o.productType === opts.productType);
    if (opts?.email) { const e = opts.email.trim().toLowerCase(); list = list.filter(o => o.email === e); }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = list.length;
    const offset = opts?.offset || 0;
    const limit = opts?.limit || 50;
    return { orders: list.slice(offset, offset + limit), total };
  }
  async updateOrder(id: string, data: Partial<Order>): Promise<Order | undefined> {
    const order = this.memOrders.get(id);
    if (!order) return undefined;
    const updated = { ...order, ...data, updatedAt: new Date() };
    this.memOrders.set(id, updated);
    return updated;
  }
  async claimOrderForAudit(orderId: string, auditId: string): Promise<boolean> {
    const order = this.memOrders.get(orderId);
    if (!order || order.auditId) return false;
    order.auditId = auditId;
    order.updatedAt = new Date();
    return true;
  }
  async claimPeptidesReportSlot(orderId: string, reportId: string): Promise<boolean> {
    const order = this.memOrders.get(orderId);
    if (!order) return false;
    const meta = (order.metadata as any) ?? {};
    if (meta.peptidesReportId) return false;
    order.metadata = {
      ...meta,
      peptidesReportId: reportId,
      peptidesGenerationState: "SUCCEEDED",
      peptidesGenerationLeaseUntil: "",
      peptidesGenerationCompletedAt: new Date().toISOString(),
    } as any;
    order.updatedAt = new Date();
    return true;
  }

  async setOrderMetadataKey(orderId: string, key: string, value: unknown): Promise<boolean> {
    const order = this.memOrders.get(orderId);
    if (!order) return false;
    const meta = (order.metadata as any) ?? {};
    order.metadata = { ...meta, [key]: value } as any;
    order.updatedAt = new Date();
    return true;
  }

  async resetPeptidesGenerationCircuit(orderId: string): Promise<boolean> {
    const order = this.memOrders.get(orderId);
    if (!order) return false;
    const meta = ((order.metadata as any) ?? {}) as Record<string, unknown>;
    if (meta.peptidesReportId) return false;
    order.metadata = {
      ...meta,
      peptidesGenerationState: "PENDING",
      peptidesGenerationAttempts: 0,
      peptidesGenerationReservedCostMicroUsd: 0,
      peptidesGenerationLeaseUntil: "",
      peptidesGenerationStartedAt: "",
      peptidesGenerationFailedAt: "",
      peptidesGenerationCompletedAt: "",
      peptidesGenerationLastError: "",
      peptidesGenerationReviewReason: "",
    } as any;
    order.updatedAt = new Date();
    return true;
  }

  async claimPeptidesGenerationAttempt(
    orderId: string,
    config: PeptidesGenerationCircuitConfig,
  ): Promise<PeptidesGenerationAttemptClaim | null> {
    const order = this.memOrders.get(orderId);
    if (!order) return null;
    if (order.productType !== "PEPTIDES_ENGINE" || order.status !== "paid") return null;
    const meta = ((order.metadata as any) ?? {}) as Record<string, any>;
    const attempts = Math.max(0, Number(meta.peptidesGenerationAttempts || 0));
    const reserved = Math.max(0, Number(meta.peptidesGenerationReservedCostMicroUsd || 0));
    const state = String(meta.peptidesGenerationState || "PENDING").toUpperCase();
    const leaseUntilMs = new Date(String(meta.peptidesGenerationLeaseUntil || "")).getTime();
    const nowMs = Date.now();
    let hourlyReserved = 0;
    let dailyReserved = 0;
    for (const candidateOrder of this.memOrders.values()) {
      if (candidateOrder.productType !== "PEPTIDES_ENGINE" || candidateOrder.status !== "paid") continue;
      const candidateMeta = ((candidateOrder.metadata as any) ?? {}) as Record<string, any>;
      const startedAtMs = new Date(String(candidateMeta.peptidesGenerationStartedAt || "")).getTime();
      if (!Number.isFinite(startedAtMs)) continue;
      const candidateReserved = Math.max(
        0,
        Number(candidateMeta.peptidesGenerationReservedCostMicroUsd || 0),
      );
      if (startedAtMs > nowMs - 60 * 60 * 1000) hourlyReserved += candidateReserved;
      if (startedAtMs > nowMs - 24 * 60 * 60 * 1000) dailyReserved += candidateReserved;
    }
    if (meta.peptidesReportId) return null;
    if (state === "NEEDS_REVIEW") return null;
    if (state === "GENERATING" && Number.isFinite(leaseUntilMs) && leaseUntilMs > Date.now()) return null;
    if (attempts >= config.maxAttempts) return null;
    if (reserved + config.attemptBudgetMicroUsd > config.maxBudgetMicroUsd) return null;
    if (hourlyReserved + config.attemptBudgetMicroUsd > config.maxHourlyBudgetMicroUsd) return null;
    if (dailyReserved + config.attemptBudgetMicroUsd > config.maxDailyBudgetMicroUsd) return null;

    const claim: PeptidesGenerationAttemptClaim = {
      attemptCount: attempts + 1,
      reservedCostMicroUsd: reserved + config.attemptBudgetMicroUsd,
      leaseUntil: new Date(Date.now() + config.leaseMs).toISOString(),
    };
    order.metadata = {
      ...meta,
      peptidesGenerationState: "GENERATING",
      peptidesGenerationAttempts: claim.attemptCount,
      peptidesGenerationReservedCostMicroUsd: claim.reservedCostMicroUsd,
      peptidesGenerationLeaseUntil: claim.leaseUntil,
      peptidesGenerationStartedAt: new Date().toISOString(),
      peptidesGenerationLastError: "",
      peptidesGenerationReviewReason: "",
    } as any;
    order.updatedAt = new Date();
    return claim;
  }

  async markPeptidesGenerationNeedsReview(
    orderId: string,
    reason: string,
    error: string,
  ): Promise<boolean> {
    const order = this.memOrders.get(orderId);
    if (!order) return false;
    order.metadata = {
      ...((order.metadata as any) ?? {}),
      peptidesGenerationState: "NEEDS_REVIEW",
      peptidesGenerationReviewReason: reason,
      peptidesGenerationLastError: error,
      peptidesGenerationFailedAt: new Date().toISOString(),
      peptidesGenerationLeaseUntil: "",
    } as any;
    order.updatedAt = new Date();
    return true;
  }

  async hasAnyPeptidesReportForEmail(email: string): Promise<{ exists: boolean; existingOrderId?: string; existingReportId?: string }> {
    const norm = email.trim().toLowerCase();
    for (const order of this.memOrders.values()) {
      if (order.productType !== "PEPTIDES_ENGINE") continue;
      if (order.status !== "paid") continue;
      if (order.email.trim().toLowerCase() !== norm) continue;
      const rid = (order.metadata as any)?.peptidesReportId;
      if (rid) return { exists: true, existingOrderId: order.id, existingReportId: rid };
    }
    return { exists: false };
  }

  async claimAuditForGeneration(auditId: string): Promise<boolean> {
    const audit = this.audits.get(auditId);
    if (!audit) return false;
    if (isDiscoverySupersededTerminal(audit)) return false;
    if (audit.type === "GRATUIT") return false;
    const s = audit.reportDeliveryStatus as any;
    if (s && !["PENDING", "NEEDS_REVIEW", "EMAIL_FAILED", "FAILED"].includes(s)) return false;
    audit.reportDeliveryStatus = "GENERATING" as any;
    return true;
  }

  async claimAuditForSending(auditId: string): Promise<boolean> {
    const audit = this.audits.get(auditId);
    if (!audit) return false;
    if (isDiscoverySupersededTerminal(audit)) return false;
    if (audit.type === "GRATUIT") return false;
    if ((audit as any).reportSentAt) return false;
    if (!["READY", "SCHEDULED"].includes(audit.reportDeliveryStatus as any)) return false;
    audit.reportDeliveryStatus = "SENDING" as any;
    return true;
  }

  async finalizeAuditSend(auditId: string, sent: boolean): Promise<void> {
    const audit = this.audits.get(auditId);
    if (!audit) return;
    if (isDiscoverySupersededTerminal(audit)) return;
    if (audit.type === "GRATUIT") return;
    if (sent) {
      if (!(audit as any).reportSentAt) {
        audit.reportDeliveryStatus = "SENT" as any;
        (audit as any).reportSentAt = new Date();
      }
    } else if (audit.reportDeliveryStatus === ("SENDING" as any) && !(audit as any).reportSentAt) {
      audit.reportDeliveryStatus = "READY" as any;
    }
  }

  async hasReportReadyEmailBeenSent(auditId: string): Promise<boolean> {
    return Array.from(this.emailTrackings.values()).some(
      (t: any) => t.auditId === auditId && t.emailType === "sendReportReadyEmail"
    );
  }

  async findRecentAuditByEmailAndType(email: string, type: string, minutes: number): Promise<Audit | undefined> {
    const cutoff = Date.now() - minutes * 60 * 1000;
    const normalized = email.trim().toLowerCase();
    return Array.from(this.audits.values())
      .filter(a => a.email.trim().toLowerCase() === normalized
        && a.type === type
        && new Date(a.createdAt).getTime() > cutoff)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }
  async createPromoCodeUsage(input: Omit<PromoCodeUsage, "id" | "usedAt">): Promise<PromoCodeUsage> {
    const usage: PromoCodeUsage = { ...input, id: randomUUID(), usedAt: new Date() };
    this.memPromoUsages.push(usage);
    return usage;
  }
  async getPromoCodeUsagesByCode(promoCode: string): Promise<PromoCodeUsage[]> {
    return this.memPromoUsages.filter(u => u.promoCode.toUpperCase() === promoCode.toUpperCase());
  }
  async getPromoCodeUsagesByEmail(email: string): Promise<PromoCodeUsage[]> {
    return this.memPromoUsages.filter(u => u.email === email.trim().toLowerCase());
  }

  // Abandonment reminders (in-memory implementation)
  private memAbandonmentReminders: Array<{
    id: string;
    email: string;
    percentComplete: number;
    hoursSinceStart: number;
    priorityScore: number;
    sentAt: Date;
  }> = [];

  async getIncompleteQuestionnaires(): Promise<QuestionnaireProgress[]> {
    return Array.from(this.progress.values()).filter(p => p.status === 'STARTED');
  }

  async hasRecentReminder(email: string, hours: number): Promise<boolean> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.memAbandonmentReminders.some(
      r => r.email.toLowerCase() === email.toLowerCase() && r.sentAt >= cutoff
    );
  }

  async logAbandonmentReminder(data: {
    email: string;
    percentComplete: number;
    hoursSinceStart: number;
    priorityScore: number;
    resumeToken?: string;
  }): Promise<void> {
    this.memAbandonmentReminders.push({
      id: randomUUID(),
      ...data,
      sentAt: new Date(),
    });
  }

  async getAbandonmentStats(days: number): Promise<{
    last24h: { sent: number; openRate: number; clickRate: number; conversions: number };
    last7days: { sent: number; openRate: number; conversions: number; revenue: number };
    pending: { count: number; highPriority: number; mediumPriority: number; lastChance: number };
    recommendations: string[];
  }> {
    // Simple mock for in-memory storage
    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const sent24h = this.memAbandonmentReminders.filter(r => r.sentAt >= cutoff24h).length;
    const sent7d = this.memAbandonmentReminders.filter(r => r.sentAt >= cutoff7d).length;

    const incomplete = await this.getIncompleteQuestionnaires();
    const highPriority = incomplete.filter(q => parseInt(q.percentComplete) >= 75).length;
    const mediumPriority = incomplete.filter(q => {
      const pct = parseInt(q.percentComplete);
      return pct >= 25 && pct < 75;
    }).length;

    return {
      last24h: { sent: sent24h, openRate: 0, clickRate: 0, conversions: 0 },
      last7days: { sent: sent7d, openRate: 0, conversions: 0, revenue: 0 },
      pending: {
        count: incomplete.length,
        highPriority,
        mediumPriority,
        lastChance: incomplete.length - highPriority - mediumPriority,
      },
      recommendations: ['Activer le système automatique pour de vraies stats'],
    };
  }
}

export class PgStorage implements IStorage {
  private auditColumnsCache: Set<string> | null = null;
  private magicTokensColumnsCache: Map<string, string> | null = null;
  private ensuredArtifactsTable = false;
  private ensuredUserCreditsColumn = false;
  private ensuredBloodTestsTable = false;
  private ensuredMagicTokensTable = false;
  private ensuredOrdersTable = false;
  private ensuredPromoCodeUsagesTable = false;
  private ensuredQuestionnaireProgressTable = false;
  private ensuredExistingIndexes = false;
  private ensuredContactsTable = false;
  private ensuredUnsubscribesTable = false;

  private async ensureAuditColumnsLoaded(): Promise<Set<string>> {
    if (this.auditColumnsCache) return this.auditColumnsCache;
    // Auto-create missing columns for report storage
    const migrations = [
      `ALTER TABLE audits ADD COLUMN IF NOT EXISTS report_txt TEXT`,
      `ALTER TABLE audits ADD COLUMN IF NOT EXISTS report_html TEXT`,
      `ALTER TABLE audits ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMP`,
    ];
    for (const sql of migrations) {
      try { await pool.query(sql); } catch { /* column might already exist */ }
    }
    const res = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'audits'`
    );
    this.auditColumnsCache = new Set((res.rows || []).map((r: any) => String(r.column_name)));
    console.log(`[Storage] Audit columns: ${[...this.auditColumnsCache].filter(c => c.startsWith('report')).join(', ')}`);
    return this.auditColumnsCache;
  }

  private async ensureUnsubscribesTable(): Promise<void> {
    if (this.ensuredUnsubscribesTable) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS email_unsubscribes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL UNIQUE,
          reason VARCHAR(500),
          unsubscribed_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON email_unsubscribes(email)`);
      this.ensuredUnsubscribesTable = true;
    } catch (err) {
      console.error("[Storage] Error ensuring email_unsubscribes table:", err);
      this.ensuredUnsubscribesTable = true;
    }
  }

  async isEmailUnsubscribed(email: string): Promise<boolean> {
    await this.ensureUnsubscribesTable();
    const result = await pool.query(
      "SELECT 1 FROM email_unsubscribes WHERE LOWER(email) = $1 LIMIT 1",
      [email.trim().toLowerCase()]
    );
    return result.rows.length > 0;
  }

  async unsubscribeEmail(email: string, reason?: string): Promise<void> {
    await this.ensureUnsubscribesTable();
    await pool.query(
      `INSERT INTO email_unsubscribes (email, reason) VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET reason = COALESCE($2, email_unsubscribes.reason), unsubscribed_at = NOW()`,
      [email.trim().toLowerCase(), reason || null]
    );
    console.log(`[Unsubscribe] ${email} unsubscribed${reason ? ` (reason: ${reason})` : ""}`);
  }

  async resubscribeEmail(email: string): Promise<void> {
    await this.ensureUnsubscribesTable();
    await pool.query(
      "DELETE FROM email_unsubscribes WHERE LOWER(email) = $1",
      [email.trim().toLowerCase()]
    );
    console.log(`[Unsubscribe] ${email} resubscribed by admin`);
  }

  async getAllUnsubscribes(): Promise<Array<{ id: string; email: string; reason: string | null; unsubscribedAt: Date }>> {
    await this.ensureUnsubscribesTable();
    const result = await pool.query(
      "SELECT id, email, reason, unsubscribed_at FROM email_unsubscribes ORDER BY unsubscribed_at DESC"
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      email: row.email,
      reason: row.reason,
      unsubscribedAt: row.unsubscribed_at,
    }));
  }

  private async ensureReportArtifactsTable(): Promise<void> {
    if (this.ensuredArtifactsTable) return;
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS report_artifacts (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          audit_id VARCHAR(36) NOT NULL,
          tier VARCHAR(20) NOT NULL,
          engine VARCHAR(30) NOT NULL,
          model VARCHAR(80) NOT NULL,
          txt TEXT NOT NULL,
          html TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )`
      );
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_report_artifacts_audit_id ON report_artifacts(audit_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_report_artifacts_created_at ON report_artifacts(created_at)`);
      this.ensuredArtifactsTable = true;
    } catch {
      // best-effort
      this.ensuredArtifactsTable = true;
    }
  }

  private async ensureUserCreditsColumn(): Promise<void> {
    if (this.ensuredUserCreditsColumn) return;
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`);
    } catch (err) {
      console.error("[Storage] Error ensuring user credits column:", err);
    } finally {
      this.ensuredUserCreditsColumn = true;
    }
  }

  private async ensureBloodTestsTable(): Promise<void> {
    if (this.ensuredBloodTestsTable) return;
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS blood_tests (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(36) NOT NULL REFERENCES users(id),
          file_name TEXT NOT NULL,
          file_type TEXT NOT NULL,
          file_size INTEGER NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'processing',
          error TEXT,
          markers JSONB DEFAULT '[]'::jsonb,
          analysis JSONB DEFAULT '{}'::jsonb,
          patient_profile JSONB DEFAULT '{}'::jsonb,
          global_score INTEGER,
          global_level TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          completed_at TIMESTAMP
        )`
      );
      await pool.query(
        `ALTER TABLE blood_tests ADD COLUMN IF NOT EXISTS patient_profile JSONB DEFAULT '{}'::jsonb`
      );
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_blood_tests_user ON blood_tests(user_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_blood_tests_created_at ON blood_tests(created_at)`);
      this.ensuredBloodTestsTable = true;
    } catch (err) {
      console.error("[Storage] Error ensuring blood_tests table:", err);
      this.ensuredBloodTestsTable = true;
    }
  }

  private async ensureMagicTokensTable(): Promise<void> {
    if (this.ensuredMagicTokensTable) return;
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS magic_tokens (
          token VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          expires_at TIMESTAMP NOT NULL
        )`
      );
      await pool.query(`ALTER TABLE magic_tokens ADD COLUMN IF NOT EXISTS id VARCHAR(36) DEFAULT gen_random_uuid()::text`);
      await pool.query(`ALTER TABLE magic_tokens ADD COLUMN IF NOT EXISTS token VARCHAR(255)`);
      await pool.query(`ALTER TABLE magic_tokens ADD COLUMN IF NOT EXISTS email VARCHAR(255)`);
      await pool.query(`ALTER TABLE magic_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP`);
      this.magicTokensColumnsCache = null;
      this.ensuredMagicTokensTable = true;
    } catch (err) {
      console.error("[Storage] Error ensuring magic_tokens table:", err);
      this.ensuredMagicTokensTable = true;
    }
  }

  private async ensureQuestionnaireProgressTableCreated(): Promise<void> {
    if (this.ensuredQuestionnaireProgressTable) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS questionnaire_progress (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL UNIQUE,
          current_section TEXT NOT NULL DEFAULT '0',
          total_sections TEXT NOT NULL DEFAULT '14',
          percent_complete TEXT NOT NULL DEFAULT '0',
          responses JSONB NOT NULL DEFAULT '{}'::jsonb,
          status VARCHAR(20) NOT NULL DEFAULT 'STARTED',
          started_at TIMESTAMP DEFAULT NOW() NOT NULL,
          last_activity_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
      this.ensuredQuestionnaireProgressTable = true;
    } catch (err) {
      console.error("[Storage] Error ensuring questionnaire_progress table:", err);
      this.ensuredQuestionnaireProgressTable = true;
    }
  }

  private async getMagicTokensColumns(): Promise<Map<string, string>> {
    if (this.magicTokensColumnsCache) return this.magicTokensColumnsCache;
    const result = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'magic_tokens'"
    );
    const map = new Map<string, string>();
    for (const row of result.rows || []) {
      const name = String(row.column_name);
      map.set(name.toLowerCase(), name);
    }
    this.magicTokensColumnsCache = map;
    return map;
  }
  async getUser(id: string): Promise<User | undefined> {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      credits: row.credits ?? DEFAULT_USER_CREDITS,
      createdAt: row.createdAt || row.created_at,
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query("SELECT * FROM users WHERE LOWER(email) = $1", [normalizedEmail]);
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      credits: row.credits ?? DEFAULT_USER_CREDITS,
      createdAt: row.createdAt || row.created_at,
    };
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.ensureUserCreditsColumn();
    const id = randomUUID();
    const normalizedEmail = insertUser.email.trim().toLowerCase();
    const result = await pool.query(
      `INSERT INTO users (id, email, name, credits, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
      [id, normalizedEmail, insertUser.name || null, insertUser.credits ?? DEFAULT_USER_CREDITS]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      credits: row.credits ?? DEFAULT_USER_CREDITS,
      createdAt: row.createdAt || row.created_at,
    };
  }

  async adjustUserCredits(id: string, delta: number): Promise<User | undefined> {
    await this.ensureUserCreditsColumn();
    const result = await pool.query(
      `UPDATE users
       SET credits = credits + $2,
           updated_at = NOW()
       WHERE id = $1
         AND credits + $2 >= 0
       RETURNING *`,
      [id, delta]
    );
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      credits: row.credits ?? DEFAULT_USER_CREDITS,
      createdAt: row.createdAt || row.created_at,
    };
  }

  async getAudit(id: string): Promise<Audit | undefined> {
    const result = await pool.query("SELECT * FROM audits WHERE id = $1", [id]);
    if (result.rows.length === 0) return undefined;
    return this.rowToAudit(result.rows[0]);
  }

  async getAuditsByUserId(userId: string): Promise<Audit[]> {
    const result = await pool.query("SELECT * FROM audits WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
    return result.rows.map(row => this.rowToAudit(row));
  }

  async getAuditsByEmail(email: string): Promise<Audit[]> {
    const result = await pool.query("SELECT * FROM audits WHERE email = $1 ORDER BY created_at DESC", [email]);
    return result.rows.map(row => this.rowToAudit(row));
  }

  async getPendingAudits(): Promise<Audit[]> {
    const result = await pool.query("SELECT * FROM audits WHERE report_delivery_status = 'PENDING'");
    return result.rows.map(row => this.rowToAudit(row));
  }

  async getAllAudits(): Promise<Audit[]> {
    const result = await pool.query("SELECT * FROM audits ORDER BY created_at DESC");
    return result.rows.map(row => this.rowToAudit(row));
  }

  // Memory-safe variant: drops narrative_report / responses / scores JSONB columns.
  // Use in long-running crons (setInterval callbacks) where callers only need
  // lifecycle metadata (id, email, type, status, timestamps). Prevents heap
  // pressure from 461+ audits × ~200KB JSONB each = 90MB per tick that was
  // triggering SIGABRT crashes on Render's 512MB tier.
  async getAllAuditsLight(): Promise<Audit[]> {
    const result = await pool.query(
      `SELECT id, user_id, email, type, status, report_delivery_status,
              report_scheduled_for, report_sent_at, report_generated_at,
              created_at, completed_at
         FROM audits ORDER BY created_at DESC`
    );
    return result.rows.map((row: any): Audit => ({
      id: row.id,
      userId: row.user_id,
      email: row.email,
      type: row.type,
      status: row.status,
      responses: {},
      scores: {},
      reportDeliveryStatus: row.report_delivery_status,
      reportScheduledFor: row.report_scheduled_for,
      reportSentAt: row.report_sent_at,
      reportGeneratedAt: row.report_generated_at ?? undefined,
      narrativeReport: null as any,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    }));
  }

  async getAllAuditSummaries(): Promise<AuditSummary[]> {
    const result = await pool.query(`
      SELECT
        id,
        user_id,
        email,
        type,
        status,
        report_delivery_status,
        report_scheduled_for,
        report_sent_at,
        created_at,
        completed_at
      FROM audits
      ORDER BY created_at DESC
    `);
    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      email: row.email,
      type: row.type,
      status: row.status,
      reportDeliveryStatus: row.report_delivery_status,
      reportScheduledFor: row.report_scheduled_for,
      reportSentAt: row.report_sent_at,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    }));
  }

  async getAdminAuditSummariesPage(limit: number, offset: number): Promise<AdminAuditSummaryPage> {
    await this.ensureBloodReportsTable();
    const result = await pool.query(
      `WITH combined AS (
         SELECT id, email, type::text AS type, status::text AS status,
                report_delivery_status::text AS report_delivery_status,
                report_sent_at, created_at, completed_at
           FROM audits
         UNION ALL
         SELECT id, email, 'BLOOD_ANALYSIS'::text AS type, 'COMPLETED'::text AS status,
                'SENT'::text AS report_delivery_status,
                created_at AS report_sent_at, created_at, created_at AS completed_at
           FROM blood_reports
       )
       SELECT id, email, type, status, report_delivery_status,
              report_sent_at, created_at, completed_at,
              COUNT(*) OVER()::int AS total_count
         FROM combined
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`,
      [limit, offset],
    );
    return {
      total: Number(result.rows[0]?.total_count || 0),
      items: result.rows.map((row) => ({
        id: row.id,
        email: row.email,
        type: row.type,
        status: row.status,
        reportDeliveryStatus: row.report_delivery_status,
        reportSentAt: row.report_sent_at,
        createdAt: row.created_at,
        completedAt: row.completed_at,
      })),
    };
  }

  async getScheduledAuditsForDelivery(): Promise<Audit[]> {
    const result = await pool.query(
      "SELECT * FROM audits WHERE report_delivery_status = 'SCHEDULED' AND report_scheduled_for <= NOW()"
    );
    return result.rows.map(row => this.rowToAudit(row));
  }

  async createAudit(input: InsertAudit & { email: string; responses: Record<string, unknown> }): Promise<Audit> {
    if (input.type === "GRATUIT") {
      throw new Error("DISCOVERY_AUDIT_REQUIRES_TRANSACTIONAL_CREATION");
    }
    // Normalize email at write so string compares against order.email (already
    // stored lowercase) match. Without this, audits.email keeps whatever case
    // the user typed at checkout, which silently breaks audit↔order linking
    // (Chloé Manca 2026-05-25: audit stored as CHLOE.MANCA@..., order as
    // chloe.manca@..., resolver returned orderId=null).
    const normalizedEmail = input.email.trim().toLowerCase();
    let user = await this.getUserByEmail(normalizedEmail);
    if (!user) {
      user = await this.createUser({ email: normalizedEmail });
    }

    const id = randomUUID();
    const scores = this.calculateScores(input.responses);

    const DELIVERY_DELAYS_HOURS: Record<string, number> = {
      GRATUIT: 0,
      PREMIUM: 24,
      ELITE: 24,
      BURNOUT: 0,
      BLOOD_ANALYSIS: 0,
    };
    const delayHours = DELIVERY_DELAYS_HOURS[input.type] ?? 24;
    const scheduledDate = delayHours > 0
      ? new Date(Date.now() + delayHours * 60 * 60 * 1000)
      : null;

    const result = await pool.query(
      `INSERT INTO audits (id, user_id, email, type, status, responses, scores, report_delivery_status, report_scheduled_for, completed_at)
       SELECT $1, $2, $3, $4::varchar(20), $5, $6, $7, $8, $9, NOW()
       WHERE $4::text <> 'GRATUIT'
       RETURNING *`,
      [id, user.id, normalizedEmail, input.type, "COMPLETED", JSON.stringify(input.responses), JSON.stringify(scores), "PENDING", scheduledDate]
    );

    return this.rowToAudit(result.rows[0]);
  }

  async createDiscoveryAudit(
    input: InsertAudit & { email: string; responses: Record<string, unknown> },
  ): Promise<Audit> {
    if (input.type !== "GRATUIT") throw new Error("DISCOVERY_AUDIT_TYPE_REQUIRED");
    const normalizedEmail = input.email.trim().toLowerCase();
    let user = await this.getUserByEmail(normalizedEmail);
    if (!user) user = await this.createUser({ email: normalizedEmail });
    const id = randomUUID();
    const scores = this.calculateScores(input.responses);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
      const activeLock = await client.query(
        `SELECT 1 FROM discovery_operation_lock
          WHERE lock_key = 'discovery-global' AND expires_at > NOW()
          LIMIT 1`,
      );
      if ((activeLock.rowCount ?? 0) !== 0) throw new Error("DISCOVERY_GLOBAL_LOCK_ACTIVE");
      const result = await client.query(
        `INSERT INTO audits
           (id, user_id, email, type, status, responses, scores,
            report_delivery_status, report_scheduled_for, completed_at)
         VALUES ($1,$2,$3,'GRATUIT','COMPLETED',$4,$5,'PENDING',NULL,NOW())
         RETURNING *`,
        [id, user.id, normalizedEmail, JSON.stringify(input.responses), JSON.stringify(scores)],
      );
      await client.query("COMMIT");
      return this.rowToAudit(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async updateAudit(id: string, data: Partial<Audit>): Promise<Audit | undefined> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Colonnes optionnelles (report_txt/html/generated_at) : inclure seulement si elles existent
    const cols = await this.ensureAuditColumnsLoaded();
    if ((data as any).reportTxt !== undefined && cols.has("report_txt")) {
      updates.push(`report_txt = $${paramIndex++}`);
      values.push((data as any).reportTxt ?? null);
    }
    if ((data as any).reportHtml !== undefined && cols.has("report_html")) {
      updates.push(`report_html = $${paramIndex++}`);
      values.push((data as any).reportHtml ?? null);
    }
    if ((data as any).reportGeneratedAt !== undefined && cols.has("report_generated_at")) {
      updates.push(`report_generated_at = $${paramIndex++}`);
      values.push((data as any).reportGeneratedAt ?? null);
    }

    if (data.reportDeliveryStatus !== undefined) {
      updates.push(`report_delivery_status = $${paramIndex++}`);
      values.push(data.reportDeliveryStatus);
    }
    if (data.reportSentAt !== undefined) {
      updates.push(`report_sent_at = $${paramIndex++}`);
      values.push(data.reportSentAt);
    }
    if ((data as any).reportScheduledFor !== undefined) {
      updates.push(`report_scheduled_for = $${paramIndex++}`);
      values.push((data as any).reportScheduledFor);
    }
    if ((data as any).narrativeReport !== undefined) {
      updates.push(`narrative_report = $${paramIndex++}`);
      values.push(JSON.stringify((data as any).narrativeReport));
    }

    if (updates.length === 0) return this.getAudit(id);

    try {
      return await runGenericAuditMutation({
        auditId: id,
        operation: "storage.updateAudit",
        mutate: async (client) => {
          const primaryValues = [...values, id];
          await client.query("SAVEPOINT generic_update_audit");
          let result;
          try {
            result = await client.query(
              `UPDATE audits
                  SET ${updates.join(", ")}
                WHERE id = $${paramIndex}
                  AND type <> 'GRATUIT'
                  AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
                  AND ${DISCOVERY_GENERIC_PROTECTED_STATE_SQL}
                RETURNING *`,
              primaryValues,
            );
          } catch (e: any) {
            const missingColumn = e?.code === "42703"
              || (String(e?.message || "").includes("column")
                && String(e?.message || "").includes("does not exist"));
            if (!missingColumn) throw e;
            await client.query("ROLLBACK TO SAVEPOINT generic_update_audit");
            const strippedUpdates: string[] = [];
            const strippedValues: unknown[] = [];
            let idx = 1;
            for (const [k, v] of [
              ["report_delivery_status", data.reportDeliveryStatus],
              ["report_sent_at", data.reportSentAt],
              ["narrative_report", (data as any).narrativeReport],
            ] as const) {
              if (v !== undefined) {
                strippedUpdates.push(`${k} = $${idx++}`);
                strippedValues.push(k === "narrative_report" ? JSON.stringify(v) : v);
              }
            }
            if (strippedUpdates.length === 0) return undefined;
            strippedValues.push(id);
            result = await client.query(
              `UPDATE audits
                  SET ${strippedUpdates.join(", ")}
                WHERE id = $${idx}
                  AND type <> 'GRATUIT'
                  AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
                  AND ${DISCOVERY_GENERIC_PROTECTED_STATE_SQL}
                RETURNING *`,
              strippedValues,
            );
          }
          if (result.rows.length === 0) return undefined;
          return this.rowToAudit(result.rows[0]);
        },
      }, pool);
    } catch (error) {
      if (error instanceof GenericAuditMutationBarrierError) return undefined;
      throw error;
    }
  }

  async getProgress(email: string): Promise<QuestionnaireProgress | undefined> {
    const result = await pool.query("SELECT * FROM questionnaire_progress WHERE email = $1", [email]);
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      currentSection: parseInt(row.current_section),
      totalSections: parseInt(row.total_sections),
      percentComplete: parseInt(row.percent_complete),
      responses: row.responses,
      status: row.status,
      startedAt: row.started_at,
      lastActivityAt: row.last_activity_at,
    };
  }

  async saveProgress(input: SaveProgressInput): Promise<QuestionnaireProgress> {
    const existing = await this.getProgress(input.email);
    const totalSections = input.totalSections ?? 13;
    const percentComplete = Math.round(((input.currentSection + 1) / totalSections) * 100);
    const status = input.currentSection >= totalSections - 1 ? "COMPLETED" : "IN_PROGRESS";

    if (existing) {
      const result = await pool.query(
        `UPDATE questionnaire_progress SET current_section = $1, total_sections = $2, percent_complete = $3, responses = $4, status = $5, last_activity_at = NOW() WHERE email = $6 RETURNING *`,
        [input.currentSection.toString(), totalSections.toString(), percentComplete.toString(), JSON.stringify(input.responses), status, input.email]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        currentSection: parseInt(row.current_section),
        totalSections: parseInt(row.total_sections),
        percentComplete: parseInt(row.percent_complete),
        responses: row.responses,
        status: row.status,
        startedAt: row.started_at,
        lastActivityAt: row.last_activity_at,
      };
    } else {
      const id = randomUUID();
      const result = await pool.query(
        `INSERT INTO questionnaire_progress (id, email, current_section, total_sections, percent_complete, responses, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [id, input.email, input.currentSection.toString(), totalSections.toString(), percentComplete.toString(), JSON.stringify(input.responses), status]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        currentSection: parseInt(row.current_section),
        totalSections: parseInt(row.total_sections),
        percentComplete: parseInt(row.percent_complete),
        responses: row.responses,
        status: row.status,
        startedAt: row.started_at,
        lastActivityAt: row.last_activity_at,
      };
    }
  }

  async deleteProgress(email: string): Promise<void> {
    await pool.query("DELETE FROM questionnaire_progress WHERE email = $1", [email]);
  }

  async getAllIncompleteProgress(): Promise<QuestionnaireProgress[]> {
    const result = await pool.query(
      "SELECT * FROM questionnaire_progress WHERE status = 'IN_PROGRESS' ORDER BY last_activity_at DESC"
    );
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      currentSection: parseInt(row.current_section),
      totalSections: parseInt(row.total_sections),
      percentComplete: parseInt(row.percent_complete),
      responses: row.responses,
      status: row.status,
      startedAt: row.started_at,
      lastActivityAt: row.last_activity_at,
    }));
  }

  async getBurnoutProgress(email: string): Promise<BurnoutProgress | undefined> {
    await this.ensureBurnoutProgressTable();
    const result = await pool.query("SELECT * FROM burnout_progress WHERE email = $1", [email]);
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      currentSection: parseInt(row.current_section),
      totalSections: parseInt(row.total_sections),
      percentComplete: parseInt(row.percent_complete),
      responses: row.responses || {},
      status: row.status,
      startedAt: row.started_at,
      lastActivityAt: row.last_activity_at,
    };
  }

  async saveBurnoutProgress(input: SaveBurnoutProgressInput): Promise<BurnoutProgress> {
    await this.ensureBurnoutProgressTable();
    const existing = await this.getBurnoutProgress(input.email);
    const totalSections = input.totalSections ?? 6;
    const percentComplete = Math.round(((input.currentSection + 1) / totalSections) * 100);
    const status: AuditStatusEnum = input.currentSection >= totalSections - 1 ? "COMPLETED" : "IN_PROGRESS";

    if (existing) {
      const result = await pool.query(
        `UPDATE burnout_progress SET current_section = $1, total_sections = $2, percent_complete = $3, responses = $4, status = $5, last_activity_at = NOW() WHERE email = $6 RETURNING *`,
        [
          input.currentSection.toString(),
          totalSections.toString(),
          percentComplete.toString(),
          JSON.stringify(input.responses || {}),
          status,
          input.email,
        ]
      );
      const row = result.rows[0];
      return {
        id: row.id,
        email: row.email,
        currentSection: parseInt(row.current_section),
        totalSections: parseInt(row.total_sections),
        percentComplete: parseInt(row.percent_complete),
        responses: row.responses || {},
        status: row.status,
        startedAt: row.started_at,
        lastActivityAt: row.last_activity_at,
      };
    }

    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO burnout_progress (id, email, current_section, total_sections, percent_complete, responses, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        id,
        input.email,
        input.currentSection.toString(),
        totalSections.toString(),
        percentComplete.toString(),
        JSON.stringify(input.responses || {}),
        status,
      ]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      currentSection: parseInt(row.current_section),
      totalSections: parseInt(row.total_sections),
      percentComplete: parseInt(row.percent_complete),
      responses: row.responses || {},
      status: row.status,
      startedAt: row.started_at,
      lastActivityAt: row.last_activity_at,
    };
  }

  async createBurnoutReport(input: { email: string; responses: Record<string, unknown>; report: unknown }): Promise<BurnoutReportRecord> {
    await this.ensureBurnoutReportsTable();
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO burnout_reports (id, email, responses, report) VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, input.email, JSON.stringify(input.responses || {}), JSON.stringify(input.report)]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      responses: row.responses || {},
      report: row.report || {},
      createdAt: row.created_at,
    };
  }

  async getBurnoutReport(id: string): Promise<BurnoutReportRecord | undefined> {
    await this.ensureBurnoutReportsTable();
    const result = await pool.query("SELECT * FROM burnout_reports WHERE id = $1", [id]);
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      responses: row.responses || {},
      report: row.report || {},
      createdAt: row.created_at,
    };
  }

  async updateBurnoutReport(id: string, report: unknown): Promise<BurnoutReportRecord | undefined> {
    await this.ensureBurnoutReportsTable();
    const result = await pool.query(
      `UPDATE burnout_reports SET report = $2 WHERE id = $1 RETURNING *`,
      [id, JSON.stringify(report)]
    );
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      responses: row.responses || {},
      report: row.report || {},
      createdAt: row.created_at,
    };
  }

  async getAllBurnoutReports(): Promise<BurnoutReportRecord[]> {
    await this.ensureBurnoutReportsTable();
    const result = await pool.query("SELECT * FROM burnout_reports ORDER BY created_at DESC LIMIT 100");
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      responses: row.responses || {},
      report: row.report || {},
      createdAt: row.created_at,
    }));
  }

  async getPeptidesReportsByEmail(email: string): Promise<BurnoutReportRecord[]> {
    await this.ensureBurnoutReportsTable();
    const prefixed = `peptides::${email.trim().toLowerCase()}`;
    const result = await pool.query(
      "SELECT id, email, report, created_at FROM burnout_reports WHERE LOWER(email) = $1 ORDER BY created_at DESC",
      [prefixed]
    );
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      responses: {},
      report: row.report || {},
      createdAt: row.created_at,
    }));
  }

  async createBloodReport(input: { email: string; profile: Record<string, unknown>; markers: unknown[]; analysis: unknown; aiReport: string }): Promise<BloodReportRecord> {
    await this.ensureBloodReportsTable();
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO blood_reports (id, email, profile, markers, analysis, ai_report)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        id,
        input.email,
        JSON.stringify(input.profile || {}),
        JSON.stringify(input.markers || []),
        JSON.stringify(input.analysis || {}),
        input.aiReport || "",
      ]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      profile: row.profile || {},
      markers: row.markers || [],
      analysis: row.analysis || {},
      aiReport: row.ai_report || "",
      deliveryStatus: row.delivery_status || "PENDING",
      deliveryRetries: Number(row.delivery_retries) || 0,
      reportScheduledFor: row.report_scheduled_for || null,
      emailSentAt: row.email_sent_at || null,
      createdAt: row.created_at,
    };
  }

  async getBloodReport(id: string): Promise<BloodReportRecord | undefined> {
    await this.ensureBloodReportsTable();
    const result = await pool.query("SELECT * FROM blood_reports WHERE id = $1", [id]);
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      profile: row.profile || {},
      markers: row.markers || [],
      analysis: row.analysis || {},
      aiReport: row.ai_report || "",
      deliveryStatus: row.delivery_status || "PENDING",
      deliveryRetries: Number(row.delivery_retries) || 0,
      reportScheduledFor: row.report_scheduled_for || null,
      emailSentAt: row.email_sent_at || null,
      createdAt: row.created_at,
    };
  }

  async updateBloodReport(
    id: string,
    data: Partial<BloodReportRecord>
  ): Promise<BloodReportRecord | undefined> {
    await this.ensureBloodReportsTable();
    const updates: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    const push = (field: string, value: unknown) => {
      updates.push(`${field} = $${index++}`);
      values.push(value);
    };

    if (data.email !== undefined) push("email", data.email);
    if (data.profile !== undefined) push("profile", JSON.stringify(data.profile));
    if (data.markers !== undefined) push("markers", JSON.stringify(data.markers));
    if (data.analysis !== undefined) push("analysis", JSON.stringify(data.analysis));
    if (data.aiReport !== undefined) push("ai_report", data.aiReport ?? "");
    if (data.deliveryStatus !== undefined) push("delivery_status", data.deliveryStatus);
    if (data.deliveryRetries !== undefined) push("delivery_retries", data.deliveryRetries);
    if (data.reportScheduledFor !== undefined) push("report_scheduled_for", data.reportScheduledFor);
    if (data.emailSentAt !== undefined) push("email_sent_at", data.emailSentAt);

    if (updates.length === 0) return this.getBloodReport(id);
    values.push(id);

    const result = await pool.query(
      `UPDATE blood_reports SET ${updates.join(", ")} WHERE id = $${index} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      profile: row.profile || {},
      markers: row.markers || [],
      analysis: row.analysis || {},
      aiReport: row.ai_report || "",
      deliveryStatus: row.delivery_status || "PENDING",
      deliveryRetries: Number(row.delivery_retries) || 0,
      reportScheduledFor: row.report_scheduled_for || null,
      emailSentAt: row.email_sent_at || null,
      createdAt: row.created_at,
    };
  }

  async getAllBloodReports(): Promise<BloodReportRecord[]> {
    await this.ensureBloodReportsTable();
    const result = await pool.query("SELECT * FROM blood_reports ORDER BY created_at DESC LIMIT 100");
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      profile: row.profile || {},
      markers: row.markers || [],
      analysis: row.analysis || {},
      aiReport: row.ai_report || "",
      deliveryStatus: row.delivery_status || "PENDING",
      deliveryRetries: Number(row.delivery_retries) || 0,
      reportScheduledFor: row.report_scheduled_for || null,
      emailSentAt: row.email_sent_at || null,
      createdAt: row.created_at,
    }));
  }

  async getAllBloodReportSummaries(): Promise<BloodReportSummary[]> {
    await this.ensureBloodReportsTable();
    const result = await pool.query(`
      SELECT id, email, delivery_status, email_sent_at, created_at
      FROM blood_reports
      ORDER BY created_at DESC
      LIMIT 100
    `);
    return result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      deliveryStatus: row.delivery_status || "PENDING",
      emailSentAt: row.email_sent_at || null,
      createdAt: row.created_at,
    }));
  }

  async getScheduledBloodReportsForDelivery(): Promise<BloodReportRecord[]> {
    await this.ensureBloodReportsTable();
    const result = await pool.query(
      "SELECT * FROM blood_reports WHERE delivery_status = 'SCHEDULED' AND report_scheduled_for <= NOW() AND ai_report IS NOT NULL AND ai_report != ''"
    );
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      profile: row.profile || {},
      markers: row.markers || [],
      analysis: row.analysis || {},
      aiReport: row.ai_report || "",
      deliveryStatus: row.delivery_status || "PENDING",
      deliveryRetries: Number(row.delivery_retries) || 0,
      reportScheduledFor: row.report_scheduled_for || null,
      emailSentAt: row.email_sent_at || null,
      createdAt: row.created_at,
    }));
  }

  async createBloodTest(
    input: Omit<BloodTestRecord, "id" | "createdAt"> & { createdAt?: Date }
  ): Promise<BloodTestRecord> {
    await this.ensureBloodTestsTable();
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO blood_tests
        (id, user_id, file_name, file_type, file_size, status, error, markers, analysis, patient_profile, global_score, global_level, created_at, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        id,
        input.userId,
        input.fileName,
        input.fileType,
        input.fileSize,
        input.status,
        input.error ?? null,
        JSON.stringify(input.markers || []),
        JSON.stringify(input.analysis || {}),
        JSON.stringify(input.patientProfile || {}),
        input.globalScore ?? null,
        input.globalLevel ?? null,
        input.createdAt || new Date(),
        input.completedAt || null,
      ]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      status: row.status,
      error: row.error,
      markers: row.markers || [],
      analysis: row.analysis || {},
      patientProfile: row.patient_profile || {},
      globalScore: row.global_score ?? null,
      globalLevel: row.global_level ?? null,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  }

  async updateBloodTest(id: string, data: Partial<BloodTestRecord>): Promise<BloodTestRecord | undefined> {
    await this.ensureBloodTestsTable();
    const updates: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    const push = (field: string, value: unknown) => {
      updates.push(`${field} = $${index++}`);
      values.push(value);
    };

    if (data.status !== undefined) push("status", data.status);
    if (data.error !== undefined) push("error", data.error ?? null);
    if (data.markers !== undefined) push("markers", JSON.stringify(data.markers));
    if (data.analysis !== undefined) push("analysis", JSON.stringify(data.analysis));
    if (data.patientProfile !== undefined) push("patient_profile", JSON.stringify(data.patientProfile));
    if (data.globalScore !== undefined) push("global_score", data.globalScore ?? null);
    if (data.globalLevel !== undefined) push("global_level", data.globalLevel ?? null);
    if (data.completedAt !== undefined) push("completed_at", data.completedAt ?? null);

    if (updates.length === 0) return this.getBloodTest(id);

    values.push(id);
    const result = await pool.query(
      `UPDATE blood_tests SET ${updates.join(", ")} WHERE id = $${index} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      status: row.status,
      error: row.error,
      markers: row.markers || [],
      analysis: row.analysis || {},
      patientProfile: row.patient_profile || {},
      globalScore: row.global_score ?? null,
      globalLevel: row.global_level ?? null,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  }

  async getBloodTest(id: string): Promise<BloodTestRecord | undefined> {
    await this.ensureBloodTestsTable();
    const result = await pool.query("SELECT * FROM blood_tests WHERE id = $1", [id]);
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      status: row.status,
      error: row.error,
      markers: row.markers || [],
      analysis: row.analysis || {},
      patientProfile: row.patient_profile || {},
      globalScore: row.global_score ?? null,
      globalLevel: row.global_level ?? null,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  }

  async getBloodTestsByUserId(userId: string): Promise<BloodTestRecord[]> {
    await this.ensureBloodTestsTable();
    const result = await pool.query(
      "SELECT * FROM blood_tests WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      status: row.status,
      error: row.error,
      markers: row.markers || [],
      analysis: row.analysis || {},
      patientProfile: row.patient_profile || {},
      globalScore: row.global_score ?? null,
      globalLevel: row.global_level ?? null,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    }));
  }

  async createMagicToken(email: string): Promise<string> {
    await this.ensureMagicTokensTable();
    const token = randomUUID();
    const id = randomUUID();
    const normalizedEmail = email.trim().toLowerCase();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const columns = await this.getMagicTokensColumns();
    const values: Array<string | Date> = [];
    const fields: string[] = [];

    const pushField = (key: string, value: string | Date) => {
      const columnName = columns.get(key);
      if (!columnName) return;
      fields.push(`"${columnName}"`);
      values.push(value);
    };

    let userId: string | null = null;
    const userIdColumn = columns.get("userid");
    const userIdSnake = columns.get("user_id");
    if (userIdColumn || userIdSnake) {
      let user = await this.getUserByEmail(normalizedEmail);
      if (!user) {
        user = await this.createUser({ email: normalizedEmail });
      }
      userId = user.id;
    }

    pushField("id", id);
    if (userId) {
      if (userIdColumn) {
        fields.push(`"${userIdColumn}"`);
        values.push(userId);
      }
      if (userIdSnake && userIdSnake !== userIdColumn) {
        fields.push(`"${userIdSnake}"`);
        values.push(userId);
      }
    }
    pushField("token", token);
    pushField("email", normalizedEmail);

    const expiresColumn = columns.get("expiresat");
    const expiresSnake = columns.get("expires_at");
    if (expiresColumn) {
      fields.push(`"${expiresColumn}"`);
      values.push(expiresAt);
    }
    if (expiresSnake && expiresSnake !== expiresColumn) {
      fields.push(`"${expiresSnake}"`);
      values.push(expiresAt);
    }

    if (fields.length === 0) {
      throw new Error("magic_tokens schema missing required columns");
    }

    const placeholders = values.map((_, idx) => `$${idx + 1}`).join(", ");
    const sql = `INSERT INTO magic_tokens (${fields.join(", ")}) VALUES (${placeholders})`;
    await pool.query(sql, values);
    return token;
  }

  async verifyMagicToken(token: string): Promise<string | null> {
    await this.ensureMagicTokensTable();
    const result = await pool.query("SELECT * FROM magic_tokens WHERE token = $1", [token]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    if (new Date() > new Date(row.expires_at)) {
      await pool.query("DELETE FROM magic_tokens WHERE token = $1", [token]);
      return null;
    }
    await pool.query("DELETE FROM magic_tokens WHERE token = $1", [token]);
    return row.email;
  }

  private calculateScores(responses: Record<string, unknown>): Record<string, number> {
    return calculateScoresFromResponses(responses);
  }

  private rowToAudit(row: any): Audit {
    return {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      type: row.type,
      status: row.status,
      responses: row.responses,
      scores: row.scores,
      narrativeReport: row.narrative_report,
      reportTxt: row.report_txt ?? undefined,
      reportHtml: row.report_html ?? undefined,
      reportGeneratedAt: row.report_generated_at ?? undefined,
      reportDeliveryStatus: row.report_delivery_status,
      reportScheduledFor: row.report_scheduled_for,
      reportSentAt: row.report_sent_at,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  }

  async createReportArtifact(
    input: Omit<ReportArtifact, "id" | "createdAt"> & { createdAt?: Date },
    options?: { strict?: boolean },
  ): Promise<ReportArtifact> {
    if (input.tier === "GRATUIT") {
      throw new Error("DISCOVERY_ARTIFACT_REQUIRES_TRANSACTIONAL_PERSISTENCE");
    }
    await this.ensureReportArtifactsTable();
    const id = randomUUID();
    const createdAt = input.createdAt ?? new Date();
    try {
      await insertGenericReportArtifactFenced(pool, { id, ...input, createdAt });
    } catch (e: any) {
      if (e instanceof GenericAuditMutationBarrierError) {
        throw new Error("DISCOVERY_ARTIFACT_REQUIRES_TRANSACTIONAL_PERSISTENCE");
      }
      console.error("[ReportArtifact] Insert failed (best-effort):", e?.message || e);
      if (options?.strict) throw e;
    }
    return {
      id,
      auditId: input.auditId,
      tier: input.tier,
      engine: input.engine,
      model: input.model,
      txt: input.txt,
      html: input.html,
      createdAt,
    };
  }

  private rowToReportJob(row: any): ReportJob {
    return {
      auditId: row.audit_id,
      status: row.status as ReportJobStatusEnum,
      progress: row.progress,
      currentSection: row.current_section,
      error: row.error,
      attemptCount: row.attempt_count,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      lastProgressAt: row.last_progress_at,
      completedAt: row.completed_at,
    };
  }

  async getReportJob(auditId: string): Promise<ReportJob | undefined> {
    const result = await pool.query("SELECT * FROM report_jobs WHERE audit_id = $1", [auditId]);
    if (result.rows.length === 0) return undefined;
    return this.rowToReportJob(result.rows[0]);
  }

  async getActiveReportJobs(): Promise<ReportJob[]> {
    const rows = await listActiveGenericReportJobRows(pool);
    return rows.map(row => this.rowToReportJob(row));
  }

  async createOrUpdateReportJob(job: Partial<ReportJob> & { auditId: string }): Promise<ReportJob> {
    return this.rowToReportJob(await upsertGenericReportJobRow(pool, job));
  }

  async claimPendingReportJob(auditId: string): Promise<ReportJob | undefined> {
    const row = await claimPendingGenericReportJob(pool, auditId);
    return row ? this.rowToReportJob(row) : undefined;
  }

  async hasReportArtifact(auditId: string): Promise<boolean> {
    await this.ensureReportArtifactsTable();
    const result = await pool.query(
      `SELECT 1 FROM report_artifacts
        WHERE audit_id = $1 AND artifact_state = 'ACTIVE'
        LIMIT 1`,
      [auditId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async enqueueMissingDiscoveryReportJob(auditId: string, reason: string): Promise<boolean> {
    return enqueueMissingDiscoveryReportJobFenced(pool, auditId, reason);
  }

  async markDiscoveryAuditSuperseded(
    auditId: string,
    replacementAuditId: string,
    reason: string,
  ): Promise<boolean> {
    return markDiscoveryAuditSupersededFenced(pool, auditId, replacementAuditId, reason);
  }

  async updateReportJobProgress(auditId: string, progress: number, currentSection: string): Promise<void> {
    await updateGenericReportJobProgress(pool, auditId, progress, currentSection);
  }

  async completeReportJob(auditId: string): Promise<void> {
    await completeGenericReportJob(pool, auditId);
  }

  async failReportJob(auditId: string, error: string): Promise<void> {
    await failGenericReportJob(pool, auditId, error);
  }

  async deleteReportJob(auditId: string): Promise<void> {
    await deleteGenericReportJob(pool, auditId);
  }

  // Promo codes methods (PgStorage)
  private rowToPromoCode(row: any): PromoCode {
    return {
      id: row.id,
      code: row.code,
      discountPercent: row.discount_percent,
      description: row.description,
      validFor: row.valid_for,
      maxUses: row.max_uses,
      currentUses: row.current_uses,
      isActive: row.is_active,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  }

  async getPromoCode(code: string): Promise<PromoCode | undefined> {
    const result = await pool.query("SELECT * FROM promo_codes WHERE UPPER(code) = $1", [code.toUpperCase()]);
    if (result.rows.length === 0) return undefined;
    return this.rowToPromoCode(result.rows[0]);
  }

  async getAllPromoCodes(): Promise<PromoCode[]> {
    const result = await pool.query("SELECT * FROM promo_codes ORDER BY created_at DESC");
    return result.rows.map(row => this.rowToPromoCode(row));
  }

  async createPromoCode(promo: Omit<PromoCode, "id" | "createdAt" | "currentUses">): Promise<PromoCode> {
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO promo_codes (id, code, discount_percent, description, valid_for, max_uses, is_active, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, promo.code.toUpperCase(), promo.discountPercent, promo.description, promo.validFor, promo.maxUses, promo.isActive, promo.expiresAt]
    );
    return this.rowToPromoCode(result.rows[0]);
  }

  async updatePromoCode(id: string, data: Partial<PromoCode>): Promise<PromoCode | undefined> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.code !== undefined) { updates.push(`code = $${idx++}`); values.push(data.code.toUpperCase()); }
    if (data.discountPercent !== undefined) { updates.push(`discount_percent = $${idx++}`); values.push(data.discountPercent); }
    if (data.description !== undefined) { updates.push(`description = $${idx++}`); values.push(data.description); }
    if (data.validFor !== undefined) { updates.push(`valid_for = $${idx++}`); values.push(data.validFor); }
    if (data.maxUses !== undefined) { updates.push(`max_uses = $${idx++}`); values.push(data.maxUses); }
    if (data.isActive !== undefined) { updates.push(`is_active = $${idx++}`); values.push(data.isActive); }
    if (data.expiresAt !== undefined) { updates.push(`expires_at = $${idx++}`); values.push(data.expiresAt); }

    if (updates.length === 0) return this.getPromoCode(id);

    values.push(id);
    const result = await pool.query(
      `UPDATE promo_codes SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return undefined;
    return this.rowToPromoCode(result.rows[0]);
  }

  async incrementPromoCodeUse(code: string): Promise<void> {
    await pool.query(
      "UPDATE promo_codes SET current_uses = current_uses + 1 WHERE UPPER(code) = $1",
      [code.toUpperCase()]
    );
  }

  async validatePromoCode(code: string, auditType: string): Promise<{ valid: boolean; discount: number; error?: string }> {
    const promo = await this.getPromoCode(code);
    if (!promo) {
      return { valid: false, discount: 0, error: "Code promo invalide" };
    }
    if (!promo.isActive) {
      return { valid: false, discount: 0, error: "Ce code promo n'est plus actif" };
    }
    if (promo.expiresAt && new Date() > promo.expiresAt) {
      return { valid: false, discount: 0, error: "Ce code promo a expiré" };
    }
    if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
      return { valid: false, discount: 0, error: "Ce code promo a atteint son nombre maximum d'utilisations" };
    }

    // WELCOME20: valide uniquement pour les analyses payantes (pas GRATUIT)
    if (promo.code === "WELCOME20") {
      if (auditType === "GRATUIT") {
        return { valid: false, discount: 0, error: "Ce code promo est réservé aux analyses payantes" };
      }
      return { valid: true, discount: promo.discountPercent };
    }

    // RETOUR30: valide uniquement pour PREMIUM, ELITE, BLOOD_ANALYSIS (pas GRATUIT)
    if (promo.code === "RETOUR30") {
      if (auditType === "GRATUIT") {
        return { valid: false, discount: 0, error: "Ce code promo est réservé aux analyses Anabolic, Ultimate et Blood" };
      }
      return { valid: true, discount: promo.discountPercent };
    }

    // Standard validation
    if (promo.validFor !== "ALL" && promo.validFor !== auditType) {
      return { valid: false, discount: 0, error: `Ce code promo n'est pas valide pour l'analyse ${auditType}` };
    }
    return { valid: true, discount: promo.discountPercent };
  }

  // Email tracking methods (PgStorage)
  private rowToEmailTracking(row: any): EmailTracking {
    const opened = row.opened ?? row.opened_at ?? null;
    const clicked = row.clicked ?? row.clicked_at ?? null;
    return {
      id: row.id,
      auditId: row.audit_id,
      emailType: row.email_type,
      recipientEmail: row.recipient_email ?? null,
      sentAt: row.sent_at,
      openedAt: opened,
      clickedAt: clicked,
      opened,
      clicked,
      sendpulseStatus: row.sendpulse_status ?? null,
      converted: row.converted ?? null,
      conversionType: row.conversion_type ?? null,
    };
  }

  async createEmailTracking(auditId: string, emailType: string, recipientEmail?: string): Promise<EmailTracking> {
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO email_tracking (id, audit_id, email_type, recipient_email, sent_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [id, auditId, emailType, recipientEmail || ""]
    );
    return this.rowToEmailTracking(result.rows[0]);
  }

  async markEmailOpened(trackingId: string): Promise<void> {
    await pool.query(
      "UPDATE email_tracking SET opened = NOW() WHERE id = $1 AND opened IS NULL",
      [trackingId]
    );
  }

  async markEmailTrackingConvertedByEmail(
    email: string,
    amountCents: number,
    conversionType: string,
    withinDays: number = 14,
  ): Promise<number> {
    if (!email) return 0;
    const result = await pool.query(
      `UPDATE email_tracking
          SET converted = COALESCE(converted, NOW()),
              conversion_type = COALESCE(conversion_type, $3),
              metadata = COALESCE(metadata, '{}'::jsonb)
                || jsonb_build_object(
                  'convertedAmountCents', $2::int,
                  'convertedByOrderAttribution', true
                ),
              updated_at = NOW()
        WHERE LOWER(recipient_email) = LOWER($1)
          AND converted IS NULL
          AND sent_at >= NOW() - ($4 || ' days')::interval
          AND COALESCE(sendpulse_status, '') NOT IN ('failed', 'auth_failed', 'unsubscribed')
       RETURNING id`,
      [email, amountCents, conversionType, String(withinDays)]
    );
    return result.rowCount ?? 0;
  }

  async getEmailTrackingForAudit(auditId: string): Promise<EmailTracking[]> {
    const result = await pool.query(
      "SELECT * FROM email_tracking WHERE audit_id = $1 ORDER BY sent_at DESC",
      [auditId]
    );
    return result.rows.map(row => this.rowToEmailTracking(row));
  }

  async hasPeptidesDeliveryEmailBeenSent(email: string): Promise<boolean> {
    try {
      // New deliveries have a dedicated tracking type. Keep the subject-based
      // legacy branch so old accepted sends still block a duplicate.
      const result = await pool.query(
        `SELECT 1 FROM email_tracking
          WHERE LOWER(recipient_email) = LOWER($1)
            AND (
              email_type = 'sendPeptidesReportReadyEmail'
              OR (
                email_type = 'sendCTAEmail'
                AND (subject ILIKE '%protocole peptides%' OR subject ILIKE '%peptides personnalisé%' OR subject ILIKE '%peptides personnalise%')
              )
            )
            AND (sendpulse_status IS NULL OR sendpulse_status NOT IN ('failed','auth_failed','unsubscribed'))
          LIMIT 1`,
        [email]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      // If subject column doesn't exist in an older DB, fall back to type-only check (less strict)
      console.warn("[EmailTracking] hasPeptidesDeliveryEmailBeenSent fallback (subject column missing?):", err);
      return false;
    }
  }

  async hasPeptidesOrderConfirmationBeenSent(email: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT 1 FROM email_tracking
          WHERE LOWER(recipient_email) = LOWER($1)
            AND email_type = 'sendPeptidesOrderConfirmation'
            AND (sendpulse_status IS NULL OR sendpulse_status NOT IN ('failed','auth_failed','unsubscribed'))
          LIMIT 1`,
        [email]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      console.warn("[EmailTracking] hasPeptidesOrderConfirmationBeenSent query failed:", err);
      return false;
    }
  }

  async claimPeptidesOrderConfirmation(orderId: string, leaseMs = 10 * 60 * 1000): Promise<boolean> {
    await this.ensureOrdersTableCreated();
    const result = await pool.query(
      `UPDATE orders
          SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'peptidesConfirmationState', 'SENDING',
                'peptidesConfirmationAttempts', COALESCE((metadata->>'peptidesConfirmationAttempts')::int, 0) + 1,
                'peptidesConfirmationLeaseUntil', (NOW() + ($1::bigint * INTERVAL '1 millisecond'))::text,
                'peptidesConfirmationStartedAt', NOW()::text
              ),
              updated_at = NOW()
        WHERE id = $2
          AND product_type = 'PEPTIDES_ENGINE'
          AND status = 'paid'
          AND COALESCE(metadata->>'peptidesEmailHold', 'false') <> 'true'
          AND COALESCE(metadata->>'peptidesConfirmationState', 'PENDING') NOT IN ('ACCEPTED', 'UNKNOWN')
          AND (
            COALESCE(metadata->>'peptidesConfirmationState', 'PENDING') <> 'SENDING'
            OR COALESCE(NULLIF(metadata->>'peptidesConfirmationLeaseUntil', '')::timestamptz, '-infinity'::timestamptz) <= NOW()
          )
          AND COALESCE((metadata->>'peptidesConfirmationAttempts')::int, 0) < 3
      RETURNING id`,
      [leaseMs, orderId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async finalizePeptidesOrderConfirmation(orderId: string, state: "ACCEPTED" | "FAILED" | "UNKNOWN"): Promise<void> {
    await this.ensureOrdersTableCreated();
    await pool.query(
      `UPDATE orders
          SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'peptidesConfirmationState', $1::text,
                'peptidesConfirmationLeaseUntil', '',
                'peptidesConfirmationCompletedAt', NOW()::text
              ),
              updated_at = NOW()
        WHERE id = $2
          AND product_type = 'PEPTIDES_ENGINE'`,
      [state, orderId],
    );
  }

  async claimPeptidesReportDelivery(orderId: string, reportId: string, leaseMs = 10 * 60 * 1000): Promise<boolean> {
    await this.ensureOrdersTableCreated();
    const result = await pool.query(
      `UPDATE orders
          SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'peptidesDeliveryState', 'SENDING',
                'peptidesDeliveryReportId', $1::text,
                'peptidesDeliveryAttempts', COALESCE((metadata->>'peptidesDeliveryAttempts')::int, 0) + 1,
                'peptidesDeliveryLeaseUntil', (NOW() + ($2::bigint * INTERVAL '1 millisecond'))::text,
                'peptidesDeliveryStartedAt', NOW()::text
              ),
              updated_at = NOW()
        WHERE id = $3
          AND product_type = 'PEPTIDES_ENGINE'
          AND status = 'paid'
          AND COALESCE(metadata->>'peptidesReportId', '') = $1::text
          AND COALESCE(metadata->>'peptidesEmailHold', 'false') <> 'true'
          AND COALESCE(metadata->>'peptidesDeliveryState', 'PENDING') NOT IN ('ACCEPTED', 'UNKNOWN')
          AND (
            COALESCE(metadata->>'peptidesDeliveryState', 'PENDING') <> 'SENDING'
            OR COALESCE(NULLIF(metadata->>'peptidesDeliveryLeaseUntil', '')::timestamptz, '-infinity'::timestamptz) <= NOW()
          )
          AND COALESCE((metadata->>'peptidesDeliveryAttempts')::int, 0) < 3
      RETURNING id`,
      [reportId, leaseMs, orderId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async finalizePeptidesReportDelivery(
    orderId: string,
    reportId: string,
    state: "ACCEPTED" | "FAILED" | "UNKNOWN",
  ): Promise<void> {
    await this.ensureOrdersTableCreated();
    await pool.query(
      `UPDATE orders
          SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'peptidesDeliveryState', $1::text,
                'peptidesDeliveryReportId', $2::text,
                'peptidesDeliveryLeaseUntil', '',
                'peptidesDeliveryCompletedAt', NOW()::text
              ),
              updated_at = NOW()
        WHERE id = $3
          AND product_type = 'PEPTIDES_ENGINE'
          AND COALESCE(metadata->>'peptidesReportId', '') = $2::text`,
      [state, reportId, orderId],
    );
  }

  async resetPeptidesReportDeliveryCircuit(orderId: string, reportId: string): Promise<boolean> {
    await this.ensureOrdersTableCreated();
    const result = await pool.query(
      `UPDATE orders
          SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'peptidesDeliveryState', 'PENDING',
                'peptidesDeliveryReportId', $1::text,
                'peptidesDeliveryAttempts', 0,
                'peptidesDeliveryLeaseUntil', '',
                'peptidesDeliveryResetAt', NOW()::text
              ),
              updated_at = NOW()
        WHERE id = $2
          AND product_type = 'PEPTIDES_ENGINE'
          AND status = 'paid'
          AND COALESCE(metadata->>'peptidesReportId', '') = $1::text
          AND COALESCE(metadata->>'peptidesDeliveryState', 'PENDING') NOT IN ('ACCEPTED', 'UNKNOWN')
      RETURNING id`,
      [reportId, orderId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async hasBloodAnalysisEmailBeenSentForReport(reportId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT 1 FROM email_tracking
          WHERE audit_id = $1
            AND email_type = 'sendBloodAnalysisHtmlEmail'
          LIMIT 1`,
        [reportId]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      console.warn("[EmailTracking] hasBloodAnalysisEmailBeenSentForReport failed:", err);
      return false;
    }
  }

  async hasBloodAnalysisEmailBeenSentRecently(email: string, withinHours: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT 1 FROM email_tracking
          WHERE LOWER(recipient_email) = LOWER($1)
            AND email_type = 'sendBloodAnalysisHtmlEmail'
            AND sent_at >= NOW() - ($2 || ' hours')::interval
          LIMIT 1`,
        [email, String(withinHours)]
      );
      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      console.warn("[EmailTracking] hasBloodAnalysisEmailBeenSentRecently failed:", err);
      return false;
    }
  }

  async hasUserLeftReview(auditId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        "SELECT 1 FROM reviews WHERE audit_id = $1 LIMIT 1",
        [auditId]
      );
      return result.rows.length > 0;
    } catch {
      // Table reviews doesn't exist yet, return false
      return false;
    }
  }

  private ensuredBurnoutProgressTable = false;
  private ensuredBurnoutReportsTable = false;
  private ensuredBloodReportsTable = false;

  private async ensureBurnoutProgressTable(): Promise<void> {
    if (this.ensuredBurnoutProgressTable) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS burnout_progress (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL UNIQUE,
          current_section TEXT NOT NULL DEFAULT '0',
          total_sections TEXT NOT NULL DEFAULT '6',
          percent_complete TEXT NOT NULL DEFAULT '0',
          responses JSONB NOT NULL DEFAULT '{}',
          status VARCHAR(20) NOT NULL DEFAULT 'STARTED',
          started_at TIMESTAMP DEFAULT NOW() NOT NULL,
          last_activity_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_burnout_progress_email ON burnout_progress(email)`);
      this.ensuredBurnoutProgressTable = true;
    } catch (err) {
      console.error("[Storage] Error creating burnout_progress table:", err);
      this.ensuredBurnoutProgressTable = true;
    }
  }

  private async ensureBurnoutReportsTable(): Promise<void> {
    if (this.ensuredBurnoutReportsTable) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS burnout_reports (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL,
          responses JSONB NOT NULL DEFAULT '{}',
          report JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_burnout_reports_email ON burnout_reports(email)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_burnout_reports_created_at ON burnout_reports(created_at)`);
      this.ensuredBurnoutReportsTable = true;
    } catch (err) {
      console.error("[Storage] Error creating burnout_reports table:", err);
      this.ensuredBurnoutReportsTable = true;
    }
  }

  private async ensureBloodReportsTable(): Promise<void> {
    if (this.ensuredBloodReportsTable) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS blood_reports (
          id VARCHAR(36) PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          profile JSONB DEFAULT '{}'::jsonb,
          markers JSONB DEFAULT '[]'::jsonb,
          analysis JSONB DEFAULT '{}'::jsonb,
          ai_report TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_blood_reports_email ON blood_reports(email)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_blood_reports_created_at ON blood_reports(created_at)`);
      // Add delivery scheduling columns if missing
      await pool.query(`ALTER TABLE blood_reports ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(32) DEFAULT 'PENDING'`);
      await pool.query(`ALTER TABLE blood_reports ADD COLUMN IF NOT EXISTS delivery_retries INTEGER DEFAULT 0`);
      await pool.query(`ALTER TABLE blood_reports ADD COLUMN IF NOT EXISTS report_scheduled_for TIMESTAMP`);
      await pool.query(`ALTER TABLE blood_reports ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP`);
      this.ensuredBloodReportsTable = true;
    } catch (err) {
      console.error("[Storage] Error creating blood_reports table:", err);
    }
  }

  // ==================== CONTACTS (single source of truth) ====================

  private async ensureContactsTableCreated(): Promise<void> {
    if (this.ensuredContactsTable) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS contacts (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL UNIQUE,
          name VARCHAR(255),
          source VARCHAR(50) NOT NULL DEFAULT 'discovery',
          products TEXT[] DEFAULT '{}',
          total_spent_cents INTEGER DEFAULT 0,
          has_discovery BOOLEAN DEFAULT FALSE,
          has_anabolic BOOLEAN DEFAULT FALSE,
          has_ultimate BOOLEAN DEFAULT FALSE,
          has_blood BOOLEAN DEFAULT FALSE,
          has_peptides BOOLEAN DEFAULT FALSE,
          has_coaching BOOLEAN DEFAULT FALSE,
          last_activity_at TIMESTAMP DEFAULT NOW(),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts (email)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts (source)`);
      this.ensuredContactsTable = true;
    } catch (err) {
      console.error("[Storage] Error creating contacts table:", err);
      this.ensuredContactsTable = true;
    }
  }

  async syncContacts(): Promise<{ total: number; new: number }> {
    await this.ensureContactsTableCreated();

    // Batch sync via single SQL statements
    // Source 1: audits → contacts
    await pool.query(`
      INSERT INTO contacts (email, name, source, has_discovery, has_anabolic, has_ultimate, has_blood, last_activity_at)
      SELECT LOWER(a.email), (a.responses->>'prenom')::VARCHAR(255), 'discovery',
        CASE WHEN a.type = 'GRATUIT' THEN TRUE ELSE FALSE END,
        CASE WHEN a.type = 'PREMIUM' THEN TRUE ELSE FALSE END,
        CASE WHEN a.type = 'ELITE' THEN TRUE ELSE FALSE END,
        CASE WHEN a.type = 'BLOOD_ANALYSIS' THEN TRUE ELSE FALSE END,
        COALESCE(a.created_at, NOW())
      FROM audits a
      WHERE a.email IS NOT NULL
        AND a.email NOT LIKE '%test%' AND a.email NOT LIKE '%debug%'
        AND a.email NOT LIKE '%achzodcoaching%' AND a.email NOT LIKE '%achkou%'
      ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(contacts.name, EXCLUDED.name),
        has_discovery = contacts.has_discovery OR EXCLUDED.has_discovery,
        has_anabolic = contacts.has_anabolic OR EXCLUDED.has_anabolic,
        has_ultimate = contacts.has_ultimate OR EXCLUDED.has_ultimate,
        has_blood = contacts.has_blood OR EXCLUDED.has_blood,
        last_activity_at = GREATEST(contacts.last_activity_at, EXCLUDED.last_activity_at),
        updated_at = NOW()
    `).catch(err => console.error("[Contacts] Audit sync error:", err.message));

    // Source 2: paid orders → contacts
    await pool.query(`
      INSERT INTO contacts (email, source, total_spent_cents, has_peptides, has_blood, has_anabolic, has_ultimate, last_activity_at)
      SELECT LOWER(o.email), 'order', COALESCE(o.final_amount_cents, 0),
        CASE WHEN o.product_type = 'PEPTIDES_ENGINE' THEN TRUE ELSE FALSE END,
        CASE WHEN o.product_type = 'BLOOD_ANALYSIS' THEN TRUE ELSE FALSE END,
        CASE WHEN o.product_type = 'PREMIUM' THEN TRUE ELSE FALSE END,
        CASE WHEN o.product_type = 'ELITE' THEN TRUE ELSE FALSE END,
        COALESCE(o.paid_at, NOW())
      FROM orders o
      WHERE o.status = 'paid' AND o.email IS NOT NULL
        AND o.email NOT LIKE '%test%' AND o.email NOT LIKE '%debug%'
        AND o.email NOT LIKE '%achzodcoaching%'
      ON CONFLICT (email) DO UPDATE SET
        total_spent_cents = contacts.total_spent_cents + EXCLUDED.total_spent_cents,
        has_peptides = contacts.has_peptides OR EXCLUDED.has_peptides,
        has_blood = contacts.has_blood OR EXCLUDED.has_blood,
        has_anabolic = contacts.has_anabolic OR EXCLUDED.has_anabolic,
        has_ultimate = contacts.has_ultimate OR EXCLUDED.has_ultimate,
        last_activity_at = GREATEST(contacts.last_activity_at, EXCLUDED.last_activity_at),
        updated_at = NOW()
    `).catch(err => console.error("[Contacts] Orders sync error:", err.message));

    const res = await pool.query("SELECT COUNT(*) as count FROM contacts");
    const total = parseInt(res.rows[0]?.count || "0");
    return { total, new: total };
  }

  async getAllContacts(): Promise<any[]> {
    await this.ensureContactsTableCreated();
    const res = await pool.query("SELECT * FROM contacts ORDER BY last_activity_at DESC");
    return res.rows;
  }

  async getContactStats(): Promise<any> {
    await this.ensureContactsTableCreated();
    const res = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE has_discovery) as discovery,
        COUNT(*) FILTER (WHERE has_anabolic) as anabolic,
        COUNT(*) FILTER (WHERE has_ultimate) as ultimate,
        COUNT(*) FILTER (WHERE has_blood) as blood,
        COUNT(*) FILTER (WHERE has_peptides) as peptides,
        SUM(total_spent_cents) as total_revenue_cents
      FROM contacts
    `);
    return res.rows[0];
  }

  // ==================== ORDERS ====================

  private async ensureOrdersTableCreated(): Promise<void> {
    if (this.ensuredOrdersTable) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(36),
          email VARCHAR(255) NOT NULL,
          product_type VARCHAR(30) NOT NULL,
          product_name VARCHAR(100) NOT NULL,
          amount_cents INTEGER NOT NULL DEFAULT 0,
          currency VARCHAR(10) NOT NULL DEFAULT 'eur',
          discount_cents INTEGER NOT NULL DEFAULT 0,
          promo_code VARCHAR(50),
          promo_code_id VARCHAR(36),
          final_amount_cents INTEGER NOT NULL DEFAULT 0,
          stripe_checkout_session_id VARCHAR(255),
          stripe_payment_intent_id VARCHAR(255),
          stripe_customer_id VARCHAR(255),
          paypal_order_id VARCHAR(255),
          status VARCHAR(30) NOT NULL DEFAULT 'pending',
          refund_amount_cents INTEGER NOT NULL DEFAULT 0,
          refund_reason TEXT,
          refund_stripe_id VARCHAR(255),
          refunded_at TIMESTAMP,
          refunded_by VARCHAR(255),
          audit_id VARCHAR(36),
          blood_report_id VARCHAR(36),
          ip_address VARCHAR(50),
          user_agent TEXT,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          paid_at TIMESTAMP,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_product_type ON orders(product_type)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_checkout_session_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_audit_id ON orders(audit_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_payment_intent ON orders(stripe_payment_intent_id)`);
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paypal_order_id VARCHAR(255)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_paypal_order ON orders(paypal_order_id)`);
      this.ensuredOrdersTable = true;
    } catch (err) {
      console.error("[Storage] Error creating orders table:", err);
      this.ensuredOrdersTable = true;
    }
  }

  private async ensurePromoCodeUsagesTableCreated(): Promise<void> {
    if (this.ensuredPromoCodeUsagesTable) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS promo_code_usages (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          promo_code_id VARCHAR(36) NOT NULL,
          promo_code VARCHAR(50) NOT NULL,
          user_id VARCHAR(36),
          email VARCHAR(255) NOT NULL,
          order_id VARCHAR(36) NOT NULL,
          discount_percent INTEGER NOT NULL DEFAULT 0,
          discount_amount_cents INTEGER NOT NULL DEFAULT 0,
          used_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_promo_usages_promo_code ON promo_code_usages(promo_code)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_promo_usages_email ON promo_code_usages(email)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_promo_usages_user_id ON promo_code_usages(user_id)`);
      this.ensuredPromoCodeUsagesTable = true;
    } catch (err) {
      console.error("[Storage] Error creating promo_code_usages table:", err);
      this.ensuredPromoCodeUsagesTable = true;
    }
  }

  async ensureExistingTableIndexes(): Promise<void> {
    if (this.ensuredExistingIndexes) return;
    try {
      // audits
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_audits_user_id ON audits(user_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_audits_email ON audits(email)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_audits_type ON audits(type)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_audits_created_at ON audits(created_at DESC)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_audits_delivery_status ON audits(report_delivery_status)`);
      // users
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      // questionnaire_progress
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_qp_email ON questionnaire_progress(email)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_qp_status ON questionnaire_progress(status)`);
      // promo_codes
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active)`);
    } catch (err) {
      console.error("[Storage] Error creating missing indexes:", err);
    } finally {
      this.ensuredExistingIndexes = true;
    }
  }

  private rowToOrder(row: any): Order {
    return {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      productType: row.product_type,
      productName: row.product_name,
      amountCents: Number(row.amount_cents),
      currency: row.currency,
      discountCents: Number(row.discount_cents),
      promoCode: row.promo_code,
      promoCodeId: row.promo_code_id,
      finalAmountCents: Number(row.final_amount_cents),
      stripeCheckoutSessionId: row.stripe_checkout_session_id,
      stripePaymentIntentId: row.stripe_payment_intent_id,
      stripeCustomerId: row.stripe_customer_id,
      paypalOrderId: row.paypal_order_id || null,
      status: row.status,
      refundAmountCents: Number(row.refund_amount_cents),
      refundReason: row.refund_reason,
      refundStripeId: row.refund_stripe_id,
      refundedAt: row.refunded_at,
      refundedBy: row.refunded_by,
      auditId: row.audit_id,
      bloodReportId: row.blood_report_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      metadata: row.metadata,
      createdAt: row.created_at,
      paidAt: row.paid_at,
      updatedAt: row.updated_at,
    };
  }

  async createOrder(input: CreateOrderInput): Promise<Order> {
    await this.ensureOrdersTableCreated();
    const id = randomUUID();
    const productName = input.productName || ProductDisplayNames[input.productType] || input.productType;
    const amountCents = input.amountCents;
    const discountCents = input.discountCents ?? 0;
    const finalAmountCents = input.finalAmountCents ?? Math.max(0, amountCents - discountCents);

    const result = await pool.query(
      `INSERT INTO orders (id, user_id, email, product_type, product_name, amount_cents, currency,
        discount_cents, promo_code, promo_code_id, final_amount_cents, stripe_checkout_session_id,
        paypal_order_id, ip_address, user_agent, metadata, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pending',NOW(),NOW())
       RETURNING *`,
      [
        id,
        input.userId || null,
        input.email.trim().toLowerCase(),
        input.productType,
        productName,
        amountCents,
        input.currency || "eur",
        discountCents,
        input.promoCode || null,
        input.promoCodeId || null,
        finalAmountCents,
        input.stripeCheckoutSessionId || null,
        input.paypalOrderId || null,
        input.ipAddress || null,
        input.userAgent || null,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ]
    );
    return this.rowToOrder(result.rows[0]);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    await this.ensureOrdersTableCreated();
    const result = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
    if (result.rows.length === 0) return undefined;
    return this.rowToOrder(result.rows[0]);
  }

  async getOrderByStripeSession(sessionId: string, forUpdate = false): Promise<Order | undefined> {
    await this.ensureOrdersTableCreated();
    const sql = forUpdate
      ? "SELECT * FROM orders WHERE stripe_checkout_session_id = $1 FOR UPDATE"
      : "SELECT * FROM orders WHERE stripe_checkout_session_id = $1";
    const result = await pool.query(sql, [sessionId]);
    if (result.rows.length === 0) return undefined;
    return this.rowToOrder(result.rows[0]);
  }

  async getOrderByPaymentIntent(paymentIntentId: string): Promise<Order | undefined> {
    await this.ensureOrdersTableCreated();
    const result = await pool.query(
      "SELECT * FROM orders WHERE stripe_payment_intent_id = $1",
      [paymentIntentId]
    );
    if (result.rows.length === 0) return undefined;
    return this.rowToOrder(result.rows[0]);
  }

  async getOrderByPaypalOrderId(paypalOrderId: string): Promise<Order | undefined> {
    await this.ensureOrdersTableCreated();
    const result = await pool.query(
      "SELECT * FROM orders WHERE paypal_order_id = $1",
      [paypalOrderId]
    );
    if (result.rows.length === 0) return undefined;
    return this.rowToOrder(result.rows[0]);
  }

  async getOrdersByUserId(userId: string): Promise<Order[]> {
    await this.ensureOrdersTableCreated();
    const result = await pool.query(
      "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return result.rows.map((r: any) => this.rowToOrder(r));
  }

  async getOrdersByEmail(email: string): Promise<Order[]> {
    await this.ensureOrdersTableCreated();
    const result = await pool.query(
      "SELECT * FROM orders WHERE LOWER(email) = $1 ORDER BY created_at DESC",
      [email.trim().toLowerCase()]
    );
    return result.rows.map((r: any) => this.rowToOrder(r));
  }

  async getAllOrders(opts?: {
    limit?: number;
    offset?: number;
    status?: OrderStatusEnum;
    productType?: ProductTypeEnum;
    email?: string;
  }): Promise<{ orders: Order[]; total: number }> {
    await this.ensureOrdersTableCreated();
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (opts?.status) {
      conditions.push(`status = $${idx++}`);
      values.push(opts.status);
    }
    if (opts?.productType) {
      conditions.push(`product_type = $${idx++}`);
      values.push(opts.productType);
    }
    if (opts?.email) {
      conditions.push(`LOWER(email) = $${idx++}`);
      values.push(opts.email.trim().toLowerCase());
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const countResult = await pool.query(`SELECT COUNT(*) FROM orders ${where}`, values);
    const total = Number(countResult.rows[0].count);

    const limit = opts?.limit || 50;
    const offset = opts?.offset || 0;
    const dataValues = [...values, limit, offset];
    const result = await pool.query(
      `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      dataValues
    );

    return { orders: result.rows.map((r: any) => this.rowToOrder(r)), total };
  }

  async updateOrder(id: string, data: Partial<Order>): Promise<Order | undefined> {
    await this.ensureOrdersTableCreated();
    const updates: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const fieldMap: Record<string, string> = {
      userId: "user_id",
      email: "email",
      status: "status",
      stripeCheckoutSessionId: "stripe_checkout_session_id",
      stripePaymentIntentId: "stripe_payment_intent_id",
      stripeCustomerId: "stripe_customer_id",
      paypalOrderId: "paypal_order_id",
      auditId: "audit_id",
      bloodReportId: "blood_report_id",
      paidAt: "paid_at",
      refundAmountCents: "refund_amount_cents",
      refundReason: "refund_reason",
      refundStripeId: "refund_stripe_id",
      refundedAt: "refunded_at",
      refundedBy: "refunded_by",
      metadata: "metadata",
    };

    for (const [key, col] of Object.entries(fieldMap)) {
      if ((data as any)[key] !== undefined) {
        updates.push(`${col} = $${idx++}`);
        const val = (data as any)[key];
        values.push(key === "metadata" ? JSON.stringify(val) : val);
      }
    }

    if (updates.length === 0) return this.getOrder(id);

    updates.push(`updated_at = NOW()`);
    values.push(id);
    const result = await pool.query(
      `UPDATE orders SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return undefined;
    const updatedOrder = this.rowToOrder(result.rows[0]);

    // P2 ,  abandonment-reminder conversion tracking. When an order
    // transitions to `paid`, look for any reminder sent to this email
    // within the last 14 days and stamp it as converted. Best effort: we
    // never block the order update on this side-effect.
    if (data.status === "paid" && updatedOrder?.email) {
      try {
        const cents = updatedOrder.finalAmountCents ?? updatedOrder.amountCents ?? 0;
        await this.markReminderConvertedByEmail(updatedOrder.email, cents, 14);
        if (cents > 0) {
          const conversionType = `${String(updatedOrder.productType || "order").toLowerCase()}_purchase`;
          await this.markEmailTrackingConvertedByEmail(updatedOrder.email, cents, conversionType, 14);
        }
      } catch (err) {
        console.warn("[Reminder] Conversion tracking failed for", updatedOrder.email, err);
      }
    }

    return updatedOrder;
  }

  // Atomically link audit to order (prevents race conditions on confirm-session double-clicks)
  async claimOrderForAudit(orderId: string, auditId: string): Promise<boolean> {
    await this.ensureOrdersTableCreated();
    const result = await pool.query(
      "UPDATE orders SET audit_id = $1, updated_at = NOW() WHERE id = $2 AND audit_id IS NULL RETURNING id",
      [auditId, orderId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Atomic CAS for peptides report ,  only set if not already set. Prevents two concurrent
  // generators (autogen + admin + inline) from both delivering reports to the same client.
  // First writer wins; losers must discard their work.
  async claimPeptidesReportSlot(orderId: string, reportId: string): Promise<boolean> {
    await this.ensureOrdersTableCreated();
    const result = await pool.query(
      `UPDATE orders
         SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
               'peptidesReportId', $1::text,
               'peptidesGenerationState', 'SUCCEEDED',
               'peptidesGenerationLeaseUntil', '',
               'peptidesGenerationCompletedAt', NOW()::text
             ),
             updated_at = NOW()
       WHERE id = $2
         AND (metadata IS NULL OR metadata->>'peptidesReportId' IS NULL OR metadata->>'peptidesReportId' = '')
       RETURNING id`,
      [reportId, orderId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Atomic JSONB merge: set a single key without touching anything else. Avoids
  // the read-modify-write stomp pattern that wipes concurrently-set siblings.
  async setOrderMetadataKey(orderId: string, key: string, value: unknown): Promise<boolean> {
    await this.ensureOrdersTableCreated();
    const jsonValue = JSON.stringify(value);
    const result = await pool.query(
      `UPDATE orders
         SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object($1::text, $2::jsonb),
             updated_at = NOW()
       WHERE id = $3
       RETURNING id`,
      [key, jsonValue, orderId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async resetPeptidesGenerationCircuit(orderId: string): Promise<boolean> {
    await this.ensureOrdersTableCreated();
    const result = await pool.query(
      `UPDATE orders
          SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'peptidesGenerationState', 'PENDING',
                'peptidesGenerationAttempts', 0,
                'peptidesGenerationReservedCostMicroUsd', 0,
                'peptidesGenerationLeaseUntil', '',
                'peptidesGenerationStartedAt', '',
                'peptidesGenerationFailedAt', '',
                'peptidesGenerationCompletedAt', '',
                'peptidesGenerationLastError', '',
                'peptidesGenerationReviewReason', ''
              ),
              updated_at = NOW()
        WHERE id = $1
          AND COALESCE(metadata->>'peptidesReportId', '') = ''
      RETURNING id`,
      [orderId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async claimPeptidesGenerationAttempt(
    orderId: string,
    config: PeptidesGenerationCircuitConfig,
  ): Promise<PeptidesGenerationAttemptClaim | null> {
    await this.ensureOrdersTableCreated();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      // One global transaction lock serializes claims across different order
      // rows. Row locks alone cannot enforce an hourly/day budget atomically.
      await client.query("SELECT pg_advisory_xact_lock(hashtext('peptides_autogen_budget_v1'))");
      const windowResult = await client.query(
        `SELECT
           COALESCE(SUM(
             CASE WHEN NULLIF(metadata->>'peptidesGenerationStartedAt', '')::timestamptz > NOW() - INTERVAL '1 hour'
               THEN COALESCE((metadata->>'peptidesGenerationReservedCostMicroUsd')::bigint, 0)
               ELSE 0 END
           ), 0)::bigint AS hourly_reserved,
           COALESCE(SUM(
             CASE WHEN NULLIF(metadata->>'peptidesGenerationStartedAt', '')::timestamptz > NOW() - INTERVAL '24 hours'
               THEN COALESCE((metadata->>'peptidesGenerationReservedCostMicroUsd')::bigint, 0)
               ELSE 0 END
           ), 0)::bigint AS daily_reserved
         FROM orders
         WHERE product_type = 'PEPTIDES_ENGINE'
           AND status = 'paid'
           AND NULLIF(metadata->>'peptidesGenerationStartedAt', '') IS NOT NULL`,
      );
      const hourlyReserved = Number(windowResult.rows[0]?.hourly_reserved || 0);
      const dailyReserved = Number(windowResult.rows[0]?.daily_reserved || 0);
      if (
        hourlyReserved + config.attemptBudgetMicroUsd > config.maxHourlyBudgetMicroUsd
        || dailyReserved + config.attemptBudgetMicroUsd > config.maxDailyBudgetMicroUsd
      ) {
        await client.query("ROLLBACK");
        return null;
      }

      const result = await client.query(
        `UPDATE orders
          SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'peptidesGenerationState', 'GENERATING',
                'peptidesGenerationAttempts', COALESCE((metadata->>'peptidesGenerationAttempts')::int, 0) + 1,
                'peptidesGenerationReservedCostMicroUsd', COALESCE((metadata->>'peptidesGenerationReservedCostMicroUsd')::bigint, 0) + $1::bigint,
                'peptidesGenerationLeaseUntil', (NOW() + ($2::bigint * INTERVAL '1 millisecond'))::text,
                'peptidesGenerationStartedAt', NOW()::text,
                'peptidesGenerationLastError', '',
                'peptidesGenerationReviewReason', ''
              ),
              updated_at = NOW()
        WHERE id = $3
          AND product_type = 'PEPTIDES_ENGINE'
          AND status = 'paid'
          AND COALESCE(metadata->>'peptidesReportId', '') = ''
          AND COALESCE(metadata->>'peptidesGenerationState', 'PENDING') <> 'NEEDS_REVIEW'
          AND (
            COALESCE(metadata->>'peptidesGenerationState', 'PENDING') <> 'GENERATING'
            OR COALESCE(NULLIF(metadata->>'peptidesGenerationLeaseUntil', '')::timestamptz, '-infinity'::timestamptz) <= NOW()
          )
          AND COALESCE((metadata->>'peptidesGenerationAttempts')::int, 0) < $4::int
          AND COALESCE((metadata->>'peptidesGenerationReservedCostMicroUsd')::bigint, 0) + $1::bigint <= $5::bigint
      RETURNING
        (metadata->>'peptidesGenerationAttempts')::int AS attempt_count,
        (metadata->>'peptidesGenerationReservedCostMicroUsd')::bigint AS reserved_cost_micro_usd,
        metadata->>'peptidesGenerationLeaseUntil' AS lease_until`,
        [
          config.attemptBudgetMicroUsd,
          config.leaseMs,
          orderId,
          config.maxAttempts,
          config.maxBudgetMicroUsd,
        ],
      );
      if ((result.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");
        return null;
      }
      await client.query("COMMIT");
      return {
        attemptCount: Number(result.rows[0].attempt_count),
        reservedCostMicroUsd: Number(result.rows[0].reserved_cost_micro_usd),
        leaseUntil: String(result.rows[0].lease_until),
      };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      // Fail closed: a DB/counter error must never fall through to provider.
      console.error("[Peptides Circuit] Atomic budget claim failed:", error);
      return null;
    } finally {
      client.release();
    }
  }

  async markPeptidesGenerationNeedsReview(
    orderId: string,
    reason: string,
    error: string,
  ): Promise<boolean> {
    await this.ensureOrdersTableCreated();
    const result = await pool.query(
      `UPDATE orders
          SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'peptidesGenerationState', 'NEEDS_REVIEW',
                'peptidesGenerationReviewReason', $1::text,
                'peptidesGenerationLastError', $2::text,
                'peptidesGenerationFailedAt', NOW()::text,
                'peptidesGenerationLeaseUntil', ''
              ),
              updated_at = NOW()
        WHERE id = $3
          AND COALESCE(metadata->>'peptidesReportId', '') = ''
      RETURNING id`,
      [reason.slice(0, 120), error.slice(0, 800), orderId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Cross-order protection for Peptides ,  returns true if ANY paid Peptides order of the same
  // email already has a peptidesReportId. The alexm2220 incident (2026-03-30) shipped two
  // reports because the client paid twice (two Stripe orders 5 min apart) and each order
  // independently won its own per-order CAS. Email dedup via email_tracking would normally
  // catch this at send time, but the dedup query depends on the tracking row being present
  // and non-failed ,  a SendPulse outage or a purged tracking table opens the same hole.
  // Checking at generation-time, before the 60s AI call, is cheap and closes it permanently.
  async hasAnyPeptidesReportForEmail(email: string): Promise<{ exists: boolean; existingOrderId?: string; existingReportId?: string }> {
    await this.ensureOrdersTableCreated();
    const result = await pool.query(
      `SELECT id, metadata->>'peptidesReportId' AS report_id
         FROM orders
        WHERE product_type = 'PEPTIDES_ENGINE'
          AND status = 'paid'
          AND LOWER(email) = LOWER($1)
          AND metadata->>'peptidesReportId' IS NOT NULL
          AND metadata->>'peptidesReportId' <> ''
        ORDER BY created_at ASC
        LIMIT 1`,
      [email]
    );
    if ((result.rowCount ?? 0) === 0) return { exists: false };
    return {
      exists: true,
      existingOrderId: result.rows[0].id,
      existingReportId: result.rows[0].report_id,
    };
  }

  // Atomic CAS for audit report generation ,  transition to GENERATING only if the audit is
  // in a terminal-failure or initial state. Prevents two concurrent generators (e.g. inline
  // create + Stripe webhook, or admin regenerate + scheduled cron) from producing two
  // different reports for the same client.
  async claimAuditForGeneration(auditId: string): Promise<boolean> {
    const audit = await this.getAudit(auditId);
    if (!audit || audit.type === "GRATUIT") {
      return false;
    }
    const result = await pool.query(
      `UPDATE audits
          SET report_delivery_status = 'GENERATING'
        WHERE id = $1
          AND type <> 'GRATUIT'
          AND (report_delivery_status IS NULL
               OR report_delivery_status IN ('PENDING','NEEDS_REVIEW','EMAIL_FAILED','FAILED'))
          AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
        RETURNING id`,
      [auditId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Atomic CAS for audit email send ,  transition to SENDING only if not already sent.
  // Prevents the same audit from being emailed twice concurrently (inline send + admin
  // resend + scheduled delivery cron all racing).
  async claimAuditForSending(auditId: string): Promise<boolean> {
    const audit = await this.getAudit(auditId);
    if (!audit || audit.type === "GRATUIT") {
      return false;
    }
    const result = await pool.query(
      `UPDATE audits
          SET report_delivery_status = 'SENDING'
        WHERE id = $1
          AND type <> 'GRATUIT'
          AND report_sent_at IS NULL
          AND report_delivery_status IN ('READY','SCHEDULED')
          AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}
        RETURNING id`,
      [auditId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async finalizeAuditSend(auditId: string, sent: boolean): Promise<void> {
    const audit = await this.getAudit(auditId);
    if (!audit || audit.type === "GRATUIT") {
      return;
    }
    if (sent) {
      await pool.query(
        `UPDATE audits
            SET report_delivery_status = 'SENT',
                report_sent_at = NOW()
          WHERE id = $1
            AND type <> 'GRATUIT'
            AND report_sent_at IS NULL
            AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}`,
        [auditId]
      );
    } else {
      await pool.query(
        `UPDATE audits
            SET report_delivery_status = 'READY'
          WHERE id = $1
            AND type <> 'GRATUIT'
            AND report_delivery_status = 'SENDING'
            AND report_sent_at IS NULL
            AND ${DISCOVERY_SUPERSEDED_TERMINAL_SQL}`,
        [auditId]
      );
    }
  }

  async hasReportReadyEmailBeenSent(auditId: string): Promise<boolean> {
    // This is a duplicate-send guard, not acceptance proof: any prior attempt
    // that is not explicitly terminal-failed must stop a blind retry. Database
    // failures are intentionally propagated so callers fail closed.
    const result = await pool.query(
      `SELECT 1 FROM email_tracking
        WHERE audit_id = $1
          AND email_type = 'sendReportReadyEmail'
          AND (sendpulse_status IS NULL
               OR sendpulse_status NOT IN ('failed','auth_failed','unsubscribed'))
        LIMIT 1`,
      [auditId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findRecentAuditByEmailAndType(email: string, type: string, minutes: number): Promise<Audit | undefined> {
    const result = await pool.query(
      `SELECT * FROM audits
        WHERE LOWER(email) = LOWER($1)
          AND type = $2
          AND created_at > NOW() - ($3 || ' minutes')::interval
        ORDER BY created_at DESC
        LIMIT 1`,
      [email, type, String(minutes)]
    );
    if (result.rows.length === 0) return undefined;
    return this.rowToAudit(result.rows[0]);
  }

  // Promo code usage tracking

  async createPromoCodeUsage(input: Omit<PromoCodeUsage, "id" | "usedAt">): Promise<PromoCodeUsage> {
    await this.ensurePromoCodeUsagesTableCreated();
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO promo_code_usages (id, promo_code_id, promo_code, user_id, email, order_id, discount_percent, discount_amount_cents)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        id,
        input.promoCodeId,
        input.promoCode.toUpperCase(),
        input.userId || null,
        input.email.trim().toLowerCase(),
        input.orderId,
        input.discountPercent,
        input.discountAmountCents,
      ]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      promoCodeId: row.promo_code_id,
      promoCode: row.promo_code,
      userId: row.user_id,
      email: row.email,
      orderId: row.order_id,
      discountPercent: Number(row.discount_percent),
      discountAmountCents: Number(row.discount_amount_cents),
      usedAt: row.used_at,
    };
  }

  async getPromoCodeUsagesByCode(promoCode: string): Promise<PromoCodeUsage[]> {
    await this.ensurePromoCodeUsagesTableCreated();
    const result = await pool.query(
      "SELECT * FROM promo_code_usages WHERE UPPER(promo_code) = $1 ORDER BY used_at DESC",
      [promoCode.toUpperCase()]
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      promoCodeId: row.promo_code_id,
      promoCode: row.promo_code,
      userId: row.user_id,
      email: row.email,
      orderId: row.order_id,
      discountPercent: Number(row.discount_percent),
      discountAmountCents: Number(row.discount_amount_cents),
      usedAt: row.used_at,
    }));
  }

  async getPromoCodeUsagesByEmail(email: string): Promise<PromoCodeUsage[]> {
    await this.ensurePromoCodeUsagesTableCreated();
    const result = await pool.query(
      "SELECT * FROM promo_code_usages WHERE LOWER(email) = $1 ORDER BY used_at DESC",
      [email.trim().toLowerCase()]
    );
    return result.rows.map((row: any) => ({
      id: row.id,
      promoCodeId: row.promo_code_id,
      promoCode: row.promo_code,
      userId: row.user_id,
      email: row.email,
      orderId: row.order_id,
      discountPercent: Number(row.discount_percent),
      discountAmountCents: Number(row.discount_amount_cents),
      usedAt: row.used_at,
    }));
  }

  // ==================== ABANDONMENT REMINDERS ====================

  private abandonmentRemindersTableCreated = false;

  private async ensureAbandonmentRemindersTableCreated(): Promise<void> {
    if (this.abandonmentRemindersTableCreated) return;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS abandonment_reminders (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        percent_complete INTEGER NOT NULL,
        hours_since_start INTEGER NOT NULL,
        priority_score INTEGER NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW() NOT NULL,
        opened_at TIMESTAMP DEFAULT NULL,
        clicked_at TIMESTAMP DEFAULT NULL,
        converted_at TIMESTAMP DEFAULT NULL,
        converted_amount_cents INTEGER DEFAULT NULL,
        audit_id VARCHAR(36),
        resume_token VARCHAR(64),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    // Add columns if they didn't exist on legacy DBs.
    try { await pool.query(`ALTER TABLE abandonment_reminders ADD COLUMN IF NOT EXISTS resume_token VARCHAR(64)`); } catch {}
    try { await pool.query(`ALTER TABLE abandonment_reminders ADD COLUMN IF NOT EXISTS converted_amount_cents INTEGER`); } catch {}

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_abandonment_reminders_email
      ON abandonment_reminders(email)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_abandonment_reminders_sent_at
      ON abandonment_reminders(sent_at)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_abandonment_reminders_resume_token
      ON abandonment_reminders(resume_token)
    `);

    this.abandonmentRemindersTableCreated = true;
  }

  async getIncompleteQuestionnaires(): Promise<QuestionnaireProgress[]> {
    // Use the existing getAllIncompleteProgress which has the correct status filter
    return this.getAllIncompleteProgress();
  }

  async hasRecentReminder(email: string, hours: number): Promise<boolean> {
    await this.ensureAbandonmentRemindersTableCreated();
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM abandonment_reminders
       WHERE LOWER(email) = $1 AND sent_at >= NOW() - INTERVAL '${hours} hours'`,
      [email.toLowerCase()]
    );
    return parseInt(result.rows[0]?.count || '0') > 0;
  }

  async logAbandonmentReminder(data: {
    email: string;
    percentComplete: number;
    hoursSinceStart: number;
    priorityScore: number;
    resumeToken?: string;
  }): Promise<void> {
    await this.ensureAbandonmentRemindersTableCreated();
    await pool.query(
      `INSERT INTO abandonment_reminders (email, percent_complete, hours_since_start, priority_score, resume_token)
       VALUES ($1, $2, $3, $4, $5)`,
      [data.email.toLowerCase(), data.percentComplete, data.hoursSinceStart, data.priorityScore, data.resumeToken ?? null]
    );
  }

  async getAbandonmentReminderByToken(token: string): Promise<{ email: string; sent_at: Date } | null> {
    if (!token) return null;
    await this.ensureAbandonmentRemindersTableCreated();
    const r = await pool.query(
      `SELECT email, sent_at FROM abandonment_reminders
        WHERE resume_token = $1
        ORDER BY sent_at DESC
        LIMIT 1`,
      [token]
    );
    if (r.rows.length === 0) return null;
    return { email: r.rows[0].email, sent_at: r.rows[0].sent_at };
  }

  async markReminderClicked(token: string): Promise<void> {
    if (!token) return;
    await this.ensureAbandonmentRemindersTableCreated();
    await pool.query(
      `UPDATE abandonment_reminders
          SET clicked_at = COALESCE(clicked_at, NOW())
        WHERE resume_token = $1`,
      [token]
    );
  }

  async markReminderOpened(token: string): Promise<void> {
    if (!token) return;
    await this.ensureAbandonmentRemindersTableCreated();
    await pool.query(
      `UPDATE abandonment_reminders
          SET opened_at = COALESCE(opened_at, NOW())
        WHERE resume_token = $1`,
      [token]
    );
  }

  async markReminderConvertedByEmail(
    email: string,
    amountCents: number,
    withinDays: number = 14,
  ): Promise<number> {
    if (!email) return 0;
    await this.ensureAbandonmentRemindersTableCreated();
    const r = await pool.query(
      `UPDATE abandonment_reminders
          SET converted_at = COALESCE(converted_at, NOW()),
              converted_amount_cents = COALESCE(converted_amount_cents, $2)
        WHERE LOWER(email) = LOWER($1)
          AND converted_at IS NULL
          AND sent_at >= NOW() - ($3 || ' days')::interval
       RETURNING id`,
      [email, amountCents, String(withinDays)]
    );
    return r.rowCount ?? 0;
  }

  async getAbandonmentStats(days: number): Promise<{
    last24h: { sent: number; openRate: number; clickRate: number; conversions: number };
    last7days: { sent: number; openRate: number; conversions: number; revenue: number };
    pending: { count: number; highPriority: number; mediumPriority: number; lastChance: number };
    recommendations: string[];
  }> {
    await this.ensureAbandonmentRemindersTableCreated();

    // Stats dernières 24h
    const last24hResult = await pool.query(`
      SELECT
        COUNT(*) as sent,
        COUNT(opened_at) as opened,
        COUNT(clicked_at) as clicked,
        COUNT(converted_at) as conversions
      FROM abandonment_reminders
      WHERE sent_at >= NOW() - INTERVAL '24 hours'
    `);

    const last24h = last24hResult.rows[0];
    const sent24h = parseInt(last24h.sent || '0');
    const openRate24h = sent24h > 0 ? Math.round((parseInt(last24h.opened || '0') / sent24h) * 100) : 0;
    const clickRate24h = sent24h > 0 ? Math.round((parseInt(last24h.clicked || '0') / sent24h) * 100) : 0;
    const conversions24h = parseInt(last24h.conversions || '0');

    // Stats derniers 7 jours ,  sums real converted amounts now that
    // markReminderConvertedByEmail records the actual order cents.
    const last7dResult = await pool.query(`
      SELECT
        COUNT(*) as sent,
        COUNT(opened_at) as opened,
        COUNT(converted_at) as conversions,
        COALESCE(SUM(converted_amount_cents), 0) as converted_cents
      FROM abandonment_reminders
      WHERE sent_at >= NOW() - INTERVAL '7 days'
    `);

    const last7d = last7dResult.rows[0];
    const sent7d = parseInt(last7d.sent || '0');
    const openRate7d = sent7d > 0 ? Math.round((parseInt(last7d.opened || '0') / sent7d) * 100) : 0;
    const conversions7d = parseInt(last7d.conversions || '0');
    const revenue = Math.round(parseInt(last7d.converted_cents || '0') / 100);

    // Pending abandons
    const incomplete = await this.getIncompleteQuestionnaires();
    const launchDate = new Date('2026-03-17T00:00:00Z');
    const realIncomplete = incomplete.filter(q => new Date(q.startedAt) >= launchDate);

    const highPriority = realIncomplete.filter(q => parseInt(q.percentComplete) >= 75).length;
    const mediumPriority = realIncomplete.filter(q => {
      const pct = parseInt(q.percentComplete);
      return pct >= 25 && pct < 75;
    }).length;

    // Recommandations
    const recommendations: string[] = [];
    if (highPriority > 0) {
      recommendations.push(`${highPriority} abandons haute priorité (>75%) à relancer en urgence`);
    }
    if (openRate24h < 20 && sent24h > 10) {
      recommendations.push('Taux d\'ouverture faible (<20%) - tester un nouveau sujet');
    }
    if (conversions7d === 0 && sent7d > 20) {
      recommendations.push('Aucune conversion sur 7j - revoir le message et l\'offre');
    }

    return {
      last24h: {
        sent: sent24h,
        openRate: openRate24h,
        clickRate: clickRate24h,
        conversions: parseInt(last24h.conversions || '0'),
      },
      last7days: {
        sent: sent7d,
        openRate: openRate7d,
        conversions: conversions7d,
        revenue,
      },
      pending: {
        count: realIncomplete.length,
        highPriority,
        mediumPriority,
        lastChance: realIncomplete.length - highPriority - mediumPriority,
      },
      recommendations,
    };
  }
}

export const storage = new PgStorage();

// ==================== REVIEW STORAGE (PostgreSQL) ====================

export type ReviewStatusEnum = 'pending' | 'approved' | 'rejected';
export type AuditTypeEnum = 'DISCOVERY' | 'ANABOLIC_BIOSCAN' | 'ULTIMATE_SCAN' | 'BLOOD_ANALYSIS';

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
  promoCodeSentAt?: Date;
  adminNotes?: string;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface InsertReview {
  auditId: string;
  userId?: string;
  email: string;
  auditType: ReviewAuditTypeEnum;
  rating: number;
  comment: string;
}

// Promo codes mapping by audit type
export const PROMO_CODES_BY_AUDIT_TYPE: Record<ReviewAuditTypeEnum, { code: string; description: string }> = {
  'DISCOVERY': { code: 'DISCOVERY20', description: '-20% sur le coaching Achzod' },
  'ANABOLIC_BIOSCAN': { code: 'BIOSCAN59', description: '59€ déduits du coaching' },
  'ULTIMATE_SCAN': { code: 'ULTIMATE79', description: '79€ déduits du coaching' },
  'BLOOD_ANALYSIS': { code: 'BLOOD99', description: '99€ déduits du coaching' },
  'PEPTIDES_ENGINE': { code: 'PEPTIDES20', description: '-20% sur le coaching Achzod' },
};

export interface IReviewStorage {
  createReview(data: InsertReview): Promise<Review>;
  getReviewById(id: string): Promise<Review | undefined>;
  getReviewByAuditId(auditId: string): Promise<Review | undefined>;
  getApprovedReviews(): Promise<Review[]>;
  getPendingReviews(): Promise<Review[]>;
  getAllReviews(): Promise<Review[]>;
  approveReview(id: string, reviewedBy?: string, adminNotes?: string): Promise<Review | undefined>;
  rejectReview(id: string, reviewedBy?: string, adminNotes?: string): Promise<Review | undefined>;
  markPromoCodeSent(id: string, promoCode: string): Promise<Review | undefined>;
}

class PgReviewStorage implements IReviewStorage {
  private ensuredReviewsTable = false;

  private async ensureReviewsTable(): Promise<void> {
    if (this.ensuredReviewsTable) return;
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    } catch (error) {
      console.warn("[Reviews] Unable to ensure pgcrypto extension:", error);
    }
    await pool.query(
      `CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(36) PRIMARY KEY,
        audit_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36),
        email VARCHAR(255) NOT NULL,
        audit_type VARCHAR(50) NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        promo_code VARCHAR(50),
        promo_code_sent_at TIMESTAMP,
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        reviewed_at TIMESTAMP,
        reviewed_by VARCHAR(255)
      )`
    );
    await pool.query(`ALTER TABLE IF EXISTS reviews ALTER COLUMN id DROP DEFAULT`);
    const addColumns = [
      `ALTER TABLE IF EXISTS reviews ADD COLUMN IF NOT EXISTS audit_id VARCHAR(36)`,
      `ALTER TABLE IF EXISTS reviews ADD COLUMN IF NOT EXISTS user_id VARCHAR(36)`,
      `ALTER TABLE IF EXISTS reviews ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
      `ALTER TABLE IF EXISTS reviews ADD COLUMN IF NOT EXISTS audit_type VARCHAR(50)`,
      `ALTER TABLE IF EXISTS reviews ADD COLUMN IF NOT EXISTS rating INTEGER`,
      `ALTER TABLE IF EXISTS reviews ADD COLUMN IF NOT EXISTS comment TEXT`,
      `ALTER TABLE IF EXISTS reviews ADD COLUMN IF NOT EXISTS status VARCHAR(20)`,
      `ALTER TABLE IF EXISTS reviews ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50)`,
      `ALTER TABLE IF EXISTS reviews ADD COLUMN IF NOT EXISTS promo_code_sent_at TIMESTAMP`,
      `ALTER TABLE IF EXISTS reviews ADD COLUMN IF NOT EXISTS admin_notes TEXT`,
      `ALTER TABLE IF EXISTS reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMP`,
      `ALTER TABLE IF EXISTS reviews ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP`,
      `ALTER TABLE IF EXISTS reviews ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR(255)`,
    ];
    for (const stmt of addColumns) {
      try {
        await pool.query(stmt);
      } catch (error) {
        console.warn("[Reviews] Unable to add review column:", error);
      }
    }
    try {
      await pool.query(
        `ALTER TABLE IF EXISTS reviews ALTER COLUMN audit_type TYPE VARCHAR(50) USING audit_type::text`
      );
    } catch (error) {
      console.warn("[Reviews] Unable to normalize audit_type column:", error);
    }
    try {
      await pool.query(
        `ALTER TABLE IF EXISTS reviews ALTER COLUMN status TYPE VARCHAR(20) USING status::text`
      );
    } catch (error) {
      console.warn("[Reviews] Unable to normalize status column:", error);
    }
    try {
      await pool.query(
        `ALTER TABLE IF EXISTS reviews ALTER COLUMN id TYPE VARCHAR(36) USING id::text`
      );
      await pool.query(
        `ALTER TABLE IF EXISTS reviews ALTER COLUMN audit_id TYPE VARCHAR(36) USING audit_id::text`
      );
    } catch (error) {
      console.warn("[Reviews] Unable to normalize id columns:", error);
    }
    try {
      const columnsRes = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'reviews'`
      );
      const columns = new Set((columnsRes.rows || []).map((row: any) => row.column_name));
      const migrations: Array<[string, string]> = [
        ["auditId", "audit_id"],
        ["userId", "user_id"],
        ["auditType", "audit_type"],
        ["promoCode", "promo_code"],
        ["promoCodeSentAt", "promo_code_sent_at"],
        ["adminNotes", "admin_notes"],
        ["createdAt", "created_at"],
        ["reviewedAt", "reviewed_at"],
        ["reviewedBy", "reviewed_by"],
        ["reviewStatus", "status"],
      ];
      for (const [camel, snake] of migrations) {
        if (columns.has(camel)) {
          const sql = `UPDATE reviews SET ${snake} = "${camel}" WHERE ${snake} IS NULL AND "${camel}" IS NOT NULL`;
          try {
            await pool.query(sql);
          } catch (error) {
            console.warn("[Reviews] Unable to migrate review column:", error);
          }
        }
      }
    } catch (error) {
      console.warn("[Reviews] Unable to inspect review columns:", error);
    }
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reviews_audit_id ON reviews(audit_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status)`);
    this.ensuredReviewsTable = true;
  }

  private rowToReview(row: any): Review {
    return {
      id: row.id,
      auditId: row.audit_id ?? row.auditId,
      userId: row.user_id ?? row.userId,
      email: row.email,
      auditType: (row.audit_type ?? row.auditType) as ReviewAuditTypeEnum,
      rating: row.rating,
      comment: row.comment,
      status: (row.status ?? row.reviewStatus) as ReviewStatusEnum,
      promoCode: row.promo_code ?? row.promoCode,
      promoCodeSentAt: row.promo_code_sent_at ?? row.promoCodeSentAt,
      adminNotes: row.admin_notes ?? row.adminNotes,
      createdAt: row.created_at ?? row.createdAt,
      reviewedAt: row.reviewed_at ?? row.reviewedAt,
      reviewedBy: row.reviewed_by ?? row.reviewedBy,
    };
  }

  async createReview(data: InsertReview): Promise<Review> {
    await this.ensureReviewsTable();
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO reviews (id, audit_id, user_id, email, audit_type, rating, comment, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
       RETURNING *`,
      [id, data.auditId, data.userId || null, data.email, data.auditType, data.rating, data.comment]
    );
    return this.rowToReview(result.rows[0]);
  }

  async getReviewById(id: string): Promise<Review | undefined> {
    await this.ensureReviewsTable();
    const result = await pool.query("SELECT * FROM reviews WHERE id = $1", [id]);
    if (result.rows.length === 0) return undefined;
    return this.rowToReview(result.rows[0]);
  }

  async getReviewByAuditId(auditId: string): Promise<Review | undefined> {
    await this.ensureReviewsTable();
    const result = await pool.query("SELECT * FROM reviews WHERE audit_id = $1", [auditId]);
    if (result.rows.length === 0) return undefined;
    return this.rowToReview(result.rows[0]);
  }

  async getApprovedReviews(): Promise<Review[]> {
    await this.ensureReviewsTable();
    const result = await pool.query(
      "SELECT * FROM reviews WHERE status = 'approved' ORDER BY created_at DESC"
    );
    return result.rows.map((row: any) => this.rowToReview(row));
  }

  async getPendingReviews(): Promise<Review[]> {
    await this.ensureReviewsTable();
    const result = await pool.query(
      "SELECT * FROM reviews WHERE status = 'pending' ORDER BY created_at DESC"
    );
    return result.rows.map((row: any) => this.rowToReview(row));
  }

  async getAllReviews(): Promise<Review[]> {
    await this.ensureReviewsTable();
    const result = await pool.query("SELECT * FROM reviews ORDER BY created_at DESC");
    return result.rows.map((row: any) => this.rowToReview(row));
  }

  async approveReview(id: string, reviewedBy?: string, adminNotes?: string): Promise<Review | undefined> {
    await this.ensureReviewsTable();
    const result = await pool.query(
      `UPDATE reviews SET status = 'approved', reviewed_at = NOW(), reviewed_by = $2, admin_notes = $3
       WHERE id = $1 RETURNING *`,
      [id, reviewedBy || null, adminNotes || null]
    );
    if (result.rows.length === 0) return undefined;
    return this.rowToReview(result.rows[0]);
  }

  async rejectReview(id: string, reviewedBy?: string, adminNotes?: string): Promise<Review | undefined> {
    await this.ensureReviewsTable();
    const result = await pool.query(
      `UPDATE reviews SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $2, admin_notes = $3
       WHERE id = $1 RETURNING *`,
      [id, reviewedBy || null, adminNotes || null]
    );
    if (result.rows.length === 0) return undefined;
    return this.rowToReview(result.rows[0]);
  }

  async markPromoCodeSent(id: string, promoCode: string): Promise<Review | undefined> {
    await this.ensureReviewsTable();
    const result = await pool.query(
      `UPDATE reviews SET promo_code = $2, promo_code_sent_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, promoCode]
    );
    if (result.rows.length === 0) return undefined;
    return this.rowToReview(result.rows[0]);
  }
}

export const reviewStorage = new PgReviewStorage();
