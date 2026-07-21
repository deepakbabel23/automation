import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { sql, asUser } from "@/lib/db";
import { parseExamSource } from "@/content/importer";
import { importExam } from "@/content/persist";
import { hasAccess, grantEntitlement } from "@/lib/entitlements";
import {
  startTimedAttempt,
  getAttemptQuestions,
  getAttemptMeta,
  submitAttempt,
} from "@/lib/attempts";

const SAMPLE = resolve(process.cwd(), "content/samples/CCAOF_Impossible_Mock_01.html");
const SLUG = "it-timed";
let examId: string;
let userId: string;

beforeAll(async () => {
  const exam = parseExamSource(readFileSync(SAMPLE, "utf8"), "html", { slug: SLUG });
  const summary = await importExam(exam, { publish: true });
  examId = summary.examId;
  userId = randomUUID();
  await sql`insert into app_users (id, auth_id, email) values (${userId}, ${"t-" + userId}, ${"t@test"})`;
});

afterEach(() => {
  delete process.env.LAUNCH_FREE_ACCESS;
});

afterAll(async () => {
  await sql`delete from app_users where id = ${userId}`;
  await sql`delete from exams where slug = ${SLUG}`;
  await sql.end();
});

describe("entitlements / hasAccess", () => {
  it("grants access to everyone during the free-only launch", async () => {
    process.env.LAUNCH_FREE_ACCESS = "true";
    expect(await hasAccess(userId, examId)).toBe(true);
  });

  it("denies access without an entitlement when the paywall is on", async () => {
    process.env.LAUNCH_FREE_ACCESS = "false";
    expect(await hasAccess(userId, examId)).toBe(false);
  });

  it("grants access via an all_access entitlement", async () => {
    process.env.LAUNCH_FREE_ACCESS = "false";
    await grantEntitlement(userId, { scope: "all_access", source: "subscription" });
    expect(await hasAccess(userId, examId)).toBe(true);
    await asUser(userId, (tx) => tx`delete from entitlements where user_id = ${userId}`);
  });

  it("scopes an exam entitlement to that exam only", async () => {
    process.env.LAUNCH_FREE_ACCESS = "false";
    await grantEntitlement(userId, { scope: "exam", examId, source: "purchase" });
    expect(await hasAccess(userId, examId)).toBe(true);
    expect(await hasAccess(userId, randomUUID())).toBe(false);
    await asUser(userId, (tx) => tx`delete from entitlements where user_id = ${userId}`);
  });
});

describe("timed attempt", () => {
  it("is locked without access", async () => {
    process.env.LAUNCH_FREE_ACCESS = "false";
    await expect(startTimedAttempt(userId, SLUG)).rejects.toThrow(/locked/);
  });

  it("covers all questions and sets a future deadline", async () => {
    process.env.LAUNCH_FREE_ACCESS = "true";
    const attemptId = await startTimedAttempt(userId, SLUG);
    const items = await getAttemptQuestions(userId, attemptId);
    expect(items).toHaveLength(60);
    const meta = await getAttemptMeta(userId, attemptId);
    expect(meta?.mode).toBe("timed");
    expect(meta?.expiresAt).toBeTruthy();
    expect(Date.parse(meta!.expiresAt!)).toBeGreaterThan(Date.now());
  });

  it("marks a past-deadline submission as expired but still scores it", async () => {
    process.env.LAUNCH_FREE_ACCESS = "true";
    const attemptId = await startTimedAttempt(userId, SLUG);
    await asUser(userId, (tx) =>
      tx`update test_attempts set expires_at = now() - interval '1 minute' where id = ${attemptId}`,
    );
    await submitAttempt(userId, attemptId, {});
    const meta = await getAttemptMeta(userId, attemptId);
    expect(meta?.status).toBe("expired");
    expect(meta?.rawPercent).toBe(0);
  });
});
