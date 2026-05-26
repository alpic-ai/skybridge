import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteNav } from "../components/site-nav";
import { SiteFooter } from "../components/trust-final";
import { LazyChanges } from "./LazyChanges";
import {
  formatDate,
  GITHUB_REPO_URL,
  getReleases,
  linkifyReferences,
  slugifyTag,
  splitChanges,
} from "./lib";

const description =
  "Every Skybridge release, sourced directly from GitHub. New features, fixes, and breaking changes.";

const OG_IMAGE = {
  url: "/assets/Skybridge-og.jpg",
  width: 1200,
  height: 630,
  alt: "Skybridge changelog",
};

export const metadata: Metadata = {
  title: "Skybridge changelog",
  description,
  alternates: {
    canonical: "/changelog",
    types: { "text/markdown": "/changelog.md" },
  },
  openGraph: {
    type: "website",
    title: "Skybridge changelog",
    description,
    url: "/changelog",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    site: "@alpic_ai",
    title: "Skybridge changelog",
    description,
    images: [OG_IMAGE.url],
  },
};

export const dynamic = "force-static";

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
    <div className="sb-root sb-root-flat" data-theme="dark">
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
                              components={{
                                a: ({ href, children }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {children}
                                  </a>
                                ),
                              }}
                            >
                              {intro}
                            </ReactMarkdown>
                          </div>
                        )}
                        {changes && <LazyChanges slug={id} count={count} />}
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
        <div className="sx-cl-foot">
          Prefer plain text?{" "}
          <a href="/changelog.md">Read this changelog as markdown</a>.
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
