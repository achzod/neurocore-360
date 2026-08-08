import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../server/automaticReports.ts", import.meta.url),
  "utf8",
);

const statsSectionStart = source.indexOf("function generateStatsHTML");
const statsSectionEnd = source.indexOf(
  "/**\n * Section Livraisons programmées",
  statsSectionStart,
);

assert.notEqual(statsSectionStart, -1, "La section Statistiques doit exister");
assert.notEqual(statsSectionEnd, -1, "La fin de la section Statistiques doit exister");

const statsSection = source.slice(statsSectionStart, statsSectionEnd);

assert.doesNotMatch(
  statsSection,
  /display:\s*(?:flex|grid)/,
  "La section Statistiques ne doit pas dépendre de flex ou grid dans un email",
);
assert.ok(
  (statsSection.match(/<table role="presentation"/g) ?? []).length >= 3,
  "Les métriques, statuts et types doivent utiliser des tableaux de présentation",
);
assert.ok(
  (statsSection.match(/<td width="72" align="right"/g) ?? []).length >= 2,
  "Les compteurs de statut et de type doivent rester dans une cellule séparée et alignée à droite",
);
assert.match(
  statsSection,
  /padding: 0 0 4px 12px; white-space: nowrap;/,
  "La cellule des compteurs doit conserver un espacement explicite compatible email",
);
assert.doesNotMatch(
  statsSection,
  /\$\{status\}<\/span>\s*<span[^>]*>\$\{count\}/s,
  "Un statut et son compteur ne doivent jamais redevenir deux spans adjacents",
);
assert.doesNotMatch(
  statsSection,
  /\$\{type\}<\/span>\s*<span[^>]*>\$\{count\}/s,
  "Un type et son compteur ne doivent jamais redevenir deux spans adjacents",
);

console.log("Automatic report email layout: OK");
