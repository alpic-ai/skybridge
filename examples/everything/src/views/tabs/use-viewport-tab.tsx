import { useViewport } from "skybridge/web";
import { Code, Description, Field, TabBody } from "../components/ui.js";

export function UseViewportTab() {
  const { maxHeight, safeArea } = useViewport();

  return (
    <TabBody>
      <Description>
        Access the live viewport geometry the host grants the view. Values
        update dynamically on resize.
      </Description>

      <div className="flex flex-wrap gap-4">
        <Field label="Max height">
          <Code>{maxHeight ?? "unbounded"}</Code>
        </Field>

        <Field label="Safe area insets">
          <Code>{JSON.stringify(safeArea.insets)}</Code>
        </Field>
      </div>
    </TabBody>
  );
}
