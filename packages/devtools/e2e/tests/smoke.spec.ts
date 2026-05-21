import { expect, test } from "@playwright/test";

test.describe("devtools smoke", () => {
  test("connects to the fixture and lists tools", async ({ page }) => {
    await page.goto("/?tool=echo");

    await expect(page.getByText("e2e-fixture")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "echo", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "echo-card", exact: true }),
    ).toBeVisible();
  });

  test("calls a plain tool and renders the response", async ({ page }) => {
    await page.goto("/?tool=echo");

    const token = `ping-${crypto.randomUUID()}`;
    await page.getByLabel("message").fill(token);
    await page.getByRole("button", { name: /^run$/i }).click();

    // Token appears in the rendered JSON response in the main panel.
    await expect(page.getByRole("main")).toContainText(token);
  });

  test("calls a widget tool and renders inside the iframe", async ({
    page,
  }) => {
    await page.goto("/?tool=echo-card");

    const token = `card-${crypto.randomUUID()}`;
    await page.getByLabel("message").fill(token);
    await page.getByRole("button", { name: /^run$/i }).click();

    // First-time view compilation by Vite can take a few seconds.
    const widget = page.frameLocator('iframe[title="html-preview"]');
    await expect(widget.getByText(token)).toBeVisible({ timeout: 20_000 });
  });
});
