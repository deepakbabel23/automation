import { expect, test } from "@playwright/test";

const EXAM_SLUG = "ccao-f-impossible-mock-01";

test("start a timed mock, answer with the navigator + timer, and submit", async ({
  page,
}) => {
  const email = `e2e_timed_${Date.now()}@example.com`;
  await page.goto("/sign-in");
  await page.getByTestId("email").fill(email);
  await page.getByTestId("sign-in").click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.getByTestId(`exam-link-${EXAM_SLUG}`).click();
  await page.getByTestId("start-timed").click();

  // Timed runner: timer + navigator present.
  await expect(page).toHaveURL(/\/attempts\//);
  await expect(page.getByTestId("timer")).toBeVisible();
  await expect(page.getByTestId("nav-0")).toBeVisible();

  // Answer the first question, advance, answer the second, flag it.
  await page.locator('button[data-testid^="opt-"]').first().click();
  await page.getByTestId("next").click();
  await page.locator('button[data-testid^="opt-"]').first().click();
  await page.getByTestId("flag").click();

  // Submit early and see the score.
  await page.getByTestId("submit-exam").click();
  await expect(page.getByTestId("results-summary")).toBeVisible();
  await expect(page.getByTestId("raw-percent")).toBeVisible();
});
