"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

const HOSTS = ["Claude", "ChatGPT", "VSCode", "Cursor", "Goose", "your AI app"];
const LONGEST_HOST = HOSTS.reduce((longest, host) =>
  longest.length >= host.length ? longest : host,
);

type InstallRowProps = {
  cmd: string;
  label?: string;
};

export function InstallRow({ cmd, label }: InstallRowProps) {
  const [copied, setCopied] = useState(false);
  const onCopy = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    navigator.clipboard?.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      className="sb-install"
      aria-label={label ? `${label} copy ${cmd}` : `Copy ${cmd}`}
      onClick={onCopy}
    >
      {label && <span className="sb-install-step">{label}</span>}
      <span className="sb-install-prompt">$</span>
      <span className="sb-install-cmd">{cmd}</span>
      <span className={`sb-install-copy ${copied ? "copied" : ""}`}>
        <Icon name={copied ? "check" : "copy"} size={13} />
        {copied ? "Copied" : "Copy"}
      </span>
    </button>
  );
}

export function Hero() {
  const [hostIndex, setHostIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setHostIndex((current) => (current + 1) % HOSTS.length),
      2400,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <section className="sb-hero">
      <div className="sb-wrap">
        <a
          className="sb-featured"
          href="https://developers.openai.com/blog/15-lessons-building-chatgpt-apps"
          target="_blank"
          rel="noopener noreferrer"
          style={{ borderColor: "rgb(137, 240, 236)" }}
        >
          <span
            className="sb-featured-badge"
            style={{
              backgroundColor: "rgb(137, 240, 236)",
              color: "rgb(6, 17, 15)",
            }}
          >
            News
          </span>
          <span className="sb-featured-text">
            Skybridge featured on <strong>OpenAI Developers Blog</strong>: 15
            lessons building ChatGPT apps
          </span>
          <span className="sb-featured-arrow">
            <Icon name="arrow" size={13} stroke={2.2} />
          </span>
        </a>
        <h1 className="sb-h1" style={{ fontWeight: 400 }}>
          Build apps that live
          <br />
          inside{" "}
          <span className="sb-h1-host" style={{ color: "rgb(255, 255, 255)" }}>
            {HOSTS.map((host, index) => (
              <span
                key={host}
                className={`sb-h1-host-slot ${index === hostIndex ? "is-active" : "is-hidden"}`}
                aria-hidden={index !== hostIndex}
              >
                <span className="sb-accent">{host}</span>
              </span>
            ))}
            <span className="sb-h1-host-ghost" aria-hidden="true">
              {LONGEST_HOST}
            </span>
          </span>
        </h1>
        <p className="sb-lede">The React framework for MCP Apps.</p>

        <div className="sb-cta-stack">
          <div className="sb-cta-row sb-cta-row-split">
            <div className="sb-cta-installs" style={{ width: 720 }}>
              <div className="sb-cta-installs-head">
                Get started in 5 seconds
              </div>
              <InstallRow cmd="npm create skybridge" label="For humans:" />
              <InstallRow
                cmd="npx skills add alpic-ai/skybridge -s skybridge"
                label="For agents:"
              />
              <div className="sb-cta-row" style={{ marginTop: 10, gap: 10 }}>
                <a
                  className="sb-btn sb-btn-primary sb-btn-lg"
                  href="https://docs.skybridge.tech"
                  style={{ borderColor: "rgb(166, 244, 241)" }}
                >
                  Read the docs
                  <Icon name="arrow" size={15} stroke={2} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
