import type { Sql } from "@/lib/db";
import { sql as globalSql } from "@/lib/db";
import type { ParsedExam } from "@/content/importer";

export interface ImportOptions {
  /** external ids (source question ids) to expose as free freemium samples */
  freeExternalIds?: number[];
  /** publish the exam so it shows in the catalog */
  publish?: boolean;
}

export interface ImportSummary {
  examId: string;
  slug: string;
  domains: number;
  cases: number;
  questions: number;
  freeQuestions: number;
}

/**
 * Idempotent import: upserts the exam by slug and fully replaces its domains,
 * cases, questions and options. Safe to re-run for the same slug.
 */
export async function importExam(
  exam: ParsedExam,
  opts: ImportOptions = {},
  db: Sql = globalSql,
): Promise<ImportSummary> {
  const freeIds = new Set(opts.freeExternalIds ?? []);

  return db.begin(async (tx) => {
    const [row] = await tx`
      insert into exams (
        exam_code, slug, title, subtitle, version, source_version,
        duration_minutes, question_count, pass_scaled, scale_min, scale_max,
        mastery_benchmark, bloom_target, is_published
      ) values (
        ${exam.examCode}, ${exam.slug}, ${exam.title}, ${exam.subtitle ?? null},
        ${exam.version ?? null}, ${exam.sourceVersion ?? null},
        ${exam.durationMinutes}, ${exam.questionCount}, ${exam.passScaled},
        ${exam.scaleMin}, ${exam.scaleMax}, ${exam.masteryBenchmark},
        ${tx.json(exam.bloomTarget as never)}, ${opts.publish ?? false}
      )
      on conflict (slug) do update set
        exam_code = excluded.exam_code,
        title = excluded.title,
        subtitle = excluded.subtitle,
        version = excluded.version,
        source_version = excluded.source_version,
        duration_minutes = excluded.duration_minutes,
        question_count = excluded.question_count,
        pass_scaled = excluded.pass_scaled,
        scale_min = excluded.scale_min,
        scale_max = excluded.scale_max,
        mastery_benchmark = excluded.mastery_benchmark,
        bloom_target = excluded.bloom_target,
        is_published = excluded.is_published
      returning id`;
    const examId = row.id as string;

    // Replace children (questions cascade to options).
    await tx`delete from exam_domains where exam_id = ${examId}`;
    await tx`delete from case_studies where exam_id = ${examId}`;
    await tx`delete from questions where exam_id = ${examId}`;

    for (const d of exam.domains) {
      await tx`insert into exam_domains (exam_id, domain_no, name, weight, item_target)
        values (${examId}, ${d.domainNo}, ${d.name}, ${d.weight}, ${d.itemTarget})`;
    }

    for (const c of exam.cases) {
      await tx`insert into case_studies (exam_id, case_key, title, question_range, scenario)
        values (${examId}, ${c.caseKey}, ${c.title ?? null}, ${c.questionRange ?? null}, ${c.scenario})`;
    }

    for (const q of exam.questions) {
      const [qrow] = await tx`
        insert into questions (
          exam_id, external_id, domain_no, case_key, variant, selection,
          answer_count, stem, rationale, concept, lesson, bloom, difficulty,
          confidence, reference, official_terminology, distractor_patterns,
          cross_modules, is_free, position
        ) values (
          ${examId}, ${q.externalId}, ${q.domainNo}, ${q.caseKey ?? null},
          ${q.variant ?? null}, ${q.selection}, ${q.answerCount ?? null},
          ${q.stem}, ${q.rationale ?? null}, ${q.concept ?? null},
          ${q.lesson ?? null}, ${q.bloom ?? null}, ${q.difficulty ?? null},
          ${q.confidence ?? null}, ${q.reference ?? null},
          ${q.officialTerminology}, ${q.distractorPatterns}, ${q.crossModules},
          ${freeIds.has(q.externalId)}, ${q.position}
        ) returning id`;
      const questionId = qrow.id as string;

      for (const o of q.options) {
        await tx`insert into question_options (question_id, letter, text, is_correct, explanation, position)
          values (${questionId}, ${o.letter}, ${o.text}, ${o.isCorrect}, ${o.explanation ?? null}, ${o.position})`;
      }
    }

    return {
      examId,
      slug: exam.slug,
      domains: exam.domains.length,
      cases: exam.cases.length,
      questions: exam.questions.length,
      freeQuestions: exam.questions.filter((q) => freeIds.has(q.externalId)).length,
    };
  }) as Promise<ImportSummary>;
}
