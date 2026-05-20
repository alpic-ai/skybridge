import { useRef, useState } from "react";

import {
  type CallToolArgs,
  type CallToolResponse,
  getAdaptor,
} from "../bridges/index.js";
import type { HasRequiredKeys } from "../types.js";

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

/**
 * State of a {@link useCallTool} invocation, discriminated by `status`.
 * Use `isIdle` / `isPending` / `isSuccess` / `isError` for ergonomic conditional rendering.
 */
export type CallToolState<TData extends CallToolResponse = CallToolResponse> =
  | CallToolIdleState
  | CallToolPendingState
  | CallToolSuccessState<TData>
  | CallToolErrorState;

/**
 * Optional callbacks fired around a {@link useCallTool} call.
 * `onSettled` runs after success or error.
 */
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

/**
 * Fire-and-forget call function returned by {@link useCallTool}. Tracks state
 * on the hook and supports optional {@link SideEffects} callbacks. Args are
 * optional when the tool accepts none.
 */
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

/**
 * Promise-returning call function returned by {@link useCallTool}. Rejects
 * if the tool errors; use `try/catch` for error handling.
 */
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

/**
 * Call a server tool from a view and track its execution state.
 *
 * Returns the current {@link CallToolState} plus two callers: `callTool`
 * (fire-and-forget, with optional {@link SideEffects}) and `callToolAsync`
 * (promise-returning). If the same instance is invoked again while a call is
 * in flight, the older response is dropped from the rendered state (but any
 * `onSuccess` / `onError` / `onSettled` callbacks attached to it still fire).
 *
 * Pair with {@link useToolInfo} to read the result of the tool invocation
 * that produced the current view. For end-to-end type safety across tool
 * inputs and outputs, prefer the typed helpers produced by {@link generateHelpers}
 * over calling this hook directly.
 *
 * @typeParam ToolArgs - Shape of the tool's input args (`null` for no-arg tools).
 * @typeParam ToolResponse - Shape of the tool's `structuredContent` / `meta`.
 *
 * @example
 * ```tsx
 * const { callTool, isPending, data } = useCallTool<{ query: string }>("search");
 *
 * <button onClick={() => callTool({ query: "skybridge" }, {
 *   onSuccess: (res) => console.log(res.structuredContent),
 * })} />
 * ```
 *
 * @see https://docs.skybridge.tech/api-reference/use-call-tool
 */
export const useCallTool = <
  ToolArgs extends CallToolArgs = null,
  ToolResponse extends Partial<ToolResponseSignature> = Record<string, never>,
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

  const callIdRef = useRef(0);
  const adaptor = getAdaptor();

  const execute = async (
    toolArgs: ToolArgs,
  ): Promise<CombinedCallToolResponse> => {
    const callId = ++callIdRef.current;
    setCallToolState({ status: "pending", data: undefined, error: undefined });

    try {
      const data = await adaptor.callTool<ToolArgs, CombinedCallToolResponse>(
        name,
        toolArgs,
      );
      if (callId === callIdRef.current) {
        setCallToolState({ status: "success", data, error: undefined });
      }

      return data;
    } catch (error) {
      if (callId === callIdRef.current) {
        setCallToolState({ status: "error", data: undefined, error });
      }
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
