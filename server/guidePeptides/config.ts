/**
 * Guide Peptides (ebook PDF) : configuration et règles pures.
 *
 * Aucun accès DB, réseau ou disque ici, pour rester testable avec node:test.
 */
import path from "node:path";
import type Stripe from "stripe";

export const GUIDE_PEPTIDES_PLAN_TYPE = "GUIDE_PEPTIDES" as const;
export const GUIDE_PEPTIDES_AMOUNT_CENTS = 9900;
export const GUIDE_PEPTIDES_PRICE_LABEL = "99 €";
export const GUIDE_PEPTIDES_PRODUCT_NAME = "Guide Peptides AchZod";
export const GUIDE_PEPTIDES_PDF_FILENAME = "Guide-Peptides-AchZod.pdf";
export const GUIDE_PEPTIDES_OFFER_PATH = "/offers/guide-peptides";
export const GUIDE_PEPTIDES_THANKS_PATH = "/guide-peptides/merci";
/** Version du texte d'accord (livraison immédiate + renonciation au droit de rétractation), stockée sur la session Stripe. */
export const GUIDE_PEPTIDES_CONSENT_VERSION = "guide-peptides-digital-v1";

/** Code offert aux acheteurs : 99 € de réduction sur Peptides Engine (ou un coaching AchZod). */
export const GUIDE_PEPTIDES_BONUS_CODE = "BOOKPEPTIDES99";
/** Adresse à laquelle l'acheteur écrit, avec son numéro de commande, pour recevoir l'accès aux sources. */
export const GUIDE_PEPTIDES_SOURCES_EMAIL = "achzodyt@gmail.com";

export const PEPTIDES_ENGINE_URL = "https://apexlabs.achzodcoaching.com/offers/peptides-engine";
export const ACHZOD_COACHING_URL = "https://www.achzodcoaching.com";

/**
 * Ligne Stripe Checkout : prix configuré (STRIPE_PRICE_GUIDE_PEPTIDES) s'il est
 * valide, sinon price_data en ligne à 99,00 EUR. Aucun prix n'est créé côté Stripe.
 */
export function buildGuidePeptidesLineItem(
  env: NodeJS.ProcessEnv = process.env,
): Stripe.Checkout.SessionCreateParams.LineItem {
  const configured = String(env.STRIPE_PRICE_GUIDE_PEPTIDES || "").trim();
  if (/^price_[A-Za-z0-9]+$/.test(configured)) {
    return { quantity: 1, price: configured };
  }
  return {
    quantity: 1,
    price_data: {
      currency: "eur",
      unit_amount: GUIDE_PEPTIDES_AMOUNT_CENTS,
      product_data: {
        name: GUIDE_PEPTIDES_PRODUCT_NAME,
        description: "Peptides, le guide de référence par AchZod. Ebook PDF de 199 pages, lien de téléchargement par email.",
      },
    },
  };
}

/** Numéro de commande lisible, stable pour une session Stripe donnée. */
export function guidePeptidesOrderNumber(stripeSessionId: string): string {
  const tail = String(stripeSessionId || "").replace(/[^A-Za-z0-9]/g, "").slice(-8).toUpperCase();
  return `GP-${tail || "00000000"}`;
}

/**
 * Emplacements possibles du PDF, hors des fichiers statiques publics.
 * GUIDE_PEPTIDES_PDF_PATH permet de pointer vers un autre stockage (disque Render, etc.).
 */
export function guidePeptidesPdfCandidates(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): string[] {
  const override = String(env.GUIDE_PEPTIDES_PDF_PATH || "").trim();
  const candidates = [
    override,
    path.join(cwd, "server", "private", "guide-peptides", GUIDE_PEPTIDES_PDF_FILENAME),
    typeof __dirname === "string" ? path.resolve(__dirname, "..", "server", "private", "guide-peptides", GUIDE_PEPTIDES_PDF_FILENAME) : "",
    typeof __dirname === "string" ? path.resolve(__dirname, "..", "private", "guide-peptides", GUIDE_PEPTIDES_PDF_FILENAME) : "",
  ];
  return candidates.filter((value, index, arr) => Boolean(value) && arr.indexOf(value) === index);
}

export function getGuidePeptidesAdminEmail(env: NodeJS.ProcessEnv = process.env): string {
  return String(env.ADMIN_NOTIF_EMAIL || env.ADMIN_NOTIFICATION_EMAIL || "coaching@achzodcoaching.com").trim();
}

export const GUIDE_PEPTIDES_BRAND = {
  yellow: "#FCDD00",
  black: "#15130E",
  ink: "#15130E",
  muted: "#5F5A4E",
  paper: "#FFFDF7",
  soft: "#F7F4EC",
  line: "#E7E1D2",
} as const;
