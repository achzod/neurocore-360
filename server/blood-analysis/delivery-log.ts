import { randomUUID } from "crypto";

export type BloodDeliveryStatus = "blocked" | "sent" | "failed";

export type BloodDeliveryLogInput = {
  reportId: string;
  recipientEmail: string;
  clientName?: string;
  orderRef?: string;
  status: BloodDeliveryStatus;
  qualityPass: boolean;
  qualityChecks?: Record<string, unknown>;
  sendpulseId?: string;
  attachmentName?: string;
  subject?: string;
  errorMessage?: string;
  sentAt?: Date | null;
};

export type BloodDeliveryLogRow = {
  id: string;
  reportId: string;
  recipientEmail: string;
  clientName: string | null;
  orderRef: string | null;
  status: BloodDeliveryStatus;
  qualityPass: boolean;
  qualityChecks: Record<string, unknown>;
  sendpulseId: string | null;
  attachmentName: string | null;
  subject: string | null;
  errorMessage: string | null;
  createdAt: Date;
  sentAt: Date | null;
};

export type BloodDeliveryLogFilters = {
  email?: string;
  reportId?: string;
  orderRef?: string;
  status?: BloodDeliveryStatus;
  limit?: number;
};

let ensuredTable = false;
let ensurePromise: Promise<void> | null = null;

const getPool = async () => {
  try {
    const mod = await import("../db");
    return mod.pool;
  } catch (error) {
    console.warn("[BloodDeliveryLog] DB unavailable, skipping delivery log persistence.");
    return null;
  }
};

const ensureTable = async (): Promise<void> => {
  if (ensuredTable) return;
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const pool = await getPool();
      if (!pool) return;
      await pool.query(`
        CREATE TABLE IF NOT EXISTS blood_email_deliveries (
          id VARCHAR(36) PRIMARY KEY,
          report_id VARCHAR(255) NOT NULL,
          recipient_email VARCHAR(255) NOT NULL,
          client_name VARCHAR(255),
          order_ref VARCHAR(255),
          status VARCHAR(20) NOT NULL,
          quality_pass BOOLEAN NOT NULL DEFAULT FALSE,
          quality_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
          sendpulse_id VARCHAR(255),
          attachment_name TEXT,
          subject TEXT,
          error_message TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          sent_at TIMESTAMP
        )
      `);
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_blood_email_deliveries_report_id ON blood_email_deliveries(report_id)`
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_blood_email_deliveries_email ON blood_email_deliveries(recipient_email)`
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_blood_email_deliveries_order_ref ON blood_email_deliveries(order_ref)`
      );
      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_blood_email_deliveries_created_at ON blood_email_deliveries(created_at DESC)`
      );
      ensuredTable = true;
    })();
  }
  await ensurePromise;
};

export async function logBloodEmailDelivery(input: BloodDeliveryLogInput): Promise<void> {
  try {
    await ensureTable();
    const pool = await getPool();
    if (!pool) return;
    await pool.query(
      `INSERT INTO blood_email_deliveries (
        id,
        report_id,
        recipient_email,
        client_name,
        order_ref,
        status,
        quality_pass,
        quality_checks,
        sendpulse_id,
        attachment_name,
        subject,
        error_message,
        sent_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13
      )`,
      [
        randomUUID(),
        input.reportId,
        input.recipientEmail.toLowerCase(),
        input.clientName || null,
        input.orderRef || null,
        input.status,
        input.qualityPass,
        JSON.stringify(input.qualityChecks || {}),
        input.sendpulseId || null,
        input.attachmentName || null,
        input.subject || null,
        input.errorMessage || null,
        input.sentAt || null,
      ],
    );
  } catch (error) {
    console.error("[BloodDeliveryLog] Failed to persist delivery log:", error);
  }
}

const rowToDeliveryLog = (row: any): BloodDeliveryLogRow => ({
  id: String(row.id),
  reportId: String(row.report_id),
  recipientEmail: String(row.recipient_email),
  clientName: row.client_name ? String(row.client_name) : null,
  orderRef: row.order_ref ? String(row.order_ref) : null,
  status: String(row.status) as BloodDeliveryStatus,
  qualityPass: Boolean(row.quality_pass),
  qualityChecks:
    row.quality_checks && typeof row.quality_checks === "object"
      ? (row.quality_checks as Record<string, unknown>)
      : {},
  sendpulseId: row.sendpulse_id ? String(row.sendpulse_id) : null,
  attachmentName: row.attachment_name ? String(row.attachment_name) : null,
  subject: row.subject ? String(row.subject) : null,
  errorMessage: row.error_message ? String(row.error_message) : null,
  createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  sentAt: row.sent_at ? new Date(row.sent_at) : null,
});

export async function listBloodEmailDeliveries(
  filters: BloodDeliveryLogFilters = {},
): Promise<BloodDeliveryLogRow[]> {
  await ensureTable();
  const pool = await getPool();
  if (!pool) return [];

  const clauses: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (filters.email) {
    clauses.push(`LOWER(d.recipient_email) = $${index++}`);
    values.push(String(filters.email).toLowerCase());
  }
  if (filters.reportId) {
    clauses.push(`d.report_id = $${index++}`);
    values.push(String(filters.reportId));
  }
  if (filters.orderRef) {
    clauses.push(`d.order_ref = $${index++}`);
    values.push(String(filters.orderRef));
  }
  if (filters.status) {
    clauses.push(`d.status = $${index++}`);
    values.push(String(filters.status));
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = Math.max(1, Math.min(500, Number(filters.limit) || 100));
  values.push(limit);
  const limitParam = `$${index}`;

  const result = await pool.query(
    `
      SELECT
        d.*,
        br.created_at AS report_created_at_legacy,
        bt.created_at AS report_created_at_blood_tests
      FROM blood_email_deliveries d
      LEFT JOIN blood_reports br ON br.id = d.report_id
      LEFT JOIN blood_tests bt ON bt.id = d.report_id
      ${whereSql}
      ORDER BY d.created_at DESC
      LIMIT ${limitParam}
    `,
    values,
  );

  return (result.rows || []).map((row) => rowToDeliveryLog(row));
}
