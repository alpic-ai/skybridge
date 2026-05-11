import { Button } from "@alpic-ai/ui/components/button";
import { HatGlasses } from "lucide-react";
import Doc from "@/views/components/doc.js";
import DocLink from "@/views/components/doc-link.js";
import { useMascot } from "@/views/use-mascot.js";

export default function State() {
  const { hat, changeHat } = useMascot();

  return (
    <>
      <div className="flex flex-1 flex-col justify-center gap-3">
        <p>
          The <strong>view state</strong> can be shared with the model:
        </p>
        <div className="flex">
          <Button variant="cta" onClick={changeHat}>
            <HatGlasses />
            Change my hat
          </Button>
        </div>
        <p className={`mt-2 ${hat ? "" : "invisible"}`} aria-hidden={!hat}>
          Now, the LLM also knows I'm wearing a glorious{" "}
          <span
            // data-llm: describe what the user views to the model so they can collaborate
            data-llm={`Mascot is wearing ${hat}`}
            className="text-primary font-mozilla"
          >
            {hat}
          </span>
          .
        </p>
      </div>
      <Doc>
        Use{" "}
        <DocLink href="https://docs.skybridge.tech/api-reference/use-view-state">
          useViewState
        </DocLink>{" "}
        to update the context and{" "}
        <DocLink href="https://docs.skybridge.tech/api-reference/data-llm">
          data-llm
        </DocLink>{" "}
        to describe the UI.
      </Doc>
    </>
  );
}
