import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  getAttemptMeta,
  getAttemptQuestions,
  getAttemptReview,
} from "@/lib/attempts";
import QuizRunner from "@/components/QuizRunner";
import TimedExamRunner from "@/components/TimedExamRunner";
import AttemptResults from "@/components/AttemptResults";

export const dynamic = "force-dynamic";

export default async function AttemptPage({ params }: { params: { id: string } }) {
  const user = await requireUser(`/attempts/${params.id}`);
  const meta = await getAttemptMeta(user.id, params.id);
  if (!meta) notFound();

  if (meta.status === "in_progress") {
    const items = await getAttemptQuestions(user.id, params.id);
    if (meta.mode === "timed") {
      return (
        <TimedExamRunner
          attemptId={meta.id}
          items={items}
          examTitle={meta.examTitle}
          expiresAt={meta.expiresAt}
        />
      );
    }
    return <QuizRunner attemptId={meta.id} items={items} examTitle={meta.examTitle} />;
  }

  const review = await getAttemptReview(user.id, params.id);
  return <AttemptResults meta={meta} review={review} />;
}
