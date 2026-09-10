import type { Metadata } from "next";
import Image from "next-image-export-optimizer";
import { HostCycler, InstallRow } from "../../components/hero";
import { Icon } from "../../components/icons";
import { SHOWCASE, type ShowcaseApp } from "../../components/showcase/data";
import { ShowcaseCard } from "../../components/showcase/showcase-card";
import { SiteNav } from "../../components/site-nav";
import { SiteFooter } from "../../components/trust-final";

const HERO_HOSTS = ["ChatGPT", "Claude"];
const INSTALL_CMD = "npx skybridge create my-shop --ecom";
const GITHUB_URL =
  "https://github.com/alpic-ai/skybridge/tree/main/packages/create-skybridge/templates/ecom";
const DOCS_URL = "https://docs.skybridge.tech";

const title = "Ecommerce template — your catalog inside ChatGPT | Skybridge";
const description =
  "Publish your MCP app to the ChatGPT and Claude app stores and let shoppers browse your products in the conversation. Scaffold the ecommerce template in one command, then point it at your own store.";

const SCREENSHOT = "/assets/template/ecommerce/chatgpt-conversation.webp";

const OG_IMAGE = {
  url: SCREENSHOT,
  alt: "Ecommerce template — product carousel rendered inside ChatGPT",
};

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/template/ecommerce" },
  openGraph: {
    type: "website",
    title,
    description,
    url: "/template/ecommerce",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    site: "@alpic_ai",
    title,
    description,
    images: [OG_IMAGE.url],
  },
};

const STORES = [
  { name: "Shopify", src: "/assets/stores/shopify.svg" },
  { name: "Medusa", src: "/assets/stores/medusa.svg" },
  { name: "WooCommerce", src: "/assets/stores/woocommerce.svg" },
  { name: "Magento", src: "/assets/stores/magento.svg" },
  { name: "BigCommerce", src: "/assets/stores/bigcommerce.svg" },
  { name: "Salesforce", src: "/assets/stores/salesforce.svg" },
  { name: "PrestaShop", src: "/assets/stores/prestashop.svg" },
  { name: "Shopware", src: "/assets/stores/shopware.svg" },
];

const EXAMPLE_SLUGS = ["recommerce", "evaneos"];

