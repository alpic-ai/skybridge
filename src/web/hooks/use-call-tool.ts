import { useState } from "react";
import type { CallToolArgs, CallToolResponse } from "../types.js";

type CallToolIdleState = {
  status: "idle";
  isIdle: true;
  isPending: false;
  isSuccess: false;
  isError: false;
  data: undefined;
  error: undefined;
};

type CallToolPendingState = {
  status: "pending";
  isIdle: false;
  isPending: true;
  isSuccess: false;
  isError: false;
  data: undefined;
  error: undefined;
};

type CallToolSuccessState<TData extends CallToolResponse = CallToolResponse> = {
  status: "success";
  isIdle: false;
  isPending: false;
  isSuccess: true;
  isError: false;
  data: TData;
  error: undefined;
};

type CallToolErrorState = {
  status: "error";
  isIdle: false;
  isPending: false;
  isSuccess: false;
  isError: true;
  data: undefined;
  error: unknown;
};

export type CallToolState<TData extends CallToolResponse = CallToolResponse> =
  | CallToolIdleState
  | CallToolPendingState
  | CallToolSuccessState<TData>
  | CallToolErrorState;

type SideEffects<ToolArgs, ToolResponse> = {
  onSuccess?: (data: ToolResponse, toolArgs: ToolArgs) => void;
  onError?: (error: unknown, toolArgs: ToolArgs) => void;
  onSettled?: (
    data: ToolResponse | undefined,
    error: unknown | undefined,
    toolArgs: ToolArgs
  ) => void;
};

type CallToolAsyncFn<ToolArgs, ToolResponse> = ToolArgs extends null
  ? () => Promise<ToolResponse>
  : (toolArgs: ToolArgs) => Promise<ToolResponse>;

type ToolResponseSignature = Pick<
  CallToolResponse,
  "structuredContent" | "meta"
>;

export const useCallTool = <
  ToolArgs extends CallToolArgs = null,
  ToolResponse extends Partial<ToolResponseSignature> = {}
>(
  name: string
) => {
  type CombinedCallToolResponse = CallToolResponse & ToolResponse;

  const [{ status, data, error }, setCallToolState] = useState<
    Omit<
      CallToolState<CombinedCallToolResponse>,
      "isIdle" | "isPending" | "isSuccess" | "isError"
    >
  >({ status: "idle", data: undefined, error: undefined });

  const execute = async (
    toolArgs: ToolArgs
  ): Promise<CombinedCallToolResponse> => {
    setCallToolState({ status: "pending", data: undefined, error: undefined });
    try {
      const data = await window.openai.callTool<
        ToolArgs,
        CombinedCallToolResponse
      >(name, toolArgs);
      setCallToolState({ status: "success", data, error: undefined });

      return data;
    } catch (error) {
      setCallToolState({ status: "error", data: undefined, error });
      throw error;
    }
  };

  const callToolAsync = (async (toolArgs?: ToolArgs) => {
    if (toolArgs === undefined) {
      return execute(null as ToolArgs);
    }
    return execute(toolArgs as ToolArgs);
  }) as CallToolAsyncFn<ToolArgs, CombinedCallToolResponse>;

  function callTool(
    sideEffects?: SideEffects<ToolArgs, CombinedCallToolResponse>
  ): void;
  function callTool(
    toolArgs: ToolArgs,
    sideEffects?: SideEffects<ToolArgs, CombinedCallToolResponse>
  ): void;
  function callTool(
    firstArg?: ToolArgs | SideEffects<ToolArgs, CombinedCallToolResponse>,
    sideEffects?: SideEffects<ToolArgs, CombinedCallToolResponse>
  ) {
    let toolArgs: ToolArgs;
    if (
      firstArg &&
      typeof firstArg === "object" &&
      ("onSuccess" in firstArg ||
        "onError" in firstArg ||
        "onSettled" in firstArg)
    ) {
      toolArgs = null as ToolArgs; // no toolArgs provided
      sideEffects = firstArg;
    } else {
      toolArgs = (firstArg === undefined ? null : firstArg) as ToolArgs;
    }

    execute(toolArgs)
      .then((data) => {
        if (sideEffects?.onSuccess) {
          sideEffects.onSuccess(data, toolArgs);
        }
        if (sideEffects?.onSettled) {
          sideEffects.onSettled(data, undefined, toolArgs);
        }
      })
      .catch((error) => {
        if (sideEffects?.onError) {
          sideEffects.onError(error, toolArgs);
        }
        if (sideEffects?.onSettled) {
          sideEffects.onSettled(undefined, error, toolArgs);
        }
      });
  }

  const callToolState = {
    status,
    data,
    error,
    isIdle: status === "idle",
    isPending: status === "pending",
    isSuccess: status === "success",
    isError: status === "error",
  } as CallToolState<CombinedCallToolResponse>;

  return {
    ...callToolState,
    callTool,
    callToolAsync,
  };
};
