import { randomUUID } from "crypto";
import { Pool } from "pg";
import type {
  User,
  InsertUser,
  Audit,
  InsertAudit,
  QuestionnaireProgress,
  SaveProgressInput,
  ReportDeliveryStatusEnum,
  ReportJob,
  ReportJobStatusEnum,
} from "@shared/schema";
import { generateFullAnalysis } from "./analysisEngine";

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

  createMagicToken(email: string): Promise<string>;
  verifyMagicToken(token: string): Promise<string | null>;

  getReportJob(auditId: string): Promise<ReportJob | undefined>;
  getActiveReportJobs(): Promise<ReportJob[]>;
  createOrUpdateReportJob(job: Partial<ReportJob> & { auditId: string }): Promise<ReportJob>;
  updateReportJobProgress(auditId: string, progress: number, currentSection: string): Promise<void>;
  completeReportJob(auditId: string): Promise<void>;
  failReportJob(auditId: string, error: string): Promise<void>;
  deleteReportJob(auditId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private audits: Map<string, Audit>;
  private progress: Map<string, QuestionnaireProgress>;
  private magicTokens: Map<string, MagicToken>;

  constructor() {
    this.users = new Map();
    this.audits = new Map();
    this.progress = new Map();
    this.magicTokens = new Map();
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
    const totalSections = 13;
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
}

export class PgStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) return undefined;
    const row = result.rows[0];
    return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const result = await pool.query(
      "INSERT INTO users (id, email, name) VALUES ($1, $2, $3) RETURNING *",
      [id, insertUser.email, insertUser.name || null]
    );
    const row = result.rows[0];
    return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
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
    const scores = calculateScoresFromResponses(input.responses);

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
    const result = await pool.query(
      `UPDATE audits SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

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
    const totalSections = 13;
    const percentComplete = Math.round(((input.currentSection + 1) / totalSections) * 100);
    const status = input.currentSection >= totalSections - 1 ? "COMPLETED" : "IN_PROGRESS";

    if (existing) {
      const result = await pool.query(
        `UPDATE questionnaire_progress SET current_section = $1, percent_complete = $2, responses = $3, status = $4, last_activity_at = NOW() WHERE email = $5 RETURNING *`,
        [input.currentSection.toString(), percentComplete.toString(), JSON.stringify(input.responses), status, input.email]
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
      reportDeliveryStatus: row.report_delivery_status,
      reportScheduledFor: row.report_scheduled_for,
      reportSentAt: row.report_sent_at,
      createdAt: row.created_at,
      completedAt: row.completed_at,
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
}

export const storage = new PgStorage();

// ==================== REVIEW STORAGE (PostgreSQL) ====================

import type { Review, InsertReview, ReviewStatusEnum } from "@shared/schema";

export interface IReviewStorage {
  createReview(data: InsertReview): Promise<Review>;
  getReviewById(id: string): Promise<Review | undefined>;
  getApprovedReviews(): Promise<Review[]>;
  getPendingReviews(): Promise<Review[]>;
  getAllReviews(): Promise<Review[]>;
  approveReview(id: string, reviewedBy?: string): Promise<Review | undefined>;
  rejectReview(id: string, reviewedBy?: string): Promise<Review | undefined>;
}

class PgReviewStorage implements IReviewStorage {
  private rowToReview(row: any): Review {
    return {
      id: row.id,
      auditId: row.audit_id,
      userId: row.user_id,
      rating: row.rating,
      comment: row.comment,
      status: row.status as ReviewStatusEnum,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
    };
  }

  async createReview(data: InsertReview): Promise<Review> {
    const id = randomUUID();
    const result = await pool.query(
      `INSERT INTO reviews (id, audit_id, user_id, rating, comment, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
       RETURNING *`,
      [id, data.auditId, data.userId || null, data.rating, data.comment]
    );
    return this.rowToReview(result.rows[0]);
  }

  async getReviewById(id: string): Promise<Review | undefined> {
    const result = await pool.query("SELECT * FROM reviews WHERE id = $1", [id]);
    if (result.rows.length === 0) return undefined;
    return this.rowToReview(result.rows[0]);
  }

  async getApprovedReviews(): Promise<Review[]> {
    const result = await pool.query(
      "SELECT * FROM reviews WHERE status = 'approved' ORDER BY created_at DESC"
    );
    return result.rows.map(this.rowToReview);
  }

  async getPendingReviews(): Promise<Review[]> {
    const result = await pool.query(
      "SELECT * FROM reviews WHERE status = 'pending' ORDER BY created_at DESC"
    );
    return result.rows.map(this.rowToReview);
  }

  async getAllReviews(): Promise<Review[]> {
    const result = await pool.query("SELECT * FROM reviews ORDER BY created_at DESC");
    return result.rows.map(this.rowToReview);
  }

  async approveReview(id: string, reviewedBy?: string): Promise<Review | undefined> {
    const result = await pool.query(
      `UPDATE reviews SET status = 'approved', reviewed_at = NOW(), reviewed_by = $2
       WHERE id = $1 RETURNING *`,
      [id, reviewedBy || null]
    );
    if (result.rows.length === 0) return undefined;
    return this.rowToReview(result.rows[0]);
  }

  async rejectReview(id: string, reviewedBy?: string): Promise<Review | undefined> {
    const result = await pool.query(
      `UPDATE reviews SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $2
       WHERE id = $1 RETURNING *`,
      [id, reviewedBy || null]
    );
    if (result.rows.length === 0) return undefined;
    return this.rowToReview(result.rows[0]);
  }
}

export const reviewStorage = new PgReviewStorage();
