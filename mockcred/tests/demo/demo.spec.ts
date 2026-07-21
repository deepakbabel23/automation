import { mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";

const EXAM = "ccao-f-impossible-mock-01";
const SHOTS = "demo/screens";

/**
 * End-to-end product walkthrough used to produce the demo video (via the
 * demo Playwright config's `video: "on"`) and a numbered screenshot per step.
 */
test("MockCred product walkthrough", async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  const shot = (name: string) =>
    page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  // Viewport-only shot for very tall pages (e.g. 60-question results).
  const shotView = (name: string) =>
    page.screenshot({ path: `${SHOTS}/${name}.png` });
  const pause = () => page.waitForTimeout(700); // brief hold for the video

  // 1. Landing
  await page.goto("/");
  await pause();
  await shot("01-landing");

  // 2. Sign in
  await page.goto("/sign-in");
  await page.getByTestId("email").fill(`demo_${Date.now()}@example.com`);
  await pause();
  await shot("02-sign-in");
  await page.getByTestId("sign-in").click();
  await expect(page).toHaveURL(/\/dashboard/);
  await shot("03-dashboard");

  // 3. Exam overview
  await page.getByTestId(`exam-link-${EXAM}`).click();
  await expect(page).toHaveURL(new RegExp(`/exams/${EXAM}`));
  await pause();
  await shot("04-exam-overview");

  // 4. Free practice quiz
  await page.getByTestId("start-practice").click();
  await expect(page).toHaveURL(/\/attempts\//);
  await shot("05-free-practice");
  const questions = page.locator('[data-testid^="question-"]');
  const count = await questions.count();
  for (let i = 0; i < count; i++) {
    await questions.nth(i).locator('button[data-testid^="opt-"]').first().click();
  }
  await shot("06-practice-answered");
  await page.getByTestId("submit-quiz").click();
  await expect(page.getByTestId("results-summary")).toBeVisible();
  await pause();
  await shotView("07-practice-results");

  // 5. Full timed mock
  await page.goto(`/exams/${EXAM}`);
  await page.getByTestId("start-timed").click();
  await expect(page.getByTestId("timer")).toBeVisible();
  await pause();
  await shot("08-timed-exam");
  await page.locator('button[data-testid^="opt-"]').first().click();
  await page.getByTestId("flag").click();
  await page.getByTestId("next").click();
  await page.locator('button[data-testid^="opt-"]').first().click();
  await shot("09-timed-navigator");
  await page.getByTestId("submit-exam").click();
  await expect(page.getByTestId("results-summary")).toBeVisible();
  await pause();
  await shotView("10-timed-results");

  // 6. Pricing
  await page.goto("/pricing");
  await pause();
  await shot("11-pricing");
});
