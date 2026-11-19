/**
 * Relance des paiements abandonnés (checkout Stripe créé, jamais payé).
 *
 * Séquence de 2 mails :
 *   - étape 1 : ~1 h après la création du checkout,
 *   - étape 2 : ~24 h après la création du checkout.
 * Chaque mail contient un lien qui recrée un checkout du même produit au même
 * prix que la commande abandonnée (aucune nouvelle remise).
 *
 * Garde-fous :
 *   - CHECKOUT_RECOVERY_ENABLED=1 obligatoire, sinon rien ne part (coupure).
 *   - Jamais de stock historique : seuls les checkouts créés après
 *     CHECKOUT_RECOVERY_START_AT (ou, à défaut, après le démarrage du process)
 *     ET dans les 7 derniers jours sont éligibles. En plus, l'étape 2 n'est
 *     envoyée que jusqu'à 72 h après l'abandon.
 *   - Arrêt immédiat si la personne a payé le même produit entre-temps.
 *   - Une seule séquence par email et par produit (contrainte UNIQUE en base).
 *   - Désinscriptions et liste de suppression respectées (le mail passe par
 *     sendEmailWithTracking, type marketing "sendCheckoutRecoveryEmail").
 */
import { randomBytes } from "crypto";

export const CHECKOUT_RECOVERY_EMAIL_TYPE = "sendCheckoutRecoveryEmail";

const HOUR_MS = 60 * 60 * 1000;

export interface CheckoutRecoveryConfig {
  enabled: boolean;
  /** Les checkouts créés avant cette date ne sont jamais relancés. */
  startAt: Date;
  startAtSource: "env" | "process_start";
  step1DelayMs: number;
  step1MaxAgeMs: number;
  step2DelayMs: number;
  step2MaxAgeMs: number;
  /** Plafond absolu : jamais de relance d'un checkout de plus de 7 jours. */
  maxLookbackMs: number;
  /** Validité du lien de reprise après la création du checkout. */
  linkValidityMs: number;
  maxSendsPerCycle: number;
}

export function readCheckoutRecoveryConfig(
  env: Record<string, string | undefined>,
  processStartedAt: Date,
): CheckoutRecoveryConfig {
  const enabled = env.CHECKOUT_RECOVERY_ENABLED === "1" || env.CHECKOUT_RECOVERY_ENABLED === "true";
  const rawStart = String(env.CHECKOUT_RECOVERY_START_AT || "").trim();
  const parsedStart = rawStart ? new Date(rawStart) : null;
  const validStart = parsedStart && !Number.isNaN(parsedStart.getTime()) ? parsedStart : null;
  const maxPerCycle = Number(env.CHECKOUT_RECOVERY_MAX_PER_CYCLE || 20);
  return {
    enabled,
    startAt: validStart || processStartedAt,
    startAtSource: validStart ? "env" : "process_start",
    step1DelayMs: 1 * HOUR_MS,
    step1MaxAgeMs: 23 * HOUR_MS,
    step2DelayMs: 24 * HOUR_MS,
    step2MaxAgeMs: 72 * HOUR_MS,
    maxLookbackMs: 7 * 24 * HOUR_MS,
    linkValidityMs: 14 * 24 * HOUR_MS,
    maxSendsPerCycle: Number.isFinite(maxPerCycle) ? Math.min(Math.max(Math.round(maxPerCycle), 1), 100) : 20,
  };
}

/** Date la plus ancienne d'un checkout éligible : max(début, maintenant - 7 j). */
export function checkoutRecoveryCutoff(config: CheckoutRecoveryConfig, now: Date): Date {
  const lookback = now.getTime() - config.maxLookbackMs;
  return new Date(Math.max(config.startAt.getTime(), lookback));
}

export interface RecoveryOrder {
  id: string;
  email: string;
  productType: string;
  productName?: string | null;
  status: string;
  amountCents: number;
  discountCents: number;
  finalAmountCents: number;
  promoCode?: string | null;
  promoCodeId?: string | null;
  stripeCheckoutSessionId?: string | null;
  createdAt: Date | string;
  paidAt?: Date | string | null;
  metadata?: Record<string, any> | null;
}

