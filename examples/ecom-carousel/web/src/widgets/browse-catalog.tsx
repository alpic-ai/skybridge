import "@/index.css";

import {
  mountWidget,
  useLayout,
  useOpenExternal,
  useRequestModal,
  useWidgetState,
} from "skybridge/web";
import { CheckoutSummary } from "../components/checkout-summary.js";
import { PaymentSuccess } from "../components/payment-success.js";
import { ProductCarousel } from "../components/product-carousel.js";
import { useCallTool, useToolInfo } from "../helpers.js";
import { useCheckoutPolling } from "../hooks/use-checkout-polling.js";
import { useTranslate } from "../i18n.js";

function BrowseCatalog() {
  const { theme } = useLayout();
  const t = useTranslate();
  const { open, isOpen } = useRequestModal();
  const openExternal = useOpenExternal();

  const { output, isPending } = useToolInfo<"browse-catalog">();

  const [cart, setCart] = useWidgetState<{ ids: number[] }>({ ids: [] });

  const { callTool: createCheckout, isPending: checkoutPending } =
    useCallTool("create-checkout");

  const { phase, startPolling, reset } = useCheckoutPolling();

  function toggleCart(productId: number) {
    if (cart.ids.includes(productId)) {
      setCart({ ids: cart.ids.filter((id) => id !== productId) });
    } else {
      setCart({ ids: [...cart.ids, productId] });
    }
  }

  function handlePay() {
    createCheckout(
      { productIds: cart.ids },
      {
        onSuccess: (result) => {
          const url = result.structuredContent?.checkoutUrl;
          const sid = result.structuredContent?.sessionId;
          if (typeof url === "string") {
            openExternal(url);
          }
          if (typeof sid === "string") {
            startPolling(sid);
          }
        },
      },
    );
  }

  function resetCheckout() {
    reset();
    setCart({ ids: [] });
  }

  if (isPending) {
    return (
      <div className={`${theme} container`}>
        <div className="message">{t("loading")}</div>
      </div>
    );
  }

  if (!output || output.products.length === 0) {
    return (
      <div className={`${theme} container`}>
        <div className="message">{t("noProducts")}</div>
      </div>
    );
  }

  if (phase === "complete") {
    const paidItems = output.products.filter((p) => cart.ids.includes(p.id));
    return (
      <div className={`${theme} checkout`}>
        <PaymentSuccess items={paidItems} />
        <button
          type="button"
          className="checkout-button"
          onClick={resetCheckout}
        >
          {t("backToProducts")}
        </button>
      </div>
    );
  }

  if (phase === "expired") {
    return (
      <div className={`${theme} checkout`}>
        <div className="checkout-status expired">{t("paymentExpired")}</div>
        <button
          type="button"
          className="checkout-button"
          onClick={resetCheckout}
        >
          {t("backToProducts")}
        </button>
      </div>
    );
  }

  if (isOpen) {
    const cartItems = output.products.filter((p) => cart.ids.includes(p.id));
    return (
      <div className={`${theme} checkout`}>
        <CheckoutSummary
          items={cartItems}
          phase={phase}
          checkoutPending={checkoutPending}
          onPay={handlePay}
        />
      </div>
    );
  }

  return (
    <div className={`${theme} container`}>
      <ProductCarousel
        products={output.products}
        cartIds={cart.ids}
        onToggleCart={toggleCart}
        onCheckout={() => open({ title: "Proceed to checkout ?" })}
      />
    </div>
  );
}

export default BrowseCatalog;

mountWidget(<BrowseCatalog />);
