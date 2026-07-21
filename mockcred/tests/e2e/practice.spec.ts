import { expect, test } from "@playwright/test";

const EXAM_SLUG = "ccao-f-impossible-mock-01";

test("sign in, take the free practice quiz, and see a score", async ({ page }) => {
  // Unique email per run so the dev-auth user is fresh.
  const email = `e2e_${Date.now()}@example.com`;

  // Sign in (dev provider).
  await page.goto("/sign-in");
  await page.getByTestId("email").fill(email);
  await page.getByTestId("sign-in").click();

  // Lands on the dashboard.
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByTestId("user-email")).toHaveText(email);

  // Open the seeded exam and start free practice.
  await page.getByTestId(`exam-link-${EXAM_SLUG}`).click();
  await expect(page).toHaveURL(new RegExp(`/exams/${EXAM_SLUG}`));
  await page.getByTestId("start-practice").click();

  // On the quiz: answer every question by picking its first option.
  await expect(page).toHaveURL(/\/attempts\//);
  const questions = page.locator('[data-testid^="question-"]');
  const count = await questions.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    await questions.nth(i).locator('button[data-testid^="opt-"]').first().click();
  }

  // Submit and see the score.
  await page.getByTestId("submit-quiz").click();
  await expect(page.getByTestId("results-summary")).toBeVisible();
  await expect(page.getByTestId("raw-percent")).toBeVisible();
});
