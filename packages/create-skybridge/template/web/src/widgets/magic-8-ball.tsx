import "@/index.css";

import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers";

function Magic8Ball() {
  const { input, output } = useToolInfo<"magic-8-ball">();
  if (!output) {
    return <div>Shaking...</div>;
  }

  return (
    <div className="container">
      <div className="ball">
        <div className="question">{input.question}</div>
        <div className="answer">{output.answer}</div>
      </div>
    </div>
  );
}

export default Magic8Ball;

mountWidget(<Magic8Ball />);
