import assert from "node:assert/strict";
import test from "node:test";

import {
  finalizeDiscoveryDeliveryClaim,
  markDiscoveryDeliveryProviderPostStarted,
} from "./discoveryBatchControl";

interface DeliveryState {
  claim: {
    id: string;
    batch_id: string | null;
    audit_id: string;
    fence_token: string | null;
    state: string;
  };
  fence: { token: string | null; active: boolean };
  auditStatus: string;
  reportSent: boolean;
}

class DeliveryClient {
  readonly calls: string[] = [];
  released = false;

  constructor(private readonly state: DeliveryState) {}

  async query(text: string, values: readonly unknown[] = []): Promise<{ rows: any[]; rowCount: number }> {
    this.calls.push(text);
    if (text === "BEGIN" || text === "COMMIT" || text === "ROLLBACK") {
      return { rows: [], rowCount: 0 };
    }
    if (/^SELECT pg_advisory_xact_lock/.test(text)) return { rows: [], rowCount: 1 };
    if (/SELECT \* FROM discovery_email_delivery_claims WHERE id = \$1 FOR UPDATE/.test(text)) {
      return values[0] === this.state.claim.id
        ? { rows: [{ ...this.state.claim }], rowCount: 1 }
        : { rows: [], rowCount: 0 };
    }
    if (/SELECT token::text AS token, \(expires_at > NOW\(\)\) AS active/.test(text)) {
      return this.state.fence.token === null && !this.state.fence.active
        ? { rows: [], rowCount: 0 }
        : { rows: [{ ...this.state.fence }], rowCount: 1 };
    }
    if (/SET state = 'PROVIDER_POST_STARTED'/.test(text)) {
      if (this.state.claim.state !== "CLAIMED") return { rows: [], rowCount: 0 };
      this.state.claim.state = "PROVIDER_POST_STARTED";
      return { rows: [{ id: this.state.claim.id }], rowCount: 1 };
    }
    if (/UPDATE discovery_email_delivery_claims[\s\S]*SET state = \$2/.test(text)) {
      const outcome = String(values[1]);
      if (this.state.claim.state !== "PROVIDER_POST_STARTED") return { rows: [], rowCount: 0 };
      this.state.claim.state = outcome;
      return {
        rows: [{ batch_id: this.state.claim.batch_id, audit_id: this.state.claim.audit_id }],
        rowCount: 1,
      };
    }
    if (/UPDATE audits SET report_delivery_status = 'SENT'/.test(text)) {
      if (this.state.auditStatus !== "SENDING" || this.state.reportSent) {
        return { rows: [], rowCount: 0 };
      }
      this.state.auditStatus = "SENT";
      this.state.reportSent = true;
      return { rows: [{ id: this.state.claim.audit_id }], rowCount: 1 };
    }
    throw new Error(`Unexpected SQL in delivery fence test: ${text}`);
  }

  release(): void {
    this.released = true;
  }
}

class DeliveryPool {
  readonly client: DeliveryClient;

  constructor(state: DeliveryState) {
    this.client = new DeliveryClient(state);
  }

  async connect(): Promise<DeliveryClient> {
    return this.client;
  }
}

function makeState(overrides: Partial<DeliveryState> = {}): DeliveryState {
  return {
    claim: {
      id: "claim-1",
      batch_id: null,
      audit_id: "audit-1",
      fence_token: "epoch-before",
      state: "CLAIMED",
    },
    fence: { token: "epoch-before", active: false },
    auditStatus: "SENDING",
    reportSent: false,
    ...overrides,
  };
}

test("a rotated durable epoch blocks provider start before the claim CAS", async () => {
  const state = makeState({ fence: { token: "epoch-after", active: false } });
  const pool = new DeliveryPool(state);

  await assert.rejects(
    markDiscoveryDeliveryProviderPostStarted(state.claim.id, pool as any),
    /DISCOVERY_DELIVERY_FENCE_STALE/,
  );

  assert.equal(state.claim.state, "CLAIMED");
  assert.equal(pool.client.calls.some((sql) => /SET state = 'PROVIDER_POST_STARTED'/.test(sql)), false);
  assert.equal(pool.client.calls.at(-1), "ROLLBACK");
  assert.equal(pool.client.released, true);
});

test("unchanged epoch owns provider start and accepted finalization atomically", async () => {
  const state = makeState();
  const pool = new DeliveryPool(state);

  assert.equal(
    await markDiscoveryDeliveryProviderPostStarted(state.claim.id, pool as any),
    true,
  );
  assert.equal(state.claim.state, "PROVIDER_POST_STARTED");

  assert.equal(
    await finalizeDiscoveryDeliveryClaim({
      claimId: state.claim.id,
      outcome: "PROVIDER_ACCEPTED",
      providerTaskId: "provider-task-1",
    }, pool as any),
    true,
  );
  assert.equal(state.claim.state, "PROVIDER_ACCEPTED");
  assert.equal(state.auditStatus, "SENT");
  assert.equal(state.reportSent, true);
  assert.equal(pool.client.calls.filter((sql) => sql === "COMMIT").length, 2);
  assert.equal(pool.client.calls.some((sql) => /type = 'GRATUIT'/.test(sql)), true);
});
