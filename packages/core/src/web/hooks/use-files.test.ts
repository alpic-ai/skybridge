import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppsSdkAdaptor } from "../bridges/apps-sdk/adaptor.js";
import { SUPPORTED_FILE_TYPES_ACCEPT, useFiles } from "./use-files.js";

describe("useFiles", () => {
  let OpenaiMock: {
    uploadFile: ReturnType<typeof vi.fn>;
    getFileDownloadUrl: ReturnType<typeof vi.fn>;
    widgetState: null;
    setWidgetState: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    OpenaiMock = {
      uploadFile: vi.fn().mockResolvedValue({
        fileId: `sediment://file_abc123`,
      }),
      getFileDownloadUrl: vi.fn(),
      widgetState: null,
      setWidgetState: vi.fn(),
    };
    vi.stubGlobal("skybridge", { hostType: "apps-sdk" });
    vi.stubGlobal("openai", OpenaiMock);
    AppsSdkAdaptor.resetInstance();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
    AppsSdkAdaptor.resetInstance();
  });

  it("should upload a file to ChatGPT", async () => {
    const { result } = renderHook(() => useFiles());
    const dummyFile = new File([], "test.png");

    await result.current.upload(dummyFile);
    expect(OpenaiMock.uploadFile).toHaveBeenCalledWith(dummyFile);
  });

  it("should download a file from ChatGPT", () => {
    const fileId = "123";
    const { result } = renderHook(() => useFiles());

    result.current.getDownloadUrl({ fileId });
    expect(OpenaiMock.getFileDownloadUrl).toHaveBeenCalledWith({ fileId });
  });

  it("should reject unsupported file types", async () => {
    const { result } = renderHook(() => useFiles());
    const unsupportedFile = new File([], "test.exe");

    await expect(result.current.upload(unsupportedFile)).rejects.toThrow(
      /Unsupported file type/,
    );
    expect(OpenaiMock.uploadFile).not.toHaveBeenCalled();
  });

  it("should accept all supported file extensions", async () => {
    const { result } = renderHook(() => useFiles());

    // Test all supported image extensions
    const supportedExtensions = [".png", ".jpg", ".jpeg", ".webp"];

    for (const ext of supportedExtensions) {
      const file = new File([], `test${ext}`);
      await expect(result.current.upload(file)).resolves.toBeDefined();
    }

    expect(OpenaiMock.uploadFile).toHaveBeenCalledTimes(
      supportedExtensions.length,
    );
  });

  it("should be case-insensitive for file extensions", async () => {
    const { result } = renderHook(() => useFiles());
    const upperCaseFile = new File([], "test.PNG");

    await result.current.upload(upperCaseFile);
    expect(OpenaiMock.uploadFile).toHaveBeenCalledWith(upperCaseFile);
  });

  it("should export SUPPORTED_FILE_TYPES_ACCEPT constant", () => {
    expect(SUPPORTED_FILE_TYPES_ACCEPT).toBe("image/png,image/jpeg,image/webp");
  });
});
