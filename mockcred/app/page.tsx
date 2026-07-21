import Link from "next/link";

const EXAM_TRACKS = [
  { slug: "cca", name: "Claude Certified Associate", questions: 60, minutes: 90 },
  { slug: "ccd-foundations", name: "Claude Certified Developer (Foundations)", questions: 60, minutes: 120 },
  { slug: "cca-foundations", name: "Claude Certified Architect (Foundations)", questions: 60, minutes: 120 },
  { slug: "cca-professional", name: "Claude Certified Architect (Professional)", questions: 65, minutes: 150 },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
        Unofficial exam prep
      </span>
      <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        Pass your Claude Certification with realistic mock exams.
      </h1>
      <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-300">
        Timed, blueprint-aligned practice tests with instant scoring and per-domain
        feedback. Start with free sample questions — unlock full mock exams when
        you&apos;re ready.
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/exams"
          className="rounded-lg bg-brand px-5 py-3 font-medium text-white transition hover:bg-brand-dark"
        >
          Browse exams
        </Link>
        <Link
          href="/pricing"
          className="rounded-lg border border-neutral-300 px-5 py-3 font-medium transition hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Pricing
        </Link>
      </div>

      <section className="mt-14">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Exam tracks
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {EXAM_TRACKS.map((exam) => (
            <li
              key={exam.slug}
              className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <p className="font-medium">{exam.name}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {exam.questions} questions · {exam.minutes} min
              </p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-16 border-t border-neutral-200 pt-6 text-xs text-neutral-500 dark:border-neutral-800">
        MockCred is an independent study aid and is <strong>not affiliated with,
        endorsed by, or sponsored by Anthropic</strong>. &ldquo;Claude&rdquo; is a
        trademark of Anthropic. All practice questions are original content.
      </footer>
    </main>
  );
}
