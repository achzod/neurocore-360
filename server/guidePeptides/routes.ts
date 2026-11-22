/**
 * Guide Peptides (ebook PDF, 99 €) : checkout Stripe, livraison par email,
 * téléchargement privé par lien signé (30 jours, retéléchargeable).
 *
 * Même schéma que FormCheck : pas de compte, metadata.planType sur la session
 * Stripe, livraison déclenchée par le webhook ET par la page de retour
 * (idempotente sur la session Stripe).
 */
import type { Express, Request, Response } from "express";
import { createReadStream, existsSync, statSync } from "node:fs";
import type Stripe from "stripe";
import { GUIDE_PEPTIDES_DOWNLOAD_TTL_DAYS, signGuidePeptidesDownloadToken, verifyGuidePeptidesDownloadToken } from "../auth";
import { createRateLimiter } from "../middleware/rateLimit";
import { createCheckoutSessionWithPaymentMethodFallback } from "../stripeCheckoutPaymentMethods";
import { isStripeCheckoutPaid } from "../stripePurchaseTracking";
import {
  buildGuidePeptidesLineItem,
  getGuidePeptidesAdminEmail,
  GUIDE_PEPTIDES_AMOUNT_CENTS,
  GUIDE_PEPTIDES_CONSENT_VERSION,
  GUIDE_PEPTIDES_OFFER_PATH,
  GUIDE_PEPTIDES_PDF_FILENAME,
  GUIDE_PEPTIDES_PLAN_TYPE,
  GUIDE_PEPTIDES_THANKS_PATH,
  guidePeptidesOrderNumber,
  guidePeptidesPdfCandidates,
} from "./config";
import { buildGuideAdminSaleEmail, buildGuideDeliveryEmail } from "./emails";
import * as store from "./store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SESSION_RE = /^cs_(test|live)_[A-Za-z0-9]+$/;

export function getGuidePeptidesBaseUrl(): string {
  const raw = process.env.PUBLIC_BASE_URL || process.env.APP_URL || process.env.RENDER_EXTERNAL_URL
    || (process.env.NODE_ENV === "production" ? "https://apexlabs.achzodcoaching.com" : `http://localhost:${process.env.PORT || 5000}`);
  return raw.replace(/\/+$/, "");
}

export function guidePeptidesDownloadUrl(baseUrl: string, email: string, stripeSessionId: string): string {
  const token = signGuidePeptidesDownloadToken(email, stripeSessionId);
  return `${baseUrl.replace(/\/+$/, "")}/api/guide-peptides/download?token=${encodeURIComponent(token)}`;
}

async function stripeClient(): Promise<Stripe> {
  const { getUncachableStripeClient } = await import("../stripeClient");
  return getUncachableStripeClient();
}

async function sendMail(input: Parameters<typeof import("../emailService").sendGuidePeptidesTransactionalEmail>[0]) {
  const { sendGuidePeptidesTransactionalEmail } = await import("../emailService");
  return sendGuidePeptidesTransactionalEmail(input);
}

async function notifyAdminIncident(subject: string, details: string) {
  const { sendOperationalAlertEmail } = await import("../emailService");
  await sendOperationalAlertEmail(subject, details).catch(() => false);
}

