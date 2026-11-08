import assert from "node:assert/strict";
import test from "node:test";

import { canonicalizePeptauraCountry } from "./peptidesCountry";

test("canonicalise les variantes libres de La Réunion vers le libellé Peptaura", () => {
  for (const value of [
    "Île de la reunion",
    "Ile de la Réunion",
    "La Réunion",
    "Reunion",
    "Reunion Island",
  ]) {
    assert.equal(canonicalizePeptauraCountry(value), "Réunion");
  }
});

test("préserve les autres pays libres", () => {
  assert.equal(canonicalizePeptauraCountry("France"), "France");
  assert.equal(canonicalizePeptauraCountry("United Arab Emirates"), "United Arab Emirates");
});

test("applique uniquement l'alias Peptaura strict Hongrie vers Hungary", () => {
  assert.equal(canonicalizePeptauraCountry("Hongrie"), "Hungary");
  assert.equal(canonicalizePeptauraCountry("  HONGRIE  "), "Hungary");
  assert.equal(canonicalizePeptauraCountry("Hungary"), "Hungary");
  assert.equal(canonicalizePeptauraCountry("Hungría"), "Hungría");
  assert.equal(canonicalizePeptauraCountry("Hongrie (HU)"), "Hongrie (HU)");
});
