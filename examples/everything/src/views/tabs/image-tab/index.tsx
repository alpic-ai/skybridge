import { Code, Description, Field, TabBody } from "../../components/ui.js";
import skybridge from "./skybridge.jpg";

export function ImageTab() {
  return (
    <TabBody>
      <Description>
        This tab demonstrates how to display images in your widget by importing
        them directly. You can use the <Code>@/</Code> alias for absolute paths
        or relative imports.
      </Description>

      <Field label="Example">
        <img
          src={skybridge}
          alt="skybridge"
          className="h-auto max-w-full rounded-md"
        />
      </Field>
    </TabBody>
  );
}
