import { useEffect, useState } from "react";

export const useIframeMounted = ({
  iframeRef,
  documentKey,
}: {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  documentKey: string;
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(false);
    if (!documentKey) {
      return;
    }
    const doc = iframeRef.current?.contentDocument;
    if (!doc) {
      return;
    }

    const isMounted = () => {
      const root = doc.getElementById("root");
      return Boolean(root && root.childNodes.length > 0);
    };

    if (isMounted()) {
      setMounted(true);
      return;
    }

    const observer = new MutationObserver(() => {
      if (isMounted()) {
        setMounted(true);
        observer.disconnect();
      }
    });
    observer.observe(doc.documentElement, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [iframeRef, documentKey]);

  return mounted;
};
