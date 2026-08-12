import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assertDiscoveryPremiumKnowledgeContext,
  sanitizeDiscoveryKnowledgeContext,
} from "./discoveryKnowledgePolicy";

test("canonical English scientific evidence is preserved while source attribution is removed", () => {
  const raw = `Huberman Lab\nThe circadian system coordinates sleep timing with cortisol and melatonin.\nThis evidence explains how light exposure changes the phase response curve and sleep pressure.\nThe mechanism is directly relevant to recovery, glucose regulation and endocrine health.`;
  const sanitized = sanitizeDiscoveryKnowledgeContext(raw);

  assert.match(sanitized, /The circadian system coordinates sleep timing/);
  assert.match(sanitized, /light exposure changes the phase response curve/);
  assert.doesNotMatch(sanitized, /Huberman/i);
});

test("premium knowledge validation fails closed for empty or undersized context", () => {
  assert.throws(
    () => assertDiscoveryPremiumKnowledgeContext("", "synthesis"),
    /0\/200 characters.*fail-closed.*forbidden/i,
  );
  assert.throws(
    () => assertDiscoveryPremiumKnowledgeContext("short evidence", "section sleep"),
    /Knowledge context unavailable for section sleep/i,
  );
});

test("premium knowledge validation accepts a canonical context above the threshold", () => {
  const context = "Scientific mechanism and clinically relevant detail. ".repeat(8);
  assert.equal(assertDiscoveryPremiumKnowledgeContext(context, "synthesis"), context.trim());
});

test("Discovery generation has no degraded path and preflights every section context", () => {
  const source = readFileSync(new URL("./discovery-scan.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /Generation en mode degrade/);
  assert.match(source, /assertDiscoveryPremiumKnowledgeContext\(knowledgeContext, "synthesis"\)/);
  assert.match(source, /const knowledgeContexts = await Promise\.all/);
  assert.match(source, /assertDiscoveryPremiumKnowledgeContext\(context, `section \$\{domain\}`\)/);
});
