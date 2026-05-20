import { useToolInfo } from "../helpers.js";

function EchoCard() {
  const { output } = useToolInfo<"echo-card">();
  const message = output?.message ?? "";
  return (
    <p data-testid="echo-card-message" style={{ fontFamily: "sans-serif" }}>
      {message}
    </p>
  );
}

export default EchoCard;
