import Link from "next/link";
import { listPublishedExams } from "@/lib/exams";

export const dynamic = "force-dynamic";

export default async function ExamsPage() {
  const exams = await listPublishedExams();
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Exam catalog</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-300">
        Original, blueprint-aligned practice for the Claude Certification exams.
      </p>
      <ul className="mt-8 flex flex-col gap-3">
        {exams.map((exam) => (
          <li
            key={exam.id}
            className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800"
          >
            <Link href={`/exams/${exam.slug}`} className="font-semibold hover:text-brand">
              {exam.title}
            </Link>
            <p className="mt-1 text-sm text-neutral-500">
              {exam.questionCount} questions · {exam.durationMinutes} min ·{" "}
              {exam.freeCount} free samples
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
