"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientQuestion } from "@/lib/attempts";

interface Item {
  question: ClientQuestion;
  selected: string[];
}

export default function QuizRunner({
  attemptId,
  items,
  examTitle,
}: {
  attemptId: string;
  items: Item[];
  examTitle: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(items.map((i) => [i.question.id, i.selected])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answeredCount = useMemo(
    () => Object.values(answers).filter((a) => a.length > 0).length,
    [answers],
  );

  function toggle(q: ClientQuestion, letter: string) {
    setAnswers((prev) => {
      const current = prev[q.id] ?? [];
      if (q.selection === "single") return { ...prev, [q.id]: [letter] };
      const next = current.includes(letter)
        ? current.filter((l) => l !== letter)
        : [...current, letter];
      return { ...prev, [q.id]: next };
    });
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/attempts/${attemptId}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "submit failed");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">
          Free practice
        </p>
        <h1 className="mt-1 text-2xl font-bold">{examTitle}</h1>
        <p className="mt-2 text-sm text-neutral-500" data-testid="answered-count">
          {answeredCount} of {items.length} answered
        </p>
      </header>

      <ol className="flex flex-col gap-8">
        {items.map(({ question: q }, idx) => (
          <li key={q.id} data-testid={`question-${q.id}`}>
            <div className="mb-2 flex gap-2 text-xs">
              <span className="rounded-full bg-brand/10 px-2 py-1 font-semibold text-brand">
                {q.domainName}
              </span>
              {q.selection === "multi" && (
                <span className="rounded-full bg-neutral-200 px-2 py-1 font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  Select {q.answerCount ?? "all that apply"}
                </span>
              )}
            </div>
            <p className="font-medium">
              {idx + 1}. {q.stem}
            </p>
            {q.caseScenario && (
              <details className="mt-2 rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                <summary className="cursor-pointer font-medium">Case scenario</summary>
                <p className="mt-2 text-neutral-600 dark:text-neutral-300">
                  {q.caseScenario}
                </p>
              </details>
            )}
            <div className="mt-3 flex flex-col gap-2">
              {q.options.map((o) => {
                const chosen = (answers[q.id] ?? []).includes(o.letter);
                return (
                  <button
                    key={o.letter}
                    type="button"
                    data-testid={`opt-${q.id}-${o.letter}`}
                    onClick={() => toggle(q, o.letter)}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                      chosen
                        ? "border-brand bg-brand/5"
                        : "border-neutral-200 hover:border-brand/60 dark:border-neutral-800"
                    }`}
                  >
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border border-neutral-300 text-sm font-bold dark:border-neutral-700">
                      {o.letter}
                    </span>
                    <span>{o.text}</span>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        data-testid="submit-quiz"
        className="mt-8 rounded-lg bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        {submitting ? "Scoring…" : "Submit & see score"}
      </button>
    </main>
  );
}
