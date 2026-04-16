import "@/index.css";

import { mountWidget, useOpenExternal } from "skybridge/web";
import { Hero } from "../components/ui/hero.js";
import { Github } from "lucide-react";
import { useToolInfo } from "../helpers.js";

const DEFAULT_TITLE = "Skybridge";
const DEFAULT_SUBTITLE = "Build ChatGPT & MCP Apps. The Modern TypeScript Way.";

function HelloWorld() {
  const openExternal = useOpenExternal();
  const { input } = useToolInfo<"hello-world">();

  const title = input?.title || DEFAULT_TITLE;
  const subtitle = input?.subtitle || DEFAULT_SUBTITLE;

  // Looking for more components ? Browse https://ui.manifest.build to see all components made for agentic apps.
  return (
    <Hero
      data={{
        logo1: {
          text: "Alpic",
          alt: "Alpic Logo",
          url: "https://avatars.githubusercontent.com/u/206831205?s=200&v=4",
        },
        title,
        subtitle,
        primaryButton: { label: "Documentation" },
        secondaryButton: {
          label: "GitHub",
          icon: <Github className="h-5 w-5" />,
        },
      }}
      actions={{
        onPrimaryClick: () => openExternal("https://docs.skybridge.tech"),
        onSecondaryClick: () =>
          openExternal("https://github.com/alpic-ai/skybridge"),
      }}
    />
  );
}

export default HelloWorld;

mountWidget(<HelloWorld />);
