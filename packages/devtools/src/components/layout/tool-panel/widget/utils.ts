export function injectWaitForOpenai(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const target = doc.querySelector('script[type="module"]#dev-widget-entry');

  if (!target) {
    throw new Error("dev-widget-entry script not found");
  }

  const waitForOpenAIText = `
  const waitForOpenAI = () => new Promise((resolve, reject) => {
    if (typeof window === "undefined") { reject(new Error("window is not available")); return; }
    if ("openai" in window && window.openai != null) { resolve(); return; }
    Object.defineProperty(window, "openai", {
      configurable: true,
      enumerable: true,
      get() { return undefined; },
      set(value) {
        Object.defineProperty(window, "openai", {
          configurable: true,
          enumerable: true,
          writable: true,
          value,
        });
        resolve();
      },
    });
  });
  `;

  target.textContent = `
  ${waitForOpenAIText}
  await waitForOpenAI();
  ${target.textContent}
  `;

  return doc.head.innerHTML + doc.body.innerHTML;
}
