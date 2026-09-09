import { expect, test } from "@playwright/test";

const WEBMCP_TIP_TITLE = "Drive DevTools from your coding agent";

test.describe("webmcp", () => {
  test("opens the WebMCP dialog and links to the docs", async ({ page }) => {
    await page.goto("/");

    const trigger = page.getByRole("button", { name: "webmcp" });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText(WEBMCP_TIP_TITLE)).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "Set it up" }),
    ).toHaveAttribute(
      "href",
      "https://docs.skybridge.tech/test/devtools#set-it-up",
    );
    await expect(
      dialog.getByRole("link", { name: "What is WebMCP?" }),
    ).toHaveAttribute(
      "href",
      "https://www.webfuse.com/blog/what-is-webmcp-the-practical-guide-to-the-web-model-context-protocol",
    );
  });

  test("drops the unseen indicator once opened, and shows it again on reload", async ({
    page,
  }) => {
    await page.goto("/");

    const unseen = page.getByTestId("webmcp-unseen");
    await expect(unseen).toBeVisible();

    await page.getByRole("button", { name: "webmcp" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(unseen).toBeHidden();

    // The indicator is intentionally not persisted, so every fresh load of
    // DevTools advertises WebMCP again.
    await page.reload();
    await expect(page.getByTestId("webmcp-unseen")).toBeVisible();
  });
});
