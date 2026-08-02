import assert from "node:assert/strict";

process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";

void (async () => {
  const {
    parsePeptauraProductSnapshot,
    refreshPeptauraCatalog,
    getPeptauraCatalogHealth,
    validateVialsMath,
    fetchEnclomipheneSourceSnapshot,
    ENCLOMIPHENE_SOURCE_URL,
  } = await import("../server/peptidesEngine");

  const enclomipheneSource = await fetchEnclomipheneSourceSnapshot(true);
  assert.equal(enclomipheneSource?.url, ENCLOMIPHENE_SOURCE_URL);
  assert.equal(enclomipheneSource?.available, true);
  assert.match(enclomipheneSource?.format || "", /30 ml a 12,5 mg\/ml/i);
  assert.equal(Number(enclomipheneSource?.priceGbp) > 0, true);

  const html = await fetch("https://www.peptaura.com/catalog/Retatrutide", {
    headers: { "cache-control": "no-cache" },
  }).then((response) => response.text());
  const snapshot = parsePeptauraProductSnapshot("Retatrutide", html);
  assert.equal(snapshot.live, true);
  assert.ok(snapshot.listings.length > 0);
  assert.ok(snapshot.listings.some((listing) => listing.marginRate > 0));
  assert.ok(snapshot.listings.every((listing) => listing.boxSize >= 1));

  const peptide = {
    name: "Retatrutide",
    purpose: "Test",
    dosage: "Semaine 1 a 1 mg, semaine 2 a 2 mg, semaine 3 a 4 mg, semaines 4 a 12 a 8 mg, une fois par semaine",
    timing: "Jour fixe",
    route: "SC",
    cycleDuration: "12 semaines",
    purchaseUrl: "https://www.peptaura.com/catalog/Retatrutide",
    priceEstimate: "$20/vial x 2 vials",
    reconstitution: "Vial 10mg avec 2ml",
    vialsNeeded: "2 vials de 10mg",
  };
  const fixed = validateVialsMath({
    clientName: "Luca",
    tier: "solo",
    sections: [],
    peptides: [peptide],
    bloodMarkers: [],
    weeklySchedule: "",
    shoppingList: "",
    promoCodesGenerated: [],
  });
  assert.match(fixed.peptides[0].vialsNeeded || "", /^8 vials de 10mg/);

  const refresh = await refreshPeptauraCatalog({ forceFresh: true });
  assert.equal(refresh.ok, true, refresh.failedProducts.join(", "));
  assert.deepEqual(refresh.failedProducts, [], `Produits non rafraichis: ${refresh.failedProducts.join(", ")}`);
  assert.equal(refresh.refreshedProducts, refresh.sitemapProducts);
  assert.equal(refresh.refreshedProducts >= Math.ceil(refresh.sitemapProducts * 0.95), true);
  assert.equal(getPeptauraCatalogHealth().snapshotCount >= 70, true);

  console.log("Peptaura live crawl: OK");
})();
