import { QueryClientProvider } from "@tanstack/react-query";
import AppLayout from "./components/layout/app-layout.js";
import { queryClient } from "./lib/query-client.js";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout />
    </QueryClientProvider>
  );
}

export default App;
