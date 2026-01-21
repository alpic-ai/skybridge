import nodemon, { type NodemonSettings } from "nodemon";
import { useEffect, useState } from "react";

type Message = {
  text: string;
  type: "log" | "restart" | "error";
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

    const handleStderrData = (chunk: Buffer) => {
      const message = chunk.toString().trim();
      if (message) {
        setMessages((prev) => [...prev, { text: message, type: "error" }]);
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

    const setupStderrListener = () => {
      // @ts-expect-error - nodemon types don't include "stderr" property
      if (nodemon.stderr) {
        // @ts-expect-error - nodemon types don't include "stderr" property
        nodemon.stderr.off("data", handleStderrData);
        // @ts-expect-error - nodemon types don't include "stderr" property
        nodemon.stderr.on("data", handleStderrData);
      }
    };

    nodemon.on("readable", () => {
      setupStdoutListener();
      setupStderrListener();
    });

    nodemon
      // @ts-expect-error - nodemon types don't include "restart" event
      .on("restart", (files: string[]) => {
        const restartMessage = `Server restarted due to file changes: ${files.join(", ")}`;
        setMessages((prev) => [
          ...prev,
          { text: restartMessage, type: "restart" },
        ]);
        setupStdoutListener();
        setupStderrListener();
      });

    return () => {
      // @ts-expect-error - nodemon types don't include "stdout" property
      if (nodemon.stdout) {
        // @ts-expect-error - nodemon types don't include "stdout" property
        nodemon.stdout.off("data", handleStdoutData);
      }
      // @ts-expect-error - nodemon types don't include "stderr" property
      if (nodemon.stderr) {
        // @ts-expect-error - nodemon types don't include "stderr" property
        nodemon.stderr.off("data", handleStderrData);
      }
      nodemon.emit("quit");
    };
  }, [env]);

  return messages;
}
