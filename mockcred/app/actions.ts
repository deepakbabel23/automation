"use server";

import { redirect } from "next/navigation";
import { logout, requireUser } from "@/lib/auth";
import { startPracticeAttempt, startTimedAttempt } from "@/lib/attempts";

/** Start a free practice attempt and go to it. Redirects to sign-in if needed. */
export async function startPracticeAction(slug: string) {
  const user = await requireUser(`/exams/${slug}`);
  const attemptId = await startPracticeAttempt(user.id, slug);
  redirect(`/attempts/${attemptId}`);
}

/** Start a full timed mock. Redirects to the paywall if the user lacks access. */
export async function startTimedAction(slug: string) {
  const user = await requireUser(`/exams/${slug}`);
  let attemptId: string;
  try {
    attemptId = await startTimedAttempt(user.id, slug);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("locked")) {
      redirect(`/exams/${slug}?locked=1`);
    }
    throw err;
  }
  redirect(`/attempts/${attemptId}`);
}

export async function signOutAction() {
  logout();
  redirect("/");
}
