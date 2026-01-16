import { useRequestModal } from "skybridge/web";

export function UseRequestModalTab() {
  const { open } = useRequestModal();

  return (
    <div className="tab-content">
      <p className="description">
        Request to open the widget in a modal dialog.
      </p>

      <div className="button-row">
        <button
          type="button"
          className="btn"
          onClick={() => open({ params: { message: "🤠 Howdy ! " } })}
        >
          Open modal
        </button>
      </div>
    </div>
  );
}
