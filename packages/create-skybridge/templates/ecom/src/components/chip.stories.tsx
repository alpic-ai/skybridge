import { Chip } from "./chip";

const SWATCH =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='20' height='20' fill='%233b6cf0'/%3E%3C/svg%3E";

const row = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
  maxWidth: 320,
};

export const States = () => (
  <div style={row}>
    <Chip label="M" />
    <Chip label="L" selected />
    <Chip label="XL" disabled />
  </div>
);

export const WithSwatch = () => (
  <div style={row}>
    <Chip label="Blue" media={SWATCH} selected />
    <Chip label="Black" media={SWATCH} />
  </div>
);
