import { randomUUID } from "node:crypto";
import { useCallback, useState } from "react";
import type { Message } from "./types.js";

const MAX_MESSAGES = 10;

export type PushMessage = (text: string, type: Message["type"]) => void;

export function useMessages(): [Array<Message>, PushMessage] {
  const [messages, setMessages] = useState<Array<Message>>([]);

  const push = useCallback<PushMessage>((text, type) => {
    setMessages((prev) =>
      [...prev, { id: randomUUID(), text, type }].slice(-MAX_MESSAGES),
    );
  }, []);

  return [messages, push];
}
