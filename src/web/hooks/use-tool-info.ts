import { useOpenAiGlobal } from "./use-openai-global.js";
import { useEffect, useState } from "react";
import type { UnknownObject } from "../types.js";

type BaseToolState<
  TStatus extends "pending" | "success",
  ToolInput extends UnknownObject,
  ToolOutput extends UnknownObject = UnknownObject,
  ToolResponseMetadata extends UnknownObject = UnknownObject
> = {
  status: TStatus;
  isPending: TStatus extends "pending" ? true : false;
  isSuccess: TStatus extends "success" ? true : false;
  input: ToolInput;
  output: TStatus extends "success" ? ToolOutput : undefined;
  responseMetadata: TStatus extends "success"
    ? ToolResponseMetadata
    : undefined;
};

type PendingToolState<ToolInput extends UnknownObject> = BaseToolState<
  "pending",
  ToolInput
>;
type SuccessToolState<
  ToolInput extends UnknownObject,
  ToolOutput extends UnknownObject,
  ToolResponseMetadata extends UnknownObject
> = BaseToolState<"success", ToolInput, ToolOutput, ToolResponseMetadata>;

type ToolState<
  ToolInput extends UnknownObject,
  ToolOutput extends UnknownObject,
  ToolResponseMetadata extends UnknownObject
> =
  | PendingToolState<ToolInput>
  | SuccessToolState<ToolInput, ToolOutput, ToolResponseMetadata>;

export function useToolInfo<
  ToolSignature extends Partial<{
    input: UnknownObject;
    output: UnknownObject;
    responseMetadata: UnknownObject;
  }>
>() {
  const [status, setStatus] = useState<"pending" | "success">("pending");
  const input = useOpenAiGlobal("toolInput")!;
  const output = useOpenAiGlobal("toolOutput") ?? undefined;
  const responseMetadata = useOpenAiGlobal("toolResponseMetadata") ?? undefined;

  useEffect(() => {
    setStatus(
      output === undefined && responseMetadata === undefined
        ? "pending"
        : "success"
    );
  }, [output, responseMetadata]);

  return {
    input,
    status,
    isPending: status === "pending",
    isSuccess: status === "success",
    output,
    responseMetadata,
  } as ToolState<
    ToolSignature["input"] extends UnknownObject ? ToolSignature["input"] : {},
    ToolSignature["output"] extends UnknownObject
      ? ToolSignature["output"]
      : UnknownObject,
    ToolSignature["responseMetadata"] extends UnknownObject
      ? ToolSignature["responseMetadata"]
      : UnknownObject
  >;
}
