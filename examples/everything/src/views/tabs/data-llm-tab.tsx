import {
  ToggleGroup,
  ToggleGroupItem,
} from "@alpic-ai/ui/components/toggle-group";
import { useState } from "react";
import {
  Code,
  CodeBlock,
  Description,
  Field,
  TabBody,
} from "../components/ui.js";

const PAGES = ["Home", "Products", "Cart", "Checkout"] as const;
type Page = (typeof PAGES)[number];

export function DataLlmTab() {
  const [page, setPage] = useState<Page>("Home");

  return (
    <TabBody data-llm={`User is viewing the ${page} page`}>
      <Description>
        The <Code>data-llm</Code> attribute syncs UI state with the model. As
        you navigate below, the LLM knows which page you're on.
      </Description>

      <Field label="compiled widgetState">
        <CodeBlock>{`<DataLLM content="User is viewing the ${page} page}">
  <div>{/* The page content */}</div>
</DataLLM>`}</CodeBlock>
      </Field>

      <ToggleGroup
        type="single"
        variant="outline"
        value={page}
        onValueChange={(value) => value && setPage(value as Page)}
      >
        {PAGES.map((p) => (
          <ToggleGroupItem key={p} value={p}>
            {p}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </TabBody>
  );
}
