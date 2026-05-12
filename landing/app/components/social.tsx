import Image from "next/image";
import { Icon } from "./icons";

type Logo =
  | {
      kind: "img";
      name: string;
      src: string;
      h: number;
      w: number;
      white?: boolean;
    }
  | { kind: "icon"; name: string; src: string; h: number; w: number }
  | { kind: "text"; name: string };

export function SBSocial() {
  const PNG_H = 40;
  const logos: Logo[] = [
    {
      kind: "img",
      name: "Bitmovin",
      src: "/assets/customer-logos/bitmovin.svg",
      h: 26,
      w: 120,
    },
    {
      kind: "img",
      name: "Evaneos",
      src: "/assets/customer-logos/evaneos.svg",
      h: 22,
      w: 110,
    },
    {
      kind: "img",
      name: "Datadog",
      src: "/assets/customer-logos/datadog.svg",
      h: 32,
      w: 160,
      white: true,
    },
    {
      kind: "img",
      name: "Touchstream",
      src: "/assets/customer-logos/touchstream.webp",
      h: PNG_H,
      w: 230,
    },
    {
      kind: "img",
      name: "Awaze",
      src: "/assets/customer-logos/awaze.webp",
      h: PNG_H,
      w: 114,
    },
    {
      kind: "img",
      name: "Listo",
      src: "/assets/customer-logos/listo.webp",
      h: PNG_H,
      w: 99,
    },
    {
      kind: "img",
      name: "Alpic",
      src: "/assets/customer-logos/alpic.webp",
      h: PNG_H,
      w: 158,
    },
    {
      kind: "img",
      name: "Cottages.com",
      src: "/assets/customer-logos/cottages.webp",
      h: PNG_H,
      w: 168,
    },
    {
      kind: "img",
      name: "Drio",
      src: "/assets/customer-logos/drio.webp",
      h: PNG_H,
      w: 127,
    },
    {
      kind: "icon",
      name: "OTseek",
      src: "/assets/customer-logos/otseek.webp",
      h: 30,
      w: 30,
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
          <a className="sb-btn sb-btn-primary sb-btn-lg" href="#">
            See the showcase
            <Icon name="arrow" size={14} stroke={2} />
          </a>
        </div>
        <div className="sb-marquee">
          <div className="sb-marquee-track">
            {[...logos, ...logos].map((l, i) => {
              if (l.kind === "img") {
                return (
                  <span
                    key={i}
                    className={
                      "sb-logo-chip sb-logo-chip-img" +
                      (l.white ? " sb-logo-chip-white" : "")
                    }
                    title={l.name}
                  >
                    <Image
                      src={l.src}
                      alt={l.name}
                      width={l.w}
                      height={l.h}
                      style={{ height: l.h, width: "auto" }}
                    />
                  </span>
                );
              }
              if (l.kind === "icon") {
                return (
                  <span
                    key={i}
                    className="sb-logo-chip sb-logo-chip-icon"
                    title={l.name}
                  >
                    <Image
                      src={l.src}
                      alt=""
                      width={l.w}
                      height={l.h}
                      style={{ height: l.h, width: l.h }}
                    />
                    <span>{l.name}</span>
                  </span>
                );
              }
              return (
                <span key={i} className="sb-logo-chip">
                  {l.name.toUpperCase()}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
