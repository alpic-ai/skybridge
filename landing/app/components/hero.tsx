"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

export function SBNav() {
  return (
    <nav className="sb-nav">
      <div className="sb-nav-inner" style={{ height: "74px" }}>
        <a className="sb-brand" href="/" aria-label="Skybridge">
          <img
            src="/assets/skybridge-logo-light.svg"
            alt="Skybridge"
            className="sb-brand-logo"
          />
          <span className="sb-brand-ver">v0.8</span>
        </a>
        <div className="sb-nav-links">
          <a href="#">Docs</a>
          <a href="/showcase">Showcase</a>
        </div>
        <div className="sb-nav-right">
          <a
            className="sb-btn sb-btn-ghost sb-nav-stars"
            href="https://github.com/alpic-ai/skybridge"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon name="github" size={13} />
            <span className="sb-star-count">1k</span>
          </a>
          <a
            className="sb-btn sb-btn-primary"
            href="https://docs.skybridge.tech"
            target="_blank"
            rel="noreferrer"
          >
            Get started
            <Icon name="arrow" size={12} stroke={2} />
          </a>
        </div>
      </div>
    </nav>
  );
}

type InstallRowProps = {
  cmd: string;
  label?: string;
  id?: string;
};

export function InstallRow({ cmd, label }: InstallRowProps) {
  const [copied, setCopied] = useState(false);
  const onCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    navigator.clipboard?.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div
      className="sb-install"
      role="group"
      aria-label={label}
      style={{ width: "240px" }}
    >
      {label && <span className="sb-install-step">{label}</span>}
      <span className="sb-install-prompt">$</span>
      <span
        className="sb-install-cmd"
        style={{ width: "150px", fontSize: "11px" }}
      >
        {cmd}
      </span>
      <button
        className={`sb-install-copy ${copied ? "copied" : ""}`}
        onClick={onCopy}
      >
        <Icon name={copied ? "check" : "copy"} size={13} />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function SBHero({}: { showInstallVariant?: boolean }) {
  const HOSTS = [
    "Claude",
    "ChatGPT",
    "VSCode",
    "Cursor",
    "Goose",
    "your AI app",
  ];
  const [hostIdx, setHostIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setHostIdx((i) => (i + 1) % HOSTS.length),
      2400,
    );
    return () => clearInterval(id);
  }, [HOSTS.length]);
  return (
    <section className="sb-hero">
      <a
        className="sb-team-note"
        href="https://docs.google.com/document/d/1C5L3cSbxkWQ8nGbslILtc0GwBkHN9kshAQ21CU0Ndko/edit?tab=t.0"
        target="_blank"
        rel="noopener noreferrer"
        title="Team members only — content source doc"
      >
        content doc ↗
      </a>
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
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073z" />
            </svg>
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
            {HOSTS.map((h, i) => (
              <span
                key={h}
                className={`sb-h1-host-slot ${i === hostIdx ? "is-active" : "is-hidden"}`}
                aria-hidden={i !== hostIdx}
              >
                <span className="sb-accent">{h}</span>
              </span>
            ))}
            <span className="sb-h1-host-ghost" aria-hidden="true">
              {HOSTS.reduce((a, b) => (a.length >= b.length ? a : b))}
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
                  href="https://skybridge.tech/home"
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
