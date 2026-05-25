import type { Page } from "@playwright/test";

export const SEED_TOKEN = "e2e-auth-valid-token";
export const SEED_CLIENT_ID = "e2e-auth-client";

const TOKENS_KEY = "skybridge-devtools-oauth:tokens";
const CLIENT_INFO_KEY = "skybridge-devtools-oauth:client-info";

export async function seedAuthInLocalStorage(
  page: Page,
  token: string = SEED_TOKEN,
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
      clientId: SEED_CLIENT_ID,
      tokensKey: TOKENS_KEY,
      clientInfoKey: CLIENT_INFO_KEY,
    },
  );
}

export async function readStoredTokens(page: Page): Promise<string | null> {
  return page.evaluate((key) => window.localStorage.getItem(key), TOKENS_KEY);
}
