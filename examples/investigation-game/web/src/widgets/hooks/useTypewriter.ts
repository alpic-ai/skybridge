import { useCallback, useEffect, useRef, useState } from "react";

export function useTypewriter(text: string, speed: number = 40) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setDisplayedText("");
    setIsComplete(false);
    let index = 0;

    timerRef.current = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }, speed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [text, speed]);

  const skip = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayedText(text);
    setIsComplete(true);
  }, [text]);

  return { displayedText, isComplete, skip };
}
