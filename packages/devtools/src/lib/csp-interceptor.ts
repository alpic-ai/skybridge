type CspCategory = "resource" | "connect" | "frame";

type DomainObservedCallback = (origin: string, category: CspCategory) => void;

const POLL_INTERVAL_MS = 1000;

function extractOrigin(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "data:" || parsed.protocol === "blob:") {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function categorizeInitiatorType(initiatorType: string): CspCategory {
  if (initiatorType === "fetch" || initiatorType === "xmlhttprequest") {
    return "connect";
  }
  if (initiatorType === "iframe" || initiatorType === "subdocument") {
    return "frame";
  }
  return "resource";
}

function deduplicatedCallback(callback: DomainObservedCallback) {
  const seen = new Set<string>();
  return (origin: string, category: CspCategory) => {
    const key = `${category}:${origin}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    callback(origin, category);
  };
}

/**
 * Primary mechanism: PerformanceObserver captures every network request
 * (scripts, images, fonts, CSS, fetch, XHR) regardless of whether it was
 * initiated from static HTML or dynamic JS.
 */
function observePerformance(
  iframeWindow: Window & typeof globalThis,
  report: DomainObservedCallback,
): () => void {
  if (!iframeWindow.PerformanceObserver) {
    return () => {};
  }

  const processEntry = (entry: PerformanceEntry) => {
    const origin = extractOrigin(entry.name);
    if (origin) {
      report(
        origin,
        categorizeInitiatorType(
          (entry as PerformanceResourceTiming).initiatorType,
        ),
      );
    }
  };

  try {
    const observer = new iframeWindow.PerformanceObserver(
      (list: PerformanceObserverEntryList) => {
        for (const entry of list.getEntries()) {
          processEntry(entry);
        }
      },
    );
    observer.observe({ type: "resource", buffered: true });
    return () => observer.disconnect();
  } catch {
    return () => {};
  }
}

/**
 * Fallback: poll performance.getEntriesByType('resource') on an interval.
 * Catches entries that PerformanceObserver might miss (e.g. if observer was
 * set up after resources loaded and buffered mode didn't work).
 */
function pollPerformanceEntries(
  iframeWindow: Window & typeof globalThis,
  report: DomainObservedCallback,
): () => void {
  if (!iframeWindow.performance?.getEntriesByType) {
    return () => {};
  }

  const poll = () => {
    try {
      const entries = iframeWindow.performance.getEntriesByType("resource");
      for (const entry of entries) {
        const origin = extractOrigin(entry.name);
        if (origin) {
          report(
            origin,
            categorizeInitiatorType(
              (entry as PerformanceResourceTiming).initiatorType,
            ),
          );
        }
      }
    } catch {
      // iframe may become unavailable
    }
  };

  poll();
  const intervalId = setInterval(poll, POLL_INTERVAL_MS);
  return () => clearInterval(intervalId);
}

/**
 * Intercept fetch() calls for real-time connect-domain detection.
 * Reports the origin before the actual request is made.
 */
function patchFetch(
  iframeWindow: Window,
  report: DomainObservedCallback,
): () => void {
  if (typeof iframeWindow.fetch !== "function") {
    return () => {};
  }

  const originalFetch = iframeWindow.fetch.bind(iframeWindow);

  iframeWindow.fetch = function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const origin = extractOrigin(url);
    if (origin) {
      report(origin, "connect");
    }
    return originalFetch(input, init);
  };

  return () => {
    iframeWindow.fetch = originalFetch;
  };
}

/**
 * Intercept XMLHttpRequest.open() for real-time connect-domain detection.
 */
function patchXHR(
  iframeWindow: Window & typeof globalThis,
  report: DomainObservedCallback,
): () => void {
  if (!iframeWindow.XMLHttpRequest) {
    return () => {};
  }

  const XHR = iframeWindow.XMLHttpRequest;
  const originalOpen = XHR.prototype.open;

  XHR.prototype.open = function patchedOpen(
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    const urlStr = typeof url === "string" ? url : url.href;
    const origin = extractOrigin(urlStr);
    if (origin) {
      report(origin, "connect");
    }
    return (originalOpen as (...args: unknown[]) => void).call(
      this,
      method,
      url,
      ...rest,
    );
  };

  return () => {
    XHR.prototype.open = originalOpen;
  };
}

/**
 * Sets up interception of all network requests made by a widget iframe.
 *
 * Uses three complementary strategies:
 * 1. PerformanceObserver — captures all resource loads (primary)
 * 2. performance.getEntriesByType polling — fallback for missed entries
 * 3. fetch/XHR monkey-patching — real-time connect-domain detection
 *
 * Call AFTER document.close() but before module scripts execute,
 * so fetch/XHR patches are in place when the widget SPA boots.
 */
export function setupCspInterceptor(
  iframeWindow: Window & typeof globalThis,
  report: DomainObservedCallback,
): () => void {
  const cleanups: Array<() => void> = [];
  const dedupedReport = deduplicatedCallback(report);

  const layers = [
    () => observePerformance(iframeWindow, dedupedReport),
    () => pollPerformanceEntries(iframeWindow, dedupedReport),
    () => patchFetch(iframeWindow, dedupedReport),
    () => patchXHR(iframeWindow, dedupedReport),
  ];

  for (const layer of layers) {
    try {
      cleanups.push(layer());
    } catch {
      // Layer unavailable in this context
    }
  }

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}
