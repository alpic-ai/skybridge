import "@/index.css";

import { useLayout, useRequestModal } from "skybridge/web";
import { ConformanceProvider } from "@/conformance/context.js";
import { ModalContent } from "@/conformance/hooks/use-request-modal.js";
import { Runner } from "@/conformance/runner.js";

/**
 * The single conformance view. Wraps everything in {@link ConformanceProvider}
 * so results survive the modal round-trip, and branches to the modal body when
 * the host renders the view in modal mode (see the `modal` category).
 */
function App() {
  const { theme } = useLayout();
  const { isOpen, params } = useRequestModal();

  return (
    <div
      className={`${theme === "dark" ? "dark" : ""} min-h-dvh bg-background text-foreground`}
    >
      <ConformanceProvider>
        {isOpen ? (
          <ModalContent params={params} />
        ) : (
          <div className="mx-auto max-w-3xl p-4">
            <Runner />
          </div>
        )}
      </ConformanceProvider>
    </div>
  );
}

export default App;
