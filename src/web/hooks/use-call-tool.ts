import { useState } from "react";
import type {
  CallToolArgs,
  CallToolResponse,
  CallToolResponseConstraint,
} from "../types.js";

type CallToolState<TData extends CallToolResponse = CallToolResponse> =
  | {
      status: "idle";
      isIdle: true;
      isPending: false;
      isSuccess: false;
      isError: false;
      data: undefined;
      error: undefined;
    }
  | {
      status: "pending";
      isIdle: false;
      isPending: true;
      isSuccess: false;
      isError: false;
      data: undefined;
      error: undefined;
    }
  | {
      status: "success";
      isIdle: false;
      isPending: false;
      isSuccess: true;
      isError: false;
      data: TData;
      error: undefined;
    }
  | {
      status: "error";
      isIdle: false;
      isPending: false;
      isSuccess: false;
      isError: true;
      data: undefined;
      error: unknown;
    };

type ResolvedToolArgs<TArgs extends CallToolArgs> = TArgs extends null
  ? null
  : TArgs;

type SideEffects<ToolArgs, ToolResponse> = {
  onSuccess?: (data: ToolResponse, toolArgs: ToolArgs) => void;
  onError?: (error: unknown, toolArgs: ToolArgs) => void;
  onSettled?: (
    data: ToolResponse | undefined,
    error: unknown | undefined,
    toolArgs: ToolArgs
  ) => void;
};

type CallToolAsyncFn<TA, TR> = TA extends null
  ? () => Promise<TR>
  : (toolArgs: TA) => Promise<TR>;

export const useCallTool = <
  ToolArgs extends CallToolArgs = null,
  ToolResponse extends CallToolResponseConstraint = CallToolResponseConstraint
>(
  name: string
) => {
  const [{ status, data, error }, setCallToolState] = useState<
    Omit<
      CallToolState<CallToolResponse & ToolResponse>,
      "isIdle" | "isPending" | "isSuccess" | "isError"
    >
  >({ status: "idle", data: undefined, error: undefined });

  const execute = async (
    toolArgs: ToolArgs
  ): Promise<CallToolResponse & ToolResponse> => {
    setCallToolState({ status: "pending", data: undefined, error: undefined });
    try {
      const data = await window.openai.callTool<
        ToolArgs,
        CallToolResponse & ToolResponse
      >(name, toolArgs);
      setCallToolState({ status: "success", data, error: undefined });

      return data;
    } catch (error) {
      setCallToolState({ status: "error", data: undefined, error });
      throw error;
    }
  };

  const callToolAsync = (async (toolArgs?: ResolvedToolArgs<ToolArgs>) => {
    if (toolArgs === undefined) {
      return execute(null as ToolArgs);
    }
    return execute(toolArgs as ToolArgs);
  }) as CallToolAsyncFn<
    ResolvedToolArgs<ToolArgs>,
    CallToolResponse & ToolResponse
  >;

  function callTool(sideEffects?: SideEffects<ToolArgs, ToolResponse>): void;
  function callTool(
    toolArgs: ResolvedToolArgs<ToolArgs>,
    sideEffects?: SideEffects<ToolArgs, ToolResponse>
  ): void;
  function callTool(
    arg1?: ResolvedToolArgs<ToolArgs> | SideEffects<ToolArgs, ToolResponse>,
    sideEffects?: SideEffects<ToolArgs, ToolResponse>
  ) {
    let toolArgs: ToolArgs;
    if (
      arg1 &&
      typeof arg1 === "object" &&
      ("onSuccess" in arg1 || "onError" in arg1 || "onSettled" in arg1)
    ) {
      toolArgs = null as ToolArgs; // no toolArgs provided
      sideEffects = arg1;
    } else {
      toolArgs = (arg1 === undefined ? null : arg1) as ToolArgs;
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
  } as CallToolState<CallToolResponse & ToolResponse>;

  return {
    ...callToolState,
    callTool,
    callToolAsync,
  };
};
