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

      <form
        className="button-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            callTool({ name });
            setName("");
          }
        }}
      >
        <input
          type="text"
          className="input"
          value={name}
          placeholder="Enter a name"
          disabled={isPending}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          className="btn"
          disabled={isPending || name.length === 0}
        >
          {isPending ? "Calling..." : "Call"}
        </button>
      </form>

      {data && (
        <div className="field">
          <span className="field-label">response</span>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
