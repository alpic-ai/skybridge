import type { useToolInfo } from "./helpers.js";

type ToolOutput = ReturnType<typeof useToolInfo<"browse-catalog">>;

export type Product = NonNullable<ToolOutput["output"]>["products"][number];
