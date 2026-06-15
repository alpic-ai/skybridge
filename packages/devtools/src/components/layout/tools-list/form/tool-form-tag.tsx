import type { Tool } from "@modelcontextprotocol/sdk/types";
import { useMemo } from "react";

export function ToolFormTag({
  name,
  description,
}: Pick<Tool, "name" | "description">) {
  return useMemo(
    () => (props: React.ComponentProps<"form">) => (
      <form
        toolname={name}
        tooldescription={description}
        toolautosubmit=""
        {...props}
      />
    ),
    [name, description],
  );
}
