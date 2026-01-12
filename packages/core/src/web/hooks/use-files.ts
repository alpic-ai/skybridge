export function useFiles() {
  return {
    upload: window.openai.uploadFile,
    getDownloadUrl: window.openai.getFileDownloadUrl,
  };
}
