import { useRef, useState } from "react";

type AsyncOperationIdleState<_TData, _TError> = {
  status: "idle";
  isIdle: true;
  isPending: false;
  isSuccess: false;
  isError: false;
  data: undefined;
  error: undefined;
};

type AsyncOperationPendingState<_TData, _TError> = {
  status: "pending";
  isIdle: false;
  isPending: true;
  isSuccess: false;
  isError: false;
  data: undefined;
  error: undefined;
};

type AsyncOperationSuccessState<TData, _TError> = {
  status: "success";
  isIdle: false;
  isPending: false;
  isSuccess: true;
  isError: false;
  data: TData;
  error: undefined;
};

type AsyncOperationErrorState<_TData, TError> = {
  status: "error";
  isIdle: false;
  isPending: false;
  isSuccess: false;
  isError: true;
  data: undefined;
  error: TError;
};

export type AsyncOperationState<TData, TError = unknown> =
  | AsyncOperationIdleState<TData, TError>
  | AsyncOperationPendingState<TData, TError>
  | AsyncOperationSuccessState<TData, TError>
  | AsyncOperationErrorState<TData, TError>;

export type UseAsyncOperationConfig = {
  enableDeduplication?: boolean;
};

export const useAsyncOperation = <TData, TError = unknown>(
  config?: UseAsyncOperationConfig,
) => {
  const [{ status, data, error }, setState] = useState<
    Omit<
      AsyncOperationState<TData, TError>,
      "isIdle" | "isPending" | "isSuccess" | "isError"
    >
  >({ status: "idle", data: undefined, error: undefined });

  const callIdRef = useRef(0);

  const execute = async (executeFn: () => Promise<TData>): Promise<TData> => {
    const callId = config?.enableDeduplication ? ++callIdRef.current : 0;
    setState({ status: "pending", data: undefined, error: undefined });

    try {
      const result = await executeFn();

      if (!config?.enableDeduplication || callId === callIdRef.current) {
        setState({ status: "success", data: result, error: undefined });
      }

      return result;
    } catch (error) {
      if (!config?.enableDeduplication || callId === callIdRef.current) {
        setState({
          status: "error",
          data: undefined,
          error: error as TError,
        });
      }
      throw error;
    }
  };

  const state = {
    status,
    data,
    error,
    isIdle: status === "idle",
    isPending: status === "pending",
    isSuccess: status === "success",
    isError: status === "error",
  } as AsyncOperationState<TData, TError>;

  return {
    state,
    execute,
  };
};
