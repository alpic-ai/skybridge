import { expect, type Locator, test } from "@playwright/test";

// Issue #841: the preview surface (the area behind the rendered view) must
// darken with the dark theme in every display mode, and the grid must stay
// visible. Colours come from the centralized @theme tokens in index.css:
//   light: --color-background #ffffff → rgb(255, 255, 255)
//   dark:  --color-background #071718 → rgb(7, 23, 24)
const LIGHT_SURFACE = "rgb(255, 255, 255)";
const DARK_SURFACE = "rgb(7, 23, 24)";
const LIGHT_GRID = "#e3eaea";
const DARK_GRID = "#1f4449";

test.describe("preview surface (issue #841)", () => {
  // The preview container: the div wrapping the view iframe, whose background
  // is `var(--preview-surface)`. Selected via its iframe child so it stays
  // stable regardless of layout classes.
  let container: Locator;
  // The scrollable region behind the container that carries `data-theme` and
  // the grid CSS variables.
  let previewRegion: Locator;
  // The view-options toolbar form holding the display-mode radios and the
  // theme checkbox (all sr-only inputs wrapped in visible labels).
  let toolbar: Locator;

  test.beforeEach(async ({ page }) => {
    await page.goto("/");

    // Run the echo-card widget so a view iframe renders.
    const echoCard = page.locator('[data-tool-name="echo-card"]');
    await echoCard.locator('[data-slot="accordion-trigger"]').click();
    await echoCard.getByLabel("message").fill("test");
    await echoCard.getByRole("button", { name: /^run$/i }).click();

    // View compilation by Vite can be slow under the full suite.
    const iframe = page.frameLocator('iframe[title="html-preview"]');
    await expect(iframe.getByText("test")).toBeVisible({ timeout: 45_000 });

    container = page.locator('div:has(> iframe[title="html-preview"])');
    previewRegion = page.locator(".preview-region");
    toolbar = page.locator('form[toolname="devtools_set_view_options"]');
  });

  // Display-mode buttons are radios (values fullscreen | pip | inline) hidden
  // inside visible labels; click the label to select the mode.
  const setDisplayMode = (mode: string) =>
    toolbar.locator(`label:has(input[value="${mode}"])`).click();

  // The theme toggle is a checkbox (name="darkTheme") hidden inside a visible
  // label; clicking the label flips light ⇄ dark.
  const toggleTheme = () =>
    toolbar.locator('label:has(input[name="darkTheme"])').click();

  test("fullscreen: surface darkens with dark theme", async () => {
    // Fullscreen desktop is the default display mode.
    await expect(container).toHaveCSS("background-color", LIGHT_SURFACE);

    await toggleTheme();

    await expect(container).toHaveCSS("background-color", DARK_SURFACE);
  });

  test("inline: surface darkens with dark theme", async () => {
    await setDisplayMode("inline");
    await expect(container).toHaveCSS("background-color", LIGHT_SURFACE);

    await toggleTheme();

    await expect(container).toHaveCSS("background-color", DARK_SURFACE);
  });

  test("pip: surface darkens with dark theme", async () => {
    await setDisplayMode("pip");
    await expect(container).toHaveCSS("background-color", LIGHT_SURFACE);

    await toggleTheme();

    await expect(container).toHaveCSS("background-color", DARK_SURFACE);
  });

  test("grid: color stays visible and changes in dark theme", async () => {
    const gridColor = () =>
      previewRegion.evaluate((el) =>
        getComputedStyle(el).getPropertyValue("--preview-region-grid").trim(),
      );

    await expect.poll(gridColor).toBe(LIGHT_GRID);

    await toggleTheme();

    await expect.poll(gridColor).toBe(DARK_GRID);
  });
});
