# MockCred — Build Plan (approved)

> This is the committed, living copy of the approved plan. Checkpoints and any
> divergences from it are tracked in [`CHECKPOINTS.md`](./CHECKPOINTS.md).

## Context

**Goal.** Build and monetize a SaaS that sells **original** practice / mock exams for
**Anthropic's Claude Certifications** (Certified Associate, Certified Developer
(Foundations), Certified Architect (Foundations & Professional)). Anthropic's real
exams are paid, proctored (Pearson VUE), and gated to Claude Partner Network
organizations — so candidates have almost no realistic way to rehearse. An
**unofficial, high-fidelity practice platform** fills that gap.

**Confirmed product decisions:**
- **Content:** import the owner's **own original question bank**. The canonical import
  format is the self-contained mock `DATA` object (see the sample at
  `content/samples/CCAOF_Impossible_Mock_01.html`).
- **Niche:** Claude / Anthropic certification prep. First track: **CCAO-F** (Claude
  Certified Associate — Foundations), 60 items / 120 min, scaled score 100–1000,
  pass 720, seven weighted domains + Bloom distribution.
- **Monetization:** **Freemium + paid unlock AND subscription (all-access)**, via
  **Razorpay**. **Sales geography: International (USD).**

## Tech stack

Next.js (App Router) + TypeScript + Tailwind · Postgres (Supabase in prod) ·
auth provider interface (self-contained sessions for dev/test; Clerk in prod) ·
**Razorpay** (payments) · Upstash Redis (timer/rate-limit) · Resend (email) ·
PostHog (analytics) · Sentry (errors) · Docker · Vercel · Cloudflare + Namecheap ·
GitHub + GitHub Actions (CI/CD). Pinecone + Claude API deferred to Phase 6.

## Data model (Postgres, matches the sample import format)

- `exams` — `exam_code`, `title`, `subtitle`, `duration_minutes`, `question_count`,
  `pass_scaled` (720), `scale_min`/`scale_max` (100/1000), `mastery_benchmark` (80),
  `source_version`, `is_published`.
- `exam_domains` — `domain_no`, `name`, `weight`, `item_target` (blueprint weighting).
- `case_studies` — `case_key` (e.g. `asteron`), `title`, `question_range`, `scenario`.
- `questions` — `exam_id`, `domain_no`, `case_key?`, `variant`, `selection`
  (single|multi), `answer_count?`, `stem`, `rationale`, `concept`, `lesson`, `bloom`,
  `difficulty`, `confidence`, `reference`, `is_free`, plus metadata arrays
  (`official_terminology`, `distractor_patterns`, `cross_modules`).
- `question_options` — `question_id`, `letter`, `text`, `is_correct`, `explanation`.
- `app_users` · `entitlements` (scope exam_id|all_access, source purchase|subscription,
  expires_at) · `products` · `subscriptions` · `payments` · `test_attempts` ·
  `attempt_answers`.

**Security invariant:** correct answers + explanations for **locked** questions are
never sent to the client. Access decisions go through one `hasAccess()` helper.
Payments are granted by **verified webhooks**, not browser redirects.

## Phases (each an independently committable, tested slice)

- **Phase 0 — Foundation.** ✅ Scaffold, tooling, CI, Sentry, tested scoring core.
- **Phase 1 — Data & import.** Postgres schema + RLS + migrations; importer for the
  mock `DATA` format; seed the CCAO-F sample; Docker + integration tests.
- **Phase 2 — Auth + free quiz.** Auth provider interface; dashboard; free sample quiz;
  server scoring; results screen; e2e.
- **Phase 3 — Timed mock engine.** Timer, navigator, flag-for-review, scaled scoring
  with domain + Bloom breakdown, attempt persistence/resume; e2e.
- **Phase 4 — Paywall + Razorpay (USD).** Entitlements; one-time unlock + all-access
  subscription; signed webhooks; Resend receipts; integration + e2e tests.
- **Phase 5 — GTM polish.** PostHog funnels, pricing, per-exam SEO pages, result emails.
- **Phase 6 — Later.** Pinecone + Claude API "explain my mistakes" AI tutor.

## Testing strategy (full pyramid)

- **Unit (Vitest):** pure logic — `scoring.ts`, `entitlements.ts`, importer parsing,
  Razorpay signature verification.
- **Integration (Vitest + Postgres):** migrations, importer→DB, entitlement queries,
  webhook handlers against a real database (Dockerized locally / service in CI).
- **E2E (Playwright):** the money path — land → free quiz → paywall → (test-mode)
  purchase → unlock → timed mock → scored result.
- **CI/CD (GitHub Actions):** unit + integration (Postgres service) + e2e + build on
  every PR; Docker image build.

## Legal & trust guardrails
- Original questions only (no braindumps). "Not affiliated with, endorsed by, or
  sponsored by Anthropic" on every surface; careful trademark use of "Claude".
- Terms / Privacy / Refund; USD pricing; tax handling per Razorpay international.
