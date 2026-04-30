import { useState } from "react";
import { useTranslate } from "../i18n.js";
import type { Product } from "../types.js";

interface ProductCarouselProps {
  products: Product[];
  cartIds: number[];
  onToggleCart: (productId: number) => void;
  onCheckout: () => void;
}

export function ProductCarousel({
  products,
  cartIds,
  onToggleCart,
  onCheckout,
}: ProductCarouselProps) {
  const t = useTranslate();
  const [selected, setSelected] = useState<Product | null>(null);
  const activeProduct = selected ?? products[0];

  return (
    <>
      <button
        type="button"
        className="cart-indicator"
        onClick={onCheckout}
        disabled={cartIds.length === 0}
      >
        🛒 {cartIds.length}
      </button>
      <div className="carousel">
        {products.map((product) => {
          const inCart = cartIds.includes(product.id);
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
                onClick={() => onToggleCart(product.id)}
              >
                {inCart ? t("removeFromCart") : t("addToCart")}
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
    </>
  );
}
