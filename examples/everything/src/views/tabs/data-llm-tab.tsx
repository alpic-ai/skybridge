import { useState } from "react";

const PAGES = ["Home", "Products", "Cart", "Checkout"] as const;
type Page = (typeof PAGES)[number];

export function DataLlmTab() {
  const [page, setPage] = useState<Page>("Home");

  return (
    <div className="tab-content" data-llm={`User is viewing the ${page} page`}>
      <p className="description">
        The <code>data-llm</code> attribute syncs UI state with the model. As
        you navigate below, the LLM knows which page you're on.
      </p>

      <div className="field">
        <span className="field-label">compiled widgetState</span>
        <pre>{`<DataLLM content="User is viewing the ${page} page}">
  <div>{/* The page content */}</div>
</DataLLM>`}</pre>
      </div>

      <div className="button-row">
        {PAGES.map((p) => (
          <button
            key={p}
            type="button"
            className={`btn ${page === p ? "" : "btn-outline"}`}
            onClick={() => setPage(p)}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
