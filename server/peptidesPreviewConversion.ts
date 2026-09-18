import crypto from "node:crypto";
import type { PeptidesPreviewInput, PeptidesPreviewResult } from "./peptidesPreview";

const TOKEN_VERSION = 1;
const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const EVENT_TYPES = new Set([
  "result_view",
  "unlock_click",
  "engine_prefilled",
  "tier_selected",
  "checkout_created",
  "paid",
  "checkout_error",
]);

interface CheckoutTokenPayload {
  v: number;
  leadId: string;
  exp: number;
}

function signingSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("PEPTIDES_PREVIEW_CHECKOUT_SECRET_UNAVAILABLE");
  }
  return secret;
}

function signature(payload: string): Buffer {
  return crypto.createHmac("sha256", signingSecret()).update(payload).digest();
}

export function createPeptidesPreviewCheckoutToken(
  leadId: string,
  now = Date.now(),
): string {
  if (!/^[0-9a-f-]{36}$/i.test(leadId)) {
    throw new Error("PEPTIDES_PREVIEW_INVALID_LEAD_ID");
  }
  const payload: CheckoutTokenPayload = {
    v: TOKEN_VERSION,
    leadId,
    exp: now + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded).toString("base64url")}`;
}

export function verifyPeptidesPreviewCheckoutToken(
  token: string,
  now = Date.now(),
): CheckoutTokenPayload {
  const [encoded, encodedSignature, extra] = String(token || "").split(".");
  if (!encoded || !encodedSignature || extra) {
    throw new Error("PEPTIDES_PREVIEW_INVALID_TOKEN");
  }
  const expected = signature(encoded);
  const received = Buffer.from(encodedSignature, "base64url");
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    throw new Error("PEPTIDES_PREVIEW_INVALID_TOKEN");
  }
  let payload: CheckoutTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    throw new Error("PEPTIDES_PREVIEW_INVALID_TOKEN");
  }
  if (
    payload.v !== TOKEN_VERSION
    || !/^[0-9a-f-]{36}$/i.test(payload.leadId)
    || !Number.isFinite(payload.exp)
    || payload.exp <= now
    || payload.exp > now + TOKEN_TTL_MS + 60_000
  ) {
    throw new Error(payload?.exp <= now ? "PEPTIDES_PREVIEW_TOKEN_EXPIRED" : "PEPTIDES_PREVIEW_INVALID_TOKEN");
  }
  return payload;
}

function monthlyBudgetBucket(totalUsd: number): string {
  const monthly = totalUsd / 3;
  if (monthly < 50) return "under50";
  if (monthly < 100) return "50-100";
  if (monthly < 200) return "100-200";
  if (monthly < 300) return "200-300";
  return "over300";
}

export function mapPreviewToPeptidesResponses(
  input: PeptidesPreviewInput,
  result: PeptidesPreviewResult,
  leadId: string,
): Record<string, unknown> {
  const bodyFat = {
    under10: "under-10",
    "10-15": "10-15",
    "15-20": "15-20",
    "20-25": "20-25",
    "25-30": "25-30",
    over30: "over-30",
    unknown: "unknown",
  }[input.bodyFatRange];
  const injectionComfort = {
    comfortable: "fine",
    possible: "anxious",
    anxious: "very-anxious",
    refuse: "refuse",
  }[input.injectionComfort];
  const frequency = {
    "twice-daily": "2x",
    daily: "1x",
    "few-week": "less",
    weekly: "less",
    minimal: "less",
  }[input.injectionFrequency];
  const storage = {
    "yes-private": "personal",
    "yes-shared": "shared",
    no: "no",
  }[input.refrigeration];
  const bloodRecent = {
    recent: "3months",
    old: "over6",
    never: "never",
  }[input.bloodwork];
  const timeline = {
    "4-6": "fast",
    "8-12": "solid",
    "12plus": "longterm",
  }[input.timeline];
  const trainingFrequency = {
    none: "irregular",
    "1-2": "1-2",
    "3-4": "3-4",
    "5plus": "5-6",
  }[input.trainingFrequency];

  return {
    pep_name: input.firstName,
    pep_email: input.email,
    pep_age: input.age,
    pep_weight: input.weightKg,
    pep_height: input.heightCm,
    pep_bf: bodyFat,
    pep_experience: input.experience,
    pep_primary_goal: input.primaryGoal,
    pep_secondary_goals: input.secondaryGoals,
    pep_timeline: timeline,
    pep_conditions: input.conditions,
    pep_medications: input.medications,
    pep_allergies: input.allergies,
    pep_blood_recent: bloodRecent,
    pep_country: input.country,
    pep_budget: monthlyBudgetBucket(input.budgetTotalUsd),
    pep_injection_comfort: injectionComfort,
    pep_frequency: frequency,
    pep_storage: storage,
    pep_current_peptides: input.currentPeptides,
    pep_past_peptides: input.pastPeptides,
    pep_training_type: input.trainingFrequency === "none" ? "none" : undefined,
    pep_training_freq: trainingFrequency,
    pep_start_when: input.startWhen,
    pep_questions: input.goalDetails,
    _prePeptidesLeadId: leadId,
    _prePeptidesResult: {
      status: result.status,
      moleculeCount: result.moleculeCount,
      durationLabel: result.durationLabel,
      estimatedProtocolCostUsd: result.estimatedProtocolCostUsd,
      estimatedShippingCostUsd: result.estimatedShippingCostUsd,
      estimatedGrandTotalUsd: result.estimatedGrandTotalUsd,
      budgetFit: result.budgetFit,
      analysisPoints: result.analysisPoints,
      blockers: result.blockers,
    },
  };
}

let conversionTableReady: Promise<void> | null = null;

async function conversionPool() {
  return (await import("./db")).pool;
}

export function ensurePeptidesPreviewConversionTable(): Promise<void> {
  if (!conversionTableReady) {
    conversionTableReady = conversionPool()
      .then((pool) => pool.query(`
        CREATE TABLE IF NOT EXISTS peptides_preview_conversion_events (
          lead_id VARCHAR(36) NOT NULL,
          event_type VARCHAR(50) NOT NULL,
          first_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          event_count INTEGER NOT NULL DEFAULT 1,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          PRIMARY KEY (lead_id, event_type)
        )
      `))
      .then(() => undefined)
      .catch((error) => {
        conversionTableReady = null;
        throw error;
      });
  }
  return conversionTableReady;
}

export async function recordPeptidesPreviewConversionEvent(
  leadId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (!EVENT_TYPES.has(eventType)) {
    throw new Error("PEPTIDES_PREVIEW_INVALID_EVENT");
  }
  await ensurePeptidesPreviewConversionTable();
  const pool = await conversionPool();
  await pool.query(
    `INSERT INTO peptides_preview_conversion_events
       (lead_id, event_type, metadata)
     VALUES ($1, $2, $3::jsonb)
     ON CONFLICT (lead_id, event_type)
     DO UPDATE SET
       last_at = NOW(),
       event_count = peptides_preview_conversion_events.event_count + 1,
       metadata = peptides_preview_conversion_events.metadata || EXCLUDED.metadata`,
    [leadId, eventType, JSON.stringify(metadata)],
  );
}