export interface RecoverySequence {
  id: string;
  email: string;
  productType: string;
  orderId: string;
  abandonedAt: Date;
  token: string;
  step1SentAt: Date | null;
  step2SentAt: Date | null;
  stoppedAt: Date | null;
  stopReason: string | null;
}

const ABANDONED_STATUSES = new Set(["pending", "cancelled"]);
/** Statuts qui prouvent que la personne a payé (même remboursée ensuite). */
const PAID_STATUSES = new Set(["paid", "partial_refund", "refunded", "payment_review"]);
/** Produits achetés une fois pour toutes : tout achat passé arrête la séquence. */
const SINGLE_PURCHASE_PRODUCTS = new Set(["PREMIUM", "ELITE", "BURNOUT"]);

const toTime = (value: Date | string | null | undefined): number => {
  if (!value) return NaN;
  return (value instanceof Date ? value : new Date(value)).getTime();
};

export const normalizeRecoveryEmail = (email: unknown): string => String(email || "").trim().toLowerCase();

export function isInternalOrTestEmail(email: string): boolean {
  const e = normalizeRecoveryEmail(email);
  return !e.includes("@")
    || e.includes("test")
    || e.includes("debug")
    || e.includes("achzodcoaching")
    || e.includes("achkou");
}

export function isAbandonedCheckoutCandidate(order: RecoveryOrder, cutoff: Date, now: Date): boolean {
  if (!ABANDONED_STATUSES.has(String(order.status || "").toLowerCase())) return false;
  if (!order.stripeCheckoutSessionId) return false;
  if (!order.productType || order.productType === "GRATUIT") return false;
  if (!Number.isInteger(order.finalAmountCents) || order.finalAmountCents <= 0) return false;
  if (order.metadata?.freeViaPromo) return false;
  if (order.metadata?.checkoutRecovery) return false; // un checkout déjà issu d'une relance ne relance pas
  if (isInternalOrTestEmail(order.email)) return false;
  const created = toTime(order.createdAt);
  if (!Number.isFinite(created)) return false;
  return created >= cutoff.getTime() && created <= now.getTime();
}

/**
 * Vrai si la personne a payé ce produit après l'abandon (ou, pour un produit
 * à achat unique, à n'importe quel moment).
 */
export function hasPaidSameProduct(
  orders: RecoveryOrder[],
  email: string,
  productType: string,
  abandonedAt: Date,
): boolean {
  const target = normalizeRecoveryEmail(email);
  return orders.some((order) => {
    if (normalizeRecoveryEmail(order.email) !== target) return false;
    if (order.productType !== productType) return false;
    if (!PAID_STATUSES.has(String(order.status || "").toLowerCase())) return false;
    if (SINGLE_PURCHASE_PRODUCTS.has(productType)) return true;
    const when = toTime(order.paidAt) || toTime(order.createdAt);
    return Number.isFinite(when) && when >= abandonedAt.getTime() - HOUR_MS;
  });
}

export type RecoveryStep = 1 | 2;

/** Prochaine étape à envoyer maintenant, ou null. */
export function decideNextRecoveryStep(
  sequence: Pick<RecoverySequence, "abandonedAt" | "step1SentAt" | "step2SentAt" | "stoppedAt">,
  config: CheckoutRecoveryConfig,
  now: Date,
): RecoveryStep | null {
  if (sequence.stoppedAt) return null;
  const age = now.getTime() - sequence.abandonedAt.getTime();
  if (age < 0) return null;
  if (!sequence.step2SentAt && age >= config.step2DelayMs && age < config.step2MaxAgeMs) return 2;
  if (!sequence.step1SentAt && !sequence.step2SentAt && age >= config.step1DelayMs && age < config.step1MaxAgeMs) return 1;
  return null;
}

