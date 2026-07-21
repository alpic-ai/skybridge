import { ImageGallery } from "./image-gallery";

function shot(fill: string) {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect width='400' height='400' fill='%23${fill}'/%3E%3Ccircle cx='200' cy='200' r='110' fill='%23ffffff' fill-opacity='0.5'/%3E%3C/svg%3E`;
}

// The gallery's desktop layout (and the optional THUMBNAIL_RAIL) query a
// `container-type` host, which the PDP's `.detail` provides in the app. The
// story supplies its own so it previews at a realistic width and renders
// correctly whichever way THUMBNAIL_RAIL is set — swipe when off, rail when on.
const frame = {
  containerType: "inline-size" as const,
  width: 600,
  maxWidth: "100%",
};

export const Multiple = () => (
  <div style={frame}>
    <ImageGallery
      media={[shot("e1e1e1"), shot("c9d4f5"), shot("f5d4c9")]}
      alt="Product"
    />
  </div>
);

export const Single = () => (
  <div style={frame}>
    <ImageGallery media={[shot("e1e1e1")]} alt="Product" />
  </div>
);
