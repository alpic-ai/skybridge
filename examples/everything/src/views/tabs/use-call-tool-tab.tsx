import { Badge } from "@alpic-ai/ui/components/badge";
import { Button } from "@alpic-ai/ui/components/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@alpic-ai/ui/components/toggle-group";
import { useState } from "react";
import { useCallTool } from "../../helpers.js";
import {
  Code,
  CodeBlock,
  Description,
  Field,
  TabBody,
} from "../components/ui.js";

type Guess = "heads" | "tails";

export function UseCallToolTab() {
  const [guess, setGuess] = useState<Guess | null>(null);
  const { data, isPending, callTool } = useCallTool("flip-coin");

  const structuredContent = data?.structuredContent;
  const won = structuredContent?.won === true;

  return (
    <TabBody>
      <Description>
        Trigger server-side tools directly from your widget. Make sure the tool
        _meta <Code>openai/widgetAccessible</Code> property is set to true.
      </Description>
      <Field label="Call flip-coin">
        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup
            type="single"
            variant="outline"
            disabled={isPending}
            value={guess ?? ""}
            onValueChange={(value) => value && setGuess(value as Guess)}
          >
            {(["heads", "tails"] as Guess[]).map((side) => (
              <ToggleGroupItem key={side} value={side}>
                {side.charAt(0).toUpperCase() + side.slice(1)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button
            loading={isPending}
            disabled={guess === null}
            onClick={() => {
              if (guess) {
                callTool({ guess });
              }
            }}
          >
            {isPending ? "Flipping…" : "Flip"}
          </Button>
        </div>
      </Field>

      {structuredContent && (
        <Field label="response">
          <Badge variant={won ? "success" : "error"} size="md" className="mb-1">
            {won ? "You Won!" : "You Lost!"}
          </Badge>
          <CodeBlock>{JSON.stringify(data, null, 2)}</CodeBlock>
        </Field>
      )}
    </TabBody>
  );
}
