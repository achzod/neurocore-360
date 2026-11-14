/**
 * FormCheck V2 : configuration, packs et règles métier pures.
 *
 * Tout ce fichier est sans effet de bord (aucun accès DB, réseau ou disque)
 * pour être testable directement avec node:test.
 */
import type Stripe from "stripe";

export const FORMCHECK_PLAN_TYPE = "FORMCHECK" as const;

export type FormcheckPackId = "1" | "3" | "6";

export interface FormcheckPack {
  id: FormcheckPackId;
  credits: number;
  amountCents: number;
  label: string;
  priceLabel: string;
  priceEnv: string;
}

/** Les 3 packs publics. Rien de gratuit, aucune déduction coaching. */
export const FORMCHECK_PACKS: Record<FormcheckPackId, FormcheckPack> = {
  "1": { id: "1", credits: 1, amountCents: 990, label: "1 analyse", priceLabel: "9,90 €", priceEnv: "STRIPE_PRICE_FORMCHECK_1" },
  "3": { id: "3", credits: 3, amountCents: 2490, label: "3 analyses", priceLabel: "24,90 €", priceEnv: "STRIPE_PRICE_FORMCHECK_3" },
  "6": { id: "6", credits: 6, amountCents: 4490, label: "6 analyses", priceLabel: "44,90 €", priceEnv: "STRIPE_PRICE_FORMCHECK_6" },
};

export function resolveFormcheckPack(raw: unknown): FormcheckPack | null {
  const value = String(raw ?? "").trim();
  return (FORMCHECK_PACKS as Record<string, FormcheckPack>)[value] ?? null;
}

/**
 * Ligne Stripe Checkout : prix configuré (STRIPE_PRICE_FORMCHECK_*) s'il est
 * valide, sinon price_data en ligne. Aucun prix n'est jamais créé côté Stripe.
 */
