import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "Skybridge",
  tagline:
    "Skybridge is the TypeScript framework for building ChatGPT & MCP apps",
  favicon: "img/favicon.ico",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  url: "https://skybridge.tech",
  baseUrl: "/",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          routeBasePath: "/", // Serve docs at the root
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ["rss", "atom"],
            xslt: true,
          },
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/logo.png",
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "Skybridge",
      logo: {
        alt: "Skybridge Logo",
        src: "img/logo.png",
      },
      items: [
        {
          href: "https://github.com/alpic-ai/skybridge",
          html: '<img src="https://img.shields.io/github/stars/alpic-ai/skybridge?label=Star us" alt="GitHub stars" class="github-stars-badge" />',
          position: "right",
        },
        {
          href: "https://discord.gg/awV4gu74wK",
          label: "Discord",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/alpic-ai/skybridge",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Skybridge`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    codeBlock: {
      showCopyButton: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
