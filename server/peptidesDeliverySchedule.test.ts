import assert from "node:assert/strict";
import test from "node:test";
import {
  decidePeptidesDeliverySchedule,
  PEPTIDES_GENERATION_SCHEDULE_ANCHOR,
  PEPTIDES_PROVISIONAL_SCHEDULE_ANCHOR,
} from "./peptidesDeliverySchedule";

test("uses paidAt +24h only as a provisional estimate before generation", () => {
  const decision = decidePeptidesDeliverySchedule({
    paidAt: "2026-09-04T13:04:12.000Z",
    metadata: {},
  });
  assert.equal(decision.scheduledAt.toISOString(), "2026-09-05T13:04:12.000Z");
  assert.equal(decision.anchor, PEPTIDES_PROVISIONAL_SCHEDULE_ANCHOR);
  assert.equal(decision.shouldPersist, true);
});

test("rewrites a legacy payment-based schedule to exactly +24h after successful generation", () => {
  const decision = decidePeptidesDeliverySchedule({
    paidAt: "2026-09-04T13:04:12.000Z",
    metadata: {
      peptidesReportId: "report-1",
      peptidesGenerationCompletedAt: "2026-09-04T15:12:30.000Z",
      peptidesEmailScheduledAt: "2026-09-04T17:12:18.998Z",
    },
  });
  assert.equal(decision.scheduledAt.toISOString(), "2026-09-05T15:12:30.000Z");
  assert.equal(decision.anchor, PEPTIDES_GENERATION_SCHEDULE_ANCHOR);
  assert.equal(decision.shouldPersist, true);
});

test("keeps an already persisted generation +24h schedule stable", () => {
  const decision = decidePeptidesDeliverySchedule({
    paidAt: "2026-09-04T13:04:12.000Z",
    metadata: {
      peptidesReportId: "report-1",
      peptidesGenerationCompletedAt: "2026-09-04T15:12:30.000Z",
      peptidesEmailScheduledAt: "2026-09-05T15:12:30.000Z",
      peptidesEmailScheduleAnchor: PEPTIDES_GENERATION_SCHEDULE_ANCHOR,
    },
  });
  assert.equal(decision.scheduledAt.toISOString(), "2026-09-05T15:12:30.000Z");
  assert.equal(decision.shouldPersist, false);
});
