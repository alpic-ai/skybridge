import { useOpenAiGlobal } from "./use-openai-global.js";
import { useEffect, useState } from "react";
import type { UnknownObject } from "../types.js";

type ToolState<
  ToolInput extends UnknownObject,
  ToolOutput extends UnknownObject,
  ToolResponseMetadata extends UnknownObject
> =
  | {
      status: "pending";
      isPending: true;
      isSuccess: false;
      input: ToolInput;
      output: undefined;
      responseMetadata: undefined;
    }
  | {
      status: "success";
      isPending: false;
      isSuccess: true;
      input: ToolInput;
      output: ToolOutput;
      responseMetadata: ToolResponseMetadata;
    };

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
        : "success"
    );
  }, [output, responseMetadata]);

  type Input = TS["input"] extends UnknownObject ? TS["input"] : UnknownObject;
  type Output = TS["output"] extends UnknownObject
    ? TS["output"]
    : UnknownObject;
  type Metadata = TS["responseMetadata"] extends UnknownObject
    ? TS["responseMetadata"]
    : UnknownObject;

  return {
    input,
    status,
    isPending: status === "pending",
    isSuccess: status === "success",
    output,
    responseMetadata,
  } as ToolState<Input, Output, Metadata>;
}
