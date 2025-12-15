export function injectWaitForOpenai(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // Find the specific inline module script that imports your widget
  const scripts = [...doc.querySelectorAll('script[type="module"]')];
  const target = scripts.find((s) =>
    // Looks for import statements that contain the word "src/widgets" and end with ".tsx"
    /import\(\s*['"][^'"]*src\/widgets[^'"]*\.tsx[^'"]*['"]\s*\)/.test(
      s.textContent || "",
    ),
  );

  if (!target) return html; // nothing to patch

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

  // Prepend wait + add await before import()
  target.textContent = `
  ${waitForOpenAIText}
  await waitForOpenAI();
  ${target.textContent}
  `;

  // Serialize back to HTML (body innerHTML gives you the fragment)
  return doc.head.innerHTML + doc.body.innerHTML;
}
