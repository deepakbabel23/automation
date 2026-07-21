import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql, asUser } from "@/lib/db";
import { parseExamSource } from "@/content/importer";
import { importExam } from "@/content/persist";

const SAMPLE = resolve(process.cwd(), "content/samples/CCAOF_Impossible_Mock_01.html");

let examId: string;

beforeAll(async () => {
  const exam = parseExamSource(readFileSync(SAMPLE, "utf8"), "html", {
    slug: "it-ccao-f",
  });
  const summary = await importExam(exam, { freeExternalIds: [1, 2, 3], publish: true });
  examId = summary.examId;
});

afterAll(async () => {
  await sql`delete from exams where slug = ${"it-ccao-f"}`;
  await sql.end();
});

describe("importExam", () => {
  it("persists the exam with domains, cases, questions and options", async () => {
    const [{ count: qCount }] = await sql`
      select count(*)::int as count from questions where exam_id = ${examId}`;
    expect(qCount).toBe(60);

    const [{ count: dCount }] = await sql`
      select count(*)::int as count from exam_domains where exam_id = ${examId}`;
    expect(dCount).toBe(7);

    const [{ count: cCount }] = await sql`
      select count(*)::int as count from case_studies where exam_id = ${examId}`;
    expect(cCount).toBe(1);

    const [{ count: optCount }] = await sql`
      select count(*)::int as count from question_options o
      join questions q on q.id = o.question_id where q.exam_id = ${examId}`;
    expect(optCount).toBeGreaterThan(60 * 3);
  });

  it("flags exactly the requested free questions", async () => {
    const [{ count }] = await sql`
      select count(*)::int as count from questions
      where exam_id = ${examId} and is_free = true`;
    expect(count).toBe(3);
  });

  it("is idempotent — re-importing does not duplicate", async () => {
    const exam = parseExamSource(readFileSync(SAMPLE, "utf8"), "html", { slug: "it-ccao-f" });
    await importExam(exam, { freeExternalIds: [1, 2, 3], publish: true });
    const [{ count }] = await sql`
      select count(*)::int as count from questions where exam_id = ${examId}`;
    expect(count).toBe(60);
  });
});

describe("row-level security", () => {
  it("isolates one user's attempts from another's", async () => {
    const userA = randomUUID();
    const userB = randomUUID();
    await sql`insert into app_users (id, auth_id, email) values
      (${userA}, ${"a-" + userA}, ${"a@test"}),
      (${userB}, ${"b-" + userB}, ${"b@test"})`;

    // User A creates an attempt (GUC set to A -> passes with-check).
    const attemptId = await asUser(userA, async (tx) => {
      const [row] = await tx`
        insert into test_attempts (user_id, exam_id, mode)
        values (${userA}, ${examId}, ${"practice"}) returning id`;
      return row.id as string;
    });
    expect(attemptId).toBeTruthy();

    // User A sees their own attempt.
    const seenByA = await asUser(userA, (tx) =>
      tx`select id from test_attempts where id = ${attemptId}`,
    );
    expect(seenByA).toHaveLength(1);

    // User B cannot see it.
    const seenByB = await asUser(userB, (tx) =>
      tx`select id from test_attempts where id = ${attemptId}`,
    );
    expect(seenByB).toHaveLength(0);

    // With no GUC set, forced RLS hides all rows.
    const seenByNone = await sql`select id from test_attempts where id = ${attemptId}`;
    expect(seenByNone).toHaveLength(0);

    await sql`delete from app_users where id in (${userA}, ${userB})`;
  });

  it("prevents inserting an attempt for a different user", async () => {
    const userA = randomUUID();
    const userB = randomUUID();
    await sql`insert into app_users (id, auth_id) values
      (${userA}, ${"a2-" + userA}), (${userB}, ${"b2-" + userB})`;

    await expect(
      asUser(userA, (tx) =>
        tx`insert into test_attempts (user_id, exam_id) values (${userB}, ${examId})`,
      ),
    ).rejects.toThrow();

    await sql`delete from app_users where id in (${userA}, ${userB})`;
  });
});
