import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/react";
import AppLayout from "./components/layout/app-layout.js";
import { useDocumentTitle } from "./hooks/use-document-title.js";
import { queryClient } from "./lib/query-client.js";
import { useConnectTunnel } from "./lib/tunnel-store.js";

function App() {
  useConnectTunnel();
  useDocumentTitle();

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <AppLayout />
      </NuqsAdapter>
    </QueryClientProvider>
  );
}

export default App;
