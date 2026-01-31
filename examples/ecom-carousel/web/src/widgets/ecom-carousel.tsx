import "@/index.css";

import { useState } from "react";
import {
  mountWidget,
  useLayout,
  useOpenExternal,
  useRequestModal,
  useUser,
  useWidgetState,
} from "skybridge/web";
import { useToolInfo } from "../helpers.js";

const translations: Record<string, Record<string, string>> = {
  en: {
    loading: "Loading products...",
    noProducts: "No product found",
    addToCart: "Add to cart",
    removeFromCart: "Remove",
    checkout: "Checkout",
    orderSummary: "Order summary",
    total: "Total",
  },
  fr: {
    loading: "Chargement des produits...",
    noProducts: "Aucun produit trouvé",
    addToCart: "Ajouter",
    removeFromCart: "Retirer",
    checkout: "Payer",
    orderSummary: "Récapitulatif de commande",
    total: "Total",
  },
  es: {
    loading: "Cargando productos...",
    noProducts: "No se encontraron productos",
    addToCart: "Añadir",
    removeFromCart: "Quitar",
    checkout: "Pagar",
    orderSummary: "Resumen del pedido",
    total: "Total",
  },
  de: {
    loading: "Produkte werden geladen...",
    noProducts: "Keine Produkte gefunden",
    addToCart: "Hinzufügen",
    removeFromCart: "Entfernen",
    checkout: "Zur Kasse",
    orderSummary: "Bestellübersicht",
    total: "Gesamt",
  },
};

const CHECKOUT_URL = "https://alpic.ai";

function EcomCarousel() {
  const { theme } = useLayout();
  const { locale } = useUser();
  const { open, isOpen } = useRequestModal();
  const openExternal = useOpenExternal();

  const lang = locale?.split("-")[0] ?? "en";

  function translate(key: string) {
    return translations[lang]?.[key] ?? translations.en[key];
  }

  const { output, isPending } = useToolInfo<"ecom-carousel">();
  type Product = NonNullable<typeof output>["products"][number];
  const [selected, setSelected] = useState<Product | null>(null);

  const [cart, setCart] = useWidgetState<{ ids: number[] }>({ ids: [] });

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

  if (isOpen) {
    const cartItems: Product[] = [];
    let total = 0;
    for (const p of output.products) {
      if (cart.ids.includes(p.id)) {
        cartItems.push(p);
        total += p.price;
      }
    }
    const checkoutUrl = new URL(CHECKOUT_URL);
    checkoutUrl.searchParams.set("cart", cart.ids.join(","));

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
        <button
          type="button"
          className="checkout-button"
          onClick={() => openExternal(checkoutUrl.toString())}
        >
          {translate("checkout")}
        </button>
      </div>
    );
  }

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

export default EcomCarousel;

mountWidget(<EcomCarousel />);
