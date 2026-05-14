import Image from "next-image-export-optimizer";
import { Icon } from "./icons";

type Logo =
  | {
      kind: "img";
      name: string;
      src: string;
      height: number;
      width: number;
      white?: boolean;
    }
  | {
      kind: "icon";
      name: string;
      src: string;
      height: number;
      width: number;
    }
  | { kind: "text"; name: string };

export function SocialProofSection() {
  const PNG_HEIGHT = 40;
  const logos: Logo[] = [
    {
      kind: "img",
      name: "Bitmovin",
      src: "/assets/customer-logos/bitmovin.svg",
      height: 26,
      width: 120,
    },
    {
      kind: "img",
      name: "Evaneos",
      src: "/assets/customer-logos/evaneos.svg",
      height: 22,
      width: 110,
    },
    {
      kind: "img",
      name: "Datadog",
      src: "/assets/customer-logos/datadog.svg",
      height: 32,
      width: 160,
      white: true,
    },
    {
      kind: "img",
      name: "Touchstream",
      src: "/assets/customer-logos/touchstream.webp",
      height: PNG_HEIGHT,
      width: 229,
    },
    {
      kind: "img",
      name: "Alpic",
      src: "/assets/customer-logos/alpic.webp",
      height: PNG_HEIGHT,
      width: 158,
    },
    {
      kind: "img",
      name: "Cottages.com",
      src: "/assets/customer-logos/cottages.webp",
      height: PNG_HEIGHT,
      width: 168,
    },
    {
      kind: "img",
      name: "Drio",
      src: "/assets/customer-logos/drio.webp",
      height: PNG_HEIGHT,
      width: 127,
    },
    {
      kind: "icon",
      name: "OTseek",
      src: "/assets/customer-logos/otseek.webp",
      height: 30,
      width: 30,
    },
    { kind: "text", name: "OLX" },
    { kind: "text", name: "Any PDF" },
  ];

  return (
    <section className="sb-section" id="customers" style={{ paddingTop: 72 }}>
      <div className="sb-wrap">
        <div className="sb-stat-row">
          <div className="sb-stat-lead" style={{ width: "700px" }}>
            <div
              className="sb-big"
              style={{ fontSize: "52px", fontWeight: "400" }}
            >
              Powering <span className="sb-accent">10%</span> of the MCP apps in
              Claude and ChatGPT.
            </div>
            <p>
              Teams building the next generation of conversational UIs pick
              Skybridge.
            </p>
          </div>
          <a className="sb-btn sb-btn-primary sb-btn-lg" href="/showcase">
            See the showcase
            <Icon name="arrow" size={14} stroke={2} />
          </a>
        </div>
        <div className="sb-marquee">
          <div className="sb-marquee-track">
            {[...logos, ...logos].map((logo, index) => {
              if (logo.kind === "img") {
                const isSvg = logo.src.endsWith(".svg");
                return (
                  <span
                    key={index}
                    className={
                      "sb-logo-chip sb-logo-chip-img" +
                      (logo.white ? " sb-logo-chip-white" : "")
                    }
                    title={logo.name}
                  >
                    {isSvg ? (
                      // SVGs render at their intrinsic ratio; next/image's aspect-ratio
                      // check misfires on them, so use a plain <img>.
                      <img
                        src={logo.src}
                        alt={logo.name}
                        width={logo.width}
                        height={logo.height}
                        style={{ height: logo.height, width: "auto" }}
                      />
                    ) : (
                      <Image
                        src={logo.src}
                        alt={logo.name}
                        width={logo.width}
                        height={logo.height}
                        style={{ height: logo.height, width: "auto" }}
                      />
                    )}
                  </span>
                );
              }
              if (logo.kind === "icon") {
                return (
                  <span
                    key={index}
                    className="sb-logo-chip sb-logo-chip-icon"
                    title={logo.name}
                  >
                    <Image
                      src={logo.src}
                      alt=""
                      width={logo.width}
                      height={logo.height}
                      style={{ height: logo.height, width: logo.height }}
                    />
                    <span>{logo.name}</span>
                  </span>
                );
              }
              return (
                <span key={index} className="sb-logo-chip">
                  {logo.name.toUpperCase()}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
