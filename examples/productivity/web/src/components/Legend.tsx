import type { Output } from "../helpers";
import { useIntl } from "../i18n";

export function Legend({ activities }: { activities: Output["activities"] }) {
  const { t } = useIntl();
  return (
    <div className="legend">
      {activities.map((a) => (
        <div key={a.type} className="legend-item">
          <span className={`legend-dot ${a.type}`} />
          {t(a.type)}: {a.hours}H
        </div>
      ))}
    </div>
  );
}
