import { useState } from "react";
import type {
  CheckoutErrorResponse,
  CheckoutResponse,
  CheckoutSessionRequest,
  CheckoutSuccessResponse,
} from "../types.js";

// Re-export types for convenience
export type {
  CheckoutErrorCode,
  CheckoutErrorResponse,
  CheckoutLineItem,
  CheckoutLink,
  CheckoutLinkType,
  CheckoutOrder,
  CheckoutOrderStatus,
  CheckoutPaymentMode,
  CheckoutPaymentProvider,
  CheckoutResponse,
  CheckoutSessionRequest,
  CheckoutSessionStatus,
  CheckoutSuccessResponse,
  CheckoutTotal,
  CheckoutTotalType,
  SupportedPaymentMethod,
} from "../types.js";

// State types for the hook
type CheckoutIdleState = {
  status: "idle";
  isIdle: true;
  isPending: false;
  isSuccess: false;
  isError: false;
  data: undefined;
  error: undefined;
};

type CheckoutPendingState = {
  status: "pending";
  isIdle: false;
  isPending: true;
  isSuccess: false;
  isError: false;
  data: undefined;
  error: undefined;
};

type CheckoutSuccessState = {
  status: "success";
  isIdle: false;
  isPending: false;
  isSuccess: true;
  isError: false;
  data: CheckoutSuccessResponse;
  error: undefined;
};

type CheckoutErrorState = {
  status: "error";
  isIdle: false;
  isPending: false;
  isSuccess: false;
  isError: true;
  data: undefined;
  error: CheckoutErrorResponse | Error;
};

export type CheckoutState =
  | CheckoutIdleState
  | CheckoutPendingState
  | CheckoutSuccessState
  | CheckoutErrorState;

export type CheckoutSideEffects = {
  onSuccess?: (data: CheckoutSuccessResponse) => void;
  onError?: (error: CheckoutErrorResponse | Error) => void;
  onSettled?: (
    data: CheckoutSuccessResponse | undefined,
    error: CheckoutErrorResponse | Error | undefined,
  ) => void;
};

export type RequestCheckoutFn = {
  (session: CheckoutSessionRequest): void;
  (session: CheckoutSessionRequest, sideEffects: CheckoutSideEffects): void;
};

export type RequestCheckoutAsyncFn = (
  session: CheckoutSessionRequest,
) => Promise<CheckoutSuccessResponse>;

function isCheckoutErrorResponse(
  response: CheckoutResponse,
): response is CheckoutErrorResponse {
  return "code" in response && "message" in response;
}

export const useCheckout = () => {
  const [{ status, data, error }, setCheckoutState] = useState<
    Omit<CheckoutState, "isIdle" | "isPending" | "isSuccess" | "isError">
  >({ status: "idle", data: undefined, error: undefined });

  const execute = async (
    session: CheckoutSessionRequest,
  ): Promise<CheckoutSuccessResponse> => {
    if (!window.openai?.requestCheckout) {
      throw new Error("requestCheckout is not available in this host");
    }

    setCheckoutState({ status: "pending", data: undefined, error: undefined });

    try {
      const response = await window.openai.requestCheckout(session);

      if (isCheckoutErrorResponse(response)) {
        const errorResponse = response as CheckoutErrorResponse;
        setCheckoutState({
          status: "error",
          data: undefined,
          error: errorResponse,
        });
        throw errorResponse;
      }

      const successResponse = response as CheckoutSuccessResponse;
      setCheckoutState({
        status: "success",
        data: successResponse,
        error: undefined,
      });
      return successResponse;
    } catch (error) {
      const checkoutError =
        error instanceof Error ||
        isCheckoutErrorResponse(error as CheckoutResponse)
          ? (error as CheckoutErrorResponse | Error)
          : new Error(String(error));

      setCheckoutState({
        status: "error",
        data: undefined,
        error: checkoutError,
      });
      throw checkoutError;
    }
  };

  const requestCheckoutAsync: RequestCheckoutAsyncFn = (
    session: CheckoutSessionRequest,
  ) => {
    return execute(session);
  };

  const requestCheckout: RequestCheckoutFn = ((
    session: CheckoutSessionRequest,
    sideEffects?: CheckoutSideEffects,
  ) => {
    execute(session)
      .then((data) => {
        sideEffects?.onSuccess?.(data);
        sideEffects?.onSettled?.(data, undefined);
      })
      .catch((error: CheckoutErrorResponse | Error) => {
        sideEffects?.onError?.(error);
        sideEffects?.onSettled?.(undefined, error);
      });
  }) as RequestCheckoutFn;

  const checkoutState = {
    status,
    data,
    error,
    isIdle: status === "idle",
    isPending: status === "pending",
    isSuccess: status === "success",
    isError: status === "error",
  } as CheckoutState;

  return {
    ...checkoutState,
    requestCheckout,
    requestCheckoutAsync,
  };
};
