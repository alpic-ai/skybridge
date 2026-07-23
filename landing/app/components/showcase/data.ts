export type ShowcaseLinks = {
  demo?: string;
  chatgpt?: string;
  mcp?: string;
  directory?: string;
  github?: string;
};

export type ShowcaseToolResultItem = {
  route: string;
  carrier: string;
  price: string;
  time: string;
};

export type ShowcaseToolResult = {
  tool: string;
  summary: string;
  items?: ShowcaseToolResultItem[];
};

export type ShowcaseChat = {
  user: string;
  assistant: string;
};

export type ShowcaseCategory = "3rd Party" | "Example";

export type ShowcasePreviewMode =
  | "chatgpt-inline"
  | "chatgpt-fullscreen"
  | "claude-inline"
  | "claude-fullscreen";

/** Inline host chrome: thread + widget inset (screenshot empty when `app.noWidget`). */
export type ShowcasePreviewInline = {
  mode: "chatgpt-inline" | "claude-inline";
  chat: ShowcaseChat;
  screenshot: string;
};

/** Full viewport-style chrome: top bar + large inset (no fake thread copy). */
export type ShowcasePreviewFullscreen = {
  mode: "chatgpt-fullscreen" | "claude-fullscreen";
  screenshot: string;
};

export type ShowcasePreview = ShowcasePreviewInline | ShowcasePreviewFullscreen;

export type ShowcaseApp = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  blurb: string;
  category: ShowcaseCategory;
  host: string;
  accent: string;
  /** App icon displayed in the tool-call header (circular, ~18px). */
  icon?: string;
  img?: string;
  /** Ordered showcase slides (host mode + screenshot + optional thread copy). */
  previews?: ShowcasePreview[];
  noWidget?: boolean;
  chat: ShowcaseChat;
  tags: string[];
  toolResult?: ShowcaseToolResult;
  links: ShowcaseLinks;
  /** Per-app "What's interesting" bullet points shown on the detail page. */
  highlights?: string[];
  /** ISO date string for sitemap lastModified — falls back to SITE_UPDATED if omitted. */
  updatedAt?: Date;
};

function inferDefaultInlineMode(
  host: string,
): "chatgpt-inline" | "claude-inline" {
  const h = host.toLowerCase();
  if (h.includes("claude") && !h.includes("chatgpt")) {
    return "claude-inline";
  }
  return "chatgpt-inline";
}

/** Resolve carousel frames: explicit `previews`, legacy `img`, or `noWidget` placeholder. */
export function getShowcasePreviews(app: ShowcaseApp): ShowcasePreview[] {
  if (app.previews && app.previews.length > 0) {
    return app.previews;
  }
  const mode = inferDefaultInlineMode(app.host);
  if (app.noWidget) {
    return [{ mode, chat: app.chat, screenshot: "" }];
  }
  return app.img ? [{ mode, chat: app.chat, screenshot: app.img }] : [];
}

/** OpenGraph / thumbnails: first preview with a screenshot, else legacy `img`. */
export function getShowcaseHeroImage(app: ShowcaseApp): string | undefined {
  for (const preview of getShowcasePreviews(app)) {
    if (preview.screenshot.length > 0) {
      return preview.screenshot;
    }
  }
  return app.img;
}

