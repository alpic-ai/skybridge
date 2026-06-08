import { Button } from "@alpic-ai/ui/components/button";
import { useViewState } from "skybridge/web";
import { Code, Description, Field, TabBody } from "../components/ui.js";

export function UseViewStateTab() {
  const [state, setState] = useViewState({ count: 0 });

  return (
    <TabBody>
      <Description>Persist state across widget lifecycle events.</Description>

      <Field label="Count">
        <Code>{state.count ?? 0}</Code>
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setState((prev) => ({ count: prev.count + 1 }))}>
          Increment
        </Button>
        <Button
          variant="secondary"
          onClick={() => setState({ count: 0 })}
          disabled={state.count === 0}
        >
          Reset
        </Button>
      </div>
    </TabBody>
  );
}
