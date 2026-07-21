import Link from "next/link";
import type { AttemptMeta } from "@/lib/attempts";

interface ReviewOption {
  letter: string;
  text: string;
  isCorrect: boolean;
  explanation: string | null;
}
interface ReviewItem {
  id: string;
  externalId: number | null;
  domainName: string;
  stem: string;
  rationale: string | null;
  selected: string[];
  isCorrect: boolean;
  options: ReviewOption[];
}

export default function AttemptResults({
  meta,
  review,
}: {
  meta: AttemptMeta;
  review: ReviewItem[];
}) {
  const total = review.length;
  const correct = review.filter((r) => r.isCorrect).length;

  // Per-domain breakdown from the review.
  const byDomain = new Map<string, { correct: number; total: number }>();
  for (const r of review) {
    const d = byDomain.get(r.domainName) ?? { correct: 0, total: 0 };
    d.total += 1;
    if (r.isCorrect) d.correct += 1;
    byDomain.set(r.domainName, d);
  }
  const domains = [...byDomain.entries()].sort(
    (a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total,
  );

  const rawPercent = meta.rawPercent ?? 0;
  const metMastery = rawPercent >= meta.masteryBenchmark;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand">Result</p>
      <h1 className="mt-1 text-2xl font-bold">{meta.examTitle}</h1>

      <section
        data-testid="results-summary"
        className="mt-6 grid gap-4 rounded-2xl border border-neutral-200 p-6 sm:grid-cols-3 dark:border-neutral-800"
      >
        <div>
          <p className="text-4xl font-bold" data-testid="raw-percent">
            {rawPercent}%
          </p>
          <p className="text-sm text-neutral-500">
            {correct}/{total} correct
          </p>
        </div>
        <div>
          <p className="text-4xl font-bold">{meta.scaledScore}</p>
          <p className="text-sm text-neutral-500">scaled (pass {meta.passScaled})</p>
        </div>
        <div>
          <span
            data-testid="mastery-badge"
            className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
              metMastery
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
            }`}
          >
            {metMastery ? "Met" : "Below"} {meta.masteryBenchmark}% target
          </span>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          By domain
        </h2>
        <ul className="mt-3 flex flex-col gap-2">
          {domains.map(([name, d]) => (
            <li key={name} className="flex items-center justify-between text-sm">
              <span>{name}</span>
              <span className="tabular-nums text-neutral-500">
                {d.correct}/{d.total} ({Math.round((d.correct / d.total) * 100)}%)
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Review
        </h2>
        <ol className="flex flex-col gap-6">
          {review.map((r, i) => (
            <li
              key={r.id}
              className={`rounded-xl border p-4 ${
                r.isCorrect
                  ? "border-green-300 dark:border-green-800"
                  : "border-red-300 dark:border-red-800"
              }`}
            >
              <p className="font-medium">
                {i + 1}. {r.stem}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {r.options.map((o) => {
                  const chosen = r.selected.includes(o.letter);
                  return (
                    <div
                      key={o.letter}
                      className={`rounded-lg border p-2 text-sm ${
                        o.isCorrect
                          ? "border-green-400 bg-green-50 dark:bg-green-950"
                          : chosen
                            ? "border-red-400 bg-red-50 dark:bg-red-950"
                            : "border-neutral-200 dark:border-neutral-800"
                      }`}
                    >
                      <span className="font-bold">{o.letter}.</span> {o.text}
                      {o.isCorrect && <span className="ml-2 text-xs font-semibold text-green-700 dark:text-green-300">correct</span>}
                      {chosen && !o.isCorrect && <span className="ml-2 text-xs font-semibold text-red-700 dark:text-red-300">your pick</span>}
                      {o.explanation && (
                        <p className="mt-1 text-neutral-600 dark:text-neutral-400">{o.explanation}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              {r.rationale && (
                <p className="mt-3 rounded-lg bg-neutral-100 p-3 text-sm text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                  <strong>Why:</strong> {r.rationale}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-10 flex gap-3">
        <Link
          href={`/exams/${meta.examSlug}`}
          className="rounded-lg border border-neutral-300 px-5 py-3 font-medium dark:border-neutral-700"
        >
          Back to exam
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg bg-brand px-5 py-3 font-medium text-white hover:bg-brand-dark"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
