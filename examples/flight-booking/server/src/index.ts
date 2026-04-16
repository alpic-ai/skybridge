import { McpServer } from "skybridge/server";
import { z } from "zod";
import { generateFlights } from "./flights.js";
import { IATA_AIRPORTS } from "./iata-codes.js";

const AIRPORT_CODE = z
  .string()
  .transform((v) => v.toUpperCase())
  .refine((v) => IATA_AIRPORTS.has(v), { message: "Invalid IATA airport code" })
  .describe("3-letter IATA airport code (e.g. CDG, JFK, NRT)");

const server = new McpServer(
  {
    name: "flight-booking-app",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerWidget(
  "flight-booking",
  {
    description: "Flight Booking Carousel",
    _meta: {
      ui: {
        csp: {
          redirectDomains: ["https://docs.skybridge.tech"],
        },
      },
    },
  },
  {
    description:
      "Search and display available flights between two airports with pricing and schedule details.",
    inputSchema: {
      origin: AIRPORT_CODE,
      destination: AIRPORT_CODE,
      departureDate: z
        .string()
        .describe("Departure date in YYYY-MM-DD format (e.g. 2026-08-16)"),
      returnDate: z
        .string()
        .describe("Return date in YYYY-MM-DD format (e.g. 2026-08-29)"),
      maxPrice: z.number().optional().describe("Maximum price per adult in EUR"),
      directOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe("Only show direct flights (no layovers)"),
    },
  },
  ({ origin, destination, departureDate, returnDate, maxPrice, directOnly }) => {
    try {
      let flights = generateFlights(
        origin,
        destination,
        departureDate,
        returnDate,
        directOnly ?? false,
      );

      if (maxPrice !== undefined) {
        flights = flights.filter((f) => f.price <= maxPrice);
      }

      const result = {
        origin,
        originCity: IATA_AIRPORTS.get(origin) ?? origin,
        destination,
        destinationCity: IATA_AIRPORTS.get(destination) ?? destination,
        departureDate,
        returnDate,
        flights,
      };

      return {
        structuredContent: result,
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
        isError: false,
      };
    } catch (error) {
      return {
        content: [{ type: "text" as const, text: `Error: ${error}` }],
        isError: true,
      };
    }
  },
);

server.run();

export type AppType = typeof server;
