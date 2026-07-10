import { expect, type Page, test } from "@playwright/test";

const TEAM = { id: "t1", name: "Acme" };

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

async function hoverDeployPopover(page: Page) {
  await expect(
    page.getByRole("button", { name: "echo", exact: true }),
  ).toBeVisible();
  await expect(async () => {
    await deployTrigger(page).hover();
    await expect(page.locator('[data-slot="popover-content"]')).toBeVisible({
      timeout: 1_500,
    });
  }).toPass({ timeout: 15_000 });
}

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

    await hoverDeployPopover(page);
    await expect(page.getByText(/sign in to alpic to deploy/i)).toBeVisible();
    // Click the trigger rather than the in-popover button — same action,
    // avoids hover-popover reposition flakiness.
    await deployTrigger(page).click();

    await expect(deployTrigger(page).locator(".bg-success")).toBeVisible();
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
    const picker = page.getByRole("combobox");
    await expect(picker).toHaveText("Acme");
    await picker.click();
    await page.getByRole("option", { name: /Globex/ }).click();
    await expect(picker).toHaveText("Globex");

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
    await expect(deploy.locator(".bg-success")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /copy live mcp server url/i }),
    ).toContainText("my-app.alpic.live");
    await hoverDeployPopover(page);
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
        startedAt: Date.now() - 65_000,
        deploymentPageUrl: "https://app.alpic.ai/p1/logs",
      },
    });
    await page.goto("/");

    const deploy = deployTrigger(page);
    await expect(deploy).toBeVisible();
    await expect(deploy.locator(".animate-pulse")).toBeVisible();
    await expect(deploy).toHaveAttribute("aria-disabled", "true");
    await hoverDeployPopover(page);
    await expect(page.getByText("Deploying…")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /go to logs/i }),
    ).toHaveAttribute("href", "https://app.alpic.ai/p1/logs");
    await expect(page.getByText(/1m \d\ds/)).toBeVisible();
  });

  test("ongoing deploy per status → shows progress, not the idle CTA", async ({
    page,
  }) => {
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
    await hoverDeployPopover(page);
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

    await expect(deployTrigger(page)).toHaveAttribute("aria-disabled", "true");
    await hoverDeployPopover(page);
    await expect(page.getByText(/last deployed from git/i)).toBeVisible();
    await expect(page.getByText("main")).toBeVisible();
    await expect(page.getByText("octocat")).toBeVisible();
    await expect(page.getByText(/Fix the thing/)).toBeVisible();

    await page
      .getByRole("button", { name: /deploy anyway/i })
      .dispatchEvent("click");
    await expect.poll(() => deployCalls).toBeGreaterThan(0);
  });

  test("stale session 'deployed' + git latest → gate still reachable", async ({
    page,
  }) => {
    let deployCalls = 0;
    await mockDeploy(page, {
      status: {
        state: "ready",
        lastDeployStatus: "deployed",
        lastDeployGit: {
          ref: "main",
          commitMessage: "Ship it",
          author: "octocat",
        },
        mcpServerUrl: "https://my-app.alpic.live",
      },
      progress: {
        status: "deployed",
        mcpServerUrl: "https://stale-session.alpic.live",
        deploymentPageUrl: null,
      },
    });
    await page.route("**/__skybridge/deploy", (route) => {
      deployCalls += 1;
      return route.fulfill({ status: 202, json: { ok: true } });
    });
    await page.goto("/");

    // The session's replayed "deployed" state must not mask the git gate:
    // "Deploy anyway" is the only way to redeploy a git-deployed project.
    await hoverDeployPopover(page);
    await expect(page.getByText(/last deployed from git/i)).toBeVisible();
    await expect(
      page.getByText("https://stale-session.alpic.live"),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: /deploy anyway/i })
      .dispatchEvent("click");
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

    await hoverDeployPopover(page);
    await expect(page.getByText(/deployment failed/i)).toBeVisible();
    await expect(page.getByText("Build failed")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /go to logs/i }),
    ).toHaveAttribute("href", "https://app.alpic.ai/p1/logs");
  });
});
