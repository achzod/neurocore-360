import assert from "node:assert/strict";
import test from "node:test";

import {
  DISCOVERY_REPORT_JOB_MUTATION_BLOCKED,
  completeGenericReportJob,
  deleteGenericReportJob,
  enqueueMissingDiscoveryReportJobFenced,
  failGenericReportJob,
  insertGenericReportArtifactFenced,
  listActiveGenericReportJobRows,
  markDiscoveryAuditSupersededFenced,
  updateGenericReportJobProgress,
  upsertGenericReportJobRow,
} from "./reportJobStorageSafety";

const VALID_ENV = {
  DISCOVERY_TRANSACTIONAL_AUTOMATION_ENABLED: "true",
  DISCOVERY_AUTOMATION_START_AT: "2026-08-14T00:00:00.000Z",
} as const;

async function withDiscoveryEnv<T>(run: () => Promise<T>): Promise<T> {
  const previous = Object.fromEntries(
    Object.keys(VALID_ENV).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, VALID_ENV);
  try {
    return await run();
  } finally {
    for (const key of Object.keys(VALID_ENV)) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

class GenericPool {
  calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  upsertRowCount = 1;

  async query(text: string, values?: readonly unknown[]) {
    this.calls.push({ text, values });
    if (/^\s*SELECT j\.\*/.test(text)) {
      return { rows: [{ audit_id: "paid-1", status: "pending" }], rowCount: 1 };
    }
    if (/^\s*INSERT INTO report_jobs AS existing/.test(text)) {
      const rows = this.upsertRowCount === 1
        ? [{ audit_id: values?.[0], status: values?.[1], progress: values?.[2] }]
        : [];
      return { rows, rowCount: rows.length };
    }
    if (/^\s*(UPDATE|DELETE FROM) report_jobs AS j/.test(text)) {
      return { rows: [], rowCount: 1 };
    }
    throw new Error(`Unexpected generic SQL: ${text}`);
  }
}

test("generic report_jobs reads and every mutation exclude Discovery in SQL", async () => {
  const pool = new GenericPool();
  const rows = await listActiveGenericReportJobRows(pool as any);
  assert.equal(rows.length, 1);
  await upsertGenericReportJobRow(pool as any, {
    auditId: "paid-1",
    status: "generating",
    progress: 0,
    error: null,
  });
  await updateGenericReportJobProgress(pool as any, "paid-1", 25, "Analyse");
  await completeGenericReportJob(pool as any, "paid-1");
  await failGenericReportJob(pool as any, "paid-1", "failed");
  await deleteGenericReportJob(pool as any, "paid-1");

  assert.equal(pool.calls.length, 6);
  for (const call of pool.calls) {
    assert.match(call.text, /audits/);
    assert.match(call.text, /type <> 'GRATUIT'/);
  }
  const upsert = pool.calls[1];
  assert.match(upsert.text, /INSERT INTO report_jobs AS existing/);
  assert.match(upsert.text, /ON CONFLICT \(audit_id\) DO UPDATE/);
  assert.equal(upsert.values?.[8], true, "progress=0 must be treated as an explicit update");
  assert.equal(upsert.values?.[10], true, "error=null must be treated as an explicit update");
});

test("generic report_jobs upsert fails closed when audit is Discovery or absent", async () => {
  const pool = new GenericPool();
  pool.upsertRowCount = 0;
  await assert.rejects(
    upsertGenericReportJobRow(pool as any, { auditId: "discovery-1" }),
    (error: unknown) => error instanceof Error
      && error.message === DISCOVERY_REPORT_JOB_MUTATION_BLOCKED,
  );
});

class ArtifactClient {
  calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  released = false;
  constructor(private readonly type: "GRATUIT" | "PREMIUM") {}

  async query(text: string, values?: readonly unknown[]) {
    this.calls.push({ text, values });
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(text)) return { rows: [], rowCount: 0 };
    if (/^SELECT pg_advisory_xact_lock/.test(text)) return { rows: [], rowCount: 1 };
    if (/FROM audits WHERE id = \$1 FOR UPDATE/.test(text)) {
      return {
        rows: [{
          id: values?.[0],
          type: this.type,
          created_at: "2026-08-14T01:00:00.000Z",
          report_delivery_status: "READY",
          report_sent_at: null,
          narrative_report: {},
        }],
        rowCount: 1,
      };
    }
    if (/FROM discovery_operation_lock/.test(text)) return { rows: [], rowCount: 0 };
    if (/^\s*INSERT INTO report_artifacts/.test(text)) {
      return { rows: [{ id: values?.[0] }], rowCount: 1 };
    }
    throw new Error(`Unexpected artifact SQL: ${text}`);
  }

  release() { this.released = true; }
}

class ArtifactPool {
  readonly client: ArtifactClient;
  constructor(type: "GRATUIT" | "PREMIUM") { this.client = new ArtifactClient(type); }
  async connect() { return this.client; }
  async query() { throw new Error("artifact persistence must use the fenced client"); }
}

const artifactInput = {
  id: "artifact-1",
  auditId: "audit-1",
  tier: "PREMIUM",
  engine: "report",
  model: "model",
  txt: "txt",
  html: "<p>html</p>",
  createdAt: new Date("2026-08-14T01:00:00.000Z"),
};

test("generic artifact persistence is fenced and uses an atomic INSERT SELECT paid guard", async () => {
  const pool = new ArtifactPool("PREMIUM");
  await insertGenericReportArtifactFenced(pool as any, artifactInput);
  const insert = pool.client.calls.find((call) => /^\s*INSERT INTO report_artifacts/.test(call.text))!;
  assert.match(insert.text, /SELECT \$1, a\.id/);
  assert.match(insert.text, /a\.type <> 'GRATUIT'/);
  assert.match(insert.text, /\$3 <> 'GRATUIT'/);
  assert.equal(pool.client.calls.at(-1)?.text, "COMMIT");
  assert.equal(pool.client.released, true);
});

test("generic artifact persistence blocks a Discovery audit before INSERT", async () => {
  const pool = new ArtifactPool("GRATUIT");
  await assert.rejects(
    insertGenericReportArtifactFenced(pool as any, artifactInput),
    /DISCOVERY_GENERIC_MUTATION_BLOCKED/,
  );
  assert.equal(
    pool.client.calls.some((call) => /^\s*INSERT INTO report_artifacts/.test(call.text)),
    false,
  );
  assert.equal(pool.client.calls.at(-1)?.text, "ROLLBACK");
});

interface RecoveryState {
  rows: Array<Record<string, any>>;
  fence: { token: string | null; active: boolean };
  updateRowCount: number;
  insertRowCount: number;
}

class RecoveryClient {
  calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  released = false;

  constructor(private readonly state: RecoveryState) {}

  async query(text: string, values?: readonly unknown[]) {
    this.calls.push({ text, values });
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(text)) return { rows: [], rowCount: 0 };
    if (/^SELECT pg_advisory_xact_lock/.test(text)) return { rows: [], rowCount: 1 };
    if (/^\s*SELECT token::text AS token/.test(text)) {
      const rows = this.state.fence.token || this.state.fence.active ? [this.state.fence] : [];
      return { rows, rowCount: rows.length };
    }
    if (/FROM audits[\s\S]*WHERE id = \$1[\s\S]*FOR UPDATE/.test(text)) {
      const rows = this.state.rows.filter((row) => row.id === values?.[0]);
      return { rows: structuredClone(rows), rowCount: rows.length };
    }
    if (/WHERE id = ANY\(\$1::varchar\[\]\)/.test(text)) {
      const ids = values?.[0] as string[];
      const rows = this.state.rows.filter((row) => ids.includes(row.id));
      return { rows: structuredClone(rows), rowCount: rows.length };
    }
    if (/^\s*UPDATE audits AS a/.test(text)) {
      const rows = this.state.updateRowCount === 1 ? [{ id: values?.[0] }] : [];
      return { rows, rowCount: rows.length };
    }
    if (/^\s*INSERT INTO report_jobs/.test(text)) {
      const rows = this.state.insertRowCount === 1 ? [{ audit_id: values?.[0] }] : [];
      return { rows, rowCount: rows.length };
    }
    throw new Error(`Unexpected recovery SQL: ${text}`);
  }

  release() { this.released = true; }
}

