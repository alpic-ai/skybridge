import { useEffect } from "react";
import { measureIframeHeight } from "@/lib/utils.js";

export const useIframeAutoHeight = ({
  iframeRef,
  containerRef,
  enabled,
  onHeightChange,
  documentKey,
  clampToContainer = true,
}: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
  onHeightChange: (height: number) => void;
  documentKey: string;
  clampToContainer?: boolean;
}) => {
  useEffect(() => {
    if (!enabled || !documentKey) {
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.body) {
      return;
    }

    const measure = () => {
      const measured = measureIframeHeight(
        iframe,
        clampToContainer ? containerRef.current : null,
      );
      const capped = clampToContainer
        ? measured
        : Math.min(measured, window.innerHeight);
      if (capped > 0) {
        onHeightChange(capped);
      }
    };

    const observer = new ResizeObserver(measure);
    const root = iframe.contentDocument.getElementById("root");
    if (root) {
      observer.observe(root);
    }
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
  }, [
    containerRef,
    enabled,
    iframeRef,
    onHeightChange,
    documentKey,
    clampToContainer,
  ]);
};