export function buildFormcheckLineItem(
  pack: FormcheckPack,
  env: NodeJS.ProcessEnv = process.env,
): Stripe.Checkout.SessionCreateParams.LineItem {
  const configured = String(env[pack.priceEnv] || "").trim();
  if (/^price_[A-Za-z0-9]+$/.test(configured)) {
    return { quantity: 1, price: configured };
  }
  return {
    quantity: 1,
    price_data: {
      currency: "eur",
      unit_amount: pack.amountCents,
      product_data: {
        name: `FormCheck : ${pack.label}`,
        description: `${pack.credits} crédit${pack.credits > 1 ? "s" : ""} d'analyse vidéo FormCheck, rapport PDF annoté par email.`,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Vidéo
// ---------------------------------------------------------------------------

export const FORMCHECK_MAX_BYTES = 200 * 1024 * 1024;
export const FORMCHECK_MAX_DURATION_S = 60;
export const FORMCHECK_MIN_DURATION_S = 2;
const DURATION_TOLERANCE_S = 1;
export const FORMCHECK_ALLOWED_EXTENSIONS = new Set([".mp4", ".mov"]);
export const FORMCHECK_ALLOWED_MIME = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-m4v",
  "application/octet-stream", // certains navigateurs mobiles n'envoient pas de type
]);

export type VideoRejection = { code: string; message: string };

export function validateUploadedFileMeta(input: {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}): VideoRejection | null {
  const name = input.originalName.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  if (!FORMCHECK_ALLOWED_EXTENSIONS.has(ext) || !FORMCHECK_ALLOWED_MIME.has(input.mimeType.toLowerCase())) {
    return { code: "FORMAT", message: "Format non accepté. Envoie une vidéo en .mp4 ou .mov." };
  }
  if (input.sizeBytes <= 0) {
    return { code: "EMPTY", message: "Le fichier est vide. Refilme ta série et réessaie." };
  }
  if (input.sizeBytes > FORMCHECK_MAX_BYTES) {
    return { code: "TOO_LARGE", message: "Vidéo trop lourde (200 Mo maximum). Filme en 1080p plutôt qu'en 4K." };
  }
  return null;
}

export function validateVideoDuration(durationS: number | null): VideoRejection | null {
  if (durationS === null || !Number.isFinite(durationS) || durationS <= 0) {
    return { code: "UNREADABLE", message: "Impossible de lire cette vidéo. Refilme ta série avec l'appareil photo de ton téléphone et renvoie-la." };
  }
  if (durationS > FORMCHECK_MAX_DURATION_S + DURATION_TOLERANCE_S) {
    return { code: "TOO_LONG", message: "Vidéo trop longue (60 secondes maximum). Coupe-la pour ne garder qu'une seule série." };
  }
  if (durationS < FORMCHECK_MIN_DURATION_S) {
    return { code: "TOO_SHORT", message: "Vidéo trop courte. Filme la série complète, de la première à la dernière rep." };
  }
  return null;
}

/**
 * Nombre de frames selon la durée : 16 à 20, réparties sur toute la série.
 * Assez dense pour suivre chaque phase et estimer le tempo rep par rep,
 * en gardant un coût raisonnable (environ 800 tokens d'entrée par image).
 */
export const FORMCHECK_MIN_FRAMES = 16;
export const FORMCHECK_MAX_FRAMES = 20;
export function frameCountForDuration(durationS: number): number {
  if (durationS <= 15) return 16;
  if (durationS <= 30) return 18;
  return 20;
}

/** Horodatages en secondes, centrés dans N tranches égales (évite 0 et la fin). */
export function computeFrameTimestamps(durationS: number, count = frameCountForDuration(durationS)): number[] {
  const n = Math.max(FORMCHECK_MIN_FRAMES, Math.min(FORMCHECK_MAX_FRAMES, Math.round(count)));
  const start = durationS * 0.02;
  const span = durationS * 0.96;
  return Array.from({ length: n }, (_, i) => Number((start + (span * (i + 0.5)) / n).toFixed(3)));
}

// ---------------------------------------------------------------------------
// Modèle, file d'attente et seuils
// ---------------------------------------------------------------------------

/**
 * Modèle vision FormCheck : FORMCHECK_MODEL, sinon gpt-6.1-sol.
 * Volontairement indépendant de OPENAI_REPORT_MODEL (utilisé par les autres rapports).
 */
export const FORMCHECK_DEFAULT_MODEL = "gpt-6.1-sol";
export function getFormcheckModel(env: NodeJS.ProcessEnv = process.env): string {
  return String(env.FORMCHECK_MODEL || "").trim() || FORMCHECK_DEFAULT_MODEL;
}

/** Efforts de raisonnement acceptés par gpt-6.1-sol (doc OpenAI : low, medium, high, xhigh, max). */
export const FORMCHECK_REASONING_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type FormcheckReasoningEffort = typeof FORMCHECK_REASONING_EFFORTS[number];
export const FORMCHECK_DEFAULT_REASONING_EFFORT: FormcheckReasoningEffort = "high";

/** Effort de raisonnement : FORMCHECK_REASONING_EFFORT, sinon high. Valeur inconnue : high. */
export function getFormcheckReasoningEffort(env: NodeJS.ProcessEnv = process.env): FormcheckReasoningEffort {
  const raw = String(env.FORMCHECK_REASONING_EFFORT || "").trim().toLowerCase();
  return (FORMCHECK_REASONING_EFFORTS as readonly string[]).includes(raw)
    ? (raw as FormcheckReasoningEffort)
    : FORMCHECK_DEFAULT_REASONING_EFFORT;
}

/**
 * Tarifs officiels OpenAI (USD par million de tokens, traitement Standard).
 * gpt-6.1-sol : https://developers.openai.com/api/docs/models/gpt-6.1-sol
 * Au-delà de 272K tokens d'entrée : x2 sur l'entrée et le cache, x1,5 sur la sortie.
 */
export const FORMCHECK_MODEL_PRICING: Record<string, { input: number; cachedInput: number; cacheWrite: number; output: number }> = {
  "gpt-6.1-sol": { input: 2, cachedInput: 0.1, cacheWrite: 2.5, output: 10 },
  "gpt-5.6-sol": { input: 5, cachedInput: 0.5, cacheWrite: 6.25, output: 30 },
};
const LONG_CONTEXT_THRESHOLD_TOKENS = 272_000;

/** Coût estimé d'une analyse. Les tokens de raisonnement sont inclus dans outputTokens. null si modèle sans tarif connu. */
export function estimateFormcheckCostUsd(
  model: string,
  tokens: { inputTokens: number; cachedInputTokens?: number; cacheWriteTokens?: number; outputTokens: number },
): number | null {
  const key = Object.keys(FORMCHECK_MODEL_PRICING)
    .sort((a, b) => b.length - a.length)
    .find((k) => model === k || model.startsWith(`${k}-`));
  if (!key) return null;
  const p = FORMCHECK_MODEL_PRICING[key];
  const input = Math.max(0, tokens.inputTokens || 0);
  const cached = Math.min(input, Math.max(0, tokens.cachedInputTokens || 0));
  const writes = Math.min(input - cached, Math.max(0, tokens.cacheWriteTokens || 0));
  const uncached = input - cached - writes;
  const long = input > LONG_CONTEXT_THRESHOLD_TOKENS;
  const inputUsd = ((uncached * p.input + cached * p.cachedInput + writes * p.cacheWrite) / 1_000_000) * (long ? 2 : 1);
  const outputUsd = ((Math.max(0, tokens.outputTokens || 0) * p.output) / 1_000_000) * (long ? 1.5 : 1);
  return Math.round((inputUsd + outputUsd) * 1_000_000) / 1_000_000;
}

export function getFormcheckMinConfidence(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.FORMCHECK_MIN_CONFIDENCE);
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : 0.55;
}

export const FORMCHECK_MAX_ATTEMPTS = 3;

/** Délai avant la tentative suivante (attempt = tentatives déjà faites). */
export function retryDelayMs(attempt: number): number {
  return [60_000, 5 * 60_000, 15 * 60_000][Math.max(0, Math.min(2, attempt - 1))];
}

export function getFormcheckAdminEmail(env: NodeJS.ProcessEnv = process.env): string {
  return String(env.ADMIN_NOTIF_EMAIL || env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com").trim();
}

export function isFormcheckWorkerEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = String(env.FORMCHECK_WORKER_ENABLED ?? "true").trim().toLowerCase();
  return !["0", "false", "off", "no"].includes(raw);
}

export const FORMCHECK_BRAND = {
  yellow: "#FCDD00",
  black: "#0A0A0A",
  ink: "#1A1A1A",
  muted: "#5B5B5B",
  paper: "#FFFFFF",
  soft: "#F6F5F0",
  line: "#E6E4DC",
  red: "#E5484D",
} as const;
