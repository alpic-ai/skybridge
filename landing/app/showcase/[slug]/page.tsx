import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next-image-export-optimizer";
import { InstallRow } from "../../components/hero";
import { Icon } from "../../components/icons";
import { ClaudeStarSVG } from "../../components/showcase/chatgpt-frame";
import { getShowcaseHeroImage, SHOWCASE } from "../../components/showcase/data";
import { PreviewCarousel } from "../../components/showcase/preview-carousel";
import { SiteNav } from "../../components/site-nav";
import { SiteFooter } from "../../components/trust-final";

export async function generateStaticParams() {
  return SHOWCASE.map((app) => ({ slug: app.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const app = SHOWCASE.find((entry) => entry.slug === slug);
  if (!app) {
    return {};
  }
  const title = `${app.name} — ${app.tagline} | Skybridge Showcase`;
  const url = `/showcase/${app.slug}`;
  const hero = getShowcaseHeroImage(app);
  const images = hero
    ? [{ url: hero, alt: `${app.name} — ${app.tagline}` }]
    : undefined;
  return {
    title,
    description: app.blurb,
    alternates: { canonical: url },
    openGraph: { type: "article", title, description: app.blurb, url, images },
    twitter: {
      card: "summary_large_image",
      site: "@alpic_ai",
      title,
      description: app.blurb,
      images: images?.map((image) => image.url),
    },
  };
}

export default async function ShowcaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const app = SHOWCASE.find((entry) => entry.slug === slug);
  if (!app) {
    notFound();
  }

  const hero = getShowcaseHeroImage(app);
  const related = SHOWCASE.filter((entry) => entry.id !== app.id).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    description: app.blurb,
    applicationCategory: "BusinessApplication",
    operatingSystem: app.host,
    url: `https://skybridge.tech/showcase/${app.slug}`,
    image: hero ? `https://skybridge.tech${hero}` : undefined,
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
      <SiteNav />
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
                <p className="sxD-tagline" style={{ color: app.accent }}>
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
                      <Icon name="arrow" size={14} />
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
                        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.354-2.02 1.168a.076.076 0 0 1-.071.005l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.124 7.2a.076.076 0 0 1 .071-.005l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.664zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.681 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.074a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.361l2.602-1.502 2.603 1.502v3.003l-2.603 1.502-2.602-1.502z" />
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
              <div className="sxD-section-h" style={{ color: app.accent }}>
                The app
              </div>
              <h2 className="sxD-h2">{app.tagline}.</h2>
              <p className="sxD-p">{app.blurb}</p>
              {app.highlights && app.highlights.length > 0 && (
                <>
                  <h3 className="sxD-h3">What's interesting</h3>
                  <ul className="sxD-ul">
                    {app.highlights.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </>
              )}
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
                      {app.tags.map((tag) => (
                        <span key={tag} className="sxD-side-tag">
                          {tag}
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
              {related.map((relatedApp) => {
                const thumb = getShowcaseHeroImage(relatedApp);
                return (
                  <Link
                    key={relatedApp.id}
                    href={`/showcase/${relatedApp.slug}`}
                    className="sxD-related-card"
                  >
                    {thumb ? (
                      <Image
                        src={thumb}
                        alt=""
                        className="sxD-related-img"
                        width={500}
                        height={300}
                        sizes="(max-width: 768px) 50vw, 280px"
                      />
                    ) : null}
                    <div className="sxD-related-name">{relatedApp.name}</div>
                    <div className="sxD-related-tag">
                      {relatedApp.category} · {relatedApp.tagline}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
