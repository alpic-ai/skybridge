import { expect, test } from "@playwright/test";

test.describe("devtools smoke", () => {
  test("connects to the fixture and lists tools", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("e2e-fixture")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "echo", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "echo-card", exact: true }),
    ).toBeVisible();
  });

  test("calls a plain tool and renders the response", async ({ page }) => {
    await page.goto("/");

    const token = `ping-${crypto.randomUUID()}`;
    const echo = page.locator('[data-tool-name="echo"]');
    await echo.getByLabel("message").fill(token);
    await echo.getByRole("button", { name: /^run$/i }).click();

    // Token appears in the rendered JSON response in the main panel.
    await expect(page.getByRole("main")).toContainText(token);
  });

  test("calls a widget tool and renders inside the iframe", async ({
    page,
  }) => {
    await page.goto("/");

    const token = `card-${crypto.randomUUID()}`;
    const echoCard = page.locator('[data-tool-name="echo-card"]');
    await echoCard.getByLabel("message").fill(token);
    await echoCard.getByRole("button", { name: /^run$/i }).click();

    // First-time view compilation by Vite can take a few seconds.
    const widget = page.frameLocator('iframe[title="html-preview"]');
    await expect(widget.getByText(token)).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("visibility badge", () => {
  test("renders both scopes when visibility is ['model', 'app']", async ({
    page,
  }) => {
    await page.goto("/");
    const badges = page
      .locator('[data-tool-name="dual-visibility-tool"]')
      .getByTestId("tool-visibility");
    await expect(badges).toBeVisible();
    await expect(badges.getByText("model", { exact: true })).toBeVisible();
    await expect(badges.getByText("app", { exact: true })).toBeVisible();
  });

  test("renders only the model badge when visibility is ['model']", async ({
    page,
  }) => {
    await page.goto("/");
    const badges = page
      .locator('[data-tool-name="model-only-tool"]')
      .getByTestId("tool-visibility");
    await expect(badges).toBeVisible();
    await expect(badges.getByText("model", { exact: true })).toBeVisible();
    await expect(badges.getByText("app", { exact: true })).toHaveCount(0);
  });

  test("renders only the app badge when visibility is ['app']", async ({
    page,
  }) => {
    await page.goto("/");
    const badges = page
      .locator('[data-tool-name="app-only-tool"]')
      .getByTestId("tool-visibility");
    await expect(badges).toBeVisible();
    await expect(badges.getByText("app", { exact: true })).toBeVisible();
    await expect(badges.getByText("model", { exact: true })).toHaveCount(0);
  });

  test("hides the badge area when visibility is not set", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.locator('[data-tool-name="echo"]').getByTestId("tool-visibility"),
    ).toHaveCount(0);
  });
});