/** Groupe par email + produit et garde le checkout abandonné le plus récent. */
export function latestAbandonByEmailAndProduct(orders: RecoveryOrder[]): RecoveryOrder[] {
  const byKey = new Map<string, RecoveryOrder>();
  for (const order of orders) {
    const key = `${normalizeRecoveryEmail(order.email)}|${order.productType}`;
    const current = byKey.get(key);
    if (!current || toTime(order.createdAt) > toTime(current.createdAt)) byKey.set(key, order);
  }
  return Array.from(byKey.values());
}

export function generateRecoveryToken(): string {
  return randomBytes(24).toString("hex");
}

const PRODUCT_LABELS: Record<string, string> = {
  PREMIUM: "Anabolic Bioscan",
  ELITE: "Ultimate Scan",
  BURNOUT: "Burnout Engine",
  BLOOD_ANALYSIS: "Blood Analysis",
  PEPTIDES_ENGINE: "Peptides Engine",
};

export function recoveryProductLabel(order: Pick<RecoveryOrder, "productType" | "metadata">): string {
  const base = PRODUCT_LABELS[order.productType] || order.productType;
  const tier = String(order.metadata?.peptidesTier || "");
  if (order.productType === "PEPTIDES_ENGINE" && tier) {
    return `${base} ${tier.charAt(0).toUpperCase()}${tier.slice(1)}`;
  }
  return base;
}

