/**
 * FormCheck V2 : routes HTTP (checkout, accès, upload, statut, PDF) et worker.
 */
import type { Express, NextFunction, Request, Response } from "express";
import multer from "multer";
import { mkdirSync } from "node:fs";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type Stripe from "stripe";
import { verifyFormcheckAccessToken, getAuthPayload } from "../auth";
import { createRateLimiter } from "../middleware/rateLimit";
import { createCheckoutSessionWithPaymentMethodFallback } from "../stripeCheckoutPaymentMethods";
import { isStripeCheckoutPaid } from "../stripePurchaseTracking";
import {
  buildFormcheckLineItem,
  FORMCHECK_MAX_BYTES,
  FORMCHECK_PACKS,
  FORMCHECK_PLAN_TYPE,
  isFormcheckWorkerEnabled,
  resolveFormcheckPack,
  validateUploadedFileMeta,
  validateVideoDuration,
} from "./config";
import { buildAccessEmail } from "./emails";
import { formcheckLinks } from "./links";
import * as store from "./store";
import { extractFrames, probeVideo } from "./video";
import { createProductionDeps, runFormcheckQueueOnce } from "./worker";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function getFormcheckBaseUrl(): string {
  const raw = process.env.PUBLIC_BASE_URL || process.env.APP_URL || process.env.RENDER_EXTERNAL_URL
    || (process.env.NODE_ENV === "production" ? "https://apexlabs.achzodcoaching.com" : `http://localhost:${process.env.PORT || 5000}`);
  return raw.replace(/\/+$/, "");
}

async function stripeClient(): Promise<Stripe> {
  const { getUncachableStripeClient } = await import("../stripeClient");
  return getUncachableStripeClient();
}

async function sendMail(input: Parameters<typeof import("../emailService").sendFormcheckTransactionalEmail>[0]) {
  const { sendFormcheckTransactionalEmail } = await import("../emailService");
  return sendFormcheckTransactionalEmail(input);
}

async function notifyAdmin(subject: string, details: string) {
  const { sendOperationalAlertEmail } = await import("../emailService");
  await sendOperationalAlertEmail(subject, details).catch(() => false);
}

// ---------------------------------------------------------------------------
// Paiement -> crédits (appelé par le webhook Stripe et par la page de retour)
// ---------------------------------------------------------------------------

export function isFormcheckCheckoutSession(session: { metadata?: Record<string, string> | null } | null | undefined): boolean {
  return session?.metadata?.planType === FORMCHECK_PLAN_TYPE;
}

export async function fulfillFormcheckCheckoutSession(session: Stripe.Checkout.Session): Promise<{ granted: boolean; email: string } | null> {
  if (!isFormcheckCheckoutSession(session as any) || !isStripeCheckoutPaid(session)) return null;
  const pack = resolveFormcheckPack(session.metadata?.formcheckPack);
  const email = store.normalizeEmail(session.metadata?.email || session.customer_details?.email || session.customer_email || "");
  if (!pack || !email) {
    await notifyAdmin("FormCheck paiement sans pack ou email", `Session ${session.id}`);
    throw new Error(`FORMCHECK_SESSION_INVALID:${session.id}`);
  }
  const amount = Number(session.amount_total ?? 0);
  const currency = String(session.currency || "eur").toLowerCase();
  if (amount !== pack.amountCents || currency !== "eur") {
    // Le montant est fixé côté serveur : un écart signale un prix STRIPE_PRICE_FORMCHECK_* mal configuré.
    // Le client a payé, on attribue ses crédits et on prévient l'admin.
    await notifyAdmin("FormCheck écart de montant", `Session ${session.id} : ${amount} ${currency}, attendu ${pack.amountCents} eur (pack ${pack.id}).`);
  }
  const { granted } = await store.grantFormcheckCredits({
    stripeSessionId: session.id,
    paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
    email,
    packId: pack.id,
    credits: pack.credits,
    amountCents: amount || pack.amountCents,
    currency,
  });
  if (granted) {
    const balance = await store.getFormcheckBalance(email);
    const links = formcheckLinks(getFormcheckBaseUrl(), email);
    const mail = buildAccessEmail({ uploadUrl: links.uploadUrl, credits: pack.credits, available: balance.available });
    const sent = await sendMail({ to: email, ...mail, emailType: "sendFormcheckAccessEmail", metadata: { stripeSessionId: session.id, pack: pack.id } });
    if (!sent) await notifyAdmin("FormCheck email d'accès non envoyé", `Client ${email}, session ${session.id}. Les crédits sont bien attribués.`);
    console.log(`[FormCheck] +${pack.credits} crédit(s) pour ${email} (session ${session.id})`);
  }
  return { granted, email };
}

