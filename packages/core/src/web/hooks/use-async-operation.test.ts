import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAsyncOperation } from "./use-async-operation.js";

describe("useAsyncOperation", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("initial state", () => {
    it("should start in idle state", () => {
      const { result } = renderHook(() => useAsyncOperation());

      expect(result.current.state.status).toBe("idle");
      expect(result.current.state.isIdle).toBe(true);
      expect(result.current.state.isPending).toBe(false);
      expect(result.current.state.isSuccess).toBe(false);
      expect(result.current.state.isError).toBe(false);
      expect(result.current.state.data).toBeUndefined();
      expect(result.current.state.error).toBeUndefined();
    });
  });

  describe("successful execution", () => {
    it("should transition from idle -> pending -> success", async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());
      const mockData = "success data";

      let resolveOperation: (value: string) => void;
      const operationPromise = new Promise<string>((resolve) => {
        resolveOperation = resolve;
      });

      // Start execution
      act(() => {
        result.current.execute(() => operationPromise);
      });

      // Should be in pending state
      expect(result.current.state.status).toBe("pending");
      expect(result.current.state.isPending).toBe(true);
      expect(result.current.state.data).toBeUndefined();

      // Resolve the operation
      await act(async () => {
        resolveOperation(mockData);
        await operationPromise;
      });

      // Should be in success state
      await waitFor(() => {
        expect(result.current.state.status).toBe("success");
        expect(result.current.state.isSuccess).toBe(true);
        expect(result.current.state.data).toBe(mockData);
        expect(result.current.state.error).toBeUndefined();
      });
    });

    it("should return the result from execute", async () => {
      const { result } = renderHook(() => useAsyncOperation<number>());
      const expectedValue = 42;

      let actualValue: number | undefined;
      await act(async () => {
        actualValue = await result.current.execute(async () => expectedValue);
      });

      expect(actualValue).toBe(expectedValue);
    });
  });

  describe("failed execution", () => {
    it("should transition from idle -> pending -> error", async () => {
      const { result } = renderHook(() => useAsyncOperation<string, Error>());
      const mockError = new Error("operation failed");

      let rejectOperation: (error: Error) => void;
      const operationPromise = new Promise<string>((_resolve, reject) => {
        rejectOperation = reject;
      });

      // Start execution
      act(() => {
        result.current
          .execute(() => operationPromise)
          .catch(() => {
            // Prevent unhandled rejection
          });
      });

      // Should be in pending state
      expect(result.current.state.status).toBe("pending");
      expect(result.current.state.isPending).toBe(true);

      // Reject the operation
      await act(async () => {
        rejectOperation(mockError);
        try {
          await operationPromise;
        } catch {
          // Expected
        }
      });

      // Should be in error state
      await waitFor(() => {
        expect(result.current.state.status).toBe("error");
        expect(result.current.state.isError).toBe(true);
        expect(result.current.state.error).toBe(mockError);
        expect(result.current.state.data).toBeUndefined();
      });
    });

    it("should throw the error from execute", async () => {
      const { result } = renderHook(() => useAsyncOperation<number, Error>());
      const expectedError = new Error("test error");

      await act(async () => {
        await expect(
          result.current.execute(async () => {
            throw expectedError;
          }),
        ).rejects.toThrow(expectedError);
      });
    });
  });

  describe("deduplication", () => {
    it("should not enable deduplication by default", async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());

      // Execute first operation
      await act(async () => {
        await result.current.execute(async () => "first");
      });
      expect(result.current.state.data).toBe("first");

      // Execute second operation
      await act(async () => {
        await result.current.execute(async () => "second");
      });
      expect(result.current.state.data).toBe("second");
    });

    it("should deduplicate rapid calls when enabled", async () => {
      const { result } = renderHook(() =>
        useAsyncOperation<string>({ enableDeduplication: true }),
      );

      let resolveFirst: (value: string) => void;
      let resolveSecond: (value: string) => void;

      const firstPromise = new Promise<string>((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise<string>((resolve) => {
        resolveSecond = resolve;
      });

      // Start first operation
      act(() => {
        result.current.execute(() => firstPromise);
      });

      // Start second operation (should supersede first)
      act(() => {
        result.current.execute(() => secondPromise);
      });

      expect(result.current.state.status).toBe("pending");

      // Resolve first operation (should be ignored)
      await act(async () => {
        resolveFirst("first");
        await firstPromise;
      });

      // State should still be pending because second is newer
      expect(result.current.state.status).toBe("pending");
      expect(result.current.state.data).toBeUndefined();

      // Resolve second operation (should update state)
      await act(async () => {
        resolveSecond("second");
        await secondPromise;
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe("success");
        expect(result.current.state.data).toBe("second");
      });
    });

    it("should ignore errors from superseded operations", async () => {
      const { result } = renderHook(() =>
        useAsyncOperation<string, Error>({ enableDeduplication: true }),
      );

      let rejectFirst: (error: Error) => void;
      let resolveSecond: (value: string) => void;

      const firstPromise = new Promise<string>((_resolve, reject) => {
        rejectFirst = reject;
      });
      const secondPromise = new Promise<string>((resolve) => {
        resolveSecond = resolve;
      });

      // Start first operation
      act(() => {
        result.current
          .execute(() => firstPromise)
          .catch(() => {
            // Prevent unhandled rejection
          });
      });

      // Start second operation (should supersede first)
      act(() => {
        result.current.execute(() => secondPromise);
      });

      // Reject first operation (should be ignored)
      await act(async () => {
        rejectFirst(new Error("first error"));
        try {
          await firstPromise;
        } catch {
          // Expected
        }
      });

      // State should still be pending (error was ignored)
      expect(result.current.state.status).toBe("pending");
      expect(result.current.state.error).toBeUndefined();

      // Resolve second operation
      await act(async () => {
        resolveSecond("second");
        await secondPromise;
      });

      await waitFor(() => {
        expect(result.current.state.status).toBe("success");
        expect(result.current.state.data).toBe("second");
      });
    });

    it("should handle multiple rapid calls with deduplication", async () => {
      const { result } = renderHook(() =>
        useAsyncOperation<number>({ enableDeduplication: true }),
      );

      const resolvers: Array<() => void> = [];
      const promises = [1, 2, 3, 4, 5].map(
        (n) =>
          new Promise<number>((resolve) => {
            resolvers.push(() => resolve(n));
          }),
      );

      // Start all operations rapidly
      act(() => {
        promises.forEach((promise) => {
          result.current.execute(() => promise);
        });
      });

      expect(result.current.state.status).toBe("pending");

      // Resolve all operations
      await act(async () => {
        for (const resolver of resolvers) {
          resolver();
        }
        await Promise.all(promises);
      });

      // Only the last operation should update state
      await waitFor(() => {
        expect(result.current.state.status).toBe("success");
        expect(result.current.state.data).toBe(5);
      });
    });
  });

  describe("state transitions", () => {
    it("should clear previous data when starting new operation", async () => {
      const { result } = renderHook(() => useAsyncOperation<string>());

      // First successful operation
      await act(async () => {
        await result.current.execute(async () => "first data");
      });
      expect(result.current.state.data).toBe("first data");

      // Start second operation
      let resolveSecond: (value: string) => void;
      const secondPromise = new Promise<string>((resolve) => {
        resolveSecond = resolve;
      });

      act(() => {
        result.current.execute(() => secondPromise);
      });

      // Data should be cleared in pending state
      expect(result.current.state.status).toBe("pending");
      expect(result.current.state.data).toBeUndefined();

      // Complete second operation
      await act(async () => {
        resolveSecond("second data");
        await secondPromise;
      });

      await waitFor(() => {
        expect(result.current.state.data).toBe("second data");
      });
    });

    it("should clear previous error when starting new operation", async () => {
      const { result } = renderHook(() => useAsyncOperation<string, Error>());

      // First failed operation
      await act(async () => {
        try {
          await result.current.execute(async () => {
            throw new Error("first error");
          });
        } catch {
          // Expected
        }
      });
      expect(result.current.state.error).toBeDefined();

      // Start second operation
      let resolveSecond: (value: string) => void;
      const secondPromise = new Promise<string>((resolve) => {
        resolveSecond = resolve;
      });

      act(() => {
        result.current.execute(() => secondPromise);
      });

      // Error should be cleared in pending state
      expect(result.current.state.status).toBe("pending");
      expect(result.current.state.error).toBeUndefined();

      // Complete second operation
      await act(async () => {
        resolveSecond("success");
        await secondPromise;
      });

      await waitFor(() => {
        expect(result.current.state.data).toBe("success");
      });
    });
  });

  describe("type safety", () => {
    it("should maintain correct types for data", async () => {
      type CustomData = { id: string; value: number };
      const { result } = renderHook(() => useAsyncOperation<CustomData>());

      const testData: CustomData = { id: "test", value: 42 };

      await act(async () => {
        await result.current.execute(async () => testData);
      });

      // Type should be CustomData | undefined in success state
      expect(result.current.state.data).toEqual(testData);
      if (result.current.state.isSuccess) {
        expect(result.current.state.data.id).toBe("test");
        expect(result.current.state.data.value).toBe(42);
      }
    });

    it("should maintain correct types for error", async () => {
      type CustomError = { code: string; message: string };
      const { result } = renderHook(() =>
        useAsyncOperation<string, CustomError>(),
      );

      const testError: CustomError = {
        code: "TEST_ERROR",
        message: "Test error message",
      };

      await act(async () => {
        try {
          await result.current.execute(async () => {
            throw testError;
          });
        } catch {
          // Expected
        }
      });

      // Type should be CustomError | undefined in error state
      expect(result.current.state.error).toEqual(testError);
      if (result.current.state.isError) {
        expect(result.current.state.error.code).toBe("TEST_ERROR");
        expect(result.current.state.error.message).toBe("Test error message");
      }
    });
  });
});
