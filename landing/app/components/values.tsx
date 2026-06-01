import { Icon, type IconName } from "./icons";

type ValueItem = {
  icon: IconName;
  title: string;
  description: string;
  cta?: { label: string; href: string };
};

const VALUES: ValueItem[] = [
  {
    icon: "globe",
    title: "Write once, run everywhere",
    description:
      "Skybridge abstracts implementation differences, so your app runs seamlessly in Claude, ChatGPT, VSCode and any client compatible with MCP apps.",
  },
  {
    icon: "terminal",
    title: "Delightful dev environment",
    description:
      "Get a complete local emulator, Hot Module Reload and instant tunnel to connect your local app to Claude & ChatGPT.",
  },
  {
    icon: "wand",
    title: "Agent-ready",
    description:
      "Powerful Skills, CLI and programmatic devtools APIs: everything your coding agent needs to build MCP apps end-to-end.",
  },
  {
    icon: "type",
    title: "Type-safe end-to-end",
    description:
      "tRPC-style inference from MCP server tool definition to React view.",
  },
  {
    icon: "react",
    title: "React friendly",
    description:
      "Intuitive react-query style hooks, with advanced state management. If you know React, you’ve got Skybridge.",
  },
  {
    icon: "book",
    title: "Example library",
    description:
      "Get started quickly with production-ready app examples for e-commerce, travel, SaaS, and others.",
    cta: { label: "See examples", href: "/showcase" },
  },
];

export function ValuesSection() {
  return (
    <section className="sb-section" id="values">
      <div className="sb-wrap">
        <div className="sb-section-header">
          <div className="sb-section-eyebrow">Opinionated where it matters</div>

          <h2 className="sb-section-title">
            The MCP framework for developers with{" "}
            <span className="sb-accent">taste</span>.
          </h2>
        </div>
        <div className="sb-values">
          {VALUES.map((value) => (
            <div className="sb-value" key={value.title}>
              <div className="sb-value-body">
                <span className="sb-value-icon">
                  <Icon name={value.icon} size={28} stroke={2.2} />
                </span>
                <h3>{value.title}</h3>
                <p className="sb-copt">
                  <span className="sb-copt-body">{value.description}</span>
                </p>
                {value.cta && (
                  <a className="sb-value-cta" href={value.cta.href}>
                    {value.cta.label}
                    <Icon name="arrow" size={13} stroke={2} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
