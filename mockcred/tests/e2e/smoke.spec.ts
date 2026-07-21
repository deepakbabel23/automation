import { expect, test } from "@playwright/test";

test("landing page shows the product and the unofficial disclaimer", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    /Claude Certification/i,
  );
  await expect(page.getByText(/not affiliated with/i)).toBeVisible();
});

test("landing page links to exams and pricing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /browse exams/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /pricing/i })).toBeVisible();
});
