import "@/index.css";

import { Button } from "@alpic-ai/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@alpic-ai/ui/components/tabs";
import { SquareArrowOutUpRight } from "lucide-react";
import { useState } from "react";
import { useLayout, useOpenExternal, useRequestModal } from "skybridge/web";
import { CreateStoreTab } from "./tabs/create-store-tab.js";
import { DataLlmTab } from "./tabs/data-llm-tab.js";
import { HomeTab } from "./tabs/home-tab.js";
import { ImageTab } from "./tabs/image-tab/index.js";
import { ToolInfoTab } from "./tabs/tool-info-tab.js";
import { UseCallToolTab } from "./tabs/use-call-tool-tab.js";
import { UseDisplayModeTab } from "./tabs/use-display-mode-tab.js";
import { UseDownloadTab } from "./tabs/use-download-tab.js";
import { UseFilesTab } from "./tabs/use-files-tab.js";
import { UseLayoutTab } from "./tabs/use-layout-tab.js";
import { UseOpenExternalTab } from "./tabs/use-open-external-tab.js";
import { UseRequestModalTab } from "./tabs/use-request-modal-tab.js";
import { UseSendFollowUpMessageTab } from "./tabs/use-send-follow-up-message-tab.js";
import { UseSetOpenInAppUrlTab } from "./tabs/use-set-open-in-app-url.js";
import { UseUserTab } from "./tabs/use-user-tab.js";
import { UseViewStateTab } from "./tabs/use-view-state-tab.js";

const TABS = {
  Home: { docPath: "", Component: HomeTab },
  createStore: { docPath: "create-store", Component: CreateStoreTab },
  "data-llm": { docPath: "data-llm", Component: DataLlmTab },
  image: { docPath: "image", Component: ImageTab },
  useCallTool: { docPath: "use-call-tool", Component: UseCallToolTab },
  useDisplayMode: { docPath: "use-display-mode", Component: UseDisplayModeTab },
  useDownload: { docPath: "use-download", Component: UseDownloadTab },
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
  useSetOpenInAppUrl: {
    docPath: "use-set-open-in-app-url",
    Component: UseSetOpenInAppUrlTab,
  },
  useToolInfo: { docPath: "use-tool-info", Component: ToolInfoTab },
  useUser: { docPath: "use-user", Component: UseUserTab },
  useViewState: { docPath: "use-view-state", Component: UseViewStateTab },
};

type Tab = keyof typeof TABS;

function Widget() {
  const [tab, setTab] = useState<Tab>("Home");
  const { theme } = useLayout();
  const openExternal = useOpenExternal();
  const { isOpen, params } = useRequestModal();

  const { docPath } = TABS[tab];

  // modal content need to be set at root
  // opening is triggered by UseRequestModalTab
  if (isOpen) {
    let message = "No message provided";
    if (typeof params?.message === "string") {
      message = params.message;
    }
    return (
      <div
        className={`${theme === "dark" ? "dark" : ""} bg-background p-4 text-center type-display-xs font-semibold text-foreground`}
      >
        {message}
      </div>
    );
  }

  return (
    <div
      className={`${theme === "dark" ? "dark" : ""} flex flex-col gap-6 bg-background p-4 text-foreground`}
    >
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList
          variant="line"
          className="w-full max-w-full justify-start overflow-x-auto group-data-[orientation=horizontal]/tabs:flex-nowrap"
        >
          {(Object.keys(TABS) as Tab[]).map((t) => (
            <TabsTrigger key={t} value={t} className="flex-none">
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(TABS) as Tab[]).map((t) => {
          const { Component } = TABS[t];
          return (
            <TabsContent key={t} value={t} className="mt-4">
              <Component />
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="flex justify-end">
        <Button
          variant="link-muted"
          size="default"
          icon={<SquareArrowOutUpRight />}
          onClick={() =>
            openExternal(`https://docs.skybridge.tech/api-reference/${docPath}`)
          }
        >
          See in docs
        </Button>
      </div>
    </div>
  );
}

export default Widget;
