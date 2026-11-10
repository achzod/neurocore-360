import assert from "node:assert/strict";
import test from "node:test";
import { deliveryPurchaseUrlForPeptide } from "./peptidesEngine";

test("KissPeptin-10 keeps the canonical catalog URL after live listing selection", () => {
  assert.equal(
    deliveryPurchaseUrlForPeptide(
      "KissPeptin-10",
      "KissPeptin-10",
      "https://www.peptaura.com/product/1292-kisspeptin-10-10mg-lumira",
    ),
    "https://www.peptaura.com/catalog/KissPeptin-10",
  );
});

test("other peptides retain the exact selected live listing URL", () => {
  const listing = "https://www.peptaura.com/product/1289-ipamorelin-5mg-lumira";
  assert.equal(
    deliveryPurchaseUrlForPeptide("Ipamorelin", "Ipamorelin", listing),
    listing,
  );
});

test("catalog fallback remains available when a listing URL is absent", () => {
  assert.equal(
    deliveryPurchaseUrlForPeptide("AOD-9604", "AOD-9604", null),
    "https://www.peptaura.com/catalog/AOD-9604",
  );
});
