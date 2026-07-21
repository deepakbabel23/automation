# Product demo

A full end-to-end walkthrough of MockCred, captured with Playwright.

- **`mockcred-demo.webm`** — screen recording of the whole flow.
- **`screens/`** — a numbered screenshot per step:

| # | Screen |
|---|--------|
| 01 | Landing page (with the "not affiliated with Anthropic" disclaimer) |
| 02 | Sign in |
| 03 | Dashboard (available exams) |
| 04 | Exam overview (free practice + full timed mock) |
| 05 | Free practice quiz |
| 06 | Practice — answered |
| 07 | Practice results (scaled score, per-domain breakdown, full review) |
| 08 | Full timed mock (countdown timer + navigator) |
| 09 | Timed mock — flag-for-review + navigator |
| 10 | Timed results |
| 11 | Pricing |

## Regenerate

```bash
# from mockcred/, with a seeded database and the app buildable:
npm run build
npm run demo        # writes demo/screens/*.png and a video under demo/artifacts/
```

The runner starts the app itself. Set `E2E_BASE_URL` to point at a running
instance instead. On a sandbox image whose bundled Chromium differs, set
`PW_CHROMIUM_PATH=/path/to/chrome`.
