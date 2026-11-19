import assert from "node:assert/strict";
import { test } from "node:test";
import { isDiscoveryQuestionnaireHref, trackDiscoveryFunnelStep, trackDiscoveryStartOnce } from "./analytics";

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

    // Consent Mode v2 (advanced): the event still reaches gtag when cookies are
    // refused; Google strips identifiers itself.
    (globalThis as any).window.localStorage.getItem = () => "essential";
    trackDiscoveryFunnelStep("discovery_checkout_reached");
    assert.equal(events.length, 2);
    assert.deepEqual(events[1], ["event", "discovery_checkout_reached", {
      funnel_name: "discovery_scan",
      page_path: "/questionnaire",
    }]);

    (globalThis as any).window.localStorage.getItem = () => { throw new Error("storage blocked"); };
    (globalThis as any).window.gtag = () => { throw new Error("gtag blocked"); };
    assert.doesNotThrow(() => trackDiscoveryFunnelStep("discovery_checkout_reached"));
    assert.equal(events.length, 2);
  } finally {
    if (previousWindow === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = previousWindow;
  }
});

test("discovery_start and discovery_complete are sent with the funnel name", () => {
  const previousWindow = (globalThis as any).window;
  const events: unknown[][] = [];
  const stored = new Map<string, string>();
  try {
    (globalThis as any).window = {
      localStorage: { getItem: () => null },
      sessionStorage: {
        getItem: (key: string) => stored.get(key) || null,
        setItem: (key: string, value: string) => stored.set(key, value),
      },
      location: { pathname: "/questionnaire" },
      gtag: (...args: unknown[]) => events.push(args),
    };
    assert.equal(trackDiscoveryStartOnce(), true);
    assert.equal(trackDiscoveryStartOnce(), false);
    trackDiscoveryFunnelStep("discovery_complete");
    assert.deepEqual(events.map((e) => e[1]), ["discovery_start", "discovery_complete"]);
    assert.deepEqual(events[0][2], { funnel_name: "discovery_scan", page_path: "/questionnaire" });
  } finally {
    if (previousWindow === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = previousWindow;
  }
});
