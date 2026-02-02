import { pgTable, varchar, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  name: varchar("name", { length: 255 }),
  emailVerified: timestamp("emailVerified"),
  image: varchar("image", { length: 512 }),
  credits: integer("credits").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const audits = pgTable("audits", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  email: varchar("email", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("COMPLETED"),
  responses: jsonb("responses").notNull().default({}),
  scores: jsonb("scores").notNull().default({}),
  narrativeReport: jsonb("narrative_report"),
  reportDeliveryStatus: varchar("report_delivery_status", { length: 20 }).notNull().default("PENDING"),
  reportScheduledFor: timestamp("report_scheduled_for"),
  reportSentAt: timestamp("report_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const questionnaireProgress = pgTable("questionnaire_progress", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  currentSection: text("current_section").notNull().default("0"),
  totalSections: text("total_sections").notNull().default("14"),
  percentComplete: text("percent_complete").notNull().default("0"),
  responses: jsonb("responses").notNull().default({}),
  status: varchar("status", { length: 20 }).notNull().default("STARTED"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
});

export const magicTokens = pgTable("magic_tokens", {
  token: varchar("token", { length: 255 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Waitlist subscribers for ApexLabs pre-launch
export const waitlistSubscribers = pgTable("waitlist_subscribers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  source: varchar("source", { length: 50 }).notNull().default("apexlabs"), // apexlabs, neurocore, etc.
  sendpulseSynced: timestamp("sendpulse_synced"), // null = not synced yet
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Blood Tests - Existing table
export const bloodTests = pgTable("blood_tests", {
  id: varchar("id", { length: 255 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 255 }).notNull(),
  fileName: text("file_name"),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  status: varchar("status", { length: 255 }),
  error: text("error"),
  markers: jsonb("markers"),
  analysis: jsonb("analysis"),
  globalScore: integer("global_score"),
  globalLevel: text("global_level"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  patientProfile: jsonb("patient_profile"),
});

// Blood Analysis - Full product
export const bloodAnalysisReports = pgTable("blood_analysis_reports", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("userId", { length: 36 }).notNull().references(() => users.id),

  // Upload files
  uploadedFiles: jsonb("uploadedFiles"), // {name, url, size}[]

  // OCR extraction
  extractedBiomarkers: jsonb("extractedBiomarkers"), // Record<string, {value, unit}>
  missingBiomarkers: jsonb("missingBiomarkers"), // string[]
  ocrConfidence: jsonb("ocrConfidence"), // Record<string, number>

  // Questionnaire
  questionnaireData: jsonb("questionnaireData"),

  // Analysis (full JSON from Claude Opus 4.5)
  analysis: jsonb("analysis"),

  // PDF
  pdfUrl: text("pdfUrl"),

  // Metadata
  processingStatus: varchar("processingStatus", { length: 20 }).notNull().default("pending"), // pending | processing | completed | failed
  processingError: text("processingError"),
  aiModel: varchar("aiModel", { length: 50 }).default("claude-opus-4-5"),

  // Timestamps
  testDate: timestamp("testDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),

  // For future comparisons
  previousReportId: varchar("previousReportId", { length: 36 }).references((): any => bloodAnalysisReports.id),
});

// Blood Analysis Purchases (Stripe)
export const bloodAnalysisPurchases = pgTable("blood_analysis_purchases", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }).unique(),
  amount: text("amount").notNull(), // "9900" (99.00 EUR in cents)
  status: varchar("status", { length: 20 }).notNull(), // succeeded | pending | failed
  reportId: varchar("report_id", { length: 36 }).references(() => bloodAnalysisReports.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
