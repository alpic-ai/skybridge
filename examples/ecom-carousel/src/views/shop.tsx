import "../index.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDeepLink } from "skybridge/web";
import { EmptyState } from "../components/empty-state";
import { KitActions } from "../components/kit-actions";
import { ProductCard, ProductCardSkeleton } from "../components/product-card";
import { ViewFrame } from "../components/view-frame";
import { useCallTool, useToolInfo } from "../helpers.js";
import { formatPrice } from "../lib/format";
import { useKit, variantOptions } from "../lib/kit";
import { preferenceSelection } from "../lib/kit-state";
import { initialSelection } from "../lib/variants";
import type { Product } from "../tools/render-carousel.js";
import { Carousel } from "./carousel/carousel";
import { DetailView } from "./carousel/detail";
import * as styles from "./shop.css";

export function ShopWorkspace() {
  const { responseMetadata, input } = useToolInfo<"shop">();
  const metadataProductId = responseMetadata?.selectedProductId;
  const requestedProductId =
    typeof metadataProductId === "string"
      ? metadataProductId
      : (input?.productId ?? null);
  const defaultKit =
    input?.action === "kit" || responseMetadata?.presentation === "kit";
  const lookup = useCallTool("shop");
  const lookupCall = useRef(lookup.callTool);
  lookupCall.current = lookup.callTool;
  const requestedLink = useRef<string | null>(null);
  const latestLink = useRef<string | undefined>(undefined);
  const [linkedProducts, setLinkedProducts] = useState<Product[]>([]);
  const choice = useCallTool("shop", { timeout: 10 * 60 * 1000 });
  const [choiceMessage, setChoiceMessage] = useState("");
  const products = useMemo(() => {
    const original = responseMetadata?.products ?? [];
    return [
      ...original,
      ...linkedProducts.filter(
        (linked) => !original.some((product) => product.id === linked.id),
      ),
    ];
  }, [responseMetadata, linkedProducts]);
  const preferences = responseMetadata?.preferences;
  const kit = useKit(responseMetadata?.kitScope ?? null);
  const deepLink = useDeepLink();
  latestLink.current = deepLink;
  const [tab, setTab] = useState<"shop" | "kit">(defaultKit ? "kit" : "shop");
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    requestedProductId,
  );
  const [variantId, setVariantId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    if (defaultKit) {
      setTab("kit");
      setSelectedId(null);
    } else if (requestedProductId) {
      setTab("shop");
      setSelectedId(requestedProductId);
      setVariantId(null);
    }
  }, [defaultKit, requestedProductId]);

  useEffect(() => {
    if (!deepLink || !responseMetadata) {
      return;
    }
    try {
      const route = new URL(deepLink, "https://shop.invalid");
      // The documented global-entrypoint default path is the catalogue root.
      if (route.pathname === "/") {
        setTab(defaultKit ? "kit" : "shop");
        setSelectedId(defaultKit ? null : requestedProductId);
        setVariantId(null);
        setLinkError("");
        return;
      }
      if (route.pathname === "/kit") {
        setTab("kit");
        setSelectedId(null);
        return;
      }
      const match = /^\/products\/([^/]+)$/.exec(route.pathname);
      if (!match) {
        setLinkError(
          "This shop link is not supported. Browse the catalogue below.",
        );
        return;
      }
      const id = decodeURIComponent(match[1]);
      const product = products.find((entry) => entry.id === id);
      const requestedVariant = route.searchParams.get("variant");
      if (!product && requestedLink.current !== deepLink) {
        requestedLink.current = deepLink;
        setLinkError("Opening linked product…");
        lookupCall.current(
          { action: "browse", productId: id },
          {
            onSuccess: (response) => {
              if (latestLink.current !== deepLink) {
                return;
              }
              const fetched = Array.isArray(response.meta?.products)
                ? (response.meta.products as Product[])
                : [];
              if (!fetched.some((entry) => entry.id === id)) {
                setLinkError("This product is no longer available.");
                return;
              }
              setLinkedProducts((previous) => [
                ...previous.filter(
                  (entry) => !fetched.some((next) => next.id === entry.id),
                ),
                ...fetched,
              ]);
            },
            onError: () => {
              if (latestLink.current === deepLink) {
                setLinkError(
                  "Could not load this product. Try opening the link again.",
                );
              }
            },
          },
        );
        return;
      }
      if (
        !product ||
        (requestedVariant &&
          !product.variants.some((entry) => entry.id === requestedVariant))
      ) {
        setLinkError(
          "This product or variant is no longer available in this catalogue.",
        );
        return;
      }
      setSelectedId(id);
      setVariantId(requestedVariant);
      setLinkError("");
    } catch {
      setLinkError("This shop link could not be opened.");
    }
  }, [deepLink, responseMetadata, products, defaultKit, requestedProductId]);

  const selected =
    products.find((product) => product.id === selectedId) ??
    kit.items.find((item) => item.product.id === selectedId)?.product;
  function preferred(product: Product) {
    const exact = product.variants.find((variant) => variant.id === variantId);
    if (exact) {
      return exact.selection;
    }
    return (
      preferenceSelection(product, preferences) ?? initialSelection(product)
    );
  }
  const categories = Array.from(
    new Set(
      products.flatMap((product) =>
        product.category ? [product.category] : [],
      ),
    ),
  );
  const filtered = products.filter(
    (product) =>
      `${product.card.title} ${product.card.description ?? ""}`
        .toLowerCase()
        .includes(keyword.toLowerCase()) &&
      (category === "all" || product.category === category),
  );
  const totals = new Map<string, number>();
  let missingPrices = false;
  for (const item of kit.items) {
    const price = item.product.variants.find(
      (variant) => variant.id === item.variantId,
    )?.price;
    if (price) {
      totals.set(
        price.currency,
        (totals.get(price.currency) ?? 0) + price.amount * item.quantity,
      );
    } else {
      missingPrices = true;
    }
  }
  return (
    <ViewFrame>
      <main className={styles.workspace}>
        <header className={styles.header}>
          <h1 className={styles.heading}>Skybridge Shop</h1>
          <nav className={styles.actions} aria-label="Shop sections">
            <button
              type="button"
              className={styles.button}
              aria-pressed={tab === "shop" && !selected}
              onClick={() => {
                setTab("shop");
                setSelectedId(null);
              }}
            >
              Catalogue
            </button>
            <button
              type="button"
              className={styles.button}
              aria-pressed={tab === "kit" && !selected}
              onClick={() => {
                setTab("kit");
                setSelectedId(null);
              }}
            >
              My Kit ({kit.items.reduce((sum, item) => sum + item.quantity, 0)})
            </button>
          </nav>
        </header>
        {linkError ? <p role="alert">{linkError}</p> : null}
        {selected ? (
          <>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                setSelectedId(null);
                setVariantId(null);
              }}
            >
              Back to {tab === "kit" ? "my kit" : "catalogue"}
            </button>
            <DetailView
              key={`${selected.id}:${variantId}`}
              product={selected}
              preferredSelection={preferred(selected)}
              onAdd={kit.add}
              pluginId={responseMetadata?.pluginId}
              ground={false}
            />
          </>
        ) : tab === "kit" ? (
          <>
            <h2 className={styles.heading}>Your ski kit</h2>
            <p className={styles.status}>
              Collect your choices here. Attaching an item to chat is separate
              from keeping it in your kit.
            </p>
            {kit.items.length === 0 ? (
              <EmptyState message="Your kit is empty. Browse the catalogue and add a size and colour you like." />
            ) : (
              <ul className={styles.list}>
                {kit.items.map((item) => {
                  const variant = item.product.variants.find(
                    (entry) => entry.id === item.variantId,
                  );
                  if (!variant) {
                    return null;
                  }
                  return (
                    <li
                      key={`${item.product.id}:${item.variantId}`}
                      className={styles.item}
                    >
                      {variant.media[0] ? (
                        <img
                          className={styles.thumbnail}
                          src={variant.media[0]}
                          alt={variant.title}
                        />
                      ) : null}
                      <div className={styles.itemBody}>
                        <button
                          type="button"
                          className={styles.cardButton}
                          onClick={() => {
                            setSelectedId(item.product.id);
                            setVariantId(item.variantId);
                          }}
                          aria-label={`Open ${variant.title}, ${variantOptions(item.product, variant)}`}
                        >
                          <strong>{variant.title}</strong>
                        </button>
                        <span>{variantOptions(item.product, variant)}</span>
                        <span>
                          {variant.price
                            ? formatPrice(variant.price)
                            : "Price on request"}
                        </span>
                        <div className={styles.actions}>
                          <label>
                            Quantity{" "}
                            <input
                              className={`${styles.input} ${styles.compact}`}
                              type="number"
                              min="1"
                              max="99"
                              value={item.quantity}
                              onChange={(event) => {
                                const value = event.target.valueAsNumber;
                                if (Number.isFinite(value)) {
                                  kit.quantity(item.variantId, value);
                                }
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            className={styles.button}
                            onClick={() => kit.remove(item.variantId)}
                            aria-label={`Remove ${variant.title} from kit`}
                          >
                            Remove
                          </button>
                        </div>
                        <KitActions
                          product={item.product}
                          variant={variant}
                          quantity={item.quantity}
                          pluginId={responseMetadata?.pluginId}
                          onAdd={kit.add}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {kit.items.length > 0 ? (
              <div className={styles.summary}>
                Kit total:{" "}
                {Array.from(totals, ([currency, amount]) =>
                  formatPrice({ currency, amount }),
                ).join(" + ") || "Price on request"}
                {missingPrices ? " (some prices unavailable)" : ""}
                <p className={styles.status}>
                  A shopping shortlist. Checkout takes place on the storefront.
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <p>Build your kit for the mountain.</p>
            <button
              type="button"
              className={styles.button}
              disabled={choice.isPending || filtered.length === 0}
              onClick={() => {
                setChoiceMessage("");
                choice.callTool(
                  {
                    action: "choose",
                    ids: filtered.slice(0, 8).map((product) => product.id),
                  },
                  {
                    onSuccess: (response) => {
                      const result = response.structuredContent;
                      if (!("status" in result)) {
                        return;
                      }
                      const selectedProductId =
                        response.meta?.selectedProductId ?? result.productId;
                      if (
                        result.status === "selected" &&
                        typeof selectedProductId === "string"
                      ) {
                        setSelectedId(selectedProductId);
                        setVariantId(null);
                      } else if (result.status === "fallback") {
                        setChoiceMessage(
                          "Choose a product below to select your size and colour.",
                        );
                      }
                    },
                    onError: () =>
                      setChoiceMessage(
                        "Could not open product choices. Choose a product below instead.",
                      ),
                  },
                );
              }}
            >
              {choice.isPending ? "Opening choices…" : "Help me choose"}
            </button>
            {choiceMessage ? <p role="status">{choiceMessage}</p> : null}
            <div className={styles.controls}>
              <input
                className={styles.input}
                type="search"
                aria-label="Search catalogue"
                placeholder="Search skis, goggles, layers…"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
              {categories.length > 0 ? (
                <select
                  className={styles.button}
                  aria-label="Filter collection"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="all">All collections</option>
                  {categories.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
            {!responseMetadata ? (
              <div className={styles.grid}>
                {[0, 1, 2, 3].map((index) => (
                  <ProductCardSkeleton key={index} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState message="No matching products. Try another search or collection." />
            ) : (
              <div className={styles.grid}>
                {filtered.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className={styles.cardButton}
                    onClick={() => {
                      setSelectedId(product.id);
                      setVariantId(null);
                    }}
                    aria-label={`Open ${product.card.title}`}
                  >
                    <ProductCard {...product.card} />
                  </button>
                ))}
              </div>
            )}
            <p className={styles.status}>
              Showing the products loaded for this shop. Ask ChatGPT to search
              for more.
            </p>
          </>
        )}
      </main>
    </ViewFrame>
  );
}
export default function Shop() {
  const { responseMetadata } = useToolInfo<"shop">();
  const deepLink = useDeepLink();
  const workspaceRoute =
    deepLink?.startsWith("/products/") || deepLink === "/kit";
  if (responseMetadata?.presentation === "carousel" && !workspaceRoute) {
    return <Carousel />;
  }
  return <ShopWorkspace />;
}
