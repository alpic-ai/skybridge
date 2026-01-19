import "@/index.css";

import { useEffect, useState } from "react";
import { mountWidget } from "skybridge/web";
import { useCallTool, useToolInfo } from "../helpers";

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

type WidgetState = {
  weekOffset: number;
  totalHours: number;
};

function Productivity() {
  const toolInfo = useToolInfo<"productivity">();
  const { callTool: navigate, isPending: isNavigating } =
    useCallTool<"productivity">("productivity");

  const [state, setState] = useState<WidgetState | undefined>();

  const { isSuccess, input, output } = toolInfo;

  useEffect(() => {
    if (isSuccess && output) {
      setState({
        weekOffset: input.weekOffset,
        totalHours: output.totalHours,
      });
    }
  }, [isSuccess, input, output]);

  function goToWeek(newOffset: number) {
    navigate(
      { weekOffset: newOffset },
      {
        onSuccess: (result) => {
          setState({
            weekOffset: newOffset,
            totalHours: result.structuredContent.totalHours,
          });
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
      <footer className="footer">
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
      </footer>
    </div>
  );
}

export default Productivity;

mountWidget(<Productivity />);
