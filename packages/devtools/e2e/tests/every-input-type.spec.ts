import { expect, test } from "@playwright/test";

test.describe("every-input-type tool", () => {
  test("returns each filled field as structuredContent", async ({ page }) => {
    await page.goto("/");

    const tool = page.locator('[data-tool-name="every-input-type"]');

    await tool.getByLabel("name").fill("Alice");
    await tool.getByLabel("age").fill("30");
    await tool.getByLabel("favoriteNumber").fill("7");
    await tool.getByLabel("isDeveloper").click();
    await tool.getByLabel("bio").fill("hello world");

    await tool.getByLabel("experienceLevel").click();
    await page.getByRole("option", { name: "advanced" }).click();

    await tool.getByLabel("colors").click();
    await page.getByRole("option", { name: "red" }).click();
    await page.getByRole("option", { name: "blue" }).click();
    await page.keyboard.press("Escape");

    await tool.getByLabel("enableNotifications").click();
    await tool.getByLabel("maxExamples").fill("5");
    await tool.getByLabel("theme").click();
    await page.getByRole("option", { name: "dark" }).click();

    await tool.getByRole("button", { name: /^run$/i }).click();

    const main = page.getByRole("main");
    await expect(main).toContainText('"name": "Alice"');
    await expect(main).toContainText('"age": 30');
    await expect(main).toContainText('"favoriteNumber": 7');
    await expect(main).toContainText('"isDeveloper": true');
    await expect(main).toContainText('"experienceLevel": "advanced"');
    await expect(main).toContainText('"bio": "hello world"');
    await expect(main).toContainText('"red"');
    await expect(main).toContainText('"blue"');
    await expect(main).toContainText('"enableNotifications": true');
    await expect(main).toContainText('"maxExamples": 5');
    await expect(main).toContainText('"theme": "dark"');
  });
});
