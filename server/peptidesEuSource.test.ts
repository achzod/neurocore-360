import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPeptidesEuProductUrl,
  buildPeptidesEuSourceOption,
  describePeptidesEuPrice,
  getPeptidesEuStoreUrl,
  matchPeptidesEuSlug,
  PEPTIDES_EU_OPTION_TEXT,
} from "./peptidesEuSource";

test("le lien produit reprend le parametre affilie", () => {
  delete process.env.PEPTIDES_EU_AFFILIATE_URL;
  assert.equal(buildPeptidesEuProductUrl("glp-3-rt"), "https://www.peptides-eu.net/products/glp-3-rt?aff=AFF-F6AKX33F");
  assert.equal(getPeptidesEuStoreUrl(), "https://www.peptides-eu.net/?aff=AFF-F6AKX33F");
});

test("fallback vers /store si le lien affilie est invalide", () => {
  process.env.PEPTIDES_EU_AFFILIATE_URL = "pas-une-url";
  try {
    assert.equal(getPeptidesEuStoreUrl(), "https://peptides-eu.net/store");
    assert.equal(buildPeptidesEuProductUrl("bpc-157"), "https://peptides-eu.net/products/bpc-157");
  } finally {
    delete process.env.PEPTIDES_EU_AFFILIATE_URL;
  }
});

test("correspondance des noms du rapport", () => {
  assert.equal(matchPeptidesEuSlug("Retatrutide"), "glp-3-rt");
  assert.equal(matchPeptidesEuSlug("Tirzepatide"), "glp-2-trz");
  assert.equal(matchPeptidesEuSlug("Semaglutide"), "glp-1-sm");
  assert.equal(matchPeptidesEuSlug("Cagrilintide + Semaglutide Blend"), "cagrilintide-semaglutide-blend");
  assert.equal(matchPeptidesEuSlug("CJC-1295 (no DAC)"), "cjc-1295-no-dac");
  assert.equal(matchPeptidesEuSlug("CJC-1295 sans DAC"), "cjc-1295-no-dac");
  assert.equal(matchPeptidesEuSlug("CJC-1295 (with DAC)"), "cjc-1295-dac");
  assert.equal(matchPeptidesEuSlug("CJC-1295 + Ipamorelin Blend"), "cjc-ipamorelin-blend");
  assert.equal(matchPeptidesEuSlug("Ipamorelin"), "ipamorelin");
  assert.equal(matchPeptidesEuSlug("KissPeptin-10"), "kisspeptin-10");
  assert.equal(matchPeptidesEuSlug("Tésamoréline"), "tesamorelin");
  assert.equal(matchPeptidesEuSlug("NAD+"), "nad");
  assert.equal(matchPeptidesEuSlug("MOTS-c"), "mots-c");
  assert.equal(matchPeptidesEuSlug("PEG-MGF"), "peg-mgf");
  assert.equal(matchPeptidesEuSlug("BPC-157 + TB-500 Blend", 20), "bpc-tb-blend-20");
  assert.equal(matchPeptidesEuSlug("Enclomiphene Citrate"), null);
  assert.equal(matchPeptidesEuSlug("HGH Fragment 176-191"), null);
});

test("prix : format identique sinon liste des formats", () => {
  assert.equal(describePeptidesEuPrice("glp-3-rt", 10), "Format 10 mg : 68,99 € le flacon");
  assert.equal(describePeptidesEuPrice("aod-9604", 3), "Formats : 2 mg 36 €, 5 mg 68,99 € (prix au flacon)");
  assert.equal(describePeptidesEuPrice("melanotan-2", 10), null);
});

test("option 2 : peptides actifs avec lien uniquement", () => {
  const option = buildPeptidesEuSourceOption([
    { name: "Retatrutide", purchaseUrl: "https://www.peptaura.com/catalog/Retatrutide", _vialPlanning: { vialSizeMg: 20 } },
    { name: "Ipamorelin", purchaseUrl: "https://www.peptaura.com/catalog/Ipamorelin", activationStatus: "conditional-inactive" },
    { name: "BPC-157", purchaseUrl: "" },
    { name: "Enclomiphene Citrate", purchaseUrl: "https://receptorchem.co.uk/enclomiphene-citrate/" },
  ]);
  assert.deepEqual(option.peptides, [
    { name: "Retatrutide", url: "https://www.peptides-eu.net/products/glp-3-rt?aff=AFF-F6AKX33F", priceLine: "Format 20 mg : 117,99 € le flacon" },
  ]);
});

test("texte client : pas de tiret long, pas de mention interdite", () => {
  const all = Object.values(PEPTIDES_EU_OPTION_TEXT).join(" ");
  assert.doesNotMatch(all, /—|–|\bIA\b|in vitro/i);
});
