import type { Output } from "../helpers";
import { translate } from "../i18n";

export function Legend({
  activities,
  locale,
}: {
  activities: Output["activities"];
  locale: string;
}) {
  return (
    <div className="legend">
      {activities.map((a) => (
        <div key={a.type} className="legend-item">
          <span className={`legend-dot ${a.type}`} />
          {translate(locale, a.type)}: {a.hours}H
        </div>
      ))}
    </div>
  );
}
