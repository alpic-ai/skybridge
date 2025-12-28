import { useMemo, useState } from "react";
import {
  mountWidget,
  useCallTool,
  useOpenExternal,
  useTheme,
  useToolInfo,
} from "skybridge/web";

type Product = {
  id: string;
  priceId: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number;
  currency: string;
};

type ToolSignature = {
  input: Record<string, never>;
  output: {
    products: Product[];
  };
};

type CheckoutItem = { priceId: string; quantity: number };

type BuyProductsInput = { items: CheckoutItem[] };
type BuyProductsOutput = { checkoutSessionUrl?: string };

function ProductsWidget() {
  const theme = useTheme();
  const { output } = useToolInfo<ToolSignature>();
  const { callToolAsync } = useCallTool<
    BuyProductsInput,
    { structuredContent: BuyProductsOutput }
  >("buy_products");
  const openExternal = useOpenExternal();

  const products = useMemo(
    () => (Array.isArray(output?.products) ? output.products : []),
    [output],
  );

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCheckout = useMemo(
    () => products.some((product) => (quantities[product.priceId] ?? 0) > 0),
    [products, quantities],
  );

  const totalAmount = useMemo(() => {
    return products.reduce((sum, product) => {
      const qty = quantities[product.priceId] ?? 0;
      return sum + product.price * qty;
    }, 0);
  }, [products, quantities]);

  const formatPrice = (cents: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(cents / 100);
  };

  const handleQuantityChange = (priceId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[priceId] ?? 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [priceId]: next };
    });
  };

  const handleCheckout = async () => {
    if (checkoutUrl) {
      openExternal(checkoutUrl);
      return;
    }

    const items: CheckoutItem[] = Object.entries(quantities)
      .map(([priceId, quantity]) => ({ priceId, quantity }))
      .filter((item) => item.quantity > 0);

    if (!items.length) {
      setStatus("Select at least one product to continue.");
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const result = await callToolAsync({ items });

      const url = result?.structuredContent?.checkoutSessionUrl;

      if (url) {
        setCheckoutUrl(url);
        setStatus("Checkout ready! Click below to complete your purchase.");
      } else {
        setStatus("No checkout URL returned. Please try again.");
      }
    } catch (error) {
      console.error("Failed to start checkout", error);
      setStatus("Failed to start checkout. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDark = theme === "dark";

  const styles = {
    container: {
      fontFamily: "system-ui, -apple-system, sans-serif",
      padding: "24px",
      maxWidth: "600px",
      backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
      color: isDark ? "#ffffff" : "#000000",
    },
    header: {
      marginBottom: "24px",
    },
    title: {
      fontSize: "24px",
      fontWeight: 600,
      marginBottom: "8px",
    },
    subtitle: {
      fontSize: "14px",
      color: isDark ? "#888" : "#666",
    },
    productGrid: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "16px",
      marginBottom: "24px",
    },
    productCard: {
      display: "flex",
      gap: "16px",
      padding: "16px",
      backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5",
      borderRadius: "12px",
      alignItems: "center",
    },
    productImage: {
      width: "80px",
      height: "80px",
      borderRadius: "8px",
      objectFit: "cover" as const,
      backgroundColor: isDark ? "#333" : "#ddd",
    },
    productInfo: {
      flex: 1,
    },
    productName: {
      fontSize: "16px",
      fontWeight: 600,
      marginBottom: "4px",
    },
    productDescription: {
      fontSize: "13px",
      color: isDark ? "#888" : "#666",
      marginBottom: "8px",
    },
    productPrice: {
      fontSize: "16px",
      fontWeight: 600,
      color: isDark ? "#4da6ff" : "#0066cc",
    },
    quantityControls: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
    },
    quantityButton: {
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      border: `1px solid ${isDark ? "#444" : "#ddd"}`,
      backgroundColor: isDark ? "#333" : "#fff",
      color: isDark ? "#fff" : "#000",
      fontSize: "18px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    quantity: {
      fontSize: "16px",
      fontWeight: 500,
      minWidth: "24px",
      textAlign: "center" as const,
    },
    summary: {
      padding: "16px",
      backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0",
      borderRadius: "12px",
      marginBottom: "16px",
    },
    summaryRow: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "16px",
      fontWeight: 600,
    },
    button: {
      width: "100%",
      padding: "16px",
      fontSize: "16px",
      fontWeight: 600,
      border: "none",
      borderRadius: "12px",
      cursor:
        isSubmitting || (!checkoutUrl && !canCheckout)
          ? "not-allowed"
          : "pointer",
      backgroundColor:
        isSubmitting || (!checkoutUrl && !canCheckout)
          ? isDark
            ? "#444"
            : "#ccc"
          : checkoutUrl
            ? "#28a745"
            : "#0066cc",
      color: "#ffffff",
      transition: "background-color 0.2s",
    },
    status: {
      marginTop: "16px",
      padding: "12px",
      borderRadius: "8px",
      fontSize: "14px",
      backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0",
      color: isDark ? "#ccc" : "#333",
      textAlign: "center" as const,
    },
    loading: {
      textAlign: "center" as const,
      padding: "40px",
      color: isDark ? "#888" : "#666",
    },
  };

  if (!products.length) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading products...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Select Products</h1>
        <p style={styles.subtitle}>
          Choose products and quantities to purchase
        </p>
      </header>

      <div style={styles.productGrid}>
        {products.map((product) => (
          <div key={product.id} style={styles.productCard}>
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                style={styles.productImage}
              />
            ) : (
              <div style={styles.productImage} />
            )}

            <div style={styles.productInfo}>
              <div style={styles.productName}>{product.name}</div>
              {product.description && (
                <div style={styles.productDescription}>
                  {product.description}
                </div>
              )}
              <div style={styles.productPrice}>
                {formatPrice(product.price, product.currency)}
              </div>
            </div>

            <div style={styles.quantityControls}>
              <button
                type="button"
                style={styles.quantityButton}
                onClick={() => handleQuantityChange(product.priceId, -1)}
                disabled={!quantities[product.priceId]}
              >
                -
              </button>
              <span style={styles.quantity}>
                {quantities[product.priceId] ?? 0}
              </span>
              <button
                type="button"
                style={styles.quantityButton}
                onClick={() => handleQuantityChange(product.priceId, 1)}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {canCheckout && (
        <div style={styles.summary}>
          <div style={styles.summaryRow}>
            <span>Total</span>
            <span>{formatPrice(totalAmount)}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        style={styles.button}
        onClick={handleCheckout}
        disabled={isSubmitting || (!checkoutUrl && !canCheckout)}
      >
        {isSubmitting
          ? "Processing..."
          : checkoutUrl
            ? "Open Checkout"
            : canCheckout
              ? `Checkout ${formatPrice(totalAmount)}`
              : "Select products to continue"}
      </button>

      {status && <div style={styles.status}>{status}</div>}
    </div>
  );
}

mountWidget(<ProductsWidget />);
