import { useToolInfo } from "@/helpers.js";
import Doc from "@/views/components/doc.js";
import DocLink from "@/views/components/doc-link.js";

export default function ToolOutput() {
  // useToolInfo: read the input, output and metadata of the tool that opened this view.
  const { output } = useToolInfo<"start">();
  const name = output?.name;

  return (
    <>
      <div className="flex flex-1 flex-col justify-center gap-3">
        <h1 className="type-display-xs font-mozilla font-semibold">
          Greetings,{" "}
          <span className="text-primary">{name ?? "stranger"} !</span>
        </h1>
        {name ? (
          <p>
            You're wondering how do I know your name, don't you? Well, it's
            because the view reads the <strong>tool output</strong>. The LLM
            knows about it too.
          </p>
        ) : (
          <p>
            The view reads the <strong>tool output</strong>, but no{" "}
            <code>name</code> was passed this time. Try again with your surname
            to see how this view personalizes.
          </p>
        )}
      </div>
      <Doc>
        Use{" "}
        <DocLink href="https://docs.skybridge.tech/api-reference/use-tool-info">
          useToolInfo
        </DocLink>{" "}
        to hydrate the view with tool input, output and metadata.
      </Doc>
    </>
  );
}
