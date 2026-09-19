import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveCampaignEngineChoiceDestination,
  serializePreviewResume,
} from "../client/src/lib/peptidesPreviewResume";

const campaignSearch = "?utm_source=sendpulse&utm_medium=email&utm_campaign=pre_peptides_launch_20260917_v14&utm_content=engine_choice";

test("a campaign Engine CTA never opens the full questionnaire without a signed Preview", () => {
  assert.equal(
    resolveCampaignEngineChoiceDestination(campaignSearch, null, Date.parse("2026-09-19T12:00:00Z")),
    "/peptides-preview?utm_source=sendpulse&utm_medium=email&utm_campaign=pre_peptides_launch_20260917_v14&utm_content=engine_choice",
  );
});

test("a recent same-browser Preview resumes its signed checkout handoff", () => {
  const now = Date.parse("2026-09-19T12:00:00Z");
  const stored = serializePreviewResume(
    "/peptides-engine?tier=solo&utm_source=peptides_preview#preview_token=signed.payload",
    now - 60_000,
  );
  assert.ok(stored);
  assert.equal(
    resolveCampaignEngineChoiceDestination(campaignSearch, stored, now),
    "/peptides-engine?tier=solo&utm_source=sendpulse&utm_medium=email&utm_campaign=pre_peptides_launch_20260917_v14&utm_content=engine_choice#preview_token=signed.payload",
  );
});

test("expired or malformed resume state falls back to Preview", () => {
  const now = Date.parse("2026-09-19T12:00:00Z");
  const expired = serializePreviewResume(
    "/peptides-engine#preview_token=signed.payload",
    now - 14 * 24 * 60 * 60 * 1000,
  );
  assert.equal(resolveCampaignEngineChoiceDestination(campaignSearch, expired, now)?.startsWith("/peptides-preview?"), true);
  assert.equal(resolveCampaignEngineChoiceDestination("?utm_source=organic", "bad-json", now), null);
});
