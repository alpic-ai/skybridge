import { CopyOption } from "./copy-option";
import { Icon, type IconName } from "./icons";

type ValueItem = {
  icon: IconName;
  title: string;
  descriptions: string[];
  cta?: { label: string; href: string };
};

const VALUES: ValueItem[] = [
  {
    icon: "globe",
    title: "Write once, run everywhere",
    descriptions: [
      "Skybridge abstracts implementation differences, so your app runs seamlessly in Claude, ChatGPT, VSCode and any client compatible with MCP apps.",
      "Your app runs seamlessly in Claude, ChatGPT, Cursor and any other MCP-Apps compatible client, with Skybridge abstracting all the implementation differences.",
    ],
  },
  {
    icon: "terminal",
    title: "Delightful dev environment",
    descriptions: [
      "Get a complete local emulator, Hot Module Reload and instant tunnel to connect your local app to Claude & ChatGPT.",
      "Local DevTools playground, hot reload, tunnels to real hosts. Iterate at the speed of thought.",
    ],
  },
  {
    icon: "wand",
    title: "Agent-ready",
    descriptions: [
      "Powerful Skills, CLI and programmatic devtools APIs: everything your coding agent needs to build MCP apps end-to-end.",
      "Built to be used by agents, not just humans. First-class Skills, a powerful CLI, and programmatic DevTools APIs to give your coding agent full autonomy.",
    ],
  },
  {
    icon: "type",
    title: "Type-safe end-to-end",
    descriptions: [
      "tRPC-style inference from MCP server tool definition to React view.",
      "Zod schemas on tools, full TS inference into your widget props. No stringly-typed APIs.",
    ],
  },
  {
    icon: "react",
    title: "React friendly",
    descriptions: [
      "Intuitive react-query style hooks, with advanced state management. If you know React, you’ve got Skybridge.",
    ],
  },
  {
    icon: "book",
    title: "Examples library",
    descriptions: [
      "Get started quickly with production-ready app examples for e-commerce, travel, SaaS, and others.",
    ],
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
                <CopyOption as="p" options={value.descriptions} />
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
