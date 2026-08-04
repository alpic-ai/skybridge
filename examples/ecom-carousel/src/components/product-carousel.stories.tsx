import type { ReactNode } from "react";
import type { Price } from "../types.js";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import { ProductCarousel } from "./product-carousel";

const IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Crect width='240' height='240' fill='%23e5e5e5'/%3E%3Ccircle cx='120' cy='120' r='70' fill='%23bcbcbc'/%3E%3C/svg%3E";

type Sample = { title: string; price: Price; outOfStock?: boolean };

const SAMPLE: Sample[] = [
  { title: "Merino wool sweater", price: { amount: 129.9, currency: "EUR" } },
  { title: "Oxford cotton shirt", price: { amount: 79, currency: "EUR" } },
  { title: "Slim chino trousers", price: { amount: 89.5, currency: "EUR" } },
  {
    title: "Leather derby shoes",
    price: { amount: 210, currency: "EUR" },
    outOfStock: true,
  },
  { title: "Cashmere scarf", price: { amount: 145, currency: "EUR" } },
  { title: "Quilted field jacket", price: { amount: 320, currency: "EUR" } },
];

function sampleCards(): ReactNode[] {
  const cards: ReactNode[] = [];
  for (let i = 0; i < SAMPLE.length; i++) {
    const item = SAMPLE[i];
    cards.push(
      <ProductCard
        key={i}
        title={item.title}
        price={item.price}
        media={[IMAGE]}
        outOfStock={item.outOfStock}
      />,
    );
  }
  return cards;
}

export const Default = () => <ProductCarousel>{sampleCards()}</ProductCarousel>;

export const Loading = () => {
  const skeletons: ReactNode[] = [];
  for (let i = 0; i < 4; i++) {
    skeletons.push(<ProductCardSkeleton key={i} />);
  }
  return <ProductCarousel loading>{skeletons}</ProductCarousel>;
};

export const FewItems = () => (
  <ProductCarousel>
    <ProductCard
      title="Merino wool sweater"
      price={{ amount: 129.9, currency: "EUR" }}
      media={[IMAGE]}
    />
    <ProductCard
      title="Oxford cotton shirt"
      price={{ amount: 79, currency: "EUR" }}
      media={[IMAGE]}
    />
  </ProductCarousel>
);
