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
} from "@shared/schema";
import { calculateScoresFromResponses, generateFullAnalysis } from "./analysisEngine";

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

const pool = new Pool({
  connectionString: getDatabaseUrl(),
});

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
  sentAt: Date;
  openedAt: Date | null;
  clickedAt: Date | null;
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

export interface PeptidesProgress {
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

export interface SavePeptidesProgressInput {
  email: string;
  currentSection: number;
  totalSections?: number;
  responses: Record<string, unknown>;
}

export interface PeptidesReportRecord {
  id: string;
  email: string;
  responses: Record<string, unknown>;
  report: unknown;
  createdAt: Date | string;
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAudit(id: string): Promise<Audit | undefined>;
  getAuditsByUserId(userId: string): Promise<Audit[]>;
  getAuditsByEmail(email: string): Promise<Audit[]>;
  getPendingAudits(): Promise<Audit[]>;
  getAllAudits(): Promise<Audit[]>;
  createAudit(audit: InsertAudit & { email: string; responses: Record<string, unknown> }): Promise<Audit>;
  updateAudit(id: string, data: Partial<Audit>): Promise<Audit | undefined>;

  getProgress(email: string): Promise<QuestionnaireProgress | undefined>;
  saveProgress(input: SaveProgressInput): Promise<QuestionnaireProgress>;
  getAllIncompleteProgress(): Promise<QuestionnaireProgress[]>;

  getBurnoutProgress(email: string): Promise<BurnoutProgress | undefined>;
  saveBurnoutProgress(input: SaveBurnoutProgressInput): Promise<BurnoutProgress>;
  createBurnoutReport(input: { email: string; responses: Record<string, unknown>; report: unknown }): Promise<BurnoutReportRecord>;
  getBurnoutReport(id: string): Promise<BurnoutReportRecord | undefined>;
  updateBurnoutReport(id: string, report: unknown): Promise<BurnoutReportRecord | undefined>;
  getAllBurnoutReports(): Promise<BurnoutReportRecord[]>;

  getPeptidesProgress(email: string): Promise<PeptidesProgress | undefined>;
  savePeptidesProgress(input: SavePeptidesProgressInput): Promise<PeptidesProgress>;
  createPeptidesReport(input: { email: string; responses: Record<string, unknown>; report: unknown }): Promise<PeptidesReportRecord>;
  getPeptidesReport(id: string): Promise<PeptidesReportRecord | undefined>;
  updatePeptidesReport(id: string, report: unknown): Promise<PeptidesReportRecord | undefined>;
  getAllPeptidesReports(): Promise<PeptidesReportRecord[]>;

  createMagicToken(email: string): Promise<string>;
  verifyMagicToken(token: string): Promise<string | null>;

  getReportJob(auditId: string): Promise<ReportJob | undefined>;
  getActiveReportJobs(): Promise<ReportJob[]>;
  createOrUpdateReportJob(job: Partial<ReportJob> & { auditId: string }): Promise<ReportJob>;
  updateReportJobProgress(auditId: string, progress: number, currentSection: string): Promise<void>;
  completeReportJob(auditId: string): Promise<void>;
  failReportJob(auditId: string, error: string): Promise<void>;
  deleteReportJob(auditId: string): Promise<void>;

  // Traçabilité: conserver CHAQUE version générée (TXT + HTML)
  createReportArtifact(input: Omit<ReportArtifact, "id" | "createdAt"> & { createdAt?: Date }): Promise<ReportArtifact>;

  // Promo codes
  getPromoCode(code: string): Promise<PromoCode | undefined>;
  getAllPromoCodes(): Promise<PromoCode[]>;
  createPromoCode(promo: Omit<PromoCode, "id" | "createdAt" | "currentUses">): Promise<PromoCode>;
  updatePromoCode(id: string, data: Partial<PromoCode>): Promise<PromoCode | undefined>;
  incrementPromoCodeUse(code: string): Promise<void>;
  validatePromoCode(code: string, auditType: string): Promise<{ valid: boolean; discount: number; error?: string }>;

