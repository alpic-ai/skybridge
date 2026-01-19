import "@/index.css";

import { useEffect } from "react";
import {
  mountWidget,
  useDisplayMode,
  useLayout,
  useSendFollowUpMessage,
  useUser,
  useWidgetState,
} from "skybridge/web";
import { BarChart } from "../components/BarChart";
import { DonutChart } from "../components/DonutChart";
import { Legend } from "../components/Legend";
import { type Output, useCallTool, useToolInfo } from "../helpers";
import { translate } from "../i18n";

type WidgetState = { weekOffset: number } & Output;

function Productivity() {
  const { isSuccess, input, output, isPending } = useToolInfo<"productivity">();

  const { callTool: navigate, isPending: isNavigating } =
    useCallTool<"productivity">("productivity");

  const [state, setState] = useWidgetState<WidgetState>(undefined);

  const [displayMode, setDisplayMode] = useDisplayMode();

  const { theme } = useLayout();
  const { locale } = useUser();
  const sendFollowUpMessage = useSendFollowUpMessage();

  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  function getWeekLabel(offset: number): string {
    switch (offset) {
      case 0:
        return t("thisWeek");
      case -1:
        return t("lastWeek");
      default:
        return `${Math.abs(offset)} ${t("weeksAgo")}`;
    }
  }

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
    return <div className="container">{t("loading")}</div>;
  }

  return (
    <div
      className={`container ${theme}`}
      data-llm={
        displayMode === "fullscreen"
          ? "User is viewing the full dashboard: bar chart showing daily hours breakdown by activity and donut chart showing weekly distribution"
          : "User is viewing the compact dashboard: bar chart showing daily hours breakdown by activity (meetings, work, learning)"
      }
    >
      <header className="header">
        <span>
          📊 {t("weeklyProductivity")}: {state.totalHours}h
        </span>

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
        <Legend activities={state.activities} locale={locale} />
      </div>
      <footer className="footer">
        <span className="footer-side">
          <button
            type="button"
            className="btn"
            onClick={() => sendFollowUpMessage("Analyze my productivity trends")}
          >
            Insights
          </button>
        </span>
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
        <span className="footer-side" />
      </footer>
    </div>
  );
}

export default Productivity;

mountWidget(<Productivity />);
