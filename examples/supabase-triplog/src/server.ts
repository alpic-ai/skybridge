import { McpServer } from "skybridge/server";
import { z } from "zod";
import {
  CATEGORIES,
  type Category,
  DEFAULT_COVER,
  STATUSES,
  type Status,
} from "./constants.js";
import { supabase } from "./supabase.js";

interface Trip {
  id: number;
  created_at: string;
  date: string;
  place: string;
  country: string;
  description: string | null;
  category: Category;
  status: Status;
  expenses: number;
  cover_url: string;
}

function errorResult(context: string, error: unknown) {
  const message =
    error instanceof Error ? error.message : JSON.stringify(error);
  return {
    content: [{ type: "text" as const, text: `${context}: ${message}` }],
    isError: true,
  };
}

const server = new McpServer(
  {
    name: "triplog-app",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerTool(
  {
    name: "browse-trips",
    description:
      'Browse the personal trip log. Always call this tool EXACTLY ONCE — it loads all trips and the UI handles all filtering. Never call it multiple times for different statuses or categories. Pass status and/or category arrays to pre-select the relevant filters in the UI (e.g. status=["completed"] category=["solo","family"] for completed solo or family trips).',
    inputSchema: {
      status: z
        .array(z.enum(STATUSES))
        .optional()
        .describe("Pre-select one or more status filters in the UI"),
      category: z
        .array(z.enum(CATEGORIES))
        .optional()
        .describe("Pre-select one or more category filters in the UI"),
      focusPlace: z
        .string()
        .optional()
        .describe(
          "Focus the widget on a specific trip by place name (e.g. 'Agra'). Use this when the user asks to view or show a particular trip.",
        ),
    },
    view: {
      component: "browse-trips",
      description: "Trip Log",
      csp: {
        resourceDomains: [
          "https://*.supabase.co",
          "https://*.supabase.in",
          "https://fonts.googleapis.com",
          "https://fonts.gstatic.com",
        ],
      },
    },
  },
  async () => {
    try {
      const { data, error } = await supabase
        .from("triplog")
        .select("*")
        .order("date", { ascending: false });

      if (error) {
        throw error;
      }

      return {
        structuredContent: { trips: (data ?? []) as Trip[] },
        content: [{ type: "text", text: JSON.stringify(data ?? []) }],
        isError: false,
      };
    } catch (error) {
      return errorResult("Error fetching trips", error);
    }
  },
);

server.registerTool(
  {
    name: "create_trip",
    description:
      "Add a new trip to the personal trip log. Use this when the user wants to log a trip. Infer country from place if not explicitly provided. Date defaults to today if not mentioned.",
    inputSchema: {
      place: z.string().min(1).describe("City or location name (required)"),
      category: z.enum(CATEGORIES).describe("Trip category (required)"),
      status: z.enum(STATUSES).describe("Trip status (required)"),
      country: z
        .string()
        .optional()
        .describe("Country name — infer from place if not provided"),
      description: z.string().optional().describe("Notes about the trip"),
      expenses: z
        .number()
        .min(0)
        .optional()
        .describe("Total amount spent (non-negative)"),
      cover_url: z.string().url().optional().describe("Public cover image URL"),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
        .optional()
        .describe("Trip date in YYYY-MM-DD format, defaults to today"),
    },
  },
  async (input) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase.from("triplog").insert({
        place: input.place,
        category: input.category,
        status: input.status,
        country: input.country ?? "",
        description: input.description ?? null,
        expenses: input.expenses ?? 0,
        cover_url: input.cover_url ?? DEFAULT_COVER,
        date: input.date ?? today,
      });

      if (error) {
        throw error;
      }

      return {
        content: [
          {
            type: "text",
            text: `Trip to ${input.place} added successfully.`,
          },
        ],
        isError: false,
      };
    } catch (error) {
      return errorResult("Error creating trip", error);
    }
  },
);

server.registerTool(
  {
    name: "update_trip",
    description:
      "Update one or more fields of an existing trip. Requires the trip ID — get it from a prior browse-trips call. Only pass the fields the user wants to change; everything else stays untouched.",
    inputSchema: {
      id: z.number().describe("ID of the trip to update (required)"),
      place: z.string().min(1).optional().describe("New place name"),
      country: z.string().optional().describe("New country name"),
      category: z.enum(CATEGORIES).optional().describe("New category"),
      status: z.enum(STATUSES).optional().describe("New status"),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
        .optional()
        .describe("New date in YYYY-MM-DD format"),
      description: z.string().optional().describe("New notes"),
      expenses: z.number().min(0).optional().describe("New total amount spent"),
      cover_url: z.string().url().optional().describe("New cover image URL"),
    },
  },
  async (input) => {
    try {
      const { id, ...rest } = input;
      const updates = Object.fromEntries(
        Object.entries(rest).filter(([, value]) => value !== undefined),
      );

      if (Object.keys(updates).length === 0) {
        return {
          content: [
            { type: "text", text: "Nothing to update — no fields provided." },
          ],
          isError: false,
        };
      }

      const { data, error } = await supabase
        .from("triplog")
        .update(updates)
        .eq("id", id)
        .select("id");

      if (error) {
        throw error;
      }
      if (!data || data.length === 0) {
        return {
          content: [{ type: "text", text: `No trip found with ID ${id}.` }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text", text: `Trip ${id} updated successfully.` }],
        isError: false,
      };
    } catch (error) {
      return errorResult("Error updating trip", error);
    }
  },
);

server.registerTool(
  {
    name: "delete_trip",
    description:
      "Delete a trip from the log by its ID. Get the ID from a prior browse-trips call.",
    inputSchema: {
      id: z.number().describe("ID of the trip to delete (required)"),
    },
  },
  async (input) => {
    try {
      const { data, error } = await supabase
        .from("triplog")
        .delete()
        .eq("id", input.id)
        .select("id");

      if (error) {
        throw error;
      }
      if (!data || data.length === 0) {
        return {
          content: [
            { type: "text", text: `No trip found with ID ${input.id}.` },
          ],
          isError: true,
        };
      }

      return {
        content: [
          { type: "text", text: `Trip ${input.id} deleted successfully.` },
        ],
        isError: false,
      };
    } catch (error) {
      return errorResult("Error deleting trip", error);
    }
  },
);

server.run();

export type AppType = typeof server;
