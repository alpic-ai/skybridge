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

function getWeeks(weekOffset: number, duration: number): Week {
  if (duration === 1) return getWeek(weekOffset);

  const weeks = Array.from({ length: duration }, (_, i) =>
    getWeek(weekOffset - i),
  );

  const days: Day[] = Array.from({ length: 7 }, (_, dayIndex) => {
    const activities: Activity[] = ActivityTypes.map((type) => {
      const total = weeks.reduce(
        (sum, week) =>
          sum +
          (week.days[dayIndex].activities.find((a) => a.type === type)
            ?.hours ?? 0),
        0,
      );
      return { type, hours: Math.round(total / duration) };
    });
    const hours = activities.reduce((sum, a) => sum + a.hours, 0);
    return { index: dayIndex, activities, hours };
  });

  const totalHours = days.reduce((sum, d) => sum + d.hours, 0);
  const activities: Activity[] = ActivityTypes.map((type) => ({
    type,
    hours: days.reduce(
      (sum, d) =>
        sum + (d.activities.find((a) => a.type === type)?.hours ?? 0),
      0,
    ),
  }));

  return { days, activities, totalHours };
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
    name: "productivity-charts-example-server",
    version: "0.0.1",
  },
  { capabilities: {} },
).registerWidget(
  "show-productivity-insights",
  {
    description: "Weekly Productivity Chart",
  },
  {
    description: "Display user's weekly productivity charts",
    inputSchema: {
      weekOffset: z
        .number()
        .max(0)
        .optional()
        .default(0)
        .describe(
          "Week offset from current week (0 = this week, -1 = last week)",
        ),
      duration: z
        .number()
        .min(1)
        .max(4)
        .optional()
        .default(1)
        .describe(
          "Number of weeks to aggregate (1 = one week, 2 = two weeks, 4 = four weeks)",
        ),
    },
    _meta: {
      "openai/widgetAccessible": true,
    },
  },
  async ({ weekOffset, duration }) => {
    const structuredContent = getWeeks(weekOffset, duration);
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

server.run();

export type AppType = typeof server;
