import { Spinner } from "@alpic-ai/ui/components/spinner";
import { useToolInfo } from "../../helpers.js";
import { Code, Description, Field, TabBody } from "../components/ui.js";

export function ToolInfoTab() {
  const { input, output, responseMetadata, isPending } =
    useToolInfo<"show-everything">();

  if (isPending) {
    return (
      <TabBody>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner size="sm" />
          <span className="type-text-sm">Awaiting tool response…</span>
        </div>
      </TabBody>
    );
  }

  return (
    <TabBody>
      <Description>
        When ChatGPT calls your MCP tool, the response flows here. The output is
        shared with the LLM for context, while meta stays private to your
        widget.
      </Description>
      <Field label="input">
        <Code>{input?.name}</Code>
      </Field>
      <Field label="output">
        <Code>{output?.greeting}</Code>
      </Field>
      <Field label="meta">
        <Code>{responseMetadata?.secret}</Code>
      </Field>
    </TabBody>
  );
}
