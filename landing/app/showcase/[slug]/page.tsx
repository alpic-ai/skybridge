import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InstallRow, SBNav } from "../../components/hero";
import { ClaudeStarSVG } from "../../components/showcase/chatgpt-frame";
import { hostAccent, SHOWCASE } from "../../components/showcase/data";
import { PreviewCarousel } from "../../components/showcase/preview-carousel";
import { SBFooter } from "../../components/trust-final";

export async function generateStaticParams() {
  return SHOWCASE.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const app = SHOWCASE.find((x) => x.slug === slug);
  if (!app) {
    return {};
  }
  const title = `${app.name} — ${app.tagline} | Skybridge Showcase`;
  const url = `/showcase/${app.slug}`;
  const images = app.img
    ? [{ url: app.img, alt: `${app.name} — ${app.tagline}` }]
    : undefined;
  return {
    title,
    description: app.blurb,
    alternates: { canonical: url },
    openGraph: { type: "article", title, description: app.blurb, url, images },
    twitter: {
      card: "summary_large_image",
      title,
      description: app.blurb,
      images: images?.map((i) => i.url),
    },
  };
}

export default async function ShowcaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const app = SHOWCASE.find((x) => x.slug === slug);
  if (!app) {
    notFound();
  }

  const related = SHOWCASE.filter((x) => x.id !== app.id).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    description: app.blurb,
    applicationCategory: "BusinessApplication",
    operatingSystem: app.host,
    url: `https://skybridge.tech/showcase/${app.slug}`,
    image: app.img ? `https://skybridge.tech${app.img}` : undefined,
    keywords: app.tags.join(", "),
    isBasedOn: {
      "@type": "SoftwareApplication",
      name: "Skybridge",
      url: "https://skybridge.tech",
    },
  };

  return (
    <div className="sb-root" data-theme="dark">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SBNav />
      <div className="sx-page">
        <div style={{ maxWidth: 1100, margin: "0 auto 24px" }}>
          <Link href="/showcase" className="sxD-back">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            Back to showcase
          </Link>
        </div>

        <div className="sxD-frame">
          <div className="sxD-hero">
            <div className="sxD-hero-grid">
              <div>
                <h1 className="sxD-title">{app.name}</h1>
                <p
                  className="sxD-tagline"
                  style={{ color: hostAccent(app.host) }}
                >
                  {app.tagline}
                </p>
                <p className="sxD-summary">{app.blurb}</p>
                <div className="sxD-cta">
                  {app.links.demo && (
                    <a
                      className="sb-btn sb-btn-ghost sb-btn-lg"
                      href={app.links.demo}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Try the demo
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="M5 12h14M13 6l6 6-6 6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </a>
                  )}
                  {app.links.chatgpt && (
                    <a
                      className="sb-btn sb-btn-primary sb-btn-lg sxD-cta-chatgpt"
                      href={app.links.chatgpt}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.05 6.05 0 0 0 6.515 2.9A5.98 5.98 0 0 0 13.26 24a6.05 6.05 0 0 0 5.772-4.21 5.99 5.99 0 0 0 3.997-2.9 6.05 6.05 0 0 0-.747-7.07Z" />
                      </svg>
                      Add on ChatGPT
                    </a>
                  )}
                  {app.links.directory && (
                    <a
                      className="sb-btn sb-btn-primary sb-btn-lg sxD-cta-claude"
                      href={app.links.directory}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ClaudeStarSVG size={14} />
                      Add to Claude
                    </a>
                  )}
                  {app.links.github && (
                    <a
                      className="sb-btn sb-btn-ghost sb-btn-lg"
                      href={app.links.github}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View source
                    </a>
                  )}
                </div>
              </div>
              <div className="sxD-pv">
                <PreviewCarousel app={app} />
              </div>
            </div>
          </div>

          <div className="sxD-body">
            <div>
              <div
                className="sxD-section-h"
                style={{ color: hostAccent(app.host) }}
              >
                The app
              </div>
              <h2 className="sxD-h2">{app.tagline}.</h2>
              <p className="sxD-p">{app.blurb}</p>
              <p className="sxD-p">
                {app.name} runs as a Skybridge MCP App — write the widget once
                in TypeScript and React, and it ships to {app.host} with the
                same tool calls, the same auth, and the same render. No
                host-specific forks, no separate codebases.
              </p>
              <h3 className="sxD-h3">What's interesting</h3>
              <ul className="sxD-ul">
                <li>
                  Native widget rendering inside the chat thread — no popouts,
                  no modals.
                </li>
                <li>
                  Tool calls and UI state stay in sync via Skybridge's typed
                  bridge.
                </li>
                <li>
                  Same code path runs in{" "}
                  {app.host.includes("Claude")
                    ? "ChatGPT and Claude"
                    : "ChatGPT today, Claude when ready"}
                  .
                </li>
              </ul>
            </div>
            <aside className="sxD-side">
              <div className="sxD-side-card">
                <div className="sxD-side-h">Quick facts</div>
                <div className="sxD-side-row">
                  <span className="l">Hosts</span>
                  <span className="r">{app.host}</span>
                </div>
                {app.links.demo && (
                  <div className="sxD-side-row">
                    <span className="l">MCP URL</span>
                    <span className="r">
                      {new URL(app.links.demo).hostname}
                    </span>
                  </div>
                )}
                {app.links.github && (
                  <div className="sxD-side-row">
                    <span className="l">Source</span>
                    <span className="r">github.com</span>
                  </div>
                )}
                <div className="sxD-side-row sxD-side-row-tags">
                  <span className="l">Tags</span>
                  <span className="r">
                    <span className="sxD-side-tags">
                      {app.tags.map((t) => (
                        <span key={t} className="sxD-side-tag">
                          {t}
                        </span>
                      ))}
                    </span>
                  </span>
                </div>
              </div>
              <div className="sxD-side-card sxD-side-cta">
                <div className="sxD-side-h">Build something like this</div>
                <p
                  style={{
                    font: "400 13.5px/1.5 var(--font-body)",
                    color: "var(--sb-ink-soft)",
                    margin: "0 0 14px",
                  }}
                >
                  Install the Skybridge Skill, or start from our starter kit.
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <a
                    href="https://docs.skybridge.tech/devtools/skills"
                    target="_blank"
                    rel="noreferrer"
                    className="sb-btn sb-btn-primary"
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    Install the Skybridge Skill →
                  </a>
                  <InstallRow cmd="npx create skybridge" />
                </div>
              </div>
            </aside>
          </div>

          <div className="sxD-related">
            <div className="sxD-section-h">More apps</div>
            <h2 className="sxD-h2" style={{ fontSize: 22 }}>
              Explore the showcase
            </h2>
            <div className="sxD-related-grid">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/showcase/${r.slug}`}
                  className="sxD-related-card"
                >
                  {r.img && (
                    <Image
                      src={r.img}
                      alt=""
                      className="sxD-related-img"
                      width={500}
                      height={300}
                      sizes="(max-width: 768px) 50vw, 280px"
                    />
                  )}
                  <div className="sxD-related-name">{r.name}</div>
                  <div className="sxD-related-tag">
                    {r.category} · {r.tagline}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <SBFooter />
    </div>
  );
}
