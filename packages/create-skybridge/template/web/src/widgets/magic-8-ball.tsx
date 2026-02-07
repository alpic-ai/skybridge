import "@/index.css";

import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers";

function Magic8Ball() {
  const { input, output } = useToolInfo<"magic-8-ball">();

  return (
    <div className="container">
      <div className="ball">
        {output ? (
          <>
            <div className="question">{input.question}</div>
            <div className="answer">{output.answer}</div>
          </>
        ) : (
          <div className="question">Shaking...</div>
        )}
      </div>
    </div>
  );
}

export default Magic8Ball;

mountWidget(<Magic8Ball />);
