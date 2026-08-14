import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateAICostBudget,
  getAICostBudgetLimits,
} from "./aiCostBudgetController";
import {
  claimDiscoveryGeneration,
  discoveryTransactionalSha256,
  failClaimedDiscoveryGeneration,
  persistClaimedDiscoveryGeneration,
  type DiscoveryAtomicPersistenceInput,
  type DiscoveryGenerationClaim,
} from "./discoveryTransactionalPersistence";

const VALID_ENV = {
  DISCOVERY_TRANSACTIONAL_AUTOMATION_ENABLED: "true",
  DISCOVERY_AUTOMATION_START_AT: "2026-08-13T14:15:00Z",
} as const;

const ENV_KEYS = Object.keys(VALID_ENV) as Array<keyof typeof VALID_ENV>;

async function withDiscoveryEnv<T>(
  overrides: Partial<Record<keyof typeof VALID_ENV, string | undefined>>,
  run: () => Promise<T>,
): Promise<T> {
  const previous = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  for (const key of ENV_KEYS) {
    const value = key in overrides ? overrides[key] : VALID_ENV[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await run();
  } finally {
    for (const key of ENV_KEYS) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

interface FakeDatabase {
  audit: Record<string, any>;
  fence: { token: string | null; active: boolean };
  committedArtifacts: Set<string>;
  persistCasRowCount?: number;
  failureCasRowCount?: number;
  jobClaimRowCount?: number;
  jobUpdates: string[];
}

interface QueryCall {
  text: string;
  values?: readonly unknown[];
}

class FakePoolClient {
  readonly calls: QueryCall[] = [];
  released = false;
  transactionOpen = false;
  private transactionArtifacts = new Set<string>();

  constructor(private readonly database: FakeDatabase) {}

  async query<Row = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[]; rowCount: number }> {
    this.calls.push({ text, values });

    if (text === "BEGIN") {
      assert.equal(this.transactionOpen, false, "a pooled client must not start with a leaked transaction");
      this.transactionOpen = true;
      return { rows: [], rowCount: 0 };
    }
    if (/^SELECT pg_advisory_xact_lock/.test(text)) return { rows: [], rowCount: 1 };
    if (/^\s*SELECT token::text AS token, \(expires_at > NOW\(\)\) AS active/.test(text)) {
      const rows = this.database.fence.token === null && !this.database.fence.active
        ? []
        : [{ ...this.database.fence }];
      return { rows: rows as Row[], rowCount: rows.length };
    }
    if (/^\s*SELECT id, type, created_at, responses, report_delivery_status,[\s\S]*FROM audits WHERE id = \$1 FOR UPDATE/.test(text)) {
      const rows = this.database.audit.id === values?.[0]
        ? [structuredClone(this.database.audit)]
        : [];
      return { rows: rows as Row[], rowCount: rows.length };
    }
    if (/^\s*UPDATE audits[\s\S]*SET report_delivery_status = 'GENERATING'/.test(text)) {
      const currentStatus = this.database.audit.report_delivery_status ?? null;
      const eligibleStatus = currentStatus === null
        || ["PENDING", "NEEDS_REVIEW", "EMAIL_FAILED", "FAILED"].includes(currentStatus);
      if (!eligibleStatus) return { rows: [], rowCount: 0 };
      this.database.audit.report_delivery_status = "GENERATING";
      this.database.audit.narrative_report = {
        ...(this.database.audit.narrative_report || {}),
        generationClaim: JSON.parse(String(values?.[1])),
      };
      return { rows: [{ id: this.database.audit.id }] as Row[], rowCount: 1 };
    }
    if (/^\s*INSERT INTO report_jobs AS existing/.test(text)) {
      const rowCount = this.database.jobClaimRowCount ?? 1;
      return {
        rows: rowCount === 1 ? [{ audit_id: this.database.audit.id }] as Row[] : [],
        rowCount,
      };
    }
    if (/^\s*INSERT INTO report_artifacts/.test(text)) {
      const artifactId = String(values?.[0]);
      this.transactionArtifacts.add(artifactId);
      return { rows: [{ id: artifactId }] as Row[], rowCount: 1 };
    }
    if (/^\s*UPDATE audits[\s\S]*SET narrative_report = \$3::jsonb/.test(text)) {
      const rowCount = this.database.persistCasRowCount ?? 1;
      if (rowCount === 1) {
        this.database.audit.report_delivery_status = "READY";
        this.database.audit.narrative_report = JSON.parse(String(values?.[2]));
      }
      return {
        rows: rowCount === 1 ? [{ id: this.database.audit.id }] as Row[] : [],
        rowCount,
      };
    }
    if (/^\s*UPDATE audits[\s\S]*SET report_delivery_status = 'NEEDS_REVIEW'/.test(text)) {
      const currentToken = String(
        this.database.audit.narrative_report?.generationClaim?.token || "",
      );
      const rowCount = this.database.failureCasRowCount
        ?? (currentToken === String(values?.[1]) ? 1 : 0);
      if (rowCount === 1) this.database.audit.report_delivery_status = "NEEDS_REVIEW";
      return {
        rows: rowCount === 1 ? [{ id: this.database.audit.id }] as Row[] : [],
        rowCount,
      };
    }
    if (/^\s*UPDATE report_jobs/.test(text)) {
      this.database.jobUpdates.push(text);
      return { rows: [], rowCount: 1 };
    }
    if (text === "COMMIT") {
      for (const artifactId of this.transactionArtifacts) {
        this.database.committedArtifacts.add(artifactId);
      }
      this.transactionArtifacts.clear();
      this.transactionOpen = false;
      return { rows: [], rowCount: 0 };
    }
    if (text === "ROLLBACK") {
      this.transactionArtifacts.clear();
      this.transactionOpen = false;
      return { rows: [], rowCount: 0 };
    }

    throw new Error(`Unexpected fake SQL: ${text}`);
  }

  release(): void {
    this.released = true;
  }
}

class FakePool {
  connectCount = 0;
  readonly client: FakePoolClient;

  constructor(database: FakeDatabase) {
    this.client = new FakePoolClient(database);
  }

  async connect(): Promise<FakePoolClient> {
    this.connectCount += 1;
    return this.client;
  }
}

function makeDatabase(overrides: Partial<FakeDatabase> = {}): FakeDatabase {
  return {
    audit: {
      id: "audit-transactional-1",
      type: "GRATUIT",
      created_at: "2026-08-14T00:00:00Z",
      responses: { age: 34, objectif: "energie" },
      report_delivery_status: "PENDING",
      report_sent_at: null,
      narrative_report: {},
    },
    fence: { token: null, active: false },
    committedArtifacts: new Set<string>(),
    jobUpdates: [],
    ...overrides,
  };
}

function makeClaim(database: FakeDatabase, overrides: Partial<DiscoveryGenerationClaim> = {}): DiscoveryGenerationClaim {
  return {
    auditId: String(database.audit.id),
    token: "claim-token-current",
    fenceToken: database.fence.token,
    expectedResponsesSha256: discoveryTransactionalSha256(database.audit.responses),
    ...overrides,
  };
}

function makePersistenceInput(
  claim: DiscoveryGenerationClaim,
): DiscoveryAtomicPersistenceInput {
  const txt = "Rapport Discovery transactionnel";
  const html = "<main><h1>Rapport Discovery transactionnel</h1></main>";
  return {
    claim,
    narrativeReport: { version: 4, generationClaim: { token: claim.token } },
    scores: { recovery: 81, sleep: 73 },
    txt,
    html,
    expectedTxtSha256: discoveryTransactionalSha256(txt),
    expectedHtmlSha256: discoveryTransactionalSha256(html),
    model: "fake-model-without-provider-call",
  };
}

test("generation claim has a single winner and returns its durable ownership token", async () => {
  await withDiscoveryEnv({}, async () => {
    const database = makeDatabase();
    const pool = new FakePool(database);

    const winner = await claimDiscoveryGeneration(database.audit.id, pool as any);
    const loser = await claimDiscoveryGeneration(database.audit.id, pool as any);

    assert.ok(winner);
    assert.match(winner.token, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(database.audit.narrative_report.generationClaim.token, winner.token);
    assert.equal(winner.expectedResponsesSha256, discoveryTransactionalSha256(database.audit.responses));
    assert.equal(loser, null);
    assert.equal(pool.connectCount, 2);
    assert.equal(pool.client.calls.filter((call) => call.text === "COMMIT").length, 1);
    assert.equal(pool.client.calls.filter((call) => call.text === "ROLLBACK").length, 1);
    assert.equal(pool.client.transactionOpen, false);
    assert.equal(pool.client.released, true);
    const statements = pool.client.calls.map((call) => call.text);
    assert.ok(
      statements.findIndex((sql) => /SET report_delivery_status = 'GENERATING'/.test(sql))
        < statements.findIndex((sql) => /INSERT INTO report_jobs AS existing/.test(sql)),
    );
  });
});

test("generation claim rolls back when the dedicated report job CAS loses", async () => {
  await withDiscoveryEnv({}, async () => {
    const database = makeDatabase({ jobClaimRowCount: 0 });
    const pool = new FakePool(database);

    assert.equal(await claimDiscoveryGeneration(database.audit.id, pool as any), null);
    assert.equal(pool.client.calls.at(-1)?.text, "ROLLBACK");
    assert.equal(pool.client.calls.some((call) => call.text === "COMMIT"), false);
    assert.equal(pool.client.transactionOpen, false);
  });
});

test("artifact and audit persistence commit atomically under the winning claim", async () => {
  await withDiscoveryEnv({}, async () => {
    const database = makeDatabase({
      audit: {
        ...makeDatabase().audit,
        report_delivery_status: "GENERATING",
        narrative_report: { generationClaim: { token: "claim-token-current" } },
      },
    });
    const claim = makeClaim(database);
    const input = makePersistenceInput(claim);
    const pool = new FakePool(database);

    const result = await persistClaimedDiscoveryGeneration(input, pool as any);

    assert.match(result.artifactId, /^[0-9a-f-]{36}$/i);
    assert.equal(result.txtSha256, input.expectedTxtSha256);
    assert.equal(result.htmlSha256, input.expectedHtmlSha256);
    assert.deepEqual([...database.committedArtifacts], [result.artifactId]);
    assert.equal(database.audit.report_delivery_status, "READY");
    assert.equal(database.jobUpdates.length, 1);
    const statements = pool.client.calls.map((call) => call.text);
    const artifactInsert = statements.findIndex((sql) => /INSERT INTO report_artifacts/.test(sql));
    const auditCas = statements.findIndex((sql) => /SET narrative_report = \$3::jsonb/.test(sql));
    const jobUpdate = statements.findIndex((sql) => /UPDATE report_jobs/.test(sql));
    const commit = statements.indexOf("COMMIT");
    assert.ok(artifactInsert >= 0 && artifactInsert < auditCas && auditCas < jobUpdate && jobUpdate < commit);
    assert.equal(statements.includes("ROLLBACK"), false);
    assert.equal(pool.client.transactionOpen, false);
  });
});

test("a lost audit CAS rolls back the artifact inserted in the same transaction", async () => {
  await withDiscoveryEnv({}, async () => {
    const database = makeDatabase({
      audit: {
        ...makeDatabase().audit,
        report_delivery_status: "GENERATING",
        narrative_report: { generationClaim: { token: "claim-token-current" } },
      },
      persistCasRowCount: 0,
    });
    const pool = new FakePool(database);
    const input = makePersistenceInput(makeClaim(database));

    await assert.rejects(
      persistClaimedDiscoveryGeneration(input, pool as any),
      /DISCOVERY_AUDIT_PERSISTENCE_CAS_FAILED/,
    );

    assert.equal(database.committedArtifacts.size, 0);
    assert.equal(database.audit.report_delivery_status, "GENERATING");
    assert.equal(database.jobUpdates.length, 0);
    assert.equal(pool.client.calls.at(-1)?.text, "ROLLBACK");
    assert.equal(pool.client.calls.some((call) => call.text === "COMMIT"), false);
    assert.equal(pool.client.transactionOpen, false);
  });
});

test("an inactive but renewed global fence epoch makes a pre-batch claim stale", async () => {
  await withDiscoveryEnv({}, async () => {
    const database = makeDatabase({
      audit: {
        ...makeDatabase().audit,
        report_delivery_status: "GENERATING",
        narrative_report: { generationClaim: { token: "claim-token-current" } },
      },
      fence: { token: "epoch-after-batch", active: false },
    });
    const staleClaim = makeClaim(database, { fenceToken: "epoch-before-batch" });
    const pool = new FakePool(database);

    await assert.rejects(
      persistClaimedDiscoveryGeneration(makePersistenceInput(staleClaim), pool as any),
      /DISCOVERY_GENERATION_FENCE_STALE/,
    );

    assert.equal(database.committedArtifacts.size, 0);
    assert.equal(pool.client.calls.some((call) => /FROM audits WHERE id/.test(call.text)), false);
    assert.equal(pool.client.calls.some((call) => /INSERT INTO report_artifacts/.test(call.text)), false);
    assert.equal(pool.client.calls.at(-1)?.text, "ROLLBACK");
    assert.equal(pool.client.transactionOpen, false);
  });
});

test("an obsolete failure token loses the CAS and cannot change the audit state", async () => {
  await withDiscoveryEnv({}, async () => {
    const database = makeDatabase({
      audit: {
        ...makeDatabase().audit,
        report_delivery_status: "GENERATING",
        narrative_report: { generationClaim: { token: "new-owner-token" } },
      },
    });
    const oldClaim = makeClaim(database, { token: "old-owner-token" });
    const pool = new FakePool(database);

    const changed = await failClaimedDiscoveryGeneration(
      oldClaim,
      "behavior-test",
      new Error("provider failed after ownership changed"),
      pool as any,
    );

    assert.equal(changed, false);
    assert.equal(database.audit.report_delivery_status, "GENERATING");
    assert.equal(database.jobUpdates.length, 0, "a stale owner must not fail the new owner's report job");
    assert.equal(pool.client.calls.some((call) => call.text === "COMMIT"), true);
    assert.equal(pool.client.transactionOpen, false);
  });
});

test("a stale failure fence closes its transaction without touching audit or job", async () => {
  await withDiscoveryEnv({}, async () => {
    const database = makeDatabase({
      audit: {
        ...makeDatabase().audit,
        report_delivery_status: "GENERATING",
        narrative_report: { generationClaim: { token: "claim-token-current" } },
      },
      fence: { token: "epoch-after-batch", active: false },
    });
    const staleClaim = makeClaim(database, { fenceToken: "epoch-before-batch" });
    const pool = new FakePool(database);

    const changed = await failClaimedDiscoveryGeneration(
      staleClaim,
      "behavior-test",
      new Error("failure reported after batch epoch changed"),
      pool as any,
    );

    assert.equal(changed, false);
    assert.equal(database.audit.report_delivery_status, "GENERATING");
    assert.equal(database.jobUpdates.length, 0);
    assert.equal(pool.client.calls.at(-1)?.text, "ROLLBACK");
    assert.equal(pool.client.transactionOpen, false);
  });
});

test("an invalid or date-only cutoff refuses a claim before opening a DB connection", async () => {
  for (const cutoff of ["2026-08-13", "2026-08-13T14:15:00+04:00", "not-a-date"]) {
    await withDiscoveryEnv({ DISCOVERY_AUTOMATION_START_AT: cutoff }, async () => {
      const database = makeDatabase();
      const pool = new FakePool(database);

      assert.equal(await claimDiscoveryGeneration(database.audit.id, pool as any), null);
      assert.equal(pool.connectCount, 0, cutoff);
      assert.equal(pool.client.calls.length, 0, cutoff);
    });
  }
});

test("Discovery budget reserves the hard per-audit cap once and blocks a second call", () => {
  const limits = getAICostBudgetLimits("discovery", {
    AI_COST_DISCOVERY_PER_AUDIT_USD: "999",
    AI_COST_DISCOVERY_PER_HOUR_USD: "1.5",
    AI_COST_DISCOVERY_PER_DAY_USD: "5",
  });
  assert.equal(limits.perOrderUsd, 0.75, "the configured hard cap cannot exceed the built-in ceiling");

  const first = evaluateAICostBudget(
    { orderUsd: 0, hourUsd: 0, dayUsd: 0 },
    0.75,
    limits,
  );
  assert.equal(first.allowed, true);
  assert.equal(first.projected.orderUsd, 0.75);

  const second = evaluateAICostBudget(
    { orderUsd: first.projected.orderUsd, hourUsd: first.projected.hourUsd, dayUsd: first.projected.dayUsd },
    0.75,
    limits,
  );
  assert.equal(second.allowed, false);
  assert.equal(second.blockedBy, "order");
});
