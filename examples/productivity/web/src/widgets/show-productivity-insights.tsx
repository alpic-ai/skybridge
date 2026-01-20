import "@/index.css";

import { useEffect, useRef } from "react";
import {
  mountWidget,
  useDisplayMode,
  useLayout,
  useOpenExternal,
  useSendFollowUpMessage,
  useWidgetState,
} from "skybridge/web";
import { BarChart } from "../components/BarChart";
import { DonutChart } from "../components/DonutChart";
import { Legend } from "../components/Legend";
import { type Output, useCallTool, useToolInfo } from "../helpers";
import { useIntl } from "../i18n";

type WidgetState = { weekOffset: number } & Output;

function ShowProductivityInsights() {
  const { isSuccess, input, output, isPending } =
    useToolInfo<"show-productivity-insights">();

  const { callTool: navigate, isPending: isNavigating } = useCallTool(
    "show-productivity-insights",
  );

  const [widgetState, setWidgetState] = useWidgetState<WidgetState>(undefined);

  const [displayMode, setDisplayMode] = useDisplayMode();

  const { theme } = useLayout();

  const sendFollowUpMessage = useSendFollowUpMessage();
  const openExternal = useOpenExternal();
  const lastSyncedInputOffset = useRef<number | null>(null);

  const { t } = useIntl();

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
    const weekOffset = input?.weekOffset ?? 0;
    if (isSuccess && output && lastSyncedInputOffset.current !== weekOffset) {
      lastSyncedInputOffset.current = weekOffset;
      setWidgetState({ weekOffset, ...output });
    }
  }, [isSuccess, input, output, setWidgetState]);

  function goToWeek(newOffset: number) {
    navigate(
      { weekOffset: newOffset },
      {
        onSuccess: ({ structuredContent }) => {
          setWidgetState({ weekOffset: newOffset, ...structuredContent });
        },
      },
    );
  }

  if (isPending || !widgetState) {
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
          📊 {t("weeklyProductivity")}: {widgetState.totalHours}h
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
        <BarChart days={widgetState.days} />
        {displayMode === "fullscreen" && (
          <>
            <div className="separator" />
            <DonutChart
              activities={widgetState.activities}
              totalHours={widgetState.totalHours}
            />
          </>
        )}
        <Legend activities={widgetState.activities} />
      </div>
      <footer className="footer">
        <span className="footer-side">
          <button
            type="button"
            className="btn"
            onClick={() =>
              sendFollowUpMessage("Analyze my productivity trends")
            }
          >
            Insights
          </button>
        </span>
        <div className="nav">
          <button
            type="button"
            className="btn"
            onClick={() => goToWeek(widgetState.weekOffset - 1)}
            disabled={isNavigating}
          >
            ←
          </button>
          <span className="week-label">
            {getWeekLabel(widgetState.weekOffset)}
          </span>
          <button
            type="button"
            className="btn"
            onClick={() => goToWeek(widgetState.weekOffset + 1)}
            disabled={isNavigating || widgetState.weekOffset >= 0}
          >
            →
          </button>
        </div>
        <span className="footer-side footer-side-right">
          <button
            type="button"
            className="btn"
            onClick={() => openExternal("https://docs.skybridge.tech")}
          >
            Docs
          </button>
        </span>
      </footer>
    </div>
  );
}

export default ShowProductivityInsights;

mountWidget(<ShowProductivityInsights />);
