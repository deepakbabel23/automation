# CLAUDE.md — MockCred

Instructions for any AI/dev working in this project. Keep this file current.

## What this is

MockCred is a SaaS that sells **original** practice / mock exams for **Anthropic's
Claude Certifications**. It is an independent study aid — **not affiliated with,
endorsed by, or sponsored by Anthropic**. Every user-facing surface must keep that
disclaimer and must never reproduce real/proctored exam questions ("braindumps").

## Product model

- **Freemium**: each exam exposes a few free sample questions (`is_free = true`) and a
  short free quiz. Full timed mock exams are gated.
- **Paid unlock**: one-time purchase of a per-exam pack (Razorpay Orders API).
- **Subscription**: all-access plan (Razorpay Subscriptions API).
- Mock exams mirror the **real blueprint**: question count, timer, scaled score
  (0–1000, pass ~720), and per-domain breakdown.

## Tech stack

Next.js (App Router) + TypeScript + Tailwind · Supabase (Postgres + RLS) · Clerk (auth)
· Razorpay (payments) · Upstash Redis (timer state / rate limit) · Resend (email) ·
PostHog (analytics) · Sentry (errors) · Vercel (host) · Cloudflare + Namecheap (DNS).

## Guardrails (from the YC vibe-coding guide — follow these)

1. **Implement incrementally.** One phase / one feature at a time. See `../ROADMAP` phases.
2. **Commit each working slice.** Never leave the tree broken between commits.
3. **Tests as guardrails.** Prioritize e2e (Playwright) simulating real user clicks;
   unit-test the two money-critical modules: `lib/scoring.ts` and `lib/entitlements.ts`.
4. **Test before proceeding.** `npm run typecheck && npm run lint && npm test` must pass
   before moving on.
5. **Modular, small files.** Prefer many small files over large ones. Keep API routes thin.
6. **Reset when stuck**, don't stack failed attempts.

## Security invariants (do not violate)

- Correct answers + explanations for **locked** questions are NEVER sent to the client.
  Only `is_free` questions or entitled users get them, and only via a server route.
- **All access decisions go through `hasAccess()` in `lib/entitlements.ts`.** No ad-hoc checks.
- **Payments are granted by verified webhooks, not browser redirects.** The Razorpay
  webhook route reads the raw body and verifies the `X-Razorpay-Signature` HMAC-SHA256.
- Never commit secrets. Use `.env.local` (git-ignored); `.env.example` lists the keys.

## Commands

```bash
npm run dev         # local dev
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm test            # vitest (unit)
npm run format      # prettier write
```

## Layout

```
app/            routes (marketing + app + api)
components/     UI
lib/            scoring.ts, entitlements.ts, and integration clients
tests/          unit (vitest) + e2e (playwright, added in Phase 2)
db/             schema.sql, migrations, RLS (Phase 1)
content/        question-bank importer (Phase 1)
```
