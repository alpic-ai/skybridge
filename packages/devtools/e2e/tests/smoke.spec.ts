import { expect, test } from "@playwright/test";

test.describe("devtools smoke", () => {
  test("connects to the fixture and lists tools", async ({ page }) => {
    await page.goto("/?tool=echo");

    await expect(page.getByText("e2e-fixture")).toBeVisible();
    await expect(page.locator('button[data-id="echo"]')).toBeVisible();
    await expect(page.locator('button[data-id="echo-card"]')).toBeVisible();
  });

  test("calls a plain tool and renders the response", async ({ page }) => {
    await page.goto("/?tool=echo");

    const token = `ping-${crypto.randomUUID()}`;
    await page.getByLabel("message").fill(token);
    await page.getByRole("button", { name: /call tool/i }).click();

    await expect(page.getByTestId("tool-response")).toContainText(token);
  });

  test("calls a widget tool and renders inside the iframe", async ({
    page,
  }) => {
    await page.goto("/?tool=echo-card");

    const token = `card-${crypto.randomUUID()}`;
    await page.getByLabel("message").fill(token);
    await page.getByRole("button", { name: /call tool/i }).click();

    const widget = page.frameLocator('[data-testid="tool-widget-iframe"]');
    await expect(widget.getByTestId("echo-card-message")).toContainText(token);
  });
});
