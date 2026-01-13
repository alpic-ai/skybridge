import { useWidgetState } from "skybridge/web";

export function UseWidgetStateTab() {
  const [state, setState] = useWidgetState({ count: 0 });

  return (
    <div className="tab-content">
      <p className="description">
        Persist state across widget lifecycle events.
      </p>

      <div className="field">
        <span className="field-label">Count</span>
        <code>{state.count ?? 0}</code>
      </div>

      <div className="button-row">
        <button
          type="button"
          className="btn"
          onClick={() => setState((prev) => ({ count: prev.count + 1 }))}
        >
          Increment
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setState({ count: 0 })}
          disabled={state.count === 0}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
