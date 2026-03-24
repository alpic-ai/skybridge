import { toPng } from "html-to-image";
import { useEffect } from "react";

export function useScreenshotBridge() {
  useEffect(() => {
    const eventSource = new EventSource("/devtools/screenshot/stream");

    eventSource.onmessage = async (event) => {
      try {
        const { requestId } = JSON.parse(event.data) as { requestId: string };
        const iframe = document.querySelector<HTMLIFrameElement>(
          'iframe[title="html-preview"]',
        );
        if (!iframe?.contentDocument?.body) {
          await fetch("/devtools/screenshot/result", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId,
              error:
                "No widget is currently rendered. Ask the user to invoke a tool first.",
            }),
          });
          return;
        }
        const dataUrl = await toPng(iframe.contentDocument.body, {
          skipFonts: true,
        });
        await fetch("/devtools/screenshot/result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId, dataUrl }),
        });
      } catch (err) {
        console.error("[screenshot-bridge] error:", err);
      }
    };

    return () => eventSource.close();
  }, []);
}
