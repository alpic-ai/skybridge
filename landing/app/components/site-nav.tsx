import { Icon } from "./icons";

const REPO = "alpic-ai/skybridge";

function formatStars(count: number): string {
  if (count < 1000) {
    return String(count);
  }
  if (count < 10000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return `${Math.round(count / 1000)}k`;
}

function normalizeVersion(tag: string): string {
  const trimmed = tag.trim();
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

async function getRepoMeta(): Promise<{
  stars: string;
  version: string | null;
}> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  try {
    const [repoRes, releaseRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${REPO}`, { headers }),
      fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
        headers,
      }),
    ]);
    const repo = repoRes.ok ? await repoRes.json() : null;
    const release = releaseRes.ok ? await releaseRes.json() : null;
    const starCount =
      typeof repo?.stargazers_count === "number" ? repo.stargazers_count : 1000;
    const tag = typeof release?.tag_name === "string" ? release.tag_name : null;
    return {
      stars: formatStars(starCount),
      version: tag ? normalizeVersion(tag) : null,
    };
  } catch {
    return { stars: "1k", version: null };
  }
}

export async function SiteNav() {
  const { stars, version } = await getRepoMeta();
  return (
    <nav className="sb-nav">
      <div className="sb-nav-inner" style={{ height: "74px" }}>
        <a className="sb-brand" href="/" aria-label="Skybridge">
          <img
            src="/assets/skybridge-logo-light.svg"
            alt="Skybridge"
            className="sb-brand-logo"
          />
          {version && <span className="sb-brand-ver">{version}</span>}
        </a>
        <div className="sb-nav-links">
          <a href="https://docs.skybridge.tech">Docs</a>
          <a href="/showcase">Showcase</a>
        </div>
        <div className="sb-nav-right">
          <a
            className="sb-btn sb-btn-ghost sb-nav-stars"
            href="https://github.com/alpic-ai/skybridge"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="github" size={13} />
            <span className="sb-star-count">{stars}</span>
          </a>
          <a
            className="sb-btn sb-btn-primary"
            href="https://docs.skybridge.tech"
            target="_blank"
            rel="noreferrer"
          >
            Get started
            <Icon name="arrow" size={12} stroke={2} />
          </a>
        </div>
      </div>
    </nav>
  );
}
