import { useToolInfo } from "../helpers.js";

function EchoCard() {
  const { output } = useToolInfo<"echo-card">();
  const message = output?.message ?? "";
  return <p style={{ fontFamily: "sans-serif" }}>{message}</p>;
}

export default EchoCard;
