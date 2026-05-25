import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteNav } from "../components/site-nav";
import { SiteFooter } from "../components/trust-final";

const REPO = "alpic-ai/skybridge";
const GITHUB_REPO_URL = `https://github.com/${REPO}`;

const description =
  "Every Skybridge release, sourced directly from GitHub. New features, fixes, and breaking changes — all in one place.";

const OG_IMAGE = {
  url: "/assets/Skybridge-og.jpg",
  width: 1200,
  height: 630,
  alt: "Skybridge changelog",
};

export const metadata: Metadata = {
  title: "Changelog — Skybridge releases",
  description,
  alternates: { canonical: "/changelog" },
  openGraph: {
    type: "website",
    title: "Changelog — Skybridge releases",
    description,
    url: "/changelog",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    site: "@alpic_ai",
    title: "Changelog — Skybridge releases",
    description,
    images: [OG_IMAGE.url],
  },
};

export const dynamic = "force-static";

type Release = {
  tag_name: string;
  name: string | null;
  body: string | null;
  published_at: string | null;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
};

async function getReleases(): Promise<Release[]> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/releases?per_page=100`,
      { headers },
    );
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as Release[];
    return data
      .filter((r) => !r.draft && !r.prerelease)
      .sort((a, b) => {
        const aT = a.published_at ? Date.parse(a.published_at) : 0;
        const bT = b.published_at ? Date.parse(b.published_at) : 0;
        return bT - aT;
      });
  } catch {
    return [];
  }
}

function slugifyTag(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9.-]+/g, "-");
}

// GitHub release bodies use bare `#NNN` and `@user` — turn them into links.
function linkifyReferences(body: string): string {
  return body
    .replace(/(^|[\s(])#(\d+)\b/g, `$1[#$2](${GITHUB_REPO_URL}/pull/$2)`)
    .replace(
      /(^|[\s(])@([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})?)\b/g,
      "$1[@$2](https://github.com/$2)",
    );
}

// Split a release body at a `## Changes` (or any heading depth) heading so
// the PR list can be rendered inside a collapsible <details>.
function splitChanges(body: string): {
  intro: string;
  changes: string | null;
  count: number;
} {
  const match = body.match(
    /(^|\r?\n)#{1,6}[ \t]+(Changes|What['’]?s?[ \t]+Changed|Changelog)[ \t]*\r?\n+/i,
  );
  if (!match || match.index === undefined) {
    return { intro: body, changes: null, count: 0 };
  }
  const intro = body.slice(0, match.index).trim();
  const changes = body.slice(match.index + match[0].length).trim();
  const count = (changes.match(/^[ \t]*[-*][ \t]+/gm) ?? []).length;
  return { intro, changes, count };
}

function formatDate(iso: string | null): string {
  if (!iso) {
    return "";
  }
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ChangelogPage() {
  const releases = await getReleases();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Skybridge changelog",
    description,
    url: "https://skybridge.tech/changelog",
    itemListElement: releases.slice(0, 20).map((release, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: release.name || release.tag_name,
      url: `https://skybridge.tech/changelog#${slugifyTag(release.tag_name)}`,
    })),
  };

  return (
    <div className="sb-root" data-theme="dark">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteNav />
      <div className="sx-page">
        <div className="sx-page-head">
          <div className="sx-page-eyebrow">Changelog</div>
          <h1 className="sx-page-title">
            What&apos;s new in <span className="sb-accent">Skybridge.</span>
          </h1>
          <p className="sx-page-lede">{description}</p>
        </div>

        {releases.length === 0 ? (
          <div className="sx-cl-empty">
            Couldn&apos;t load releases right now. Browse them on{" "}
            <a href={`${GITHUB_REPO_URL}/releases`}>GitHub</a>.
          </div>
        ) : (
          <div className="sx-cl-layout">
            <aside className="sx-cl-toc" aria-label="Releases">
              <div className="sx-cl-toc-h">Releases</div>
              <nav>
                <ul className="sx-cl-toc-list">
                  {releases.map((release) => (
                    <li key={release.tag_name}>
                      <a
                        href={`#${slugifyTag(release.tag_name)}`}
                        className="sx-cl-toc-link"
                      >
                        {release.tag_name}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
            <ol className="sx-cl-list">
              {releases.map((release) => {
                const id = slugifyTag(release.tag_name);
                const linkified = release.body
                  ? linkifyReferences(release.body)
                  : "";
                const { intro, changes, count } = splitChanges(linkified);
                const title = release.name || release.tag_name;
                const markdownComponents = {
                  a: ({
                    href,
                    children,
                  }: {
                    href?: string;
                    children?: React.ReactNode;
                  }) => (
                    <a href={href} target="_blank" rel="noreferrer">
                      {children}
                    </a>
                  ),
                };
                return (
                  <li key={release.tag_name} id={id} className="sx-cl-item">
                    <header className="sx-cl-head">
                      <a
                        href={`#${id}`}
                        className="sx-cl-tag"
                        aria-label={`Permalink to ${release.tag_name}`}
                      >
                        {release.tag_name}
                      </a>
                      <time
                        className="sx-cl-date"
                        dateTime={release.published_at ?? undefined}
                      >
                        {formatDate(release.published_at)}
                      </time>
                      <a
                        className="sx-cl-source"
                        href={release.html_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on GitHub →
                      </a>
                    </header>
                    {title !== release.tag_name && (
                      <h2 className="sx-cl-title">{title}</h2>
                    )}
                    {intro || changes ? (
                      <>
                        {intro && (
                          <div className="sx-cl-body">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={markdownComponents}
                            >
                              {intro}
                            </ReactMarkdown>
                          </div>
                        )}
                        {changes && (
                          <details className="sx-cl-changes">
                            <summary className="sx-cl-changes-summary">
                              <span className="sx-cl-changes-label">
                                {count > 0
                                  ? `Show ${count} merged PR${count === 1 ? "" : "s"}`
                                  : "Show changes"}
                              </span>
                              <span className="sx-cl-changes-chev" aria-hidden>
                                ▾
                              </span>
                            </summary>
                            <div className="sx-cl-body sx-cl-changes-body">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={markdownComponents}
                              >
                                {changes}
                              </ReactMarkdown>
                            </div>
                          </details>
                        )}
                      </>
                    ) : (
                      <p className="sx-cl-empty-body">No release notes.</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
