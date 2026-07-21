# MockCred

Unofficial, realistic **practice / mock exams for Anthropic's Claude Certifications**.
Freemium sample quizzes → paid pack unlocks and an all-access subscription, with timed
blueprint-aligned mock exams, instant scaled scoring, and per-domain feedback.

> **Disclaimer:** MockCred is an independent study aid and is **not affiliated with,
> endorsed by, or sponsored by Anthropic**. "Claude" is a trademark of Anthropic. All
> practice questions are original content.

## Stack

Next.js (App Router) + TypeScript + Tailwind · Supabase · Clerk · Razorpay · Upstash ·
Resend · PostHog · Sentry · Vercel.

## Getting started

```bash
cd mockcred
cp .env.example .env.local   # fill in as you reach each phase
npm install
npm run dev                  # http://localhost:3000
```

Verify the toolchain:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## Build roadmap

Delivered phase by phase (see `CLAUDE.md` for guardrails):

- **Phase 0 — Foundation** ✅ scaffold, tooling, CI, Sentry, tested scoring core.
- **Phase 1 — Data & import** — Supabase schema + RLS, question-bank importer.
- **Phase 2 — Auth + free quiz** — Clerk, dashboard, free sample quiz, results.
- **Phase 3 — Timed mock engine** — timer, navigator, scaled scoring, resume.
- **Phase 4 — Paywall + Razorpay** — entitlements, one-time unlock + subscription, webhooks.
- **Phase 5 — GTM polish** — PostHog funnels, pricing, SEO pages, result emails.
- **Phase 6 — Later** — Pinecone + Claude API "explain my mistakes" AI tutor.

## Project layout

```
app/         Next.js routes (marketing, app, api)
components/   UI components
lib/          scoring.ts, entitlements.ts, integration clients
tests/        unit (vitest) and e2e (playwright)
db/           schema, migrations, RLS policies
content/      question-bank import pipeline
```
