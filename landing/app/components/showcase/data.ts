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

export type ShowcaseApp = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  blurb: string;
  category: ShowcaseCategory;
  host: string;
  accent: string;
  img?: string;
  screenshots?: string[];
  noWidget?: boolean;
  chat: ShowcaseChat;
  tags: string[];
  toolResult?: ShowcaseToolResult;
  links: ShowcaseLinks;
};

export const SHOWCASE: ShowcaseApp[] = [
  {
    id: "awaze",
    slug: "awaze",
    name: "Cottages.com",
    tagline: "Cottage search & booking",
    blurb:
      "Holiday cottage search and booking experience — browse properties, filter by location, and explore availability.",
    category: "3rd Party",
    host: "ChatGPT",
    accent: "#1f5d3a",
    img: "/assets/showcase/awaze.webp",
    chat: {
      user: "Find me a cottage in Cornwall for next April, sleeps 4, pets welcome",
      assistant: "I'll search Cottages.com.",
    },
    tags: ["Travel", "Booking"],
    links: {
      demo: "https://mcp.cottages.com/try",
      chatgpt:
        "https://chatgpt.com/apps/cottages/asdk_app_6945254ad31c81919d07ba1c357a1a57",
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
    accent: "#FFB86B",
    img: "/assets/showcase/evaneos.webp",
    chat: {
      user: "I want to travel somewhere sustainable in October, off the beaten path",
      assistant: "Let me ask Evaneos's local experts.",
    },
    tags: ["Travel", "Itinerary"],
    links: {
      chatgpt:
        "https://chatgpt.com/apps/evaneos/asdk_app_69612510d5288191b6a4174252337e93",
    },
  },
  {
    id: "recommerce",
    slug: "recommerce",
    name: "Recommerce",
    tagline: "Refurbished device shopping",
    blurb:
      "Conversational shopping across 7,000+ refurbished devices. Describe what you need and the agent surfaces matching offers from the Recommerce catalog and guides you to checkout.",
    category: "3rd Party",
    host: "ChatGPT",
    accent: "#1FAE6E",
    img: "/assets/showcase/ecommerce.webp",
    chat: {
      user: "I want a refurbished iPhone under €400, good battery health",
      assistant: "Let me check the Recommerce catalog.",
    },
    tags: ["Commerce", "Circular"],
    links: {
      chatgpt:
        "https://chatgpt.com/apps/recommerce/asdk_app_6943b26226c4819189e6b19249055265",
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
    img: "/assets/showcase/ecommerce.webp",
    chat: {
      user: "How much can I get for my iPhone 13, 128GB, screen has a small scratch?",
      assistant: "Let me get you a quote from Recommerce.",
    },
    tags: ["Trade-in", "Circular"],
    links: {
      chatgpt:
        "https://chatgpt.com/apps/recommerce-trade-in/asdk_app_69c5423d7e408191bec964b57cce719e",
    },
  },
  {
    id: "kiwi",
    slug: "kiwi",
    name: "Kiwi.com",
    tagline: "Flight search, agent-native",
    blurb:
      "The official Kiwi.com MCP server. Search across global flight inventory in natural language and get a direct booking link back — no widget, just a single search-flight tool exposed to the model.",
    category: "3rd Party",
    host: "Claude",
    accent: "#E8503F",
    noWidget: true,
    chat: {
      user: "Find me a round-trip from Vienna to Barcelona, August 3 to 10, two adults",
      assistant: "Searching Kiwi.com for the best options.",
    },
    tags: ["Travel", "Flights"],
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
    id: "generative-ui",
    slug: "generative-ui",
    name: "Generative UI",
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
    links: {
      demo: "https://generative-ui.skybridge.tech/try",
      github:
        "https://github.com/alpic-ai/skybridge/tree/main/examples/generative-ui",
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
      "Classic fortune-telling toy — ask a yes-or-no question, shake the ball, and get a mystical answer. The default Skybridge starter app.",
    category: "Example",
    host: "ChatGPT · Claude",
    accent: "#89F0EC",
    img: "/assets/showcase/magic-8-ball.webp",
    chat: {
      user: "Will I ship this on time?",
      assistant: "Let me consult the 8-ball…",
    },
    tags: ["Starter", "Toy"],
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
    links: {
      github:
        "https://github.com/alpic-ai/skybridge/tree/main/examples/auth-auth0",
    },
  },
];

export function hostAccent(_host: string): string {
  return "#89F0EC";
}
