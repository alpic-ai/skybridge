import "@/index.css";

import { useState } from "react";
import { mountWidget, useLayout, useUser } from "skybridge/web";
import { useToolInfo } from "../helpers.js";

const translations: Record<string, Record<string, string>> = {
  en: {
    loading: "Loading products...",
    noProducts: "No product found",
  },
  fr: {
    loading: "Chargement des produits...",
    noProducts: "Aucun produit trouvé",
  },
  es: {
    loading: "Cargando productos...",
    noProducts: "No se encontraron productos",
  },
  de: {
    loading: "Produkte werden geladen...",
    noProducts: "Keine Produkte gefunden",
  },
};

function EcomCarousel() {
  const { theme } = useLayout();
  const { locale } = useUser();

  const lang = locale?.split("-")[0] ?? "en";

  function translate(key: string) {
    return translations[lang]?.[key] ?? translations.en[key];
  }

  const { output, isPending } = useToolInfo<"ecom-carousel">();
  type Product = NonNullable<typeof output>["products"][number];
  const [selected, setSelected] = useState<Product | null>(null);

  function cn(...classes: string[]) {
    return [theme, ...classes].filter(Boolean).join(" ");
  }

  if (isPending) {
    return (
      <div className={cn("container")}>
        <div className={cn("message")}>{translate("loading")}</div>
      </div>
    );
  }

  if (!output || output.products.length === 0) {
    return (
      <div className={cn("container")}>
        <div className={cn("message")}>{translate("noProducts")}</div>
      </div>
    );
  }

  const activeProduct = selected ?? output.products[0];

  return (
    <div className={cn("container")}>
      <div className={cn("carousel")}>
        {output.products.map((product) => (
          <button
            type="button"
            key={product.id}
            className={cn(
              "product-card",
              activeProduct?.id === product.id ? "selected" : "",
            )}
            onClick={() =>
              setSelected(selected?.id === product.id ? null : product)
            }
          >
            <img
              src={product.image}
              alt={product.title}
              className={cn("product-image")}
            />
            <div className={cn("product-info")}>
              <div className={cn("product-title")}>{product.title}</div>
              <div className={cn("product-price")}>
                ${product.price.toFixed(2)}
              </div>
            </div>
          </button>
        ))}
      </div>
      {activeProduct && (
        <div className={cn("product-detail")}>
          <div className={cn("detail-title")}>{activeProduct.title}</div>
          <div className={cn("detail-rating")}>
            ⭐ {activeProduct.rating.rate} ({activeProduct.rating.count}{" "}
            reviews)
          </div>
          <div className={cn("detail-description")}>
            {activeProduct.description}
          </div>
        </div>
      )}
    </div>
  );
}

export default EcomCarousel;

mountWidget(<EcomCarousel />);
