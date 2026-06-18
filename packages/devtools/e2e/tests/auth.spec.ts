import { expect, test } from "@playwright/test";
import { DEVTOOLS_AUTH_URL } from "../fixtures/ports.js";
import {
  readStoredTokens,
  SEED_CLIENT_ID,
  seedAuthInLocalStorage,
} from "../fixtures/seed-auth.js";

test.describe("devtools auth", () => {
  test("connects to an authenticated server when a token is pre-seeded", async ({
    page,
  }) => {
    await seedAuthInLocalStorage(page);

    await page.goto(`${DEVTOOLS_AUTH_URL}/?tool=whoami`);

    await expect(page.getByText("e2e-auth-fixture")).toBeVisible();
    await expect(page.getByText("Connected")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "whoami", exact: true }),
    ).toBeVisible();

    // Every tool header has its own Run button — scope to this tool.
    await page
      .locator('[data-tool-name="whoami"]')
      .getByRole("button", { name: /^run$/i })
      .click();
    await expect(page.getByRole("main")).toContainText(SEED_CLIENT_ID);
  });

  test("performs the full OAuth flow when no token is pre-seeded", async ({
    page,
  }) => {
    // Clean localStorage forces the SDK to walk the full RFC 7591 + OAuth 2.1
    // path: POST /register → GET /authorize (302 with code) → POST /token.
    await page.goto(`${DEVTOOLS_AUTH_URL}/`);

    await expect(page.getByText("e2e-auth-fixture")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Connected")).toBeVisible();

    await page.getByRole("button", { name: "whoami", exact: true }).click();
    await page
      .locator('[data-tool-name="whoami"]')
      .getByRole("button", { name: /^run$/i })
      .click();

    // The clientId is whatever the mock AS minted during DCR — a UUID, not
    // the pre-seeded client id. Asserting the UUID shape verifies that the
    // dynamically-issued access token reached the tool handler intact.
    await expect(page.getByRole("main")).toContainText(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );
  });

  test("clicking sign out clears tokens and returns to the disconnected state", async ({
    page,
  }) => {
    await seedAuthInLocalStorage(page);

    await page.goto(`${DEVTOOLS_AUTH_URL}/`);
    await expect(page.getByText("Connected")).toBeVisible();

    await page.getByRole("button", { name: /sign out/i }).click();

    // logout() resets requiresAuth to false, so the UI shows the generic
    // "Not connected" prompt instead of the auth-required one. The status
    // badge and Sign out button both disappear.
    await expect(page.getByText(/not connected to a server/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^connect$/i }),
    ).toBeVisible();
    await expect(
      page.getByText("Connected", { exact: true }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign out/i }),
    ).not.toBeVisible();

    expect(await readStoredTokens(page)).toBeNull();
  });
});
