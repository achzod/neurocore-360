import assert from "node:assert/strict";
import test from "node:test";
import { extractMarkersFromLines, normalizeMarkerValue } from "./index";

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

test("Lp(a) ne subit jamais la fausse conversion 9,1 -> 352", () => {
  assert.equal(normalizeMarkerValue("lpa", 9.1), 9.1);
  assert.equal(normalizeMarkerValue("lpa", 9.1, "nmol/L"), 9.1);
  assert.equal(normalizeMarkerValue("lpa", 59.3, "mg/L"), 5.93);
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
