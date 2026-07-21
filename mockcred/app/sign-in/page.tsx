import { Suspense } from "react";
import SignInForm from "@/components/SignInForm";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight">Sign in to MockCred</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-300">
        Practice Claude Certification mock exams. Free samples, no card required.
      </p>
      <Suspense>
        <SignInForm />
      </Suspense>
    </main>
  );
}
