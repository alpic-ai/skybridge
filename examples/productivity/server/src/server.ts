import { createHash } from "node:crypto";
import { McpServer } from "skybridge/server";
import { z } from "zod";

const ActivityTypes = ["meetings", "work", "learning"] as const;
type ActivityType = (typeof ActivityTypes)[number];
type Activity = { type: ActivityType; hours: number };
type Day = { index: number; activities: Activity[]; hours: number };
type Week = { days: Day[]; activities: Activity[]; totalHours: number };

// Deterministic random hours (1-4) using hash
function randomHours(seed: number, day: number, type: string): number {
  const hash = createHash("md5").update(`${seed}-${day}-${type}`).digest();
  return (hash[0] % 4) + 1;
}

function getWeek(weekOffset: number): Week {
  const seed = Math.abs(weekOffset) + 1;
  const totals: Record<ActivityType, number> = {
    meetings: 0,
    work: 0,
    learning: 0,
  };

  const days: Day[] = [];
  let totalHours = 0;

  for (let day = 0; day < 7; day++) {
    const activities: Activity[] = [];
    let dayHours = 0;
    for (const type of ActivityTypes) {
      const hours = randomHours(seed, day, type);
      activities.push({ type, hours });
      dayHours += hours;
      totals[type] += hours;
    }
    totalHours += dayHours;
    days.push({ index: day, activities, hours: dayHours });
  }

  return {
    days,
    activities: ActivityTypes.map((type) => ({ type, hours: totals[type] })),
    totalHours,
  };
}

const server = new McpServer(
  {
    name: "productivity",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerWidget(
  "productivity",
  {
    description: "Weekly Productivity Chart",
  },
  {
    description: "Display user's weekly productivity chart",
    inputSchema: {
      weekOffset: z
        .number()
        .max(0)
        .optional()
        .default(0)
        .describe(
          "Week offset from current week (0 = this week, -1 = last week)",
        ),
    },
    _meta: {
      "openai/widgetAccessible": true,
    },
  },
  async ({ weekOffset }) => {
    const structuredContent = getWeek(weekOffset);
    return {
      structuredContent,
      content: [
        {
          type: "text",
          text: JSON.stringify(structuredContent),
        },
      ],
      isError: false,
    };
  },
);

export default server;
export type AppType = typeof server;
