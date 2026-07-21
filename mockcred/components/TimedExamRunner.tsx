"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientQuestion } from "@/lib/attempts";

interface Item {
  question: ClientQuestion;
  selected: string[];
  flagged: boolean;
}

function fmt(ms: number): string {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export default function TimedExamRunner({
  attemptId,
  items,
  examTitle,
  expiresAt,
}: {
  attemptId: string;
  items: Item[];
  examTitle: string;
  expiresAt: string | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(items.map((i) => [i.question.id, i.selected])),
  );
  const [flags, setFlags] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.flagged).map((i) => i.question.id)),
  );
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState<number>(() =>
    expiresAt ? Date.parse(expiresAt) - Date.now() : Number.POSITIVE_INFINITY,
  );
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const item = items[current];
  const q = item.question;

  const answeredCount = useMemo(
    () => Object.values(answers).filter((a) => a.length > 0).length,
    [answers],
  );

  const persist = useCallback(
    (nextAnswers: Record<string, string[]>, nextFlags: Set<string>) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void fetch(`/api/attempts/${attemptId}/save`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ answers: nextAnswers, flagged: [...nextFlags] }),
        }).catch(() => {});
      }, 400);
    },
    [attemptId],
  );

  const submit = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    await fetch(`/api/attempts/${attemptId}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers }),
    }).catch(() => {});
    router.refresh();
  }, [answers, attemptId, router]);

  // Countdown + auto-submit on expiry.
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => {
      const left = Date.parse(expiresAt) - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        void submit();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, submit]);

  function choose(letter: string) {
    setAnswers((prev) => {
      const cur = prev[q.id] ?? [];
      const next =
        q.selection === "single"
          ? [letter]
          : cur.includes(letter)
            ? cur.filter((l) => l !== letter)
            : [...cur, letter];
      const updated = { ...prev, [q.id]: next };
      persist(updated, flags);
      return updated;
    });
  }

  function toggleFlag() {
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(q.id)) next.delete(q.id);
      else next.add(q.id);
      persist(answers, next);
      return next;
    });
  }

  const warning = remaining < 5 * 60 * 1000;

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[260px_1fr]">
      {/* Navigator */}
      <aside className="rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div
          data-testid="timer"
          className={`mb-4 rounded-lg px-3 py-2 text-center text-lg font-bold tabular-nums ${
            warning
              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
              : "bg-neutral-100 dark:bg-neutral-900"
          }`}
        >
          {Number.isFinite(remaining) ? fmt(remaining) : "—"}
        </div>
        <p className="mb-2 text-xs text-neutral-500">
          {answeredCount}/{items.length} answered
        </p>
        <div className="grid grid-cols-6 gap-1.5">
          {items.map((it, i) => {
            const answered = (answers[it.question.id] ?? []).length > 0;
            const flagged = flags.has(it.question.id);
            return (
              <button
                key={it.question.id}
                type="button"
                data-testid={`nav-${i}`}
                onClick={() => setCurrent(i)}
                className={`relative aspect-square rounded-md border text-xs font-bold ${
                  i === current
                    ? "border-brand outline outline-2 outline-brand/40"
                    : answered
                      ? "border-brand/40 bg-brand/10 text-brand"
                      : "border-neutral-300 dark:border-neutral-700"
                }`}
              >
                {i + 1}
                {flagged && (
                  <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          data-testid="submit-exam"
          className="mt-4 w-full rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit exam"}
        </button>
      </aside>

      {/* Question */}
      <main>
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold">{examTitle}</h1>
          <button
            type="button"
            onClick={toggleFlag}
            data-testid="flag"
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              flags.has(q.id)
                ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                : "border-neutral-300 dark:border-neutral-700"
            }`}
          >
            {flags.has(q.id) ? "Flagged" : "Flag for review"}
          </button>
        </header>

        <div className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
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
            Question {current + 1} of {items.length}
          </p>
          <p className="mt-2 text-lg">{q.stem}</p>
          {q.caseScenario && (
            <details className="mt-3 rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
              <summary className="cursor-pointer font-medium">Case scenario</summary>
              <p className="mt-2 text-neutral-600 dark:text-neutral-300">{q.caseScenario}</p>
            </details>
          )}

          <div className="mt-4 flex flex-col gap-2">
            {q.options.map((o) => {
              const chosen = (answers[q.id] ?? []).includes(o.letter);
              return (
                <button
                  key={o.letter}
                  type="button"
                  data-testid={`opt-${q.id}-${o.letter}`}
                  onClick={() => choose(o.letter)}
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
        </div>

        <div className="mt-4 flex justify-between">
          <button
            type="button"
            data-testid="prev"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="rounded-lg border border-neutral-300 px-5 py-2 disabled:opacity-40 dark:border-neutral-700"
          >
            Previous
          </button>
          <button
            type="button"
            data-testid="next"
            onClick={() => setCurrent((c) => Math.min(items.length - 1, c + 1))}
            disabled={current === items.length - 1}
            className="rounded-lg border border-neutral-300 px-5 py-2 disabled:opacity-40 dark:border-neutral-700"
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
}
