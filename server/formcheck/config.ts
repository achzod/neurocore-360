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

/** Exercices proposés au client (valeur stockée -> libellé affiché). */
export const FORMCHECK_EXERCISES: Record<string, string> = {
  squat: "Squat",
  front_squat: "Front squat",
  deadlift: "Soulevé de terre",
  romanian_deadlift: "Soulevé de terre roumain",
  bench_press: "Développé couché",
  overhead_press: "Développé militaire",
  barbell_row: "Rowing barre",
  pull_up: "Traction",
  hip_thrust: "Hip thrust",
  lunge: "Fente",
  bulgarian_split_squat: "Squat bulgare",
  leg_press: "Presse à cuisses",
  push_up: "Pompe",
  dip: "Dips",
  other: "Autre exercice",
};

export function resolveExercise(raw: unknown): { key: string; label: string } | null {
  const key = String(raw ?? "").trim();
  const label = FORMCHECK_EXERCISES[key];
  return label ? { key, label } : null;
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

/** Modèle vision : FORMCHECK_MODEL, sinon le modèle déjà utilisé pour la vision (OPENAI_REPORT_MODEL). */
export function getFormcheckModel(env: NodeJS.ProcessEnv = process.env): string {
  return String(env.FORMCHECK_MODEL || "").trim() || String(env.OPENAI_REPORT_MODEL || "").trim() || "gpt-5.6-sol";
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
