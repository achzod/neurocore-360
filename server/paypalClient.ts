/**
 * PayPal REST API v2 Client
 * Direct HTTP integration — no npm dependency needed.
 */

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_MODE = process.env.PAYPAL_MODE || "sandbox";

const PAYPAL_BASE_URL =
  PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// Cached access token
let cachedToken: { token: string; expiresAt: number } | null = null;

export function isPayPalConfigured(): boolean {
  return !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
}

export async function getPayPalAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s margin)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal OAuth2 failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

interface CreatePayPalOrderParams {
  amountEur: string; // e.g. "59.00"
  description: string;
  returnUrl: string;
  cancelUrl: string;
  customId?: string; // internal order ID
}

interface PayPalOrderResult {
  paypalOrderId: string;
  approvalUrl: string;
}

export async function createPayPalOrder(
  params: CreatePayPalOrderParams
): Promise<PayPalOrderResult> {
  const token = await getPayPalAccessToken();

  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "EUR",
          value: params.amountEur,
        },
        description: params.description,
        ...(params.customId ? { custom_id: params.customId } : {}),
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: "APEXLABS by ACHZOD",
          landing_page: "LOGIN",
          user_action: "PAY_NOW",
          return_url: params.returnUrl,
          cancel_url: params.cancelUrl,
        },
      },
    },
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `PayPal create order failed (${response.status}): ${text}`
    );
  }

  const order = await response.json();
  const approvalLink = order.links?.find(
    (l: any) => l.rel === "payer-action"
  );

  if (!approvalLink?.href) {
    throw new Error("PayPal order created but no approval URL returned");
  }

  return {
    paypalOrderId: order.id,
    approvalUrl: approvalLink.href,
  };
}

interface CaptureResult {
  status: string; // "COMPLETED"
  payerEmail: string;
  captureId: string;
}

export async function capturePayPalOrder(
  paypalOrderId: string
): Promise<CaptureResult> {
  const token = await getPayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `PayPal capture failed (${response.status}): ${text}`
    );
  }

  const data = await response.json();
  const capture =
    data.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    status: data.status, // "COMPLETED"
    payerEmail:
      data.payer?.email_address || data.payment_source?.paypal?.email_address || "",
    captureId: capture?.id || "",
  };
}

export async function getPayPalOrderDetails(
  paypalOrderId: string
): Promise<any> {
  const token = await getPayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_BASE_URL}/v2/checkout/orders/${paypalOrderId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `PayPal get order failed (${response.status}): ${text}`
    );
  }

  return response.json();
}
