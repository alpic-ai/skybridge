import type { Output } from "../helpers";

export function Legend({ activities }: { activities: Output["activities"] }) {
  return (
    <div className="legend">
      {activities.map((a) => (
        <div key={a.type} className="legend-item">
          <span className={`legend-dot ${a.type}`} />
          {a.type}: {a.hours}H
        </div>
      ))}
    </div>
  );
}
