import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyEmailForSuppression,
  evaluateEmailSuppression,
  isAccountLevelFailure,
  isRecipientLevelFailure,
  type SuppressionContext,
  type SuppressionHistoryRow,
} from "./emailSuppression";

const NOW = new Date("2026-12-01T10:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

const ctx = (partial: Partial<SuppressionContext> = {}): SuppressionContext => ({
  unsubscribed: false,
  recentAttempts: [],
  firstAcceptedAt: daysAgo(10),
  lastEngagementAt: daysAgo(2),
  ...partial,
});

const marketing = { emailType: "sendRecoveryCtaEmail", subject: "Une idée pour ton objectif", recipientEmail: "client@example.fr" };
const nurture = { emailType: "sendDiscoveryJ30NurtureEmail", subject: "La suite de ton Discovery", recipientEmail: "client@example.fr" };
const recovery = { emailType: "sendCheckoutRecoveryEmail", subject: "Ta commande Ultimate Scan n'est pas allée au bout", recipientEmail: "client@example.fr" };

const hardBounce: SuppressionHistoryRow = {
  sendpulseStatus: "failed",
  sendpulseError: JSON.stringify({ eventType: "hard_fail", smtpAnswerCode: 550, smtpAnswerData: "User unknown" }),
};
const softFail: SuppressionHistoryRow = {
  sendpulseStatus: "failed",
  sendpulseError: JSON.stringify({ eventType: "soft_fail", smtpAnswerCode: 452, smtpAnswerData: "Mailbox full" }),
};
const quotaFail: SuppressionHistoryRow = {
  sendpulseStatus: "failed",
  sendpulseError: JSON.stringify({ message: "Monthly quota exceeded" }),
  httpStatus: 422,
};
const accepted: SuppressionHistoryRow = { sendpulseStatus: "success" };

test("les transactionnels passent toujours, même hard bounce, plainte ou désinscription", () => {
  const worst = ctx({ unsubscribed: true, recentAttempts: [hardBounce, { sendpulseStatus: "failed", sendpulseError: '{"eventType":"spam"}' }] });
  for (const tx of [
    { emailType: "sendMagicLinkEmail", subject: "Accès à ton espace" },
    { emailType: "sendReportReadyEmail", subject: "Ton rapport est prêt" },
    { emailType: "sendPeptidesOrderConfirmation", subject: "Commande confirmée" },
    { emailType: "sendCTAEmail", subject: "Peptides Engine : commande reçue" },
  ]) {
    const decision = evaluateEmailSuppression({ ...tx, recipientEmail: "client@example.fr" }, worst, NOW);
    assert.equal(decision.suppressed, false, tx.emailType);
    assert.equal(decision.emailClass, "transactional");
  }
});

test("les mails admin ne sont jamais bloqués", () => {
  const decision = evaluateEmailSuppression(
    { emailType: "sendCTAEmail", subject: "Relances", recipientEmail: "achkou@gmail.com", adminEmails: ["achkou@gmail.com"] },
    ctx({ recentAttempts: [hardBounce] }),
    NOW,
  );
  assert.equal(decision.suppressed, false);
  assert.equal(decision.emailClass, "operational");
});

test("hard bounce, plainte et désinscription bloquent le marketing et les séquences", () => {
  assert.equal(evaluateEmailSuppression(marketing, ctx({ recentAttempts: [accepted, hardBounce] }), NOW).reason, "hard_bounce");
  assert.equal(
    evaluateEmailSuppression(recovery, ctx({ recentAttempts: [{ sendpulseStatus: "failed", sendpulseError: '{"eventType":"spam"}' }] }), NOW).reason,
    "complaint",
  );
  assert.equal(evaluateEmailSuppression(nurture, ctx({ unsubscribed: true }), NOW).reason, "unsubscribed");
  assert.equal(
    evaluateEmailSuppression(marketing, ctx({ recentAttempts: [{ sendpulseStatus: "failed", sendpulseError: '{"eventType":"hard_fail","smtpAnswerCode":555,"smtpAnswerData":"Unsubscribed"}' }] }), NOW).reason,
    "unsubscribed",
    "SMTP 555 SendPulse = désinscription, pas un bounce",
  );
  assert.equal(
    evaluateEmailSuppression(marketing, ctx({ recentAttempts: [{ sendpulseStatus: "failed", sendpulseError: '{"eventType":"bounce"}' }] }), NOW).reason,
    "hard_bounce",
  );
});

test("2 échecs destinataire consécutifs bloquent, 1 seul non", () => {
  assert.equal(evaluateEmailSuppression(marketing, ctx({ recentAttempts: [softFail, accepted] }), NOW).suppressed, false);
  assert.equal(
    evaluateEmailSuppression(marketing, ctx({ recentAttempts: [softFail, softFail, accepted] }), NOW).reason,
    "consecutive_provider_failures",
  );
  // Un succès entre les deux casse la série.
  assert.equal(evaluateEmailSuppression(marketing, ctx({ recentAttempts: [softFail, accepted, softFail] }), NOW).suppressed, false);
});

test("les pannes de compte (quota, auth, timeout) ne mettent jamais une adresse en suppression", () => {
  assert.equal(isAccountLevelFailure(quotaFail), true);
  assert.equal(isRecipientLevelFailure(quotaFail), false);
  const timeout: SuppressionHistoryRow = { sendpulseStatus: "failed", sendpulseError: "TimeoutError: The operation was aborted due to timeout" };
  const auth: SuppressionHistoryRow = { sendpulseStatus: "failed", sendpulseError: "Error: SendPulse auth failed" };
  assert.equal(
    evaluateEmailSuppression(marketing, ctx({ recentAttempts: [quotaFail, timeout, auth, quotaFail] }), NOW).suppressed,
    false,
  );
});

test("les blocages internes et lignes en attente ne comptent pas comme échecs", () => {
  const blocked: SuppressionHistoryRow = { sendpulseStatus: "suppressed", sendpulseError: "suppressed: cold_90_days" };
  assert.equal(
    evaluateEmailSuppression(marketing, ctx({ recentAttempts: [blocked, softFail, accepted] }), NOW).suppressed,
    false,
  );
});

test("nurture : bloqué après 90 jours sans ouverture ni clic, le reste non", () => {
  const cold = ctx({ firstAcceptedAt: daysAgo(120), lastEngagementAt: daysAgo(100) });
  assert.equal(evaluateEmailSuppression(nurture, cold, NOW).reason, "cold_90_days");
  const neverEngaged = ctx({ firstAcceptedAt: daysAgo(95), lastEngagementAt: null });
  assert.equal(evaluateEmailSuppression(nurture, neverEngaged, NOW).reason, "cold_90_days");
  // Contact récent sans ouverture : pas encore 90 jours de recul.
  const fresh = ctx({ firstAcceptedAt: daysAgo(20), lastEngagementAt: null });
  assert.equal(evaluateEmailSuppression(nurture, fresh, NOW).suppressed, false);
  // Ouverture récente : on continue.
  const warm = ctx({ firstAcceptedAt: daysAgo(200), lastEngagementAt: daysAgo(30) });
  assert.equal(evaluateEmailSuppression(nurture, warm, NOW).suppressed, false);
  // La règle « froid » ne s'applique pas aux relances de paiement ni au marketing hors nurture.
  assert.equal(evaluateEmailSuppression(recovery, cold, NOW).suppressed, false);
});

test("classification des séquences nurture", () => {
  for (const emailType of [
    "sendDiscoveryJ14CoachingEmail",
    "sendDiscoveryJ30NurtureEmail",
    "sendReactivationCampaignEmail",
    "sendGratuitUpsellEmail",
    "sendCrossSellUpgradeEmail",
  ]) {
    assert.equal(classifyEmailForSuppression({ emailType, subject: "x", recipientEmail: "a@b.fr" }), "nurture", emailType);
  }
  assert.equal(classifyEmailForSuppression({ emailType: "sendCheckoutRecoveryEmail", subject: "x", recipientEmail: "a@b.fr" }), "marketing");
});
