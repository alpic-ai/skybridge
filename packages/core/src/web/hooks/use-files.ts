import { getAdaptor } from "../bridges/index.js";

/**
 * Supported file extensions for ChatGPT file uploads
 * ChatGPT currently supports only image formats: PNG, JPEG, and WebP
 * @see https://developers.openai.com/apps-sdk/build/chatgpt-ui#upload-files-from-the-widget
 */
export const SUPPORTED_FILE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

/**
 * Accept attribute value for file input elements
 * Matches the MIME types: image/png, image/jpeg, image/webp
 */
export const SUPPORTED_FILE_TYPES_ACCEPT = "image/png,image/jpeg,image/webp";

/**
 * Validates if a file has a supported extension
 */
function validateFileType(file: File): void {
  const fileName = file.name.toLowerCase();
  const hasValidExtension = SUPPORTED_FILE_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext),
  );

  if (!hasValidExtension) {
    throw new Error(
      `Unsupported file type. Supported file types are: ${SUPPORTED_FILE_EXTENSIONS.join(", ")}`,
    );
  }
}

export function useFiles() {
  const adaptor = getAdaptor();

  return {
    upload: async (file: File) => {
      validateFileType(file);
      return adaptor.uploadFile(file);
    },
    getDownloadUrl: adaptor.getFileDownloadUrl,
  };
}
