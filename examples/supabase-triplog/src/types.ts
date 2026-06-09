import type { useToolInfo } from "./helpers.js";

type ToolOutput = ReturnType<typeof useToolInfo<"browse-trips">>;

export type Trip = NonNullable<ToolOutput["output"]>["trips"][number];
