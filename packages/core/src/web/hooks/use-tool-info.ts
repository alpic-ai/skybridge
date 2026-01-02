import { useBridge } from "../bridges/index.js";
import type { UnknownObject } from "../types.js";

export type ToolIdleState = {
  status: "idle";
  isIdle: true;
  isPending: false;
  isSuccess: false;
  input: undefined;
  output: undefined;
  responseMetadata: undefined;
};

export type ToolPendingState<ToolInput extends UnknownObject> = {
  status: "pending";
  isIdle: false;
  isPending: true;
  isSuccess: false;
  input: ToolInput;
  output: undefined;
  responseMetadata: undefined;
};

export type ToolSuccessState<
  ToolInput extends UnknownObject,
  ToolOutput extends UnknownObject,
  ToolResponseMetadata extends UnknownObject,
> = {
  status: "success";
  isIdle: false;
  isPending: false;
  isSuccess: true;
  input: ToolInput;
  output: ToolOutput;
  responseMetadata: ToolResponseMetadata;
};

export type ToolState<
  ToolInput extends UnknownObject,
  ToolOutput extends UnknownObject,
  ToolResponseMetadata extends UnknownObject,
> =
  | ToolIdleState
  | ToolPendingState<ToolInput>
  | ToolSuccessState<ToolInput, ToolOutput, ToolResponseMetadata>;

type ToolSignature = {
  input: UnknownObject;
  output: UnknownObject;
  responseMetadata: UnknownObject;
};

function deriveStatus(
  input: Record<string, unknown> | null,
  output: Record<string, unknown> | null,
  responseMetadata: Record<string, unknown> | null,
): "idle" | "pending" | "success" {
  if (input === null) {
    return "idle";
  }
  if (output === null && responseMetadata === null) {
    return "pending";
  }
  return "success";
}

export function useToolInfo<
  TS extends Partial<ToolSignature> = Record<string, never>,
>() {
  const input = useBridge("toolInput");
  const output = useBridge("toolOutput");
  const responseMetadata = useBridge("toolResponseMetadata");

  const status = deriveStatus(input, output, responseMetadata);

  type Input = UnknownObject & TS["input"];
  type Output = UnknownObject & TS["output"];
  type Metadata = UnknownObject & TS["responseMetadata"];

  return {
    input,
    status,
    isIdle: status === "idle",
    isPending: status === "pending",
    isSuccess: status === "success",
    output,
    responseMetadata,
  } as ToolState<Input, Output, Metadata>;
}
