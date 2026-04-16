import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppsSdkAdaptor } from "../bridges/apps-sdk/adaptor.js";
import { useFiles } from "./use-files.js";

describe("useFiles", () => {
  const OpenaiMock: Record<string, unknown> = {
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
    vi.clearAllMocks();
    AppsSdkAdaptor.resetInstance();
  });

  const dummyFile = new File([], "test.txt");

  it("should upload a file to ChatGPT", () => {
    const { result } = renderHook(() => useFiles());

    result.current.upload(dummyFile);
    expect(OpenaiMock.uploadFile).toHaveBeenCalledWith(dummyFile, undefined);
  });

  it("should upload a file with library option", () => {
    const { result } = renderHook(() => useFiles());

    result.current.upload(dummyFile, { library: true });
    expect(OpenaiMock.uploadFile).toHaveBeenCalledWith(dummyFile, {
      library: true,
    });
  });

  it("should select files from ChatGPT", async () => {
    const selectedFiles = [
      { fileId: "file_1", fileName: "doc.pdf", mimeType: "application/pdf" },
    ];
    OpenaiMock.selectFiles = vi.fn().mockResolvedValue(selectedFiles);

    const { result } = renderHook(() => useFiles());

    const files = await result.current.selectFiles();
    expect(OpenaiMock.selectFiles).toHaveBeenCalled();
    expect(files).toEqual(selectedFiles);

    delete OpenaiMock.selectFiles;
  });

  it("should download a file from ChatGPT", () => {
    const fileId = "123";
    const { result } = renderHook(() => useFiles());

    result.current.getDownloadUrl({ fileId });
    expect(OpenaiMock.getFileDownloadUrl).toHaveBeenCalledWith({ fileId });
  });
});
