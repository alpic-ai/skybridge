/**
 * Triggers a modal containing the widget rendered in display mode "modal"
 */
export function useRequestModal() {
  return (options: { title: string }) => {
    window.openai.requestModal(options);
  };
}
