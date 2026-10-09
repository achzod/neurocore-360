import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { getLivePeptauraPreviewCatalog } from "./peptidesPreview";

function productFeed(now: number) {
  return JSON.stringify({
    version: "openai-product-feed-v1",
    generated_at: new Date(now).toISOString(),
    merchant: { name: "Peptaura", base_url: "https://www.peptaura.com" },
    products: [{
      id: "product-bpc-157-5mg-lumira-box-10",
      item_group_id: "group-bpc-157",
      item_group_title: "BPC-157",
      enable_checkout: "true",
      enable_search: "true",
      description: "BPC-157 supplied as a box of 10 vials.",
      link: "https://www.peptaura.com/product/123-bpc-157",
      seller_name: "Lumira",
      size: "5mg",
      price: "10.00 USD",
      availability: "in_stock",
      shipping: ["ZZ:ALL:Standard:10.00 USD"],
    }],
  });
}

test("preview keeps live product prices when the shipping page is temporarily unavailable", async () => {
  const now = Date.now();
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("product-feed")) {
      return new Response(productFeed(now), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("shipping outage", { status: 503 });
  }) as typeof fetch;
  try {
    const catalog = await getLivePeptauraPreviewCatalog("ZZ", now);
    assert.equal(catalog.snapshots.length, 1);
    assert.equal(catalog.snapshots[0]?.slug, "BPC-157");
    assert.deepEqual(catalog.shippingQuotes, []);
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("preview route only passes shipping quotes when live quotes exist", () => {
  const source = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  assert.match(source, /liveCatalog\.shippingQuotes\.length \? liveCatalog\.shippingQuotes : undefined/);
});

test("Peptides Engine FAQ answers are present in server-rendered page content", () => {
  const source = fs.readFileSync(new URL("./static.ts", import.meta.url), "utf8");
  assert.match(source, /FAQ Peptides Engine/);
  assert.match(source, /Coached inclut un bilan au choix/);
  assert.match(source, /Est-ce un avis medical/);
});
