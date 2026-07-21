"use server";

import { redirect } from "next/navigation";
import { logout, requireUser } from "@/lib/auth";
import { startPracticeAttempt } from "@/lib/attempts";

/** Start a free practice attempt and go to it. Redirects to sign-in if needed. */
export async function startPracticeAction(slug: string) {
  const user = await requireUser(`/exams/${slug}`);
  const attemptId = await startPracticeAttempt(user.id, slug);
  redirect(`/attempts/${attemptId}`);
}

export async function signOutAction() {
  logout();
  redirect("/");
}
