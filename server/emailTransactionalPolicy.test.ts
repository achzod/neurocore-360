import assert from "node:assert/strict";
import test from "node:test";
import {
  isCriticalTransactionalEmail,
  shouldBlockForMarketingUnsubscribe,
} from "./emailDeliveryPolicy";

test("magic links are transactional and bypass marketing unsubscribe gating", () => {
  assert.equal(isCriticalTransactionalEmail("sendMagicLinkEmail", "Accès à ton espace ApexLabs"), true);
  assert.equal(shouldBlockForMarketingUnsubscribe(true, "sendMagicLinkEmail", "Accès à ton espace ApexLabs"), false);
});

test("paid access and paid report messages remain transactional", () => {
  assert.equal(isCriticalTransactionalEmail("sendPeptidesOrderConfirmation", "Commande confirmée"), true);
  assert.equal(isCriticalTransactionalEmail("sendReportReadyEmail", "Ton rapport est prêt"), true);
  assert.equal(isCriticalTransactionalEmail("sendCTAEmail", "Ton protocole peptides est prêt"), true);
});

test("marketing messages remain subject to unsubscribe gating", () => {
  assert.equal(isCriticalTransactionalEmail("sendDiscoveryJ30NurtureEmail", "Découvre la suite"), false);
  assert.equal(isCriticalTransactionalEmail("sendCTAEmail", "Une offre pour toi"), false);
  assert.equal(shouldBlockForMarketingUnsubscribe(true, "sendDiscoveryJ30NurtureEmail", "Découvre la suite"), true);
});
