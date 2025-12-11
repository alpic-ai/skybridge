import { useState } from "react";
import type {
  CallToolArgs,
  CallToolResponse,
  HasRequiredKeys,
} from "../types.js";

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

export type SideEffects<ToolArgs, ToolResponse> = {
  onSuccess?: (data: ToolResponse, toolArgs: ToolArgs) => void;
  onError?: (error: unknown, toolArgs: ToolArgs) => void;
  onSettled?: (
    data: ToolResponse | undefined,
    error: unknown | undefined,
    toolArgs: ToolArgs,
  ) => void;
};

type IsArgsOptional<T> = [T] extends [null]
  ? true
  : HasRequiredKeys<T> extends false
    ? true
    : false;

export type CallToolFn<TArgs, TResponse> =
  IsArgsOptional<TArgs> extends true
    ? {
        (): void;
        (sideEffects: SideEffects<TArgs, TResponse>): void;
        (args: TArgs): void;
        (args: TArgs, sideEffects: SideEffects<TArgs, TResponse>): void;
      }
    : {
        (args: TArgs): void;
        (args: TArgs, sideEffects: SideEffects<TArgs, TResponse>): void;
      };

export type CallToolAsyncFn<TArgs, TResponse> =
  IsArgsOptional<TArgs> extends true
    ? {
        (): Promise<TResponse>;
        (args: TArgs): Promise<TResponse>;
      }
    : (args: TArgs) => Promise<TResponse>;

type ToolResponseSignature = Pick<
  CallToolResponse,
  "structuredContent" | "meta"
>;

export const useCallTool = <
  ToolArgs extends CallToolArgs = null,
  ToolResponse extends Partial<ToolResponseSignature> = {},
>(
  name: string,
) => {
  type CombinedCallToolResponse = CallToolResponse & ToolResponse;

  const [{ status, data, error }, setCallToolState] = useState<
    Omit<
      CallToolState<CombinedCallToolResponse>,
      "isIdle" | "isPending" | "isSuccess" | "isError"
    >
  >({ status: "idle", data: undefined, error: undefined });

  const execute = async (
    toolArgs: ToolArgs,
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

  const callToolAsync = ((toolArgs?: ToolArgs) => {
    if (toolArgs === undefined) {
      return execute(null as ToolArgs);
    }
    return execute(toolArgs);
  }) as CallToolAsyncFn<ToolArgs, CombinedCallToolResponse>;

  const callTool = ((
    firstArg?: ToolArgs | SideEffects<ToolArgs, CombinedCallToolResponse>,
    sideEffects?: SideEffects<ToolArgs, CombinedCallToolResponse>,
  ) => {
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
        sideEffects?.onSuccess?.(data, toolArgs);
        sideEffects?.onSettled?.(data, undefined, toolArgs);
      })
      .catch((error) => {
        sideEffects?.onError?.(error, toolArgs);
        sideEffects?.onSettled?.(undefined, error, toolArgs);
      });
  }) as CallToolFn<ToolArgs, CombinedCallToolResponse>;

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