export function formatRecoveryPrice(cents: number): string {
  const euros = cents / 100;
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: Number.isInteger(euros) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(euros);
  return `${formatted} €`;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Mots interdits dans ces mails (consigne Achzod). */
export const FORBIDDEN_RECOVERY_WORDS = [/\bIA\b/, /g[ée]n[ée]r[ée]/i, /automatique/i, /personnalis[ée]/i, /moteur/i, /\bnous\b/i];

export function buildCheckoutRecoveryEmail(input: {
  step: RecoveryStep;
  productLabel: string;
  priceCents: number;
  recoverUrl: string;
  trackingPixelUrl?: string | null;
}): { subject: string; text: string; html: string } {
  const price = formatRecoveryPrice(input.priceCents);
  const product = input.productLabel;
  const subject = input.step === 1
    ? `Ta commande ${product} n'est pas allée au bout`
    : `Toujours partant pour ${product} ?`;

  const paragraphs = input.step === 1
    ? [
        "Salut,",
        `Tu as lancé ta commande ${product} tout à l'heure, mais le paiement ne s'est pas finalisé.`,
        `Si c'est un souci de carte ou une page qui a coupé, ce lien te remet direct sur le paiement. Même produit, même prix (${price}).`,
        "__CTA__",
        "Si tu as une question avant de valider, réponds à ce mail. Je lis et je réponds moi-même.",
        "Achzod",
      ]
    : [
        "Salut,",
        `Petit rappel : ta commande ${product} d'hier n'a pas été finalisée.`,
        `Le lien marche toujours. Même produit, même prix (${price}).`,
        "__CTA__",
        "Si quelque chose te bloque (le prix, un doute sur ce que tu vas recevoir, le moyen de paiement), dis-le moi en répondant à ce mail. Je te réponds moi-même.",
        "C'est le dernier mail que je t'envoie à ce sujet.",
        "Achzod",
      ];

  const ctaLabel = "Reprendre ma commande";
  const text = [
    ...paragraphs.map((p) => (p === "__CTA__" ? `${ctaLabel} : ${input.recoverUrl}` : p)),
    "",
    "Tu ne veux plus recevoir ces mails : {{UNSUB_LINK}}",
  ].join("\n\n");

  const htmlParagraphs = paragraphs
    .map((p) => {
      if (p === "__CTA__") {
        return `<p style="margin:24px 0;"><a href="${escapeHtml(input.recoverUrl)}" style="display:inline-block;background:#111111;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;font-weight:600;">${ctaLabel}</a></p>`;
      }
      return `<p style="margin:0 0 14px;">${escapeHtml(p)}</p>`;
    })
    .join("\n");

  const pixel = input.trackingPixelUrl
    ? `<img src="${escapeHtml(input.trackingPixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`
    : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:24px 16px;background:#ffffff;color:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;">
<div style="max-width:540px;margin:0 auto;">
${htmlParagraphs}
<p style="margin:32px 0 0;color:#777777;font-size:12px;">Tu ne veux plus recevoir ces mails ? <a href="{{UNSUB_LINK}}" style="color:#777777;">Se désabonner</a></p>
</div>
${pixel}
</body>
</html>`;

  return { subject, text, html };
}

export interface RecoveryCheckoutPlan {
  lineItem: {
    quantity: number;
    price_data: { currency: "eur"; unit_amount: number; product_data: { name: string } };
  };
  sessionMetadata: Record<string, string>;
  orderInput: {
    email: string;
    productType: string;
    amountCents: number;
    discountCents: number;
    finalAmountCents: number;
    promoCode: string | null;
    promoCodeId: string | null;
    metadata: Record<string, any>;
  };
  paymentRail: "standard" | "klarna";
  successPath: string;
  cancelPath: string;
}

/**
 * Prépare le nouveau checkout : même produit, même montant final que la
 * commande abandonnée, montant passé en ligne (pas de coupon recréé, pas de
 * nouvelle remise, compteur de code promo non réincrémenté).
 */
export function buildRecoveryCheckoutPlan(
  order: RecoveryOrder,
  sequence: Pick<RecoverySequence, "id">,
  now: Date,
): RecoveryCheckoutPlan {
  const meta = { ...(order.metadata || {}) };
  const email = normalizeRecoveryEmail(order.email);
  const paymentRail: "standard" | "klarna" = meta.paymentRail === "klarna" && order.productType === "PEPTIDES_ENGINE"
    ? "klarna"
    : "standard";
  const isBlood = order.productType === "BLOOD_ANALYSIS";
  const isPeptides = order.productType === "PEPTIDES_ENGINE";
  const successPath = isBlood
    ? "/blood-analysis?session_id={CHECKOUT_SESSION_ID}"
    : isPeptides
    ? "/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}&product=peptides"
    : "/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}";
  const cancelPath = isBlood
    ? "/offers/blood-analysis?cancelled=true"
    : isPeptides
    ? "/peptides-engine?cancelled=true"
    : "/audit-complet/checkout?cancelled=true";

  return {
    lineItem: {
      quantity: 1,
      price_data: {
        currency: "eur",
        unit_amount: order.finalAmountCents,
        product_data: { name: recoveryProductLabel(order) },
      },
    },
    sessionMetadata: {
      email,
      planType: order.productType,
      peptidesTier: String(meta.peptidesTier || ""),
      promoCode: String(order.promoCode || ""),
      payment_rail: paymentRail,
      health_consent_version: isBlood ? String(meta.healthDataConsent?.version || "") : "",
      checkout_recovery_from_order: order.id,
      checkout_recovery_sequence: sequence.id,
    },
    orderInput: {
      email,
      productType: order.productType,
      amountCents: order.amountCents,
      discountCents: order.discountCents,
      finalAmountCents: order.finalAmountCents,
      promoCode: order.promoCode || null,
      promoCodeId: order.promoCodeId || null,
      metadata: {
        ...meta,
        paymentRail,
        checkoutRecovery: {
          fromOrderId: order.id,
          sequenceId: sequence.id,
          createdAt: now.toISOString(),
        },
      },
    },
    paymentRail,
    successPath,
    cancelPath,
  };
}

export interface CheckoutRecoveryDeps {
  listCandidateOrders(cutoff: Date): Promise<RecoveryOrder[]>;
  listOrdersForEmail(email: string): Promise<RecoveryOrder[]>;
  getSequence(email: string, productType: string): Promise<RecoverySequence | null>;
  /** INSERT ... ON CONFLICT DO NOTHING ; null si une séquence existe déjà. */
  createSequence(order: RecoveryOrder, token: string): Promise<RecoverySequence | null>;
  /** Réserve l'étape avant l'envoi (UPDATE ... WHERE stepN_sent_at IS NULL). */
  claimStep(sequenceId: string, step: RecoveryStep, at: Date): Promise<boolean>;
  recordStepResult(sequenceId: string, step: RecoveryStep, ok: boolean, trackingId: string | null): Promise<void>;
  stopSequence(sequenceId: string, reason: string, at: Date): Promise<void>;
  isUnsubscribed(email: string): Promise<boolean>;
  sendStep(input: { sequence: RecoverySequence; order: RecoveryOrder; step: RecoveryStep }): Promise<{ ok: boolean; trackingId: string | null }>;
}

export interface CheckoutRecoveryCycleResult {
  enabled: boolean;
  cutoff: string | null;
  candidates: number;
  sent: number;
  failed: number;
  stoppedPaid: number;
  skippedUnsubscribed: number;
}

export async function runCheckoutRecoveryCycle(
  deps: CheckoutRecoveryDeps,
  config: CheckoutRecoveryConfig,
  now: Date = new Date(),
): Promise<CheckoutRecoveryCycleResult> {
  const result: CheckoutRecoveryCycleResult = {
    enabled: config.enabled,
    cutoff: null,
    candidates: 0,
    sent: 0,
    failed: 0,
    stoppedPaid: 0,
    skippedUnsubscribed: 0,
  };
  if (!config.enabled) return result;

  const cutoff = checkoutRecoveryCutoff(config, now);
  result.cutoff = cutoff.toISOString();
  const raw = await deps.listCandidateOrders(cutoff);
  const candidates = latestAbandonByEmailAndProduct(raw.filter((o) => isAbandonedCheckoutCandidate(o, cutoff, now)));
  result.candidates = candidates.length;

  for (const order of candidates) {
    if (result.sent + result.failed >= config.maxSendsPerCycle) break;
    const email = normalizeRecoveryEmail(order.email);
    let sequence = await deps.getSequence(email, order.productType);
    if (sequence?.stoppedAt) continue;
    const abandonedAt = sequence?.abandonedAt || new Date(order.createdAt);

    const history = await deps.listOrdersForEmail(email);
    if (hasPaidSameProduct(history, email, order.productType, abandonedAt)) {
      if (sequence) await deps.stopSequence(sequence.id, "paid", now);
      result.stoppedPaid++;
      continue;
    }
    if (await deps.isUnsubscribed(email)) {
      if (sequence) await deps.stopSequence(sequence.id, "unsubscribed", now);
      result.skippedUnsubscribed++;
      continue;
    }

    const probe = sequence || {
      abandonedAt,
      step1SentAt: null,
      step2SentAt: null,
      stoppedAt: null,
    };
    const step = decideNextRecoveryStep(probe, config, now);
    if (!step) continue;

    if (!sequence) {
      sequence = await deps.createSequence(order, generateRecoveryToken());
      if (!sequence) continue; // une autre instance l'a créée : on la laissera au cycle suivant
    }
    if (!(await deps.claimStep(sequence.id, step, now))) continue;

    const sourceOrder = sequence.orderId === order.id
      ? order
      : (raw.find((o) => o.id === sequence!.orderId) || order);
    let outcome: { ok: boolean; trackingId: string | null };
    try {
      outcome = await deps.sendStep({ sequence, order: sourceOrder, step });
    } catch (error) {
      console.error(`[CheckoutRecovery] envoi etape ${step} echoue pour ${email}:`, error);
      outcome = { ok: false, trackingId: null };
    }
    // Pas de nouvel essai d'une étape ratée : on évite toute boucle d'envois.
    await deps.recordStepResult(sequence.id, step, outcome.ok, outcome.trackingId);
    if (outcome.ok) result.sent++;
    else result.failed++;
  }

  return result;
}

/** Validité du lien de reprise. */
export function isRecoveryLinkValid(sequence: Pick<RecoverySequence, "abandonedAt">, config: CheckoutRecoveryConfig, now: Date): boolean {
  return now.getTime() - sequence.abandonedAt.getTime() <= config.linkValidityMs;
}
