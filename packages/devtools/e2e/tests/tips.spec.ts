import { expect, test } from "@playwright/test";

const WEBMCP_TIP_TITLE = "Drive DevTools from your coding agent";

test.describe("tips", () => {
  test("opens the tips dialog and links to the WebMCP docs", async ({
    page,
  }) => {
    await page.goto("/");

    const tips = page.getByRole("button", { name: "Tips" });
    await expect(tips).toBeVisible();
    await tips.click();

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

    const unseen = page.getByTestId("tips-unseen");
    await expect(unseen).toBeVisible();

    await page.getByRole("button", { name: "Tips" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(unseen).toBeHidden();

    // The indicator is intentionally not persisted, so every fresh load of
    // DevTools advertises the tips again.
    await page.reload();
    await expect(page.getByTestId("tips-unseen")).toBeVisible();
  });
});
