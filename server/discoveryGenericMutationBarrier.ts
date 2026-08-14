import type { Pool, PoolClient } from "pg";

import {
  getGenericDiscoveryMutationBlockReason,
  type AuditAutomationCandidate,
} from "./discoveryAutomationPolicy";
import { DISCOVERY_TRANSACTION_FENCE_KEY } from "./discoveryTransactionalPersistence";

export const DISCOVERY_GLOBAL_LOCK_KEY = "discovery-global";

export class GenericAuditMutationBarrierError extends Error {
  constructor(
    readonly code: "AUDIT_NOT_FOUND" | "DISCOVERY_GLOBAL_LOCK_ACTIVE" | "DISCOVERY_GENERIC_MUTATION_BLOCKED",
    readonly auditId: string,
    readonly operation: string,
    readonly reason?: string,
  ) {
    super(`${code}:${operation}:${auditId}${reason ? `:${reason}` : ""}`);
    this.name = "GenericAuditMutationBarrierError";
  }
}

export interface GenericAuditMutationRow extends AuditAutomationCandidate {
  id: string;
  type: string;
  reportDeliveryStatus: string | null;
  reportSentAt: Date | string | null;
  narrativeReport: unknown;
  createdAt: Date | string | null;
}

type PoolLike = Pick<Pool, "connect">;

async function resolvePool(poolOverride?: PoolLike): Promise<PoolLike> {
  if (poolOverride) return poolOverride;
  return (await import("./db")).pool;
}

export async function runGenericAuditMutation<T>(
  input: {
    auditId: string;
    operation: string;
    mutate: (client: PoolClient, audit: GenericAuditMutationRow) => Promise<T>;
  },
  poolOverride?: PoolLike,
): Promise<T> {
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DISCOVERY_TRANSACTION_FENCE_KEY]);
    const selected = await client.query(
      `SELECT id, type, created_at, report_delivery_status, report_sent_at, narrative_report
         FROM audits WHERE id = $1 FOR UPDATE`,
      [input.auditId],
    );
    const row = selected.rows[0];
    if (!row) {
      throw new GenericAuditMutationBarrierError("AUDIT_NOT_FOUND", input.auditId, input.operation);
    }
    const audit: GenericAuditMutationRow = {
      id: String(row.id),
      type: String(row.type),
      createdAt: row.created_at,
      reportDeliveryStatus: row.report_delivery_status,
      reportSentAt: row.report_sent_at,
      narrativeReport: row.narrative_report,
    };
    if (audit.type === "GRATUIT") {
      const lock = await client.query(
        `SELECT 1 FROM discovery_operation_lock
          WHERE lock_key = $1 AND expires_at > NOW()
          LIMIT 1`,
        [DISCOVERY_GLOBAL_LOCK_KEY],
      );
      if ((lock.rowCount ?? 0) > 0) {
        throw new GenericAuditMutationBarrierError(
          "DISCOVERY_GLOBAL_LOCK_ACTIVE",
          input.auditId,
          input.operation,
        );
      }
      throw new GenericAuditMutationBarrierError(
        "DISCOVERY_GENERIC_MUTATION_BLOCKED",
        input.auditId,
        input.operation,
        getGenericDiscoveryMutationBlockReason(audit) || "DISCOVERY_REQUIRES_TRANSACTIONAL_WORKFLOW",
      );
    }
    const result = await input.mutate(client as PoolClient, audit);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export function genericAuditMutationHttpStatus(error: unknown): 404 | 409 | 500 {
  if (!(error instanceof GenericAuditMutationBarrierError)) return 500;
  return error.code === "AUDIT_NOT_FOUND" ? 404 : 409;
}
