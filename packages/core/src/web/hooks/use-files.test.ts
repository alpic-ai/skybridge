import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFiles } from "./use-files.js";

describe("useFiles", () => {
  const OpenaiMock = {
    uploadFile: vi.fn().mockResolvedValue({
      fileId: `sediment://file_abc123`,
    }),
    getFileDownloadUrl: vi.fn(),
    widgetState: null,
    setWidgetState: vi.fn(),
  };

  beforeEach(() => {
    vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
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

    result.current.getDownloadUrl({ fileId });
    expect(OpenaiMock.getFileDownloadUrl).toHaveBeenCalledWith({ fileId });
  });
});
