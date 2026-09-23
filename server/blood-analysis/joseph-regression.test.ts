import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { analyzeBloodwork, extractMarkersFromLines, normalizeMarkerValue } from "./index";

const josephExcerpt = `
Laboratoire de biologie médicale
Patient : MATHIEU Joseph
Résultats analyses
Valeurs de référence
Lipoprotéine (a)
9,1 nmol/L
59,3 mg/L
Insuline
3,9 µUI/mL
Hématies
5,02 T/L
Hémoglobine
15,4 g/dL
Hématocrite
45,8 %
VGM
91 fL
TCMH
30,7 pg
CCMH
33,6 g/dL
Leucocytes
6,4 G/L
Neutrophiles
3,2 G/L
Lymphocytes
2,3 G/L
Monocytes
0,55 G/L
Éosinophiles
0,21 G/L
Basophiles
0,05 G/L
Plaquettes
247 G/L
`;

test("Lp(a) sans unite massique echoue ferme au lieu de produire 352 mg/dL", () => {
  assert.equal(Number.isNaN(normalizeMarkerValue("lpa", 9.1)), true);
  assert.equal(Number.isNaN(normalizeMarkerValue("lpa", 9.1, "nmol/L")), true);
  assert.equal(normalizeMarkerValue("lpa", 59.3, "mg/L"), 5.93);
  assert.equal(normalizeMarkerValue("lpa", 5.93, "mg/dL"), 5.93);
});

test("l'extraction déterministe privilégie la Lp(a) massique et conserve insuline + NFS", () => {
  const markers = extractMarkersFromLines(josephExcerpt);
  const byId = new Map(markers.map((marker) => [marker.markerId, marker]));
  assert.deepEqual(byId.get("lpa"), { markerId: "lpa", value: 5.93, unit: "mg/dL" });
  assert.deepEqual(byId.get("insuline_jeun"), { markerId: "insuline_jeun", value: 3.9, unit: "µIU/mL" });

  const expectedNfs = [
    "globules_rouges", "hemoglobine", "hematocrite", "vgm", "tcmh", "ccmh",
    "globules_blancs", "neutrophiles", "lymphocytes", "monocytes", "eosinophiles",
    "basophiles", "plaquettes",
  ];
  for (const markerId of expectedNfs) {
    assert.ok(byId.has(markerId), `marqueur NFS absent: ${markerId}`);
  }
});

test("la formule leucocytaire retient les valeurs absolues et ignore les cibles ApoB", () => {
  const markers = extractMarkersFromLines(`
Polynucléaires neutrophiles 50.2 % 2.43 giga/L ( 1.40 - 7.70 )
Polynucléaires éosinophiles 2.3 % 0.11 giga/L ( 0.02 - 0.63 )
Polynucléaires basophiles 0.6 % 0.03 giga/L ( 0.00 - 0.11 )
Lymphocytes 37.2 % 1.80 giga/L ( 1.00 - 4.80 )
Monocytes 9.7 % 0.47 giga/L ( 0.18 - 1.00 )
Les objectifs finaux sont ApoB < 1.00 g/L selon le risque cardiovasculaire.
`);
  const byId = new Map(markers.map((marker) => [marker.markerId, marker.value]));
  assert.equal(byId.get("neutrophiles"), 2.43);
  assert.equal(byId.get("eosinophiles"), 0.11);
  assert.equal(byId.get("basophiles"), 0.03);
  assert.equal(byId.get("lymphocytes"), 1.8);
  assert.equal(byId.get("monocytes"), 0.47);
  assert.equal(byId.has("apob"), false);
});

test("les marqueurs NFS alimentent durablement la catégorie hématologique", () => {
  const bloodTestsRoutes = fs.readFileSync(
    new URL("../blood-tests/routes.ts", import.meta.url),
    "utf8",
  );
  const bloodAnalysisRoutes = fs.readFileSync(
    new URL("./routes.ts", import.meta.url),
    "utf8",
  );
  for (const markerId of ["hemoglobine", "hematocrite", "globules_rouges", "globules_blancs", "plaquettes"]) {
    const mapping = new RegExp(`${markerId}:\\s*["']hemato["']`);
    assert.match(bloodTestsRoutes, mapping, `catégorie NFS absente dans blood-tests: ${markerId}`);
    assert.match(bloodAnalysisRoutes, mapping, `catégorie NFS absente dans blood-analysis: ${markerId}`);
  }
});

test("une régénération calcule HOMA-IR à partir de la glycémie et de l'insuline persistées", async () => {
  const analysis = await analyzeBloodwork(
    [
      { markerId: "glycemie_jeun", value: 83, unit: "mg/dL" },
      { markerId: "insuline_jeun", value: 3.9, unit: "µIU/mL" },
    ],
    { gender: "homme" },
  );
  const homa = analysis.markers.find((marker) => marker.markerId === "homa_ir");
  assert.equal(homa?.value, 0.8);
  assert.equal(homa?.status, "optimal");
});

test("une régénération conserve les unités source eGFR, FSH et LH", async () => {
  const analysis = await analyzeBloodwork(
    [
      { markerId: "egfr", value: 75, unit: "mL/min/1.73m2" },
      { markerId: "fsh", value: 5.1, unit: "IU/L" },
      { markerId: "lh", value: 8.8, unit: "IU/L" },
    ],
    { gender: "homme" },
  );
  const units = Object.fromEntries(
    analysis.markers.map((marker) => [marker.markerId, marker.unit]),
  );
  assert.deepEqual(units, {
    egfr: "mL/min/1.73m2",
    fsh: "IU/L",
    lh: "IU/L",
  });
});
