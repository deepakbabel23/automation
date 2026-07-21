# Running MockCred locally

Two ways to run it: **Docker (one command)** or **manual (Node + Postgres)**.
The app lives in the `mockcred/` subdirectory of the repo.

---

## Option A — Docker (recommended, one command)

Prereqs: Docker Desktop (or Docker Engine + Compose v2).

```bash
git clone https://github.com/deepakbabel23/automation.git
cd automation/mockcred
docker compose up --build
```

What happens: Postgres starts, a one-off `migrate` service creates the schema and
seeds the sample CCAO-F mock, then the app starts.

Open **http://localhost:3000**.

Stop with `Ctrl-C`. To wipe the database and reseed from scratch:

```bash
docker compose down -v && docker compose up --build
```

---

## Option B — Manual (Node 20+ and Postgres 16)

Prereqs: Node 20+, npm, a running Postgres 16.

```bash
git clone https://github.com/deepakbabel23/automation.git
cd automation/mockcred
npm install
```

Create a database and point the app at it:

```bash
# Example using a local Postgres superuser:
createdb mockcred
createuser mockcred --pwprompt   # set password: mockcred

cp .env.example .env.local
# Edit .env.local so DATABASE_URL matches your Postgres, e.g.:
#   DATABASE_URL=postgresql://mockcred:mockcred@localhost:5432/mockcred
```

Migrate, seed, and run:

```bash
npm run db:migrate     # create tables + RLS
npm run db:seed        # import the sample CCAO-F mock + products
npm run dev            # http://localhost:3000
```

---

## Importing your own question bank

Export a mock as HTML (containing the `const DATA = {…}` object) or as JSON, then:

```bash
# publish it and expose questions 1–10 as the free sample:
npm run import -- path/to/your-mock.html --publish --free 1,2,3,4,5,6,7,8,9,10
```

Re-importing the same slug is safe — it replaces that exam's content in place.

---

## Tests

```bash
npm run typecheck        # TypeScript
npm run lint             # ESLint
npm test                 # unit (Vitest) — no DB needed
npm run test:integration # integration (Vitest) — needs DATABASE_URL + migrated DB
npm run test:e2e         # end-to-end (Playwright) — needs the app buildable
```

For e2e, install the browser once: `npx playwright install --with-deps chromium`.
(If you are on a sandbox/CI image that already ships Chromium at a different
revision, set `PW_CHROMIUM_PATH=/path/to/chrome` to reuse it.)

The e2e runner builds and starts the app automatically. To test against an
already-running instance, set `E2E_BASE_URL=http://localhost:3000`.

---

## Handy references
- `docs/PLAN.md` — the build plan and phases.
- `docs/CHECKPOINTS.md` — what's done + divergences from the plan.
- `CLAUDE.md` — conventions, security invariants, commands.
