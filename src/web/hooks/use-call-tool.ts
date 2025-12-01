import { useState } from "react";
import type { CallToolArgs, CallToolResponse } from "../types.js";

type BaseCallToolState<
  TStatus extends "idle" | "pending" | "success" | "error",
  TData extends CallToolResponse = CallToolResponse
> = {
  status: TStatus;
  isIdle: TStatus extends "idle" ? true : false;
  isPending: TStatus extends "pending" ? true : false;
  isSuccess: TStatus extends "success" ? true : false;
  isError: TStatus extends "error" ? true : false;
  data: TStatus extends "success" ? TData : undefined;
  error: TStatus extends "error" ? unknown : undefined;
};

type IdleCallToolState = BaseCallToolState<"idle">;
type PendingCallToolState = BaseCallToolState<"pending">;
type SuccessCallToolState<TData extends CallToolResponse = CallToolResponse> =
  BaseCallToolState<"success", TData>;
type ErrorCallToolState = BaseCallToolState<"error">;

type CallToolState<TData extends CallToolResponse = CallToolResponse> =
  | IdleCallToolState
  | PendingCallToolState
  | SuccessCallToolState<TData>
  | ErrorCallToolState;

export const useCallTool = <
  ToolArgs extends CallToolArgs = null,
  ToolResponse extends CallToolResponse = CallToolResponse
>(
  name: string
) => {
  const [{ status, data, error }, setCallToolState] = useState<
    Omit<
      CallToolState<ToolResponse>,
      "isIdle" | "isPending" | "isSuccess" | "isError"
    >
  >({ status: "idle", data: undefined, error: undefined });

  const callToolAsync = async (toolArgs: ToolArgs) => {
    setCallToolState({ status: "pending", data: undefined, error: undefined });
    try {
      const data = await window.openai.callTool<ToolArgs, ToolResponse>(
        name,
        toolArgs
      );
      setCallToolState({ status: "success", data, error: undefined });

      return data;
    } catch (error) {
      setCallToolState({ status: "error", data: undefined, error });
      throw error;
    }
  };

  const callTool = (
    toolArgs: ToolArgs,
    sideEffects?: {
      onSuccess?: (data: ToolResponse, toolArgs: ToolArgs) => void;
      onError?: (error: unknown, toolArgs: ToolArgs) => void;
      onSettled?: (
        data: ToolResponse | undefined,
        error: unknown | undefined,
        toolArgs: ToolArgs
      ) => void;
    }
  ) => {
    callToolAsync(toolArgs)
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
  };

  const callToolState = {
    status,
    data,
    error,
    isIdle: status === "idle",
    isPending: status === "pending",
    isSuccess: status === "success",
    isError: status === "error",
  } as CallToolState<ToolResponse>;

  return {
    ...callToolState,
    callTool,
    callToolAsync,
  };
};
