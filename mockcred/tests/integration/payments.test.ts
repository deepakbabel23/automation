import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql, asUser } from "@/lib/db";
import { parseExamSource } from "@/content/importer";
import { importExam } from "@/content/persist";
import { hasAccess } from "@/lib/entitlements";
import {
  createOrderIntent,
  createSubscriptionIntent,
  processRazorpayEvent,
} from "@/lib/payments";
import type { RazorpayClient } from "@/lib/razorpay";

const SAMPLE = resolve(process.cwd(), "content/samples/CCAOF_Impossible_Mock_01.html");
const SLUG = "it-pay";
let examId: string;
let userId: string;

// Mock Razorpay client — deterministic ids, no network.
const mockClient: RazorpayClient = {
  createOrder: async () => ({ id: "order_" + randomUUID().slice(0, 8) }),
  createSubscription: async () => ({ id: "sub_" + randomUUID().slice(0, 8) }),
};

beforeAll(async () => {
  const exam = parseExamSource(readFileSync(SAMPLE, "utf8"), "html", { slug: SLUG });
  const summary = await importExam(exam, { publish: true });
  examId = summary.examId;

  await sql`insert into products (sku, kind, exam_id, name, currency, price_cents, is_active)
    values (${"it-pack"}, 'pack', ${examId}, ${"IT Pack"}, 'USD', 4999, true)
    on conflict (sku) do update set is_active = true, price_cents = 4999, exam_id = ${examId}`;
  await sql`insert into products (sku, kind, name, currency, price_cents, interval, razorpay_plan_id, is_active)
    values (${"it-sub"}, 'subscription', ${"IT All-Access"}, 'USD', 1900, 'month', ${"plan_test"}, true)
    on conflict (sku) do update set is_active = true, razorpay_plan_id = ${"plan_test"}`;

  // Paywall ON so entitlements actually matter.
  process.env.LAUNCH_FREE_ACCESS = "false";
});

beforeEach(async () => {
  userId = randomUUID();
  await sql`insert into app_users (id, auth_id, email) values (${userId}, ${"p-" + userId}, ${"p@test"})`;
});

afterAll(async () => {
  delete process.env.LAUNCH_FREE_ACCESS;
  await sql`delete from products where sku in (${"it-pack"}, ${"it-sub"})`;
  await sql`delete from exams where slug = ${SLUG}`;
  await sql.end();
});

function orderPaid(orderId: string, notes: Record<string, string>) {
  return {
    event: "order.paid",
    payload: { order: { entity: { id: orderId, notes } } },
  };
}
function subscriptionEvent(
  type: string,
  subId: string,
  notes: Record<string, string>,
  currentEnd?: number,
) {
  return {
    event: type,
    payload: { subscription: { entity: { id: subId, notes, current_end: currentEnd } } },
  };
}

describe("one-time pack purchase", () => {
  it("records an order intent and does not grant until the webhook", async () => {
    const { orderId } = await createOrderIntent(userId, "it-pack", mockClient, "p@test");
    expect(orderId).toMatch(/^order_/);
    const payments = await asUser(userId, (tx) =>
      tx`select status from payments where razorpay_order_id = ${orderId}`,
    );
    expect(payments[0].status).toBe("created");
    expect(await hasAccess(userId, examId)).toBe(false);
  });

  it("grants an exam entitlement on order.paid", async () => {
    const { orderId } = await createOrderIntent(userId, "it-pack", mockClient, "p@test");
    const res = await processRazorpayEvent(
      orderPaid(orderId, { userId, productId: (await productId("it-pack")) }) as Parameters<typeof processRazorpayEvent>[0],
      "evt_" + orderId,
    );
    expect(res.action).toBe("granted_exam");
    expect(await hasAccess(userId, examId)).toBe(true);
    const payments = await asUser(userId, (tx) =>
      tx`select status from payments where razorpay_order_id = ${orderId}`,
    );
    expect(payments[0].status).toBe("paid");
  });

  it("is idempotent for a duplicate event id", async () => {
    const { orderId } = await createOrderIntent(userId, "it-pack", mockClient, "p@test");
    const pid = await productId("it-pack");
    const evt = orderPaid(orderId, { userId, productId: pid });
    const eventId = "evt_dup_" + orderId;
    await processRazorpayEvent(evt as Parameters<typeof processRazorpayEvent>[0], eventId);
    const second = await processRazorpayEvent(evt as Parameters<typeof processRazorpayEvent>[0], eventId);
    expect(second.deduped).toBe(true);
    const grants = await asUser(userId, (tx) =>
      tx`select count(*)::int as n from entitlements where user_id = ${userId}`,
    );
    expect(grants[0].n).toBe(1);
  });
});

describe("subscription", () => {
  it("grants all-access on subscription.activated and revokes on cancel", async () => {
    const { subscriptionId } = await createSubscriptionIntent(userId, "it-sub", mockClient);
    const end = Math.floor(Date.now() / 1000) + 30 * 24 * 3600;

    const activated = await processRazorpayEvent(
      subscriptionEvent("subscription.activated", subscriptionId, { userId }, end) as Parameters<typeof processRazorpayEvent>[0],
      "evt_sub_act_" + subscriptionId,
    );
    expect(activated.action).toBe("granted_all_access");
    expect(await hasAccess(userId, examId)).toBe(true);

    const cancelled = await processRazorpayEvent(
      subscriptionEvent("subscription.cancelled", subscriptionId, { userId }) as Parameters<typeof processRazorpayEvent>[0],
      "evt_sub_cancel_" + subscriptionId,
    );
    expect(cancelled.action).toBe("revoked");
    expect(await hasAccess(userId, examId)).toBe(false);
  });
});

async function productId(sku: string): Promise<string> {
  const [p] = await sql`select id from products where sku = ${sku}`;
  return p.id as string;
}
