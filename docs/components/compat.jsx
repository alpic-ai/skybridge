// Host-compatibility pills, rendered inline under the page title. Pass
// `chatgpt` and/or `claude`. Server-rendered.
//
// Everything is inline: Mintlify inlines only the exported arrow's body into
// the page module and drops module-level imports/consts.
export const Compat = ({ chatgpt = false, claude = false }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      marginTop: "-1rem",
    }}
  >
    {chatgpt ? (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          border: "1px solid currentColor",
          borderRadius: "9999px",
          padding: "1px 10px",
          fontSize: "0.75rem",
          fontWeight: 500,
          opacity: 0.75,
        }}
      >
        ChatGPT
      </span>
    ) : null}
    {claude ? (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          border: "1px solid #D97757",
          color: "#D97757",
          borderRadius: "9999px",
          padding: "1px 10px",
          fontSize: "0.75rem",
          fontWeight: 500,
        }}
      >
        Claude
      </span>
    ) : null}
  </div>
);
