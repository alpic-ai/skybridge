export function useOpenExternal() {
  return (href: string) => {
    window.openai.openExternal({ href });
  };
}
