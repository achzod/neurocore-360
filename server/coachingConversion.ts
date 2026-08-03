import crypto from "node:crypto";

export type CoachingOrderConversion = {
  orderId: string;
  email: string;
  amountCents: number;
  status: "processing" | "completed";
  couponCodes: string[];
  productNames: string[];
};

const paidStatuses = new Set(["processing", "completed"]);
const coachingProductPattern = /\b(coaching|essential|elite|private\s*lab|accompagnement)\b/i;

export function verifyWooWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secret: string,
): boolean {
  if (!rawBody.length || !signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature.trim());
  return expectedBuffer.length === receivedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function parseCoachingOrderWebhook(body: unknown): CoachingOrderConversion | null {
  if (!body || typeof body !== "object") return null;
  const payload = body as Record<string, any>;
  const status = String(payload.status || "").trim().toLowerCase();
  if (!paidStatuses.has(status)) return null;

  const orderId = String(payload.id || payload.order_id || "").trim();
  const email = String(payload.billing?.email || payload.email || "").trim().toLowerCase();
  if (!orderId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  const couponCodes = Array.isArray(payload.coupon_lines)
    ? payload.coupon_lines.map((line: any) => String(line?.code || "").trim().toUpperCase()).filter(Boolean)
    : [];
  const productNames = Array.isArray(payload.line_items)
    ? payload.line_items.map((line: any) => String(line?.name || "").trim()).filter(Boolean)
    : [];
  const isCoachingOrder = couponCodes.includes("DISCOVERY30")
    || productNames.some((name) => coachingProductPattern.test(name));
  if (!isCoachingOrder) return null;

  const total = Number.parseFloat(String(payload.total ?? "0").replace(",", "."));
  const amountCents = Number.isFinite(total) && total > 0 ? Math.round(total * 100) : 0;

  return {
    orderId,
    email,
    amountCents,
    status: status as "processing" | "completed",
    couponCodes,
    productNames,
  };
}

export function coachingConversionTrackingId(orderId: string): string {
  const hex = crypto.createHash("sha256").update(`achzod-coaching:${orderId}`).digest("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