export const SHOWCASE: ShowcaseApp[] = [
  {
    id: "kiwi",
    slug: "kiwi",
    name: "Kiwi.com",
    tagline: "Flight search, agent-native",
    blurb:
      "The official Kiwi.com MCP app. Search across global flight inventory in natural language and get a direct booking link back.",
    category: "3rd Party",
    host: "Claude",
    accent: "#008C79",
    icon: "/assets/showcase/icons/kiwi.webp",
    img: "/assets/showcase/kiwiinline.webp",
    previews: [
      {
        mode: "claude-inline",
        chat: {
          user: "Find me a round-trip from Lisbon to Paris, Dec 3 to 10, two adults",
          assistant: "Searching Kiwi.com for the best options.",
        },
        screenshot: "/assets/showcase/kiwiinline.webp",
      },
      {
        mode: "claude-fullscreen",
        screenshot: "/assets/showcase/kiwifullscreen.webp",
      },
    ],
    chat: {
      user: "Find me a round-trip from Lisbon to Paris, Dec 3 to 10, two adults",
      assistant: "Searching Kiwi.com for the best options.",
    },
    tags: ["Travel", "Flights"],
    highlights: [
      "Global flight inventory searched via a single search-flight tool call.",
      "Direct booking links returned in Widget UI, no redirect friction.",
      "Fullscreen view with detailed itinerary details.",
    ],
    toolResult: {
      tool: "search-flight",
      summary: "Returned 12 itineraries · cheapest €87 · fastest 2h 25m",
      items: [
        {
          route: "VIE → BCN",
          carrier: "Vueling · 1 stop",
          price: "€87",
          time: "5h 10m",
        },
        {
          route: "VIE → BCN",
          carrier: "Ryanair · direct",
          price: "€112",
          time: "2h 25m",
        },
        {
          route: "VIE → BCN",
          carrier: "Lufthansa · direct",
          price: "€198",
          time: "2h 35m",
        },
      ],
    },
    links: {
      demo: "https://mcp.kiwi.com/try",
      mcp: "https://mcp.kiwi.com",
      directory:
        "https://claude.ai/directory/connectors/01c311c4-53cb-452a-90a8-1d524c9b97d6",
    },
  },
  {
    id: "cottages",
    slug: "cottages",
    name: "Cottages.com",
    tagline: "Discover UK holiday cottages",
    blurb:
      "Explore 18,000 quality-checked cottages across the UK. Need more information or want to check other options? Ask away!",
    category: "3rd Party",
    host: "ChatGPT",
    accent: "#50A00D",
    icon: "/assets/showcase/icons/cottages.webp",
    img: "/assets/showcase/cottages.webp",
    previews: [
      {
        mode: "chatgpt-inline",
        chat: {
          user: "Find me a cottage in Cornwall for first week of April. 2 adults, 1 child and a dog. We want it near the coast.",
          assistant: "I'll search through Cottages.com for you.",
        },
        screenshot: "/assets/showcase/cottages.webp",
      },
      {
        mode: "chatgpt-fullscreen",
        screenshot: "/assets/showcase/cottages-fullscreen.webp",
      },
    ],
    chat: {
      user: "Find me a cottage in Cornwall for first week of April. 2 adults, 1 child and a dog. We want it near the coast.",
      assistant: "I'll search through Cottages.com for you.",
    },
    tags: ["Travel", "Booking"],
    highlights: [
      "Natural language search with advanced filtering (pets, near a beach, near a pub, dates, group size, amneties...) resolved via a single tool call.",
      "Fullscreen map view, re-centers on follow up destination search from the user.",
      "Detailed property context shared with the model via data-llm, keeping the UI simple and focused on images & key details.",
      "Mobile & Desktop responsive design, providing a great experience on all devices.",
    ],
    links: {
      demo: "https://mcp.cottages.com/try",
      chatgpt:
        "https://chatgpt.com/apps/cottages/asdk_app_6945254ad31c81919d07ba1c357a1a57",
    },
  },
  {
    id: "recommerce",
    slug: "recommerce",
    name: "Recommerce",
    tagline: "Refurbished device shopping",
    blurb:
      "This app helps you find and purchase refurbished smartphones, MacBooks, tablets, and gaming consoles with ease. Instead of navigating multiple sites or guessing product quality, you can browse a curated selection of refurbished devices in one place and choose the option that fits your needs and budget.",
    category: "3rd Party",
    host: "ChatGPT",
    accent: "#1FAE6E",
    icon: "/assets/showcase/icons/recommerce.webp",
    img: "/assets/showcase/recommerce-inline-1.webp",
    previews: [
      {
        mode: "chatgpt-inline",
        chat: {
          user: "I want a refurbished iPhone under €500, good battery health",
          assistant: "Let me check the Recommerce catalog.",
        },
        screenshot: "/assets/showcase/recommerce-inline-1.webp",
      },
      {
        mode: "chatgpt-fullscreen",
        screenshot: "/assets/showcase/recommerce-fullscreen.webp",
      },
    ],
    chat: {
      user: "I want a refurbished iPhone under €500, good battery health",
      assistant: "Let me check the Recommerce catalog.",
    },
    tags: ["Commerce", "Circular"],
    highlights: [
      "Refurbished devices searchable through natural language: condition grades, OS, screen size, storage size, model, price range, etc.",
      "Fill your cart directly from the app, one click checkout to the Recommerce website.",
      "Ability to leverage chatGPT knowledge to help user benchmarks various devices, based on their own criteria.",
    ],
    links: {
      demo: "https://mcp.recommerce.com/try",
      chatgpt:
        "https://chatgpt.com/apps/recommerce/asdk_app_6943b26226c4819189e6b19249055265",
    },
  },
  {
    id: "alpic",
    slug: "alpic",
    name: "Alpic",
    tagline: "Monitor your MCP Apps & servers",
    blurb:
      "Manage your projects, debug deployment, and check analytics for any MCP server you host with Alpic.",
    category: "3rd Party",
    host: "ChatGPT · Claude",
    accent: "#E90060",
    icon: "/assets/showcase/icons/alpic.webp",
    img: "/assets/showcase/alpic-inline-1.webp",
    previews: [
      {
        mode: "chatgpt-inline",
        chat: {
          user: "How are my MCP servers doing this week?",
          assistant:
            "Let me summarize your servers' performance from Alpic analytics.",
        },
        screenshot: "/assets/showcase/alpic-inline-1.webp",
      },
      {
        mode: "chatgpt-inline",
        chat: {
          user: "How are my MCP servers doing this week?",
          assistant:
            "Let me summarize your servers' performance from Alpic analytics.",
        },
        screenshot: "/assets/showcase/alpic-inline-2.webp",
      },
    ],
    chat: {
      user: "How are my MCP servers doing this week?",
      assistant: "Let me check your Alpic dashboard.",
    },
    tags: ["Analytics", "Monitoring"],
    highlights: [
      "Detailed analytics shared with the model via data-llm allowing to ask for weekly summaries & highlights to the LLM.",
      "Fully OAuth app (via GitHub or Google SSO).",
      "More coming soon!",
    ],
    links: {
      demo: "https://mcp.alpic.ai/try",
      chatgpt:
        "https://chatgpt.com/apps/alpic/asdk_app_6996e5762c508191846b87c57edbbebe",
    },
  },
  {
    id: "recommerce-trade-in",
    slug: "recommerce-trade-in",
    name: "Recommerce Trade-In",
    tagline: "Instant device buyback",
    blurb:
      "Sell your old smartphone in a single conversation. Describe the condition and the agent returns a fixed buyback offer based on Recommerce’s real-time pricing matrix.",
    category: "3rd Party",
    host: "ChatGPT",
    accent: "#3D8B6E",
    icon: "/assets/showcase/icons/recommerce-tradein.webp",
    img: "/assets/showcase/recommerce-tradein-inline-1.webp",
    previews: [
      {
        mode: "chatgpt-inline",
        chat: {
          user: "How much can I get for my Google Pixel, screen has a small scratch?",
          assistant: "Let me get you a quote from Recommerce.",
        },
        screenshot: "/assets/showcase/recommerce-tradein-inline-1.webp",
      },
      {
        mode: "chatgpt-inline",
        chat: {
          user: "How much can I get for my Google Pixel, screen has a small scratch?",
          assistant: "Let me get you a quote from Recommerce.",
        },
        screenshot: "/assets/showcase/recommerce-tradein-inline-2.webp",
      },
      {
        mode: "chatgpt-inline",
        chat: {
          user: "How much can I get for my Google Pixel, screen has a small scratch?",
          assistant: "Let me get you a quote from Recommerce.",
        },
        screenshot: "/assets/showcase/recommerce-tradein-inline-3.webp",
      },
    ],
    chat: {
      user: "How much can I get for my iPhone 13, 128GB, screen has a small scratch?",
      assistant: "Let me get you a quote from Recommerce.",
    },
    tags: ["Trade-in", "Circular"],
    highlights: [
      "Details on condition grades are shared with the model. The user can upload photos of the device and let chatGPT evaluate the condition.",
      "Questionnaires can be filled via the UI or by chatting with the model, letting the model fill the form for the user.",
      "Multi country, multi language support, including UI & API data.",
    ],
    links: {
      demo: "https://mcp.tradin.recommerce.com/try",
      chatgpt:
        "https://chatgpt.com/apps/recommerce-trade-in/asdk_app_69c5423d7e408191bec964b57cce719e",
    },
  },
  {
    id: "voyage-prive",
    slug: "voyage-prive",
    name: "Voyage Privé",
    tagline: "Luxury travel flash sales",
    blurb:
      "Discover exclusive luxury hotel and travel deals from Voyage Privé. Search by destination, dates, and group size to find premium stays at members-only prices. With map view, detailed property info, and direct booking.",
    category: "3rd Party",
    host: "ChatGPT",
    accent: "#BD1241",
    icon: "/assets/showcase/icons/voyage-prive.webp",
    img: "/assets/showcase/vpinline.webp",
    previews: [
      {
        mode: "chatgpt-inline",
        chat: {
          user: "Find me a luxury hotel in New York for the first week of June, 2 adults",
          assistant: "Let me search Voyage Privé's exclusive offers.",
        },
        screenshot: "/assets/showcase/vpinline.webp",
      },
      {
        mode: "chatgpt-fullscreen",
        screenshot: "/assets/showcase/vpfullscreen.webp",
      },
    ],
    chat: {
      user: "Find me a luxury hotel in New York for the first week of June, 2 adults",
      assistant: "Let me search Voyage Privé's exclusive offers.",
    },
    tags: ["Travel", "Luxury", "Hotels"],
    highlights: [
      "Natural language search with advanced filtering (dates, group size, amenities, price range...).",
      "Fullscreen map view with property cards and detailed offer panels: overview, editorial picks, and negotiated perks.",
      "Full model sync via data-llm, allowing user to ask advanced questions when looking at an offer.",
    ],
    links: {
      demo: "https://mcp.voyage-prive.com/try",
      chatgpt:
        "https://chatgpt.com/apps/voyage-priv/asdk_app_6943c73f6c8481919dc2b9ac42af0064",
    },
  },
  {
    id: "facile",
    slug: "facile",
    name: "Facile.it Energia",
    tagline: "Compare energy offers in Italy",
    blurb:
      "Facile.it Energia helps you compare gas and electricity offers in Italy. Instead of visiting each provider's website or deciphering confusing rate sheets, you can see the best available offers based on your actual consumption and location, all in one screen.",
    category: "3rd Party",
    host: "ChatGPT",
    accent: "#FF6600",
    icon: "/assets/showcase/icons/facile.webp",
    img: "/assets/showcase/facile-inline-1.webp",
    previews: [
      {
        mode: "chatgpt-inline",
        chat: {
          user: "Compare electricity and gas offers in Milan",
          assistant: "Ok let me ask Facile.it comparator",
        },
        screenshot: "/assets/showcase/facile-inline-1.webp",
      },
      {
        mode: "chatgpt-inline",
        chat: {
          user: "Compare electricity and gas offers in Milan",
          assistant: "Ok let me ask Facile.it comparator",
        },
        screenshot: "/assets/showcase/facile-inline-2.webp",
      },
    ],
    chat: {
      user: "Compare electricity and gas offers in Milan",
      assistant: "Ok let me ask Facile.it comparator",
    },
    tags: ["Energy", "Comparator"],
    highlights: [
      "Fill forms via the UI or by talking to ChatGPT, the LLM can manipulate the form for you if it has the right information.",
      "Context shared with model to help users select the right consumption category",
      "Access to all energy providers in Italy.",
      "Mobile-first design.",
    ],
    links: {
      chatgpt:
        "https://chatgpt.com/apps/facile-it-energia/asdk_app_69fcc1c31b2081919069e1f5f6f7166d",
    },
  },

  {
    id: "evaneos",
    slug: "evaneos",
    name: "Evaneos",
    tagline: "Travel destinations",
    blurb:
      "Personalized destination discovery with tailored itinerary ideas, travel period guidance, and sustainable alternatives curated by Evaneos experts.",
    category: "3rd Party",
    host: "ChatGPT",
    accent: "#FFE54E",
    icon: "/assets/showcase/icons/evaneos.webp",
    img: "/assets/showcase/evaneos.webp",
    previews: [
      {
        mode: "chatgpt-inline",
        chat: {
          user: "I want to travel somewhere sustainable in October, off the beaten track.",
          assistant: "Let me ask Evaneos's local experts.",
        },
        screenshot: "/assets/showcase/evaneos.webp",
      },
      {
        mode: "chatgpt-fullscreen",
        screenshot: "/assets/showcase/evaneos-fullscreen.webp",
      },
    ],
    chat: {
      user: "I want to travel somewhere sustainable in October, off the beaten track.",
      assistant: "Let me ask Evaneos's local experts.",
    },
    tags: ["Travel", "Itinerary"],
    highlights: [
      "Curated itineraries surfaced from local expert knowledge, not generic search.",
      "UI & Model sync via data-llm, allowing user to ask advanced question when looking at a destination.",
      "Inline carousel & fullscreen details view for each destination.",
    ],
    links: {
      chatgpt:
        "https://chatgpt.com/apps/evaneos/asdk_app_69612510d5288191b6a4174252337e93",
    },
  },
  {
    id: "generative-ui",
    slug: "generative-ui",
    name: "Generative UI - JSON Renderer",
    tagline: "LLM-composed interfaces",
    blurb:
      "LLM-generated dynamic UIs with json-render and 36 pre-built shadcn/ui components. The AI composes the interface, the widget renders it.",
    category: "Example",
    host: "ChatGPT · Claude",
    accent: "#89F0EC",
    img: "/assets/showcase/generative-ui.webp",
    chat: {
      user: "Build me a dashboard for tracking my reading habit",
      assistant: "Composing the UI now…",
    },
    tags: ["shadcn/ui", "Dynamic"],
    highlights: [
      "The AI composes the UI on the fly from 36 pre-built shadcn/ui primitives.",
      "json-render interprets a JSON layout tree. No client-side code generation.",
      "Fully interactive: buttons, inputs, and state all work inside the widget.",
    ],
    links: {
      demo: "https://generative-ui.skybridge.tech/try",
      github:
        "https://github.com/alpic-ai/skybridge/tree/main/examples/generative-ui",
    },
  },
  {
    id: "openui",
    slug: "openui",
    name: "Generative UI - OpenUI",
    tagline: "OpenUI Lang generative UI",
    blurb:
      "LLM-generated dynamic UIs with OpenUI Lang and the standard OpenUI component library. The AI streams OpenUI Lang; the view renders it.",
    category: "Example",
    host: "ChatGPT · Claude",
    accent: "#C4B5FD",
    img: "/assets/showcase/openui.webp",
    chat: {
      user: "Build me a launch readiness dashboard",
      assistant: "Streaming OpenUI Lang now…",
    },
    tags: ["OpenUI", "Dynamic"],
    highlights: [
      "The AI streams compact OpenUI Lang into the widget as it generates.",
      "Standard OpenUI library: Cards, Charts, Tables, Steps, and Callouts.",
      "get-openui-prompt teaches the model syntax and available components first.",
    ],
    links: {
      demo: "https://openui.skybridge.tech/try",
      github:
        "https://github.com/alpic-ai/skybridge/tree/main/examples/openui-generative-ui",
    },
  },
  {
    id: "capitals",
    slug: "capitals",
    name: "Capitals Explorer",
    tagline: "Interactive world map",
    blurb:
      "Interactive world map with geolocation, country information from Wikipedia, and dynamic capital exploration.",
    category: "Example",
    host: "ChatGPT · Claude",
    accent: "#E2FFC6",
    img: "/assets/showcase/capitals.webp",
    chat: {
      user: "Show me the capitals of West Africa",
      assistant: "Plotting them on the map.",
    },
    tags: ["Maps", "Geo"],
    highlights: [
      "Live interactive map rendered inline: pan, zoom, and click markers.",
      "Wikipedia-sourced country info displayed alongside the map.",
      "Geolocation and region-based queries resolved to map pins in one tool call.",
    ],
    links: {
      demo: "https://capitals.skybridge.tech/try",
      github:
        "https://github.com/alpic-ai/skybridge/tree/main/examples/capitals",
    },
  },
  {
    id: "flight-booking",
    slug: "flight-booking",
    name: "Flight Booking",
    tagline: "Carousel & comparison",
    blurb:
      "Flight search carousel with route details, pricing comparison, and external booking via Skybridge.",
    category: "Example",
    host: "ChatGPT",
    accent: "#22c55e",
    img: "/assets/showcase/flight-booking.webp",
    chat: {
      user: "Find me flights from Paris to Valencia in early March",
      assistant: "Searching across Skybridge Airlines…",
    },
    tags: ["Travel", "Carousel"],
    highlights: [
      "Swipeable flight carousel with route details, times, and pricing.",
      "Side-by-side comparison mode for shortlisted itineraries.",
      "External booking links open directly from the widget.",
    ],
    links: {
      demo: "https://flight-booking.skybridge.tech/try",
      github:
        "https://github.com/alpic-ai/skybridge/tree/main/examples/flight-booking",
    },
  },
  {
    id: "ecommerce",
    slug: "ecommerce",
    name: "Ecommerce Carousel",
    tagline: "Cart, localization, modals",
    blurb:
      "Product carousel with persistent cart, localization support, theme switching, and modal dialogs.",
    category: "Example",
    host: "ChatGPT",
    accent: "#f22b79",
    img: "/assets/showcase/ecommerce.webp",
    chat: {
      user: "I need running shoes, size 42, under €120",
      assistant: "Here are 4 picks.",
    },
    tags: ["Commerce", "Cart"],
    highlights: [
      "Persistent cart that survives across multiple tool calls in the same thread.",
      "Full localization (currency, language) driven by user context.",
      "Modal dialogs for size guides and product details. No page navigation.",
    ],
    links: {
      demo: "https://ecommerce.skybridge.tech/try",
      github:
        "https://github.com/alpic-ai/skybridge/tree/main/examples/ecom-carousel",
    },
  },
  {
    id: "everything",
    slug: "everything",
    name: "Everything",
    tagline: "All hooks playground",
    blurb:
      "Comprehensive playground showcasing all Skybridge hooks and features. The ultimate reference implementation.",
    category: "Example",
    host: "ChatGPT · Claude",
    accent: "#89F0EC",
    img: "/assets/showcase/everything.webp",
    chat: {
      user: "Show me everything Skybridge can do",
      assistant: "Loading the playground.",
    },
    tags: ["Reference", "All hooks"],
    highlights: [
      "Every Skybridge hook exercised in a single interactive playground.",
      "Live state inspector shows bridge traffic between widget and host.",
      "Copy-pasteable code snippets for each hook alongside the demo.",
    ],
    links: {
      demo: "https://everything.skybridge.tech/try",
      github:
        "https://github.com/alpic-ai/skybridge/tree/main/examples/everything",
    },
  },
  {
    id: "investigation-game",
    slug: "investigation-game",
    name: "Investigation Game",
    tagline: "Murder mystery",
    blurb:
      "Interactive murder mystery game with multi-screen gameplay, fullscreen display mode, and dynamic story progression.",
    category: "Example",
    host: "ChatGPT · Claude",
    accent: "#f22b79",
    img: "/assets/showcase/investigation-game.webp",
    chat: {
      user: "Start a murder mystery, Victorian London",
      assistant: "The case of the gaslit lantern. Begin.",
    },
    tags: ["Game", "Multi-screen"],
    highlights: [
      "Multi-screen gameplay: evidence board, interrogation room, and map.",
      "Fullscreen display mode for immersive story moments.",
      "Dynamic story progression where the AI adapts the mystery to your choices.",
    ],
    links: {
      demo: "https://investigation-game.skybridge.tech/try",
      github:
        "https://github.com/alpic-ai/skybridge/tree/main/examples/investigation-game",
    },
  },
  {
    id: "productivity",
    slug: "productivity",
    name: "Productivity",
    tagline: "Data viz dashboard",
    blurb:
      "Data visualization dashboard demonstrating Skybridge capabilities for MCP Apps.",
    category: "Example",
    host: "ChatGPT · Claude",
    accent: "#9B7EFF",
    img: "/assets/showcase/productivity.webp",
    chat: {
      user: "Show me this week's team velocity",
      assistant: "Here's the dashboard.",
    },
    tags: ["Charts", "Dashboard"],
    highlights: [
      "Interactive charts (bar, line, pie) rendered inline with live data.",
      "Dashboard layout adapts between inline and fullscreen display modes.",
      "Demonstrates how Skybridge widgets can replace traditional BI embeds.",
    ],
    links: {
      demo: "https://productivity.skybridge.tech/try",
      github:
        "https://github.com/alpic-ai/skybridge/tree/main/examples/productivity",
    },
  },
  {
    id: "times-up",
    slug: "times-up",
    name: "Time's Up",
    tagline: "Word-guessing party game",
    blurb:
      "Word-guessing party game where the user sees a secret word and gives hints to the AI, which tries to guess it.",
    category: "Example",
    host: "ChatGPT",
    accent: "#FFB86B",
    img: "/assets/showcase/times-up.webp",
    chat: {
      user: "Let's play. Word starts with P, fruit and a phone OS",
      assistant: "Apple? Pineapple?",
    },
    tags: ["Game", "Party"],
    highlights: [
      "Secret word displayed only in the widget; the AI never sees it.",
      "Turn-based flow using useSendMessage to pass hints back to the model.",
      "Timer and scoring managed client-side via createStore.",
    ],
    links: {
      demo: "https://times-up.skybridge.tech/try",
      github:
        "https://github.com/alpic-ai/skybridge/tree/main/examples/times-up",
    },
  },
  {
    id: "magic-8-ball",
    slug: "magic-8-ball",
    name: "Magic 8-Ball",
    tagline: "The Skybridge starter",
    blurb:
      "Classic fortune-telling toy: ask a yes-or-no question, shake the ball, and get a mystical answer. The default Skybridge starter app.",
    category: "Example",
    host: "ChatGPT · Claude",
    accent: "#89F0EC",
    img: "/assets/showcase/magic-8-ball.webp",
    chat: {
      user: "Will I ship this on time?",
      assistant: "Let me consult the 8-ball…",
    },
    tags: ["Starter", "Toy"],
    highlights: [
      "The default create-skybridge template, up and running in under a minute.",
      "Shake animation and answer reveal driven entirely by widget state.",
      "Minimal code: shows the smallest possible Skybridge app structure.",
    ],
    links: {
      demo: "https://magic-8-ball.skybridge.tech/try",
      github: "https://github.com/alpic-ai/apps-sdk-template",
    },
  },
  {
    id: "auth-clerk",
    slug: "auth-clerk",
    name: "Auth — Clerk",
    tagline: "OAuth + coffee shops",
    blurb:
      "Full OAuth authentication with Clerk and personalized coffee shop search.",
    category: "Example",
    host: "ChatGPT · Claude",
    accent: "#E2FFC6",
    img: "/assets/showcase/clerk.webp",
    chat: {
      user: "Find me a quiet coffee shop near my office",
      assistant: "Sign in with Clerk to personalize…",
    },
    tags: ["Auth", "OAuth"],
    highlights: [
      "Full OAuth flow via Clerk, sign-in UI rendered inside the widget.",
      "Personalized results after auth (favourite neighbourhoods, past orders).",
      "Token refresh and session management handled transparently by Skybridge.",
    ],
    links: {
      github:
        "https://github.com/alpic-ai/skybridge/tree/main/examples/auth-clerk",
    },
  },
  {
    id: "auth-workos",
    slug: "auth-workos",
    name: "Auth — WorkOS",
    tagline: "AuthKit + coffee shops",
    blurb:
      "Full OAuth authentication with WorkOS AuthKit and personalized coffee shop search.",
    category: "Example",
    host: "ChatGPT · Claude",
    accent: "#FFB86B",
    img: "/assets/showcase/workos.webp",
    chat: {
      user: "Find me a quiet coffee shop near my office",
      assistant: "Sign in with WorkOS…",
    },
    tags: ["Auth", "OAuth"],
    highlights: [
      "WorkOS AuthKit integration — enterprise SSO and MFA out of the box.",
      "Organization-scoped results based on the authenticated user's team.",
      "Shows how Skybridge's auth helpers abstract provider differences.",
    ],
    links: {
      github:
        "https://github.com/alpic-ai/skybridge/tree/main/examples/auth-workos",
    },
  },
  {
    id: "auth-stytch",
    slug: "auth-stytch",
    name: "Auth — Stytch",
    tagline: "Stytch OAuth",
    blurb:
      "Full OAuth authentication with Stytch and personalized coffee shop search.",
    category: "Example",
    host: "ChatGPT · Claude",
    accent: "#9B7EFF",
    img: "/assets/showcase/stytch.webp",
    chat: {
      user: "Find me a quiet coffee shop near my office",
      assistant: "Sign in with Stytch…",
    },
    tags: ["Auth", "OAuth"],
    highlights: [
      "Stytch passwordless auth: magic links and OTPs inside the chat widget.",
      "Session tokens forwarded to tool calls for authenticated data fetching.",
      "Drop-in example for any Stytch project migrating to agent-native UX.",
    ],
    links: {
      github:
        "https://github.com/alpic-ai/skybridge/tree/main/examples/auth-stytch",
    },
  },
  {
    id: "auth-auth0",
    slug: "auth-auth0",
    name: "Auth — Auth0",
    tagline: "Auth0 OAuth",
    blurb:
      "Full OAuth authentication with Auth0 and personalized coffee shop search.",
    category: "Example",
    host: "ChatGPT · Claude",
    accent: "#E2FFC6",
    img: "/assets/showcase/auth0.webp",
    chat: {
      user: "Find me a quiet coffee shop near my office",
      assistant: "Sign in with Auth0…",
    },
    tags: ["Auth", "OAuth"],
    highlights: [
      "Auth0 Universal Login triggered from within the chat widget.",
      "Role-based access control applied to tool results post-authentication.",
      "Demonstrates Skybridge's provider-agnostic auth pattern with Auth0.",
    ],
    links: {
      github:
        "https://github.com/alpic-ai/skybridge/tree/main/examples/auth-auth0",
    },
  },
];
