import { useState } from "react";
import type {
  CheckoutErrorResponse,
  CheckoutResponse,
  CheckoutSessionRequest,
  CheckoutSuccessResponse,
} from "../types.js";
import type { AsyncOperationState } from "./use-async-operation.js";
import { useAsyncOperation } from "./use-async-operation.js";

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

export type CheckoutState = AsyncOperationState<
  CheckoutSuccessResponse,
  CheckoutErrorResponse | Error
>;

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

export type UseCheckoutOptions = {
  checkoutSessionIdGenerator?: () => string;
};

function isCheckoutErrorResponse(
  response: CheckoutResponse,
): response is CheckoutErrorResponse {
  return "code" in response && "message" in response;
}

export const useCheckout = (options?: UseCheckoutOptions) => {
  const { state, execute: executeAsync } = useAsyncOperation<
    CheckoutSuccessResponse,
    CheckoutErrorResponse | Error
  >({ enableDeduplication: true });

  const [sessionId, setSessionId] = useState<string | undefined>();

  const generateSessionId =
    options?.checkoutSessionIdGenerator ?? (() => crypto.randomUUID());

  const execute = async (
    session: CheckoutSessionRequest,
  ): Promise<CheckoutSuccessResponse> => {
    return executeAsync(async () => {
      if (!window.openai?.requestCheckout) {
        throw new Error("requestCheckout is not available in this host");
      }

      // Auto-inject session ID if not provided
      const sessionWithId = session.id
        ? session
        : { ...session, id: generateSessionId() };

      setSessionId(sessionWithId.id);

      const response = await window.openai.requestCheckout(sessionWithId);

      if (isCheckoutErrorResponse(response)) {
        throw response;
      }

      return response;
    });
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

  return {
    ...state,
    order: state.data?.order,
    sessionId,
    requestCheckout,
    requestCheckoutAsync,
  };
};
