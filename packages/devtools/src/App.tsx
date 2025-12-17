import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/react";
import AppLayout from "./components/layout/app-layout.js";
import { queryClient } from "./lib/query-client.js";

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
