import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/react";
import { useEffect } from "react";
import AppLayout from "./components/layout/app-layout.js";
import { useServerInfo } from "./lib/mcp/index.js";
import { queryClient } from "./lib/query-client.js";
import { useConnectTunnel } from "./lib/tunnel-store.js";

function DocumentTitle() {
  const serverInfo = useServerInfo();
  useEffect(() => {
    if (serverInfo?.name) {
      document.title = `${serverInfo.name} · Skybridge`;
    }
  }, [serverInfo?.name]);
  return null;
}

function App() {
  useConnectTunnel();

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <DocumentTitle />
        <AppLayout />
      </NuqsAdapter>
    </QueryClientProvider>
  );
}

export default App;
