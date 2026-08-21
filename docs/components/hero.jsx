// Page hero illustration, pulled up under the title. Pass `src` and `alt`.
// Self-contained: Mintlify inlines only the exported arrow's body and drops
// module-level imports/consts.
export const Hero = ({ src, alt }) => (
  <img
    src={src}
    alt={alt}
    style={{
      width: "100%",
      height: "auto",
      display: "block",
      marginTop: "-0.75rem",
      borderRadius: "15px",
    }}
  />
);
