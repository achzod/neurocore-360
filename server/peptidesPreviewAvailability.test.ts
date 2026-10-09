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

test("preview reuses a bounded last-known-good catalog when the product feed has a short outage", async () => {
  const now = Date.now();
  const originalFetch = globalThis.fetch;
  let feedAvailable = true;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("product-feed")) {
      if (!feedAvailable) throw new Error("temporary feed outage");
      return new Response(productFeed(now), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("shipping outage", { status: 503 });
  }) as typeof fetch;
  try {
    const live = await getLivePeptauraPreviewCatalog("XY", now);
    assert.equal(live.degraded, undefined);
    feedAvailable = false;
    const fallback = await getLivePeptauraPreviewCatalog("XY", now + 16 * 60_000);
    assert.equal(fallback.degraded, "stale_catalog");
    assert.equal(fallback.checkedAt, live.checkedAt);
    assert.deepEqual(fallback.snapshots, live.snapshots);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("preview fails closed when the last valid catalog is older than the fallback window", async () => {
  const now = Date.now();
  const originalFetch = globalThis.fetch;
  let feedAvailable = true;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("product-feed")) {
      if (!feedAvailable) throw new Error("long feed outage");
      return new Response(productFeed(now), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("shipping outage", { status: 503 });
  }) as typeof fetch;
  try {
    await getLivePeptauraPreviewCatalog("XZ", now);
    feedAvailable = false;
    await assert.rejects(
      getLivePeptauraPreviewCatalog("XZ", now + 6 * 60 * 60_000 + 1),
      /long feed outage/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("preview route only passes shipping quotes when live quotes exist", () => {
  const source = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  assert.match(source, /liveCatalog\.shippingQuotes\.length \? liveCatalog\.shippingQuotes : undefined/);
});

test("preview route distinguishes catalog, persistence and analysis failures", () => {
  const source = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
  assert.match(source, /phase === "catalog"/);
  assert.match(source, /error: "catalog_unavailable"/);
  assert.match(source, /phase === "persistence"/);
  assert.match(source, /error: "preview_save_unavailable"/);
  assert.match(source, /error: "preview_analysis_unavailable"/);
  assert.match(source, /delivery queue kick failed/);
});

test("Peptides Engine FAQ answers are present in server-rendered page content", () => {
  const source = fs.readFileSync(new URL("./static.ts", import.meta.url), "utf8");
  const faqSource = fs.readFileSync(new URL("../shared/peptidesOfferFaq.ts", import.meta.url), "utf8");
  const clientSource = fs.readFileSync(new URL("../client/src/pages/offers/PeptidesEngineOffer.tsx", import.meta.url), "utf8");
  assert.match(source, /FAQ Peptides Engine/);
  assert.match(source, /PEPTIDES_OFFER_FAQ/);
  assert.match(source, /peptidesOfferFaqs\.map/);
  assert.match(clientSource, /PEPTIDES_OFFER_FAQ/);
  assert.match(faqSource, /Coached inclut 1 bilan au choix/);
  assert.match(faqSource, /Quel est le delai de livraison/);
});

test("Peptides mobile UI exposes first-screen progress and responsive floating-widget safeguards", () => {
  const engineSource = fs.readFileSync(new URL("../client/src/pages/PeptidesEnginePage.tsx", import.meta.url), "utf8");
  const cookieSource = fs.readFileSync(new URL("../client/src/components/CookieConsent.tsx", import.meta.url), "utf8");
  const whatsappSource = fs.readFileSync(new URL("../client/src/components/WhatsAppConversionHub.tsx", import.meta.url), "utf8");
  assert.match(engineSource, /data-testid="peptides-engine-progress"/);
  assert.match(engineSource, /Math\.round\(\(\(sectionIndex \+ 1\) \/ totalSections\) \* 100\)/);
  assert.match(cookieSource, /safe-area-inset-bottom/);
  assert.match(cookieSource, /w-full flex-wrap/);
  assert.match(whatsappSource, /100dvh/);
  assert.match(whatsappSource, /"\/peptides-preview"/);
  assert.match(whatsappSource, /"\/peptides-engine"/);
});
