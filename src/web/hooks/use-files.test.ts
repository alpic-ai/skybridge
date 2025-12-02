import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFiles } from "./use-files.js";

describe("useLocale", () => {
  const OpenaiMock = {
    uploadFile: vi.fn(),
    downloadFile: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal("openai", OpenaiMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  const dummyFile = new File([], "test.txt");

  it("should upload a file to ChatGPT", () => {
    const { result } = renderHook(() => useFiles());

    result.current.upload(dummyFile);
    expect(OpenaiMock.uploadFile).toHaveBeenCalledWith(dummyFile);
  });

  it("should download a file from ChatGPT", () => {
    const fileId = "123";
    const { result } = renderHook(() => useFiles());

    result.current.download({ fileId });
    expect(OpenaiMock.downloadFile).toHaveBeenCalledWith({ fileId });
  });
});
