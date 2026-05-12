import type { Metadata } from "next";
import Link from "next/link";
import { InstallRow, SiteNav } from "../components/hero";
import { Icon } from "../components/icons";
import { ChatGPTFrame } from "../components/showcase/chatgpt-frame";
import { hostAccent, SHOWCASE } from "../components/showcase/data";
import { SiteFooter } from "../components/trust-final";

const description =
  "Real MCP Apps built with Skybridge — shipping in ChatGPT and Claude. Browse community and customer projects for inspiration.";

export const metadata: Metadata = {
  title: "Showcase — MCP Apps built with Skybridge",
  description,
  alternates: { canonical: "/showcase" },
  openGraph: {
    type: "website",
    title: "Showcase — MCP Apps built with Skybridge",
    description,
    url: "/showcase",
  },
  twitter: {
    card: "summary_large_image",
    title: "Showcase — MCP Apps built with Skybridge",
    description,
  },
};

export default function ShowcaseListPage() {
  const apps = SHOWCASE.filter((app) => app.category === "3rd Party");

  return (
    <div className="sb-root" data-theme="dark">
      <SiteNav />
      <div className="sx-page">
        <div className="sx-page-head">
          <div className="sx-page-eyebrow"></div>
          <h1 className="sx-page-title">
            Built with <span className="sb-accent">Skybridge.</span>
          </h1>
          <p className="sx-page-lede">
            Real MCP Apps shipping in ChatGPT and Claude. Explore inspiring
            projects made by developers around the world.
          </p>
        </div>

        <div style={{ marginBottom: 56 }}>
          <div className="sxA-grid">
            {apps.map((app, index) => (
              <Link
                key={app.id}
                href={`/showcase/${app.slug}`}
                className="sxA-card"
                style={
                  {
                    "--card-accent": hostAccent(app.host),
                  } as React.CSSProperties
                }
              >
                <div className="sxA-thumb">
                  <ChatGPTFrame app={app} compact priority={index === 0} />
                </div>
                <div className="sxA-meta">
                  <div className="sxA-row">
                    <span className="sxA-cat-dot"></span>
                    <span>{app.host}</span>
                  </div>
                  <h3 className="sxA-name">{app.name}</h3>
                  <p className="sxA-tagline">{app.tagline}</p>
                  <p className="sxA-blurb">{app.blurb}</p>
                  <div className="sxA-foot">
                    <div className="sxA-tags">
                      {app.tags.map((tag) => (
                        <span key={tag} className="sxA-tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="sxA-arrow">
                      View
                      <Icon name="arrow" size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Submit + Start side-by-side */}
        <div className="sx-submit">
          <div className="sx-submit-split">
            <div className="sx-submit-col">
              <div className="sx-submit-eyebrow">
                Built something with Skybridge?
              </div>
              <h2 className="sx-submit-title">Submit your app.</h2>
              <p className="sx-submit-lede">
                We feature community apps every month. Send us a link to your
                published MCP app and we&apos;ll give it a permanent home here.
              </p>
              <div className="sx-submit-actions">
                <a
                  className="sb-btn sb-btn-primary sb-btn-lg"
                  href="https://github.com/alpic-ai/skybridge/issues/new?title=Showcase%20submission"
                >
                  Submit your app
                  <Icon name="arrow" size={14} />
                </a>
              </div>
            </div>
            <div className="sx-submit-col sx-submit-secondary">
              <h2 className="sx-submit-title">Or get started in 5 seconds.</h2>
              <div className="sx-submit-installs">
                <InstallRow cmd="npm create skybridge" label="Humans" />
                <InstallRow
                  cmd="npx skills add alpic-ai/skybridge -s skybridge"
                  label="Agents"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
