import "@/index.css";

import { useState } from "react";
import { mountWidget, useOpenExternal } from "skybridge/web";
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

function getDocPath(tab: Tab): string {
  switch (tab) {
    case "createStore":
      return "create-store";
    case "data-llm":
      return "data-llm";
    case "useCallTool":
      return "use-call-tool";
    case "useDisplayMode":
      return "use-display-mode";
    case "useLayout":
      return "use-layout";
    case "useOpenExternal":
      return "use-open-external";
    case "useToolInfo":
      return "use-tool-info";
    case "useUser":
      return "use-user";
    default:
      return "";
  }
}

function Widget() {
  const [tab, setTab] = useState<Tab>("Home");
  const openExternal = useOpenExternal();
  const openDocs = (path: string) =>
    openExternal(`https://www.skybridge.tech/api-reference/${path}`);

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

      <div style={{ marginTop: "1.5rem" }}>
        <button
          type="button"
          className="doc-link"
          onClick={() => openDocs(getDocPath(tab))}
        >
          See in docs
        </button>
      </div>
    </div>
  );
}

export default Widget;

mountWidget(<Widget />);
