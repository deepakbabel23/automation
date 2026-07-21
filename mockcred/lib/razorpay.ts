import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay helpers. Signature verification is pure (deterministic HMAC) so it is
 * unit-testable offline. The API client is an interface so tests inject a mock;
 * live calls need RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.
 */

function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Verify a webhook: HMAC-SHA256 of the RAW body, keyed by the webhook secret. */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Verify a Checkout callback: HMAC-SHA256 of `${orderId}|${paymentId}`. */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

export interface CreateOrderInput {
  amount: number; // in the currency's smallest unit (e.g. cents)
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
}
export interface CreateSubscriptionInput {
  planId: string;
  totalCount?: number;
  notes?: Record<string, string>;
}

export interface RazorpayClient {
  createOrder(input: CreateOrderInput): Promise<{ id: string }>;
  createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<{ id: string; short_url?: string }>;
}

/** Real client over Razorpay's REST API (no SDK dependency). */
export function restRazorpayClient(keyId: string, keySecret: string): RazorpayClient {
  const auth = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  async function call(path: string, body: unknown) {
    const res = await fetch(`https://api.razorpay.com/v1${path}`, {
      method: "POST",
      headers: { authorization: auth, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Razorpay ${path} failed: ${res.status} ${await res.text()}`);
    }
    return res.json();
  }
  return {
    createOrder: (input) =>
      call("/orders", {
        amount: input.amount,
        currency: input.currency,
        receipt: input.receipt,
        notes: input.notes,
      }),
    createSubscription: (input) =>
      call("/subscriptions", {
        plan_id: input.planId,
        total_count: input.totalCount ?? 12,
        notes: input.notes,
      }),
  };
}

/** Client from env, or null when keys aren't configured (offline/free-only). */
export function getRazorpayClient(): RazorpayClient | null {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) return null;
  return restRazorpayClient(id, secret);
}
