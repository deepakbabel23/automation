import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getRazorpayClient } from "@/lib/razorpay";
import { createOrderIntent } from "@/lib/payments";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const client = getRazorpayClient();
  if (!client) {
    return NextResponse.json({ error: "payments not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { sku?: string };
  if (!body.sku) return NextResponse.json({ error: "sku required" }, { status: 400 });

  try {
    const order = await createOrderIntent(user.id, body.sku, client, user.email ?? undefined);
    return NextResponse.json({ ...order, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "order failed" },
      { status: 400 },
    );
  }
}
