import { expect, type Page, test } from "@playwright/test";

const TEAM = { id: "t1", name: "Acme" };

/** Mock the deploy router: `/status` (JSON) + `/events` (single SSE frame). */
async function mockDeploy(
  page: Page,
  opts: {
    status: unknown;
    progress?: unknown;
    onStatus?: () => unknown;
  },
) {
  await page.route("**/__skybridge/deploy/events", (route) =>
    route.fulfill({
      contentType: "text/event-stream",
      body: `event: state\ndata: ${JSON.stringify(opts.progress ?? { status: "idle" })}\n\n`,
    }),
  );
  await page.route("**/__skybridge/deploy/status", (route) =>
    route.fulfill({ json: (opts.onStatus?.() ?? opts.status) as object }),
  );
}

const deployTrigger = (page: Page) =>
  page.getByRole("button", { name: /^Deploy$/ });

test.describe("deploy button", () => {
  test("signed out → sign-in gate triggers login then re-resolves", async ({
    page,
  }) => {
    let signedIn = false;
    await page.route("**/__skybridge/deploy/login", (route) => {
      signedIn = true;
      return route.fulfill({ json: { ok: true } });
    });
    await mockDeploy(page, {
      status: {},
      onStatus: () =>
        signedIn
          ? {
              state: "ready",
              lastDeployStatus: "deployed",
              mcpServerUrl: "https://my-app.alpic.live",
            }
          : { state: "signedOut" },
    });
    await page.goto("/");

    await deployTrigger(page).hover();
    await expect(page.getByText(/sign in to alpic to deploy/i)).toBeVisible();
    // Clicking the trigger when signed out runs the same sign-in action as the
    // in-popover button (avoids hover-popover reposition flakiness).
    await deployTrigger(page).click();

    // After login the status refetches → the dot turns green (deployed).
    await expect(deployTrigger(page).locator(".bg-green-500")).toBeVisible();
  });

  test("first deploy → modal prefilled with server name + team, surfaces conflict", async ({
    page,
  }) => {
    await mockDeploy(page, {
      status: {
        state: "needsProject",
        teams: [TEAM],
        defaultTeamId: TEAM.id,
      },
    });
    await page.route("**/__skybridge/deploy/project", (route) =>
      route.fulfill({
        status: 409,
        json: { message: "A project with that name already exists." },
      }),
    );
    await page.goto("/");

    await deployTrigger(page).click();
    // Default project name comes from the connected MCP server (client-side).
    await expect(page.getByLabel(/project name/i)).toHaveValue("e2e-fixture");
    await expect(page.getByText(/Team:/)).toContainText("Acme");

    await page.getByRole("button", { name: /create & deploy/i }).click();
    await expect(page.getByText(/already exists/i)).toBeVisible();
  });

  test("multiple teams → can switch the target team before deploy", async ({
    page,
  }) => {
    let sentTeamId: string | undefined;
    await mockDeploy(page, {
      status: {
        state: "needsProject",
        teams: [TEAM, { id: "t2", name: "Globex" }],
        defaultTeamId: TEAM.id,
      },
    });
    await page.route("**/__skybridge/deploy/project", (route) => {
      sentTeamId = (route.request().postDataJSON() as { teamId: string })
        .teamId;
      return route.fulfill({ status: 202, json: { ok: true } });
    });
    await page.goto("/");

    await deployTrigger(page).click();
    // Picker trigger defaults to the default team.
    const picker = page.getByRole("button", { name: /^Acme/ });
    await expect(picker).toBeVisible();
    // Switch to the other team.
    await picker.click();
    await page.getByRole("menuitem", { name: /Globex/ }).click();
    await expect(page.getByRole("button", { name: /^Globex/ })).toBeVisible();

    await page.getByRole("button", { name: /create & deploy/i }).click();
    await expect.poll(() => sentTeamId).toBe("t2");
  });

  test("already deployed → shows live URL + deployment page on load", async ({
    page,
  }) => {
    await mockDeploy(page, {
      status: {
        state: "ready",
        lastDeployStatus: "deployed",
        mcpServerUrl: "https://my-app.alpic.live",
        deploymentPageUrl: "https://app.alpic.ai/p1",
      },
    });
    await page.goto("/");

    const deploy = deployTrigger(page);
    await expect(deploy).toBeVisible();
    // Green status dot for a successfully-deployed project.
    await expect(deploy.locator(".bg-green-500")).toBeVisible();
    await deploy.hover();
    await expect(page.getByText("https://my-app.alpic.live")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /go to deployment page/i }),
    ).toHaveAttribute("href", "https://app.alpic.ai/p1");
  });

  test("clicking deploy enters pending immediately (optimistic)", async ({
    page,
  }) => {
    // /events only ever sends idle, so any pending state must be client-side.
    await mockDeploy(page, {
      status: {
        state: "ready",
        lastDeployStatus: "deployed",
        mcpServerUrl: "https://my-app.alpic.live",
      },
    });
    await page.route("**/__skybridge/deploy", (route) =>
      route.fulfill({ status: 202, json: { ok: true } }),
    );
    await page.goto("/");

    const deploy = deployTrigger(page);
    await expect(deploy).toBeVisible();
    await expect(deploy).not.toHaveAttribute("aria-disabled", "true");

    await deploy.click();
    // Flips to pending (disabled + pulsing) without waiting on a server frame.
    await expect(deploy).toHaveAttribute("aria-disabled", "true");
    await expect(deploy.locator(".animate-pulse")).toBeVisible();
  });

  test("deploying → orange dot and the button is disabled", async ({
    page,
  }) => {
    await mockDeploy(page, {
      status: {
        state: "ready",
        lastDeployStatus: "deployed",
        mcpServerUrl: "https://my-app.alpic.live",
      },
      progress: {
        status: "deploying",
        phase: "2/4 Uploading source",
        // Started ~65s ago; the server (mock) replays this same startedAt on
        // every connection, so the elapsed clock survives a page refresh.
        startedAt: Date.now() - 65_000,
        deploymentPageUrl: "https://app.alpic.ai/p1/logs",
      },
    });
    await page.goto("/");

    const deploy = deployTrigger(page);
    await expect(deploy).toBeVisible();
    // Animated orange dot, and the button is disabled (but still hoverable).
    await expect(deploy.locator(".animate-pulse")).toBeVisible();
    await expect(deploy).toHaveAttribute("aria-disabled", "true");
    // The hover card still opens while deploying, showing progress + logs.
    await deploy.hover();
    await expect(page.getByText("2/4 Uploading source…")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /go to logs/i }),
    ).toHaveAttribute("href", "https://app.alpic.ai/p1/logs");
    // Elapsed clock reflects the server-provided start (XXm XXs format), which
    // survives hover remounts + refresh because it's anchored to the SSE frame.
    await expect(page.getByText(/1m \d\ds/)).toBeVisible();
  });

  test("ongoing deploy per status → shows progress, not the idle CTA", async ({
    page,
  }) => {
    // No active SSE progress this session, but the API reports an ongoing
    // deploy (e.g. after refresh, or triggered by git/elsewhere).
    await mockDeploy(page, {
      status: {
        state: "ready",
        lastDeployStatus: "ongoing",
        lastDeployStartedAt: Date.now() - 65_000,
        deploymentPageUrl: "https://app.alpic.ai/p1/logs",
      },
    });
    await page.goto("/");

    const deploy = deployTrigger(page);
    await expect(deploy.locator(".animate-pulse")).toBeVisible();
    await expect(deploy).toHaveAttribute("aria-disabled", "true");
    await deploy.hover();
    // Deploying card (with logs + counter), never the "Click to deploy" CTA.
    await expect(page.getByText("Deploying…")).toBeVisible();
    await expect(page.getByText(/1m \d\ds/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /go to logs/i }),
    ).toHaveAttribute("href", "https://app.alpic.ai/p1/logs");
    await expect(page.getByText(/click to deploy/i)).toHaveCount(0);
  });

  test("git deploy → main button gated; redeploy only via explicit confirm", async ({
    page,
  }) => {
    let deployCalls = 0;
    await mockDeploy(page, {
      status: {
        state: "ready",
        lastDeployStatus: "deployed",
        lastDeployGit: {
          ref: "main",
          commitMessage: "Fix the thing",
          author: "octocat",
        },
      },
    });
    await page.route("**/__skybridge/deploy", (route) => {
      deployCalls += 1;
      return route.fulfill({ status: 202, json: { ok: true } });
    });
    await page.goto("/");

    // Main button is gated (disabled) so a git deploy can't be overwritten by a
    // stray click — but it stays hoverable to show the warning.
    await expect(deployTrigger(page)).toHaveAttribute("aria-disabled", "true");
    await deployTrigger(page).hover();
    await expect(page.getByText(/last deployed from git/i)).toBeVisible();
    await expect(page.getByText("main")).toBeVisible();
    await expect(page.getByText("octocat")).toBeVisible();
    await expect(page.getByText(/Fix the thing/)).toBeVisible();

    // Redeploy happens only through the explicit "Deploy anyway". force: the
    // popover is mid-animation in headless CI, so skip the stability wait.
    await page
      .getByRole("button", { name: /deploy anyway/i })
      .click({ force: true });
    await expect.poll(() => deployCalls).toBeGreaterThan(0);
  });

  test("failed deploy → shows error with a logs link", async ({ page }) => {
    await mockDeploy(page, {
      status: { state: "ready" },
      progress: {
        status: "failed",
        message: "Build failed",
        deploymentPageUrl: "https://app.alpic.ai/p1/logs",
      },
    });
    await page.goto("/");

    await deployTrigger(page).hover();
    await expect(page.getByText(/deployment failed/i)).toBeVisible();
    await expect(page.getByText("Build failed")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /go to logs/i }),
    ).toHaveAttribute("href", "https://app.alpic.ai/p1/logs");
  });
});
