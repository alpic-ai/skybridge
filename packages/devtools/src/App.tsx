import { QueryClientProvider } from "@tanstack/react-query";
import AppLayout from "./components/layout/app-layout.js";
import { queryClient } from "./lib/query-client.js";
import { NuqsAdapter } from "nuqs/adapters/react";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <AppLayout />
      </NuqsAdapter>
    </QueryClientProvider>
  );
}

export default App;
