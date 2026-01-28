import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resetTokenLimitWarning,
  warnIfExceedsTokenLimit,
} from "./warn-token-limit.js";

describe("warnIfExceedsTokenLimit", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    resetTokenLimitWarning();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("should not warn for null state", () => {
    warnIfExceedsTokenLimit(null, "setWidgetState");
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("should not warn for undefined state", () => {
    warnIfExceedsTokenLimit(undefined, "setWidgetState");
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("should not warn for small payloads", () => {
    warnIfExceedsTokenLimit({ small: "data" }, "setWidgetState");
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("should warn for payloads exceeding 4K tokens (~16K chars)", () => {
    const largePayload = { data: "x".repeat(20000) };
    warnIfExceedsTokenLimit(largePayload, "setWidgetState");
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Skybridge] Warning: setWidgetState payload"),
    );
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("4000 token limit"),
    );
  });

  it("should warn with data-llm specific message for data-llm source", () => {
    const largePayload = "x".repeat(20000);
    warnIfExceedsTokenLimit(largePayload, "data-llm");
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Skybridge] Warning: data-llm content"),
    );
  });

  it("should only warn once until reset", () => {
    const largePayload = { data: "x".repeat(20000) };
    warnIfExceedsTokenLimit(largePayload, "setWidgetState");
    warnIfExceedsTokenLimit(largePayload, "setWidgetState");
    warnIfExceedsTokenLimit(largePayload, "setWidgetState");
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
  });

  it("should warn again after reset", () => {
    const largePayload = { data: "x".repeat(20000) };
    warnIfExceedsTokenLimit(largePayload, "setWidgetState");
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

    resetTokenLimitWarning();
    warnIfExceedsTokenLimit(largePayload, "setWidgetState");
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
  });

  it("should reset warning state when payload goes back under limit", () => {
    const largePayload = { data: "x".repeat(20000) };
    warnIfExceedsTokenLimit(largePayload, "setWidgetState");
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

    const smallPayload = { data: "small" };
    warnIfExceedsTokenLimit(smallPayload, "setWidgetState");

    warnIfExceedsTokenLimit(largePayload, "setWidgetState");
    expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
  });

  it("should include estimated token count in warning", () => {
    const largePayload = { data: "x".repeat(20000) };
    warnIfExceedsTokenLimit(largePayload, "setWidgetState");
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/estimated ~\d+ tokens/),
    );
  });

  it("should handle circular references gracefully", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    warnIfExceedsTokenLimit(circular, "setWidgetState");
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
