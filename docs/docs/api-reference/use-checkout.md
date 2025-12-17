---
sidebar_position: 2
---

# useCheckout

The `useCheckout` hook enables [Instant Checkout](https://platform.openai.com/docs/actions/monetization) in ChatGPT apps, allowing users to complete purchases directly within ChatGPT. It wraps [`window.openai.requestCheckout`](https://developers.openai.com/apps-sdk/build/chatgpt-ui#instant-checkout) with type-safe state management following the [ACP (Agentic Commerce Protocol) specification](https://developers.openai.com/commerce/specs/checkout).

:::note
Instant Checkout is currently in private beta and limited to select marketplace partners.
:::

## Basic usage

```tsx
import { useCheckout, CheckoutSessionRequest } from "skybridge/web";

function CheckoutButton({ session }: { session: CheckoutSessionRequest }) {
  const { requestCheckout, isPending, isSuccess, data } = useCheckout();

  return (
    <div>
      <button
        disabled={isPending}
        onClick={() => requestCheckout(session)}
      >
        {isPending ? "Processing..." : "Checkout"}
      </button>
      {isSuccess && <p>Order completed: {data.order.id}</p>}
    </div>
  );
}
```

## Parameters

```tsx
const {
  data,
  error,
  isError,
  isIdle,
  isPending,
  isSuccess,
  status,
  requestCheckout,
  requestCheckoutAsync,
} = useCheckout();

requestCheckout(session, {
  onError,
  onSettled,
  onSuccess,
});

await requestCheckoutAsync(session);
```

## Returns

### `requestCheckout`

```tsx
requestCheckout: (session: CheckoutSessionRequest, sideEffects?: CheckoutSideEffects) => void
```

Initiates the checkout flow. Opens the ChatGPT Instant Checkout UI with the provided session data.

- `session: CheckoutSessionRequest`
  - **Required**
  - The checkout session configuration (see [Checkout Session](#checkout-session) below)
- `sideEffects: CheckoutSideEffects`
  - Optional callbacks:
    - `onSuccess: (data: CheckoutSuccessResponse) => void` - Fires on successful checkout
    - `onError: (error: CheckoutErrorResponse | Error) => void` - Fires on checkout failure
    - `onSettled: (data, error) => void` - Fires when checkout completes (success or error)

### `requestCheckoutAsync`

```tsx
requestCheckoutAsync: (session: CheckoutSessionRequest) => Promise<CheckoutSuccessResponse>
```

Same as `requestCheckout` but returns a promise for async/await usage.

### `status`

```tsx
status: "idle" | "pending" | "success" | "error"
```

- `idle` - Initial state, no checkout initiated
- `pending` - Checkout UI is open, awaiting user action
- `success` - Checkout completed successfully
- `error` - Checkout failed or was cancelled

### `isIdle`, `isPending`, `isSuccess`, `isError`

```tsx
isIdle: boolean;
isPending: boolean;
isSuccess: boolean;
isError: boolean;
```

Boolean flags derived from `status` for convenience.

### `data`

```tsx
data: CheckoutSuccessResponse | undefined
```

The successful checkout response. Only available when `status` is `"success"`.

```tsx
type CheckoutSuccessResponse = {
  id: string;              // Checkout session ID
  status: "completed";
  currency: string;
  order: {
    id: string;                    // Order ID
    checkout_session_id: string;
    permalink_url?: string;        // Link to order confirmation
    created_at?: string;
    status?: CheckoutOrderStatus;
  };
};
```

### `error`

```tsx
error: CheckoutErrorResponse | Error | undefined
```

The error if checkout failed. Only available when `status` is `"error"`.

```tsx
type CheckoutErrorResponse = {
  code: CheckoutErrorCode;  // "payment_declined" | "requires_3ds" | "cancelled" | ...
  message: string;
};
```

## Checkout Session

The `CheckoutSessionRequest` defines what the user is purchasing:

```tsx
type CheckoutSessionRequest = {
  id: string;                              // Unique session ID
  payment_provider: {
    provider: string;                      // PSP name (e.g., "stripe", "adyen")
    merchant_id: string;                   // Your merchant ID from PSP
    supported_payment_methods?: SupportedPaymentMethod[];
  };
  status: CheckoutSessionStatus;           // Usually "ready_for_payment"
  currency: string;                        // ISO 4217 code (e.g., "USD")
  totals: CheckoutTotal[];                 // Price breakdown
  links?: CheckoutLink[];                  // Legal/policy links
  payment_mode?: "live" | "test";          // Use "test" for test cards
  line_items?: CheckoutLineItem[];         // Items being purchased
  merchant_name?: string;
  order_reference?: string;
};
```

## Examples

### With Side Effects

```tsx
import { useCheckout, CheckoutSessionRequest } from "skybridge/web";

function CheckoutWidget({ session }: { session: CheckoutSessionRequest }) {
  const { requestCheckout, isPending, isError, error } = useCheckout();

  const handleCheckout = () => {
    requestCheckout(session, {
      onSuccess: (data) => {
        console.log("Order completed:", data.order.id);
      },
      onError: (error) => {
        if ("code" in error) {
          console.error("Checkout error:", error.code, error.message);
        } else {
          console.error("Unexpected error:", error.message);
        }
      },
    });
  };

  return (
    <div>
      <button disabled={isPending} onClick={handleCheckout}>
        {isPending ? "Processing..." : "Complete Purchase"}
      </button>
      {isError && <p>Error: {"message" in error ? error.message : String(error)}</p>}
    </div>
  );
}
```

### Async/Await Pattern

```tsx
import { useCheckout, CheckoutSessionRequest } from "skybridge/web";

function AsyncCheckout({ session }: { session: CheckoutSessionRequest }) {
  const { requestCheckoutAsync, isPending } = useCheckout();

  const handleCheckout = async () => {
    try {
      const result = await requestCheckoutAsync(session);
      console.log("Order ID:", result.order.id);
      // Redirect to confirmation or update UI
    } catch (error) {
      console.error("Checkout failed:", error);
    }
  };

  return (
    <button disabled={isPending} onClick={handleCheckout}>
      Pay Now
    </button>
  );
}
```

### Building a Checkout Session

```tsx
import { useCheckout, CheckoutSessionRequest } from "skybridge/web";

function ProductCheckout({ productId, price }: { productId: string; price: number }) {
  const { requestCheckout, isPending } = useCheckout();

  const handleCheckout = () => {
    const session: CheckoutSessionRequest = {
      id: `checkout_${Date.now()}`,
      payment_provider: {
        provider: "stripe",
        merchant_id: "your_merchant_id",
        supported_payment_methods: ["card", "apple_pay", "google_pay"],
      },
      status: "ready_for_payment",
      currency: "USD",
      totals: [
        { type: "subtotal", display_text: "Subtotal", amount: price },
        { type: "tax", display_text: "Tax", amount: Math.round(price * 0.08) },
        { type: "total", display_text: "Total", amount: Math.round(price * 1.08) },
      ],
      links: [
        { type: "terms_of_use", url: "https://example.com/terms" },
        { type: "privacy_policy", url: "https://example.com/privacy" },
      ],
      payment_mode: "live",
    };

    requestCheckout(session);
  };

  return (
    <button disabled={isPending} onClick={handleCheckout}>
      Buy for ${(price / 100).toFixed(2)}
    </button>
  );
}
```

### Test Mode

Use `payment_mode: "test"` to test with test cards (e.g., 4242 4242 4242 4242):

```tsx
const testSession: CheckoutSessionRequest = {
  // ...other fields
  payment_mode: "test",
};
```

## Related

- [OpenAI Monetization Docs](https://platform.openai.com/docs/actions/monetization)
- [ACP Checkout Specification](https://developers.openai.com/commerce/specs/checkout)
- [Stripe Agentic Commerce](https://docs.stripe.com/agentic-commerce/apps)
- [Adyen Agentic Commerce](https://docs.adyen.com/online-payments/agentic-commerce)
