import type { Day } from "../helpers";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function Chart({ days }: { days: Day[] }) {
  let maxHours = 0;
  for (const day of days) {
    if (day.hours > maxHours) {
      maxHours = day.hours;
    }
  }

  return (
    <div className="chart">
      {days.map((day) => (
        <div key={day.index} className="bar-container">
          <div className="bar">
            {day.activities.map((a) => (
              <div
                key={a.type}
                className={`bar-segment ${a.type}`}
                style={{ height: `${(a.hours / maxHours) * 100}%` }}
              />
            ))}
          </div>
          <span className="day-label">{DAY_LABELS[day.index]}</span>
          <div className="tooltip">
            {day.activities.map((a) => (
              <div key={a.type}>
                {a.type}: {a.hours}h
              </div>
            ))}
            <div className="tooltip-total">total: {day.hours}h</div>
          </div>
        </div>
      ))}
    </div>
  );
}
