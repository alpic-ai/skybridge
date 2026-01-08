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

const TABS = {
  Home: { docPath: "", Component: HomeTab },
  createStore: { docPath: "create-store", Component: CreateStoreTab },
  "data-llm": { docPath: "data-llm", Component: DataLlmTab },
  useCallTool: { docPath: "use-call-tool", Component: UseCallToolTab },
  useDisplayMode: { docPath: "use-display-mode", Component: UseDisplayModeTab },
  useLayout: { docPath: "use-layout", Component: UseLayoutTab },
  useOpenExternal: {
    docPath: "use-open-external",
    Component: UseOpenExternalTab,
  },
  useToolInfo: { docPath: "use-tool-info", Component: ToolInfoTab },
  useUser: { docPath: "use-user", Component: UseUserTab },
};

type Tab = keyof typeof TABS;

function Widget() {
  const [tab, setTab] = useState<Tab>("Home");
  const openExternal = useOpenExternal();

  const { docPath, Component } = TABS[tab];

  return (
    <div className="container">
      <nav className="tabs">
        {(Object.keys(TABS) as Tab[]).map((t) => (
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

      <Component />

      <div style={{ marginTop: "1.5rem" }}>
        <button
          type="button"
          className="doc-link"
          onClick={() =>
            openExternal(`https://www.skybridge.tech/api-reference/${docPath}`)
          }
        >
          See in docs
        </button>
      </div>
    </div>
  );
}

export default Widget;

mountWidget(<Widget />);
