import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { INSTAGRAM_TRANSFORMATIONS, STUDENT_TRANSFORMATIONS } from "./studentTransformations";

const PUBLIC_DIR = path.resolve(process.cwd(), "client/public");
const ALLOWED_STUDENTS = [
  "Hafida G.",
  "Olivia B.",
  "Mehdi R.",
  "Karim W.",
  "Marwa G.",
  "Salim D.",
  "Guillaume P.",
  "Mohamed E.",
];
const FORBIDDEN_WORDS = /\bIA\b|moteur|généré|automatique|personnalis/i;
// Tirets longs, demi-cadratins et emojis interdits dans le texte affiché.
const FORBIDDEN_CHARS = /[\u2013\u2014\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

function allText(): string[] {
  return [
    ...STUDENT_TRANSFORMATIONS.flatMap((s) => [
      s.name,
      s.program ?? "",
      s.duration,
      s.headline,
      s.quote ?? "",
      s.imageAlt ?? "",
      ...s.stats.flatMap((st) => [st.label, st.value]),
    ]),
    ...INSTAGRAM_TRANSFORMATIONS.map((v) => v.alt),
  ];
}

test("seuls les élèves ayant donné leur accord apparaissent", () => {
  assert.deepEqual(
    STUDENT_TRANSFORMATIONS.map((s) => s.name).sort(),
    [...ALLOWED_STUDENTS].sort(),
  );
  const serialized = JSON.stringify({ STUDENT_TRANSFORMATIONS, INSTAGRAM_TRANSFORMATIONS }).toLowerCase();
  assert.ok(!serialized.includes("taha"));
  assert.ok(!serialized.includes("perrine"));
});

test("aucun mot ou caractère interdit dans les textes", () => {
  for (const text of allText()) {
    assert.ok(!FORBIDDEN_WORDS.test(text), `mot interdit dans : ${text}`);
    assert.ok(!FORBIDDEN_CHARS.test(text), `caractère interdit dans : ${text}`);
  }
});

test("chaque image existe, est en webp et pèse moins de 150 Ko", () => {
  const sources = [
    ...STUDENT_TRANSFORMATIONS.map((s) => s.image).filter((src): src is string => Boolean(src)),
    ...INSTAGRAM_TRANSFORMATIONS.map((v) => v.src),
  ];
  assert.ok(sources.length >= 20);
  for (const src of sources) {
    assert.ok(src.endsWith(".webp"), `${src} n'est pas en webp`);
    const file = path.join(PUBLIC_DIR, src);
    assert.ok(fs.existsSync(file), `${file} introuvable`);
    assert.ok(fs.statSync(file).size < 150 * 1024, `${src} dépasse 150 Ko`);
  }
});

test("chaque photo d'élève a un texte alternatif en français", () => {
  for (const s of STUDENT_TRANSFORMATIONS) {
    if (s.image) assert.ok(s.imageAlt && /avant/.test(s.imageAlt) && /après/.test(s.imageAlt), s.name);
  }
});
