import "@/index.css";

import { useState } from "react";
import { useLayout } from "skybridge/web";
import Nav from "./components/nav.js";
import Progress from "./components/progress.js";
import Outro from "./components/steps/outro.js";
import State from "./components/steps/state.js";
import ToolCall from "./components/steps/tool-call.js";
import ToolOutput from "./components/steps/tool-output.js";
import { useMascot } from "./use-mascot.js";

const STEPS = [
  { label: "Reading tool output", Component: ToolOutput },
  { label: "Sharing view state", Component: State },
  { label: "Calling tools", Component: ToolCall },
  { label: "Examples & docs", Component: Outro },
] as const;

export default function Onboarding() {
  // useLayout: read host layout info (theme, display mode, locale, ...).
  const { theme } = useLayout();

  const [step, setStep] = useState(0);
  const { img } = useMascot();

  return (
    <div
      className={`${theme === "dark" ? "dark" : ""} mx-auto w-full max-w-4xl border border-border overflow-hidden bg-background text-foreground`}
    >
      <div className="min-h-136 md:min-h-95 flex flex-col items-center gap-6 p-6 bg-linear-to-br from-purple-50 via-white to-cyan-50 dark:from-purple-950/30 dark:via-zinc-950 dark:to-cyan-900/30 bg-size-[200%_200%] animate-aurora md:flex-row md:items-stretch">
        <div className="shrink-0 self-center animate-float">
          <img
            src={img}
            alt="Skybridge mascot"
            className="h-32 w-32 md:h-50 md:w-50 object-contain animate-twirl"
          />
        </div>
        <div className="flex w-full flex-1 flex-col gap-6">
          <Progress
            steps={STEPS.map(({ label }) => label)}
            current={step}
            onSelect={setStep}
          />
          <div className="grid flex-1">
            {STEPS.map(({ label, Component }, i) => (
              <div
                key={label}
                className={`col-start-1 row-start-1 flex flex-col gap-6 ${
                  step === i ? "" : "invisible pointer-events-none"
                }`}
                aria-hidden={step !== i}
              >
                <Component />
              </div>
            ))}
          </div>
          <Nav current={step} total={STEPS.length} onChange={setStep} />
        </div>
      </div>
    </div>
  );
}
