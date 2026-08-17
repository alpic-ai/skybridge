import "@/index.css";

import { Github } from "lucide-react";
import { useOpenExternal } from "skybridge/web";
import {
  Hero,
  HeroActions,
  HeroContent,
  HeroDescription,
  HeroLogos,
  HeroTechLogos,
  HeroTitle,
} from "../components/ui/hero.js";
import { useToolInfo } from "../helpers.js";

const DEFAULT_TITLE = "Skybridge";
const DEFAULT_SUBTITLE = "Build ChatGPT & MCP Apps. The Modern TypeScript Way.";

function HelloWorld() {
  const openExternal = useOpenExternal();
  const { input } = useToolInfo<"hello-world">();

  const title = input?.title || DEFAULT_TITLE;
  const subtitle = input?.subtitle || DEFAULT_SUBTITLE;

  // Looking for more components? Browse https://mcpcn.dev to see all mcpcn components made for agentic apps.
  return (
    <Hero
      data={{
        logo1: {
          text: "mcpcn",
          alt: "mcpcn Logo",
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
        onPrimaryClick: () => openExternal("https://mcpcn.dev"),
        onSecondaryClick: () =>
          openExternal("https://github.com/shadcn-labs/mcpcn"),
      }}
    >
      <HeroContent>
        <HeroLogos />
        <HeroTitle />
        <HeroDescription />
        <HeroActions />
        <HeroTechLogos />
      </HeroContent>
    </Hero>
  );
}

export default HelloWorld;
