import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyPaymentSignature, verifyWebhookSignature } from "@/lib/razorpay";

const SECRET = "whsec_test_123";

function sign(body: string, secret = SECRET) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event: "order.paid", payload: {} });

  it("accepts a correctly signed body", () => {
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyWebhookSignature(body + " ", sign(body), SECRET)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    expect(verifyWebhookSignature(body, sign(body, "other"), SECRET)).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyWebhookSignature(body, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, undefined, SECRET)).toBe(false);
  });
});

describe("verifyPaymentSignature", () => {
  it("verifies the order|payment HMAC used by Checkout", () => {
    const orderId = "order_ABC";
    const paymentId = "pay_XYZ";
    const good = createHmac("sha256", SECRET).update(`${orderId}|${paymentId}`).digest("hex");
    expect(verifyPaymentSignature(orderId, paymentId, good, SECRET)).toBe(true);
    expect(verifyPaymentSignature(orderId, paymentId, "deadbeef", SECRET)).toBe(false);
  });
});