export default function EcommerceTemplatePage() {
  const examples = EXAMPLE_SLUGS.map((slug) =>
    SHOWCASE.find((app) => app.slug === slug),
  ).filter((app): app is ShowcaseApp => app !== undefined);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: "Skybridge ecommerce template",
    description,
    codeRepository: GITHUB_URL,
    programmingLanguage: "TypeScript",
    url: "https://skybridge.tech/template/ecommerce",
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

      <section className="sb-hero">
        <div className="sb-wrap">
          <h1 className="sb-sr-only">
            Let ChatGPT and Claude showcase your products: the Skybridge
            ecommerce template.
          </h1>
          <div className="sb-h1" style={{ fontWeight: 400 }} aria-hidden="true">
            Let <HostCycler hosts={HERO_HOSTS} />
            <br />
            showcase your products
          </div>
          <p className="sb-lede">
            With your MCP app published on the ChatGPT and Claude app stores,
            shoppers reach your catalog by describing what they want, and browse
            your products without leaving the conversation.
          </p>

          <div className="sb-cta-stack">
            <div className="sb-cta-row sb-cta-row-split">
              <div className="sb-cta-installs">
                <div className="sb-cta-installs-head">
                  Scaffold it in one command
                </div>
                <InstallRow cmd={INSTALL_CMD} />
                <div
                  className="sb-cta-row"
                  style={{ marginTop: 10, gap: 10, flexWrap: "wrap" }}
                >
                  <a
                    className="sb-btn sb-btn-primary sb-btn-lg"
                    href={DOCS_URL}
                    target="_blank"
                    rel="noreferrer"
                    data-ga="lp_cta_click"
                    data-ga-label="ecom_template_hero_docs"
                    style={{ borderColor: "rgb(166, 244, 241)" }}
                  >
                    Read the docs
                    <Icon name="arrow" size={15} stroke={2} />
                  </a>
                  <a
                    className="sb-btn sb-btn-ghost sb-btn-lg"
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-ga="lp_github_click"
                    data-ga-label="ecom_template_source"
                  >
                    <Icon name="github" size={14} />
                    Read the source
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sb-section">
        <div className="sb-wrap">
          <div className="sb-section-header" style={{ marginBottom: 56 }}>
            <div className="sb-section-eyebrow">What the shopper sees</div>
            <h2 className="sb-section-title">
              A beautiful carousel for{" "}
              <span className="sb-accent">your products</span>.
            </h2>
            <p className="sb-section-lede">
              The template carries your brand into the conversation, so the
              products a shopper browses look like yours rather than like a
              generic chat reply. Inline in the thread, fullscreen when they
              want the detail.
            </p>
          </div>
          <Image
            src={SCREENSHOT}
            alt="A shopper asking for ski gear in ChatGPT, with the template's product carousel rendered in the reply"
            width={2322}
            height={1486}
            sizes="(max-width: 900px) 100vw, 1100px"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              maxWidth: 1100,
              margin: "0 auto",
              borderRadius: 18,
              border: "1px solid var(--sb-border)",
            }}
          />
        </div>
      </section>

      <section className="sb-section">
        <div className="sb-wrap">
          <div className="sb-section-header" style={{ marginBottom: 56 }}>
            <div className="sb-section-eyebrow">Your catalog</div>
            <h2 className="sb-section-title">
              Compatible with <span className="sb-accent">any store</span>.
            </h2>
            <p className="sb-section-lede">
              If your products are reachable through an API, the template can
              read them. Product access lives in one module: it ships with
              Shopify, and any other platform or in-house catalog is two
              functions to implement.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "24px 44px",
              justifyContent: "center",
              alignItems: "center",
              maxWidth: 880,
              margin: "0 auto",
            }}
          >
            {STORES.map((store) => (
              <span
                className="sb-logo-chip sb-logo-chip-icon"
                key={store.name}
                title={store.name}
              >
                <img
                  src={store.src}
                  alt=""
                  width={26}
                  height={26}
                  style={{ height: 26, width: 26, borderRadius: 0 }}
                />
                <span>{store.name}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="sb-section">
        <div className="sb-wrap">
          <div className="sb-section-header" style={{ marginBottom: 56 }}>
            <div className="sb-section-eyebrow">In production</div>
            <h2 className="sb-section-title">
              Explore the <span className="sb-accent">examples</span>.
            </h2>
            <p className="sb-section-lede">
              Teams already shipping their catalog inside ChatGPT.
            </p>
          </div>
          <div className="sxA-grid sxA-grid--pair">
            {examples.map((app, index) => (
              <ShowcaseCard key={app.id} app={app} index={index}>
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
              </ShowcaseCard>
            ))}
          </div>
        </div>
      </section>

      <section className="sb-final sb-final--aurora" data-final-bg="aurora">
        <div className="sb-final-aurora" aria-hidden></div>
        <div className="sb-wrap" style={{ position: "relative", zIndex: 2 }}>
          <div className="sb-section-eyebrow">Getting started</div>
          <h2 style={{ fontWeight: 400 }}>
            Scaffold it, then make it{" "}
            <span
              className="sb-accent"
              style={{
                background:
                  "linear-gradient(100deg, var(--sb-accent), var(--sb-lime))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              yours.
            </span>
          </h2>
          <p>
            The template runs on a mock catalog straight away, so you can see it
            working before wiring your own store.
          </p>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <InstallRow cmd={INSTALL_CMD} />
          </div>
          <div className="sb-final-cta">
            <a
              className="sb-btn sb-btn-primary sb-btn-lg"
              href={DOCS_URL}
              target="_blank"
              rel="noreferrer"
              data-ga="lp_cta_click"
              data-ga-label="ecom_template_getting_started_docs"
              style={{ borderColor: "rgb(166, 244, 241)" }}
            >
              Read the docs
              <Icon name="arrow" size={15} stroke={2} />
            </a>
            <a
              className="sb-btn sb-btn-ghost sb-btn-lg"
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              data-ga="lp_github_click"
              data-ga-label="ecom_template_getting_started_source"
              style={{
                borderRadius: "10px",
                borderColor: "rgb(106, 177, 177)",
              }}
            >
              <Icon name="github" size={14} />
              Read the source
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
