import test from "node:test";
import assert from "node:assert/strict";
import {
  STOPPED_DISCOVERY30_RELAUNCH_TYPES,
  isDiscovery30RelaunchStopped,
} from "./discoveryPromoRelaunchPolicy";

const stoppedTypes = [
  "sendRecoveryCtaEmail",
  "sendGratuitUpsellEmail",
  "sendGratuitJ5Email",
  "sendGratuitJ7Email",
  "sendDiscoveryJ14CoachingEmail",
  "sendDiscoveryJ30NurtureEmail",
];

test("all DISCOVERY30 CTA relaunches are stopped", () => {
  assert.deepEqual([...STOPPED_DISCOVERY30_RELAUNCH_TYPES], stoppedTypes);
  for (const emailType of stoppedTypes) {
    assert.equal(isDiscovery30RelaunchStopped(emailType), true, emailType);
  }
});

test("transactional and unrelated emails stay enabled", () => {
  assert.equal(isDiscovery30RelaunchStopped("sendReportReadyEmail"), false);
  assert.equal(isDiscovery30RelaunchStopped("sendPeptidesCycle2ReorderEmail"), false);
});
