import { useState } from "react";
import type { Activity, Output } from "../helpers.js";

const COLORS: Record<string, string> = {
  meetings: "var(--color-primary)",
  work: "var(--color-secondary)",
  learning: "var(--color-tertiary)",
};

const CIRCUMFERENCE = 2 * Math.PI * 40;

export function DonutChart({
  activities,
  totalHours,
}: {
  activities: Output["activities"];
  totalHours: number;
}) {
  const [hovered, setHovered] = useState<Activity | null>(null);
  let offset = 0;

  return (
    <div className="donut-container">
      <svg className="donut" viewBox="0 0 100 100">
        <title>Weekly activity breakdown</title>
        {activities.map((a) => {
          const length = (a.hours / totalHours) * CIRCUMFERENCE;
          const currentOffset = offset;
          offset += length;
          return (
            // biome-ignore lint/a11y/noStaticElementInteractions: display tooltip
            <circle
              key={a.type}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={COLORS[a.type]}
              strokeWidth="20"
              strokeDasharray={`${length} ${CIRCUMFERENCE}`}
              strokeDashoffset={-currentOffset}
              onMouseEnter={() => setHovered(a)}
              onMouseLeave={() => setHovered(null)}
            />
          );
        })}
      </svg>
      {hovered && (
        <div className="tooltip">
          {hovered.type}: {Math.round((hovered.hours / totalHours) * 100)}%
        </div>
      )}
    </div>
  );
}
