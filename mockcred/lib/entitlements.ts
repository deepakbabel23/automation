import { asUser } from "@/lib/db";
import { launchFreeAccess } from "@/lib/env";

export type EntitlementScope = "exam" | "all_access";
export type EntitlementSource = "purchase" | "subscription" | "grant";

export interface GrantOptions {
  scope: EntitlementScope;
  examId?: string | null;
  source: EntitlementSource;
  expiresAt?: Date | null;
}

/**
 * The single access-control gate. Full timed mocks are locked behind this;
 * free sample questions bypass it (they are handled separately).
 *
 * Access is granted when:
 *  - LAUNCH_FREE_ACCESS is on (free-only launch phase — nothing is charged yet), OR
 *  - the user holds an unexpired `all_access` entitlement, OR
 *  - the user holds an unexpired `exam` entitlement covering this exam.
 */
export async function hasAccess(userId: string, examId: string): Promise<boolean> {
  if (launchFreeAccess()) return true;
  const rows = await asUser(userId, (tx) =>
    tx`select 1 from entitlements
       where user_id = ${userId}
         and (expires_at is null or expires_at > now())
         and (scope = 'all_access' or (scope = 'exam' and exam_id = ${examId}))
       limit 1`,
  );
  return rows.length > 0;
}

/** Grant an entitlement (used by the Razorpay webhook and by tests/admin). */
export async function grantEntitlement(
  userId: string,
  opts: GrantOptions,
): Promise<void> {
  await asUser(userId, (tx) =>
    tx`insert into entitlements (user_id, scope, exam_id, source, expires_at)
       values (${userId}, ${opts.scope}, ${opts.examId ?? null}, ${opts.source}, ${opts.expiresAt ?? null})`,
  );
}
