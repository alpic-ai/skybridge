import { ProductCard, ProductCardSkeleton } from "./product-card";

const IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Crect width='240' height='240' fill='%23e5e5e5'/%3E%3Ccircle cx='120' cy='120' r='70' fill='%23bcbcbc'/%3E%3C/svg%3E";

const frame = { maxWidth: 220 };

export const Default = () => (
  <div style={frame}>
    <ProductCard
      title="Merino wool sweater"
      price={{ amount: 129.9, currency: "EUR" }}
      media={[IMAGE]}
    />
  </div>
);

export const LongTitle = () => (
  <div style={frame}>
    <ProductCard
      title="Extra long product title that wraps onto two lines and then clamps"
      price={{ amount: 1290, currency: "USD" }}
      media={[IMAGE]}
    />
  </div>
);

export const NoImage = () => (
  <div style={frame}>
    <ProductCard
      title="Product without an image"
      price={{ amount: 49, currency: "EUR" }}
    />
  </div>
);

export const NoPrice = () => (
  <div style={frame}>
    <ProductCard title="Price on request" media={[IMAGE]} />
  </div>
);

export const OutOfStock = () => (
  <div style={frame}>
    <ProductCard
      title="Sold out product"
      price={{ amount: 89, currency: "EUR" }}
      media={[IMAGE]}
      outOfStock
    />
  </div>
);

export const Skeleton = () => (
  <div style={frame}>
    <ProductCardSkeleton />
  </div>
);
