import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function injectWaitForOpenai(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const target = doc.querySelector('script[type="module"]#dev-view-entry');

  if (!target) {
    throw new Error("dev-view-entry script not found");
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

export const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const measureIframeHeight = (
  iframe: HTMLIFrameElement,
  container: HTMLDivElement | null,
) => {
  const doc = iframe.contentDocument;
  if (!doc?.body) {
    return 0;
  }

  const parentEl = container?.parentElement;
  const parentH = parentEl?.clientHeight ?? 0;
  // Before layout, the scroll parent can report 0 — do not clamp to 0 or we never commit height.
  const maxH = parentH > 0 ? parentH : Number.POSITIVE_INFINITY;

  const root = doc.getElementById("root");
  const contentWindow = doc.defaultView;
  if (!root || !contentWindow) {
    return 0;
  }

  // Measure from #root rather than the document: a body stretched to the
  // viewport (min-h-screen, height: 100%) reports the iframe's own height back
  // and the widget can never shrink. `bottom` is viewport-relative, so it already
  // includes whatever margin and padding html/body put above #root; scrollY
  // corrects it if the document happens to be scrolled during measurement.
  const rootBottom =
    root.getBoundingClientRect().bottom + contentWindow.scrollY;

  // #root's box stops at its own edge. Add the margin, padding and border that
  // html/body reserve below it (the UA default body margin, or an app's own
  // body padding), otherwise that space overflows and the iframe scrolls.
  const spaceBelowRoot =
    spaceBelow(contentWindow, doc.body) +
    spaceBelow(contentWindow, doc.documentElement);

  return Math.min(rootBottom + spaceBelowRoot, maxH);
};

const spaceBelow = (contentWindow: Window, element: Element) => {
  const { paddingBottom, borderBottomWidth, marginBottom } =
    contentWindow.getComputedStyle(element);
  return (
    parseFloat(paddingBottom) +
    parseFloat(borderBottomWidth) +
    parseFloat(marginBottom)
  );
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}b`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)}kb`;
  }
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)}mb`;
}

export const PHONE_VIEWPORT = { width: 390, height: 844 };
