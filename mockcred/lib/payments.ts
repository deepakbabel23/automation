import { sql, asUser } from "@/lib/db";
import { grantEntitlement } from "@/lib/entitlements";
import { sendReceipt } from "@/lib/email";
import type { RazorpayClient } from "@/lib/razorpay";

/**
 * Payments orchestration. Entitlements are granted ONLY by verified webhook
 * events — never by a browser redirect. The webhook reads the paying user from
 * the order/subscription `notes` we set at creation time, so it needs no
 * RLS-scoped lookup to identify them.
 */

/** Create a Razorpay order for a one-time pack purchase; record the intent. */
export async function createOrderIntent(
  userId: string,
  sku: string,
  client: RazorpayClient,
  email?: string,
): Promise<{ orderId: string; amount: number; currency: string }> {
  const [product] = await sql`
    select id, exam_id, name, currency, price_cents, is_active
    from products where sku = ${sku} and kind = 'pack'`;
  if (!product) throw new Error("product not found");
  if (!product.is_active || product.price_cents <= 0) {
    throw new Error("product is not purchasable");
  }

  const order = await client.createOrder({
    amount: product.price_cents,
    currency: product.currency,
    receipt: `pack_${sku}_${userId.slice(0, 8)}`,
    notes: { userId, productId: product.id, sku, email: email ?? "" },
  });

  await asUser(userId, (tx) =>
    tx`insert into payments (user_id, product_id, razorpay_order_id, amount_cents, currency, status)
       values (${userId}, ${product.id}, ${order.id}, ${product.price_cents}, ${product.currency}, 'created')`,
  );

  return { orderId: order.id, amount: product.price_cents, currency: product.currency };
}

/** Create a Razorpay subscription for the all-access plan; record the intent. */
export async function createSubscriptionIntent(
  userId: string,
  sku: string,
  client: RazorpayClient,
): Promise<{ subscriptionId: string; shortUrl?: string }> {
  const [product] = await sql`
    select id, razorpay_plan_id, is_active from products
    where sku = ${sku} and kind = 'subscription'`;
  if (!product) throw new Error("plan not found");
  if (!product.is_active) throw new Error("plan is not active");
  if (!product.razorpay_plan_id) throw new Error("plan has no razorpay_plan_id");

  const sub = await client.createSubscription({
    planId: product.razorpay_plan_id,
    notes: { userId, productId: product.id },
  });

  await asUser(userId, (tx) =>
    tx`insert into subscriptions (user_id, razorpay_subscription_id, status)
       values (${userId}, ${sub.id}, 'created')`,
  );

  return { subscriptionId: sub.id, shortUrl: sub.short_url };
}

async function upsertSubscription(
  userId: string,
  razorpaySubId: string,
  status: string,
  periodEnd: Date | null,
): Promise<void> {
  await asUser(userId, (tx) =>
    tx`insert into subscriptions (user_id, razorpay_subscription_id, status, current_period_end)
       values (${userId}, ${razorpaySubId}, ${status}, ${periodEnd})
       on conflict (razorpay_subscription_id) do update set
         status = excluded.status,
         current_period_end = excluded.current_period_end,
         updated_at = now()`,
  );
}

// A minimal shape of the Razorpay webhook payload we rely on.
interface RazorpayEvent {
  event: string;
  payload: {
    order?: { entity: { id: string; notes?: Record<string, string> } };
    subscription?: {
      entity: {
        id: string;
        current_end?: number;
        notes?: Record<string, string>;
      };
    };
  };
}

export interface ProcessResult {
  deduped?: boolean;
  action?: "granted_exam" | "granted_all_access" | "revoked" | "ignored";
}

/**
 * Apply a verified Razorpay webhook event. Idempotent via webhook_events.
 * The caller MUST have verified the signature before calling this.
 */
export async function processRazorpayEvent(
  event: RazorpayEvent,
  eventId: string,
): Promise<ProcessResult> {
  const dedup = await sql`
    insert into webhook_events (event_id, kind) values (${eventId}, ${event.event})
    on conflict (event_id) do nothing returning event_id`;
  if (dedup.length === 0) return { deduped: true };

  switch (event.event) {
    case "order.paid": {
      const order = event.payload.order?.entity;
      const notes = order?.notes ?? {};
      if (order && notes.userId && notes.productId) {
        const [product] = await sql`
          select id, exam_id, kind, name from products where id = ${notes.productId}`;
        if (product?.kind === "pack" && product.exam_id) {
          await grantEntitlement(notes.userId, {
            scope: "exam",
            examId: product.exam_id,
            source: "purchase",
          });
          await asUser(notes.userId, (tx) =>
            tx`update payments set status = 'paid'
               where razorpay_order_id = ${order.id}`,
          );
          await sendReceipt(
            notes.email ?? "",
            "Your MockCred purchase",
            `<p>Thanks for purchasing <strong>${product.name}</strong>. It's unlocked in your dashboard.</p>`,
          );
          return { action: "granted_exam" };
        }
      }
      return { action: "ignored" };
    }

    case "subscription.activated":
    case "subscription.charged": {
      const sub = event.payload.subscription?.entity;
      const notes = sub?.notes ?? {};
      if (sub && notes.userId) {
        const end = sub.current_end ? new Date(sub.current_end * 1000) : null;
        await upsertSubscription(notes.userId, sub.id, "active", end);
        // Refresh the all-access entitlement rather than stacking duplicates.
        await asUser(notes.userId, (tx) =>
          tx`delete from entitlements where user_id = ${notes.userId} and source = 'subscription'`,
        );
        await grantEntitlement(notes.userId, {
          scope: "all_access",
          source: "subscription",
          expiresAt: end,
        });
        return { action: "granted_all_access" };
      }
      return { action: "ignored" };
    }

    case "subscription.halted":
    case "subscription.cancelled": {
      const sub = event.payload.subscription?.entity;
      const notes = sub?.notes ?? {};
      if (sub && notes.userId) {
        await upsertSubscription(
          notes.userId,
          sub.id,
          event.event.endsWith("cancelled") ? "cancelled" : "halted",
          null,
        );
        await asUser(notes.userId, (tx) =>
          tx`update entitlements set expires_at = now()
             where user_id = ${notes.userId} and source = 'subscription'
               and (expires_at is null or expires_at > now())`,
        );
        return { action: "revoked" };
      }
      return { action: "ignored" };
    }

    default:
      return { action: "ignored" };
  }
}
