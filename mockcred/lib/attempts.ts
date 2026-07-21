import { sql, asUser } from "@/lib/db";
import { scoreAttempt, type AnswerOutcome, type ScoreResult } from "@/lib/scoring";

/** A question as sent to the client DURING an attempt — never includes which
 * option is correct or any explanation. */
export interface ClientQuestion {
  id: string;
  externalId: number | null;
  domainNo: number;
  domainName: string;
  caseKey: string | null;
  caseScenario: string | null;
  variant: string | null;
  selection: "single" | "multi";
  answerCount: number | null;
  stem: string;
  options: { letter: string; text: string }[];
}

export interface AttemptMeta {
  id: string;
  examId: string;
  examSlug: string;
  examTitle: string;
  examCode: string;
  passScaled: number;
  masteryBenchmark: number;
  mode: "practice" | "timed";
  status: "in_progress" | "submitted" | "expired";
  scaledScore: number | null;
  rawPercent: number | null;
  passed: boolean | null;
}

const eqSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join(",") === [...b].sort().join(",");

/** Start a free practice attempt over an exam's free questions. Returns id. */
export async function startPracticeAttempt(userId: string, slug: string): Promise<string> {
  const [exam] = await sql`
    select id from exams where slug = ${slug} and is_published = true`;
  if (!exam) throw new Error("exam not found or not published");

  const questions = await sql`
    select id from questions where exam_id = ${exam.id} and is_free = true
    order by position`;
  if (questions.length === 0) throw new Error("exam has no free questions");

  return asUser(userId, async (tx) => {
    const [attempt] = await tx`
      insert into test_attempts (user_id, exam_id, mode, status)
      values (${userId}, ${exam.id}, 'practice', 'in_progress') returning id`;
    for (const q of questions) {
      await tx`insert into attempt_answers (attempt_id, question_id)
        values (${attempt.id}, ${q.id})`;
    }
    return attempt.id as string;
  });
}

/** Attempt metadata for the owning user (RLS-enforced). Null if not theirs. */
export async function getAttemptMeta(
  userId: string,
  attemptId: string,
): Promise<AttemptMeta | null> {
  const rows = await asUser(userId, (tx) =>
    tx`select a.id, a.exam_id, a.mode, a.status, a.scaled_score, a.raw_percent, a.passed,
              e.slug, e.title, e.exam_code, e.pass_scaled, e.mastery_benchmark
       from test_attempts a join exams e on e.id = a.exam_id
       where a.id = ${attemptId}`,
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    examId: r.exam_id,
    examSlug: r.slug,
    examTitle: r.title,
    examCode: r.exam_code,
    passScaled: r.pass_scaled,
    masteryBenchmark: r.mastery_benchmark,
    mode: r.mode,
    status: r.status,
    scaledScore: r.scaled_score,
    rawPercent: r.raw_percent,
    passed: r.passed,
  };
}

/** The attempt's questions WITHOUT answers, plus any prior selections. */
export async function getAttemptQuestions(
  userId: string,
  attemptId: string,
): Promise<{ question: ClientQuestion; selected: string[] }[]> {
  const answerRows = await asUser(userId, (tx) =>
    tx`select question_id, selected from attempt_answers where attempt_id = ${attemptId}`,
  );
  if (answerRows.length === 0) return [];
  const selectedByQ = new Map<string, string[]>(
    answerRows.map((r) => [r.question_id as string, (r.selected as string[]) ?? []]),
  );
  const ids = [...selectedByQ.keys()];

  // Content is not user-scoped; options are returned WITHOUT is_correct/explanation.
  const qRows = await sql`
    select q.id, q.external_id, q.domain_no, q.variant, q.selection, q.answer_count,
           q.stem, q.case_key, d.name as domain_name, c.scenario as case_scenario
    from questions q
    left join exam_domains d on d.exam_id = q.exam_id and d.domain_no = q.domain_no
    left join case_studies c on c.exam_id = q.exam_id and c.case_key = q.case_key
    where q.id in ${sql(ids)}
    order by q.position`;
  const optRows = await sql`
    select question_id, letter, text from question_options
    where question_id in ${sql(ids)} order by position`;
  const optsByQ = new Map<string, { letter: string; text: string }[]>();
  for (const o of optRows) {
    const list = optsByQ.get(o.question_id) ?? [];
    list.push({ letter: o.letter, text: o.text });
    optsByQ.set(o.question_id, list);
  }

  return qRows.map((q) => ({
    question: {
      id: q.id,
      externalId: q.external_id,
      domainNo: q.domain_no,
      domainName: q.domain_name ?? `Domain ${q.domain_no}`,
      caseKey: q.case_key,
      caseScenario: q.case_scenario,
      variant: q.variant,
      selection: q.selection,
      answerCount: q.answer_count,
      stem: q.stem,
      options: optsByQ.get(q.id) ?? [],
    },
    selected: selectedByQ.get(q.id) ?? [],
  }));
}

