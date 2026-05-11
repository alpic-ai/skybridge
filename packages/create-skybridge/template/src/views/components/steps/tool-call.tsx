import { Button } from "@alpic-ai/ui/components/button";
import { Cookie } from "lucide-react";
import { useEffect, useState } from "react";
import { useCallTool } from "@/helpers.js";
import Doc from "@/views/components/doc.js";
import DocLink from "@/views/components/doc-link.js";

export default function ToolCall() {
  // useCallTool: invoke a server tool from within the view.
  const { callTool, isPending, data } = useCallTool("get-fortune-cookie");
  const [prediction, setPrediction] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setPrediction(data.structuredContent.prediction);
    }
  }, [data]);

  return (
    <>
      <div className="flex flex-1 flex-col justify-center gap-3">
        <p className="">
          <strong>Tools</strong> can also be triggered from the view:
        </p>
        <div className="flex">
          <Button
            variant="cta"
            loading={isPending}
            icon={<Cookie />}
            onClick={() => callTool()}
          >
            <code>get-fortune-cookie</code>
          </Button>
        </div>
        <p
          className={`font-mozilla italic text-primary mt-2 ${
            prediction ? "" : "invisible"
          }`}
          aria-hidden={!prediction}
        >
          {prediction || "none"}
        </p>
      </div>
      <Doc>
        Use{" "}
        <DocLink href="https://docs.skybridge.tech/api-reference/use-call-tool">
          useCallTool
        </DocLink>{" "}
        to request tools from within the view.
      </Doc>
    </>
  );
}
