import "@/index.css";

import { Ball } from "../components/ball.js";
import { useToolInfo } from "../helpers.js";

export default function Magic8Ball() {
  const { input, output } = useToolInfo<"magic-8-ball">();

  return <Ball question={input?.question} answer={output?.answer} />;
}
