import "@/index.css";

import { useState } from "react";
import { mountWidget, useOpenExternal, useRequestModal } from "skybridge/web";
import { CreateStoreTab } from "./tabs/create-store-tab";
import { DataLlmTab } from "./tabs/data-llm-tab";
import { HomeTab } from "./tabs/home-tab";
import { ToolInfoTab } from "./tabs/tool-info-tab";
import { UseCallToolTab } from "./tabs/use-call-tool-tab";
import { UseDisplayModeTab } from "./tabs/use-display-mode-tab";
import { UseFilesTab } from "./tabs/use-files-tab";
import { UseLayoutTab } from "./tabs/use-layout-tab";
import { UseOpenExternalTab } from "./tabs/use-open-external-tab";
import { UseRequestModalTab } from "./tabs/use-request-modal-tab";
import { UseSendFollowUpMessageTab } from "./tabs/use-send-follow-up-message-tab";
import { UseUserTab } from "./tabs/use-user-tab";
import { UseWidgetStateTab } from "./tabs/use-widget-state-tab";

const TABS = {
  Home: { docPath: "", Component: HomeTab },
  createStore: { docPath: "create-store", Component: CreateStoreTab },
  "data-llm": { docPath: "data-llm", Component: DataLlmTab },
  useCallTool: { docPath: "use-call-tool", Component: UseCallToolTab },
  useDisplayMode: { docPath: "use-display-mode", Component: UseDisplayModeTab },
  useFiles: { docPath: "use-files", Component: UseFilesTab },
  useLayout: { docPath: "use-layout", Component: UseLayoutTab },
  useOpenExternal: {
    docPath: "use-open-external",
    Component: UseOpenExternalTab,
  },
  useRequestModal: {
    docPath: "use-request-modal",
    Component: UseRequestModalTab,
  },
  useSendFollowUpMessage: {
    docPath: "use-send-follow-up-message",
    Component: UseSendFollowUpMessageTab,
  },
  useToolInfo: { docPath: "use-tool-info", Component: ToolInfoTab },
  useUser: { docPath: "use-user", Component: UseUserTab },
  useWidgetState: { docPath: "use-widget-state", Component: UseWidgetStateTab },
};

type Tab = keyof typeof TABS;

function Widget() {
  const [tab, setTab] = useState<Tab>("Home");
  const openExternal = useOpenExternal();
  const { isOpen } = useRequestModal();

  const { docPath, Component } = TABS[tab];

  // modal content need to be set at root
  // opening is triggered by UseRequestModalTab
  if (isOpen) {
    return (
      <div
        className="container"
        style={{ textAlign: "center", fontSize: "1.5rem" }}
      >
        🤠 Howdy !
      </div>
    );
  }

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

      <div style={{ marginTop: "1.75rem", textAlign: "right" }}>
        <button
          type="button"
          className="btn btn-outline muted btn-small"
          onClick={() =>
            openExternal(`https://docs.skybridge.tech/api-reference/${docPath}`)
          }
        >
          ↗ See in docs
        </button>
      </div>
    </div>
  );
}

export default Widget;

mountWidget(<Widget />);
