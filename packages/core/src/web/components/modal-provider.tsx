import { type ReactNode, useEffect, useSyncExternalStore } from "react";
import { McpAppAdaptor } from "../bridges";

const modalStyles = `
.sb-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9998;
}
.sb-modal-container {
  border-radius: 12px;
  position: fixed;
  inset: 0;
  margin: auto;
  width: fit-content;
  height: fit-content;
  background: white;
  z-index: 9999;
}
`;

export function ModalProvider({ children }: { children: ReactNode }) {
  const store = McpAppAdaptor.getInstance().modalStore;

  const { isOpen } = useSyncExternalStore(store.subscribe, store.getSnapshot);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      store.close();
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        store.close();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, store]);

  return (
    <>
      <style>{modalStyles}</style>
      {isOpen && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop isn't focusable
        <div
          role="dialog"
          className="sb-modal-backdrop"
          onClick={handleBackdropClick}
        />
      )}
      <div className={isOpen ? "sb-modal-container" : undefined}>
        {children}
      </div>
    </>
  );
}
