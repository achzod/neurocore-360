import { createHash } from "node:crypto";
import { hashPeptidesReport } from "./peptidesReleaseHashGate";

export interface PeptidesManualTargetLock {
  mutation?: unknown;
  orderId?: unknown;
  reportId?: unknown;
  email?: unknown;
  expectedClientName?: unknown;
  expectedCurrentReportSha256?: unknown;
  confirmation?: unknown;
}

export interface PeptidesManualOrderTargetLock {
  mutation?: unknown;
  orderId?: unknown;
  email?: unknown;
  expectedClientName?: unknown;
  confirmation?: unknown;
}

export interface PeptidesManualMutationOrder {
  id?: unknown;
  email?: unknown;
  productType?: unknown;
  status?: unknown;
  metadata?: Record<string, unknown> | null;
}

export interface PeptidesManualMutationReportRecord {
  id?: unknown;
  email?: unknown;
  responses?: Record<string, unknown> | null;
  report?: Record<string, unknown> | null;
}

export interface PeptidesManualTargetValidation {
  ok: boolean;
  errors: string[];
  fingerprint: string;
  requiredConfirmation: string;
  currentReportSha256: string;
  target: {
    mutation: string;
    orderId: string;
    reportId: string;
    email: string;
    expectedClientName: string;
    expectedCurrentReportSha256: string;
  };
}

export interface PeptidesManualOrderTargetValidation {
  ok: boolean;
  errors: string[];
  fingerprint: string;
  requiredConfirmation: string;
  target: {
    mutation: string;
    orderId: string;
    email: string;
    expectedClientName: string;
  };
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizedEmail(value: unknown): string {
  return text(value).toLowerCase();
}

function normalizedName(value: unknown): string {
  return text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function stableJson(value: Record<string, string>): string {
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))));
}

export function buildPeptidesManualTargetFingerprint(input: {
  mutation: string;
  orderId: string;
  reportId: string;
  email: string;
  expectedClientName: string;
  expectedCurrentReportSha256: string;
}): string {
  return createHash("sha256").update(stableJson(input)).digest("hex");
}

export function buildPeptidesManualOrderTargetFingerprint(input: {
  mutation: string;
  orderId: string;
  email: string;
  expectedClientName: string;
}): string {
  return createHash("sha256").update(stableJson(input)).digest("hex");
}

export function validatePeptidesManualOrderTargetLock(input: {
  expectedMutation: string;
  targetLock?: PeptidesManualOrderTargetLock | null;
  order: PeptidesManualMutationOrder;
  responses?: Record<string, unknown> | null;
  requireConfirmation?: boolean;
}): PeptidesManualOrderTargetValidation {
  const lock = input.targetLock || {};
  const target = {
    mutation: text(lock.mutation),
    orderId: text(lock.orderId),
    email: normalizedEmail(lock.email),
    expectedClientName: text(lock.expectedClientName),
  };
  const fingerprint = buildPeptidesManualOrderTargetFingerprint(target);
  const requiredConfirmation = `CONFIRM_PEPTIDES_ORDER_TARGET:${fingerprint}`;
  const errors: string[] = [];

  for (const [key, value] of Object.entries(target)) {
    if (!value) errors.push(`ORDER_TARGET_LOCK_MISSING_${key}`);
  }
  if (target.mutation !== input.expectedMutation) errors.push("ORDER_TARGET_LOCK_MUTATION_MISMATCH");
  if (target.orderId !== text(input.order.id)) errors.push("ORDER_TARGET_LOCK_ORDER_ID_MISMATCH");
  if (target.email !== normalizedEmail(input.order.email)) errors.push("ORDER_TARGET_LOCK_EMAIL_MISMATCH");
  if (text(input.order.productType) !== "PEPTIDES_ENGINE") errors.push("ORDER_TARGET_LOCK_PRODUCT_MISMATCH");
  if (!["paid", "partial_refund"].includes(text(input.order.status))) errors.push("ORDER_TARGET_LOCK_ORDER_NOT_PAID");

  const storedResponses = input.order.metadata?.peptidesResponses;
  const sources = [
    storedResponses && typeof storedResponses === "object" ? storedResponses as Record<string, unknown> : null,
    input.responses || null,
  ].filter((value): value is Record<string, unknown> => Boolean(value));
  const responseEmails = sources.map((value) => normalizedEmail(value.pep_email)).filter(Boolean);
  if (responseEmails.some((value) => value !== target.email)) {
    errors.push("ORDER_TARGET_LOCK_RESPONSE_EMAIL_MISMATCH");
  }
  const expectedName = normalizedName(target.expectedClientName);
  const sourceNames = sources.map((value) => normalizedName(value.pep_name)).filter(Boolean);
  if (sourceNames.length < 1) {
    errors.push("ORDER_TARGET_LOCK_RESPONSE_NAME_MISSING");
  } else if (!sourceNames.every((value) => value.includes(expectedName))) {
    errors.push("ORDER_TARGET_LOCK_RESPONSE_NAME_MISMATCH");
  }

  if (input.requireConfirmation !== false && text(lock.confirmation) !== requiredConfirmation) {
    errors.push("ORDER_TARGET_LOCK_CONFIRMATION_MISMATCH");
  }

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    fingerprint,
    requiredConfirmation,
    target,
  };
}

