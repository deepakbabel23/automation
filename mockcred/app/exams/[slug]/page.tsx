import Link from "next/link";
import { notFound } from "next/navigation";
import { getExamBySlug } from "@/lib/exams";
import { getCurrentUser } from "@/lib/auth";
import { startPracticeAction, startTimedAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function ExamPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { locked?: string };
}) {
  const exam = await getExamBySlug(params.slug);
  if (!exam) notFound();
  const user = await getCurrentUser();
  const locked = searchParams.locked === "1";

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand">
        {exam.examCode}
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{exam.title}</h1>
      {exam.subtitle && (
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">{exam.subtitle}</p>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Questions", exam.questionCount],
          ["Minutes", exam.durationMinutes],
          ["Pass (scaled)", exam.passScaled],
          ["Free samples", exam.freeCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <dt className="text-xs uppercase tracking-wide text-neutral-500">{label}</dt>
            <dd className="mt-1 text-2xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>

      {locked && (
        <div
          data-testid="locked-notice"
          className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
        >
          The full timed mock is locked. Paid plans are launching soon — meanwhile the
          free practice quiz below is available.
        </div>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Free practice quiz</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            {exam.freeCount} sample questions with instant scoring and full explanations.
          </p>
          <form action={startPracticeAction.bind(null, exam.slug)} className="mt-4">
            <button
              type="submit"
              data-testid="start-practice"
              className="rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
            >
              {user ? "Start free practice" : "Sign in & start free practice"}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
          <h2 className="text-lg font-semibold">Full timed mock</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            All {exam.questionCount} questions, {exam.durationMinutes}-minute timer,
            scaled score with per-domain breakdown.
          </p>
          <form action={startTimedAction.bind(null, exam.slug)} className="mt-4">
            <button
              type="submit"
              data-testid="start-timed"
              className="rounded-lg border border-brand px-6 py-3 font-semibold text-brand hover:bg-brand/5"
            >
              {user ? "Start full timed mock" : "Sign in & start full mock"}
            </button>
          </form>
        </div>
      </div>

      <p className="mt-6 text-xs text-neutral-500">
        <Link href="/pricing" className="underline">
          See pricing
        </Link>{" "}
        · MockCred is not affiliated with or endorsed by Anthropic.
      </p>
    </main>
  );
}
