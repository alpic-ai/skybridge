import type { Metadata } from "next";
import Link from "next/link";
import { InstallRow, SBNav } from "../components/hero";
import { ChatGPTFrame } from "../components/showcase/chatgpt-frame";
import { hostAccent, SHOWCASE } from "../components/showcase/data";
import { SBFooter } from "../components/trust-final";

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
  const apps = SHOWCASE.filter((a) => a.category === "3rd Party");
  const groups = [
    {
      t: "3rd Party Apps",
      sub: "Built by customers and the community",
      items: apps,
    },
  ];

  return (
    <div className="sb-root" data-theme="dark">
      <SBNav />
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

        {groups.map((s, si) => (
          <div key={si} style={{ marginBottom: 56 }}>
            <div className="sxA-grid">
              {s.items.map((app) => (
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
                    <ChatGPTFrame app={app} compact />
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
                        {app.tags.map((t) => (
                          <span key={t} className="sxA-tag">
                            {t}
                          </span>
                        ))}
                      </div>
                      <span className="sxA-arrow">
                        View
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
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

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
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
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
      <SBFooter />
    </div>
  );
}
