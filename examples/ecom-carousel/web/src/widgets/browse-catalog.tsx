import "@/index.css";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  mountWidget,
  useLayout,
  useOpenExternal,
  useRequestModal,
  useSendFollowUpMessage,
  useUser,
  useWidgetState,
} from "skybridge/web";
import { useCallTool, useToolInfo } from "../helpers.js";

const translations: Record<string, Record<string, string>> = {
  en: {
    loading: "Loading products...",
    noProducts: "No product found",
    addToCart: "Add to cart",
    removeFromCart: "Remove",
    checkout: "Checkout",
    orderSummary: "Order summary",
    total: "Total",
    payWithStripe: "Pay with Stripe",
    creatingSession: "Creating session...",
    waitingForPayment: "Waiting for payment...",
    paymentSuccess: "Payment successful!",
    paymentExpired: "Checkout session expired",
    backToProducts: "Back to products",
  },
  fr: {
    loading: "Chargement des produits...",
    noProducts: "Aucun produit trouvé",
    addToCart: "Ajouter",
    removeFromCart: "Retirer",
    checkout: "Payer",
    orderSummary: "Récapitulatif de commande",
    total: "Total",
    payWithStripe: "Payer avec Stripe",
    creatingSession: "Création de la session...",
    waitingForPayment: "En attente du paiement...",
    paymentSuccess: "Paiement réussi !",
    paymentExpired: "Session de paiement expirée",
    backToProducts: "Retour aux produits",
  },
  es: {
    loading: "Cargando productos...",
    noProducts: "No se encontraron productos",
    addToCart: "Añadir",
    removeFromCart: "Quitar",
    checkout: "Pagar",
    orderSummary: "Resumen del pedido",
    total: "Total",
    payWithStripe: "Pagar con Stripe",
    creatingSession: "Creando sesión...",
    waitingForPayment: "Esperando el pago...",
    paymentSuccess: "Pago exitoso!",
    paymentExpired: "Sesión de pago expirada",
    backToProducts: "Volver a productos",
  },
  de: {
    loading: "Produkte werden geladen...",
    noProducts: "Keine Produkte gefunden",
    addToCart: "Hinzufügen",
    removeFromCart: "Entfernen",
    checkout: "Zur Kasse",
    orderSummary: "Bestellübersicht",
    total: "Gesamt",
    payWithStripe: "Mit Stripe bezahlen",
    creatingSession: "Sitzung wird erstellt...",
    waitingForPayment: "Warte auf Zahlung...",
    paymentSuccess: "Zahlung erfolgreich!",
    paymentExpired: "Zahlungssitzung abgelaufen",
    backToProducts: "Zurück zu Produkten",
  },
};

type CheckoutState =
  | { phase: "idle" }
  | { phase: "polling"; sessionId: string }
  | { phase: "complete" }
  | { phase: "expired" };

const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

