import { useState } from "react";
import type {
  CheckoutErrorResponse,
  CheckoutResponse,
  CheckoutSessionRequest,
  CheckoutSuccessResponse,
} from "../types.js";
import type { AsyncOperationState } from "./use-async-operation.js";
import { useAsyncOperation } from "./use-async-operation.js";

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

// State types for the hook - using shared AsyncOperationState
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
  /**
   * Function to generate unique checkout session IDs.
   * Defaults to crypto.randomUUID()
   */
  checkoutSessionIdGenerator?: () => string;
};

function isCheckoutErrorResponse(
  response: CheckoutResponse,
): response is CheckoutErrorResponse {
  return "code" in response && "message" in response;
}

export const useCheckout = (options?: UseCheckoutOptions) => {
  // Enable deduplication to prevent race conditions from rapid checkout button clicks
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
        const errorResponse = response as CheckoutErrorResponse;
        throw errorResponse;
      }

      return response as CheckoutSuccessResponse;
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
