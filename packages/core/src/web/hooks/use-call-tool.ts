import { useAdaptor } from "../bridges/hooks/use-adaptor.js";
import type {
  CallToolArgs,
  CallToolResponse,
  HasRequiredKeys,
} from "../types.js";
import type { AsyncOperationState } from "./use-async-operation.js";
import { useAsyncOperation } from "./use-async-operation.js";

export type CallToolState<TData extends CallToolResponse = CallToolResponse> =
  AsyncOperationState<TData, unknown>;

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
  "structuredContent" | "_meta"
>;

export const useCallTool = <
  ToolArgs extends CallToolArgs = null,
  ToolResponse extends Partial<ToolResponseSignature> = Record<string, never>,
>(
  name: string,
) => {
  type CombinedCallToolResponse = CallToolResponse & ToolResponse;

  const { state, execute: executeAsync } = useAsyncOperation<
    CombinedCallToolResponse,
    unknown
  >({ enableDeduplication: true });

  const adaptor = useAdaptor();

  const execute = async (
    toolArgs: ToolArgs,
  ): Promise<CombinedCallToolResponse> => {
    return executeAsync(async () => {
      return adaptor.callTool<ToolArgs, CombinedCallToolResponse>(
        name,
        toolArgs,
      );
    });
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

  return {
    ...state,
    callTool,
    callToolAsync,
  };
};
