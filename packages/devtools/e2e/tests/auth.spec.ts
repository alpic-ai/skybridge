import { expect, test } from "@playwright/test";

const DEVTOOLS_AUTH_URL = "http://localhost:5174";
const VALID_TOKEN = "e2e-auth-valid-token";
const CLIENT_ID = "e2e-auth-client";

test.describe("devtools auth", () => {
  test("connects to an authenticated server when a token is pre-seeded", async ({
    page,
  }) => {
    await page.addInitScript((token) => {
      const PREFIX = "skybridge-devtools-oauth";
      window.localStorage.setItem(
        `${PREFIX}:tokens`,
        JSON.stringify({
          access_token: token,
          token_type: "Bearer",
          expires_in: 3600,
        }),
      );
      window.localStorage.setItem(
        `${PREFIX}:client-info`,
        JSON.stringify({
          client_id: "e2e-test-client",
          redirect_uris: [`${window.location.origin}/?oauth_callback=true`],
        }),
      );
    }, VALID_TOKEN);

    await page.goto(`${DEVTOOLS_AUTH_URL}/?tool=whoami`);

    await expect(page.getByText("e2e-auth-fixture")).toBeVisible();
    await expect(page.getByText("Connected")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "whoami", exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: /^run$/i }).click();
    await expect(page.getByRole("main")).toContainText(CLIENT_ID);
  });
});
