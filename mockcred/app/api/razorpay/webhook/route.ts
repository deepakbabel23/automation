import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { processRazorpayEvent } from "@/lib/payments";

// Razorpay signs the RAW body — do not parse before verifying.
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!verifyWebhookSignature(raw, signature, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const eventId =
    req.headers.get("x-razorpay-event-id") ||
    createHash("sha256").update(raw).digest("hex");

  try {
    const result = await processRazorpayEvent(
      event as Parameters<typeof processRazorpayEvent>[0],
      eventId,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    // Log and 500 so Razorpay retries a genuinely failed handler.
    console.error("razorpay webhook error", err);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }
}
