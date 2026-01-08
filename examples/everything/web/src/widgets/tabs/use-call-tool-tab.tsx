import { useState } from "react";
import { useCallTool } from "../../helpers";

export function UseCallToolTab() {
  const [name, setName] = useState("");
  const { data, isPending, callTool } = useCallTool("widget");

  return (
    <div className="tab-content">
      <p className="description">
        Trigger server-side tools directly from your widget. Make sure the tool
        _meta<> </>
        <code>openai/widgetAccessible</code> property is set to true.
      </p>

      <div className="button-row">
        <input
          type="text"
          className="input"
          value={name}
          placeholder="Enter a name"
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          className="btn"
          onClick={() => callTool({ name })}
          disabled={isPending || name.length === 0}
        >
          {isPending ? "Calling..." : "Call"}
        </button>
      </div>

      {data && (
        <div className="field">
          <span className="field-label">response</span>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