  // Email tracking
  createEmailTracking(auditId: string, emailType: string): Promise<EmailTracking>;
  markEmailOpened(trackingId: string): Promise<void>;
  getEmailTrackingForAudit(auditId: string): Promise<EmailTracking[]>;
  hasUserLeftReview(auditId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private audits: Map<string, Audit>;
  private progress: Map<string, QuestionnaireProgress>;
  private burnoutProgress: Map<string, BurnoutProgress>;
  private burnoutReports: Map<string, BurnoutReportRecord>;
  private peptidesProgress: Map<string, PeptidesProgress>;
  private peptidesReports: Map<string, PeptidesReportRecord>;
  private magicTokens: Map<string, MagicToken>;
  private reportArtifacts: ReportArtifact[];
  private promoCodes: Map<string, PromoCode>;
  private emailTrackings: Map<string, EmailTracking>;

  constructor() {
    this.users = new Map();
    this.audits = new Map();
    this.progress = new Map();
    this.burnoutProgress = new Map();
    this.burnoutReports = new Map();
    this.peptidesProgress = new Map();
    this.peptidesReports = new Map();
    this.magicTokens = new Map();
    this.reportArtifacts = [];
    this.promoCodes = new Map();
    this.emailTrackings = new Map();

    // Default promo codes
    const analyse20: PromoCode = {
      id: randomUUID(),
      code: "ANALYSE20",
      discountPercent: 20,
      description: "Code promo 20% sur Anabolic Bioscan",
      validFor: "PREMIUM",
      maxUses: null,
      currentUses: 0,
      isActive: true,
      expiresAt: null,
      createdAt: new Date(),
    };
    const neurocore20: PromoCode = {
      id: randomUUID(),
      code: "NEUROCORE20",
      discountPercent: 20,
      description: "Code promo 20% coaching Achzod",
      validFor: "ALL",
      maxUses: null,
      currentUses: 0,
      isActive: true,
      expiresAt: null,
      createdAt: new Date(),
    };
    this.promoCodes.set("ANALYSE20", analyse20);
    this.promoCodes.set("NEUROCORE20", neurocore20);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
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

  async createAudit(
    input: InsertAudit & { email: string; responses: Record<string, unknown> }
  ): Promise<Audit> {
    let user = await this.getUserByEmail(input.email);
    if (!user) {
      user = await this.createUser({ email: input.email });
    }

    const id = randomUUID();
    const scores = this.calculateScores(input.responses);

    const isDelayedMode = process.env.DELIVERY_MODE === "delayed";
    const deliveryDelay = input.type === "GRATUIT" ? 24 : 48;
    const scheduledDate = new Date(Date.now() + deliveryDelay * 60 * 60 * 1000);

    const audit: Audit = {
      id,
      userId: user.id,
      email: input.email,
      type: input.type,
      status: "COMPLETED",
      responses: input.responses,
      scores,
      reportDeliveryStatus: isDelayedMode ? "PENDING" : "PENDING",
      reportScheduledFor: isDelayedMode ? scheduledDate : undefined,
      createdAt: new Date(),
      completedAt: new Date(),
    };

    this.audits.set(id, audit);
    return audit;
  }

  async updateAudit(id: string, data: Partial<Audit>): Promise<Audit | undefined> {
    const audit = this.audits.get(id);
    if (!audit) return undefined;

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

  async getPeptidesProgress(email: string): Promise<PeptidesProgress | undefined> {
    return this.peptidesProgress.get(email);
  }

  async savePeptidesProgress(input: SavePeptidesProgressInput): Promise<PeptidesProgress> {
    const existing = this.peptidesProgress.get(input.email);
    const totalSections = input.totalSections ?? 6;
    const percentComplete = Math.round(((input.currentSection + 1) / totalSections) * 100);

    const progress: PeptidesProgress = {
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

    this.peptidesProgress.set(input.email, progress);
    return progress;
  }

  async createPeptidesReport(input: { email: string; responses: Record<string, unknown>; report: unknown }): Promise<PeptidesReportRecord> {
    const id = randomUUID();
    const record: PeptidesReportRecord = {
      id,
      email: input.email,
      responses: input.responses,
      report: input.report,
      createdAt: new Date(),
    };
    this.peptidesReports.set(id, record);
    return record;
  }

  async getPeptidesReport(id: string): Promise<PeptidesReportRecord | undefined> {
    return this.peptidesReports.get(id);
  }

  async updatePeptidesReport(id: string, report: unknown): Promise<PeptidesReportRecord | undefined> {
    const existing = this.peptidesReports.get(id);
    if (!existing) return undefined;
    const updated: PeptidesReportRecord = {
      ...existing,
      report,
    };
    this.peptidesReports.set(id, updated);
    return updated;
  }

  async getAllPeptidesReports(): Promise<PeptidesReportRecord[]> {
    return Array.from(this.peptidesReports.values()).sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }

  private calculateScores(responses: Record<string, unknown>): Record<string, number> {
    return calculateScoresFromResponses(responses);
  }

  async createMagicToken(email: string): Promise<string> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    this.magicTokens.set(token, { token, email, expiresAt });
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

  async getReportJob(_auditId: string): Promise<ReportJob | undefined> { return undefined; }
  async getActiveReportJobs(): Promise<ReportJob[]> { return []; }
  async createOrUpdateReportJob(job: Partial<ReportJob> & { auditId: string }): Promise<ReportJob> {
    return { auditId: job.auditId, status: 'pending', progress: 0, currentSection: '', error: null, attemptCount: 0, startedAt: new Date(), updatedAt: new Date(), lastProgressAt: new Date(), completedAt: null };
  }
  async updateReportJobProgress(_auditId: string, _progress: number, _currentSection: string): Promise<void> {}
  async completeReportJob(_auditId: string): Promise<void> {}
  async failReportJob(_auditId: string, _error: string): Promise<void> {}
  async deleteReportJob(_auditId: string): Promise<void> {}

  async createReportArtifact(
    input: Omit<ReportArtifact, "id" | "createdAt"> & { createdAt?: Date }
  ): Promise<ReportArtifact> {
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
  async createEmailTracking(auditId: string, emailType: string): Promise<EmailTracking> {
    const tracking: EmailTracking = {
      id: randomUUID(),
      auditId,
      emailType,
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

  async getEmailTrackingForAudit(auditId: string): Promise<EmailTracking[]> {
    return Array.from(this.emailTrackings.values()).filter(t => t.auditId === auditId);
  }

  async hasUserLeftReview(auditId: string): Promise<boolean> {
    // MemStorage doesn't have reviews, always return false
    return false;
  }
}

export class PgStorage implements IStorage {
  private auditColumnsCache: Set<string> | null = null;
  private ensuredArtifactsTable = false;

  private async ensureAuditColumnsLoaded(): Promise<Set<string>> {
    if (this.auditColumnsCache) return this.auditColumnsCache;
    const res = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'audits'`
    );
    this.auditColumnsCache = new Set((res.rows || []).map((r: any) => String(r.column_name)));
    return this.auditColumnsCache;
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
  async getUser(id: string): Promise<User | undefined> {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return { id: row.id, email: row.email, name: row.name, createdAt: row.createdAt || row.created_at };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return { id: row.id, email: row.email, name: row.name, createdAt: row.createdAt || row.created_at };
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO users (id, email, name, "createdAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
      [id, insertUser.email, insertUser.name || null]
    );
    const row = result.rows[0];
    return { id: row.id, email: row.email, name: row.name, createdAt: row.createdAt || row.created_at };
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
    const result = await pool.query("SELECT * FROM audits ORDER BY created_at DESC LIMIT 100");
    return result.rows.map(row => this.rowToAudit(row));
  }

  async createAudit(input: InsertAudit & { email: string; responses: Record<string, unknown> }): Promise<Audit> {
    let user = await this.getUserByEmail(input.email);
    if (!user) {
      user = await this.createUser({ email: input.email });
    }

    const id = randomUUID();
    const scores = this.calculateScores(input.responses);

    const isDelayedMode = process.env.DELIVERY_MODE === "delayed";
    const deliveryDelay = input.type === "GRATUIT" ? 24 : 48;
    const scheduledDate = isDelayedMode ? new Date(Date.now() + deliveryDelay * 60 * 60 * 1000) : null;

    const result = await pool.query(
      `INSERT INTO audits (id, user_id, email, type, status, responses, scores, report_delivery_status, report_scheduled_for, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *`,
      [id, user.id, input.email, input.type, "COMPLETED", JSON.stringify(input.responses), JSON.stringify(scores), "PENDING", scheduledDate]
    );

    return this.rowToAudit(result.rows[0]);
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
    if ((data as any).narrativeReport !== undefined) {
      updates.push(`narrative_report = $${paramIndex++}`);
      values.push(JSON.stringify((data as any).narrativeReport));
    }

    if (updates.length === 0) return this.getAudit(id);

    values.push(id);
    let result;
    try {
      result = await pool.query(
        `UPDATE audits SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values
      );
    } catch (e: any) {
      // Si la DB n'a pas encore les colonnes (rollout), on retente sans elles (best-effort)
      if (e?.code === "42703" || String(e?.message || "").includes("column") && String(e?.message || "").includes("does not exist")) {
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
        if (strippedUpdates.length === 0) return this.getAudit(id);
        strippedValues.push(id);
        result = await pool.query(
          `UPDATE audits SET ${strippedUpdates.join(", ")} WHERE id = $${idx} RETURNING *`,
          strippedValues
        );
      } else {
        throw e;
      }
    }

    if (result.rows.length === 0) return undefined;
    return this.rowToAudit(result.rows[0]);
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

  async getPeptidesProgress(email: string): Promise<PeptidesProgress | undefined> {
    await this.ensurePeptidesProgressTable();
    const result = await pool.query("SELECT * FROM peptides_progress WHERE email = $1", [email]);
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

  async savePeptidesProgress(input: SavePeptidesProgressInput): Promise<PeptidesProgress> {
    await this.ensurePeptidesProgressTable();
    const existing = await this.getPeptidesProgress(input.email);
    const totalSections = input.totalSections ?? 6;
    const percentComplete = Math.round(((input.currentSection + 1) / totalSections) * 100);
    const status: AuditStatusEnum = input.currentSection >= totalSections - 1 ? "COMPLETED" : "IN_PROGRESS";

    if (existing) {
      const result = await pool.query(
        `UPDATE peptides_progress SET current_section = $1, total_sections = $2, percent_complete = $3, responses = $4, status = $5, last_activity_at = NOW() WHERE email = $6 RETURNING *`,
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
      `INSERT INTO peptides_progress (id, email, current_section, total_sections, percent_complete, responses, status)
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

  async createPeptidesReport(input: { email: string; responses: Record<string, unknown>; report: unknown }): Promise<PeptidesReportRecord> {
    await this.ensurePeptidesReportsTable();
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO peptides_reports (id, email, responses, report) VALUES ($1, $2, $3, $4) RETURNING *`,
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

  async getPeptidesReport(id: string): Promise<PeptidesReportRecord | undefined> {
    await this.ensurePeptidesReportsTable();
    const result = await pool.query("SELECT * FROM peptides_reports WHERE id = $1", [id]);
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

  async updatePeptidesReport(id: string, report: unknown): Promise<PeptidesReportRecord | undefined> {
    await this.ensurePeptidesReportsTable();
    const result = await pool.query(
      `UPDATE peptides_reports SET report = $2 WHERE id = $1 RETURNING *`,
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

  async getAllPeptidesReports(): Promise<PeptidesReportRecord[]> {
    await this.ensurePeptidesReportsTable();
    const result = await pool.query("SELECT * FROM peptides_reports ORDER BY created_at DESC LIMIT 100");
    return result.rows.map(row => ({
      id: row.id,
      email: row.email,
      responses: row.responses || {},
      report: row.report || {},
      createdAt: row.created_at,
    }));
  }

  async createMagicToken(email: string): Promise<string> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await pool.query(
      "INSERT INTO magic_tokens (token, email, expires_at) VALUES ($1, $2, $3)",
      [token, email, expiresAt]
    );
    return token;
  }

  async verifyMagicToken(token: string): Promise<string | null> {
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
    input: Omit<ReportArtifact, "id" | "createdAt"> & { createdAt?: Date }
  ): Promise<ReportArtifact> {
    await this.ensureReportArtifactsTable();
    const id = randomUUID();
    const createdAt = input.createdAt ?? new Date();
    try {
      await pool.query(
        `INSERT INTO report_artifacts (id, audit_id, tier, engine, model, txt, html, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, input.auditId, input.tier, input.engine, input.model, input.txt, input.html, createdAt]
      );
    } catch (e: any) {
      // best-effort, ne pas casser le workflow si la DB refuse (quota, taille, etc.)
      console.error("[ReportArtifact] Insert failed (best-effort):", e?.message || e);
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
    const result = await pool.query(
      "SELECT * FROM report_jobs WHERE status IN ('pending', 'generating')"
    );
    return result.rows.map(row => this.rowToReportJob(row));
  }

  async createOrUpdateReportJob(job: Partial<ReportJob> & { auditId: string }): Promise<ReportJob> {
    const existing = await this.getReportJob(job.auditId);
    
    if (existing) {
      const updates: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      
      if (job.status !== undefined) { updates.push(`status = $${idx++}`); values.push(job.status); }
      if (job.progress !== undefined) { updates.push(`progress = $${idx++}`); values.push(job.progress); }
      if (job.currentSection !== undefined) { updates.push(`current_section = $${idx++}`); values.push(job.currentSection); }
      if (job.error !== undefined) { updates.push(`error = $${idx++}`); values.push(job.error); }
      if (job.attemptCount !== undefined) { updates.push(`attempt_count = $${idx++}`); values.push(job.attemptCount); }
      if (job.completedAt !== undefined) { updates.push(`completed_at = $${idx++}`); values.push(job.completedAt); }
      
      updates.push(`updated_at = NOW()`);
      updates.push(`last_progress_at = NOW()`);
      
      values.push(job.auditId);
      const result = await pool.query(
        `UPDATE report_jobs SET ${updates.join(", ")} WHERE audit_id = $${idx} RETURNING *`,
        values
      );
      return this.rowToReportJob(result.rows[0]);
    } else {
      const result = await pool.query(
        `INSERT INTO report_jobs (audit_id, status, progress, current_section, error, attempt_count)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [job.auditId, job.status || 'pending', job.progress || 0, job.currentSection || 'Initialisation...', job.error || null, job.attemptCount || 0]
      );
      return this.rowToReportJob(result.rows[0]);
    }
  }

  async updateReportJobProgress(auditId: string, progress: number, currentSection: string): Promise<void> {
    await pool.query(
      `UPDATE report_jobs SET progress = $1, current_section = $2, updated_at = NOW(), last_progress_at = NOW() WHERE audit_id = $3`,
      [progress, currentSection, auditId]
    );
  }

  async completeReportJob(auditId: string): Promise<void> {
    await pool.query(
      `UPDATE report_jobs SET status = 'completed', progress = 100, current_section = 'Rapport termine !', completed_at = NOW(), updated_at = NOW() WHERE audit_id = $1`,
      [auditId]
    );
  }

  async failReportJob(auditId: string, error: string): Promise<void> {
    await pool.query(
      `UPDATE report_jobs SET status = 'failed', error = $1, completed_at = NOW(), updated_at = NOW() WHERE audit_id = $2`,
      [error, auditId]
    );
  }

  async deleteReportJob(auditId: string): Promise<void> {
    await pool.query("DELETE FROM report_jobs WHERE audit_id = $1", [auditId]);
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
    if (promo.validFor !== "ALL" && promo.validFor !== auditType) {
      return { valid: false, discount: 0, error: `Ce code promo n'est pas valide pour l'analyse ${auditType}` };
    }
    return { valid: true, discount: promo.discountPercent };
  }

  // Email tracking methods (PgStorage)
  private rowToEmailTracking(row: any): EmailTracking {
    return {
      id: row.id,
      auditId: row.audit_id,
      emailType: row.email_type,
      sentAt: row.sent_at,
      openedAt: row.opened_at,
      clickedAt: row.clicked_at,
    };
  }

  async createEmailTracking(auditId: string, emailType: string): Promise<EmailTracking> {
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO email_tracking (id, audit_id, email_type) VALUES ($1, $2, $3) RETURNING *`,
      [id, auditId, emailType]
    );
    return this.rowToEmailTracking(result.rows[0]);
  }

  async markEmailOpened(trackingId: string): Promise<void> {
    await pool.query(
      "UPDATE email_tracking SET opened_at = NOW() WHERE id = $1 AND opened_at IS NULL",
      [trackingId]
    );
  }

  async getEmailTrackingForAudit(auditId: string): Promise<EmailTracking[]> {
    const result = await pool.query(
      "SELECT * FROM email_tracking WHERE audit_id = $1 ORDER BY sent_at DESC",
      [auditId]
    );
    return result.rows.map(row => this.rowToEmailTracking(row));
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

  // ==================== TERRA DATA STORAGE ====================

  private ensuredTerraTable = false;
  private ensuredBurnoutProgressTable = false;
  private ensuredBurnoutReportsTable = false;
  private ensuredPeptidesProgressTable = false;
  private ensuredPeptidesReportsTable = false;

  private async ensureTerraDataTable(): Promise<void> {
    if (this.ensuredTerraTable) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS terra_data (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          reference_id VARCHAR(255) NOT NULL,
          terra_user_id VARCHAR(255),
          provider VARCHAR(50),
          event_type VARCHAR(50) NOT NULL,
          data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_terra_data_reference_id ON terra_data(reference_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_terra_data_terra_user_id ON terra_data(terra_user_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_terra_data_created_at ON terra_data(created_at)`);
      this.ensuredTerraTable = true;
    } catch (err) {
      console.error("[Storage] Error creating terra_data table:", err);
      this.ensuredTerraTable = true;
    }
  }

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

  private async ensurePeptidesProgressTable(): Promise<void> {
    if (this.ensuredPeptidesProgressTable) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS peptides_progress (
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
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_peptides_progress_email ON peptides_progress(email)`);
      this.ensuredPeptidesProgressTable = true;
    } catch (err) {
      console.error("[Storage] Error creating peptides_progress table:", err);
      this.ensuredPeptidesProgressTable = true;
    }
  }

  private async ensurePeptidesReportsTable(): Promise<void> {
    if (this.ensuredPeptidesReportsTable) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS peptides_reports (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL,
          responses JSONB NOT NULL DEFAULT '{}',
          report JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_peptides_reports_email ON peptides_reports(email)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_peptides_reports_created_at ON peptides_reports(created_at)`);
      this.ensuredPeptidesReportsTable = true;
    } catch (err) {
      console.error("[Storage] Error creating peptides_reports table:", err);
      this.ensuredPeptidesReportsTable = true;
    }
  }

  async saveTerraData(
    referenceId: string,
    terraUserId: string | null,
    provider: string | null,
    eventType: string,
    data: unknown
  ): Promise<void> {
    await this.ensureTerraDataTable();
    try {
      await pool.query(
        `INSERT INTO terra_data (reference_id, terra_user_id, provider, event_type, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [referenceId, terraUserId, provider, eventType, JSON.stringify(data)]
      );
      console.log(`[Storage] Saved Terra ${eventType} data for ${referenceId}`);
    } catch (err) {
      console.error("[Storage] Error saving Terra data:", err);
      throw err;
    }
  }

  async getTerraDataByReference(referenceId: string): Promise<any[]> {
    await this.ensureTerraDataTable();
    const result = await pool.query(
      `SELECT * FROM terra_data WHERE reference_id = $1 ORDER BY created_at DESC`,
      [referenceId]
    );
    return result.rows.map(row => ({
      id: row.id,
      referenceId: row.reference_id,
      terraUserId: row.terra_user_id,
      provider: row.provider,
      eventType: row.event_type,
      data: row.data,
      createdAt: row.created_at,
    }));
  }

  async getTerraDataByEmail(email: string): Promise<any[]> {
    await this.ensureTerraDataTable();
    // Le reference_id contient l'email sanitisé (ex: neurocore_user_gmail_com)
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9-_]/g, '_');
    const result = await pool.query(
      `SELECT * FROM terra_data WHERE reference_id LIKE $1 ORDER BY created_at DESC`,
      [`%${sanitizedEmail}%`]
    );
    return result.rows.map(row => ({
      id: row.id,
      referenceId: row.reference_id,
      terraUserId: row.terra_user_id,
      provider: row.provider,
      eventType: row.event_type,
      data: row.data,
      createdAt: row.created_at,
    }));
  }

  async getLatestTerraData(referenceId: string, eventType?: string): Promise<any | null> {
    await this.ensureTerraDataTable();
    const query = eventType
      ? `SELECT * FROM terra_data WHERE reference_id = $1 AND event_type = $2 ORDER BY created_at DESC LIMIT 1`
      : `SELECT * FROM terra_data WHERE reference_id = $1 ORDER BY created_at DESC LIMIT 1`;
    const params = eventType ? [referenceId, eventType] : [referenceId];
    const result = await pool.query(query, params);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      referenceId: row.reference_id,
      terraUserId: row.terra_user_id,
      provider: row.provider,
      eventType: row.event_type,
      data: row.data,
      createdAt: row.created_at,
    };
  }

  async getAllTerraData(limit: number = 100): Promise<any[]> {
    await this.ensureTerraDataTable();
    const result = await pool.query(
      `SELECT id, reference_id, terra_user_id, provider, event_type, created_at, data
       FROM terra_data ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows.map(row => ({
      id: row.id,
      referenceId: row.reference_id,
      terraUserId: row.terra_user_id,
      provider: row.provider,
      eventType: row.event_type,
      data: row.data,
      createdAt: row.created_at,
    }));
  }
}

export const storage = new PgStorage();

// ==================== REVIEW STORAGE (PostgreSQL) ====================

export type ReviewStatusEnum = 'pending' | 'approved' | 'rejected';
export type AuditTypeEnum = 'DISCOVERY' | 'ANABOLIC_BIOSCAN' | 'ULTIMATE_SCAN' | 'BLOOD_ANALYSIS' | 'PEPTIDES';

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
  'ANABOLIC_BIOSCAN': { code: 'ANABOLICBIOSCAN', description: '59€ déduits du coaching' },
  'ULTIMATE_SCAN': { code: 'ULTIMATESCAN', description: '79€ déduits du coaching' },
  'BLOOD_ANALYSIS': { code: 'BLOOD', description: '99€ déduits du coaching' },
  'PEPTIDES': { code: 'PEPTIDES', description: '99€ déduits du coaching' },
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
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reviews_audit_id ON reviews(audit_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status)`);
    this.ensuredReviewsTable = true;
  }

  private rowToReview(row: any): Review {
    return {
      id: row.id,
      auditId: row.audit_id,
      userId: row.user_id,
      email: row.email,
      auditType: row.audit_type as ReviewAuditTypeEnum,
      rating: row.rating,
      comment: row.comment,
      status: row.status as ReviewStatusEnum,
      promoCode: row.promo_code,
      promoCodeSentAt: row.promo_code_sent_at,
      adminNotes: row.admin_notes,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
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
