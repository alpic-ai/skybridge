export function HomeTab() {
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
          href="https://github.com/alpic-ai/skybridge/tree/main/examples/everything"
          target="_blank"
          rel="noopener noreferrer"
        >
          github.com/alpic-ai/skybridge/examples/everything
        </a>
      </p>
    </div>
  );
}
