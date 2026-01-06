import { act, renderHook, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from "vitest";
import type {
  CheckoutErrorResponse,
  CheckoutSessionRequest,
  CheckoutSuccessResponse,
} from "../types.js";
import { useCheckout } from "./use-checkout.js";

describe("useCheckout", () => {
  let requestCheckoutMock: Mock;

  const mockSession: CheckoutSessionRequest = {
    id: "checkout_session_123",
    payment_provider: {
      provider: "stripe",
      merchant_id: "merchant_456",
      supported_payment_methods: ["card", "apple_pay"],
    },
    status: "ready_for_payment",
    currency: "USD",
    totals: [
      { type: "subtotal", display_text: "Subtotal", amount: 1000 },
      { type: "tax", display_text: "Tax", amount: 80 },
      { type: "total", display_text: "Total", amount: 1080 },
    ],
    links: [
      { type: "terms_of_use", url: "https://example.com/terms" },
      { type: "privacy_policy", url: "https://example.com/privacy" },
    ],
    payment_mode: "live",
  };

  const mockSuccessResponse: CheckoutSuccessResponse = {
    id: "checkout_session_123",
    status: "completed",
    currency: "USD",
    order: {
      id: "order_789",
      checkout_session_id: "checkout_session_123",
      permalink_url: "https://example.com/orders/789",
    },
  };

  const mockErrorResponse: CheckoutErrorResponse = {
    code: "payment_declined",
    message: "Your card was declined.",
  };

  beforeEach(() => {
    requestCheckoutMock = vi.fn();
    vi.stubGlobal("openai", {
      requestCheckout: requestCheckoutMock,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  describe("initial state", () => {
    it("should start in idle state", () => {
      const { result } = renderHook(() => useCheckout());

      expect(result.current.status).toBe("idle");
      expect(result.current.isIdle).toBe(true);
      expect(result.current.isPending).toBe(false);
      expect(result.current.isSuccess).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeUndefined();
    });
  });

  describe("requestCheckout", () => {
    it("should call window.openai.requestCheckout with correct session data", async () => {
      requestCheckoutMock.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useCheckout());

      await act(async () => {
        result.current.requestCheckout(mockSession);
      });

      expect(requestCheckoutMock).toHaveBeenCalledWith(mockSession);
    });

    it("should transition to pending state while checkout is in progress", async () => {
      let resolveCheckout: (value: CheckoutSuccessResponse) => void;
      requestCheckoutMock.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveCheckout = resolve;
        }),
      );

      const { result } = renderHook(() => useCheckout());

      act(() => {
        result.current.requestCheckout(mockSession);
      });

      expect(result.current.status).toBe("pending");
      expect(result.current.isPending).toBe(true);
      expect(result.current.isIdle).toBe(false);

      await act(async () => {
        resolveCheckout?.(mockSuccessResponse);
      });
    });

    it("should transition to success state on successful checkout", async () => {
      requestCheckoutMock.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useCheckout());

      await act(async () => {
        result.current.requestCheckout(mockSession);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("success");
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data).toEqual(mockSuccessResponse);
        expect(result.current.error).toBeUndefined();
      });
    });

    it("should transition to error state on checkout error response", async () => {
      requestCheckoutMock.mockResolvedValueOnce(mockErrorResponse);
      const { result } = renderHook(() => useCheckout());

      await act(async () => {
        result.current.requestCheckout(mockSession);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(mockErrorResponse);
        expect(result.current.data).toBeUndefined();
      });
    });

    it("should transition to error state on rejected promise", async () => {
      const error = new Error("Network error");
      requestCheckoutMock.mockRejectedValueOnce(error);
      const { result } = renderHook(() => useCheckout());

      await act(async () => {
        result.current.requestCheckout(mockSession);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
        expect(result.current.isError).toBe(true);
        expect(result.current.error).toEqual(error);
      });
    });
  });

  describe("requestCheckout with side effects", () => {
    it("should call onSuccess callback on successful checkout", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const onSettled = vi.fn();
      requestCheckoutMock.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useCheckout());

      act(() => {
        result.current.requestCheckout(mockSession, {
          onSuccess,
          onError,
          onSettled,
        });
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(mockSuccessResponse);
        expect(onError).not.toHaveBeenCalled();
        expect(onSettled).toHaveBeenCalledWith(mockSuccessResponse, undefined);
      });
    });

    it("should call onError callback on checkout error", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const onSettled = vi.fn();
      requestCheckoutMock.mockResolvedValueOnce(mockErrorResponse);

      const { result } = renderHook(() => useCheckout());

      act(() => {
        result.current.requestCheckout(mockSession, {
          onSuccess,
          onError,
          onSettled,
        });
      });

      await waitFor(() => {
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(mockErrorResponse);
        expect(onSettled).toHaveBeenCalledWith(undefined, mockErrorResponse);
      });
    });

    it("should call onError callback on rejected promise", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const onSettled = vi.fn();
      const error = new Error("Network error");
      requestCheckoutMock.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCheckout());

      act(() => {
        result.current.requestCheckout(mockSession, {
          onSuccess,
          onError,
          onSettled,
        });
      });

      await waitFor(() => {
        expect(onSuccess).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledWith(error);
        expect(onSettled).toHaveBeenCalledWith(undefined, error);
      });
    });
  });

  describe("requestCheckoutAsync", () => {
    it("should return the successful response", async () => {
      requestCheckoutMock.mockResolvedValueOnce(mockSuccessResponse);
      const { result } = renderHook(() => useCheckout());

      const response = await act(async () => {
        return result.current.requestCheckoutAsync(mockSession);
      });

      expect(response).toEqual(mockSuccessResponse);
    });

    it("should throw on checkout error response", async () => {
      requestCheckoutMock.mockResolvedValueOnce(mockErrorResponse);
      const { result } = renderHook(() => useCheckout());

      await act(async () => {
        await expect(
          result.current.requestCheckoutAsync(mockSession),
        ).rejects.toEqual(mockErrorResponse);
      });
    });

    it("should throw on rejected promise", async () => {
      const error = new Error("Network error");
      requestCheckoutMock.mockRejectedValueOnce(error);
      const { result } = renderHook(() => useCheckout());

      await act(async () => {
        await expect(
          result.current.requestCheckoutAsync(mockSession),
        ).rejects.toEqual(error);
      });
    });
  });

  describe("when requestCheckout is not available", () => {
    it("should throw an error if window.openai.requestCheckout is undefined", async () => {
      vi.stubGlobal("openai", {});

      const { result } = renderHook(() => useCheckout());

      await act(async () => {
        await expect(
          result.current.requestCheckoutAsync(mockSession),
        ).rejects.toThrow("requestCheckout is not available in this host");
      });
    });

    it("should call onError callback if requestCheckout is unavailable", async () => {
      vi.stubGlobal("openai", {});
      const onError = vi.fn();

      const { result } = renderHook(() => useCheckout());

      act(() => {
        result.current.requestCheckout(mockSession, { onError });
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
        const errorArg = onError.mock.calls[0]?.[0];
        expect(errorArg).toBeInstanceOf(Error);
        expect((errorArg as Error).message).toBe(
          "requestCheckout is not available in this host",
        );
      });
    });
  });

  describe("test payment mode", () => {
    it("should support test payment mode in session", async () => {
      const testSession: CheckoutSessionRequest = {
        ...mockSession,
        payment_mode: "test",
      };
      requestCheckoutMock.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useCheckout());

      await act(async () => {
        result.current.requestCheckout(testSession);
      });

      expect(requestCheckoutMock).toHaveBeenCalledWith(testSession);
    });
  });

  describe("session ID generation", () => {
    it("should generate session ID automatically if not provided", async () => {
      const sessionWithoutId: CheckoutSessionRequest = {
        ...mockSession,
        id: undefined as unknown as string,
      };
      requestCheckoutMock.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useCheckout());

      await act(async () => {
        result.current.requestCheckout(sessionWithoutId);
      });

      // Verify that requestCheckout was called with a session that has an ID
      expect(requestCheckoutMock).toHaveBeenCalled();
      const calledSession = requestCheckoutMock.mock.calls[0]?.[0];
      expect(calledSession).toBeDefined();
      expect(calledSession.id).toBeDefined();
      expect(typeof calledSession.id).toBe("string");
    });

    it("should preserve provided session ID", async () => {
      requestCheckoutMock.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useCheckout());

      await act(async () => {
        result.current.requestCheckout(mockSession);
      });

      expect(requestCheckoutMock).toHaveBeenCalledWith(mockSession);
      const calledSession = requestCheckoutMock.mock.calls[0]?.[0];
      expect(calledSession.id).toBe("checkout_session_123");
    });

    it("should use custom session ID generator", async () => {
      const customIdGenerator = vi.fn(() => "custom_id_999");
      requestCheckoutMock.mockResolvedValueOnce(mockSuccessResponse);

      const sessionWithoutId: CheckoutSessionRequest = {
        ...mockSession,
        id: undefined as unknown as string,
      };

      const { result } = renderHook(() =>
        useCheckout({ checkoutSessionIdGenerator: customIdGenerator }),
      );

      await act(async () => {
        result.current.requestCheckout(sessionWithoutId);
      });

      expect(customIdGenerator).toHaveBeenCalled();
      const calledSession = requestCheckoutMock.mock.calls[0]?.[0];
      expect(calledSession.id).toBe("custom_id_999");
    });

    it("should expose sessionId in return value", async () => {
      requestCheckoutMock.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useCheckout());

      expect(result.current.sessionId).toBeUndefined();

      await act(async () => {
        result.current.requestCheckout(mockSession);
      });

      await waitFor(() => {
        expect(result.current.sessionId).toBe("checkout_session_123");
      });
    });
  });

  describe("direct order access", () => {
    it("should expose order directly in return value", async () => {
      requestCheckoutMock.mockResolvedValueOnce(mockSuccessResponse);

      const { result } = renderHook(() => useCheckout());

      expect(result.current.order).toBeUndefined();

      await act(async () => {
        result.current.requestCheckout(mockSession);
      });

      await waitFor(() => {
        expect(result.current.order).toEqual(mockSuccessResponse.order);
        expect(result.current.order?.id).toBe("order_789");
      });
    });

    it("should have order as undefined when status is not success", async () => {
      const { result } = renderHook(() => useCheckout());

      expect(result.current.order).toBeUndefined();
      expect(result.current.status).toBe("idle");
    });

    it("should have order as undefined on error", async () => {
      requestCheckoutMock.mockResolvedValueOnce(mockErrorResponse);

      const { result } = renderHook(() => useCheckout());

      await act(async () => {
        result.current.requestCheckout(mockSession);
      });

      await waitFor(() => {
        expect(result.current.status).toBe("error");
        expect(result.current.order).toBeUndefined();
      });
    });
  });
});
