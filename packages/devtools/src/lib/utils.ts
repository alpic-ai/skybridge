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

  // Prefer the mount node so body/html stretching (e.g. min-h-screen) doesn't pin us tall.
  const root = doc.getElementById("root");
  const innerScroll = root
    ? root.getBoundingClientRect().height
    : Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight);

  return Math.min(innerScroll, maxH);
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
