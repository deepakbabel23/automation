import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listPublishedExams } from "@/lib/exams";
import { signOutAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const exams = await listPublishedExams();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500" data-testid="user-email">
            {user.email}
          </p>
        </div>
        <form action={signOutAction}>
          <button className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700">
            Sign out
          </button>
        </form>
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Available exams
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {exams.map((exam) => (
          <li
            key={exam.id}
            className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{exam.title}</p>
                <p className="mt-1 text-sm text-neutral-500">
                  {exam.questionCount} questions · {exam.durationMinutes} min ·{" "}
                  {exam.freeCount} free samples
                </p>
              </div>
              <Link
                href={`/exams/${exam.slug}`}
                data-testid={`exam-link-${exam.slug}`}
                className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
              >
                Open
              </Link>
            </div>
          </li>
        ))}
        {exams.length === 0 && (
          <li className="text-sm text-neutral-500">No exams published yet.</li>
        )}
      </ul>
    </main>
  );
}
