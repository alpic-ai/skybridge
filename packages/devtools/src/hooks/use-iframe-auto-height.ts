import { useEffect } from "react";
import { measureIframeHeight } from "@/lib/utils.js";

export const useIframeAutoHeight = ({
  iframeRef,
  containerRef,
  enabled,
  onHeightChange,
  documentKey,
}: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
  onHeightChange: (height: number) => void;
  documentKey: string;
}) => {
  useEffect(() => {
    if (!enabled || !documentKey) {
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.body) {
      return;
    }

    let lastMeasured = 0;
    const measure = () => {
      const measured = measureIframeHeight(iframe, containerRef.current);
      if (measured > 0 && measured !== lastMeasured) {
        lastMeasured = measured;
        onHeightChange(measured);
      }
    };

    const observer = new ResizeObserver(measure);
    observer.observe(iframe.contentDocument.body);
    observer.observe(iframe.contentDocument.documentElement);
    const parentEl = containerRef.current?.parentElement;
    if (parentEl) {
      observer.observe(parentEl);
    }
    measure();

    return () => {
      observer.disconnect();
    };
  }, [containerRef, enabled, iframeRef, onHeightChange, documentKey]);
};
