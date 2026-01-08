import "@/index.css";

import { useState } from "react";
import { mountWidget } from "skybridge/web";
import { CreateStoreTab } from "./tabs/create-store-tab";
import { DataLlmTab } from "./tabs/data-llm-tab";
import { HomeTab } from "./tabs/home-tab";
import { ToolInfoTab } from "./tabs/tool-info-tab";
import { UseCallToolTab } from "./tabs/use-call-tool-tab";
import { UseDisplayModeTab } from "./tabs/use-display-mode-tab";
import { UseLayoutTab } from "./tabs/use-layout-tab";
import { UseOpenExternalTab } from "./tabs/use-open-external-tab";
import { UseUserTab } from "./tabs/use-user-tab";

const TABS = [
  "Home",
  "createStore",
  "data-llm",
  "useCallTool",
  "useDisplayMode",
  "useLayout",
  "useOpenExternal",
  "useToolInfo",
  "useUser",
] as const;

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
      {tab === "useCallTool" && <UseCallToolTab />}
      {tab === "useDisplayMode" && <UseDisplayModeTab />}
      {tab === "useLayout" && <UseLayoutTab />}
      {tab === "useOpenExternal" && <UseOpenExternalTab />}
      {tab === "useToolInfo" && <ToolInfoTab />}
      {tab === "useUser" && <UseUserTab />}
    </div>
  );
}

export default Widget;

mountWidget(<Widget />);
