import { useTranslate } from "../i18n.js";
import type { Product } from "../types.js";

function SuccessIcon() {
  return (
    <div className="success-icon">
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        role="img"
        aria-label="Success"
      >
        <circle cx="28" cy="28" r="28" fill="currentColor" opacity="0.08" />
        <circle cx="28" cy="28" r="20" fill="currentColor" opacity="0.15" />
        <circle cx="28" cy="28" r="14" fill="currentColor" />
        <path
          d="M21 28.5L25.5 33L35 23"
          stroke="white"
          strokeWidth="2.5"
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
      <div className="success-header">
        <div className="success-title">{t("paymentSuccess")}</div>
        <div className="success-subtitle">
          {items.length === 1
            ? t("itemCount_one")
            : t("itemCount_other").replace("{count}", String(items.length))}
        </div>
      </div>
      <div className="success-divider" />
      <div className="success-items">
        {items.map((item) => (
          <div key={item.id} className="success-item">
            <span className="success-item-name">{item.title}</span>
            <span className="success-item-price">${item.price.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="success-divider" />
      <div className="success-total">
        <span>{t("total")}</span>
        <span>${total.toFixed(2)}</span>
      </div>
    </div>
  );
}
