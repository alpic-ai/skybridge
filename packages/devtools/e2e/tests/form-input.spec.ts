import { expect, test } from "@playwright/test";

test("fills a requestFormInput form and returns the answer to the tool", async ({
  page,
}) => {
  await page.goto("/");
  const tool = page.locator('[data-tool-name="pick-part"]');
  const dialog = page.getByRole("dialog");

  await tool.getByRole("button", { name: /^run$/i }).click();
  await expect(dialog).toContainText("Choose a part to inspect");
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByText("M6 nut").click();
  await dialog.getByRole("combobox").fill("zinc");
  await dialog.getByRole("button", { name: "Submit" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("main")).toContainText("Picked nut zinc");

  await tool.getByRole("button", { name: /^run$/i }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("main")).toContainText("Form cancel");
});
