import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "@/lib/db";
import { parseExamSource } from "@/content/importer";
import { importExam } from "@/content/persist";
import {
  startPracticeAttempt,
  getAttemptQuestions,
  getAttemptMeta,
  getAttemptReview,
  submitAttempt,
} from "@/lib/attempts";

const SAMPLE = resolve(process.cwd(), "content/samples/CCAOF_Impossible_Mock_01.html");
const SLUG = "it-attempts";
let userId: string;
let otherUserId: string;

beforeAll(async () => {
  const exam = parseExamSource(readFileSync(SAMPLE, "utf8"), "html", { slug: SLUG });
  await importExam(exam, { freeExternalIds: [1, 2, 3, 4, 5], publish: true });
  userId = randomUUID();
  otherUserId = randomUUID();
  await sql`insert into app_users (id, auth_id, email) values
    (${userId}, ${"u-" + userId}, ${"u@test"}),
    (${otherUserId}, ${"o-" + otherUserId}, ${"o@test"})`;
});

afterAll(async () => {
  await sql`delete from app_users where id in (${userId}, ${otherUserId})`;
  await sql`delete from exams where slug = ${SLUG}`;
  await sql.end();
});

async function correctAnswersFor(attemptId: string): Promise<Record<string, string[]>> {
  const items = await getAttemptQuestions(userId, attemptId);
  const ids = items.map((i) => i.question.id);
  const rows = await sql`
    select question_id, letter from question_options
    where question_id in ${sql(ids)} and is_correct = true`;
  const map: Record<string, string[]> = {};
  for (const r of rows) (map[r.question_id] ??= []).push(r.letter);
  return map;
}

describe("free practice attempt", () => {
  it("starts an attempt over the free questions only", async () => {
    const attemptId = await startPracticeAttempt(userId, SLUG);
    const items = await getAttemptQuestions(userId, attemptId);
    expect(items).toHaveLength(5);
  });

  it("NEVER leaks correct answers or explanations while in progress", async () => {
    const attemptId = await startPracticeAttempt(userId, SLUG);
    const items = await getAttemptQuestions(userId, attemptId);
    for (const { question } of items) {
      for (const opt of question.options) {
        expect(Object.keys(opt).sort()).toEqual(["letter", "text"]);
        expect(opt).not.toHaveProperty("isCorrect");
        expect(opt).not.toHaveProperty("explanation");
      }
    }
    // And the raw serialized payload contains no explanation text.
    expect(JSON.stringify(items)).not.toMatch(/explanation/i);
  });

  it("scores a fully-correct submission as 100% and passing", async () => {
    const attemptId = await startPracticeAttempt(userId, SLUG);
    const answers = await correctAnswersFor(attemptId);
    const result = await submitAttempt(userId, attemptId, answers);
    expect(result.score.percentage).toBe(100);
    expect(result.score.scaled).toBe(1000);
    expect(result.passed).toBe(true);

    const meta = await getAttemptMeta(userId, attemptId);
    expect(meta?.status).toBe("submitted");
    expect(meta?.rawPercent).toBe(100);
  });

  it("reveals correct answers + explanations only AFTER submission", async () => {
    const attemptId = await startPracticeAttempt(userId, SLUG);
    await submitAttempt(userId, attemptId, {});
    const review = await getAttemptReview(userId, attemptId);
    expect(review).toHaveLength(5);
    const hasCorrect = review.every((r) => r.options.some((o) => o.isCorrect));
    expect(hasCorrect).toBe(true);
    // Empty submission scores 0.
    const meta = await getAttemptMeta(userId, attemptId);
    expect(meta?.rawPercent).toBe(0);
    expect(meta?.passed).toBe(false);
  });

  it("refuses to submit an attempt twice", async () => {
    const attemptId = await startPracticeAttempt(userId, SLUG);
    await submitAttempt(userId, attemptId, {});
    await expect(submitAttempt(userId, attemptId, {})).rejects.toThrow(/already submitted/);
  });

  it("does not expose one user's attempt to another (RLS)", async () => {
    const attemptId = await startPracticeAttempt(userId, SLUG);
    const seenByOther = await getAttemptMeta(otherUserId, attemptId);
    expect(seenByOther).toBeNull();
  });
});
