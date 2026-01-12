import { useRequestModal } from "skybridge/web";

export function UseRequestModalTab() {
  const { open, isOpen } = useRequestModal();

  if (isOpen) {
    return <div className="tab-content">🤠 Howdy !</div>;
  }

  return (
    <div className="tab-content">
      <p className="description">
        Request to open the widget in a modal dialog.
      </p>

      <div className="button-row">
        <button type="button" className="btn" onClick={() => open({})}>
          Open modal
        </button>
      </div>
    </div>
  );
}
