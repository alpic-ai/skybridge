import { useOpenExternal } from "skybridge/web";

export function HomeTab() {
  const openExternal = useOpenExternal();

  return (
    <div className="tab-content">
      <p className="description">
        Welcome to Skybridge Everything. This widget showcases all the hooks and
        features available when building ChatGPT/MCP Apps with Skybridge.
      </p>
      <p className="description">
        Use the tabs above to explore each API and see how your widget can
        interact with the host application.
      </p>
      <p className="description">
        Read the full code implementation on{" "}
        <a
          href="#"
          role="button"
          onClick={(e) => {
            e.preventDefault();
            openExternal(
              "https://github.com/alpic-ai/skybridge/tree/main/examples/everything"
            );
          }}
        >
          GitHub
        </a>
      </p>
    </div>
  );
}
