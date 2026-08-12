import crypto from "node:crypto";

/**
 * Knowledge routes expose proprietary source material and operational actions.
 * They are admin-only, including read/debug endpoints.
 */
export function isKnowledgeAdminKeyValid(
  candidate: unknown,
  validKey = process.env.ADMIN_SECRET || process.env.ADMIN_KEY,
): boolean {
  if (typeof candidate !== "string" || !candidate || !validKey) return false;

  const candidateBuffer = Buffer.from(candidate);
  const validBuffer = Buffer.from(validKey);
  if (candidateBuffer.length !== validBuffer.length) return false;

  return crypto.timingSafeEqual(candidateBuffer, validBuffer);
}
