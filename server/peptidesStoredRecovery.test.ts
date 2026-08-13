import assert from "node:assert/strict";
import test from "node:test";
import {
  STORED_PEPTIDES_RECOVERY_CONFIRMATION,
  parseStoredPeptidesResponse,
  persistStoredPeptidesRecoveryUnderHold,
  removeObsoleteMissingLiveFormatSentence,
  type RecoverySqlClient,
  type StoredPeptidesRecoveryCandidate,
} from "./peptidesStoredRecovery";

test("parseStoredPeptidesResponse repairs fenced JSON without provider generation", () => {
  const parsed = parseStoredPeptidesResponse('```json\n{"clientName":"Clement",}\n```');
  assert.equal(parsed.clientName, "Clement");
});

test("obsolete source-unavailable sentence is removed only after official pricing is verified", () => {
  const stale = "Nombre de vials non calculable tant que le format live manque, aucune commande autorisée.";
  const priced = {
    clientName: "Clement",
    peptides: [{
      name: "Ipamorelin",
      priceEstimate: "66.70 USD",
      purchaseUrl: "https://www.peptaura.com/product/204-ipamorelin-5mg-pepturion",
      dosage: "100 mcg",
      route: "SC",
    }],
    sections: [{ id: "shopping", title: "Commande", content: `Prix vérifié. ${stale}` }],
  } as any;
  assert.equal(
    removeObsoleteMissingLiveFormatSentence(structuredClone(priced)).sections[0].content,
    "Prix vérifié.",
  );

  const unpriced = structuredClone(priced);
  unpriced.peptides[0].priceEstimate = "indisponible";
  assert.match(
    removeObsoleteMissingLiveFormatSentence(unpriced).sections[0].content,
    /format live manque/,
  );
});

test("obsolete live-unavailable paragraphs are removed after all official prices are verified", () => {
  const priced = {
    clientName: "Clement",
    peptides: [{
      name: "Ipamorelin",
      priceEstimate: "11.47 USD",
      purchaseUrl: "https://www.peptaura.com/product/1289-ipamorelin-5mg-lumira",
      dosage: "100 mcg",
      route: "SC",
    }],
    sections: [{ id: "profile", title: "Profil", content: "" }],
  } as any;
  priced.sections[0].content = "Avant. Le point qui bloque aujourd'hui est concret. Le catalogue Peptaura du 13 août 2026 détecte bien les pages de CJC-1295 sans DAC, Ipamorelin et MOTS-c, mais ne présente aucune offre live exploitable pour la France. Il manque donc le fournisseur, le format de vial et le prix de chaque produit. Je te donne le plan technique et les quantités actives exactes, mais je suspends la commande, la reconstitution et la première injection jusqu'à l'apparition d'offres compatibles et à la validation de ton bilan de départ. Après.";
  const cleaned = removeObsoleteMissingLiveFormatSentence(priced);
  assert.doesNotMatch(cleaned.sections[0].content, /aucune offre live exploitable/i);
  assert.match(cleaned.sections[0].content, /Avant/);
  assert.match(cleaned.sections[0].content, /Après/);
});

function validCandidate(responseId = "resp_ABC123"): StoredPeptidesRecoveryCandidate {
  return {
    responseId,
    report: { clientName: "Clement", peptides: [], sections: [] },
    validation: {
      ok: true,
      errors: [],
      warnings: [],
      details: { peptideCount: 3, sectionCount: 15, totalChars: 32_000, peptidesChecked: [] },
    },
    safetyErrors: [],
    fingerprint: "f".repeat(64),
    ready: true,
  };
}

class FakeClient implements RecoverySqlClient {
  readonly calls: Array<{ text: string; values?: unknown[] }> = [];
  constructor(private readonly metadata: Record<string, unknown>) {}
  async query<Row = Record<string, unknown>>(text: string, values?: unknown[]) {
    this.calls.push({ text, values });
    if (/SELECT id, email, product_type, status, metadata[\s\S]+FOR UPDATE/.test(text)) {
      return { rows: [{
        id: "e8031451-1d11-42c4-a502-d3e43321c36b",
        email: "valla_c@outlook.fr",
        product_type: "PEPTIDES_ENGINE",
        status: "paid",
        metadata: this.metadata,
      }] as Row[], rowCount: 1 };
    }
    if (/UPDATE orders/.test(text)) return { rows: [{ id: values?.[3] }] as Row[], rowCount: 1 };
    return { rows: [] as Row[], rowCount: /INSERT INTO/.test(text) ? 1 : 0 };
  }
}

const baseInput = {
  orderId: "e8031451-1d11-42c4-a502-d3e43321c36b",
  email: "valla_c@outlook.fr",
  responseId: "resp_ABC123",
  confirmation: STORED_PEPTIDES_RECOVERY_CONFIRMATION,
  candidate: validCandidate(),
  responses: { pep_name: "Clement" },
};

test("apply refuses an order without an active delivery HOLD and rolls back", async () => {
  const client = new FakeClient({ peptidesEmailHold: false });
  await assert.rejects(
    persistStoredPeptidesRecoveryUnderHold({ ...baseInput, client }),
    /RECOVERY_HOLD_REQUIRED/,
  );
  assert.equal(client.calls.some((call) => call.text === "ROLLBACK"), true);
  assert.equal(client.calls.some((call) => /INSERT INTO burnout_reports/.test(call.text)), false);
});

test("apply requires exact email and cannot create a report for another client", async () => {
  const client = new FakeClient({ peptidesEmailHold: true });
  await assert.rejects(
    persistStoredPeptidesRecoveryUnderHold({ ...baseInput, client, email: "other@example.com" }),
    /RECOVERY_EMAIL_MISMATCH/,
  );
  assert.equal(client.calls.some((call) => /INSERT INTO burnout_reports/.test(call.text)), false);
});

test("apply requires a fully valid candidate before opening a transaction", async () => {
  const client = new FakeClient({ peptidesEmailHold: true });
  await assert.rejects(
    persistStoredPeptidesRecoveryUnderHold({
      ...baseInput,
      client,
      candidate: { ...validCandidate(), ready: false, safetyErrors: ["blocked"] },
    }),
    /RECOVERY_CANDIDATE_NOT_DELIVERABLE/,
  );
  assert.equal(client.calls.length, 0);
});

test("apply inserts and CAS-links atomically while retaining HOLD", async () => {
  const client = new FakeClient({ peptidesEmailHold: true });
  const result = await persistStoredPeptidesRecoveryUnderHold({ ...baseInput, client });
  assert.match(result.reportId, /^[0-9a-f-]{36}$/);
  assert.equal(client.calls[0].text, "BEGIN");
  assert.equal(client.calls.some((call) => /INSERT INTO burnout_reports/.test(call.text)), true);
  const update = client.calls.find((call) => /UPDATE orders/.test(call.text));
  assert.ok(update);
  assert.match(update.text, /peptidesEmailHold', true/);
  assert.match(update.text, /COALESCE\(metadata->>'peptidesReportId', ''\) = ''/);
  assert.equal(client.calls.at(-1)?.text, "COMMIT");
});
