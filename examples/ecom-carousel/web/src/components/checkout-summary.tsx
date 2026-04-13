import type { CheckoutPhase } from "../hooks/use-checkout-polling.js";
import { useTranslate } from "../i18n.js";
import type { Product } from "../types.js";

interface CheckoutSummaryProps {
  items: Product[];
  phase: CheckoutPhase;
  checkoutPending: boolean;
  onPay: () => void;
}

export function CheckoutSummary({
  items,
  phase,
  checkoutPending,
  onPay,
}: CheckoutSummaryProps) {
  const t = useTranslate();

  let total = 0;
  for (const p of items) {
    total += p.price;
  }

  const isPolling = phase === "polling";

  return (
    <>
      <div className="checkout-title">{t("orderSummary")}</div>
      <div className="checkout-items">
        {items.map((item) => (
          <div key={item.id} className="checkout-item">
            <span>{item.title}</span>
            <span>${item.price.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="checkout-total">
        <span>{t("total")}</span>
        <span>${total.toFixed(2)}</span>
      </div>
      {isPolling ? (
        <button type="button" className="checkout-button polling" disabled>
          <span className="spinner" /> {t("waitingForPayment")}
        </button>
      ) : (
        <button
          type="button"
          className="checkout-button"
          onClick={onPay}
          disabled={checkoutPending}
        >
          {checkoutPending ? t("creatingSession") : t("payWithStripe")}
        </button>
      )}
    </>
  );
}
