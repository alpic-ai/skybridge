import { expect, type Page, test } from "@playwright/test";
import { DEVTOOLS_MIXED_AUTH_URL } from "../fixtures/ports.js";
import {
  SEED_CLIENT_ID,
  seedAuthInLocalStorage,
} from "../fixtures/seed-auth.js";

// Each tool header carries its own Run button; scope it to the tool under test.
const runFor = (page: Page, tool: string) =>
  page
    .locator(`[data-tool-name="${tool}"]`)
    .getByRole("button", { name: /^run$/i });

test.describe("devtools mixed auth", () => {
  test("connects anonymously and exposes a sign-in CTA when the server has any auth-required tool", async ({
    page,
  }) => {
    await page.goto(`${DEVTOOLS_MIXED_AUTH_URL}/`);

    await expect(page.getByText("e2e-mixed-auth-fixture")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Connected")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^sign in$/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign out/i }),
    ).not.toBeVisible();
  });

  test("anonymous user can call a noauth tool", async ({ page }) => {
    await page.goto(`${DEVTOOLS_MIXED_AUTH_URL}/?tool=whoami`);

    await expect(page.getByText("Connected")).toBeVisible();

    const runButton = runFor(page, "whoami");
    await expect(runButton).toBeEnabled();
    await runButton.click();
    await expect(page.getByRole("main")).toContainText("anonymous");
  });

  test("auth-required tool's Run button is disabled with a tooltip while anonymous", async ({
    page,
  }) => {
    await page.goto(`${DEVTOOLS_MIXED_AUTH_URL}/?tool=private-whoami`);

    await expect(page.getByText("Connected")).toBeVisible();

    const runButton = runFor(page, "private-whoami");
    await expect(runButton).toBeDisabled();

    // Hovering the wrapper span surfaces the tooltip even though the button
    // is disabled.
    await runButton.hover({ force: true });
    await expect(page.getByText(/sign in to call this tool/i)).toBeVisible();
  });

  test("after pre-seeded sign-in, the auth-required tool runs and returns the authenticated clientId", async ({
    page,
  }) => {
    await seedAuthInLocalStorage(page);

    await page.goto(`${DEVTOOLS_MIXED_AUTH_URL}/?tool=private-whoami`);

    await expect(page.getByText("Connected")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^sign in$/i }),
    ).not.toBeVisible();

    const runButton = runFor(page, "private-whoami");
    await expect(runButton).toBeEnabled();
    await runButton.click();
    await expect(page.getByRole("main")).toContainText(SEED_CLIENT_ID);
  });

  test("sign out drops the user back to anonymous and re-disables auth-required tools", async ({
    page,
  }) => {
    await seedAuthInLocalStorage(page);

    await page.goto(`${DEVTOOLS_MIXED_AUTH_URL}/?tool=private-whoami`);
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();

    await page.getByRole("button", { name: /sign out/i }).click();

    // logout() resets the store to idle; clicking Connect re-runs the
    // anonymous-first flow.
    await page.getByRole("button", { name: /^connect$/i }).click();

    await expect(page.getByText("Connected")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^sign in$/i }),
    ).toBeVisible();

    const runButton = runFor(page, "private-whoami");
    await expect(runButton).toBeDisabled();
  });

  test("full OAuth sign-in flow grants access to auth-required tools", async ({
    page,
  }) => {
    // No localStorage seed; clicking "Sign in" must walk the full
    // DCR + /authorize + /token path against the mock AS.
    await page.goto(`${DEVTOOLS_MIXED_AUTH_URL}/?tool=private-whoami`);

    await expect(page.getByText("Connected")).toBeVisible({ timeout: 10_000 });
    await expect(runFor(page, "private-whoami")).toBeDisabled();

    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      page.getByRole("button", { name: /^sign in$/i }),
    ).not.toBeVisible();

    // The OAuth callback strips query params, so reselect the auth-required
    // tool before running it.
    await page
      .getByRole("button", { name: "private-whoami", exact: true })
      .click();

    const runButton = runFor(page, "private-whoami");
    await expect(runButton).toBeEnabled();
    await runButton.click();

    // The clientId is whatever the mock AS minted during DCR — a UUID, not
    // the pre-seeded SEED_CLIENT_ID.
    await expect(page.getByRole("main")).toContainText(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );
  });
});