/** Chemin du PDF sur le disque, ou null s'il est introuvable. */
export function resolveGuidePeptidesPdfPath(): string | null {
  for (const candidate of guidePeptidesPdfCandidates()) {
    try {
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    } catch {
      // candidat suivant
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Paiement -> livraison (appelé par le webhook Stripe et par la page de retour)
// ---------------------------------------------------------------------------

export function isGuidePeptidesCheckoutSession(session: { metadata?: Record<string, string> | null } | null | undefined): boolean {
  return session?.metadata?.planType === GUIDE_PEPTIDES_PLAN_TYPE;
}

export async function fulfillGuidePeptidesCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<{ created: boolean; email: string; orderNumber: string } | null> {
  if (!isGuidePeptidesCheckoutSession(session as any) || !isStripeCheckoutPaid(session)) return null;
  const email = store.normalizeEmail(session.metadata?.email || session.customer_details?.email || session.customer_email || "");
  if (!email) {
    await notifyAdminIncident("Guide Peptides paiement sans email", `Session ${session.id}`);
    throw new Error(`GUIDE_PEPTIDES_SESSION_INVALID:${session.id}`);
  }
  const amount = Number(session.amount_total ?? 0);
  const currency = String(session.currency || "eur").toLowerCase();
  if (amount !== GUIDE_PEPTIDES_AMOUNT_CENTS || currency !== "eur") {
    // Le client a payé : il reçoit son guide, l'admin est prévenu de l'écart (prix Stripe mal configuré, etc.).
    await notifyAdminIncident("Guide Peptides écart de montant", `Session ${session.id} : ${amount} ${currency}, attendu ${GUIDE_PEPTIDES_AMOUNT_CENTS} eur.`);
  }
  const orderNumber = guidePeptidesOrderNumber(session.id);
  const { created } = await store.recordGuidePurchase({
    stripeSessionId: session.id,
    paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
    orderNumber,
    email,
    amountCents: amount || GUIDE_PEPTIDES_AMOUNT_CENTS,
    currency,
  });
  if (created) {
    const base = getGuidePeptidesBaseUrl();
    const mail = buildGuideDeliveryEmail({
      downloadUrl: guidePeptidesDownloadUrl(base, email, session.id),
      orderNumber,
      ttlDays: GUIDE_PEPTIDES_DOWNLOAD_TTL_DAYS,
      baseUrl: base,
    });
    const sent = await sendMail({ to: email, ...mail, emailType: "sendGuidePeptidesDeliveryEmail", metadata: { stripeSessionId: session.id, orderNumber } });
    if (sent) await store.markGuideDeliveryEmailSent(session.id).catch(() => {});
    const admin = buildGuideAdminSaleEmail({ email, orderNumber, amountCents: amount || GUIDE_PEPTIDES_AMOUNT_CENTS, currency, stripeSessionId: session.id, deliveryEmailSent: sent });
    await sendMail({ to: getGuidePeptidesAdminEmail(), ...admin, emailType: "sendGuidePeptidesAdminSaleEmail", metadata: { stripeSessionId: session.id, orderNumber, clientEmail: email } })
      .catch(() => false);
    if (!sent) await notifyAdminIncident("Guide Peptides email de livraison non envoyé", `Client ${email}, commande ${orderNumber}, session ${session.id}. L'achat est bien enregistré, le client peut redemander son lien sur ${GUIDE_PEPTIDES_OFFER_PATH}.`);
    console.log(`[GuidePeptides] achat ${orderNumber} pour ${email} (session ${session.id})`);
  }
  return { created, email, orderNumber };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export function registerGuidePeptidesRoutes(app: Express) {
  const checkoutLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 20 });
  const accessLimiter = createRateLimiter({ windowMs: 60 * 60_000, max: 5 });
  const downloadLimiter = createRateLimiter({ windowMs: 60 * 60_000, max: 30 });

  app.post("/api/guide-peptides/checkout", checkoutLimiter, async (req, res) => {
    try {
      const email = store.normalizeEmail(req.body?.email || "");
      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ error: "INVALID_EMAIL", message: "Indique une adresse email valide : c'est là que tu recevras ton guide." });
      }
      // Contenu numérique livré tout de suite : accord exprès et renonciation au droit de rétractation (CGV art. 7, L221-28).
      if (req.body?.consent !== true) {
        return res.status(400).json({ error: "CONSENT_REQUIRED", message: "Coche la case pour recevoir ton guide tout de suite après le paiement." });
      }
      const base = getGuidePeptidesBaseUrl();
      const metadata = {
        planType: GUIDE_PEPTIDES_PLAN_TYPE,
        email,
        digitalDeliveryConsent: GUIDE_PEPTIDES_CONSENT_VERSION,
        digitalDeliveryConsentAt: new Date().toISOString(),
      };
      const session = await createCheckoutSessionWithPaymentMethodFallback(
        await stripeClient(),
        {
          mode: "payment",
          line_items: [buildGuidePeptidesLineItem()],
          customer_email: email,
          success_url: `${base}${GUIDE_PEPTIDES_THANKS_PATH}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${base}${GUIDE_PEPTIDES_OFFER_PATH}?cancelled=true#commander`,
          metadata,
          payment_intent_data: { metadata },
          locale: "fr",
        },
        `GUIDE_PEPTIDES:${email}`,
        "standard",
      );
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("[GuidePeptides] checkout error:", error?.message || error);
      res.status(500).json({ error: "CHECKOUT_FAILED", message: "Le paiement n'a pas pu démarrer. Réessaie dans un instant." });
    }
  });

  // Page de retour Stripe : confirme le paiement sans attendre le webhook et donne le lien tout de suite.
  app.get("/api/guide-peptides/session/:sessionId", async (req, res) => {
    try {
      const sessionId = String(req.params.sessionId || "");
      if (!SESSION_RE.test(sessionId)) return res.status(400).json({ error: "INVALID_SESSION" });
      const session = await (await stripeClient()).checkout.sessions.retrieve(sessionId);
      if (!isGuidePeptidesCheckoutSession(session as any)) return res.status(404).json({ error: "NOT_GUIDE_PEPTIDES" });
      if (!isStripeCheckoutPaid(session)) return res.status(202).json({ status: "pending", message: "Paiement en cours de confirmation." });
      const fulfilled = await fulfillGuidePeptidesCheckoutSession(session);
      if (!fulfilled) return res.status(202).json({ status: "pending" });
      res.setHeader("Cache-Control", "private, no-store");
      res.json({
        status: "paid",
        email: fulfilled.email,
        orderNumber: fulfilled.orderNumber,
        downloadUrl: guidePeptidesDownloadUrl("", fulfilled.email, session.id),
      });
    } catch (error: any) {
      console.error("[GuidePeptides] session check error:", error?.message || error);
      res.status(500).json({ error: "SESSION_CHECK_FAILED", message: "Impossible de vérifier le paiement pour le moment. Ton lien de téléchargement arrive aussi par email." });
    }
  });

  // Renvoi d'un lien neuf (30 jours) à l'email d'achat. Réponse identique que l'achat existe ou non.
  app.post("/api/guide-peptides/access-link", accessLimiter, async (req, res) => {
    const email = store.normalizeEmail(req.body?.email || "");
    const generic = { ok: true, message: "Si un achat du guide existe pour cette adresse, un nouveau lien vient de partir par email." };
    try {
      if (!EMAIL_RE.test(email)) return res.json(generic);
      const purchase = await store.getLatestGuidePurchaseForEmail(email);
      if (!purchase) return res.json(generic);
      const base = getGuidePeptidesBaseUrl();
      const mail = buildGuideDeliveryEmail(
        {
          downloadUrl: guidePeptidesDownloadUrl(base, email, purchase.stripeSessionId),
          orderNumber: purchase.orderNumber,
          ttlDays: GUIDE_PEPTIDES_DOWNLOAD_TTL_DAYS,
          baseUrl: base,
        },
        { resend: true },
      );
      await sendMail({ to: email, ...mail, emailType: "sendGuidePeptidesDeliveryEmail", metadata: { resend: true, orderNumber: purchase.orderNumber } });
      res.json(generic);
    } catch (error) {
      console.error("[GuidePeptides] access link error:", error);
      res.json(generic);
    }
  });

  // Téléchargement privé : jeton signé valide ET achat enregistré pour cette session et cet email.
  app.get("/api/guide-peptides/download", downloadLimiter, async (req: Request, res: Response) => {
    const token = typeof req.query.token === "string" ? req.query.token.trim() : "";
    const access = token ? verifyGuidePeptidesDownloadToken(token) : null;
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (!access) {
      return res.status(401).type("html").send(expiredLinkHtml());
    }
    try {
      const purchase = await store.getGuidePurchase(access.sessionId, access.email);
      if (!purchase) return res.status(403).type("html").send(expiredLinkHtml());
      const pdfPath = resolveGuidePeptidesPdfPath();
      if (!pdfPath) {
        await notifyAdminIncident("Guide Peptides PDF introuvable", `Téléchargement refusé pour ${access.email} (commande ${purchase.orderNumber}) : fichier absent. Chemins testés : ${guidePeptidesPdfCandidates().join(", ")}`);
        return res.status(503).type("html").send(expiredLinkHtml("Le fichier est momentanément indisponible. Réessaie dans quelques minutes, ou écris-moi en répondant à l'email de livraison."));
      }
      const size = statSync(pdfPath).size;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", String(size));
      res.setHeader("Content-Disposition", `attachment; filename="${GUIDE_PEPTIDES_PDF_FILENAME}"`);
      createReadStream(pdfPath)
        .on("error", (error) => {
          console.error("[GuidePeptides] stream error:", error);
          if (!res.headersSent) res.status(500).end();
          else res.destroy(error);
        })
        .pipe(res);
    } catch (error) {
      console.error("[GuidePeptides] download error:", error);
      res.status(500).type("html").send(expiredLinkHtml("Le téléchargement n'a pas pu démarrer. Réessaie dans un instant."));
    }
  });

  if (process.env.DATABASE_URL) {
    store.ensureGuidePeptidesTables()
      .then(() => store.ensureGuidePeptidesPromoCode())
      .then((seeded) => console.log(`[GuidePeptides] tables prêtes${seeded ? ", code BOOKPEPTIDES99 vérifié" : ""}`))
      .catch((error) => console.error("[GuidePeptides] initialisation DB échouée:", error?.message || error));
  }
}

function expiredLinkHtml(message?: string): string {
  const text = message || "Ce lien de téléchargement n'est plus valide (il dure 30 jours). Redemande un lien neuf avec ton email d'achat, il arrive en quelques secondes.";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="robots" content="noindex"/><title>Guide Peptides</title></head>
<body style="margin:0;background:#f7f4ec;font-family:Helvetica,Arial,sans-serif;color:#15130e;">
<div style="max-width:520px;margin:12vh auto;padding:28px;background:#fffdf7;border:1px solid #e7e1d2;border-radius:10px;">
<div style="display:inline-block;background:#FCDD00;padding:4px 10px;font-weight:900;letter-spacing:2px;font-size:12px;">GUIDE PEPTIDES</div>
<p style="font-size:16px;line-height:1.6;margin:18px 0 22px;">${text.replace(/[<>&]/g, "")}</p>
<a href="${GUIDE_PEPTIDES_OFFER_PATH}#lien" style="display:inline-block;background:#15130e;color:#FCDD00;padding:13px 20px;border-radius:6px;font-weight:800;text-decoration:none;">Recevoir un nouveau lien</a>
</div></body></html>`;
}
