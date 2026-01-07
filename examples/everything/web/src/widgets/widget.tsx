import "@/index.css";

import { useState } from "react";
import { mountWidget } from "skybridge/web";
import { CreateStoreTab } from "./tabs/create-store-tab";
import { DataLlmTab } from "./tabs/data-llm-tab";
import { HomeTab } from "./tabs/home-tab";
import { ToolInfoTab } from "./tabs/tool-info-tab";

const TABS = ["Home", "createStore", "data-llm", "useToolInfo"] as const;
type Tab = (typeof TABS)[number];

function Widget() {
  const [tab, setTab] = useState<Tab>("Home");

  return (
    <div className="container">
      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`tab ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Home" && <HomeTab />}
      {tab === "createStore" && <CreateStoreTab />}
      {tab === "data-llm" && <DataLlmTab />}
      {tab === "useToolInfo" && <ToolInfoTab />}
    </div>
  );
}

export default Widget;

mountWidget(<Widget />);
