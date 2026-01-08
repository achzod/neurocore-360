import { pgTable, varchar, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
