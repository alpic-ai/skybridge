import { expect, type Page, test } from "@playwright/test";

const DEVTOOLS_AUTH_URL = "http://localhost:5174";
const VALID_TOKEN = "e2e-auth-valid-token";
const CLIENT_ID = "e2e-auth-client";
const TOKENS_KEY = "skybridge-devtools-oauth:tokens";
const CLIENT_INFO_KEY = "skybridge-devtools-oauth:client-info";

async function seedAuthInLocalStorage(
  page: Page,
  token: string,
): Promise<void> {
  await page.addInitScript(
    ({ token, clientId, tokensKey, clientInfoKey }) => {
      window.localStorage.setItem(
        tokensKey,
        JSON.stringify({
          access_token: token,
          token_type: "Bearer",
          expires_in: 3600,
        }),
      );
      window.localStorage.setItem(
        clientInfoKey,
        JSON.stringify({
          client_id: clientId,
          redirect_uris: [`${window.location.origin}/?oauth_callback=true`],
        }),
      );
    },
    {
      token,
      clientId: CLIENT_ID,
      tokensKey: TOKENS_KEY,
      clientInfoKey: CLIENT_INFO_KEY,
    },
  );
}

test.describe("devtools auth", () => {
  test("connects to an authenticated server when a token is pre-seeded", async ({
    page,
  }) => {
    await seedAuthInLocalStorage(page, VALID_TOKEN);

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
    await page.getByRole("button", { name: /^run$/i }).click();

    // The clientId is whatever the mock AS minted during DCR — a UUID, not
    // the pre-seeded CLIENT_ID. Asserting the UUID shape verifies that the
    // dynamically-issued access token reached the tool handler intact.
    await expect(page.getByRole("main")).toContainText(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/,
    );
  });

  test("clicking sign out clears tokens and returns to the disconnected state", async ({
    page,
  }) => {
    await seedAuthInLocalStorage(page, VALID_TOKEN);

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

    const tokensAfter = await page.evaluate(
      (key) => window.localStorage.getItem(key),
      TOKENS_KEY,
    );
    expect(tokensAfter).toBeNull();
  });
});
