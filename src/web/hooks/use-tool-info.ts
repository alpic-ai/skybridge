import { useEffect, useState } from "react";
import type { UnknownObject } from "../types.js";
import { useOpenAiGlobal } from "./use-openai-global.js";

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

export function useToolInfo<TS extends Partial<ToolSignature> = {}>() {
  const [status, setStatus] = useState<"pending" | "success">("pending");
  const input = useOpenAiGlobal("toolInput")!;
  const output = useOpenAiGlobal("toolOutput") ?? undefined;
  const responseMetadata = useOpenAiGlobal("toolResponseMetadata") ?? undefined;

  useEffect(() => {
    setStatus(
      output === undefined && responseMetadata === undefined
        ? "pending"
        : "success",
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
