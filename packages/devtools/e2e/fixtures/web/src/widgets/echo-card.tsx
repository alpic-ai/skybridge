import { mountWidget, useToolInfo } from "skybridge/web";

function EchoCard() {
  const info = useToolInfo<{
    output: { message: string };
    input: { message: string };
  }>();
  const message = info.output?.message ?? "";
  return (
    <p data-testid="echo-card-message" style={{ fontFamily: "sans-serif" }}>
      {message}
    </p>
  );
}

mountWidget(<EchoCard />);

export default EchoCard;
