import { sql } from "@/lib/db";

export interface ExamSummary {
  id: string;
  slug: string;
  examCode: string;
  title: string;
  subtitle: string | null;
  durationMinutes: number;
  questionCount: number;
  passScaled: number;
  masteryBenchmark: number;
  freeCount: number;
}

/** Published exams for the catalog, with a count of free sample questions. */
export async function listPublishedExams(): Promise<ExamSummary[]> {
  const rows = await sql`
    select e.id, e.slug, e.exam_code, e.title, e.subtitle,
           e.duration_minutes, e.question_count, e.pass_scaled, e.mastery_benchmark,
           count(q.*) filter (where q.is_free) as free_count
    from exams e
    left join questions q on q.exam_id = e.id
    where e.is_published = true
    group by e.id
    order by e.exam_code`;
  return rows.map(mapExam);
}

export async function getExamBySlug(slug: string): Promise<ExamSummary | null> {
  const rows = await sql`
    select e.id, e.slug, e.exam_code, e.title, e.subtitle,
           e.duration_minutes, e.question_count, e.pass_scaled, e.mastery_benchmark,
           count(q.*) filter (where q.is_free) as free_count
    from exams e
    left join questions q on q.exam_id = e.id
    where e.slug = ${slug} and e.is_published = true
    group by e.id`;
  return rows[0] ? mapExam(rows[0]) : null;
}

function mapExam(r: any): ExamSummary {
  return {
    id: r.id,
    slug: r.slug,
    examCode: r.exam_code,
    title: r.title,
    subtitle: r.subtitle,
    durationMinutes: r.duration_minutes,
    questionCount: r.question_count,
    passScaled: r.pass_scaled,
    masteryBenchmark: r.mastery_benchmark,
    freeCount: Number(r.free_count),
  };
}
