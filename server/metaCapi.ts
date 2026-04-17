// Meta Conversions API (CAPI) — server-side event tracking
//
// Purpose: send Purchase / Lead / InitiateCheckout events directly to Meta from
// the backend, which survives Safari ITP, ad-blockers, and browser tab closure.
// Standard observation: 30–50% of client-side Pixel events are lost in 2026 —
// CAPI recovers them.
//
// Deduplication with the client-side Pixel: pass the SAME event_id on both sides
// (e.g., `stripe_${session.id}`). Meta dedups within a 7-day window.
//
// Environment variables:
//   META_PIXEL_ID       — numeric pixel id (same value as the client Pixel)
//   META_ACCESS_TOKEN   — system-user token with `ads_management` scope on the pixel
//   META_TEST_EVENT_CODE (optional) — shown in Events Manager "Test Events" tab while debugging
//
// This module NEVER throws upwards: any network / auth failure is logged and
// swallowed, so a Meta outage can never block a Stripe / PayPal checkout flow.

import crypto from "crypto";

const GRAPH_API_VERSION = "v19.0";

type MetaEventName =
  | "Purchase"
  | "Lead"
  | "InitiateCheckout"
  | "ViewContent"
  | "CompleteRegistration";

interface MetaUserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  externalId?: string | null;
}

interface MetaCustomData {
  value?: number;
  currency?: string;
  content_ids?: string[];
  content_name?: string;
  content_type?: string;
  content_category?: string;
  num_items?: number;
  order_id?: string;
  [key: string]: unknown;
}

interface SendMetaEventArgs {
  eventName: MetaEventName;
  eventId: string;
  eventSourceUrl: string;
  userData: MetaUserData;
  customData?: MetaCustomData;
  // `website` for events from a webpage/webhook flow.
  // `system_generated` for events triggered purely server-side with no user
  // action (e.g., renewal). We use `website` everywhere by default.
  actionSource?: "website" | "system_generated" | "email" | "physical_store";
  eventTimeSeconds?: number;
}

interface SendMetaEventResult {
  ok: boolean;
  skipped?: boolean;
  error?: unknown;
  fbtrace_id?: string;
}

function sha256Lower(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return undefined;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function sha256PhoneE164(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  // Strip everything non-digit. Meta wants E.164 without the leading +.
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return undefined;
  return crypto.createHash("sha256").update(digits).digest("hex");
}

function cleanIp(ip: string | null | undefined): string | undefined {
  if (!ip) return undefined;
  // Express can give us "::ffff:1.2.3.4" for IPv4-in-IPv6 — strip the prefix.
  const stripped = ip.replace(/^::ffff:/, "").trim();
  if (!stripped || stripped === "::1" || stripped === "127.0.0.1") return undefined;
  return stripped;
}

export async function sendMetaEvent(args: SendMetaEventArgs): Promise<SendMetaEventResult> {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;
  const testEventCode = process.env.META_TEST_EVENT_CODE;

  if (!pixelId || !accessToken) {
    console.warn(`[CAPI] ${args.eventName}: META_PIXEL_ID or META_ACCESS_TOKEN missing — skipping`);
    return { ok: false, skipped: true };
  }

  const emailHash = sha256Lower(args.userData.email);
  const phoneHash = sha256PhoneE164(args.userData.phone);
  const firstNameHash = sha256Lower(args.userData.firstName);
  const lastNameHash = sha256Lower(args.userData.lastName);
  const externalIdHash = sha256Lower(args.userData.externalId);

  const userData: Record<string, unknown> = {};
  if (emailHash) userData.em = [emailHash];
  if (phoneHash) userData.ph = [phoneHash];
  if (firstNameHash) userData.fn = [firstNameHash];
  if (lastNameHash) userData.ln = [lastNameHash];
  if (externalIdHash) userData.external_id = [externalIdHash];
  if (args.userData.fbp) userData.fbp = args.userData.fbp;
  if (args.userData.fbc) userData.fbc = args.userData.fbc;
  const ip = cleanIp(args.userData.ip);
  if (ip) userData.client_ip_address = ip;
  if (args.userData.userAgent) userData.client_user_agent = args.userData.userAgent;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: args.eventName,
        event_time: args.eventTimeSeconds ?? Math.floor(Date.now() / 1000),
        event_id: args.eventId,
        event_source_url: args.eventSourceUrl,
        action_source: args.actionSource ?? "website",
        user_data: userData,
        custom_data: args.customData ?? {},
      },
    ],
  };
  if (testEventCode) {
    payload.test_event_code = testEventCode;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const bodyText = await response.text();
    let body: any;
    try {
      body = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      body = { raw: bodyText };
    }

    if (!response.ok || body?.error) {
      console.error(
        `[CAPI] ${args.eventName} (${args.eventId}) failed — status=${response.status} error=${JSON.stringify(body?.error ?? body).slice(0, 400)}`
      );
      return { ok: false, error: body?.error ?? body };
    }

    console.log(
      `[CAPI] ${args.eventName} ok — event_id=${args.eventId} fbtrace=${body?.fbtrace_id ?? "n/a"} received=${body?.events_received ?? "?"}${testEventCode ? " [TEST]" : ""}`
    );
    return { ok: true, fbtrace_id: body?.fbtrace_id };
  } catch (err) {
    console.error(`[CAPI] ${args.eventName} (${args.eventId}) exception:`, err instanceof Error ? err.message : err);
    return { ok: false, error: err };
  }
}

// Convenience wrapper for Stripe/PayPal purchase events.
export async function sendMetaPurchase(args: {
  eventId: string;
  eventSourceUrl: string;
  valueEUR: number;
  currency?: string;
  contentIds?: string[];
  contentName?: string;
  orderId?: string;
  userData: MetaUserData;
}): Promise<SendMetaEventResult> {
  return sendMetaEvent({
    eventName: "Purchase",
    eventId: args.eventId,
    eventSourceUrl: args.eventSourceUrl,
    userData: args.userData,
    customData: {
      value: args.valueEUR,
      currency: args.currency ?? "EUR",
      content_ids: args.contentIds,
      content_name: args.contentName,
      content_type: "product",
      order_id: args.orderId,
      num_items: args.contentIds?.length ?? 1,
    },
  });
}

// Convenience wrapper for Lead events (questionnaire submitted, free audit started, etc.)
export async function sendMetaLead(args: {
  eventId: string;
  eventSourceUrl: string;
  valueEUR?: number;
  currency?: string;
  contentName?: string;
  category?: string;
  userData: MetaUserData;
}): Promise<SendMetaEventResult> {
  return sendMetaEvent({
    eventName: "Lead",
    eventId: args.eventId,
    eventSourceUrl: args.eventSourceUrl,
    userData: args.userData,
    customData: {
      value: args.valueEUR ?? 0,
      currency: args.currency ?? "EUR",
      content_name: args.contentName,
      content_category: args.category,
    },
  });
}
