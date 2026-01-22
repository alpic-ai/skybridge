import { useToolInfo } from "../../helpers";

export function ToolInfoTab() {
  const { input, output, responseMetadata, isPending } =
    useToolInfo<"show-everything">();

  if (isPending) {
    return <div className="tab-content">Awaiting for tool response...</div>;
  }

  return (
    <div className="tab-content">
      <p className="description">
        When ChatGPT calls your MCP tool, the response flows here. The output is
        shared with the LLM for context, while meta stays private to your
        widget.
      </p>
      <div className="field">
        <span className="field-label">input</span>
        <code>{input?.name}</code>
      </div>
      <div className="field">
        <span className="field-label">output</span>
        <code>{output?.greeting}</code>
      </div>
      <div className="field">
        <span className="field-label">meta</span>
        <code>{responseMetadata?.secret}</code>
      </div>
    </div>
  );
}
