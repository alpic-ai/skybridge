import { useEffect, useState } from "react";
import { useBridge } from "../bridges/index.js";
import type { UnknownObject } from "../types.js";

export type ToolPendingState<ToolInput extends UnknownObject> = {
  status: "pending";
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
  | ToolPendingState<ToolInput>
  | ToolSuccessState<ToolInput, ToolOutput, ToolResponseMetadata>;

type ToolSignature = {
  input: UnknownObject;
  output: UnknownObject;
  responseMetadata: UnknownObject;
};

export function useToolInfo<
  TS extends Partial<ToolSignature> = Record<string, never>,
>() {
  const [status, setStatus] = useState<"pending" | "success">("pending");
  const input = useBridge("toolInput");
  const output = useBridge("toolOutput");
  const responseMetadata = useBridge("toolResponseMetadata");

  useEffect(() => {
    setStatus(
      output === null && responseMetadata === null ? "pending" : "success",
    );
  }, [output, responseMetadata]);

  type Input = UnknownObject & TS["input"];
  type Output = UnknownObject & TS["output"];
  type Metadata = UnknownObject & TS["responseMetadata"];

  return {
    input,
    status,
    isPending: status === "pending",
    isSuccess: status === "success",
    output,
    responseMetadata,
  } as ToolState<Input, Output, Metadata>;
}
