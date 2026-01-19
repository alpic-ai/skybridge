import "@/index.css";

import { useEffect, useState } from "react";
import { mountWidget } from "skybridge/web";
import { Chart } from "../components/Chart";
import { type Output, useCallTool, useToolInfo } from "../helpers";

function getWeekLabel(offset: number): string {
  switch (offset) {
    case 0:
      return "This week";
    case -1:
      return "Last week";
    default:
      return `${Math.abs(offset)} weeks ago`;
  }
}

type WidgetState = { weekOffset: number } & Output;

function Productivity() {
  const toolInfo = useToolInfo<"productivity">();
  const { callTool: navigate, isPending: isNavigating } =
    useCallTool<"productivity">("productivity");

  const [state, setState] = useState<WidgetState | undefined>();

  const { isSuccess, input, output } = toolInfo;

  useEffect(() => {
    if (isSuccess && output) {
      setState({ weekOffset: input.weekOffset, ...output });
    }
  }, [isSuccess, input, output]);

  function goToWeek(newOffset: number) {
    navigate(
      { weekOffset: newOffset },
      {
        onSuccess: ({ structuredContent }) => {
          setState({ weekOffset: newOffset, ...structuredContent });
        },
      },
    );
  }

  if (toolInfo.isPending || !state) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <header className="header">
        <span className="title">📊 weekly productivity</span>
        <span className="total">total: {state.totalHours} hours</span>
      </header>
      <Chart days={state.days} />
      <footer className="footer">
        <div className="legend">
          {state.activities.map((a) => (
            <div key={a.type} className="legend-item">
              <span className={`legend-dot ${a.type}`} />
              <span>{a.type}</span>
            </div>
          ))}
        </div>
        <div className="nav">
          <button
            type="button"
            className="nav-btn"
            onClick={() => goToWeek(state.weekOffset - 1)}
            disabled={isNavigating}
          >
            prev
          </button>
          <span className="week-label">{getWeekLabel(state.weekOffset)}</span>
          <button
            type="button"
            className="nav-btn"
            onClick={() => goToWeek(state.weekOffset + 1)}
            disabled={isNavigating || state.weekOffset >= 0}
          >
            next
          </button>
        </div>
      </footer>
    </div>
  );
}

export default Productivity;

mountWidget(<Productivity />);
