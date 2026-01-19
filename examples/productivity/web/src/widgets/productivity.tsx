import "@/index.css";

import { mountWidget } from "skybridge/web";
import { useToolInfo } from "../helpers";

function Productivity() {
  const { output, isPending } = useToolInfo<"productivity">();

  if (isPending || !output) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      📊 Weekly productivity: {output.totalHours} hours
    </div>
  );
}

export default Productivity;

mountWidget(<Productivity />);
