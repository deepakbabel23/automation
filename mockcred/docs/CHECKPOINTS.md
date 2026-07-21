# Checkpoints & Divergence Log

Tracks the actual state of the build against [`PLAN.md`](./PLAN.md): what was
delivered at each checkpoint, how it was verified, and every deliberate divergence
from the original plan (with rationale). Update this on every phase.

## Legend
`DONE` shipped & verified · `WIP` in progress · `TODO` not started · `Dx` divergence.

---

## Resolved decisions (open questions from planning, now answered)

| # | Question | Decision |
|---|----------|----------|
| Q1 | Sales geography | **International (USD).** Razorpay in international mode; prices in USD. |
| Q2 | Question-bank import format | The self-contained mock **`DATA` object** (JS/JSON embedded in an HTML export). Canonical sample committed at `content/samples/CCAOF_Impossible_Mock_01.html` and used as the import + test fixture. |
| Q3 | First exam track | **CCAO-F** — Claude Certified Associate (Foundations): 60 items, 120 min, scaled 100–1000, pass 720, 7 weighted domains, Bloom targets. |

---

## Divergences from the original plan

| # | Divergence | Rationale |
|---|-----------|-----------|
| D1 | Added **Next.js + TypeScript + Tailwind** (not literally in the tools image). | It is the glue the stack (Vercel/Supabase/Clerk/Razorpay JS) implies; established + well-supported. Noted in the approved plan. |
| D2 | **Razorpay** replaces **Stripe**. | Owner already has a Razorpay account. |
| D3 | **Pinecone + Claude API** deferred to **Phase 6**. | Owner imports an existing bank, so no AI generation is needed for the MVP; keeps scope tight. |
| D4 | App lives in a **`mockcred/` subdirectory** of the `automation` repo (not repo root). | Avoids clobbering the pre-existing Slack utility; keeps the SaaS self-contained. |
| D5 | Dev/test/CI run against **Postgres in Docker**; **Supabase** is the production deployment of the same schema/migrations. | Supabase *is* Postgres. Enables fully offline, dockerized integration/e2e testing without a Supabase account or secrets. Migrations and RLS are written in portable SQL. |
| D6 | **Auth is behind a provider interface.** Default `dev`/`test`/MVP provider is a self-contained signed-cookie session; **Clerk** is a documented drop-in for production (`AUTH_PROVIDER=clerk`). | Clerk needs an account/secrets and cannot run in offline CI/e2e. The interface keeps the app fully testable while preserving the planned Clerk path. |
| D7 | The **Razorpay client is injectable/mockable**; signature verification is a pure function. | Lets payment flows + webhook verification be unit/integration-tested offline with deterministic HMAC; live end-to-end still needs Razorpay test keys. |
| D8 | Scoring surfaces **both** a raw percentage (with the sample's 80% "mastery benchmark") **and** the scaled 100–1000 view (pass 720). | The sample deck itself distinguishes the two; raw % is the learning signal, scaled is the certification signal. |

---

## Phase 0 — Foundation — `DONE`

**Delivered:** Next.js 14 + TS + Tailwind scaffold; landing page with "unofficial /
not affiliated" disclaimer; tested pure scoring core (`lib/scoring.ts`); ESLint +
Prettier + Vitest; strict TS; GitHub Actions CI (typecheck/lint/test/build); Sentry
(no-op without DSN); `CLAUDE.md`; `.env.example`; `vercel.json`.

**Verification:** `typecheck ✓ · lint ✓ · 7 unit tests ✓ · build ✓` locally; CI on PR #1.

**Artifacts:** PR [#1](https://github.com/deepakbabel23/automation/pull/1) (draft),
commit `8c1bbb6`.

---

## Phase 1 — Data & import — `WIP`

**Scope:** Postgres schema + RLS + migrations; importer for the mock `DATA` format;
seed the CCAO-F sample (with free-question flags for freemium); Dockerfile +
docker-compose (app + Postgres); integration tests against Postgres; CI integration
job (Postgres service) + Playwright e2e skeleton.

**Verification (planned):** migrate → import sample → assert 60 questions across 7
domains, 1 case study (`asteron`), single/multi split (52/8), free/locked split;
integration suite green in CI against a Postgres service.

---

## Phases 2–4 — `TODO`

See `PLAN.md`. Each will append its own checkpoint entry here on completion.
