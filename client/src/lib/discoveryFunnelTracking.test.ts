import assert from "node:assert/strict";
import { test } from "node:test";
import { isDiscoveryQuestionnaireHref, trackDiscoveryFunnelStep } from "./analytics";

const origin = "https://apexlabs.achzodcoaching.com";

test("tracks free questionnaire entries from every supported route", () => {
  assert.equal(isDiscoveryQuestionnaireHref("/questionnaire", origin), false);
  assert.equal(isDiscoveryQuestionnaireHref("/questionnaire?plan=gratuit", origin), true);
  assert.equal(isDiscoveryQuestionnaireHref("/audit-complet/questionnaire?plan=gratuit", origin), true);
  assert.equal(isDiscoveryQuestionnaireHref("/questionnaire?plan=anabolic", origin), false);
  assert.equal(isDiscoveryQuestionnaireHref("/offers/discovery-scan", origin), false);
  assert.equal(isDiscoveryQuestionnaireHref("https://example.com/questionnaire", origin), false);
});

test("funnel tracking sends no personal data and cannot break navigation", () => {
  const previousWindow = (globalThis as any).window;
  const events: unknown[][] = [];
  try {
    (globalThis as any).window = {
      localStorage: { getItem: () => "all" },
      location: { pathname: "/questionnaire" },
      gtag: (...args: unknown[]) => events.push(args),
    };
    trackDiscoveryFunnelStep("discovery_email_submitted");
    assert.deepEqual(events, [["event", "discovery_email_submitted", {
      funnel_name: "discovery_scan",
      page_path: "/questionnaire",
    }]]);

    (globalThis as any).window.localStorage.getItem = () => "essential";
    trackDiscoveryFunnelStep("discovery_checkout_reached");
    assert.equal(events.length, 1);

    (globalThis as any).window.localStorage.getItem = () => { throw new Error("storage blocked"); };
    assert.doesNotThrow(() => trackDiscoveryFunnelStep("discovery_checkout_reached"));
    assert.equal(events.length, 1);
  } finally {
    if (previousWindow === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = previousWindow;
  }
});
