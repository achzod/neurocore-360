import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CoachingPromoBanner } from "./CoachingPromoBanner";
import { discoveryOfferWindowFrom } from "@shared/discoveryOfferRecommendation";

// Décision du 2026-11-18 : l'avis ne conditionne plus le code Discovery.
// Le bandeau montre DISCOVERY20 avec son dernier jour, dans la même fenêtre de
// 7 jours que le bloc d'offre unique, et disparaît une fois la fenêtre fermée.

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;
const GENERATED_AT = "2026-11-10T09:00:00.000Z";

test("Discovery banner shows the code with the same deadline as the offer block", () => {
  const offerWindow = discoveryOfferWindowFrom(GENERATED_AT)!;
  for (const auditType of ["GRATUIT", "DISCOVERY"] as const) {
    const html = renderToStaticMarkup(
      <CoachingPromoBanner
        auditType={auditType}
        generatedAt={GENERATED_AT}
        now={new Date("2026-11-12T12:00:00.000Z")}
        showFormules={false}
        dismissible={false}
      />,
    );
    assert.ok(html.includes("DISCOVERY20"), auditType);
    assert.ok(html.includes("Cliquer pour copier"), auditType);
    assert.ok(html.includes(`valable jusqu&#x27;au ${offerWindow.label}`), auditType);
    assert.equal(offerWindow.label, "17 novembre 2026");
    assert.equal(EMOJI.test(html), false, `${auditType}: emoji`);
    assert.equal(html.includes("coaching-essential"), false, auditType);
  }
});

test("Discovery banner disappears once the 7-day window is closed or unknown", () => {
  const closed = renderToStaticMarkup(
    <CoachingPromoBanner auditType="GRATUIT" generatedAt={GENERATED_AT} now={new Date("2026-11-18T12:00:00.000Z")} dismissible={false} />,
  );
  assert.equal(closed, "");
  const unknown = renderToStaticMarkup(<CoachingPromoBanner auditType="GRATUIT" dismissible={false} />);
  assert.equal(unknown, "");
});

test("paid reports keep their code, formulas and no deadline", () => {
  const paid = renderToStaticMarkup(<CoachingPromoBanner auditType="PREMIUM" />);
  assert.ok(paid.includes("BIOSCAN59"));
  assert.ok(paid.includes("Cliquer pour copier"));
  assert.ok(paid.includes("coaching-essential"));
  assert.equal(paid.includes("valable jusqu"), false);
  assert.equal(EMOJI.test(paid), false, "emoji");
});