function BrowseCatalog() {
  const { theme } = useLayout();
  const { locale } = useUser();
  const { open, isOpen } = useRequestModal();
  const openExternal = useOpenExternal();
  const sendFollowUpMessage = useSendFollowUpMessage();

  const lang = locale?.split("-")[0] ?? "en";

  function translate(key: string) {
    return translations[lang]?.[key] ?? translations.en[key];
  }

  const { output, isPending } = useToolInfo<"browse-catalog">();
  type Product = NonNullable<typeof output>["products"][number];
  const [selected, setSelected] = useState<Product | null>(null);

  const [cart, setCart] = useWidgetState<{ ids: number[] }>({ ids: [] });
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({
    phase: "idle",
  });

  const { callTool: createCheckout, isPending: checkoutPending } =
    useCallTool("create-checkout");

  const { callToolAsync: checkStatus } = useCallTool("check-checkout-status");

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function startPolling(sessionId: string) {
    stopPolling();
    setCheckoutState({ phase: "polling", sessionId });

    pollingRef.current = setInterval(async () => {
      try {
        const result = await checkStatus({ sessionId });
        const status = result.structuredContent?.status;
        if (status === "complete") {
          stopPolling();
          setCheckoutState({ phase: "complete" });

          const cartItems = (output?.products ?? []).filter((p) =>
            cart.ids.includes(p.id),
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
      if (checkoutState.phase === "polling") {
        setCheckoutState({ phase: "expired" });
      }
    }, POLL_TIMEOUT_MS);
  }

  function resetCheckout() {
    stopPolling();
    setCheckoutState({ phase: "idle" });
    setCart({ ids: [] });
  }

  function toggleCart(productId: number) {
    if (cart.ids.includes(productId)) {
      setCart({ ids: cart.ids.filter((id) => id !== productId) });
    } else {
      setCart({ ids: [...cart.ids, productId] });
    }
  }

  if (isPending) {
    return (
      <div className={`${theme} container`}>
        <div className="message">{translate("loading")}</div>
      </div>
    );
  }

  if (!output || output.products.length === 0) {
    return (
      <div className={`${theme} container`}>
        <div className="message">{translate("noProducts")}</div>
      </div>
    );
  }

  // Payment result views
  if (checkoutState.phase === "complete") {
    const paidItems = output.products.filter((p) => cart.ids.includes(p.id));
    let paidTotal = 0;
    for (const p of paidItems) {
      paidTotal += p.price;
    }

    return (
      <div className={`${theme} checkout`}>
        <div className="success-card">
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
          <div className="success-title">{translate("paymentSuccess")}</div>
          <div className="success-items">
            {paidItems.map((item) => (
              <div key={item.id} className="success-item">
                <span className="success-item-name">{item.title}</span>
                <span className="success-item-price">
                  ${item.price.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="success-total">
            <span>{translate("total")}</span>
            <span>${paidTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }

  if (checkoutState.phase === "expired") {
    return (
      <div className={`${theme} checkout`}>
        <div className="checkout-status expired">
          {translate("paymentExpired")}
        </div>
        <button
          type="button"
          className="checkout-button"
          onClick={resetCheckout}
        >
          {translate("backToProducts")}
        </button>
      </div>
    );
  }

  // Checkout summary view
  if (isOpen) {
    const cartItems: Product[] = [];
    let total = 0;
    for (const p of output.products) {
      if (cart.ids.includes(p.id)) {
        cartItems.push(p);
        total += p.price;
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

    const isPolling = checkoutState.phase === "polling";

    return (
      <div className={`${theme} checkout`}>
        <div className="checkout-title">{translate("orderSummary")}</div>
        <div className="checkout-items">
          {cartItems.map((item) => (
            <div key={item.id} className="checkout-item">
              <span>{item.title}</span>
              <span>${item.price.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="checkout-total">
          <span>{translate("total")}</span>
          <span>${total.toFixed(2)}</span>
        </div>
        {isPolling ? (
          <button type="button" className="checkout-button polling" disabled>
            <span className="spinner" /> {translate("waitingForPayment")}
          </button>
        ) : (
          <button
            type="button"
            className="checkout-button"
            onClick={handlePay}
            disabled={checkoutPending}
          >
            {checkoutPending
              ? translate("creatingSession")
              : translate("payWithStripe")}
          </button>
        )}
      </div>
    );
  }

  // Product grid view
  const activeProduct = selected ?? output.products[0];

  return (
    <div className={`${theme} container`}>
      <button
        type="button"
        className="cart-indicator"
        onClick={() => open({ title: "Proceed to checkout ?" })}
        disabled={cart.ids.length === 0}
      >
        🛒 {cart.ids.length}
      </button>
      <div className="carousel">
        {output.products.map((product) => {
          const inCart = cart.ids.includes(product.id);
          return (
            <div key={product.id} className="product-wrapper">
              <button
                type="button"
                className={`product-card ${activeProduct?.id === product.id ? "selected" : ""}`}
                onClick={() => setSelected(product)}
              >
                <img
                  src={product.image}
                  alt={product.title}
                  className="product-image"
                />
                <div className="product-info">
                  <div className="product-title">{product.title}</div>
                  <div className="product-price">
                    ${product.price.toFixed(2)}
                  </div>
                </div>
              </button>
              <button
                type="button"
                className={`cart-button ${inCart ? "in-cart" : ""}`}
                onClick={() => toggleCart(product.id)}
              >
                {inCart ? translate("removeFromCart") : translate("addToCart")}
              </button>
            </div>
          );
        })}
      </div>
      <div className="product-detail">
        <div className="detail-title">{activeProduct.title}</div>
        <div className="detail-rating">
          ⭐ {activeProduct.rating.rate} ({activeProduct.rating.count} reviews)
        </div>
        <div className="detail-description">{activeProduct.description}</div>
      </div>
    </div>
  );
}

export default BrowseCatalog;

mountWidget(<BrowseCatalog />);
