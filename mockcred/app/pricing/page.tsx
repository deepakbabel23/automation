import Link from "next/link";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Pricing</h1>
      <p className="mt-2 text-neutral-600 dark:text-neutral-300">
        Start free. Paid plans (USD) unlock the full timed mock exams — launching soon.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { name: "Free", price: "$0", note: "Sample questions + instant scoring", cta: true },
          { name: "Exam Pack", price: "Soon", note: "One-time unlock of a full exam" },
          { name: "All-Access", price: "Soon", note: "Every exam, monthly" },
        ].map((t) => (
          <div
            key={t.name}
            className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800"
          >
            <p className="font-semibold">{t.name}</p>
            <p className="mt-1 text-3xl font-bold">{t.price}</p>
            <p className="mt-2 text-sm text-neutral-500">{t.note}</p>
            {t.cta && (
              <Link
                href="/exams"
                className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
              >
                Browse exams
              </Link>
            )}
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-neutral-500">
        Prices are in USD. MockCred is an independent study aid, not affiliated with or
        endorsed by Anthropic.
      </p>
    </main>
  );
}
