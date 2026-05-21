import { useEffect } from "react";
import { useServerInfo } from "@/lib/mcp/index.js";

export const useDocumentTitle = () => {
  const serverInfo = useServerInfo();
  useEffect(() => {
    if (serverInfo?.name) {
      document.title = `${serverInfo.name} · Skybridge`;
    }
  }, [serverInfo?.name]);
};
