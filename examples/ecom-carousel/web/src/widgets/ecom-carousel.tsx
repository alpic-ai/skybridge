import "@/index.css";

import { useState } from "react";
import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers";

function EcomCarousel() {
  const { output } = useToolInfo<"ecom-carousel">();
  type Product = NonNullable<typeof output>["products"][number];
  const [selected, setSelected] = useState<Product | null>(null);

  if (!output) {
    return (
      <div className={"container"}>
        <div className="message">Loading products...</div>
      </div>
    );
  }

  if (output.products.length === 0) {
    return (
      <div className={"container"}>
        <div className="message">No product found</div>
      </div>
    );
  }

  const activeProduct = selected ?? output.products[0];

  return (
    <div className="container">
      <div className="carousel">
        {output.products.map((product) => (
          <button
            type="button"
            key={product.id}
            className={`product-card ${activeProduct?.id === product.id ? "selected" : ""}`}
            onClick={() =>
              setSelected(selected?.id === product.id ? null : product)
            }
          >
            <img
              src={product.image}
              alt={product.title}
              className="product-image"
            />
            <div className="product-info">
              <div className="product-title">{product.title}</div>
              <div className="product-price">${product.price.toFixed(2)}</div>
            </div>
          </button>
        ))}
      </div>
      {activeProduct && (
        <div className="product-detail">
          <div className="detail-title">{activeProduct.title}</div>
          <div className="detail-rating">
            ⭐ {activeProduct.rating.rate} ({activeProduct.rating.count}{" "}
            reviews)
          </div>
          <div className="detail-description">{activeProduct.description}</div>
        </div>
      )}
    </div>
  );
}

export default EcomCarousel;

mountWidget(<EcomCarousel />);
