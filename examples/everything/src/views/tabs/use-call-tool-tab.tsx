import { useState } from "react";
import { useCallTool } from "../../helpers.js";

type Guess = "heads" | "tails";

export function UseCallToolTab() {
  const [guess, setGuess] = useState<Guess | null>(null);
  const { data, isPending, callTool } = useCallTool("flip-coin");

  return (
    <div className="tab-content">
      <p className="description">
        Trigger server-side tools directly from your widget. Make sure the tool
        _meta<> </>
        <code>openai/widgetAccessible</code> property is set to true.
      </p>

      <div className="coin-box">
        <p className="coin-title">Choose Heads or Tails?</p>
        <div className="coin-controls">
          <div className="segmented">
            {(["heads", "tails"] as Guess[]).map((side) => (
              <button
                key={side}
                type="button"
                className={`segmented-btn${guess === side ? " segmented-btn--active" : ""}`}
                disabled={isPending}
                onClick={() => setGuess(side)}
              >
                {side.charAt(0).toUpperCase() + side.slice(1)}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn"
            disabled={isPending || guess === null}
            onClick={() => {
              if (guess) callTool({ guess });
            }}
          >
            {isPending ? "Flipping..." : "Flip"}
          </button>
        </div>
      </div>

      {data && (
        <div className="field">
          {(() => {
            const structuredContent = data.structuredContent;
            if (!structuredContent) return null;
            const won = structuredContent.won === true;
            return (
              <p className={`coin-result ${won ? "coin-result--won" : "coin-result--lost"}`}>
                {won ? "You Won!" : "You Lost!"}
              </p>
            );
          })()}
          <span className="field-label">response</span>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
