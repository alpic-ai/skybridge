import { expect, test } from "@playwright/test";

test.describe("tool errors", () => {
  test("keeps the view unrendered and shows the error output", async ({
    page,
  }) => {
    await page.goto("/");

    const errorCard = page.locator('[data-tool-name="error-card"]');
    await errorCard.locator('[data-slot="accordion-trigger"]').click();
    await errorCard.getByRole("button", { name: /^run$/i }).click();

    await expect(page.getByRole("main")).toContainText("the tool failed");
    await expect(page.getByTestId("view-skipped-on-error")).toBeVisible();
    await expect(page.locator('iframe[title="html-preview"]')).toHaveCount(0);
  });
});