export interface SubmitResult {
  score: ScoreResult;
  masteryBenchmark: number;
  passed: boolean;
}

/** Score and finalize an attempt. Server-authoritative — correctness is never
 * trusted from the client. Idempotent-ish: only scores an in_progress attempt. */
export async function submitAttempt(
  userId: string,
  attemptId: string,
  answers: Record<string, string[]>,
): Promise<SubmitResult> {
  const meta = await getAttemptMeta(userId, attemptId);
  if (!meta) throw new Error("attempt not found");
  if (meta.status !== "in_progress") throw new Error("attempt already submitted");

  const answerRows = await asUser(userId, (tx) =>
    tx`select question_id from attempt_answers where attempt_id = ${attemptId}`,
  );
  const ids = answerRows.map((r) => r.question_id as string);

  // Correct answers + domains (content).
  const optRows = await sql`
    select question_id, letter, is_correct from question_options
    where question_id in ${sql(ids)}`;
  const qRows = await sql`
    select q.id, q.domain_no, coalesce(d.name, 'Domain ' || q.domain_no) as domain_name
    from questions q
    left join exam_domains d on d.exam_id = q.exam_id and d.domain_no = q.domain_no
    where q.id in ${sql(ids)}`;
  const domainByQ = new Map(qRows.map((r) => [r.id as string, r.domain_name as string]));
  const correctByQ = new Map<string, string[]>();
  for (const o of optRows) {
    if (o.is_correct) {
      const list = correctByQ.get(o.question_id) ?? [];
      list.push(o.letter);
      correctByQ.set(o.question_id, list);
    }
  }

  const outcomes: AnswerOutcome[] = [];
  const graded: { qid: string; selected: string[]; isCorrect: boolean }[] = [];
  for (const qid of ids) {
    const selected = answers[qid] ?? [];
    const correct = correctByQ.get(qid) ?? [];
    const isCorrect = eqSet(selected, correct);
    outcomes.push({ domain: domainByQ.get(qid) ?? "Unknown", isCorrect });
    graded.push({ qid, selected, isCorrect });
  }

  const score = scoreAttempt(outcomes, { passScaled: meta.passScaled });

  await asUser(userId, async (tx) => {
    for (const g of graded) {
      await tx`update attempt_answers
        set selected = ${g.selected}, is_correct = ${g.isCorrect}, answered_at = now()
        where attempt_id = ${attemptId} and question_id = ${g.qid}`;
    }
    await tx`update test_attempts
      set status = 'submitted', submitted_at = now(),
          scaled_score = ${score.scaled}, raw_percent = ${Math.round(score.percentage)},
          passed = ${score.passed}
      where id = ${attemptId}`;
  });

  return { score, masteryBenchmark: meta.masteryBenchmark, passed: score.passed };
}

/** Full review AFTER submission — includes correct answers + explanations. */
export async function getAttemptReview(userId: string, attemptId: string) {
  const answerRows = await asUser(userId, (tx) =>
    tx`select question_id, selected, is_correct from attempt_answers where attempt_id = ${attemptId}`,
  );
  const ids = answerRows.map((r) => r.question_id as string);
  if (ids.length === 0) return [];
  const byQ = new Map(answerRows.map((r) => [r.question_id, r]));

  const qRows = await sql`
    select q.id, q.external_id, q.domain_no, q.stem, q.rationale, q.selection,
           coalesce(d.name, 'Domain ' || q.domain_no) as domain_name
    from questions q
    left join exam_domains d on d.exam_id = q.exam_id and d.domain_no = q.domain_no
    where q.id in ${sql(ids)} order by q.position`;
  const optRows = await sql`
    select question_id, letter, text, is_correct, explanation from question_options
    where question_id in ${sql(ids)} order by position`;
  type ReviewOpt = {
    letter: string;
    text: string;
    isCorrect: boolean;
    explanation: string | null;
  };
  const optsByQ = new Map<string, ReviewOpt[]>();
  for (const o of optRows) {
    const list = optsByQ.get(o.question_id) ?? [];
    list.push({
      letter: o.letter,
      text: o.text,
      isCorrect: o.is_correct,
      explanation: o.explanation,
    });
    optsByQ.set(o.question_id, list);
  }

  return qRows.map((q) => {
    const a = byQ.get(q.id);
    return {
      id: q.id,
      externalId: q.external_id,
      domainName: q.domain_name,
      stem: q.stem,
      rationale: q.rationale,
      selection: q.selection,
      selected: (a?.selected as string[]) ?? [],
      isCorrect: a?.is_correct as boolean,
      options: optsByQ.get(q.id) ?? [],
    };
  });
}
