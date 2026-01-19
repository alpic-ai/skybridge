import "@/index.css";

import { useEffect } from "react";
import { mountWidget, useDisplayMode, useWidgetState } from "skybridge/web";
import { BarChart } from "../components/BarChart";
import { DonutChart } from "../components/DonutChart";
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
  const { isSuccess, input, output, isPending } = useToolInfo<"productivity">();

  const { callTool: navigate, isPending: isNavigating } =
    useCallTool<"productivity">("productivity");

  const [state, setState] = useWidgetState<WidgetState>(undefined);

  const [displayMode, setDisplayMode] = useDisplayMode();

  useEffect(() => {
    if (isSuccess && output) {
      setState({ weekOffset: input.weekOffset, ...output });
    }
  }, [isSuccess, input, output, setState]);

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

  if (isPending || !state) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <header className="header">
        <span>📊 weekly productivity: {state.totalHours} hours</span>

        <button
          type="button"
          className="btn"
          onClick={() =>
            setDisplayMode(
              displayMode === "fullscreen" ? "inline" : "fullscreen",
            )
          }
        >
          {displayMode === "fullscreen" ? "↙" : "↗"}
        </button>
      </header>
      <div className="charts">
        <BarChart days={state.days} />
        {displayMode === "fullscreen" && (
          <>
            <div className="separator" />
            <DonutChart
              activities={state.activities}
              totalHours={state.totalHours}
            />
          </>
        )}
        <div className="donut-recap">
          {state.activities.map((a) => (
            <div key={a.type} className="donut-recap-item">
              <span className={`legend-dot ${a.type}`} />
              {a.type}: {a.hours}H
            </div>
          ))}
        </div>
      </div>
      <footer className="footer">
        <div className="nav">
          <button
            type="button"
            className="btn"
            onClick={() => goToWeek(state.weekOffset - 1)}
            disabled={isNavigating}
          >
            ←
          </button>
          <span className="week-label">{getWeekLabel(state.weekOffset)}</span>
          <button
            type="button"
            className="btn"
            onClick={() => goToWeek(state.weekOffset + 1)}
            disabled={isNavigating || state.weekOffset >= 0}
          >
            →
          </button>
        </div>
      </footer>
    </div>
  );
}

export default Productivity;

mountWidget(<Productivity />);
