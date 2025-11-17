import { useState } from "react";
import type { CallToolArgs, CallToolResponse } from "./types.js";

type IdleCallToolState = {
  status: "idle";
  data: undefined;
  error: undefined;
  isIdle: true;
  isPending: false;
  isSuccess: false;
  isError: false;
};
type PendingCallToolState = {
  status: "pending";
  data: undefined;
  error: undefined;
  isIdle: false;
  isPending: true;
  isSuccess: false;
  isError: false;
};
type SuccessCallToolState<TOutput extends CallToolResponse = CallToolResponse> =
  {
    status: "success";
    data: TOutput;
    error: undefined;
    isIdle: false;
    isPending: false;
    isSuccess: true;
    isError: false;
  };
type ErrorCallToolState = {
  status: "error";
  data: undefined;
  error: unknown;
  isIdle: false;
  isPending: false;
  isSuccess: false;
  isError: true;
};

type CallToolState<TOutput extends CallToolResponse = CallToolResponse> =
  | IdleCallToolState
  | PendingCallToolState
  | SuccessCallToolState<TOutput>
  | ErrorCallToolState;

export const useCallTool = <
  ToolArgs extends CallToolArgs = null,
  ToolResponse extends CallToolResponse = CallToolResponse
>(
  name: string
) => {
  const [callToolState, setCallToolState] = useState<
    CallToolState<ToolResponse>
  >({
    status: "idle",
    data: undefined,
    error: undefined,
    isIdle: true,
    isPending: false,
    isSuccess: false,
    isError: false,
  });

  const callToolAsync = async (toolArgs: ToolArgs) => {
    setCallToolState({
      status: "pending",
      data: undefined,
      error: undefined,
      isIdle: false,
      isPending: true,
      isSuccess: false,
      isError: false,
    });
    try {
      const data = await window.openai.callTool<ToolArgs, ToolResponse>(
        name,
        toolArgs
      );
      setCallToolState({
        status: "success",
        data,
        error: undefined,
        isIdle: false,
        isPending: false,
        isSuccess: true,
        isError: false,
      });

      return data;
    } catch (error) {
      setCallToolState({
        status: "error",
        data: undefined,
        error,
        isIdle: false,
        isPending: false,
        isSuccess: false,
        isError: true,
      });
      throw error;
    }
  };

  const callTool = (
    toolArgs: ToolArgs,
    {
      onSuccess,
    }: { onSuccess: (data: ToolResponse, toolArgs: ToolArgs) => void }
  ) => {
    callToolAsync(toolArgs).then((data) => {
      onSuccess(data, toolArgs);
    });
  };

  return {
    ...callToolState,
    callTool,
    callToolAsync,
  };
};
