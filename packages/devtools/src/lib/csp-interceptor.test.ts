import { afterEach, describe, expect, it, vi } from "vitest";
import { setupCspInterceptor } from "./csp-interceptor.js";

type CspCategory = "resource" | "connect" | "frame";
type Observed = { origin: string; category: CspCategory };

function collectObserved() {
  const observed: Observed[] = [];
  const callback = (origin: string, category: CspCategory) => {
    observed.push({ origin, category });
  };
  return { observed, callback };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("setupCspInterceptor", () => {
  describe("fetch interception", () => {
    it("detects fetch calls to external origins", () => {
      const originalFetch = window.fetch;
      const mockFetch = vi.fn(async () => new Response("ok"));
      window.fetch = mockFetch as unknown as typeof fetch;

      const { observed, callback } = collectObserved();
      const cleanup = setupCspInterceptor(window, callback);

      window.fetch("https://api.example.com/data");

      expect(observed).toContainEqual({
        origin: "https://api.example.com",
        category: "connect",
      });
      expect(mockFetch).toHaveBeenCalled();

      cleanup();
      window.fetch = originalFetch;
    });

    it("detects fetch with URL object", () => {
      const originalFetch = window.fetch;
      const mockFetch = vi.fn(async () => new Response("ok"));
      window.fetch = mockFetch as unknown as typeof fetch;

      const { observed, callback } = collectObserved();
      const cleanup = setupCspInterceptor(window, callback);

      window.fetch(new URL("https://cdn.example.com/file.json"));

      expect(observed).toContainEqual({
        origin: "https://cdn.example.com",
        category: "connect",
      });

      cleanup();
      window.fetch = originalFetch;
    });

    it("detects fetch with Request object", () => {
      const originalFetch = window.fetch;
      const mockFetch = vi.fn(async () => new Response("ok"));
      window.fetch = mockFetch as unknown as typeof fetch;

      const { observed, callback } = collectObserved();
      const cleanup = setupCspInterceptor(window, callback);

      window.fetch(new Request("https://api.example.com/users"));

      expect(observed).toContainEqual({
        origin: "https://api.example.com",
        category: "connect",
      });

      cleanup();
      window.fetch = originalFetch;
    });

    it("ignores data: and blob: URLs", () => {
      const originalFetch = window.fetch;
      const mockFetch = vi.fn(async () => new Response("ok"));
      window.fetch = mockFetch as unknown as typeof fetch;

      const { observed, callback } = collectObserved();
      const cleanup = setupCspInterceptor(window, callback);

      window.fetch("data:text/plain;base64,SGVsbG8=");

      const connectObserved = observed.filter((o) => o.category === "connect");
      expect(connectObserved).toHaveLength(0);

      cleanup();
      window.fetch = originalFetch;
    });

    it("skips patching when fetch is not available", () => {
      const originalFetch = window.fetch;
      (window as Partial<Window & typeof globalThis>).fetch = undefined;

      const { callback } = collectObserved();
      const cleanup = setupCspInterceptor(window, callback);

      // Should not throw
      cleanup();
      window.fetch = originalFetch;
    });

    it("restores original fetch on cleanup", () => {
      const originalFetch = window.fetch;
      const mockFetch = vi.fn(async () => new Response("ok"));
      window.fetch = mockFetch as unknown as typeof fetch;

      const { callback } = collectObserved();
      const cleanup = setupCspInterceptor(window, callback);

      expect(window.fetch.name).toBe("patchedFetch");

      cleanup();
      expect(window.fetch.name).not.toBe("patchedFetch");

      window.fetch = originalFetch;
    });
  });

  describe("deduplication", () => {
    it("reports the same origin+category only once", () => {
      const originalFetch = window.fetch;
      const mockFetch = vi.fn(async () => new Response("ok"));
      window.fetch = mockFetch as unknown as typeof fetch;

      const { observed, callback } = collectObserved();
      const cleanup = setupCspInterceptor(window, callback);

      window.fetch("https://api.example.com/users");
      window.fetch("https://api.example.com/posts");
      window.fetch("https://api.example.com/comments");

      const apiEntries = observed.filter(
        (o) => o.origin === "https://api.example.com",
      );
      expect(apiEntries).toHaveLength(1);

      cleanup();
      window.fetch = originalFetch;
    });

    it("reports different origins separately", () => {
      const originalFetch = window.fetch;
      const mockFetch = vi.fn(async () => new Response("ok"));
      window.fetch = mockFetch as unknown as typeof fetch;

      const { observed, callback } = collectObserved();
      const cleanup = setupCspInterceptor(window, callback);

      window.fetch("https://api-a.example.com/data");
      window.fetch("https://api-b.example.com/data");

      const origins = observed.map((o) => o.origin);
      expect(origins).toContain("https://api-a.example.com");
      expect(origins).toContain("https://api-b.example.com");

      cleanup();
      window.fetch = originalFetch;
    });
  });

  describe("performance polling", () => {
    it("picks up entries from performance.getEntriesByType", () => {
      const mockEntries = [
        { name: "https://cdn.example.com/app.js", initiatorType: "script" },
        {
          name: "https://fonts.googleapis.com/css2?family=Inter",
          initiatorType: "link",
        },
        {
          name: "https://api.example.com/data",
          initiatorType: "fetch",
        },
        {
          name: "https://avatars.githubusercontent.com/u/182288589",
          initiatorType: "img",
        },
      ];

      const originalGetEntries = window.performance.getEntriesByType;
      window.performance.getEntriesByType = vi.fn(
        () => mockEntries as unknown as PerformanceEntryList,
      );

      const { observed, callback } = collectObserved();
      const cleanup = setupCspInterceptor(window, callback);

      expect(observed).toContainEqual({
        origin: "https://cdn.example.com",
        category: "resource",
      });
      expect(observed).toContainEqual({
        origin: "https://fonts.googleapis.com",
        category: "resource",
      });
      expect(observed).toContainEqual({
        origin: "https://api.example.com",
        category: "connect",
      });
      expect(observed).toContainEqual({
        origin: "https://avatars.githubusercontent.com",
        category: "resource",
      });

      cleanup();
      window.performance.getEntriesByType = originalGetEntries;
    });

    it("categorizes iframe initiatorType as frame", () => {
      const mockEntries = [
        {
          name: "https://www.youtube.com/embed/abc",
          initiatorType: "iframe",
        },
      ];

      const originalGetEntries = window.performance.getEntriesByType;
      window.performance.getEntriesByType = vi.fn(
        () => mockEntries as unknown as PerformanceEntryList,
      );

      const { observed, callback } = collectObserved();
      const cleanup = setupCspInterceptor(window, callback);

      expect(observed).toContainEqual({
        origin: "https://www.youtube.com",
        category: "frame",
      });

      cleanup();
      window.performance.getEntriesByType = originalGetEntries;
    });

    it("picks up new entries on subsequent polls", async () => {
      vi.useFakeTimers();

      let entries: unknown[] = [];

      const originalGetEntries = window.performance.getEntriesByType;
      window.performance.getEntriesByType = vi.fn(
        () => entries as unknown as PerformanceEntryList,
      );

      const { observed, callback } = collectObserved();
      const cleanup = setupCspInterceptor(window, callback);

      expect(observed).toHaveLength(0);

      entries = [
        {
          name: "https://lazy.example.com/image.png",
          initiatorType: "img",
        },
      ];

      vi.advanceTimersByTime(1100);

      expect(observed).toContainEqual({
        origin: "https://lazy.example.com",
        category: "resource",
      });

      cleanup();
      window.performance.getEntriesByType = originalGetEntries;
      vi.useRealTimers();
    });
  });

  describe("iframe context", () => {
    function createTestIframe() {
      const iframe = document.createElement("iframe");
      document.body.appendChild(iframe);
      const iframeWin = iframe.contentWindow;
      if (!iframeWin) {
        throw new Error("iframe contentWindow unavailable");
      }
      return { iframe, iframeWin };
    }

    it("detects fetch calls from iframe window", () => {
      const { iframe, iframeWin } = createTestIframe();

      const mockFetch = vi.fn(async () => new Response("ok"));
      (iframeWin as Window & typeof globalThis).fetch =
        mockFetch as unknown as typeof fetch;

      const { observed, callback } = collectObserved();
      const cleanup = setupCspInterceptor(
        iframeWin as Window & typeof globalThis,
        callback,
      );

      (iframeWin as Window & typeof globalThis).fetch(
        "https://api.example.com/endpoint",
      );

      expect(observed).toContainEqual({
        origin: "https://api.example.com",
        category: "connect",
      });

      cleanup();
      iframe.remove();
    });

    it("does not throw when iframe has limited APIs", () => {
      const { iframe, iframeWin } = createTestIframe();

      const { callback } = collectObserved();
      // Should not throw even though iframe may lack fetch/XHR/PerformanceObserver
      const cleanup = setupCspInterceptor(
        iframeWin as Window & typeof globalThis,
        callback,
      );

      cleanup();
      iframe.remove();
    });
  });
});
