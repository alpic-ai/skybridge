import { McpServer } from "skybridge/server";
import { z } from "zod";

const baseEvents = [
  {
    title: "NEON Vol. 9",
    category: "Music",
    venue: "Echoplex",
    neighborhood: "Echo Park",
    priceRange: "$45 - $150",
    vibeTags: ["High energy", "Late night", "Dressy"],
    eventSignal: "going-fast",
    organizerRating: 4.8,
    reviewCount: 12453,
    ageRestriction: "21+",
  },
  {
    title: "The Midnight Show",
    category: "Comedy",
    venue: "The Comedy Underground",
    neighborhood: "Santa Monica",
    priceRange: "$15 - $35",
    vibeTags: ["Social", "Late night"],
    eventSignal: "popular",
    organizerRating: 4.7,
    reviewCount: 3241,
  },
  {
    title: "Salsa Sundays",
    category: "Classes",
    venue: "Echo Park Lake",
    neighborhood: "Echo Park",
    priceRange: "Free",
    vibeTags: ["High energy", "Social"],
    eventSignal: "just-added",
    organizerRating: 4.9,
    reviewCount: 8764,
  },
  {
    title: "Lakers vs Celtics",
    category: "Sports",
    venue: "Crypto.com Arena",
    neighborhood: "Downtown",
    priceRange: "$125 - $850",
    vibeTags: ["High energy", "Social", "Premium"],
    eventSignal: "sales-end-soon",
    organizerRating: 4.5,
    reviewCount: 2341,
  },
  {
    title: "Smorgasburg: Sunday Market",
    category: "Food & Drink",
    venue: "ROW DTLA",
    neighborhood: "Arts District",
    priceRange: "Free",
    vibeTags: ["Family-friendly", "Outdoor", "Social"],
    organizerRating: 4.8,
    reviewCount: 5632,
  },
  {
    title: "LACMA After Hours",
    category: "Arts",
    venue: "LACMA",
    neighborhood: "Miracle Mile",
    priceRange: "$35 - $75",
    vibeTags: ["Chill", "Date night", "Sophisticated"],
    organizerRating: 4.7,
    reviewCount: 1234,
    ageRestriction: "21+",
  },
  {
    title: "Blue Note Under Stars",
    category: "Music",
    venue: "Hollywood Bowl",
    neighborhood: "Hollywood Hills",
    priceRange: "$45 - $200",
    vibeTags: ["Chill", "Date night", "Outdoor"],
    organizerRating: 4.8,
    reviewCount: 12453,
  },
  {
    title: "Rooftop Cinema: Blade Runner",
    category: "Film",
    venue: "Rooftop Cinema Club",
    neighborhood: "DTLA",
    priceRange: "$25 - $45",
    vibeTags: ["Date night", "Views", "Chill"],
    organizerRating: 4.8,
    reviewCount: 892,
  },
];

const eventImages = [
  "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800",
  "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800",
  "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800",
  "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
  "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800",
  "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800",
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800",
];

const server = new McpServer(
  {
    name: "event-tickets",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerWidget(
  "browse-events",
  {
    description: "Browse available events and buy tickets",
    _meta: {
      ui: {
        csp: {
          resourceDomains: ["https://images.unsplash.com"],
        },
      },
    },
  },
  {
    description:
      "Browse available events for a specific date and location. Always returns a list of upcoming events with details and ticket prices.",
    inputSchema: {
      date: z
        .string()
        .describe(
          "The date to search events for (e.g. 'tonight', 'this weekend', 'March 15').",
        ),
      location: z
        .string()
        .describe(
          "The city or area to search events in (e.g. 'Los Angeles', 'Paris', 'New York').",
        ),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: false,
      destructiveHint: false,
    },
  },
  async ({ date, location }) => {
    const events = baseEvents.map((event) => ({
      ...event,
      city: location,
      dateTime: `${date} · ${event.venue}, ${location}`,
    }));

    return {
      structuredContent: {
        date,
        location,
        eventCount: events.length,
        eventTitles: events.map((e) => e.title),
      },
      content: [
        {
          type: "text",
          text: `Found ${events.length} upcoming events in ${location} for ${date}. The user can browse the carousel and click on any event to learn more.`,
        },
      ],
      _meta: { events, eventImages },
      isError: false,
    };
  },
);

server.run();

export type AppType = typeof server;
