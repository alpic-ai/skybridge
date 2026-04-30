import "@/index.css";

import { defineCatalog, type Spec } from "@json-render/core";
import { defineRegistry, JSONUIProvider, Renderer } from "@json-render/react";
import { schema } from "@json-render/react/schema";
import { shadcnComponents } from "@json-render/shadcn";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { useToolInfo } from "../helpers.js";

const catalog = defineCatalog(schema, {
  components: shadcnComponentDefinitions,
  actions: {},
});

const { registry } = defineRegistry(catalog, {
  components: shadcnComponents,
});

function RenderWidget() {
  const { output } = useToolInfo<"render">();
  const spec = (output?.spec ?? null) as Spec | null;

  if (!spec) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Waiting for UI spec...
      </div>
    );
  }

  return (
    <JSONUIProvider registry={registry} initialState={spec.state ?? {}}>
      <Renderer spec={spec} registry={registry} />
    </JSONUIProvider>
  );
}

export default RenderWidget;
