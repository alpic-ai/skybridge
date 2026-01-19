import type { Output } from "../helpers";

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
  let offset = 0;

  return (
    <svg className="donut" viewBox="0 0 100 100">
      <title>Weekly activity breakdown</title>
      {activities.map((a) => {
        const length = (a.hours / totalHours) * CIRCUMFERENCE;
        const currentOffset = offset;
        offset += length;
        return (
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
          />
        );
      })}
    </svg>
  );
}
