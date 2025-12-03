export function useFiles() {
  return {
    upload: window.openai.uploadFile,
    download: window.openai.downloadFile,
  };
}
