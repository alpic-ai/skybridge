import { useCallback, useEffect, useRef, useState } from "react";
import { useSendFollowUpMessage } from "skybridge/web";
import { useCallTool } from "../helpers.js";

export type CheckoutPhase = "idle" | "polling" | "complete" | "expired";

type CheckoutState =
  | { phase: "idle" }
  | { phase: "polling"; sessionId: string }
  | { phase: "complete" }
  | { phase: "expired" };

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

interface Product {
  id: number;
  title: string;
  price: number;
}

export function useCheckoutPolling(cartIds: number[], products: Product[]) {
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    phase: "idle",
  });

  const sendFollowUpMessage = useSendFollowUpMessage();
  const { callToolAsync: checkStatus } = useCallTool("check-checkout-status");

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cartIdsRef = useRef(cartIds);
  const productsRef = useRef(products);
  cartIdsRef.current = cartIds;
  productsRef.current = products;

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startPolling = useCallback(
    (sessionId: string) => {
      stopPolling();
      setCheckoutState({ phase: "polling", sessionId });

      pollingRef.current = setInterval(async () => {
        try {
          const result = await checkStatus({ sessionId });
          const status = result.structuredContent?.status;
          if (status === "complete") {
            stopPolling();
            setCheckoutState({ phase: "complete" });

            const cartItems = productsRef.current.filter((p) =>
              cartIdsRef.current.includes(p.id),
            );
            let total = 0;
            for (const item of cartItems) {
              total += item.price;
            }
            sendFollowUpMessage(
              `Payment completed! Customer purchased ${cartItems.length} item(s) for a total of $${total.toFixed(2)}: ${cartItems.map((p) => p.title).join(", ")}`,
            );
          } else if (status === "expired") {
            stopPolling();
            setCheckoutState({ phase: "expired" });
            sendFollowUpMessage("Customer's checkout session expired.");
          }
        } catch {
          // Stripe may temporarily error — keep polling
        }
      }, POLL_INTERVAL_MS);

      timeoutRef.current = setTimeout(() => {
        stopPolling();
        setCheckoutState((prev) =>
          prev.phase === "polling" ? { phase: "expired" } : prev,
        );
      }, POLL_TIMEOUT_MS);
    },
    [stopPolling, checkStatus, sendFollowUpMessage],
  );

  const reset = useCallback(() => {
    stopPolling();
    setCheckoutState({ phase: "idle" });
  }, [stopPolling]);

  return {
    phase: checkoutState.phase,
    startPolling,
    reset,
  };
}
