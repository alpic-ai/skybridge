import nodemon, { type NodemonSettings } from "nodemon";
import { useEffect, useState } from "react";

type Message = {
  text: string;
  type: "log" | "restart";
};

export function useNodemon(env: NodeJS.ProcessEnv): Array<Message> {
  const [messages, setMessages] = useState<Array<Message>>([]);

  useEffect(() => {
    nodemon({
      env,
      configFile: "nodemon.json",
      stdout: false,
    } as NodemonSettings);

    const handleStdoutData = (chunk: Buffer) => {
      const message = chunk.toString().trim();
      if (message) {
        setMessages((prev) => [...prev, { text: message, type: "log" }]);
      }
    };

    const setupStdoutListener = () => {
      // @ts-expect-error - nodemon types don't include "stdout" property
      if (nodemon.stdout) {
        // @ts-expect-error - nodemon types don't include "stdout" property
        nodemon.stdout.off("data", handleStdoutData);
        // @ts-expect-error - nodemon types don't include "stdout" property
        nodemon.stdout.on("data", handleStdoutData);
      }
    };

    nodemon.on("readable", setupStdoutListener);

    nodemon
      // @ts-expect-error - nodemon types don't include "restart" event
      .on("restart", (files: string[]) => {
        const restartMessage = `Server restarted due to file changes: ${files.join(", ")}`;
        setMessages((prev) => [
          ...prev,
          { text: restartMessage, type: "restart" },
        ]);
        setupStdoutListener();
      });

    return () => {
      // @ts-expect-error - nodemon types don't include "stdout" property
      if (nodemon.stdout) {
        // @ts-expect-error - nodemon types don't include "stdout" property
        nodemon.stdout.off("data", handleStdoutData);
      }
      nodemon.emit("quit");
    };
  }, [env]);

  return messages;
}
