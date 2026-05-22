import { useToolInfo } from "../helpers.js";
import "./echo-card.css";

function EchoCard() {
  const { output } = useToolInfo<"echo-card">();
  const message = output?.message ?? "";
  return (
    <div style={{ padding: 16, fontFamily: "sans-serif" }}>
      <div
        style={{
          background: "#f4f4f5",
          border: "1px solid #e4e4e7",
          borderRadius: 12,
          padding: "16px 20px",
          color: "#18181b",
          fontSize: 14,
          lineHeight: 1.4,
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "#71717a",
            marginBottom: 6,
          }}
        >
          Echo
        </div>
        <p style={{ margin: 0 }}>{message}</p>
      </div>
    </div>
  );
}

export default EchoCard;