// ---------------------------------------------------------------------------
// Authentification par lien signé (ou session APEXLABS existante)
// ---------------------------------------------------------------------------

function readAccessEmail(req: Request): string | null {
  const header = String(req.headers["x-formcheck-token"] || "").trim();
  const query = typeof req.query.token === "string" ? req.query.token.trim() : "";
  const token = header || query;
  if (token) return verifyFormcheckAccessToken(token);
  const session = getAuthPayload(req);
  return session?.email ? store.normalizeEmail(session.email) : null;
}

function requireAccess(req: Request, res: Response, next: NextFunction) {
  const email = readAccessEmail(req);
  if (!email) {
    res.status(401).json({ error: "FORMCHECK_ACCESS_REQUIRED", message: "Lien d'accès invalide ou expiré. Demande un nouveau lien avec ton email." });
    return;
  }
  (req as any).formcheckEmail = email;
  next();
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

let workerTimer: NodeJS.Timeout | null = null;
const deps = createProductionDeps(getFormcheckBaseUrl);

export function kickFormcheckWorker() {
  if (!isFormcheckWorkerEnabled()) return;
  setImmediate(() => {
    runFormcheckQueueOnce(deps).catch((error) => console.error("[FormCheck] worker error:", error));
  });
}

export function startFormcheckWorker(intervalMs = 30_000) {
  if (workerTimer || !isFormcheckWorkerEnabled() || !process.env.DATABASE_URL) return;
  store.ensureFormcheckTables()
    .then(() => {
      workerTimer = setInterval(kickFormcheckWorker, intervalMs);
      workerTimer.unref?.();
      kickFormcheckWorker();
      console.log(`[FormCheck] worker démarré (toutes les ${Math.round(intervalMs / 1000)} s)`);
    })
    .catch((error) => console.error("[FormCheck] tables non créées, worker inactif:", error));
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export function registerFormcheckRoutes(app: Express) {
  const uploadDir = path.join(os.tmpdir(), "formcheck-uploads");
  mkdirSync(uploadDir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({ destination: uploadDir }),
    limits: { fileSize: FORMCHECK_MAX_BYTES, files: 1 },
  });
  const checkoutLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 20 });
  const accessLimiter = createRateLimiter({ windowMs: 60 * 60_000, max: 5 });
  const uploadLimiter = createRateLimiter({ windowMs: 60 * 60_000, max: 20 });

  app.get("/api/formcheck/packs", (_req, res) => {
    res.json({
      packs: Object.values(FORMCHECK_PACKS).map(({ id, credits, amountCents, label, priceLabel }) => ({ id, credits, amountCents, label, priceLabel })),
    });
  });

  app.post("/api/formcheck/checkout", checkoutLimiter, async (req, res) => {
    try {
      const pack = resolveFormcheckPack(req.body?.pack);
      const email = store.normalizeEmail(req.body?.email || "");
      if (!pack) return res.status(400).json({ error: "INVALID_PACK", message: "Choisis un pack." });
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "INVALID_EMAIL", message: "Indique une adresse email valide : c'est là que tu recevras ton lien et tes rapports." });
      const base = getFormcheckBaseUrl();
      const metadata = { planType: FORMCHECK_PLAN_TYPE, formcheckPack: pack.id, email };
      const session = await createCheckoutSessionWithPaymentMethodFallback(
        await stripeClient(),
        {
          mode: "payment",
          line_items: [buildFormcheckLineItem(pack)],
          customer_email: email,
          success_url: `${base}/formcheck/upload?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${base}/offers/formcheck?cancelled=true#packs`,
          metadata,
          payment_intent_data: { metadata },
          locale: "fr",
        },
        `FORMCHECK:${email}`,
        "standard",
      );
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("[FormCheck] checkout error:", error?.message || error);
      res.status(500).json({ error: "CHECKOUT_FAILED", message: "Le paiement n'a pas pu démarrer. Réessaie dans un instant." });
    }
  });

  // Page de retour Stripe : confirme le paiement (sans attendre le webhook) et donne le lien d'accès.
  app.get("/api/formcheck/session/:sessionId", async (req, res) => {
    try {
      const sessionId = String(req.params.sessionId || "");
      if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)) return res.status(400).json({ error: "INVALID_SESSION" });
      const session = await (await stripeClient()).checkout.sessions.retrieve(sessionId);
      if (!isFormcheckCheckoutSession(session as any)) return res.status(404).json({ error: "NOT_FORMCHECK" });
      if (!isStripeCheckoutPaid(session)) return res.status(202).json({ status: "pending", message: "Paiement en cours de confirmation." });
      const fulfilled = await fulfillFormcheckCheckoutSession(session);
      const email = fulfilled?.email || "";
      const balance = await store.getFormcheckBalance(email);
      res.json({ status: "paid", email, token: formcheckLinks(getFormcheckBaseUrl(), email).token, balance });
    } catch (error: any) {
      console.error("[FormCheck] session check error:", error?.message || error);
      res.status(500).json({ error: "SESSION_CHECK_FAILED", message: "Impossible de vérifier le paiement pour le moment. Ton lien d'accès arrive aussi par email." });
    }
  });

  app.post("/api/formcheck/access-link", accessLimiter, async (req, res) => {
    const email = store.normalizeEmail(req.body?.email || "");
    const generic = { ok: true, message: "Si un achat FormCheck existe pour cette adresse, un nouveau lien vient d'être envoyé." };
    try {
      if (!EMAIL_RE.test(email) || !(await store.hasFormcheckPurchase(email))) return res.json(generic);
      const balance = await store.getFormcheckBalance(email);
      const links = formcheckLinks(getFormcheckBaseUrl(), email);
      const mail = buildAccessEmail({ uploadUrl: links.uploadUrl, credits: balance.total, available: balance.available });
      await sendMail({ to: email, ...mail, subject: "FormCheck : ton lien d'accès", emailType: "sendFormcheckAccessEmail", metadata: { resend: true } });
      res.json(generic);
    } catch (error) {
      console.error("[FormCheck] access link error:", error);
      res.json(generic);
    }
  });

  app.get("/api/formcheck/me", requireAccess, async (req, res) => {
    try {
      const email = (req as any).formcheckEmail as string;
      const [balance, analyses] = await Promise.all([store.getFormcheckBalance(email), store.listAnalysesForEmail(email)]);
      res.json({ email, balance, analyses });
    } catch (error) {
      console.error("[FormCheck] me error:", error);
      res.status(500).json({ error: "FORMCHECK_UNAVAILABLE" });
    }
  });

  app.post(
    "/api/formcheck/upload",
    uploadLimiter,
    requireAccess,
    // Vérifie les crédits AVANT de recevoir 200 Mo.
    async (req, res, next) => {
      try {
        const balance = await store.getFormcheckBalance((req as any).formcheckEmail);
        if (balance.available < 1) {
          return res.status(402).json({ error: "NO_CREDIT", message: "Tu n'as plus de crédit disponible. Choisis un pack pour envoyer une nouvelle vidéo." });
        }
        next();
      } catch (error) {
        next(error);
      }
    },
    (req, res, next) => {
      upload.single("video")(req, res, (error: any) => {
        if (error?.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "TOO_LARGE", message: "Vidéo trop lourde (200 Mo maximum). Filme en 1080p plutôt qu'en 4K." });
        }
        if (error) return res.status(400).json({ error: "UPLOAD_FAILED", message: "L'envoi a échoué. Vérifie ta connexion et réessaie." });
        next();
      });
    },
    async (req, res) => {
      const file = (req as any).file as { path: string; originalname: string; mimetype: string; size: number } | undefined;
      try {
        const email = (req as any).formcheckEmail as string;
        // Pas de choix d'exercice : le modèle l'identifie à partir des images (un éventuel champ « exercise » est ignoré).
        if (!file) return res.status(400).json({ error: "VIDEO_REQUIRED", message: "Ajoute ta vidéo." });

        const metaError = validateUploadedFileMeta({ originalName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size });
        if (metaError) return res.status(422).json({ error: metaError.code, message: metaError.message });

        const probe = await probeVideo(file.path);
        const durationError = probe.hasVideo ? validateVideoDuration(probe.durationS) : validateVideoDuration(null);
        if (durationError) return res.status(422).json({ error: durationError.code, message: durationError.message });

        const frames = await extractFrames(file.path, probe.durationS!);
        if (frames.length < 12) {
          return res.status(422).json({ error: "UNREADABLE", message: "Impossible d'extraire des images nettes de cette vidéo. Refilme ta série avec l'appareil photo de ton téléphone et renvoie-la." });
        }

        const analysisId = await store.reserveCreditAndEnqueue({
          email,
          durationS: probe.durationS!,
          videoMeta: { originalName: file.originalname.slice(0, 200), sizeBytes: file.size, mimeType: file.mimetype, width: probe.width, height: probe.height, frameCount: frames.length },
          frames,
        });
        if (!analysisId) return res.status(402).json({ error: "NO_CREDIT", message: "Tu n'as plus de crédit disponible." });

        kickFormcheckWorker();
        res.status(202).json({ analysisId, status: "queued", message: "Vidéo reçue. Ton rapport arrive par email dans quelques minutes." });
      } catch (error: any) {
        console.error("[FormCheck] upload error:", error?.message || error);
        if (String(error?.message || "").includes("FFMPEG_NOT_AVAILABLE")) {
          await notifyAdmin("FormCheck ffmpeg indisponible", "ffmpeg introuvable (FFMPEG_PATH, système, ffmpeg-static).");
        }
        res.status(500).json({ error: "UPLOAD_PROCESSING_FAILED", message: "On n'a pas pu traiter ta vidéo. Aucun crédit n'a été utilisé, réessaie dans quelques minutes." });
      } finally {
        // La vidéo n'est jamais conservée : seules les images extraites sont stockées.
        if (file?.path) await rm(file.path, { force: true }).catch(() => {});
      }
    },
  );

  app.get("/api/formcheck/analyses/:id", requireAccess, async (req, res) => {
    const row = await store.getAnalysisForEmail(String(req.params.id), (req as any).formcheckEmail).catch(() => null);
    if (!row) return res.status(404).json({ error: "NOT_FOUND" });
    const { pdf, ...rest } = row;
    res.json({ ...rest, hasPdf: Boolean(pdf && pdf.length) });
  });

  app.get("/api/formcheck/analyses/:id/pdf", requireAccess, async (req, res) => {
    const row = await store.getAnalysisForEmail(String(req.params.id), (req as any).formcheckEmail).catch(() => null);
    if (!row?.pdf || row.status !== "delivered") return res.status(404).json({ error: "PDF_NOT_READY" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="FormCheck_${String(row.id).slice(0, 8)}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(row.pdf);
  });

  startFormcheckWorker();
}
