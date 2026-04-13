import { useTranslate } from "../i18n.js";
import type { Product } from "../types.js";

function SuccessIcon() {
  return (
    <div className="success-icon">
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        role="img"
        aria-label="Success"
      >
        <circle cx="24" cy="24" r="24" fill="#248a52" opacity="0.12" />
        <circle cx="24" cy="24" r="18" fill="#248a52" opacity="0.2" />
        <path
          d="M16 24.5L21.5 30L32 19"
          stroke="#248a52"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function PaymentSuccess({ items }: { items: Product[] }) {
  const t = useTranslate();

  let total = 0;
  for (const p of items) {
    total += p.price;
  }

  return (
    <div className="success-card">
      <SuccessIcon />
      <div className="success-title">{t("paymentSuccess")}</div>
      <div className="success-items">
        {items.map((item) => (
          <div key={item.id} className="success-item">
            <span className="success-item-name">{item.title}</span>
            <span className="success-item-price">${item.price.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="success-total">
        <span>{t("total")}</span>
        <span>${total.toFixed(2)}</span>
      </div>
    </div>
  );
}
