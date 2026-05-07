import { useToolInfo } from "@/helpers.js";
import Doc from "../doc.js";
import DocLink from "../doc-link.js";

export default function ToolOutput() {
  // useToolInfo: read the input, output and metadata of the tool that opened this view.
  const { input } = useToolInfo<"start">();

  return (
    <>
      <div className="flex flex-1 flex-col justify-center gap-3">
        <h1 className="type-display-xs font-mozilla font-semibold">
          Greetings, <span className="text-primary">{input?.name} !</span>
        </h1>
        <p>
          You're wondering how do I know your name, don't you? Well, it's
          because the view reads the <strong>tool output</strong>. The LLM knows
          about it too.
        </p>
      </div>
      <Doc>
        Use{" "}
        <DocLink href="https://docs.skybridge.tech/api-reference/use-tool-info">
          useToolInfo
        </DocLink>{" "}
        to hydrates the view with tool input, output and metadata.
      </Doc>
    </>
  );
}
