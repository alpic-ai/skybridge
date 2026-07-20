import { ExpandableText } from "./expandable-text";

const frame = { maxWidth: 360 };

const LONG =
  "A relaxed-fit jacket in water-repellent cotton.\n\nDropped shoulders, a two-way zip, and ribbed cuffs. Fully lined, with two zip pockets at the front and one inside. Designed to layer over a knit through the cooler months, and cut long enough to sit past the hip.";

export const Long = () => (
  <div style={frame}>
    <ExpandableText>{LONG}</ExpandableText>
  </div>
);

export const Short = () => (
  <div style={frame}>
    <ExpandableText>A short description that never needs a toggle.</ExpandableText>
  </div>
);