export function validatePeptidesManualTargetLock(input: {
  expectedMutation: string;
  targetLock?: PeptidesManualTargetLock | null;
  order: PeptidesManualMutationOrder;
  reportRecord: PeptidesManualMutationReportRecord;
  allowUnlinkedReport?: boolean;
  requireConfirmation?: boolean;
}): PeptidesManualTargetValidation {
  const lock = input.targetLock || {};
  const target = {
    mutation: text(lock.mutation),
    orderId: text(lock.orderId),
    reportId: text(lock.reportId),
    email: normalizedEmail(lock.email),
    expectedClientName: text(lock.expectedClientName),
    expectedCurrentReportSha256: text(lock.expectedCurrentReportSha256).toLowerCase(),
  };
  const currentReport = input.reportRecord.report || {};
  const currentReportSha256 = hashPeptidesReport(currentReport);
  const fingerprint = buildPeptidesManualTargetFingerprint(target);
  const requiredConfirmation = `CONFIRM_PEPTIDES_TARGET:${fingerprint}`;
  const errors: string[] = [];

  for (const [key, value] of Object.entries(target)) {
    if (!value) errors.push(`TARGET_LOCK_MISSING_${key}`);
  }
  if (target.mutation !== input.expectedMutation) errors.push("TARGET_LOCK_MUTATION_MISMATCH");
  if (target.orderId !== text(input.order.id)) errors.push("TARGET_LOCK_ORDER_ID_MISMATCH");
  if (target.reportId !== text(input.reportRecord.id)) errors.push("TARGET_LOCK_REPORT_ID_MISMATCH");
  if (target.email !== normalizedEmail(input.order.email)) errors.push("TARGET_LOCK_ORDER_EMAIL_MISMATCH");

  const reportEmail = normalizedEmail(input.reportRecord.email).replace(/^peptides::/, "");
  if (target.email !== reportEmail) errors.push("TARGET_LOCK_REPORT_EMAIL_MISMATCH");

  if (text(input.order.productType) !== "PEPTIDES_ENGINE") errors.push("TARGET_LOCK_PRODUCT_MISMATCH");
  if (!["paid", "partial_refund"].includes(text(input.order.status))) errors.push("TARGET_LOCK_ORDER_NOT_PAID");

  const linkedReportId = text(input.order.metadata?.peptidesReportId);
  if (!input.allowUnlinkedReport && linkedReportId !== target.reportId) {
    errors.push("TARGET_LOCK_LINKED_REPORT_MISMATCH");
  }

  const reportClientName = text(currentReport.clientName);
  if (reportClientName && normalizedName(target.expectedClientName) !== normalizedName(reportClientName)) {
    errors.push("TARGET_LOCK_CLIENT_NAME_MISMATCH");
  }

  const responseEmails = [
    input.order.metadata?.peptidesResponses && typeof input.order.metadata.peptidesResponses === "object"
      ? (input.order.metadata.peptidesResponses as Record<string, unknown>).pep_email
      : undefined,
    input.reportRecord.responses?.pep_email,
  ].map(normalizedEmail).filter(Boolean);
  if (responseEmails.some((value) => value !== target.email)) {
    errors.push("TARGET_LOCK_RESPONSE_EMAIL_MISMATCH");
  }

  const sourceNames = [
    input.order.metadata?.peptidesResponses && typeof input.order.metadata.peptidesResponses === "object"
      ? (input.order.metadata.peptidesResponses as Record<string, unknown>).pep_name
      : undefined,
    input.reportRecord.responses?.pep_name,
  ].map(normalizedName).filter(Boolean);
  const expectedName = normalizedName(target.expectedClientName);
  if (sourceNames.length < 1) {
    errors.push("TARGET_LOCK_RESPONSE_NAME_MISSING");
  } else if (!sourceNames.every((value) => value.includes(expectedName))) {
    errors.push("TARGET_LOCK_RESPONSE_NAME_MISMATCH");
  }

  if (!/^[a-f0-9]{64}$/.test(target.expectedCurrentReportSha256)) {
    errors.push("TARGET_LOCK_REPORT_HASH_INVALID");
  } else if (target.expectedCurrentReportSha256 !== currentReportSha256) {
    errors.push("TARGET_LOCK_REPORT_HASH_MISMATCH");
  }

  if (input.requireConfirmation !== false && text(lock.confirmation) !== requiredConfirmation) {
    errors.push("TARGET_LOCK_CONFIRMATION_MISMATCH");
  }

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    fingerprint,
    requiredConfirmation,
    currentReportSha256,
    target,
  };
}