class RecoveryPool {
  readonly client: RecoveryClient;
  constructor(state: RecoveryState) { this.client = new RecoveryClient(state); }
  async connect() { return this.client; }
}

function recoveryAudit(overrides: Record<string, unknown> = {}) {
  return {
    id: "discovery-source",
    type: "GRATUIT",
    email: "client@example.com",
    created_at: "2026-08-14T01:00:00.000Z",
    responses: { age: 34 },
    report_delivery_status: "NEEDS_REVIEW",
    report_sent_at: null,
    narrative_report: { recovery: { version: 1 } },
    report_txt: null,
    report_html: null,
    ...overrides,
  };
}

function recoveryState(overrides: Partial<RecoveryState> = {}): RecoveryState {
  return {
    rows: [recoveryAudit()],
    fence: { token: "old-epoch", active: false },
    updateRowCount: 1,
    insertRowCount: 1,
    ...overrides,
  };
}

test("missing Discovery job enqueue is fenced, row-locked and atomically CASes audit plus job", async () => {
  await withDiscoveryEnv(async () => {
    const pool = new RecoveryPool(recoveryState());
    assert.equal(await enqueueMissingDiscoveryReportJobFenced(
      pool as any,
      "discovery-source",
      "missing_job_and_artifacts",
    ), true);

    const texts = pool.client.calls.map((call) => call.text);
    assert.deepEqual(texts.slice(0, 3).map((text) => text.trim().split("\n")[0]), [
      "BEGIN",
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      "SELECT token::text AS token, (expires_at > NOW()) AS active",
    ]);
    const select = texts.find((text) => /FROM audits[\s\S]*WHERE id = \$1/.test(text))!;
    assert.match(select, /FOR UPDATE/);
    const update = texts.find((text) => /^\s*UPDATE audits AS a/.test(text))!;
    assert.match(update, /a\.created_at >= \$3/);
    assert.match(update, /a\.responses IS NOT DISTINCT FROM \$4::jsonb/);
    assert.match(update, /a\.narrative_report IS NOT DISTINCT FROM \$5::jsonb/);
    assert.match(update, /NOT EXISTS \(SELECT 1 FROM report_jobs/);
    assert.match(update, /NOT EXISTS \(SELECT 1 FROM report_artifacts/);
    assert.match(update, /expires_at > NOW\(\)/);
    assert.match(update, /token::text/);
    assert.ok(texts.some((text) => /^\s*INSERT INTO report_jobs/.test(text)));
    assert.equal(texts.at(-1), "COMMIT");
    assert.equal(pool.client.released, true);
  });
});

test("missing Discovery enqueue rolls back audit metadata if job insertion loses its CAS", async () => {
  await withDiscoveryEnv(async () => {
    const pool = new RecoveryPool(recoveryState({ insertRowCount: 0 }));
    assert.equal(await enqueueMissingDiscoveryReportJobFenced(
      pool as any,
      "discovery-source",
      "missing_job_and_artifacts",
    ), false);
    assert.equal(pool.client.calls.at(-1)?.text, "ROLLBACK");
    assert.equal(pool.client.calls.some((call) => call.text === "COMMIT"), false);
  });
});

test("active discovery-global lock blocks recovery before audit row mutation", async () => {
  await withDiscoveryEnv(async () => {
    const pool = new RecoveryPool(recoveryState({
      fence: { token: "active-batch", active: true },
    }));
    assert.equal(await enqueueMissingDiscoveryReportJobFenced(
      pool as any,
      "discovery-source",
      "missing_job_and_artifacts",
    ), false);
    assert.equal(pool.client.calls.some((call) => /^\s*UPDATE audits/.test(call.text)), false);
    assert.equal(pool.client.calls.at(-1)?.text, "ROLLBACK");
  });
});

test("legacy pre-cutoff Discovery recovery is rejected after the row lock", async () => {
  await withDiscoveryEnv(async () => {
    const pool = new RecoveryPool(recoveryState({
      rows: [recoveryAudit({ created_at: "2026-08-13T23:59:59.999Z" })],
    }));
    assert.equal(await enqueueMissingDiscoveryReportJobFenced(
      pool as any,
      "discovery-source",
      "missing_job_and_artifacts",
    ), false);
    assert.equal(pool.client.calls.some((call) => /^\s*UPDATE audits/.test(call.text)), false);
    assert.equal(pool.client.calls.at(-1)?.text, "ROLLBACK");
  });
});

test("supersede locks both audits and applies full source/global-fence CAS", async () => {
  await withDiscoveryEnv(async () => {
    const pool = new RecoveryPool(recoveryState({
      rows: [
        recoveryAudit(),
        recoveryAudit({
          id: "discovery-replacement",
          created_at: "2026-08-14T02:00:00.000Z",
          report_delivery_status: "PENDING",
          narrative_report: {},
        }),
      ],
    }));
    assert.equal(await markDiscoveryAuditSupersededFenced(
      pool as any,
      "discovery-source",
      "discovery-replacement",
      "newer_duplicate",
    ), true);

    const select = pool.client.calls.find((call) => /id = ANY/.test(call.text))!;
    assert.match(select.text, /ORDER BY id[\s\S]*FOR UPDATE/);
    assert.deepEqual(select.values?.[0], ["discovery-source", "discovery-replacement"]);
    const update = pool.client.calls.find((call) => /^\s*UPDATE audits AS a/.test(call.text))!;
    assert.match(update.text, /report_delivery_status = 'SUPERSEDED'/);
    assert.match(update.text, /a\.created_at >= \$4/);
    assert.match(update.text, /a\.responses IS NOT DISTINCT FROM \$5::jsonb/);
    assert.match(update.text, /NOT EXISTS \(SELECT 1 FROM report_jobs/);
    assert.match(update.text, /NOT EXISTS \(SELECT 1 FROM report_artifacts/);
    assert.match(update.text, /replacement\.type = 'GRATUIT'/);
    assert.match(update.text, /LOWER\(replacement\.email\) = LOWER\(a\.email\)/);
    assert.equal(pool.client.calls.at(-1)?.text, "COMMIT");
  });
});

test("supersede rejects a replacement with a different identity without mutation", async () => {
  await withDiscoveryEnv(async () => {
    const pool = new RecoveryPool(recoveryState({
      rows: [
        recoveryAudit(),
        recoveryAudit({ id: "other", email: "other@example.com" }),
      ],
    }));
    assert.equal(await markDiscoveryAuditSupersededFenced(
      pool as any,
      "discovery-source",
      "other",
      "newer_duplicate",
    ), false);
    assert.equal(pool.client.calls.some((call) => /^\s*UPDATE audits/.test(call.text)), false);
    assert.equal(pool.client.calls.at(-1)?.text, "ROLLBACK");
  });
});
